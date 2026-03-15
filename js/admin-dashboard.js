// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth('admin')) return;
    bindNotificationToggle();
    loadNotifications();
    loadDashboard().catch(err => {
        showToast('Failed to load dashboard: ' + (err.message || 'Unknown error'), 'danger');
    });

    setInterval(() => {
        const user = getLoggedInUser();
        if (user) updateNotificationBadge(user.username);
    }, 5000);
});

function setTextIfExists(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function toDateValue(dateLike) {
    if (!dateLike) return null;
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function formatDateShort(dateLike) {
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime12Hour(timeValue) {
    if (!timeValue) return '-';
    const cleaned = String(timeValue).slice(0, 5);
    const [h, m] = cleaned.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return String(timeValue);
    const hour12 = (h % 12) || 12;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatTimeRange(startTime, endTime) {
    return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
}

function normalizeReservation(raw) {
    return {
        ...raw,
        facilityId: raw.facilityId != null ? raw.facilityId : raw.facility_id,
        eventDate: raw.eventDate || raw.event_date,
        eventStartDate: raw.eventStartDate || raw.event_start_date || raw.eventDate || raw.event_date,
        eventEndDate: raw.eventEndDate || raw.event_end_date,
        paymentStatus: raw.paymentStatus || raw.payment_status || 'pending',
        paymentDate: raw.paymentDate || raw.payment_date || null,
        paymentOption: raw.paymentOption || raw.payment_option || 'full',
        createdAt: raw.createdAt || raw.created_at || null,
        approvedAt: raw.approvedAt || raw.approved_at || null,
        rejectedAt: raw.rejectedAt || raw.rejected_at || null
    };
}

function isActiveReservationStatus(status) {
    return ['pending', 'completed'].includes(String(status || '').toLowerCase());
}

function getStatusBadgeClass(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'pending' || value === 'billing') return 'pending';
    if (value === 'completed') return 'completed';
    return 'rejected';
}

function getStatusLabel(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'pending' || value === 'billing') return 'Pending';
    if (value === 'completed') return 'Completed';
    if (value === 'cancelled') return 'Cancelled';
    return value || 'Unknown';
}

async function loadDashboard() {
    const [allReservationsRaw, facilities, users] = await Promise.all([
        window.api.getAllReservations(),
        window.api.getFacilities(),
        window.api.getUsers()
    ]);
    const allReservations = (Array.isArray(allReservationsRaw) ? allReservationsRaw : []).map(normalizeReservation);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);

    const stats = {
        total: allReservations.length,
        pending: allReservations.filter(r => r.status === 'pending').length,
        rejected: allReservations.filter(r => r.status === 'cancelled').length,
        completed: allReservations.filter(r => r.status === 'completed').length,
    };
    
    // Update stat cards
    setTextIfExists('stat-total', stats.total);
    setTextIfExists('stat-pending', stats.pending);
    setTextIfExists('stat-rejected', stats.rejected);
    setTextIfExists('stat-completed', stats.completed);
    
    // Display pending requests
    displayPendingRequests(allReservations, facilities, users);
    displayUpcomingEvents(allReservations, facilities, users, today, next7);
    displayRecentDecisions(allReservations, facilities, users);
}

async function displayPendingRequests(allReservationsInput, facilitiesInput, usersInput) {
    let allReservations = Array.isArray(allReservationsInput) ? allReservationsInput : null;
    if (!allReservations) {
        const fallbackReservationsRaw = await window.api.getAllReservations();
        allReservations = (Array.isArray(fallbackReservationsRaw) ? fallbackReservationsRaw : []).map(normalizeReservation);
    }
    const facilities = Array.isArray(facilitiesInput) ? facilitiesInput : await window.api.getFacilities();
    const users = Array.isArray(usersInput) ? usersInput : await window.api.getUsers();
    const facilityMap = new Map((facilities || []).map(f => [String(f.id), f]));
    const userMap = new Map((users || []).map(u => [u.username, u]));
    const pending = allReservations
        .filter(r => r.status === 'pending')
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);
    const container = document.getElementById('pending-requests-list');
    if (!container) return;
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">✓</div>
                <h3>No Pending Requests</h3>
                <p>All pending reservation requests have been reviewed.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Facility</th>
                    <th>Event Date</th>
                    <th>Payment</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    pending.forEach(r => {
        const facility = facilityMap.get(String(r.facilityId));
        const user = userMap.get(r.username);
        const submittedDate = formatDateShort(r.createdAt);
        const paymentLabel = (r.paymentOption === 'down_payment') ? 'Down Payment' : 'Full';
        
        html += `
            <tr>
                <td>${user ? user.fullname : r.username}</td>
                <td>${facility ? facility.name : 'Unknown'}</td>
                <td>${formatDate(r.eventStartDate || r.eventDate).split(',')[0]}${r.eventEndDate && r.eventEndDate !== (r.eventStartDate || r.eventDate) ? ' → ' + formatDate(r.eventEndDate).split(',')[0] : ''}</td>
                <td>${paymentLabel}</td>
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

function displayUpcomingEvents(allReservations, facilities, users, today, next7) {
    const container = document.getElementById('upcoming-events-list');
    if (!container) return;

    const facilityMap = new Map((facilities || []).map(f => [String(f.id), f]));
    const userMap = new Map((users || []).map(u => [u.username, u]));

    const upcoming = (allReservations || [])
        .filter(r => r.status === 'completed')
        .filter(r => {
            const startDate = toDateValue(r.eventStartDate || r.eventDate);
            return startDate && startDate >= today && startDate <= next7;
        })
        .sort((a, b) => new Date((a.eventStartDate || a.eventDate) + 'T00:00:00') - new Date((b.eventStartDate || b.eventDate) + 'T00:00:00'))
        .slice(0, 8);

    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">📅</div>
                <h3>No Upcoming Events</h3>
                <p>No completed reservations scheduled in the next 7 days.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Facility</th>
                    <th>Client</th>
                    <th>Time</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    upcoming.forEach(r => {
        const facility = facilityMap.get(String(r.facilityId));
        const user = userMap.get(r.username);
        const statusClass = getStatusBadgeClass(r.status);

        html += `
            <tr>
                <td>${formatDate(r.eventStartDate || r.eventDate).split(',')[0]}</td>
                <td>${facility ? facility.name : 'Unknown'}</td>
                <td>${user ? user.fullname : r.username}</td>
                <td>${formatTimeRange(r.startTime, r.endTime)}</td>
                <td><span class="badge ${statusClass}">${getStatusLabel(r.status)}</span></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

function displayRecentDecisions(allReservations, facilities, users) {
    const container = document.getElementById('recent-decisions-list');
    if (!container) return;

    const facilityMap = new Map((facilities || []).map(f => [String(f.id), f]));
    const userMap = new Map((users || []).map(u => [u.username, u]));

    const decisions = (allReservations || [])
        .filter(r => ['completed', 'cancelled'].includes(String(r.status || '').toLowerCase()))
        .sort((a, b) => {
            const aDate = new Date(a.paymentDate || a.approvedAt || a.rejectedAt || a.createdAt || 0);
            const bDate = new Date(b.paymentDate || b.approvedAt || b.rejectedAt || b.createdAt || 0);
            return bDate - aDate;
        })
        .slice(0, 8);

    if (decisions.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">📝</div>
                <h3>No Recent Decisions</h3>
                <p>Completed and cancelled reservations will appear here.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Client</th>
                    <th>Facility</th>
                    <th>Event Date</th>
                    <th>Decision</th>
                    <th>Payment</th>
                    <th>Updated</th>
                </tr>
            </thead>
            <tbody>
    `;

    decisions.forEach(r => {
        const facility = facilityMap.get(String(r.facilityId));
        const user = userMap.get(r.username);
        const statusClass = getStatusBadgeClass(r.status);
        const updatedAt = r.paymentDate || r.approvedAt || r.rejectedAt || r.createdAt;

        html += `
            <tr>
                <td>${user ? user.fullname : r.username}</td>
                <td>${facility ? facility.name : 'Unknown'}</td>
                <td>${formatDate(r.eventStartDate || r.eventDate).split(',')[0]}</td>
                <td><span class="badge ${statusClass}">${getStatusLabel(r.status)}</span></td>
                <td>${r.paymentStatus || 'pending'}</td>
                <td>${formatDateShort(updatedAt)}</td>
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
// NOTIFICATIONS
// ===========================

function loadNotifications() {
    const user = getLoggedInUser();
    if (!user) return;
    updateNotificationBadge(user.username);
}

function updateNotificationBadge(username) {
    const unreadCount = getUnreadNotificationsCount(username);
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    badge.textContent = String(unreadCount);
}

function toggleNotifications() {
    const panel = document.getElementById('notificationPanel');
    const user = getLoggedInUser();
    if (!panel || !user) return;

    if (!panel.classList.contains('show')) {
        panel.classList.add('show');
        displayNotifications(user.username);
    } else {
        panel.classList.remove('show');
    }
}

function displayNotifications(username) {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;

    const notifications = getNotificationsByUser(username);
    if (notifications.length === 0) {
        panel.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                <p>📭 No notifications yet</p>
            </div>
        `;
        return;
    }

    let html = '';
    notifications.forEach(notif => {
        const bgColor = notif.type === 'approved' ? '#d4edda' : notif.type === 'rejected' ? '#f8d7da' : '#e7f3ff';
        const borderColor = notif.type === 'approved' ? '#28a745' : notif.type === 'rejected' ? '#dc3545' : '#e83e8c';
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
                    ${!notif.read ? '<span style="display: inline-block; width: 8px; height: 8px; background: #d63384; border-radius: 50%; margin-left: 10px; margin-top: 4px;"></span>' : ''}
                </div>
            </div>
        `;
    });
    panel.innerHTML = html;
}

function markNotificationRead(notificationId) {
    markNotificationAsRead(notificationId);
    const user = getLoggedInUser();
    if (!user) return;
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

document.addEventListener('click', function(event) {
    const panel = document.getElementById('notificationPanel');
    if (!panel) return;
    if (event.target.closest('#notificationToggleBtn') || event.target.closest('#notificationPanel')) return;
    panel.classList.remove('show');
});

function bindNotificationToggle() {
    const btn = document.getElementById('notificationToggleBtn');
    if (!btn) return;
    btn.addEventListener('click', toggleNotifications);
}




