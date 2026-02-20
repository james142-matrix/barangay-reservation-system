// Initialize reservation page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth('resident');
    loadFacilitiesDropdown();
    setupEventListeners();
    loadNotifications();
    
    // Auto-refresh notifications every 3 seconds
    setInterval(() => {
        const user = getLoggedInUser();
        if (user) {
            updateNotificationBadge(user.username);
        }
    }, 3000);
});

function loadFacilitiesDropdown() {
    const facilities = getAllFacilities();
    const select = document.getElementById('facility');
    
    facilities.forEach(f => {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = `${f.name} (₱${f.price})`;
        select.appendChild(option);
    });
}

function setupEventListeners() {
    const facilitySelect = document.getElementById('facility');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    
    facilitySelect.addEventListener('change', updateFacilityPrice);
    startTimeInput.addEventListener('change', calculateCost);
    endTimeInput.addEventListener('change', calculateCost);
}

function updateFacilityPrice() {
    const facilityId = document.getElementById('facility').value;
    if (!facilityId) {
        document.getElementById('facilityPrice').textContent = '₱0';
        document.getElementById('totalCost').textContent = '₱0';
        return;
    }
    
    const facility = getFacilityById(parseInt(facilityId));
    if (facility) {
        document.getElementById('facilityPrice').textContent = `₱${facility.price}`;
        calculateCost();
    }
}

function calculateCost() {
    const facilityId = document.getElementById('facility').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (!facilityId || !startTime || !endTime) {
        document.getElementById('totalCost').textContent = '₱0';
        document.getElementById('duration').textContent = '-';
        return;
    }
    
    const facility = getFacilityById(parseInt(facilityId));
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let durationHours;
    if (endMinutes <= startMinutes) {
        durationHours = 0;
        document.getElementById('duration').textContent = 'Invalid time range';
    } else {
        durationHours = (endMinutes - startMinutes) / 60;
        document.getElementById('duration').textContent = `${durationHours.toFixed(1)} hours`;
    }
    
    const totalCost = facility ? facility.price * durationHours : 0;
    document.getElementById('totalCost').textContent = `₱${totalCost.toFixed(2)}`;
}

function submitReservation(event) {
    event.preventDefault();
    
    const user = getLoggedInUser();
    const facilityId = parseInt(document.getElementById('facility').value);
    const eventDate = document.getElementById('eventDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const eventType = document.getElementById('eventType').value;
    const expectedGuests = parseInt(document.getElementById('expectedGuests').value);
    const eventDescription = document.getElementById('eventDescription').value || '';
    const contactPerson = document.getElementById('contactPerson').value;
    const contactPhone = document.getElementById('contactPhone').value;
    
    // Validation
    if (!facilityId || !eventDate || !startTime || !endTime || !eventType || !expectedGuests) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    const facility = getFacilityById(facilityId);
    if (!facility) {
        showToast('Invalid facility selected', 'danger');
        return;
    }
    
    if (expectedGuests > facility.capacity) {
        showToast(`Expected guests (${expectedGuests}) exceeds facility capacity (${facility.capacity})`, 'warning');
        return;
    }
    
    // Check for conflicts with existing reservations
    const existingReservations = getReservationsByUser(user.username);
    const hasConflict = existingReservations.some(r => {
        if (r.status === 'rejected') return false;
        if (r.facilityId !== facilityId) return false;
        if (r.eventDate !== eventDate) return false;
        
        const rStart = r.startTime.split(':').map(Number);
        const rEnd = r.endTime.split(':').map(Number);
        const newStart = startTime.split(':').map(Number);
        const newEnd = endTime.split(':').map(Number);
        
        const rStartMin = rStart[0] * 60 + rStart[1];
        const rEndMin = rEnd[0] * 60 + rEnd[1];
        const newStartMin = newStart[0] * 60 + newStart[1];
        const newEndMin = newEnd[0] * 60 + newEnd[1];
        
        return !(newEndMin <= rStartMin || newStartMin >= rEndMin);
    });
    
    if (hasConflict) {
        showToast('This facility is already reserved for the selected time', 'warning');
        return;
    }
    
    // Create reservation
    try {
        const reservation = createReservation({
            username: user.username,
            facilityId: facilityId,
            eventDate: eventDate,
            startTime: startTime,
            endTime: endTime,
            eventType: eventType,
            expectedGuests: expectedGuests,
            eventDescription: eventDescription,
            contactPerson: contactPerson,
            contactPhone: contactPhone
        });
        
        showToast('Reservation submitted successfully! Awaiting admin approval.', 'success');
        
        setTimeout(() => {
            window.location.href = 'my-reservations.html';
        }, 2000);
    } catch (error) {
        showToast('Error creating reservation: ' + error.message, 'danger');
    }
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

