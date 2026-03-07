// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth('admin')) return;
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
    
    // Show statistics
    const stats = calculateStats(reservations);
    document.getElementById('total-reservations').textContent = stats.total;
    document.getElementById('approved-count').textContent = stats.approved;
    document.getElementById('pending-count').textContent = stats.pending;
    document.getElementById('rejected-count').textContent = stats.rejected;
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

// Calculate statistics
function calculateStats(reservations) {
    return {
        total: reservations.length,
        approved: reservations.filter(r => r.status === 'approved').length,
        pending: reservations.filter(r => r.status === 'pending').length,
        rejected: reservations.filter(r => r.status === 'rejected').length,
        completed: reservations.filter(r => r.status === 'completed').length
    };
}

// Show facility usage report
function showFacilityUsage(reservations, facilities) {
    let html = '<table class="table"><thead><tr><th>Facility</th><th>Total</th><th>Approved</th><th>Pending</th><th>Completed</th><th>Rejected</th></tr></thead><tbody>';
    
    facilities.forEach(facility => {
        const facilityResv = reservations.filter(r => String(r.facilityId) === String(facility.id));
        const approved = facilityResv.filter(r => r.status === 'approved').length;
        const pending = facilityResv.filter(r => r.status === 'pending').length;
        const completed = facilityResv.filter(r => r.status === 'completed').length;
        const rejected = facilityResv.filter(r => r.status === 'rejected').length;
        
        html += `<tr>
            <td><strong>${facility.name}</strong></td>
            <td>${facilityResv.length}</td>
            <td><span class="badge approved">${approved}</span></td>
            <td><span class="badge pending">${pending}</span></td>
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
    const appPercent = Math.round((stats.approved / total) * 100);
    const pendPercent = Math.round((stats.pending / total) * 100);
    const compPercent = Math.round((stats.completed / total) * 100);
    const rejPercent = Math.round((stats.rejected / total) * 100);
    
    const html = `
        <div style="background: #d4edda; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #28a745;">${appPercent}%</div>
            <div style="color: #666; font-size: 12px;">Approved</div>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #ffa500;">${pendPercent}%</div>
            <div style="color: #666; font-size: 12px;">Pending</div>
        </div>
        <div style="background: #e8f0ff; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">${compPercent}%</div>
            <div style="color: #666; font-size: 12px;">Completed</div>
        </div>
        <div style="background: #f8d7da; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #ff6b6b;">${rejPercent}%</div>
            <div style="color: #666; font-size: 12px;">Rejected</div>
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
        const statusClass = r.status === 'pending' ? 'pending' : ((r.status === 'approved' || r.status === 'completed') ? 'approved' : 'rejected');
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
        const reservationStatus = (r.status || 'pending').toUpperCase();
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





