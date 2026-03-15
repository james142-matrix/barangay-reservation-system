// Initialize admin facilities page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    const user = getLoggedInUser();
    canManageFacilities = !!user && user.role === 'admin';

    const addButton = document.querySelector('button[onclick="openAddFacilityModal()"]');
    if (addButton && !canManageFacilities) {
        addButton.style.display = 'none';
    }

    const facilityModal = document.getElementById('facilityModal');
    if (facilityModal && !canManageFacilities) {
        facilityModal.style.display = 'none';
    }

    bindEventTypeEditor();
    bindAddOnEditor();

    loadFacilitiesList();
});

let currentFacilityId = null;
let currentFacilities = [];
let canManageFacilities = false;
let reservationsByFacility = new Map();

const DEFAULT_EVENT_TYPES = [
    'Birthday Party',
    'Wedding',
    'Conference',
    'Community Event',
    'Sports Activity',
    'Training/Workshop',
    'Other'
];

function normalizeEventTypes(raw) {
    let list = [];
    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                list = parsed;
            } else {
                list = raw.split(/\r?\n|,/);
            }
        } catch {
            list = raw.split(/\r?\n|,/);
        }
    }

    const clean = [];
    list.forEach(item => {
        const value = String(item || '').trim();
        if (!value) return;
        if (!clean.includes(value)) clean.push(value);
    });

    return clean;
}

function bindEventTypeEditor() {
    const addBtn = document.getElementById('addFacilityEventTypeBtn');
    const rows = document.getElementById('facilityEventTypeRows');
    if (!addBtn || !rows) return;

    addBtn.addEventListener('click', function() {
        addEventTypeRow('');
    });

    rows.addEventListener('click', function(event) {
        const archiveBtn = event.target.closest('[data-action="toggle-event-type-archive"]');
        if (!archiveBtn) return;
        const row = archiveBtn.closest('.event-type-row-item');
        if (!row) return;
        const archived = row.getAttribute('data-archived') === '1';
        setEventTypeRowArchived(row, !archived);
    });
}

function setEventTypeRowArchived(row, archived) {
    row.setAttribute('data-archived', archived ? '1' : '0');
    row.classList.toggle('is-archived', !!archived);
    const btn = row.querySelector('[data-action="toggle-event-type-archive"]');
    if (btn) {
        btn.textContent = archived ? 'Restore' : 'Archive';
        btn.classList.toggle('btn-secondary', !!archived);
        btn.classList.toggle('btn-danger', !archived);
    }
}

function addEventTypeRow(value, archived) {
    const rows = document.getElementById('facilityEventTypeRows');
    if (!rows) return;
    const row = document.createElement('div');
    row.className = 'event-type-row-item';
    row.innerHTML = `
        <input type="text" class="event-type-name" placeholder="Event type (e.g. Birthday Party)" value="${escapeHtml(value || '')}">
        <button type="button" class="btn btn-danger btn-small" data-action="toggle-event-type-archive">Archive</button>
    `;
    setEventTypeRowArchived(row, !!archived);
    rows.appendChild(row);
}

function renderEventTypeRows(activeRaw, archivedRaw) {
    const rows = document.getElementById('facilityEventTypeRows');
    if (!rows) return;
    rows.innerHTML = '';
    const active = normalizeEventTypes(activeRaw);
    const archived = normalizeEventTypes(archivedRaw);
    active.forEach(item => addEventTypeRow(item, false));
    archived.forEach(item => addEventTypeRow(item, true));
    if (!active.length && !archived.length) addEventTypeRow('', false);
}

function collectEventTypesFromRows() {
    const rows = document.getElementById('facilityEventTypeRows');
    if (!rows) return { active: [...DEFAULT_EVENT_TYPES], archived: [] };
    const items = rows.querySelectorAll('.event-type-row-item');
    const active = [];
    const archived = [];
    items.forEach(row => {
        const input = row.querySelector('.event-type-name');
        const value = String(input ? input.value : '').trim();
        if (!value) return;
        const isArchived = row.getAttribute('data-archived') === '1';
        if (isArchived) {
            if (!archived.includes(value)) archived.push(value);
        } else {
            if (!active.includes(value)) active.push(value);
        }
    });
    return { active, archived };
}

function normalizeAddOns(raw) {
    let list = [];
    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                list = parsed;
            }
        } catch {
            list = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
                const parts = line.split('|');
                return {
                    name: String(parts[0] || '').trim(),
                    price: Number(parts[1] || 0),
                    unit: String(parts[2] || 'item').trim() || 'item',
                    enabled: true
                };
            });
        }
    }

    const clean = [];
    list.forEach((item, idx) => {
        if (!item || typeof item !== 'object') return;
        const name = String(item.name || '').trim();
        const price = Math.max(0, Number(item.price || 0));
        const unit = String(item.unit || 'item').trim() || 'item';
        const enabled = !Object.prototype.hasOwnProperty.call(item, 'enabled') ? true : !!item.enabled;
        const id = String(item.id || `addon_${idx + 1}`).trim() || `addon_${idx + 1}`;
        if (!name) return;
        clean.push({ id, name, price, unit, enabled });
    });
    return clean;
}

function bindAddOnEditor() {
    const addBtn = document.getElementById('addFacilityAddOnBtn');
    const rows = document.getElementById('facilityAddOnsRows');
    if (!addBtn || !rows) return;

    addBtn.addEventListener('click', function() {
        addAddOnRow();
    });

    rows.addEventListener('click', function(event) {
        const archiveBtn = event.target.closest('[data-action="toggle-addon-archive"]');
        if (!archiveBtn) return;
        const row = archiveBtn.closest('.facility-addon-row-item');
        if (!row) return;
        const archived = row.getAttribute('data-archived') === '1';
        setAddOnRowArchived(row, !archived);
    });
}

function setAddOnRowArchived(row, archived) {
    row.setAttribute('data-archived', archived ? '1' : '0');
    row.classList.toggle('is-archived', !!archived);
    const btn = row.querySelector('[data-action="toggle-addon-archive"]');
    if (btn) {
        btn.textContent = archived ? 'Restore' : 'Archive';
        btn.classList.toggle('btn-secondary', !!archived);
        btn.classList.toggle('btn-danger', !archived);
    }
}

function addAddOnRow(addOn) {
    const rows = document.getElementById('facilityAddOnsRows');
    if (!rows) return;

    const data = addOn || { name: '', price: '', unit: 'item' };
    const row = document.createElement('div');
    row.className = 'facility-addon-row-item';
    row.innerHTML = `
        <input type="text" class="addon-name" placeholder="Name (e.g. Projector)" value="${escapeHtml(data.name || '')}">
        <input type="number" class="addon-price" placeholder="Price" min="0" step="0.01" value="${data.price !== '' && data.price != null ? Number(data.price) : ''}">
        <input type="text" class="addon-unit" placeholder="Unit (e.g. set)" value="${escapeHtml(data.unit || 'item')}">
        <button type="button" class="btn btn-danger btn-small" data-action="toggle-addon-archive">Archive</button>
    `;
    setAddOnRowArchived(row, data.enabled === false);
    rows.appendChild(row);
}

function renderAddOnRows(raw) {
    const rows = document.getElementById('facilityAddOnsRows');
    if (!rows) return;
    rows.innerHTML = '';
    const addOns = normalizeAddOns(raw);
    if (!addOns.length) {
        addAddOnRow();
        return;
    }
    addOns.forEach(addOn => addAddOnRow(addOn));
}

function collectAddOnsFromRows() {
    const rows = document.getElementById('facilityAddOnsRows');
    if (!rows) return [];
    const out = [];
    const items = rows.querySelectorAll('.facility-addon-row-item');
    items.forEach((row, index) => {
        const nameInput = row.querySelector('.addon-name');
        const priceInput = row.querySelector('.addon-price');
        const unitInput = row.querySelector('.addon-unit');
        const name = String(nameInput ? nameInput.value : '').trim();
        const price = Number(priceInput ? priceInput.value : 0);
        const unit = String(unitInput ? unitInput.value : '').trim() || 'item';
        if (!name) return;
        if (!Number.isFinite(price) || price < 0) return;
        const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'addon'}_${index + 1}`;
        const isArchived = row.getAttribute('data-archived') === '1';
        out.push({ id, name, price: Number(price.toFixed(2)), unit, enabled: !isArchived });
    });
    return out;
}

function denyManageAction() {
    if (canManageFacilities) return false;
    if (typeof showToast === 'function') {
        showToast('Only admin can manage facilities.', 'warning');
    } else {
        alert('Only admin can manage facilities.');
    }
    return true;
}

async function loadFacilitiesList() {
    const container = document.getElementById('facilities-list');
    container.innerHTML = '<p style="padding:20px;color:#888;">Loading facilities…</p>';

    let facilities = [];
    let reservations = [];
    try {
        [facilities, reservations] = await Promise.all([
            window.api.getFacilities(),
            window.api.getAllReservations()
        ]);
    } catch (e) {
        console.error('Could not load facilities from API', e);
        container.innerHTML = '<p style="padding:20px;color:#dc2626;">Failed to load facilities from server.</p>';
        return;
    }
    currentFacilities = Array.isArray(facilities) ? facilities : [];
    buildReservationSummary(Array.isArray(reservations) ? reservations : []);
    renderQuickStats();

    if (currentFacilities.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">🏢</div>
                <h3>No Facilities Yet</h3>
                <p>${canManageFacilities ? 'Click "Add New Facility" to create your first facility.' : 'No facilities are currently available.'}</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    currentFacilities.forEach(facility => {
        const card = document.createElement('div');
        card.className = 'facility-card staff-facility-card';
        card.innerHTML = buildFacilityCardHtml(facility);
        container.appendChild(card);
    });
}

function buildFacilityCardHtml(facility) {
    const facilityIcon = resolveFacilityIcon(facility);
    const price = parseFloat(facility.price) || 0;
    const status = String(facility.status || 'available').toLowerCase();
    const statusClass = status === 'available' ? 'is-available' : 'is-unavailable';
    const statusLabel = status === 'available' ? 'Available' : capitalize(status);
    const stats = reservationsByFacility.get(String(facility.id)) || { review: 0, billing: 0, completed: 0, cancelled: 0 };
    const eventTypes = normalizeEventTypes(facility.eventTypes).slice(0, 3);
    const eventTypeHtml = eventTypes.length
        ? eventTypes.map(type => `<span class="staff-chip">${escapeHtml(type)}</span>`).join('')
        : '<span class="staff-chip">General Event</span>';
    const addOns = normalizeAddOns(facility.addOns);
    const openingTime = String(facility.openingTime || '').trim();
    const closingTime = String(facility.closingTime || '').trim();
    const allowsOvernight = !!facility.allowsOvernight;
    const allowsAllDay = !!facility.allowsAllDay;
    const allowsMultiDay = !!facility.allowsMultiDay;
    const maxDurationHours = Number.isFinite(Number(facility.maxDurationHours)) ? Number(facility.maxDurationHours) : null;
    const rulesText = [
        openingTime && closingTime ? `${formatTimeLabel(openingTime)} - ${formatTimeLabel(closingTime)}` : 'No hour limit',
        `Overnight: ${allowsOvernight ? 'Allowed' : 'Not allowed'}`,
        `All-day: ${allowsAllDay ? 'Allowed' : 'Not allowed'}`,
        `Multi-day: ${allowsMultiDay ? 'Allowed' : 'Not allowed'}`,
        maxDurationHours && maxDurationHours > 0 ? `Max: ${maxDurationHours}h` : 'Max: none'
    ].join(' • ');
    const addOnChipHtml = addOns.length
        ? addOns.slice(0, 3).map(item => `<span class="staff-chip">${escapeHtml(item.name)}</span>`).join('')
        : '<span class="staff-chip">No Add-ons</span>';

    return `
        <div class="facility-image staff-facility-image">
            <div class="staff-facility-icon">${facilityIcon}</div>
            <span class="staff-status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="facility-info">
            <h3>${escapeHtml(facility.name || 'Unnamed Facility')}</h3>
            <p>${escapeHtml(facility.description || 'No description provided.')}</p>
            <div class="staff-facility-meta">
                <span class="staff-pill">👥 ${facility.capacity} capacity</span>
                <span class="staff-pill">₱${price.toFixed(2)} per event</span>
            </div>
            <div class="staff-facility-meta">
                <span class="staff-pill">🧩 ${addOns.length} add-on${addOns.length === 1 ? '' : 's'}</span>
                <span class="staff-pill">${statusLabel}</span>
            </div>
            <div class="staff-chip-row">${eventTypeHtml}</div>
            <div class="staff-chip-row">${addOnChipHtml}</div>
            <p class="staff-facility-rules">${escapeHtml(rulesText)}</p>
            <div class="staff-facility-meta">
                <span class="staff-pill staff-pill-pending">📝 ${stats.review} pending</span>
                <span class="staff-pill staff-pill-approved">💳 ${stats.billing} in billing</span>
            </div>
            <div class="staff-facility-meta">
                <span class="staff-pill staff-pill-completed">🏁 ${stats.completed} completed</span>
                <span class="staff-pill staff-pill-rejected">✖ ${stats.cancelled} cancelled</span>
                <span class="staff-pill">Total ${stats.review + stats.billing + stats.completed + stats.cancelled}</span>
            </div>
            ${canManageFacilities
                ? `<div class="staff-facility-meta" style="margin-top:auto;">
                    <button class="btn btn-small btn-primary" onclick="editFacility('${facility.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteFacility('${facility.id}')">Archive</button>
                </div>`
                : '<div class="staff-status-line">View only</div>'
            }
        </div>
    `;
}

function buildReservationSummary(reservations) {
    reservationsByFacility = new Map();

    reservations.forEach(raw => {
        const facilityId = String(raw.facilityId ?? raw.facility_id ?? '');
        if (!facilityId) return;

        if (!reservationsByFacility.has(facilityId)) {
            reservationsByFacility.set(facilityId, { review: 0, billing: 0, completed: 0, cancelled: 0 });
        }

        const row = reservationsByFacility.get(facilityId);
        const rowStatus = String(raw.status || '').toLowerCase();
        if (rowStatus === 'pending') row.review += 1;
        if (rowStatus === 'billing') row.billing += 1;
        if (rowStatus === 'completed') row.completed += 1;
        if (rowStatus === 'cancelled') row.cancelled += 1;
    });
}

function renderQuickStats() {
    const totalEl = document.getElementById('statTotalFacilities');
    const availableEl = document.getElementById('statAvailableFacilities');
    const unavailableEl = document.getElementById('statUnavailableFacilities');
    if (!totalEl || !availableEl || !unavailableEl) return;

    let available = 0;
    let unavailable = 0;
    currentFacilities.forEach((facility) => {
        const status = String(facility.status || 'available').toLowerCase();
        if (status === 'available') available += 1;
        else unavailable += 1;
    });

    totalEl.textContent = String(currentFacilities.length);
    availableEl.textContent = String(available);
    unavailableEl.textContent = String(unavailable);
}

function openAddFacilityModal() {
    if (denyManageAction()) return;
    currentFacilityId = null;
    document.getElementById('modalTitle').textContent = 'Add New Facility';
    document.getElementById('facilityForm').reset();
    document.getElementById('facilityIcon').value = '🏛️';
    document.getElementById('facilityStatus').value = 'available';
    document.getElementById('facilityOpeningTime').value = '';
    document.getElementById('facilityClosingTime').value = '';
    document.getElementById('facilityAllowsOvernight').value = '0';
    document.getElementById('facilityAllowsAllDay').value = '0';
    document.getElementById('facilityAllowsMultiDay').value = '0';
    document.getElementById('facilityMaxDurationHours').value = '';
    renderEventTypeRows(DEFAULT_EVENT_TYPES, []);
    renderAddOnRows([]);
    document.getElementById('facilityModal').classList.add('show');
}

function editFacility(facilityId) {
    if (denyManageAction()) return;
    const facility = currentFacilities.find(f => String(f.id) === String(facilityId));
    if (!facility) {
        if (typeof showToast === 'function') showToast('Facility not found', 'danger');
        return;
    }
    
    currentFacilityId = facilityId;
    document.getElementById('modalTitle').textContent = 'Edit Facility';
    document.getElementById('facilityName').value = facility.name;
    document.getElementById('facilityIcon').value = resolveFacilityIcon(facility);
    document.getElementById('facilityCapacity').value = facility.capacity;
    document.getElementById('facilityPrice').value = facility.price;
    document.getElementById('facilityDescription').value = facility.description || '';
    document.getElementById('facilityStatus').value = facility.status || 'available';
    document.getElementById('facilityOpeningTime').value = (facility.openingTime || '').slice(0, 5);
    document.getElementById('facilityClosingTime').value = (facility.closingTime || '').slice(0, 5);
    document.getElementById('facilityAllowsOvernight').value = facility.allowsOvernight ? '1' : '0';
    document.getElementById('facilityAllowsAllDay').value = facility.allowsAllDay ? '1' : '0';
    document.getElementById('facilityAllowsMultiDay').value = facility.allowsMultiDay ? '1' : '0';
    document.getElementById('facilityMaxDurationHours').value = facility.maxDurationHours != null ? String(facility.maxDurationHours) : '';
    renderEventTypeRows(facility.eventTypes, facility.archivedEventTypes || []);
    renderAddOnRows(facility.addOns);
    
    document.getElementById('facilityModal').classList.add('show');
}

async function saveFacility() {
    if (denyManageAction()) return;
    const name = document.getElementById('facilityName').value.trim();
    const icon = document.getElementById('facilityIcon').value.trim() || '🏛️';
    const capacity = parseInt(document.getElementById('facilityCapacity').value);
    const price = parseFloat(document.getElementById('facilityPrice').value);
    const description = document.getElementById('facilityDescription').value.trim();
    const status = document.getElementById('facilityStatus').value;
    const openingTime = String(document.getElementById('facilityOpeningTime').value || '').trim();
    const closingTime = String(document.getElementById('facilityClosingTime').value || '').trim();
    const allowsOvernight = document.getElementById('facilityAllowsOvernight').value === '1';
    const allowsAllDay = document.getElementById('facilityAllowsAllDay').value === '1';
    const allowsMultiDay = document.getElementById('facilityAllowsMultiDay').value === '1';
    const maxDurationRaw = String(document.getElementById('facilityMaxDurationHours').value || '').trim();
    const maxDurationHours = maxDurationRaw === '' ? null : parseInt(maxDurationRaw, 10);
    const eventTypesPayload = collectEventTypesFromRows();
    const addOns = collectAddOnsFromRows();

    if (!name || !capacity || isNaN(price)) {
        if (typeof showToast === 'function') showToast('Please fill in all required fields', 'warning');
        return;
    }
    if ((openingTime && !closingTime) || (!openingTime && closingTime)) {
        if (typeof showToast === 'function') showToast('Set both opening and closing time, or leave both blank.', 'warning');
        return;
    }
    if (maxDurationRaw !== '' && (!Number.isFinite(maxDurationHours) || maxDurationHours <= 0)) {
        if (typeof showToast === 'function') showToast('Maximum duration must be a positive whole number.', 'warning');
        return;
    }

    const facilityData = {
        name,
        icon,
        capacity,
        price,
        description,
        status,
        openingTime: openingTime || null,
        closingTime: closingTime || null,
        allowsOvernight,
        allowsAllDay,
        allowsMultiDay,
        maxDurationHours,
        eventTypes: eventTypesPayload.active,
        archivedEventTypes: eventTypesPayload.archived,
        addOns
    };

    try {
        if (currentFacilityId) {
            await window.api.updateFacility(currentFacilityId, facilityData);
            if (typeof showToast === 'function') showToast('Facility updated successfully', 'success');
        } else {
            await window.api.createFacility(facilityData);
            if (typeof showToast === 'function') showToast('Facility added successfully', 'success');
        }
    } catch (e) {
        console.error('saveFacility error', e);
        if (typeof showToast === 'function') showToast('Failed to save facility: ' + e.message, 'danger');
        return;
    }

    closeFacilityModal();
    loadFacilitiesList();
}

function confirmDeleteFacility(facilityId) {
    if (denyManageAction()) return;
    if (typeof showConfirm === 'function') {
        showConfirm('Are you sure you want to archive this facility?', function() {
            doDeleteFacility(facilityId);
        });
        return;
    }

    if (confirm('Are you sure you want to archive this facility?')) {
        doDeleteFacility(facilityId);
    }
}

async function doDeleteFacility(facilityId) {
    if (denyManageAction()) return;
    try {
        await window.api.deleteFacility(facilityId);
        if (typeof showToast === 'function') showToast('Facility archived successfully', 'success');
    } catch (e) {
        console.error('doDeleteFacility error', e);
        if (typeof showToast === 'function') showToast('Failed to archive facility: ' + e.message, 'danger');
    }
    loadFacilitiesList();
}

function closeFacilityModal() {
    document.getElementById('facilityModal').classList.remove('show');
    currentFacilityId = null;
}

function capitalize(value) {
    const s = String(value || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function defaultFacilityIconByName(name) {
    const key = String(name || '').trim().toLowerCase();
    if (key === 'community hall') return '🏛️';
    if (key === 'sports complex') return '🏀';
    if (key === 'cultural center') return '🎭';
    if (key === 'library & learning center') return '📚';
    if (key === 'medical room') return '🏥';
    if (key === 'garden event space') return '🌳';
    return '🏛️';
}

function resolveFacilityIcon(facility) {
    const icon = String((facility && facility.icon) || '').trim();
    if (!icon || icon.includes('?')) return defaultFacilityIconByName(facility && facility.name);
    return icon;
}

function formatTimeLabel(timeValue) {
    const value = String(timeValue || '').trim();
    if (!value.includes(':')) return value;
    const parts = value.split(':');
    let hour = parseInt(parts[0], 10);
    const minute = parts[1] || '00';
    if (!Number.isFinite(hour)) return value;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${suffix}`;
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('facilityModal');
    if (event.target === modal) {
        closeFacilityModal();
    }
});
