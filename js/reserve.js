// Initialize reservation page
document.addEventListener('DOMContentLoaded', async function() {
    checkAuth('resident');
    bindNotificationToggle();
    try {
        await loadFacilitiesDropdown();
    } catch (e) {
        console.error('Error loading facilities', e);
    }
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

let facilitiesCache = [];

async function loadFacilitiesDropdown() {
    const select = document.getElementById('facility');

    // always start with the placeholder option
    select.innerHTML = '<option value="">-- Choose a Facility --</option>';

    const facilities = await window.api.getFacilities();
    facilitiesCache = Array.isArray(facilities) ? facilities : [];

    console.log('facilities received for dropdown', facilities);

    if (facilitiesCache.length === 0) {
        select.innerHTML += '<option disabled value="">(no facilities available)</option>';
        // show a warning so the resident understands the problem
        if (typeof showToast === 'function') {
            showToast('No facilities are currently available. Please try again later or contact an administrator.', 'warning');
        }
        return;
    }

    facilitiesCache.forEach(f => {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = `${f.name} (₱${f.price})`;
        select.appendChild(option);
    });

    // if user came from facilities page, facility can be passed by query string
    const params = new URLSearchParams(window.location.search);
    const selectedFromQuery = params.get('facility');
    if (selectedFromQuery) {
        const exists = facilitiesCache.find(f => String(f.id) === String(selectedFromQuery));
        if (exists) {
            select.value = exists.id;
            updateFacilityPrice();
        }
    }
}

function getFacilityFromCache(facilityId) {
    return facilitiesCache.find(f => String(f.id) === String(facilityId)) || null;
}

function setupEventListeners() {
    const facilitySelect = document.getElementById('facility');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const startDateInput = document.getElementById('eventDate');
    const endDateInput = document.getElementById('eventEndDate');
    
    facilitySelect.addEventListener('change', updateFacilityPrice);
    startTimeInput.addEventListener('change', calculateCost);
    endTimeInput.addEventListener('change', calculateCost);
    
    if (startDateInput && endDateInput) {
        // ensure end date not before start date
        startDateInput.addEventListener('change', function() {
            if (endDateInput.value && endDateInput.value < this.value) {
                endDateInput.value = this.value;
            }
            endDateInput.min = this.value;
            calculateCost();
        });
        endDateInput.addEventListener('change', calculateCost);
    }
}

function updateFacilityPrice() {
    const facilityId = document.getElementById('facility').value;
    if (!facilityId) {
        document.getElementById('facilityPrice').textContent = '₱0';
        document.getElementById('totalCost').textContent = '₱0';
        return;
    }
    
    const facility = getFacilityFromCache(facilityId);
    const facilityPrice = facility ? Number(facility.price || 0) : 0;
    if (facility) {
        document.getElementById('facilityPrice').textContent = `₱${facilityPrice}`;
        calculateCost();
    }
}

function calculateCost() {
    const facilityId = document.getElementById('facility').value;
    const startDate = document.getElementById('eventDate').value;
    const endDate = document.getElementById('eventEndDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (!facilityId || !startDate || !endDate || !startTime || !endTime) {
        document.getElementById('totalCost').textContent = '₱0';
        document.getElementById('duration').textContent = '-';
        return;
    }
    
    const facility = getFacilityFromCache(facilityId);
    const startDt = new Date(`${startDate}T${startTime}`);
    const endDt = new Date(`${endDate}T${endTime}`);
    let durationText = '';
    let durationHours = 0;
    
    if (endDt <= startDt) {
        durationText = 'Invalid range';
    } else {
        const diffMs = endDt - startDt;
        durationHours = diffMs / (1000 * 60 * 60);
        const days = Math.floor(durationHours / 24);
        const hours = durationHours - days * 24;
        durationText = days > 0 ? `${days}d ${hours.toFixed(1)}h` : `${hours.toFixed(1)}h`;
    }
    document.getElementById('duration').textContent = durationText;
    
    const totalCost = facility ? facility.price * durationHours : 0;
    document.getElementById('totalCost').textContent = `₱${totalCost.toFixed(2)}`;
}

async function submitReservation(event) {
    event.preventDefault();
    
    const user = getLoggedInUser();
    const facilityId = document.getElementById('facility').value;
    const eventDate = document.getElementById('eventDate').value; // start date
    const eventEndDate = document.getElementById('eventEndDate').value; // end date
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const eventType = document.getElementById('eventType').value;
    const expectedGuests = parseInt(document.getElementById('expectedGuests').value);
    const eventDescription = document.getElementById('eventDescription').value || '';
    const contactPerson = document.getElementById('contactPerson').value;
    const contactPhone = document.getElementById('contactPhone').value;
    
    // Validation
    if (!facilityId || !eventDate || !eventEndDate || !startTime || !endTime || !eventType || !expectedGuests) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    if (new Date(eventEndDate) < new Date(eventDate)) {
        showToast('End date cannot be before start date', 'warning');
        return;
    }
    
    const facility = getFacilityFromCache(facilityId);
    if (!facility) {
        showToast('Invalid facility selected', 'danger');
        return;
    }
    
    if (expectedGuests > facility.capacity) {
        showToast(`Expected guests (${expectedGuests}) exceeds facility capacity (${facility.capacity})`, 'warning');
        return;
    }
    
    // Check for conflicts with existing reservations
    // compute datetime ranges for new reservation
    const startDt = new Date(`${eventDate}T${startTime}`);
    const endDt = new Date(`${eventEndDate}T${endTime}`);

    const existingReservations = await window.api.getReservationsByUser(user.username);
    const hasConflict = existingReservations.some(r => {
        if (r.status === 'rejected') return false;
        // compare loosely because facilityId may be string or number
        if (r.facilityId != facilityId) return false;

        // determine existing reservation range
        const rStart = new Date(`${r.eventDate || r.eventStartDate}T${r.startTime}`);
        const rEndDate = r.eventEndDate || r.eventDate;
        const rEnd = new Date(`${rEndDate}T${r.endTime}`);

        // overlap if intervals intersect
        return !(endDt <= rStart || startDt >= rEnd);
    });
    
    if (hasConflict) {
        showToast('This facility is already reserved for the selected time', 'warning');
        return;
    }
    
    // compute total cost before submitting
    const [sHour, sMin] = startTime.split(':').map(Number);
    const [eHour, eMin] = endTime.split(':').map(Number);
    const startMinTotal = sHour * 60 + sMin;
    const endMinTotal = eHour * 60 + eMin;
    let durationHoursCalc = 0;
    if (endMinTotal > startMinTotal) {
        durationHoursCalc = (endMinTotal - startMinTotal) / 60;
    }
    const totalCost = facility.price * durationHoursCalc;

    // Create reservation via backend API if possible
    try {
        const reservation = await window.api.createReservation({
            username: user.username,
            facilityId: facilityId,
            eventDate: eventDate,           // legacy
            eventStartDate: eventDate,
            eventEndDate: eventEndDate,
            startTime: startTime,
            endTime: endTime,
            eventType: eventType,
            expectedGuests: expectedGuests,
            eventDescription: eventDescription,
            contactPerson: contactPerson,
            contactPhone: contactPhone,
            totalCost: totalCost
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

