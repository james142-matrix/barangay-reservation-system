// admin-billing.js
// Shared billing dashboard logic for admin and barangay_staff roles

document.addEventListener('DOMContentLoaded', function () {
    bindBillingEventHandlers();

    const user = getLoggedInUser();
    const role = user ? user.role : null;
    if (role === 'admin') {
        checkAuth('admin');
    } else {
        checkAuth('barangay_staff');
    }

    loadAllBillingReservations().catch(err => {
        showToast('Failed to load billing data: ' + (err.message || 'Unknown error'), 'danger');
    });
});

// ===========================
// STATS
// ===========================

function loadBillingStats(reservations) {

    const totalRevenue = reservations
        .filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'cash')
        .reduce((sum, r) => sum + toAmount(r.totalCost), 0);

    const pendingPayments = reservations.filter(
        r => r.status === 'approved' &&
             r.paymentStatus !== 'paid' &&
             r.paymentStatus !== 'cash'
    ).length;

    const onlinePaid = reservations.filter(r => r.paymentStatus === 'paid').length;
    const cashPaid   = reservations.filter(r => r.paymentStatus === 'cash').length;

    const el = id => document.getElementById(id);
    if (el('stat-revenue'))         el('stat-revenue').textContent         = '₱' + totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 });
    if (el('stat-pending-payment')) el('stat-pending-payment').textContent = pendingPayments;
    if (el('stat-online-paid'))     el('stat-online-paid').textContent     = onlinePaid;
    if (el('stat-cash-paid'))       el('stat-cash-paid').textContent       = cashPaid;
}

// ===========================
// TABLE
// ===========================

let allBillingRows = []; // cache for client-side filtering

async function loadAllBillingReservations() {
    const [reservations, facilities, users] = await Promise.all([
        window.api.getAllReservations(),
        window.api.getFacilities(),
        window.api.getUsers()
    ]);
    const facilityMap = new Map((facilities || []).map(f => [String(f.id), f]));
    const userMap = new Map((users || []).map(u => [u.username, u]));
    loadBillingStats(reservations);

    // Enrich each row with facility and user info for display / filtering
    allBillingRows = reservations.map(r => {
        const facility = facilityMap.get(String(r.facilityId));
        const user     = userMap.get(r.username);
        return {
            ...r,
            createdAt: r.createdAt || r.created_at || null,
            facilityName: facility ? facility.name : 'Unknown Facility',
            residentName: user ? user.fullname : r.username
        };
    });

    // Sort newest first
    allBillingRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    renderBillingTable(allBillingRows);
    updateFilteredStats(allBillingRows);
}

function renderBillingTable(rows) {
    const container = document.getElementById('billing-table-container');
    if (!container) return;

    if (rows.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💳</div>
                <h3>No Reservations Found</h3>
                <p>No billing records match your current filters.</p>
            </div>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Resident</th>
                    <th>Facility</th>
                    <th>Event Date</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Reservation Status</th>
                    <th>Payment Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>`;

    rows.forEach((r, idx) => {
        const resvBadge    = getReservationStatusBadge(r.status);
        const payBadge     = getPaymentStatusBadge(r.paymentStatus);
        const eventDate    = r.eventDate ? formatDateOnly(r.eventDate) : '—';
        const timeRange    = (r.startTime && r.endTime) ? `${r.startTime} – ${r.endTime}` : '—';
        const amount       = '₱' + toAmount(r.totalCost).toLocaleString('en-PH', { minimumFractionDigits: 2 });
        const canConfirmCash = r.status === 'approved' &&
                               r.paymentStatus !== 'paid' &&
                               r.paymentStatus !== 'cash';
        const rowId = JSON.stringify(String(r.id));

        html += `
            <tr>
                <td style="color:#999; font-size:12px;">${idx + 1}</td>
                <td>
                    <div style="font-weight:600; color:#333;">${escHtml(r.residentName)}</div>
                    <div style="font-size:12px; color:#888;">@${escHtml(r.username)}</div>
                </td>
                <td>${escHtml(r.facilityName)}</td>
                <td>${eventDate}</td>
                <td style="white-space:nowrap;">${timeRange}</td>
                <td style="font-weight:700; color:#667eea;">${amount}</td>
                <td>${resvBadge}</td>
                <td>${payBadge}</td>
                <td>
                    <button class="btn btn-small btn-secondary" data-billing-action="view" data-reservation-id=${rowId} title="View Details" type="button">🔍 View</button>
                    ${canConfirmCash ? `<button class="btn btn-small btn-success" data-billing-action="confirm-cash" data-reservation-id=${rowId} title="Confirm Cash Payment" style="margin-top:4px;" type="button">💵 Confirm Cash</button>` : ''}
                </td>
            </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ===========================
// FILTERS
// ===========================

function filterBillingTable() {
    const search      = normalizeSearch(document.getElementById('billingSearch')?.value || '');
    const payFilter   = document.getElementById('paymentFilter')?.value || '';
    const resvFilter  = document.getElementById('resvStatusFilter')?.value || '';
    const dateFrom    = document.getElementById('dateFrom')?.value || '';
    const dateTo      = document.getElementById('dateTo')?.value || '';

    const filtered = allBillingRows.filter(r => {
        const residentName = normalizeText(r.residentName);
        const username = normalizeText(r.username);
        const facilityName = normalizeText(r.facilityName);
        const paymentStatusLabel = normalizeText(getPaymentStatusLabel(r.paymentStatus));
        const reservationStatusLabel = normalizeText(r.status);

        const matchSearch = !search ||
            residentName.includes(search) ||
            username.includes(search) ||
            facilityName.includes(search) ||
            paymentStatusLabel.includes(search) ||
            reservationStatusLabel.includes(search);

        const matchPay  = !payFilter  || r.paymentStatus === payFilter;
        const matchResv = !resvFilter || r.status === resvFilter;

        let matchDate = true;
        if (dateFrom || dateTo) {
            const eventDate = parseLocalDate(r.eventDate);
            if (eventDate) {
                if (dateFrom && eventDate < parseLocalDate(dateFrom)) matchDate = false;
                if (dateTo   && eventDate > parseLocalDate(dateTo + 'T23:59:59')) matchDate = false;
            }
        }

        return matchSearch && matchPay && matchResv && matchDate;
    });

    renderBillingTable(filtered);
    updateFilteredStats(filtered);
}

function updateFilteredStats(filtered) {
    const revenue = filtered
        .filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'cash')
        .reduce((s, r) => s + toAmount(r.totalCost), 0);

    const el = document.getElementById('filtered-revenue');
    if (el) el.textContent = '₱' + revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 });
}

function clearFilters() {
    ['billingSearch', 'paymentFilter', 'resvStatusFilter', 'dateFrom', 'dateTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    renderBillingTable(allBillingRows);
    updateFilteredStats(allBillingRows);
}

// ===========================
// ACTIONS
// ===========================

function adminConfirmCash(reservationId) {
    showConfirm('Confirm this reservation as paid by cash?', async function () {
        try {
            const reservation = await window.api.updateReservation(reservationId, {
                paymentStatus: 'cash',
                paymentMethod: 'cash',
                paymentDate: new Date().toISOString(),
                status: 'completed'
            });
            createNotification(
                reservation.username,
                'Payment Confirmed',
                `Your cash payment for reservation #${reservation.id} has been confirmed by staff.`,
                'info',
                reservation.id
            );
            showToast('Cash payment confirmed successfully.', 'success');
            loadAllBillingReservations();
        } catch (error) {
            showToast('Failed to confirm cash payment: ' + (error.message || 'Unknown error'), 'danger');
        }
    });
}

// ===========================
// DETAIL MODAL
// ===========================

function viewBillingDetail(reservationId) {
    const r = allBillingRows.find(row => String(row.id) === String(reservationId));
    if (!r) { showToast('Reservation not found.', 'danger'); return; }

    const facilityName = r.facilityName || 'Unknown';
    const residentName = r.residentName || r.username;

    const modal   = document.getElementById('billingDetailModal');
    const body    = document.getElementById('billingDetailBody');
    if (!modal || !body) return;

    const payDate  = r.paymentDate ? formatDate(r.paymentDate) : '—';
    const eventDate = r.eventDate  ? formatDateOnly(r.eventDate) : '—';

    body.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">RESIDENT</p>
                <p style="font-weight:600;">${escHtml(residentName)}</p>
                <p style="font-size:13px; color:#666;">@${escHtml(r.username)}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">FACILITY</p>
                <p style="font-weight:600;">${escHtml(facilityName)}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">EVENT DATE</p>
                <p style="font-weight:600;">${eventDate}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">TIME</p>
                <p style="font-weight:600;">${r.startTime || '—'} – ${r.endTime || '—'}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">AMOUNT</p>
                <p style="font-weight:700; font-size:20px; color:#667eea;">₱${toAmount(r.totalCost).toFixed(2)}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">PAYMENT METHOD</p>
                <p style="font-weight:600;">${r.paymentMethod ? r.paymentMethod.toUpperCase() : '—'}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">RESERVATION STATUS</p>
                <p>${getReservationStatusBadge(r.status)}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">PAYMENT STATUS</p>
                <p>${getPaymentStatusBadge(r.paymentStatus)}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">PAYMENT DATE</p>
                <p style="font-weight:600;">${payDate}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">SUBMITTED</p>
                <p style="font-weight:600;">${r.createdAt ? formatDate(r.createdAt) : '—'}</p>
            </div>
        </div>
        ${r.purpose ? `<div style="margin-top:16px;"><p style="font-size:12px; color:#888; margin-bottom:4px;">PURPOSE</p><p>${escHtml(r.purpose)}</p></div>` : ''}
        ${r.rejectionReason ? `<div style="margin-top:12px; background:#fff3cd; padding:10px; border-radius:6px; border-left:4px solid #ffa500;"><strong>Rejection Reason:</strong> ${escHtml(r.rejectionReason)}</div>` : ''}
    `;

    // Show/hide confirm cash button inside modal
    const modalCashBtn = document.getElementById('modalConfirmCashBtn');
    if (modalCashBtn) {
        const canConfirm = r.status === 'approved' &&
                           r.paymentStatus !== 'paid' &&
                           r.paymentStatus !== 'cash';
        modalCashBtn.style.display = canConfirm ? 'inline-block' : 'none';
        modalCashBtn.onclick = () => { closeBillingDetailModal(); adminConfirmCash(r.id); };
    }

    modal.classList.add('show');
}

function closeBillingDetailModal() {
    const modal = document.getElementById('billingDetailModal');
    if (modal) modal.classList.remove('show');
}

// Close modal on backdrop click
document.addEventListener('click', function (e) {
    const actionButton = e.target.closest('[data-billing-action]');
    if (actionButton) {
        const action = actionButton.getAttribute('data-billing-action');
        const reservationId = actionButton.getAttribute('data-reservation-id');
        if (action === 'view') {
            viewBillingDetail(reservationId);
        } else if (action === 'confirm-cash') {
            adminConfirmCash(reservationId);
        }
        return;
    }

    const modal = document.getElementById('billingDetailModal');
    if (modal && e.target === modal) closeBillingDetailModal();
});

// ===========================
// EXPORT CSV
// ===========================

function exportBillingCSV() {
    const rows = allBillingRows;
    if (rows.length === 0) { showToast('No data to export.', 'warning'); return; }

    const headers = ['#', 'Resident', 'Username', 'Facility', 'Event Date', 'Start Time', 'End Time', 'Amount', 'Reservation Status', 'Payment Status', 'Payment Method', 'Payment Date', 'Submitted'];
    const csvRows = [headers.join(',')];

    rows.forEach((r, i) => {
        const cols = [
            i + 1,
            `"${(r.residentName || '').replace(/"/g, '""')}"`,
            r.username,
            `"${(r.facilityName || '').replace(/"/g, '""')}"`,
            r.eventDate || '',
            r.startTime || '',
            r.endTime   || '',
            toAmount(r.totalCost).toFixed(2),
            r.status,
            r.paymentStatus || 'pending',
            r.paymentMethod || '',
            r.paymentDate   || '',
            r.createdAt     || ''
        ];
        csvRows.push(cols.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `billing-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.', 'success');
}

// ===========================
// HELPERS
// ===========================

function getReservationStatusBadge(status) {
    const map = {
        pending:   { cls: 'pending',  label: 'Pending'   },
        approved:  { cls: 'approved', label: 'Approved'  },
        rejected:  { cls: 'rejected', label: 'Rejected'  },
        completed: { cls: 'approved', label: 'Completed' }
    };
    const s = map[status] || { cls: 'pending', label: status || 'Unknown' };
    return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}

function getPaymentStatusBadge(paymentStatus) {
    if (paymentStatus === 'paid') {
        return `<span class="status-badge approved">Online Paid</span>`;
    }
    if (paymentStatus === 'cash') {
        return `<span class="status-badge approved" style="background:#d1ecf1; color:#0c5460;">Cash Paid</span>`;
    }
    return `<span class="status-badge pending">Unpaid</span>`;
}

function getPaymentStatusLabel(paymentStatus) {
    if (paymentStatus === 'paid') return 'online paid';
    if (paymentStatus === 'cash') return 'cash paid';
    return 'unpaid';
}

function normalizeText(value) {
    return String(value == null ? '' : value).toLowerCase().trim();
}

function normalizeSearch(value) {
    return normalizeText(value).replace(/^@+/, '');
}

function toAmount(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

function parseLocalDate(value) {
    if (!value) return null;
    if (typeof value !== 'string') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const hasTime = value.includes('T') || value.includes(' ');
    const candidate = hasTime ? value : `${value}T00:00:00`;
    const date = new Date(candidate);
    return Number.isNaN(date.getTime()) ? null : date;
}

function bindBillingEventHandlers() {
    const bind = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    bind('billingSearch', 'input', filterBillingTable);
    bind('paymentFilter', 'change', filterBillingTable);
    bind('resvStatusFilter', 'change', filterBillingTable);
    bind('dateFrom', 'change', filterBillingTable);
    bind('dateTo', 'change', filterBillingTable);
    bind('billingClearBtn', 'click', clearFilters);
    bind('billingExportBtn', 'click', exportBillingCSV);
    bind('billingModalCloseTop', 'click', closeBillingDetailModal);
    bind('billingModalCloseBottom', 'click', closeBillingDetailModal);
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, "&quot;");
}
