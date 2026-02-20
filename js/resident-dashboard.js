// Initialize resident dashboard
document.addEventListener('DOMContentLoaded', function() {
    checkAuth('resident');
    updateUserName();
    loadDashboard();
    loadNotifications();
    
    // Auto-refresh notifications every 3 seconds
    setInterval(() => {
        const user = getLoggedInUser();
        if (user) {
            updateNotificationBadge(user.username);
        }
    }, 3000);
});

// Update user name in welcome message
function updateUserName() {
    const user = getLoggedInUser();
    if (user) {
        document.getElementById('username-display').textContent = user.fullname || user.username;
    }
}

function loadDashboard() {
    const user = getLoggedInUser();
    const reservations = getReservationsByUser(user.username);
    
    // Update username display
    document.getElementById('username-display').textContent = user.fullname || user.username;
    
    // Calculate statistics
    const stats = {
        total: reservations.length,
        approved: reservations.filter(r => r.status === 'approved').length,
        pending: reservations.filter(r => r.status === 'pending').length,
        rejected: reservations.filter(r => r.status === 'rejected').length
    };
    
    // Update stat cards
    document.getElementById('total-count').textContent = stats.total;
    document.getElementById('approved-count').textContent = stats.approved;
    document.getElementById('pending-count').textContent = stats.pending;
    document.getElementById('rejected-count').textContent = stats.rejected;
    
    // Display recent reservations
    displayRecentReservations(reservations.slice(0, 5));
}

function displayRecentReservations(reservations) {
    const container = document.getElementById('recent-reservations');
    
    if (reservations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No Reservations Yet</h3>
                <p>You haven't made any reservations yet. Start by browsing our facilities!</p>
                <a href="facilities.html" class="btn btn-primary">Browse Facilities</a>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Facility</th>
                    <th>Event Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    reservations.forEach(r => {
        const facility = getFacilityById(r.facilityId);
        const statusClass = r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending';
        
        html += `
            <tr>
                <td>${facility ? facility.name : 'Unknown'}</td>
                <td>${formatDate(r.eventDate)}</td>
                <td><span class="status-badge ${statusClass}">${r.status}</span></td>
                <td>
                    <a href="my-reservations.html" class="btn btn-small btn-secondary">View Details</a>
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

// ===========================
// NOTIFICATION FUNCTIONS
// ===========================

function loadNotifications() {
    const user = getLoggedInUser();
    updateNotificationBadge(user.username);
}

function updateNotificationBadge(username) {
    const unreadCount = getUnreadNotificationsCount(username);
    const badge = document.getElementById("notificationBadge");
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

function toggleNotifications() {
    const panel = document.getElementById("notificationPanel");
    const user = getLoggedInUser();
    
    if (panel.style.display === "none" || panel.style.display === "") {
        panel.style.display = "block";
        displayNotifications(user.username);
    } else {
        panel.style.display = "none";
    }
}

function displayNotifications(username) {
    const panel = document.getElementById("notificationPanel");
    const notifications = getNotificationsByUser(username);
    
    if (notifications.length === 0) {
        panel.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                <p>📭 No notifications yet</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    
    notifications.forEach(notif => {
        const bgColor = notif.type === 'approved' ? '#d4edda' : notif.type === 'rejected' ? '#f8d7da' : '#e7f3ff';
        const borderColor = notif.type === 'approved' ? '#28a745' : notif.type === 'rejected' ? '#dc3545' : '#2196F3';
        const readClass = notif.read ? 'opacity-50' : 'font-weight-bold';
        
        html += `
            <div style="padding: 12px 15px; border-left: 4px solid ${borderColor}; background: ${bgColor}; cursor: pointer; border-bottom: 1px solid #eee; transition: all 0.3s;" 
                 onmouseover="this.style.background='rgba(0,0,0,0.05)'" 
                 onmouseout="this.style.background='${bgColor}'"
                 onclick="markNotificationRead(${notif.id})">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1; ${readClass}">
                        <p style="margin: 0 0 5px 0; font-weight: bold; color: #333;">${notif.title}</p>
                        <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">${notif.message}</p>
                        <p style="margin: 0; font-size: 12px; color: #999;">${getTimeAgo(notif.createdAt)}</p>
                    </div>
                    ${!notif.read ? '<span style="display: inline-block; width: 8px; height: 8px; background: #2a5298; border-radius: 50%; margin-left: 10px; margin-top: 4px;"></span>' : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    panel.innerHTML = html;
}

function markNotificationRead(notificationId) {
    markNotificationAsRead(notificationId);
    const user = getLoggedInUser();
    updateNotificationBadge(user.username);
    displayNotifications(user.username);
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Close notification panel when clicking outside
document.addEventListener('click', function(event) {
    const panel = document.getElementById("notificationPanel");
    const button = event.target.closest('button');
    
    if (!button || !button.textContent.includes('Notifications')) {
        if (event.target.id !== "notificationPanel" && !event.target.closest("#notificationPanel")) {
            panel.style.display = "none";
        }
    }
});

