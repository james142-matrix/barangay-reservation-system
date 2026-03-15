// Initialize page
const reportState = {
    dateRange: 'this-month',
    reservations: [],
    facilities: [],
    users: [],
    facilityMap: new Map(),
    userMap: new Map()
};

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth('admin')) return;
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportReportsCSV);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportReportsPDF);
    updateReports().catch(err => {
        showToast('Failed to load reports: ' + (err.message || 'Unknown error'), 'danger');
    });
});

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function parseLocalDate(value) {
    if (!value) return null;
    const str = String(value);
    const candidate = str.includes('T') || str.includes(' ')
        ? str.replace(' ', 'T')
        : `${str}T00:00:00`;
    const date = new Date(candidate);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatReportDate(value) {
    const date = parseLocalDate(value);
    if (!date) return '—';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatReportTime(value) {
    if (!value) return '—';
    const cleaned = String(value).slice(0, 5);
    const [h, m] = cleaned.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return String(value);
    const hour12 = (h % 12) || 12;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function normalizeReservation(raw) {
    return {
        ...raw,
        id: raw && typeof raw.id === 'string' ? parseInt(raw.id, 10) : raw.id,
        facilityId: raw && raw.facilityId != null ? raw.facilityId : (raw ? raw.facility_id : null),
        eventDate: raw ? (raw.eventDate || raw.event_date) : null,
        eventStartDate: raw ? (raw.eventStartDate || raw.event_start_date || raw.eventDate || raw.event_date) : null,
        eventEndDate: raw ? (raw.eventEndDate || raw.event_end_date || null) : null,
        startTime: raw ? (raw.startTime || raw.start_time || null) : null,
        endTime: raw ? (raw.endTime || raw.end_time || null) : null,
        paymentStatus: raw ? (raw.paymentStatus || raw.payment_status || 'pending') : 'pending',
        paymentMethod: raw ? (raw.paymentMethod || raw.payment_method || null) : null,
        paymentDate: raw ? (raw.paymentDate || raw.payment_date || null) : null,
        totalCost: raw ? toNumber(raw.totalCost != null ? raw.totalCost : raw.total_cost) : 0,
        status: raw ? String(raw.status || 'pending').toLowerCase() : 'pending',
        createdAt: raw ? (raw.createdAt || raw.created_at || null) : null
    };
}

// Update all reports
async function updateReports() {
    const dateRange = document.getElementById('dateRange').value;
    const [allReservations, facilities, users] = await Promise.all([
        window.api.getAllReservations(),
        window.api.getFacilities(),
        window.api.getUsers()
    ]);
    const facilityMap = new Map((facilities || []).map(f => [String(f.id), f]));
    const userMap = new Map((users || []).map(u => [u.username, u]));
    let reservations = (allReservations || []).map(normalizeReservation);
    
    // Filter by date range
    if (dateRange !== 'all-time') {
        const now = new Date();
        let cutoffDate = new Date();
        
        if (dateRange === 'this-month') {
            cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateRange === 'last-3-months') {
            cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
        } else if (dateRange === 'last-6-months') {
            cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
        }
        
        reservations = reservations.filter(r => new Date(r.createdAt) >= cutoffDate);
    }

    reportState.dateRange = dateRange;
    reportState.reservations = reservations;
    reportState.facilities = facilities || [];
    reportState.users = users || [];
    reportState.facilityMap = facilityMap;
    reportState.userMap = userMap;
    
    // Show statistics
    const stats = calculateStats(reservations);
    document.getElementById('total-reservations').textContent = stats.total;
    document.getElementById('billing-count').textContent = stats.billing;
    document.getElementById('pending-count').textContent = stats.pending;
    document.getElementById('cancelled-count').textContent = stats.cancelled;
    document.getElementById('completed-count').textContent = stats.completed;

    // calculate revenue
    let revenue = 0;
    reservations.forEach(r => {
        if (r.paymentStatus === 'paid' || r.paymentStatus === 'cash') {
            revenue += toNumber(r.totalCost);
        }
    });
    document.getElementById('revenue-total').textContent = `₱${revenue.toFixed(2)}`;
    
    // Show facility usage
    showFacilityUsage(reservations, facilities);
    
    // Show top clients
    showTopClients(reservations, userMap);
    
    // Show status breakdown
    showStatusBreakdown(stats);
    
    // Show monthly trend
    showMonthlyTrend(reservations);
    
    // Show detailed table
    showDetailedTable(reservations, facilityMap, userMap);
}

function escapeCsv(value) {
    const text = String(value == null ? '' : value);
    return `"${text.replace(/"/g, '""')}"`;
}

function formatDateRangeLabel(value) {
    if (value === 'this-month') return 'This Month';
    if (value === 'last-3-months') return 'Last 3 Months';
    if (value === 'last-6-months') return 'Last 6 Months';
    return 'All Time';
}

function buildExportRows() {
    const reservations = reportState.reservations || [];
    const facilityMap = reportState.facilityMap || new Map();
    const userMap = reportState.userMap || new Map();
    return reservations.map(r => {
        const client = userMap.get(r.username);
        const facility = facilityMap.get(String(r.facilityId));
        const clientName = client ? client.fullname : r.username;
        const facilityName = facility ? facility.name : 'Unknown';
        const eventStart = r.eventStartDate || r.eventDate;
        const eventEnd = r.eventEndDate;
        const eventDateText = eventStart
            ? `${formatReportDate(eventStart)}${eventEnd && eventEnd !== eventStart ? ' -> ' + formatReportDate(eventEnd) : ''}`
            : '—';
        const timeRange = (r.startTime && r.endTime)
            ? `${formatReportTime(r.startTime)} - ${formatReportTime(r.endTime)}`
            : '—';
        const paymentStatus = r.paymentStatus === 'paid' ? 'ONLINE PAID' : (r.paymentStatus === 'cash' ? 'CASH PAID' : 'UNPAID');
        const paymentMethod = r.paymentMethod ? String(r.paymentMethod).toUpperCase() : '—';
        return {
            clientName,
            facilityName,
            eventDateText,
            timeRange,
            amount: toNumber(r.totalCost).toFixed(2),
            reservationStatus: formatReservationStatusLabel(r.status),
            paymentStatus,
            paymentMethod,
            paidAt: formatReportDate(r.paymentDate),
            submitted: formatReportDate(r.createdAt)
        };
    });
}

function exportReportsCSV() {
    const rows = buildExportRows();
    if (!rows.length) {
        showToast('No report data to export.', 'warning');
        return;
    }
    const headers = [
        'Client',
        'Facility',
        'Event Date',
        'Time',
        'Amount (PHP)',
        'Reservation Status',
        'Payment Status',
        'Payment Method',
        'Paid At',
        'Submitted'
    ];
    const csvRows = [headers.map(escapeCsv).join(',')];
    rows.forEach(row => {
        csvRows.push([
            escapeCsv(row.clientName),
            escapeCsv(row.facilityName),
            escapeCsv(row.eventDateText),
            escapeCsv(row.timeRange),
            escapeCsv(row.amount),
            escapeCsv(row.reservationStatus),
            escapeCsv(row.paymentStatus),
            escapeCsv(row.paymentMethod),
            escapeCsv(row.paidAt),
            escapeCsv(row.submitted)
        ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservation-status-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('CSV exported successfully.', 'success');
}

function exportReportsPDF() {
    const rows = buildExportRows();
    if (!rows.length) {
        showToast('No report data to export.', 'warning');
        return;
    }

    const stats = calculateStats(reportState.reservations || []);
    const dateRangeLabel = formatDateRangeLabel(reportState.dateRange);
    const printedAt = new Date().toLocaleString('en-US');
    const tableRows = rows.map(row => `
        <tr>
            <td>${row.clientName}</td>
            <td>${row.facilityName}</td>
            <td>${row.eventDateText}</td>
            <td>${row.timeRange}</td>
            <td style="text-align:right;">${row.amount}</td>
            <td>${row.reservationStatus}</td>
            <td>${row.paymentStatus}</td>
        </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reservation Status Report</title>
    <style>
        body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
        h1 { margin: 0 0 6px 0; font-size: 22px; }
        .meta { margin-bottom: 16px; font-size: 12px; color: #444; }
        .stats { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .card { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; min-width: 100px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
        th { background: #f5f5f5; text-align: left; }
        .foot { margin-top: 12px; font-size: 11px; color: #555; }
        @media print { body { margin: 12px; } }
    </style>
</head>
<body>
    <h1>Reservation and Status Report</h1>
    <div class="meta">Date Range: ${dateRangeLabel}<br>Printed At: ${printedAt}</div>
    <div class="stats">
        <div class="card"><strong>Total</strong><div>${stats.total}</div></div>
        <div class="card"><strong>In Billing</strong><div>${stats.billing}</div></div>
        <div class="card"><strong>Pending</strong><div>${stats.pending}</div></div>
        <div class="card"><strong>Cancelled</strong><div>${stats.cancelled}</div></div>
        <div class="card"><strong>Completed</strong><div>${stats.completed}</div></div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Client</th>
                <th>Facility</th>
                <th>Event Date</th>
                <th>Time</th>
                <th>Amount (PHP)</th>
                <th>Reservation Status</th>
                <th>Payment Status</th>
            </tr>
        </thead>
        <tbody>${tableRows}</tbody>
    </table>
    <div class="foot">Use browser Print -> Save as PDF to download.</div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
        showToast('Popup blocked. Allow popups to export PDF.', 'warning');
        return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// Calculate statistics
function calculateStats(reservations) {
    return {
        total: reservations.length,
        billing: reservations.filter(r => r.status === 'billing').length,
        pending: reservations.filter(r => r.status === 'pending').length,
        cancelled: reservations.filter(r => r.status === 'cancelled').length,
        completed: reservations.filter(r => r.status === 'completed').length
    };
}

// Show facility usage report
function showFacilityUsage(reservations, facilities) {
    let html = '<table class="table"><thead><tr><th>Facility</th><th>Total</th><th>Pending</th><th>Billing</th><th>Completed</th><th>Cancelled</th></tr></thead><tbody>';
    
    facilities.forEach(facility => {
        const facilityResv = reservations.filter(r => String(r.facilityId) === String(facility.id));
        const pendingReview = facilityResv.filter(r => r.status === 'pending').length;
        const readyForBilling = facilityResv.filter(r => r.status === 'billing').length;
        const completed = facilityResv.filter(r => r.status === 'completed').length;
        const rejected = facilityResv.filter(r => r.status === 'cancelled').length;
        
        html += `<tr>
            <td><strong>${facility.name}</strong></td>
            <td>${facilityResv.length}</td>
            <td><span class="badge pending">${pendingReview}</span></td>
            <td><span class="badge approved">${readyForBilling}</span></td>
            <td><span class="badge completed">${completed}</span></td>
            <td><span class="badge rejected">${rejected}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    document.getElementById('facility-usage-list').innerHTML = html;
}

// Show top clients
function showTopClients(reservations, userMap) {
    const clientCount = {};
    
    reservations.forEach(r => {
        clientCount[r.username] = (clientCount[r.username] || 0) + 1;
    });
    
    const sorted = Object.entries(clientCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (sorted.length === 0) {
        document.getElementById('top-clients-list').innerHTML = '<p style="color: #999; text-align: center;">No client data</p>';
        return;
    }
    
    let html = '<table class="table"><thead><tr><th>Client</th><th>Reservations</th></tr></thead><tbody>';
    
    sorted.forEach((item, idx) => {
        const client = userMap.get(item[0]);
        const clientName = client ? client.fullname : item[0];
        html += `<tr>
            <td><strong>${idx + 1}. ${clientName}</strong></td>
            <td><span style="background: #e83e8c; color: white; padding: 4px 8px; border-radius: 4px;">${item[1]}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    document.getElementById('top-clients-list').innerHTML = html;
}

// Show status breakdown
function showStatusBreakdown(stats) {
    const total = stats.total || 1;
    const billingPercent = Math.round((stats.billing / total) * 100);
    const reviewPercent = Math.round((stats.pending / total) * 100);
    const compPercent = Math.round((stats.completed / total) * 100);
    const rejPercent = Math.round((stats.cancelled / total) * 100);
    
    const html = `
        <div style="background: #d4edda; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #28a745;">${billingPercent}%</div>
            <div style="color: #666; font-size: 12px;">In Billing</div>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #ffa500;">${reviewPercent}%</div>
            <div style="color: #666; font-size: 12px;">Pending</div>
        </div>
        <div style="background: #ede9fe; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #7c3aed;">${compPercent}%</div>
            <div style="color: #666; font-size: 12px;">Completed</div>
        </div>
        <div style="background: #f8d7da; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${rejPercent}%</div>
            <div style="color: #666; font-size: 12px;">Cancelled</div>
        </div>
    `;
    
    document.getElementById('status-breakdown').innerHTML = html;
}

// Show monthly trend
function showMonthlyTrend(reservations) {
    const monthlyData = {};
    
    reservations.forEach(r => {
        const date = new Date(r.createdAt);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey]++;
    });
    
    if (Object.keys(monthlyData).length === 0) {
        document.getElementById('monthly-trend').innerHTML = '<p style="color: #999; text-align: center;">No monthly data</p>';
        return;
    }
    
    let html = '<table class="table"><thead><tr><th>Month</th><th>Reservations</th></tr></thead><tbody>';
    
    Object.entries(monthlyData).forEach(item => {
        html += `<tr>
            <td><strong>${item[0]}</strong></td>
            <td><strong style="color: #e83e8c;">${item[1]}</strong></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    document.getElementById('monthly-trend').innerHTML = html;
}

// Show detailed reservations table
function showDetailedTable(reservations, facilityMap, userMap) {
    if (reservations.length === 0) {
        document.getElementById('detailed-table').innerHTML = '<p style="color: #999; text-align: center;">No transaction records found</p>';
        return;
    }
    
    let html = '<table class="table"><thead><tr><th>Client</th><th>Facility</th><th>Date</th><th>Time</th><th>Amount</th><th>Reservation</th><th>Payment</th><th>Method</th><th>Paid At</th><th>Submitted</th></tr></thead><tbody>';
    
    reservations.slice(0, 20).forEach(r => {
        const client = userMap.get(r.username);
        const facility = facilityMap.get(String(r.facilityId));
        const clientName = client ? client.fullname : r.username;
        const facilityName = facility ? facility.name : 'Unknown';
        const statusClass = getReservationStatusBadgeClass(r.status);
        const submitted = formatReportDate(r.createdAt);
        const eventStart = r.eventStartDate || r.eventDate;
        const eventEnd = r.eventEndDate;
        const eventDateText = eventStart
            ? `${formatReportDate(eventStart)}${eventEnd && eventEnd !== eventStart ? ' → ' + formatReportDate(eventEnd) : ''}`
            : '—';
        const amountText = `₱${toNumber(r.totalCost).toFixed(2)}`;
        const paymentStatus = r.paymentStatus === 'paid' ? 'ONLINE PAID' : (r.paymentStatus === 'cash' ? 'CASH PAID' : 'UNPAID');
        const paymentClass = r.paymentStatus === 'paid' || r.paymentStatus === 'cash' ? 'approved' : 'pending';
        const paymentMethod = r.paymentMethod ? String(r.paymentMethod).toUpperCase() : '—';
        const paidAt = formatReportDate(r.paymentDate);
        const reservationStatus = formatReservationStatusLabel(r.status);
        const timeRange = (r.startTime && r.endTime)
            ? `${formatReportTime(r.startTime)} - ${formatReportTime(r.endTime)}`
            : '—';
        
        html += `<tr>
            <td><strong>${clientName}</strong></td>
            <td>${facilityName}</td>
            <td>${eventDateText}</td>
            <td>${timeRange}</td>
            <td><strong style="color:#e83e8c;">${amountText}</strong></td>
            <td><span class="badge ${statusClass}">${reservationStatus}</span></td>
            <td><span class="badge ${paymentClass}">${paymentStatus}</span></td>
            <td>${paymentMethod}</td>
            <td>${paidAt}</td>
            <td>${submitted}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    
    if (reservations.length > 20) {
        html += `<p style="text-align: center; color: #999; margin-top: 10px;">Showing 20 of ${reservations.length} transactions</p>`;
    }
    
    document.getElementById('detailed-table').innerHTML = html;
}

function formatReservationStatusLabel(status) {
    const value = String(status || 'pending').toLowerCase();
    if (value === 'pending') return 'PENDING';
    if (value === 'billing') return 'IN BILLING';
    if (value === 'completed') return 'COMPLETED';
    if (value === 'cancelled') return 'CANCELLED';
    return value.replace(/_/g, ' ').toUpperCase();
}

function getReservationStatusBadgeClass(status) {
    const value = String(status || 'pending').toLowerCase();
    if (value === 'pending') return 'pending';
    if (value === 'billing' || value === 'completed') return 'approved';
    return 'rejected';
}





