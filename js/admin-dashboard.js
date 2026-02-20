// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth('admin');
    loadDashboard();
});

function loadDashboard() {
    const stats = getReservationStats();
    
    // Update stat cards
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-approved').textContent = stats.approved;
    document.getElementById('stat-rejected').textContent = stats.rejected;
    
    // Display pending requests
    displayPendingRequests();
}

function displayPendingRequests() {
    const allReservations = getAllReservations();
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
        const facility = getFacilityById(r.facilityId);
        const user = getUserByUsername(r.username);
        const submittedDate = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        html += `
            <tr>
                <td>${user ? user.fullname : r.username}</td>
                <td>${facility ? facility.name : 'Unknown'}</td>
                <td>${formatDate(r.eventDate).split(',')[0]}</td>
                <td>${submittedDate}</td>
                <td>
                    <a href="admin-requests.html" class="btn btn-small btn-primary">Review</a>
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
