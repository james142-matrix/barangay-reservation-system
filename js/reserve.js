// Initialize reservation page
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    const user = getLoggedInUser();
    if (!user || (user.role !== 'admin' && user.role !== 'barangay_staff')) {
        window.location.href = 'index.php?v=20260303b';
        return;
    }
    configureNavigation(user.role);
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
        if (user && user.role === 'resident') {
            updateNotificationBadge(user.username);
        }
    }, 3000);
});

let facilitiesCache = [];
const CHAIR_RATE = 10;
const ELECTRONICS_RATE = 150;

function toIsoDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDaysIso(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + days);
    return toIsoDate(d);
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return (h * 60) + m;
}

function formatTime12Hour(timeValue) {
    if (!timeValue || !timeValue.includes(':')) return '-';
    const [hourStr, minuteStr] = timeValue.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr || '00';
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minute} ${suffix}`;
}

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
    const chairsCountInput = document.getElementById('chairsCount');
    const electronicsCountInput = document.getElementById('electronicsCount');
    const paymentOptionInput = document.getElementById('paymentOption');
    const clientNameInput = document.getElementById('clientName');
    const contactPersonInput = document.getElementById('contactPerson');
    const contactPhoneInput = document.getElementById('contactPhone');
    
    facilitySelect.addEventListener('change', updateFacilityPrice);
    startTimeInput.addEventListener('change', function() {
        autoAdjustEndDateForOvernight();
        calculateCost();
    });
    endTimeInput.addEventListener('change', function() {
        autoAdjustEndDateForOvernight();
        calculateCost();
    });
    startTimeInput.addEventListener('input', updateTimeDisplays);
    endTimeInput.addEventListener('input', updateTimeDisplays);
    chairsCountInput.addEventListener('input', calculateCost);
    electronicsCountInput.addEventListener('input', calculateCost);
    paymentOptionInput.addEventListener('change', toggleDownPaymentInput);
    if (clientNameInput) {
        clientNameInput.addEventListener('input', function() {
            this.value = sanitizeNameInput(this.value);
        });
    }
    if (contactPersonInput) {
        contactPersonInput.addEventListener('input', function() {
            this.value = sanitizeNameInput(this.value);
        });
    }
    if (contactPhoneInput) {
        contactPhoneInput.addEventListener('input', function() {
            this.value = sanitizePhoneInput(this.value);
        });
    }
    if (chairsCountInput) {
        chairsCountInput.addEventListener('input', function() {
            this.value = sanitizeIntegerInput(this.value);
        });
    }
    if (electronicsCountInput) {
        electronicsCountInput.addEventListener('input', function() {
            this.value = sanitizeIntegerInput(this.value);
        });
    }
    
    if (startDateInput && endDateInput) {
        // ensure end date not before start date
        startDateInput.addEventListener('change', function() {
            if (endDateInput.value && endDateInput.value < this.value) {
                endDateInput.value = this.value;
            }
            endDateInput.min = this.value;
            autoAdjustEndDateForOvernight();
            calculateCost();
        });
        endDateInput.addEventListener('change', function() {
            autoAdjustEndDateForOvernight();
            calculateCost();
        });
    }

    toggleDownPaymentInput();
    updateTimeDisplays();
}

function sanitizeNameInput(value) {
    // Allow letters, spaces, apostrophe, dot, and hyphen.
    return String(value || '').replace(/[^A-Za-z\s.'-]/g, '');
}

function sanitizePhoneInput(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 15);
}

function sanitizeIntegerInput(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits === '') return '';
    return String(parseInt(digits, 10));
}

function autoAdjustEndDateForOvernight() {
    const startDateInput = document.getElementById('eventDate');
    const endDateInput = document.getElementById('eventEndDate');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    if (!startDateInput || !endDateInput || !startTimeInput || !endTimeInput) return;

    const startDate = startDateInput.value;
    let endDate = endDateInput.value;
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    if (!startDate || !endDate || !startTime || !endTime) return;

    if (endDate < startDate) {
        endDateInput.value = startDate;
        endDate = startDate;
    }

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (startMin == null || endMin == null) return;

    // If same date and end time is earlier/equal, assume overnight and move to next day.
    if (endDate === startDate && endMin <= startMin) {
        endDateInput.value = addDaysIso(startDate, 1);
    }
}

function configureNavigation(role) {
    const isAdmin = role === 'admin';
    const navBrand = document.getElementById('navBrand');
    const dashboard = document.getElementById('nav-dashboard');
    const requests = document.getElementById('nav-requests');
    const billing = document.getElementById('nav-billing');
    const facilities = document.getElementById('nav-facilities');
    const users = document.getElementById('nav-users');
    const usersItem = document.getElementById('nav-users-item');
    const reports = document.getElementById('nav-reports');
    const reportsItem = document.getElementById('nav-reports-item');
    const cancelLink = document.getElementById('cancelLink');

    const links = isAdmin
        ? {
            dashboard: 'admin-dashboard.php',
            requests: 'admin-requests.php',
            billing: 'admin-billing.php',
            facilities: 'admin-facilities.php',
            users: 'admin-users.php',
            reports: 'reports.php'
        }
        : {
            dashboard: 'barangay-staff-dashboard.php',
            requests: 'barangay-staff-requests.php',
            billing: 'barangay-staff-billing.php',
            facilities: 'barangay-staff-facilities.php',
            users: '',
            reports: ''
        };

    if (navBrand) {
        navBrand.textContent = isAdmin ? '🏛️ Barangay Molugan - Admin' : '🏛️ Barangay Molugan - Staff';
    }
    if (dashboard) dashboard.href = links.dashboard;
    if (requests) requests.href = links.requests;
    if (billing) billing.href = links.billing;
    if (facilities) facilities.href = links.facilities;
    if (users && usersItem) {
        users.href = links.users;
        usersItem.style.display = isAdmin ? '' : 'none';
    }
    if (reports && reportsItem) {
        reports.href = links.reports;
        reportsItem.style.display = isAdmin ? '' : 'none';
    }
    if (cancelLink) cancelLink.href = links.dashboard;
}

function updateTimeDisplays() {
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const startTimeDisplay = document.getElementById('startTimeDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
    if (startTimeDisplay) startTimeDisplay.textContent = formatTime12Hour(startTime);
    if (endTimeDisplay) endTimeDisplay.textContent = formatTime12Hour(endTime);
}

function toggleDownPaymentInput() {
    const paymentOption = document.getElementById('paymentOption').value;
    const downPaymentGroup = document.getElementById('downPaymentGroup');
    if (!downPaymentGroup) return;
    downPaymentGroup.style.display = paymentOption === 'down_payment' ? 'block' : 'none';
}

function updateFacilityPrice() {
    const facilityId = document.getElementById('facility').value;
    if (!facilityId) {
        document.getElementById('facilityPrice').textContent = '₱0';
        document.getElementById('totalCost').textContent = '₱0';
        const medicalRoomGroup = document.getElementById('medicalRoomDetailsGroup');
        if (medicalRoomGroup) medicalRoomGroup.style.display = 'none';
        return;
    }
    
    const facility = getFacilityFromCache(facilityId);
    const facilityPrice = facility ? Number(facility.price || 0) : 0;
    if (facility) {
        document.getElementById('facilityPrice').textContent = `₱${facilityPrice}`;
        const medicalRoomGroup = document.getElementById('medicalRoomDetailsGroup');
        if (medicalRoomGroup) {
            medicalRoomGroup.style.display = String(facility.name || '').toLowerCase() === 'medical room' ? 'block' : 'none';
        }
        calculateCost();
    }
}

function calculateCost() {
    const facilityId = document.getElementById('facility').value;
    const startDate = document.getElementById('eventDate').value;
    const endDate = document.getElementById('eventEndDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const chairsCount = Math.max(0, parseInt(document.getElementById('chairsCount').value || '0', 10) || 0);
    const electronicsCount = Math.max(0, parseInt(document.getElementById('electronicsCount').value || '0', 10) || 0);
    
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
    
    const baseCost = facility ? facility.price * durationHours : 0;
    const addOnCost = (chairsCount * CHAIR_RATE) + (electronicsCount * ELECTRONICS_RATE);
    const totalCost = baseCost + addOnCost;
    document.getElementById('totalCost').textContent = `₱${totalCost.toFixed(2)}`;
}

async function submitReservation(event) {
    event.preventDefault();
    
    const user = getLoggedInUser();
    if (!user || (user.role !== 'admin' && user.role !== 'barangay_staff')) {
        showToast('Only staff/admin can submit reservations from this page.', 'danger');
        return;
    }
    const facilityId = document.getElementById('facility').value;
    const eventDate = document.getElementById('eventDate').value; // start date
    let eventEndDate = document.getElementById('eventEndDate').value; // end date
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const eventType = document.getElementById('eventType').value;
    const expectedGuests = parseInt(document.getElementById('expectedGuests').value);
    const eventDescription = document.getElementById('eventDescription').value || '';
    const clientName = document.getElementById('clientName').value.trim();
    const contactPerson = document.getElementById('contactPerson').value.trim();
    const contactPhone = document.getElementById('contactPhone').value.trim();
    const chairsCount = Math.max(0, parseInt(document.getElementById('chairsCount').value || '0', 10) || 0);
    const electronicsCount = Math.max(0, parseInt(document.getElementById('electronicsCount').value || '0', 10) || 0);
    const medicalRoomDetails = (document.getElementById('medicalRoomDetails').value || '').trim();
    const paymentOption = document.getElementById('paymentOption').value;
    const downPaymentAmount = Math.max(0, parseFloat(document.getElementById('downPaymentAmount').value || '0') || 0);
    
    // Validation
    if (!facilityId || !eventDate || !eventEndDate || !startTime || !endTime || !eventType || !expectedGuests) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    if (clientName.length < 3) {
        showToast('Client/Resident name is required', 'warning');
        return;
    }
    
    if (new Date(eventEndDate) < new Date(eventDate)) {
        showToast('End date cannot be before start date', 'warning');
        return;
    }

    // Handle overnight reservation if same day but end time is earlier/equal.
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (eventEndDate === eventDate && startMin != null && endMin != null && endMin <= startMin) {
        eventEndDate = addDaysIso(eventDate, 1);
        const endDateInput = document.getElementById('eventEndDate');
        if (endDateInput) endDateInput.value = eventEndDate;
    }

    const startDtCheck = new Date(`${eventDate}T${startTime}`);
    const endDtCheck = new Date(`${eventEndDate}T${endTime}`);
    if (endDtCheck <= startDtCheck) {
        showToast('End time must be after start time', 'warning');
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
    if (!/^[A-Za-z\s.'-]+$/.test(contactPerson)) {
        showToast('Contact person should contain letters only', 'warning');
        return;
    }
    if (!/^\d{7,15}$/.test(contactPhone)) {
        showToast('Contact phone should contain numbers only (7-15 digits)', 'warning');
        return;
    }
    if (String(facility.name || '').toLowerCase() === 'medical room' && !medicalRoomDetails) {
        showToast('Please enter a specific room/need for Medical Room', 'warning');
        return;
    }
    if (paymentOption === 'down_payment' && downPaymentAmount <= 0) {
        showToast('Enter a valid down payment amount', 'warning');
        return;
    }
    
    // Check for conflicts with existing reservations
    // compute datetime ranges for new reservation
    const startDt = new Date(`${eventDate}T${startTime}`);
    const endDt = new Date(`${eventEndDate}T${endTime}`);

    const existingReservations = await window.api.getAllReservations();
    const hasConflict = existingReservations.some(r => {
        const status = String(r.status || '').toLowerCase();
        if (status !== 'pending' && status !== 'approved') return false;
        // compare loosely because facilityId may be string or number
        if (r.facilityId != facilityId) return false;

        // determine existing reservation range
        const rDateStart = r.eventDate || r.eventStartDate;
        const rDateEnd = r.eventEndDate || r.eventDate || r.eventStartDate;
        if (!rDateStart || !rDateEnd || !r.startTime || !r.endTime) return false;

        const rStart = new Date(`${rDateStart}T${r.startTime}`);
        const rEnd = new Date(`${rDateEnd}T${r.endTime}`);
        if (Number.isNaN(rStart.getTime()) || Number.isNaN(rEnd.getTime())) return false;

        // overlap if intervals intersect
        return !(endDt <= rStart || startDt >= rEnd);
    });
    
    if (hasConflict) {
        showToast('This facility is already reserved for the selected time', 'warning');
        return;
    }
    
    // compute total cost before submitting
    const durationHoursCalc = (endDtCheck - startDtCheck) / (1000 * 60 * 60);
    const totalCost = (facility.price * durationHoursCalc) + (chairsCount * CHAIR_RATE) + (electronicsCount * ELECTRONICS_RATE);

    // Create reservation via backend API if possible
    try {
        const reservation = await window.api.createReservation({
            username: clientName,
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
            chairsCount: chairsCount,
            electronicsCount: electronicsCount,
            medicalRoomDetails: medicalRoomDetails || null,
            paymentOption: paymentOption,
            downPaymentAmount: paymentOption === 'down_payment' ? downPaymentAmount : 0,
            totalCost: totalCost
        });

        showToast('Reservation submitted successfully! Awaiting approval.', 'success');
        
        setTimeout(() => {
            window.location.href = user.role === 'admin'
                ? 'admin-requests.php'
                : 'barangay-staff-requests.php';
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





