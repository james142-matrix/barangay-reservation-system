// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth('admin');
    updateReports();
});

// Update all reports
function updateReports() {
    const dateRange = document.getElementById('dateRange').value;
    let reservations = getAllReservations();
    
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
            revenue += r.totalCost || 0;
        }
    });
    document.getElementById('revenue-total').textContent = `₱${revenue.toFixed(2)}`;
    
    // Show facility usage
    showFacilityUsage(reservations);
    
    // Show top residents
    showTopResidents(reservations);
    
    // Show status breakdown
    showStatusBreakdown(stats);
    
    // Show monthly trend
    showMonthlyTrend(reservations);
    
    // Show detailed table
    showDetailedTable(reservations);
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
function showFacilityUsage(reservations) {
    const facilities = getAllFacilities();
    let html = '<table class="table"><thead><tr><th>Facility</th><th>Total</th><th>Approved</th><th>Pending</th><th>Rejected</th></tr></thead><tbody>';
    
    facilities.forEach(facility => {
        const facilityResv = reservations.filter(r => r.facilityId === facility.id);
        const approved = facilityResv.filter(r => r.status === 'approved').length;
        const pending = facilityResv.filter(r => r.status === 'pending').length;
        const rejected = facilityResv.filter(r => r.status === 'rejected').length;
        
        html += `<tr>
            <td><strong>${facility.name}</strong></td>
            <td>${facilityResv.length}</td>
            <td><span class="badge approved">${approved}</span></td>
            <td><span class="badge pending">${pending}</span></td>
            <td><span class="badge rejected">${rejected}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    document.getElementById('facility-usage-list').innerHTML = html;
}

// Show top residents
function showTopResidents(reservations) {
    const residentCount = {};
    
    reservations.forEach(r => {
        residentCount[r.username] = (residentCount[r.username] || 0) + 1;
    });
    
    const sorted = Object.entries(residentCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    if (sorted.length === 0) {
        document.getElementById('top-residents-list').innerHTML = '<p style="color: #999; text-align: center;">No resident data</p>';
        return;
    }
    
    let html = '<table class="table"><thead><tr><th>Resident</th><th>Reservations</th></tr></thead><tbody>';
    
    sorted.forEach((item, idx) => {
        const resident = getUserByUsername(item[0]);
        const residentName = resident ? resident.fullname : item[0];
        html += `<tr>
            <td><strong>${idx + 1}. ${residentName}</strong></td>
            <td><span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 4px;">${item[1]}</span></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    document.getElementById('top-residents-list').innerHTML = html;
}

// Show status breakdown
function showStatusBreakdown(stats) {
    const total = stats.total || 1;
    const appPercent = Math.round((stats.approved / total) * 100);
    const pendPercent = Math.round((stats.pending / total) * 100);
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
            <td><strong style="color: #667eea;">${item[1]}</strong></td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    document.getElementById('monthly-trend').innerHTML = html;
}

// Show detailed reservations table
function showDetailedTable(reservations) {
    if (reservations.length === 0) {
        document.getElementById('detailed-table').innerHTML = '<p style="color: #999; text-align: center;">No reservations found</p>';
        return;
    }
    
    let html = '<table class="table"><thead><tr><th>Resident</th><th>Facility</th><th>Date</th><th>Time</th><th>Status</th><th>Submitted</th></tr></thead><tbody>';
    
    reservations.slice(0, 20).forEach(r => {
        const resident = getUserByUsername(r.username);
        const facility = getFacilityById(r.facilityId);
        const residentName = resident ? resident.fullname : r.username;
        const facilityName = facility ? facility.name : 'Unknown';
        const statusClass = r.status === 'pending' ? 'pending' : (r.status === 'approved' ? 'approved' : 'rejected');
        const submitted = formatDate(r.createdAt).split(' ')[0];
        
        html += `<tr>
            <td><strong>${residentName}</strong></td>
            <td>${facilityName}</td>
            <td>${formatDate(r.eventStartDate || r.eventDate).split(' ')[0]}${r.eventEndDate && r.eventEndDate !== (r.eventStartDate || r.eventDate) ? ' → ' + formatDate(r.eventEndDate).split(' ')[0] : ''}</td>
            <td>${r.startTime} - ${r.endTime}</td>
            <td><span class="badge ${statusClass}">${r.status.toUpperCase()}</span></td>
            <td>${submitted}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    
    if (reservations.length > 20) {
        html += `<p style="text-align: center; color: #999; margin-top: 10px;">Showing 20 of ${reservations.length} reservations</p>`;
    }
    
    document.getElementById('detailed-table').innerHTML = html;
}
