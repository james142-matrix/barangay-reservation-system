// Initialize barangay staff dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth('barangay_staff');
    loadDashboard().catch(err => {
        showToast('Failed to load dashboard: ' + (err.message || 'Unknown error'), 'danger');
    });
});

async function loadDashboard() {
    // Display user greeting
    const user = getLoggedInUser();
    if (user) {
        document.getElementById('user-greeting').textContent = `Welcome, ${user.fullname}`;
    }

    const allReservationsRaw = await window.api.getAllReservations();
    const allReservations = (allReservationsRaw || []).map(r => ({
        ...r,
        createdAt: r.createdAt || r.created_at || null
    }));
    const stats = {
        total: allReservations.length,
        pending: allReservations.filter(r => r.status === 'pending').length,
        approved: allReservations.filter(r => r.status === 'approved').length,
        rejected: allReservations.filter(r => r.status === 'rejected').length,
        completed: allReservations.filter(r => r.status === 'completed').length
    };
    
    // Update stat cards
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-approved').textContent = stats.approved;
    document.getElementById('stat-rejected').textContent = stats.rejected;
    document.getElementById('stat-completed').textContent = stats.completed;
    
    // Display pending requests
    displayPendingRequests(allReservations);
}

async function displayPendingRequests(allReservationsInput) {
    const allReservations = Array.isArray(allReservationsInput) ? allReservationsInput : await window.api.getAllReservations();
    const [facilities, users] = await Promise.all([window.api.getFacilities(), window.api.getUsers()]);
    const facilityMap = new Map((facilities || []).map(f => [String(f.id), f]));
    const userMap = new Map((users || []).map(u => [u.username, u]));
    const pending = allReservations.filter(r => r.status === 'pending').slice(0, 5);
    const container = document.getElementById('pending-requests-list');
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">✓</div>
                <h3>No Pending Requests</h3>
                <p>All reservation requests have been reviewed.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Resident</th>
                    <th>Facility</th>
                    <th>Event Date</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    pending.forEach(r => {
        const facility = facilityMap.get(String(r.facilityId));
        const user = userMap.get(r.username);
        const submittedDate = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        html += `
            <tr>
                <td>${user ? user.fullname : r.username}</td>
                <td>${facility ? facility.name : 'Unknown'}</td>
                <td>${formatDate(r.eventStartDate || r.eventDate).split(',')[0]}${r.eventEndDate && r.eventEndDate !== (r.eventStartDate || r.eventDate) ? ' → ' + formatDate(r.eventEndDate).split(',')[0] : ''}</td>
                <td>${submittedDate}</td>
                <td>
                    <a href="barangay-staff-requests.html" class="btn btn-small btn-primary">Review</a>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}
