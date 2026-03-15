// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth('barangay_staff')) return;
    loadRequests().catch(err => {
        showToast('Failed to load requests: ' + (err.message || 'Unknown error'), 'danger');
    });
});

let currentRequest = null;
let currentRequests = [];
let usersByUsername = new Map();
let facilitiesById = new Map();
let isEditMode = false;

function formatFullDate(dateValue) {
    if (!dateValue) return '-';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime12Hour(timeValue) {
    if (!timeValue) return '-';
    const cleaned = String(timeValue).slice(0, 5);
    const [h, m] = cleaned.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return String(timeValue);
    const hour12 = (h % 12) || 12;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatTimeRange(startTime, endTime) {
    return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
}

function formatEventDateRange(startDate, endDate) {
    const start = startDate ? formatFullDate(startDate) : '-';
    const end = endDate ? formatFullDate(endDate) : start;
    if (!endDate || String(endDate) === String(startDate)) {
        return start;
    }
    return `${start} → ${end}`;
}

function toDateInput(value) {
    if (!value) return '';
    const str = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toTimeInput(value) {
    if (!value) return '';
    const cleaned = String(value).slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(cleaned)) return cleaned;
    return '';
}

function calculateAddonSubtotal(chairsCount, electronicsCount) {
    const chairs = Number(chairsCount || 0);
    const electronics = Number(electronicsCount || 0);
    return (chairs * 10) + (electronics * 150);
}

function getReservationAddOns(request) {
    const raw = request && request.addOns;
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(item => item && typeof item === 'object')
        .map(item => ({
            id: String(item.id || ''),
            name: String(item.name || ''),
            unit: String(item.unit || 'item'),
            price: Number(item.price || 0),
            qty: Number(item.qty || 0),
            total: Number(item.total || 0)
        }))
        .filter(item => item.id && item.qty > 0);
}

function formatAddOnLabelText(request) {
    const addOns = getReservationAddOns(request);
    if (addOns.length) {
        return addOns.map(item => `${item.name} ${item.qty}`).join(', ');
    }
    return `Chairs ${Number(request.chairsCount || 0)}, Electronics ${Number(request.electronicsCount || 0)}`;
}

function getAddOnSubtotalForRequest(request) {
    const addOns = getReservationAddOns(request);
    if (addOns.length) {
        return addOns.reduce((sum, item) => {
            const lineTotal = Number(item.total || 0);
            if (lineTotal > 0) return sum + lineTotal;
            return sum + (Number(item.price || 0) * Number(item.qty || 0));
        }, 0);
    }
    return calculateAddonSubtotal(request.chairsCount, request.electronicsCount);
}

function getFacilityBaseAmountForRequest(request, facility) {
    const total = Number(request.totalCost || 0);
    const addOnSubtotal = getAddOnSubtotalForRequest(request);
    const derivedBase = Math.max(0, Number((total - addOnSubtotal).toFixed(2)));
    if (derivedBase > 0) return derivedBase;
    const start = new Date(`${request.eventStartDate || request.eventDate}T${request.startTime}`);
    const end = new Date(`${request.eventEndDate || request.eventDate}T${request.endTime}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    const hours = (end - start) / (1000 * 60 * 60);
    return Number((Number(facility?.price || 0) * hours).toFixed(2));
}

function getEditableAddOnsForRequest(request) {
    const snapshot = getReservationAddOns(request);
    if (snapshot.length) {
        return snapshot.map(item => ({
            id: String(item.id),
            name: String(item.name),
            unit: String(item.unit || 'item'),
            qty: Number(item.qty || 0),
            price: Number(item.price || 0)
        }));
    }
    return [
        {
            id: 'chairs',
            name: 'Chairs',
            unit: 'chair',
            qty: Number(request.chairsCount || 0),
            price: 10
        },
        {
            id: 'electronics',
            name: 'Electronics',
            unit: 'unit',
            qty: Number(request.electronicsCount || 0),
            price: 150
        }
    ];
}

function buildAddOnPriceEditorHtml(request) {
    const rows = getEditableAddOnsForRequest(request);
    return rows.map(item => `
        <div class="approval-addon-row">
            <input value="${escapeHtml(item.name)}" disabled style="padding:8px; border:1px solid #ddd; border-radius:6px; background:#f6f6f6;">
            <input class="edit-addon-qty" data-addon-id="${escapeHtml(item.id)}" data-addon-name="${escapeHtml(item.name)}" data-addon-unit="${escapeHtml(item.unit)}" type="number" min="0" step="1" value="${Number(item.qty || 0)}" style="padding:8px; border:1px solid #ddd; border-radius:6px;">
            <input class="edit-addon-price" data-addon-id="${escapeHtml(item.id)}" data-addon-name="${escapeHtml(item.name)}" data-addon-unit="${escapeHtml(item.unit)}" type="number" min="0" step="0.01" value="${Number(item.price || 0).toFixed(2)}" style="padding:8px; border:1px solid #ddd; border-radius:6px;">
        </div>
    `).join('');
}

function computeEditedAddOnTotal() {
    const qtyInputs = Array.from(document.querySelectorAll('.edit-addon-qty'));
    return qtyInputs.reduce((sum, qtyInput) => {
        const id = qtyInput.dataset.addonId;
        const qty = Math.max(0, parseInt(String(qtyInput.value || '0'), 10) || 0);
        const priceInput = document.querySelector(`.edit-addon-price[data-addon-id="${id}"]`);
        const price = Math.max(0, Number(priceInput ? priceInput.value : 0));
        return sum + (qty * price);
    }, 0);
}

function collectEditedAddOns() {
    const qtyInputs = Array.from(document.querySelectorAll('.edit-addon-qty'));
    return qtyInputs.map(qtyInput => {
        const id = String(qtyInput.dataset.addonId || '');
        const name = String(qtyInput.dataset.addonName || '');
        const unit = String(qtyInput.dataset.addonUnit || 'item');
        const qty = Math.max(0, parseInt(String(qtyInput.value || '0'), 10) || 0);
        const priceInput = document.querySelector(`.edit-addon-price[data-addon-id="${id}"]`);
        const price = Math.max(0, Number(priceInput ? priceInput.value : 0));
        const total = Number((qty * price).toFixed(2));
        return { id, name, unit, qty, price: Number(price.toFixed(2)), total };
    }).filter(item => item.id && item.qty > 0);
}

function refreshEditedTotalPreview() {
    const facilityAmountInput = document.getElementById('editFacilityAmount');
    const previewEl = document.getElementById('editTotalPreview');
    if (!facilityAmountInput || !previewEl) return;
    const facilityAmount = Math.max(0, Number(facilityAmountInput.value || 0));
    const addOnTotal = computeEditedAddOnTotal();
    const total = facilityAmount + addOnTotal;
    previewEl.textContent = `Preview Total: ₱${total.toFixed(2)} (Facility ₱${facilityAmount.toFixed(2)} + Add-ons ₱${addOnTotal.toFixed(2)})`;
}

function normalizeFacilityEventTypes(raw) {
    if (Array.isArray(raw)) {
        return raw.map(v => String(v || '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map(v => String(v || '').trim()).filter(Boolean);
            }
        } catch {
            return raw.split(/\r?\n|,/).map(v => String(v || '').trim()).filter(Boolean);
        }
    }
    return [];
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeReservation(raw) {
    if (!raw) return raw;
    let addOns = raw.addOns;
    if (!Array.isArray(addOns) && typeof raw.add_ons_snapshot === 'string' && raw.add_ons_snapshot.trim()) {
        try {
            const parsed = JSON.parse(raw.add_ons_snapshot);
            if (Array.isArray(parsed)) addOns = parsed;
        } catch {
            addOns = [];
        }
    }
    return {
        ...raw,
        id: typeof raw.id === 'string' ? parseInt(raw.id, 10) : raw.id,
        facilityId: raw.facilityId != null ? raw.facilityId : raw.facility_id,
        eventDate: raw.eventDate || raw.event_date,
        eventStartDate: raw.eventStartDate || raw.event_start_date || raw.eventDate || raw.event_date,
        eventEndDate: raw.eventEndDate || raw.event_end_date,
        startTime: raw.startTime || raw.start_time,
        endTime: raw.endTime || raw.end_time,
        eventType: raw.eventType || raw.event_type || '',
        expectedGuests: raw.expectedGuests != null ? raw.expectedGuests : (raw.expected_guests ?? 0),
        eventDescription: raw.eventDescription || raw.event_description || '',
        clientEmail: raw.clientEmail || raw.client_email || '',
        contactPerson: raw.contactPerson || raw.contact_person || '',
        contactPhone: raw.contactPhone || raw.contact_phone || '',
        addOns: Array.isArray(addOns) ? addOns : [],
        addOnTotal: raw.addOnTotal != null ? Number(raw.addOnTotal) : (raw.add_on_total != null ? Number(raw.add_on_total) : 0),
        chairsCount: raw.chairsCount != null ? raw.chairsCount : (raw.chairs_count ?? 0),
        electronicsCount: raw.electronicsCount != null ? raw.electronicsCount : (raw.electronics_count ?? 0),
        paymentOption: raw.paymentOption || raw.payment_option || 'full',
        downPaymentAmount: raw.downPaymentAmount != null ? Number(raw.downPaymentAmount) : (raw.down_payment_amount != null ? Number(raw.down_payment_amount) : 0),
        amountPaid: raw.amountPaid != null ? Number(raw.amountPaid) : (raw.amount_paid != null ? Number(raw.amount_paid) : 0),
        paymentStatus: raw.paymentStatus || raw.payment_status || 'pending',
        totalCost: raw.totalCost != null ? Number(raw.totalCost) : (raw.total_cost != null ? Number(raw.total_cost) : 0),
        approvedBy: raw.approvedBy || raw.approved_by || null,
        approvedAt: raw.approvedAt || raw.approved_at || null,
        rejectionReason: raw.rejectionReason || raw.rejection_reason || null,
        createdAt: raw.createdAt || raw.created_at || null
    };
}

function getStatusBadgeClass(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'pending') return 'pending';
    if (value === 'completed') return 'completed';
    return 'rejected';
}

function getStatusLabel(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'pending') return 'Pending';
    if (value === 'completed') return 'Completed';
    if (value === 'cancelled') return 'Cancelled';
    return value || 'Unknown';
}

async function loadRequests() {
    const [allReservations, users, facilities] = await Promise.all([
        window.api.getAllReservations(),
        window.api.getUsers(),
        window.api.getFacilities()
    ]);
    usersByUsername = new Map((users || []).map(u => [u.username, u]));
    facilitiesById = new Map((facilities || []).map(f => [String(f.id), f]));
    currentRequests = (allReservations || []).map(normalizeReservation);
    renderRequestStats(currentRequests);
    displayRequests(currentRequests);
}

function displayRequests(requests) {
    const listContainer = document.getElementById('requests-list');

    if (!requests || requests.length === 0) {
        listContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;"><p>No reservation requests found.</p></div>';
        return;
    }

    const sortedRequests = [...requests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    let html = '<table class="table">';
    html += '<thead><tr><th>Client</th><th>Facility</th><th>Event Date</th><th>Time</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>';
    html += '<tbody>';

    sortedRequests.forEach(req => {
        const resident = usersByUsername.get(req.username);
        const facility = facilitiesById.get(String(req.facilityId));
        const residentName = resident ? resident.fullname : (req.username || 'Unknown Client');
        const facilityName = facility ? facility.name : 'Unknown Facility';
        const statusClass = getStatusBadgeClass(req.status);
        const formattedSubmitted = formatFullDate(req.createdAt);

        html += '<tr>';
        html += `<td><strong>${escapeHtml(residentName)}</strong></td>`;
        html += `<td>${escapeHtml(facilityName)}</td>`;
        html += `<td>${formatEventDateRange(req.eventStartDate || req.eventDate, req.eventEndDate || req.eventStartDate || req.eventDate)}</td>`;
        html += `<td>${formatTimeRange(req.startTime, req.endTime)}</td>`;
        html += `<td><span class="badge ${statusClass}">${getStatusLabel(req.status)}</span></td>`;
        html += `<td>${formattedSubmitted}</td>`;
        html += `<td><button class="btn btn-sm btn-primary" onclick="openApprovalModal('${req.id}')">Review</button></td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    listContainer.innerHTML = html;
}

function getConflictListForRequest(request) {
    const reqStart = new Date(`${request.eventStartDate || request.eventDate}T${request.startTime}`);
    const reqEndDate = request.eventEndDate || request.eventDate;
    const reqEnd = new Date(`${reqEndDate}T${request.endTime}`);

    return currentRequests.filter(r => {
        if (r.facilityId !== request.facilityId) return false;
        if (String(r.id) === String(request.id)) return false;
        if (!['pending', 'completed', 'billing'].includes(String(r.status || '').toLowerCase())) return false;

        const rStart = new Date(`${r.eventStartDate || r.eventDate}T${r.startTime}`);
        const rEndDate = r.eventEndDate || r.eventDate;
        const rEnd = new Date(`${rEndDate}T${r.endTime}`);
        if (Number.isNaN(rStart.getTime()) || Number.isNaN(rEnd.getTime())) return false;
        return !(reqEnd <= rStart || reqStart >= rEnd);
    });
}

function hasConflictForValues(facilityId, eventDate, eventEndDate, startTime, endTime, excludeId) {
    const reqStart = new Date(`${eventDate}T${startTime}`);
    const reqEnd = new Date(`${eventEndDate}T${endTime}`);
    if (Number.isNaN(reqStart.getTime()) || Number.isNaN(reqEnd.getTime())) return false;

    return currentRequests.some(r => {
        if (String(r.id) === String(excludeId)) return false;
        if (String(r.facilityId) !== String(facilityId)) return false;
        if (!['pending', 'completed', 'billing'].includes(String(r.status || '').toLowerCase())) return false;

        const rStart = new Date(`${r.eventStartDate || r.eventDate}T${r.startTime}`);
        const rEndDate = r.eventEndDate || r.eventDate;
        const rEnd = new Date(`${rEndDate}T${r.endTime}`);
        if (Number.isNaN(rStart.getTime()) || Number.isNaN(rEnd.getTime())) return false;
        return !(reqEnd <= rStart || reqStart >= rEnd);
    });
}

function buildEditSection(request, facility) {
    const eventTypes = normalizeFacilityEventTypes(facility ? facility.eventTypes : []);
    const typeOptions = eventTypes.length
        ? eventTypes.map(t => `<option value="${escapeHtml(t)}" ${t === request.eventType ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')
        : `<option value="${escapeHtml(request.eventType || '')}" selected>${escapeHtml(request.eventType || 'Other')}</option>`;

    return `
        <div id="approvalEditSection" style="display:${isEditMode ? 'block' : 'none'}; background:#fff4fb; border:1px solid #f8cae0; border-radius:8px; padding:12px; margin-top:12px;">
            <strong style="color:#c2185b;">Edit Pending Reservation</strong>
            <div class="approval-edit-grid">
                <div>
                    <label style="font-size:12px; color:#777;">Client Name</label>
                    <input id="editClientName" type="text" value="${escapeHtml(request.username)}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Contact Person</label>
                    <input id="editContactPerson" type="text" value="${escapeHtml(request.contactPerson)}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Client Email</label>
                    <input id="editClientEmail" type="email" value="${escapeHtml(request.clientEmail || '')}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Contact Phone</label>
                    <input id="editContactPhone" type="text" value="${escapeHtml(request.contactPhone)}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Expected Guests</label>
                    <input id="editExpectedGuests" type="number" min="1" value="${Number(request.expectedGuests || 1)}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Start Date</label>
                    <input id="editEventDate" type="date" value="${escapeHtml(toDateInput(request.eventStartDate || request.eventDate))}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">End Date</label>
                    <input id="editEventEndDate" type="date" value="${escapeHtml(toDateInput(request.eventEndDate || request.eventStartDate || request.eventDate))}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Start Time</label>
                    <input id="editStartTime" type="time" value="${escapeHtml(toTimeInput(request.startTime))}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">End Time</label>
                    <input id="editEndTime" type="time" value="${escapeHtml(toTimeInput(request.endTime))}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="is-full">
                    <label style="font-size:12px; color:#777;">Event Type</label>
                    <select id="editEventType" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        ${typeOptions}
                    </select>
                </div>
                <div class="is-full">
                    <label style="font-size:12px; color:#777;">Event Description</label>
                    <textarea id="editEventDescription" rows="3" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">${escapeHtml(request.eventDescription || '')}</textarea>
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Facility Price (₱)</label>
                    <input id="editFacilityAmount" type="number" min="0" step="0.01" value="${getFacilityBaseAmountForRequest(request, facility).toFixed(2)}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Payment Option</label>
                    <select id="editPaymentOption" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        <option value="full" ${String(request.paymentOption || 'full') === 'full' ? 'selected' : ''}>Full Payment</option>
                        <option value="down_payment" ${String(request.paymentOption || '') === 'down_payment' ? 'selected' : ''}>Down Payment</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px; color:#777;">Down Payment Amount (₱)</label>
                    <input id="editDownPaymentAmount" type="number" min="0" step="0.01" value="${Number(request.downPaymentAmount || 0).toFixed(2)}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:6px;">
                </div>
                <div class="is-full">
                    <label style="font-size:12px; color:#777;">Add-ons (Qty / Price)</label>
                    <div class="approval-addon-box" style="background:#fff; border:1px solid #f2d9e7; border-radius:6px; padding:8px;">
                        ${buildAddOnPriceEditorHtml(request)}
                    </div>
                </div>
                <div class="is-full" style="font-size:12px; color:#666; font-weight:600;" id="editTotalPreview"></div>
            </div>
            <small style="display:block; margin-top:8px; color:#777;">Saving will recalculate total cost based on updated schedule + existing add-ons.</small>
        </div>
    `;
}

function updateApprovalFooterButtons(request) {
    const editBtnModal = document.getElementById('editBtnModal');
    const saveEditBtnModal = document.getElementById('saveEditBtnModal');
    const cancelEditBtnModal = document.getElementById('cancelEditBtnModal');

    if (!editBtnModal || !saveEditBtnModal || !cancelEditBtnModal) return;

    const isEditable = request && request.status === 'pending' && String(request.paymentStatus || 'pending').toLowerCase() === 'pending';
    editBtnModal.style.display = (isEditable && !isEditMode) ? 'block' : 'none';
    saveEditBtnModal.style.display = (isEditable && isEditMode) ? 'block' : 'none';
    cancelEditBtnModal.style.display = (isEditable && isEditMode) ? 'block' : 'none';
}

function openApprovalModal(requestId) {
    const request = currentRequests.find(r => String(r.id) === String(requestId));
    if (!request) return;

    currentRequest = request;
    isEditMode = false;

    const resident = usersByUsername.get(request.username);
    const facility = facilitiesById.get(String(request.facilityId));
    const residentName = resident ? resident.fullname : (request.username || 'Unknown Client');
    const facilityName = facility ? facility.name : 'Unknown';

    let conflictHtml = '';
    const conflicts = getConflictListForRequest(request);
    if (conflicts.length > 0) {
        conflictHtml = '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 15px; border-radius: 4px;">';
        conflictHtml += '<strong>⚠️ Time Conflict Warning:</strong><br>';
        conflictHtml += 'Other active reservations overlapping this schedule:';
        conflicts.forEach(r => {
            conflictHtml += `<br>• ${formatTimeRange(r.startTime, r.endTime)}`;
        });
        conflictHtml += '</div>';
    }

    let approvalBody = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong style="color: #e83e8c;">Client Information</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${escapeHtml(residentName)}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${escapeHtml(request.clientEmail || '-')}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Contact:</strong> ${escapeHtml(request.contactPerson)}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${escapeHtml(request.contactPhone)}</p>
            </div>
            <div>
                <strong style="color: #e83e8c;">Facility & Booking</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Facility:</strong> ${escapeHtml(facilityName)}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${formatFullDate(request.eventStartDate || request.eventDate)}${request.eventEndDate && request.eventEndDate !== (request.eventStartDate || request.eventDate) ? ' → ' + formatFullDate(request.eventEndDate) : ''}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${formatTimeRange(request.startTime, request.endTime)}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Cost:</strong> ₱${Number(request.totalCost || 0).toFixed(2)}</p>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong style="color: #e83e8c;">Event Details</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${escapeHtml(request.eventType)}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Expected Guests:</strong> ${Number(request.expectedGuests || 0)}</p>
            </div>
            <div>
                <strong style="color: #e83e8c;">Status</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Current:</strong> <span class="badge ${getStatusBadgeClass(request.status)}">${getStatusLabel(request.status)}</span></p>
                <p style="margin: 5px 0; color: #666;"><strong>Submitted:</strong> ${formatFullDate(request.createdAt)}</p>
            </div>
        </div>

        <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <strong style="color: #e83e8c;">Event Description</strong>
            <p style="margin: 8px 0; color: #666;">${escapeHtml(request.eventDescription || 'No description provided')}</p>
        </div>

        <div style="background: #eef4ff; border: 1px solid #dce7ff; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <strong style="color: #3557d6;">Invoice Summary</strong>
            <p style="margin: 8px 0 4px; color: #445;"><strong>Total Amount:</strong> ₱${Number(request.totalCost || 0).toFixed(2)}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Payment Option:</strong> ${request.paymentOption === 'down_payment' ? 'Down Payment' : 'Full Payment'}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Down Payment:</strong> ₱${Number(request.downPaymentAmount || 0).toFixed(2)}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Amount Paid:</strong> ₱${Number(request.amountPaid || 0).toFixed(2)}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Remaining Balance:</strong> ₱${Math.max(0, Number(request.totalCost || 0) - Number(request.amountPaid || 0)).toFixed(2)}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Payment Status:</strong> ${String(request.paymentStatus || 'pending').toUpperCase()}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Add-ons:</strong> ${escapeHtml(formatAddOnLabelText(request))}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Add-on Subtotal:</strong> ₱${getAddOnSubtotalForRequest(request).toFixed(2)}</p>
        </div>

        ${conflictHtml}
        ${request.status === 'pending' && String(request.paymentStatus || 'pending').toLowerCase() === 'pending' ? buildEditSection(request, facility) : ''}
    `;

    if (!(request.status === 'pending' && String(request.paymentStatus || 'pending').toLowerCase() === 'pending')) {
        approvalBody += `
            <div style="background: #f5f7fb; border-left: 4px solid #94a3b8; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
                <strong style="color: #334155;">View Only</strong>
                <p style="margin: 5px 0; color: #475569;">Editing is no longer allowed after billing confirmation or cancellation.</p>
            </div>
        `;
    }

    document.getElementById('approvalBody').innerHTML = approvalBody;
    updateApprovalFooterButtons(request);
    document.getElementById('approvalModal').classList.add('show');
}

function enterEditMode() {
    if (!currentRequest || currentRequest.status !== 'pending' || String(currentRequest.paymentStatus || 'pending').toLowerCase() !== 'pending') return;
    isEditMode = true;
    const section = document.getElementById('approvalEditSection');
    if (section) section.style.display = 'block';
    const paymentSelect = document.getElementById('editPaymentOption');
    const downInput = document.getElementById('editDownPaymentAmount');
    const syncDownPaymentField = () => {
        if (!paymentSelect || !downInput) return;
        if (paymentSelect.value === 'down_payment') {
            downInput.removeAttribute('disabled');
        } else {
            downInput.value = '0.00';
            downInput.setAttribute('disabled', 'disabled');
        }
    };
    if (paymentSelect && downInput) {
        paymentSelect.addEventListener('change', syncDownPaymentField);
        syncDownPaymentField();
    }
    const facilityAmountInput = document.getElementById('editFacilityAmount');
    if (facilityAmountInput) {
        facilityAmountInput.addEventListener('input', refreshEditedTotalPreview);
    }
    document.querySelectorAll('.edit-addon-qty,.edit-addon-price').forEach(input => {
        input.addEventListener('input', refreshEditedTotalPreview);
    });
    refreshEditedTotalPreview();
    updateApprovalFooterButtons(currentRequest);
}

function cancelEditMode() {
    if (!currentRequest) return;
    isEditMode = false;
    openApprovalModal(currentRequest.id);
}

function updateRequestCache(updated) {
    const normalized = normalizeReservation(updated);
    const idx = currentRequests.findIndex(r => String(r.id) === String(normalized.id));
    if (idx >= 0) currentRequests[idx] = normalized;
    currentRequest = normalized;
    return normalized;
}

async function saveRequestEdits() {
    if (!currentRequest || currentRequest.status !== 'pending' || String(currentRequest.paymentStatus || 'pending').toLowerCase() !== 'pending') return;

    const facility = facilitiesById.get(String(currentRequest.facilityId));
    if (!facility) {
        showToast('Facility not found for this reservation.', 'danger');
        return;
    }

    const clientName = String(document.getElementById('editClientName')?.value || '').trim();
    const clientEmail = String(document.getElementById('editClientEmail')?.value || '').trim();
    const contactPerson = String(document.getElementById('editContactPerson')?.value || '').trim();
    const contactPhone = String(document.getElementById('editContactPhone')?.value || '').trim();
    const expectedGuests = parseInt(String(document.getElementById('editExpectedGuests')?.value || '0'), 10);
    const eventDate = String(document.getElementById('editEventDate')?.value || '').trim();
    const eventEndDate = String(document.getElementById('editEventEndDate')?.value || '').trim() || eventDate;
    const startTime = String(document.getElementById('editStartTime')?.value || '').trim();
    const endTime = String(document.getElementById('editEndTime')?.value || '').trim();
    const eventType = String(document.getElementById('editEventType')?.value || '').trim();
    const eventDescription = String(document.getElementById('editEventDescription')?.value || '').trim();
    const facilityAmountInput = Number(document.getElementById('editFacilityAmount')?.value || 0);
    const paymentOption = String(document.getElementById('editPaymentOption')?.value || 'full').trim();
    const downPaymentInput = Number(document.getElementById('editDownPaymentAmount')?.value || 0);

    if (clientName.length < 3) {
        showToast('Client name must be at least 3 characters.', 'warning');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        showToast('Please enter a valid client email address.', 'warning');
        return;
    }
    if (!/^[A-Za-z\s.'-]+$/.test(contactPerson)) {
        showToast('Contact person must contain letters/spaces only.', 'warning');
        return;
    }
    if (!/^\d{7,15}$/.test(contactPhone)) {
        showToast('Contact phone must be 7-15 digits.', 'warning');
        return;
    }
    if (!eventDate || !eventEndDate || !startTime || !endTime) {
        showToast('Date and time are required.', 'warning');
        return;
    }
    const startDt = new Date(`${eventDate}T${startTime}`);
    const endDt = new Date(`${eventEndDate}T${endTime}`);
    if (Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime()) || endDt <= startDt) {
        showToast('End date/time must be after start date/time.', 'warning');
        return;
    }
    if (!Number.isFinite(expectedGuests) || expectedGuests < 1) {
        showToast('Expected guests must be at least 1.', 'warning');
        return;
    }
    if (expectedGuests > Number(facility.capacity || 0)) {
        showToast(`Expected guests exceeds facility capacity (${facility.capacity}).`, 'warning');
        return;
    }

    const allowedEventTypes = normalizeFacilityEventTypes(facility.eventTypes);
    if (eventType && allowedEventTypes.length && !allowedEventTypes.includes(eventType)) {
        showToast('Event type is not allowed for this facility.', 'warning');
        return;
    }

    if (hasConflictForValues(currentRequest.facilityId, eventDate, eventEndDate, startTime, endTime, currentRequest.id)) {
        showToast('Schedule conflicts with another active reservation.', 'warning');
        return;
    }

    const facilityAmount = Number.isFinite(facilityAmountInput) ? Math.max(0, facilityAmountInput) : 0;
    const addOns = collectEditedAddOns();
    const addOnSubtotal = Number(computeEditedAddOnTotal().toFixed(2));
    const recalculatedTotal = Number((facilityAmount + addOnSubtotal).toFixed(2));
    let downPaymentAmount = 0;
    if (paymentOption === 'down_payment') {
        downPaymentAmount = Number.isFinite(downPaymentInput) ? Math.max(0, downPaymentInput) : 0;
        if (downPaymentAmount <= 0) {
            showToast('Down payment must be greater than 0.', 'warning');
            return;
        }
        if (downPaymentAmount > recalculatedTotal) {
            showToast('Down payment cannot exceed total cost.', 'warning');
            return;
        }
    }
    if (paymentOption !== 'full' && paymentOption !== 'down_payment') {
        showToast('Invalid payment option.', 'warning');
        return;
    }

    try {
        const updated = await window.api.updateReservation(currentRequest.id, {
            username: clientName,
            clientEmail,
            eventDate,
            eventEndDate,
            startTime,
            endTime,
            eventType,
            expectedGuests,
            eventDescription,
            contactPerson,
            contactPhone,
            addOns,
            addOnTotal: addOnSubtotal,
            paymentOption,
            totalCost: recalculatedTotal,
            downPaymentAmount
        });

        updateRequestCache(updated);
        isEditMode = false;
        showToast('Reservation details updated.', 'success');
        renderRequestStats(currentRequests);
        filterRequests();
        openApprovalModal(currentRequest.id);
    } catch (e) {
        showToast('Failed to save changes: ' + (e.message || 'Unknown error'), 'danger');
    }
}

function closeApprovalModal() {
    currentRequest = null;
    isEditMode = false;
    document.getElementById('approvalModal').classList.remove('show');
}

function filterRequests() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let allReservations = [...currentRequests];

    if (searchTerm) {
        allReservations = allReservations.filter(req => {
            const resident = usersByUsername.get(req.username);
            const facility = facilitiesById.get(String(req.facilityId));
            const residentName = resident ? resident.fullname.toLowerCase() : String(req.username || '').toLowerCase();
            const contactName = String(req.contactPerson || '').toLowerCase();
            const contactPhone = String(req.contactPhone || '').toLowerCase();
            const clientEmail = String(req.clientEmail || '').toLowerCase();
            const facilityName = facility ? facility.name.toLowerCase() : '';
            return residentName.includes(searchTerm) ||
                contactName.includes(searchTerm) ||
                contactPhone.includes(searchTerm) ||
                clientEmail.includes(searchTerm) ||
                facilityName.includes(searchTerm);
        });
    }

    if (statusFilter) {
        allReservations = allReservations.filter(req => req.status === statusFilter);
    }

    displayRequests(allReservations);
}

function renderRequestStats(requests) {
    const pendingEl = document.getElementById('statPendingCount');
    const totalEl = document.getElementById('statTotalCount');
    const completedEl = document.getElementById('statCompletedCount');
    const rejectedEl = document.getElementById('statRejectedCount');
    if (!totalEl || !pendingEl || !completedEl || !rejectedEl) return;

    let total = 0;
    let pending = 0;
    let completed = 0;
    let cancelled = 0;

    (requests || []).forEach((req) => {
        total += 1;
        const status = String(req.status || '').toLowerCase();
        if (status === 'pending') pending += 1;
        if (status === 'completed') completed += 1;
        if (status === 'cancelled') cancelled += 1;
    });

    totalEl.textContent = String(total);
    pendingEl.textContent = String(pending);
    completedEl.textContent = String(completed);
    rejectedEl.textContent = String(cancelled);
}

document.addEventListener('click', function(event) {
    const approvalModal = document.getElementById('approvalModal');

    if (event.target === approvalModal) {
        closeApprovalModal();
    }
});
