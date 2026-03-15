// admin-billing.js
// Shared billing dashboard logic for admin and barangay_staff roles

document.addEventListener('DOMContentLoaded', function () {
    bindBillingEventHandlers();

    const user = getLoggedInUser();
    const role = user ? user.role : null;
    if (role === 'admin') {
        if (!checkAuth('admin')) return;
    } else {
        if (!checkAuth('barangay_staff')) return;
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
        .reduce((sum, r) => sum + getPaidAmount(r), 0);

    const pendingPayments = reservations.filter(
        r => r.status === 'pending' &&
             r.paymentStatus !== 'cancelled' &&
             getBalanceAmount(r) > 0
    ).length;

    const cashPaid   = reservations.filter(r => r.paymentStatus === 'cash' || r.paymentStatus === 'paid').length;

    const el = id => document.getElementById(id);
    if (el('stat-revenue'))         el('stat-revenue').textContent         = '₱' + totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 });
    if (el('stat-pending-payment')) el('stat-pending-payment').textContent = pendingPayments;
    if (el('stat-cash-paid'))       el('stat-cash-paid').textContent       = cashPaid;
}

// ===========================
// TABLE
// ===========================

let allBillingRows = []; // cache for client-side filtering

function getReservationAddOns(row) {
    const raw = row && row.addOns;
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(item => item && typeof item === 'object')
        .map(item => ({
            name: String(item.name || ''),
            unit: String(item.unit || 'item'),
            qty: Number(item.qty || 0),
            price: Number(item.price || 0),
            total: Number(item.total || 0)
        }))
        .filter(item => item.name && item.qty > 0);
}

function getAddOnTotal(row) {
    const addOns = getReservationAddOns(row);
    if (addOns.length) {
        return addOns.reduce((sum, item) => {
            const total = Number(item.total || 0);
            if (total > 0) return sum + total;
            return sum + (Number(item.price || 0) * Number(item.qty || 0));
        }, 0);
    }
    const chairs = Number(row.chairsCount || 0);
    const electronics = Number(row.electronicsCount || 0);
    return (chairs * 10) + (electronics * 150);
}

function getPaidAmount(row) {
    const total = toAmount(row.totalCost);
    const rawPaid = Math.max(0, toAmount(row.amountPaid));
    const paymentStatus = String(row.paymentStatus || '').toLowerCase();
    if (paymentStatus === 'cash' || paymentStatus === 'paid') return total;
    return Math.min(total, rawPaid);
}

function getBalanceAmount(row) {
    return Math.max(0, toAmount(row.totalCost) - getPaidAmount(row));
}

function getDueNowAmount(row) {
    const total = toAmount(row.totalCost);
    const paid = getPaidAmount(row);
    const paymentOption = String(row.paymentOption || 'full');
    const downPayment = Math.max(0, toAmount(row.downPaymentAmount));
    const remaining = Math.max(0, total - paid);
    if (remaining <= 0) return 0;

    if (paymentOption === 'down_payment' && paid <= 0) {
        const initialDue = downPayment > 0 ? Math.min(downPayment, total) : total;
        return Math.min(initialDue, remaining);
    }
    return remaining;
}

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
            paymentOption: r.paymentOption || r.payment_option || 'full',
            downPaymentAmount: toAmount(r.downPaymentAmount != null ? r.downPaymentAmount : r.down_payment_amount),
            amountPaid: toAmount(r.amountPaid != null ? r.amountPaid : r.amount_paid),
            totalCost: toAmount(r.totalCost != null ? r.totalCost : r.total_cost),
            paymentStatus: r.paymentStatus || r.payment_status || 'pending',
            createdAt: r.createdAt || r.created_at || null,
            facilityName: facility ? facility.name : 'Unknown Facility',
            clientName: user ? user.fullname : r.username
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
                    <th>Client</th>
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
        const paidAmount = getPaidAmount(r);
        const balanceAmount = getBalanceAmount(r);
        const dueNowAmount = getDueNowAmount(r);
        const canConfirmCash = r.status === 'pending' &&
                               r.paymentStatus !== 'cancelled' &&
                               balanceAmount > 0 &&
                               dueNowAmount > 0;
        const canCancel = r.status === 'pending' &&
                          r.paymentStatus !== 'cancelled' &&
                          paidAmount <= 0;
        const rowId = JSON.stringify(String(r.id));
        const collectBtnLabel = (String(r.paymentOption || 'full') === 'down_payment' && paidAmount <= 0)
            ? '💵 Collect Down Payment'
            : '💵 Collect Balance';

        html += `
            <tr>
                <td style="color:#999; font-size:12px;">${idx + 1}</td>
                <td>
                    <div style="font-weight:600; color:#333;">${escHtml(r.clientName)}</div>
                    <div style="font-size:12px; color:#888;">@${escHtml(r.username)}</div>
                </td>
                <td>${escHtml(r.facilityName)}</td>
                <td>${eventDate}</td>
                <td style="white-space:nowrap;">${timeRange}</td>
                <td style="font-weight:700; color:#e83e8c;">
                    ${amount}
                    <div style="font-size:11px; color:#666; font-weight:500;">Paid: ₱${paidAmount.toFixed(2)} | Bal: ₱${balanceAmount.toFixed(2)}</div>
                </td>
                <td>${resvBadge}</td>
                <td>${payBadge}</td>
                <td>
                    <button class="btn btn-small btn-secondary" data-billing-action="view" data-reservation-id=${rowId} title="View Details" type="button">🔍 View</button>
                    ${canConfirmCash ? `<button class="btn btn-small btn-success" data-billing-action="confirm-cash" data-reservation-id=${rowId} title="Collect Cash Payment" style="margin-top:4px;" type="button">${collectBtnLabel}</button>` : ''}
                    ${canCancel ? `<button class="btn btn-small btn-danger" data-billing-action="cancel-reservation" data-reservation-id=${rowId} title="Cancel Reservation" style="margin-top:4px;" type="button">✖ Cancel</button>` : ''}
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
        const clientName = normalizeText(r.clientName);
        const username = normalizeText(r.username);
        const facilityName = normalizeText(r.facilityName);
        const paymentStatusLabel = normalizeText(getPaymentStatusLabel(r.paymentStatus));
        const reservationStatusLabel = normalizeText(r.status);

        const matchSearch = !search ||
            clientName.includes(search) ||
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
        .reduce((s, r) => s + getPaidAmount(r), 0);

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
    const reservation = allBillingRows.find(row => String(row.id) === String(reservationId));
    if (!reservation) {
        showToast('Reservation not found.', 'danger');
        return;
    }
    const dueNow = getDueNowAmount(reservation);
    const alreadyPaid = getPaidAmount(reservation);
    const total = toAmount(reservation.totalCost);
    if (dueNow <= 0) {
        showToast('No remaining payment to collect for this reservation.', 'warning');
        return;
    }
    const nextPaid = Math.min(total, alreadyPaid + dueNow);
    const fullyPaid = nextPaid >= total - 0.0001;
    const confirmText = fullyPaid
        ? `Collect final payment of ₱${dueNow.toFixed(2)} and complete this reservation?`
        : `Collect down payment of ₱${dueNow.toFixed(2)} for this reservation?`;

    showConfirm(confirmText, async function () {
        try {
            const updated = await window.api.updateReservation(reservationId, {
                amountPaid: Number(nextPaid.toFixed(2)),
                paymentStatus: fullyPaid ? 'cash' : 'partial',
                paymentMethod: 'onsite_cash',
                paymentDate: new Date().toISOString(),
                status: fullyPaid ? 'completed' : 'pending'
            });
            if (fullyPaid) {
                createNotification(
                    updated.username,
                    'Reservation Completed',
                    `Full payment for reservation #${updated.id} has been received. Your reservation is now completed.`,
                    'info',
                    updated.id
                );
                showToast('Final payment collected. Reservation marked completed.', 'success');
            } else {
                createNotification(
                    updated.username,
                    'Down Payment Received',
                    `Down payment for reservation #${updated.id} has been received. Remaining balance: ₱${Math.max(0, toAmount(updated.totalCost) - toAmount(updated.amountPaid)).toFixed(2)}.`,
                    'info',
                    updated.id
                );
                showToast('Down payment collected successfully.', 'success');
            }
            loadAllBillingReservations();
        } catch (error) {
            showToast('Failed to collect payment: ' + (error.message || 'Unknown error'), 'danger');
        }
    });
}

function adminCancelReservation(reservationId) {
    showConfirm('Cancel this reservation?', async function () {
        try {
            const reservation = await window.api.updateReservation(reservationId, {
                status: 'cancelled',
                paymentStatus: 'cancelled',
                rejectionReason: 'Cancelled during billing by staff/admin'
            });
            createNotification(
                reservation.username,
                'Reservation Cancelled',
                `Your reservation #${reservation.id} was cancelled during billing. Please contact the barangay office for details.`,
                'info',
                reservation.id
            );
            showToast('Reservation cancelled successfully.', 'success');
            loadAllBillingReservations();
        } catch (error) {
            showToast('Failed to cancel reservation: ' + (error.message || 'Unknown error'), 'danger');
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
    const clientName = r.clientName || r.username;

    const modal   = document.getElementById('billingDetailModal');
    const body    = document.getElementById('billingDetailBody');
    if (!modal || !body) return;

    const payDate  = r.paymentDate ? formatDate(r.paymentDate) : '—';
    const eventDate = r.eventDate  ? formatDateOnly(r.eventDate) : '—';
    const paidAmount = getPaidAmount(r);
    const balanceAmount = getBalanceAmount(r);
    const dueNowAmount = getDueNowAmount(r);
    const addOns = getReservationAddOns(r);
    const addOnSummary = addOns.length
        ? addOns.map(item => `${escHtml(item.name)} x${item.qty}`).join(', ')
        : `Chairs ${Number(r.chairsCount || 0)}, Electronics ${Number(r.electronicsCount || 0)}`;
    const addOnTotal = getAddOnTotal(r);

    body.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">CLIENT</p>
                <p style="font-weight:600;">${escHtml(clientName)}</p>
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
                <p style="font-weight:700; font-size:20px; color:#e83e8c;">₱${toAmount(r.totalCost).toFixed(2)}</p>
                <p style="font-size:13px; color:#666;">Paid: ₱${paidAmount.toFixed(2)} | Balance: ₱${balanceAmount.toFixed(2)}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">PAYMENT METHOD</p>
                <p style="font-weight:600;">${r.paymentMethod ? r.paymentMethod.toUpperCase() : '—'}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">PAYMENT OPTION</p>
                <p style="font-weight:600;">${String(r.paymentOption || 'full') === 'down_payment' ? 'Down Payment' : 'Full Payment'}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">DOWN PAYMENT TARGET</p>
                <p style="font-weight:600;">₱${toAmount(r.downPaymentAmount).toFixed(2)}</p>
            </div>
            <div>
                <p style="font-size:12px; color:#888; margin-bottom:4px;">NEXT CASH COLLECTION</p>
                <p style="font-weight:600;">₱${dueNowAmount.toFixed(2)}</p>
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
        <div style="margin-top:16px;">
            <p style="font-size:12px; color:#888; margin-bottom:4px;">ADD-ONS</p>
            <p style="font-weight:600;">${addOnSummary}</p>
            <p style="font-size:13px; color:#666;">Subtotal: ₱${toAmount(addOnTotal).toFixed(2)}</p>
        </div>
        ${r.purpose ? `<div style="margin-top:16px;"><p style="font-size:12px; color:#888; margin-bottom:4px;">PURPOSE</p><p>${escHtml(r.purpose)}</p></div>` : ''}
        ${r.rejectionReason ? `<div style="margin-top:12px; background:#fff3cd; padding:10px; border-radius:6px; border-left:4px solid #ffa500;"><strong>Rejection Reason:</strong> ${escHtml(r.rejectionReason)}</div>` : ''}
    `;

    // Show/hide confirm cash button inside modal
    const modalCashBtn = document.getElementById('modalConfirmCashBtn');
    const modalCancelBtn = document.getElementById('modalCancelReservationBtn');
    if (modalCashBtn) {
        const canConfirm = r.status === 'pending' &&
                           r.paymentStatus !== 'cancelled' &&
                           getBalanceAmount(r) > 0 &&
                           getDueNowAmount(r) > 0;
        modalCashBtn.style.display = canConfirm ? 'inline-block' : 'none';
        modalCashBtn.textContent = (String(r.paymentOption || 'full') === 'down_payment' && getPaidAmount(r) <= 0)
            ? '💵 Collect Down Payment'
            : '💵 Collect Remaining';
        modalCashBtn.onclick = () => { closeBillingDetailModal(); adminConfirmCash(r.id); };
    }
    if (modalCancelBtn) {
        const canCancel = r.status === 'pending' &&
                          r.paymentStatus !== 'cancelled' &&
                          getPaidAmount(r) <= 0;
        modalCancelBtn.style.display = canCancel ? 'inline-block' : 'none';
        modalCancelBtn.onclick = () => { closeBillingDetailModal(); adminCancelReservation(r.id); };
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
        } else if (action === 'cancel-reservation') {
            adminCancelReservation(reservationId);
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

    const headers = ['#', 'Client', 'Username', 'Facility', 'Event Date', 'Start Time', 'End Time', 'Amount', 'Reservation Status', 'Payment Status', 'Payment Method', 'Payment Date', 'Submitted'];
    const csvRows = [headers.join(',')];

    rows.forEach((r, i) => {
        const cols = [
            i + 1,
            `"${(r.clientName || '').replace(/"/g, '""')}"`,
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
        pending: { cls: 'pending',  label: 'Pending' },
        billing: { cls: 'pending', label: 'Pending' },
        completed: { cls: 'approved', label: 'Completed' },
        cancelled: { cls: 'rejected', label: 'Cancelled' }
    };
    const s = map[status] || { cls: 'pending', label: status || 'Unknown' };
    return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}

function getPaymentStatusBadge(paymentStatus) {
    if (paymentStatus === 'paid') {
        return `<span class="status-badge approved" style="background:#d1ecf1; color:#0c5460;">Cash Paid</span>`;
    }
    if (paymentStatus === 'cash') {
        return `<span class="status-badge approved" style="background:#d1ecf1; color:#0c5460;">Cash Paid</span>`;
    }
    if (paymentStatus === 'partial') {
        return `<span class="status-badge pending" style="background:#e8f3ff; color:#1e40af;">Partial Paid</span>`;
    }
    if (paymentStatus === 'cancelled') {
        return `<span class="status-badge rejected">Cancelled</span>`;
    }
    return `<span class="status-badge pending">Unpaid</span>`;
}

function getPaymentStatusLabel(paymentStatus) {
    if (paymentStatus === 'paid') return 'cash paid';
    if (paymentStatus === 'cash') return 'cash paid';
    if (paymentStatus === 'partial') return 'partial paid';
    if (paymentStatus === 'cancelled') return 'cancelled';
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
