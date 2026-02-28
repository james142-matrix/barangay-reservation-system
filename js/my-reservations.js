// Initialize my reservations page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth('resident');
    bindNotificationToggle();
    loadMyReservations().catch(err => {
        showToast('Failed to load reservations: ' + (err.message || 'Unknown error'), 'danger');
    });
    loadNotifications();
    
    // Auto-refresh notifications every 3 seconds
    setInterval(() => {
        const user = getLoggedInUser();
        if (user) {
            updateNotificationBadge(user.username);
        }
    }, 3000);
});

let selectedReservation = null;
let currentReservations = [];
let facilitiesById = new Map();

function normalizeReservation(raw) {
    if (!raw) return raw;
    return {
        ...raw,
        id: typeof raw.id === 'string' ? parseInt(raw.id, 10) : raw.id,
        facilityId: raw.facilityId != null ? raw.facilityId : raw.facility_id,
        eventDate: raw.eventDate || raw.event_date,
        eventEndDate: raw.eventEndDate || raw.event_end_date,
        startTime: raw.startTime || raw.start_time,
        endTime: raw.endTime || raw.end_time,
        eventType: raw.eventType || raw.event_type || '',
        expectedGuests: raw.expectedGuests != null ? raw.expectedGuests : (raw.expected_guests ?? 0),
        eventDescription: raw.eventDescription || raw.event_description || '',
        contactPerson: raw.contactPerson || raw.contact_person || '',
        contactPhone: raw.contactPhone || raw.contact_phone || '',
        createdAt: raw.createdAt || raw.created_at || raw.created || null
    };
}

async function loadMyReservations() {
    const user = getLoggedInUser();
    const [reservations, facilities] = await Promise.all([
        window.api.getReservationsByUser(user.username),
        window.api.getFacilities()
    ]);
    facilitiesById = new Map((facilities || []).map(f => [String(f.id), f]));
    console.log('[my-reservations] loaded from MySQL:', reservations.length);

    currentReservations = reservations.map(normalizeReservation);
    displayReservations(currentReservations);
}

function displayReservations(reservations) {
    const container = document.getElementById('reservations-list');
    
    if (reservations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No Reservations Yet</h3>
                <p>You haven't created any reservations yet.</p>
                <a href="reserve.html" class="btn btn-primary">Create Your First Reservation</a>
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
                    <th>Time</th>
                    <th>Event Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    reservations.forEach(r => {
        const facility = facilitiesById.get(String(r.facilityId));
        const statusClass = r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending';
        const createdDate = r.createdAt
            ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '-';
        
        html += `
            <tr>
                <td>${facility ? facility.name : 'Unknown'}</td>
                <td>${formatDate(r.eventDate).split(',')[0]}</td>
                <td>${r.startTime} - ${r.endTime}</td>
                <td>${r.eventType}</td>
                <td><span class="status-badge ${statusClass}">${r.status}</span></td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="showReservationDetail(${r.id})">View</button>
                    ${r.status === 'pending' ? `<button class="btn btn-small btn-danger" onclick="cancelReservationAction(${r.id})">Cancel</button>` : ''}
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

function filterReservations() {
    const allReservations = currentReservations;
    const status = document.getElementById('statusFilter').value;
    
    let filtered = allReservations;
    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }
    
    displayReservations(filtered);
}

function showReservationDetail(id) {
    selectedReservation = currentReservations.find(r => String(r.id) === String(id));
    
    if (!selectedReservation) {
        showToast('Reservation not found', 'danger');
        return;
    }
    
    const facility = facilitiesById.get(String(selectedReservation.facilityId));
    const statusClass = selectedReservation.status === 'approved' ? 'approved' : selectedReservation.status === 'rejected' ? 'rejected' : 'pending';
    
    let html = `
        <div style="margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <p style="color: #888; font-size: 13px; text-transform: uppercase; font-weight: 600;">Facility</p>
                    <p style="font-size: 16px; font-weight: 600;">${facility ? facility.name : 'Unknown'}</p>
                </div>
                <div>
                    <p style="color: #888; font-size: 13px; text-transform: uppercase; font-weight: 600;">Status</p>
                    <p><span class="status-badge ${statusClass}">${selectedReservation.status}</span></p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <p style="color: #888; font-size: 13px; text-transform: uppercase; font-weight: 600;">Event Date</p>
                    <p style="font-size: 16px; font-weight: 600;">${formatDate(selectedReservation.eventDate).split(',')[0]}</p>
                </div>
                <div>
                    <p style="color: #888; font-size: 13px; text-transform: uppercase; font-weight: 600;">Time</p>
                    <p style="font-size: 16px; font-weight: 600;">${selectedReservation.startTime} - ${selectedReservation.endTime}</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div>
                    <p style="color: #888; font-size: 13px; text-transform: uppercase; font-weight: 600;">Event Type</p>
                    <p>${selectedReservation.eventType}</p>
                </div>
                <div>
                    <p style="color: #888; font-size: 13px; text-transform: uppercase; font-weight: 600;">Expected Guests</p>
                    <p>${selectedReservation.expectedGuests}</p>
                </div>
            </div>
            
            <div>
                <p style="color: #888; font-size: 13px; text-transform: uppercase; font-weight: 600;">Description</p>
                <p>${selectedReservation.eventDescription || 'No description provided'}</p>
            </div>
            
            <div style="background: #f5f7fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="color: #888; font-size: 13px; margin-bottom: 8px;">Contact Information</p>
                <p><strong>${selectedReservation.contactPerson}</strong></p>
                <p>${selectedReservation.contactPhone}</p>
            </div>
            
            ${selectedReservation.rejectionReason ? `
            <div style="background: #f8d7da; border-left: 4px solid #ff6b6b; padding: 15px; border-radius: 5px; margin-top: 20px;">
                <p style="color: #721c24; font-weight: 600; margin-bottom: 8px;">Rejection Reason:</p>
                <p style="color: #721c24;">${selectedReservation.rejectionReason}</p>
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('detailBody').innerHTML = html;
    document.getElementById('cancelBtnModal').style.display = selectedReservation.status === 'pending' ? 'block' : 'none';
    
    document.getElementById('detailModal').classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('show');
    selectedReservation = null;
}

async function cancelReservationAction(id) {
    const doCancel = async () => {
        await window.api.deleteReservation(id);
        showToast('Reservation cancelled successfully', 'success');
        loadMyReservations();
    };

    if (typeof showConfirm === 'function') {
        showConfirm('Are you sure you want to cancel this reservation?', doCancel);
        return;
    }

    if (confirm('Are you sure you want to cancel this reservation?')) {
        await doCancel();
    }
}

async function cancelReservation() {
    if (!selectedReservation) return;

    const doCancel = async () => {
        await window.api.deleteReservation(selectedReservation.id);
        showToast('Reservation cancelled successfully', 'success');
        closeDetailModal();
        loadMyReservations();
    };

    if (typeof showConfirm === 'function') {
        showConfirm('Are you sure you want to cancel this reservation?', doCancel);
        return;
    }

    if (confirm('Are you sure you want to cancel this reservation?')) {
        await doCancel();
    }
}


// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target === modal) {
        closeDetailModal();
    }
});

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
    
    if (!panel.classList.contains('show')) {
        panel.classList.add('show');
        displayNotifications(user.username);
    } else {
        panel.classList.remove('show');
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
    if (!panel) return;
    if (event.target.closest('#notificationToggleBtn') || event.target.closest('#notificationPanel')) return;
    panel.classList.remove('show');
});

function bindNotificationToggle() {
    const btn = document.getElementById('notificationToggleBtn');
    if (!btn) return;
    btn.addEventListener('click', toggleNotifications);
}

