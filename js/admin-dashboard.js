// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth('admin')) return;
    loadDashboard().catch(err => {
        showToast('Failed to load dashboard: ' + (err.message || 'Unknown error'), 'danger');
    });
});

function setTextIfExists(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function loadDashboard() {
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
    setTextIfExists('stat-total', stats.total);
    setTextIfExists('stat-pending', stats.pending);
    setTextIfExists('stat-approved', stats.approved);
    setTextIfExists('stat-rejected', stats.rejected);
    setTextIfExists('stat-completed', stats.completed);
    
    // Display pending requests
    displayPendingRequests(allReservations);
}

async function displayPendingRequests(allReservationsInput) {
    const allReservations = Array.isArray(allReservationsInput) ? allReservationsInput : await window.api.getAllReservations();
    const facilities = await window.api.getFacilities();
    const users = await window.api.getUsers();
    const facilityMap = new Map(facilities.map(f => [String(f.id), f]));
    const userMap = new Map(users.map(u => [u.username, u]));
    const pending = allReservations.filter(r => r.status === 'pending').slice(0, 5);
    const container = document.getElementById('pending-requests-list');
    if (!container) return;
    
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
                <td>${formatDate(r.eventDate).split(',')[0]}</td>
                <td>${submittedDate}</td>
                <td>
                    <a href="admin-requests.php" class="btn btn-small btn-primary">Review</a>
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



