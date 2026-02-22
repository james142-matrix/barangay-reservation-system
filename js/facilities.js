// Initialize facilities page
document.addEventListener('DOMContentLoaded', function() {
    // Allow both admins and residents to access facilities page
    checkAuth();
    loadFacilities();
    loadNotifications();
    
    // Auto-refresh notifications every 3 seconds
    setInterval(() => {
        const user = getLoggedInUser();
        if (user && user.role === 'resident') {
            updateNotificationBadge(user.username);
        }
    }, 3000);
});

let selectedFacility = null;

function loadFacilities() {
    const facilities = getAllFacilities();
    const container = document.getElementById('facilities-container');
    
    if (facilities.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">🏢</div>
                <h3>No Facilities Available</h3>
                <p>There are currently no facilities available for reservation</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    facilities.forEach(facility => {
        const card = createFacilityCard(facility);
        container.appendChild(card);
    });
}

function createFacilityCard(facility) {
    const card = document.createElement('div');
    card.className = 'facility-card';
    card.addEventListener('click', () => showFacilityModal(facility));
    
    card.innerHTML = `
        <div class="facility-image">
            ${facility.icon}
        </div>
        <div class="facility-info">
            <h3>${facility.name}</h3>
            <p>${facility.description}</p>
            <div class="facility-details">
                <small>👥 Capacity: ${facility.capacity}</small>
                <span class="facility-price">₱${facility.price}</span>
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-top: 10px;">View Details</button>
        </div>
    `;

    // attach listener to the button separately so we can stop propagation correctly
    const btn = card.querySelector('button');
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        showFacilityModal(facility);
    });

    return card;
}

function showFacilityModal(facility, e) {
    // e is the click event when coming from a button; stop propagation so the card's
    // onclick handler doesn't also fire.
    if (e && e.stopPropagation) {
        e.stopPropagation();
    }
    
    selectedFacility = facility;
    const modal = document.getElementById('facilityModal');
    document.getElementById('modalTitle').textContent = facility.name;
    
    document.getElementById('modalBody').innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 64px; margin-bottom: 15px;">${facility.icon}</div>
            <h2>${facility.name}</h2>
            <p style="color: #666; margin-bottom: 20px;">${facility.description}</p>
        </div>
        
        <div style="background: #f5f7fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p style="color: #888; font-size: 14px;">Capacity</p>
                    <p style="font-size: 24px; font-weight: 700; color: #667eea;">${facility.capacity} persons</p>
                </div>
                <div>
                    <p style="color: #888; font-size: 14px;">Daily Rate</p>
                    <p style="font-size: 24px; font-weight: 700; color: #667eea;">₱${facility.price}</p>
                </div>
            </div>
        </div>
        
        <div style="background: #d1ecf1; border-left: 4px solid #667eea; padding: 15px; border-radius: 5px;">
            <p style="color: #0c5460; font-size: 14px;"><strong>ℹ️ Note:</strong> To make a reservation for this facility, click the "Make Reservation" button below and fill out the required details.</p>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeFacilityModal() {
    document.getElementById('facilityModal').classList.remove('show');
    selectedFacility = null;
}

function goToReserve() {
    if (selectedFacility) {
        localStorage.setItem('selectedFacilityId', selectedFacility.id);
        window.location.href = 'reserve.html';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('facilityModal');
    if (event.target === modal) {
        closeFacilityModal();
    }
});

// ===========================
// NOTIFICATION FUNCTIONS
// ===========================

function loadNotifications() {
    const user = getLoggedInUser();
    if (user && user.role === 'resident') {
        updateNotificationBadge(user.username);
    }
}

function updateNotificationBadge(username) {
    const unreadCount = getUnreadNotificationsCount(username);
    const badge = document.getElementById("notificationBadge");
    
    if (badge && unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "inline-block";
    } else if (badge) {
        badge.style.display = "none";
    }
}

function toggleNotifications() {
    const panel = document.getElementById("notificationPanel");
    const user = getLoggedInUser();
    
    if (!user || user.role !== 'resident') return;
    
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

