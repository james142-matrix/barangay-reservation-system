// Initialize reservation page
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    const user = getLoggedInUser();
    if (!user || (user.role !== 'admin' && user.role !== 'barangay_staff')) {
        window.location.href = 'index.php?v=20260303b';
        return;
    }
    configureNavigation(user.role);
    try {
        await loadFacilitiesDropdown();
    } catch (e) {
        console.error('Error loading facilities', e);
    }
    setupEventListeners();
});

let facilitiesCache = [];
const DEFAULT_EVENT_TYPES = [
    'Birthday Party',
    'Wedding',
    'Conference',
    'Community Event',
    'Sports Activity',
    'Training/Workshop',
    'Other'
];

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
    const rawFacilities = Array.isArray(facilities) ? facilities : [];
    facilitiesCache = rawFacilities.filter(f => String(f.status || 'available').toLowerCase() === 'available');

    console.log('facilities received for dropdown', facilities);

    if (facilitiesCache.length === 0) {
        select.innerHTML += '<option disabled value="">(no facilities available)</option>';
        // show a warning so the client understands the problem
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
            return;
        }
        if (typeof showToast === 'function') {
            showToast('Selected facility is unavailable for reservation.', 'warning');
        }
    }
    populateEventTypeOptions(null);
}

function getFacilityFromCache(facilityId) {
    return facilitiesCache.find(f => String(f.id) === String(facilityId)) || null;
}

function getDefaultEventTypesForFacility(facilityName) {
    const name = String(facilityName || '').trim().toLowerCase();
    if (name === 'medical room') return ['Consultation', 'Checkup', 'Vaccination', 'First Aid', 'Other'];
    if (name === 'sports complex') return ['Basketball', 'Volleyball', 'Badminton', 'Training', 'Other'];
    if (name === 'library & learning center') return ['Study Session', 'Reading Program', 'Workshop', 'Seminar', 'Other'];
    if (name === 'community hall') return ['Birthday Party', 'Wedding', 'Conference', 'Community Event', 'Other'];
    if (name === 'cultural center') return ['Cultural Show', 'Workshop', 'Training', 'Community Event', 'Other'];
    if (name === 'garden event space') return ['Wedding', 'Birthday Party', 'Reception', 'Community Event', 'Other'];
    return [...DEFAULT_EVENT_TYPES];
}

function normalizeFacilityEventTypes(raw, facilityName) {
    let list = [];
    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            list = Array.isArray(parsed) ? parsed : raw.split(/\r?\n|,/);
        } catch {
            list = raw.split(/\r?\n|,/);
        }
    }

    const clean = [];
    list.forEach(item => {
        const value = String(item || '').trim();
        if (!value) return;
        if (!clean.includes(value)) clean.push(value);
    });

    if (clean.length) return clean;
    if (Array.isArray(raw)) return [];
    if (typeof raw === 'string' && raw.trim() !== '') return [];
    return getDefaultEventTypesForFacility(facilityName);
}

function getEventTypesForFacility(facility) {
    if (!facility) return [];
    return normalizeFacilityEventTypes(facility.eventTypes, facility.name);
}

function normalizeFacilityAddOns(raw) {
    let list = [];
    if (Array.isArray(raw)) {
        list = raw;
    } else if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) list = parsed;
        } catch {
            list = [];
        }
    }
    const clean = [];
    list.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        const id = String(item.id || `addon_${index + 1}`).trim() || `addon_${index + 1}`;
        const name = String(item.name || '').trim();
        const unit = String(item.unit || 'item').trim() || 'item';
        const price = Math.max(0, Number(item.price || 0));
        const enabled = !Object.prototype.hasOwnProperty.call(item, 'enabled') ? true : !!item.enabled;
        if (!name || !enabled) return;
        clean.push({ id, name, unit, price: Number(price.toFixed(2)), enabled });
    });
    return clean;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function populateEventTypeOptions(facility) {
    const eventTypeSelect = document.getElementById('eventType');
    if (!eventTypeSelect) return;

    const currentValue = eventTypeSelect.value;
    eventTypeSelect.innerHTML = '';

    if (!facility) {
        eventTypeSelect.innerHTML = '<option value="">-- Select Facility First --</option>';
        return;
    }

    const eventTypes = getEventTypesForFacility(facility);
    eventTypeSelect.innerHTML = '<option value="">-- Select Event Type --</option>';
    eventTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        eventTypeSelect.appendChild(option);
    });

    if (currentValue && eventTypes.includes(currentValue)) {
        eventTypeSelect.value = currentValue;
    } else {
        eventTypeSelect.value = '';
    }
}

function renderFacilityAddOns(facility) {
    const group = document.getElementById('facilityAddOnsGroup');
    const container = document.getElementById('facilityAddOnsContainer');
    if (!group || !container) return;

    if (!facility) {
        group.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const addOns = normalizeFacilityAddOns(facility.addOns);
    if (!addOns.length) {
        group.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    group.style.display = 'block';
    container.innerHTML = addOns.map(addOn => `
        <div class="form-row facility-addon-row">
            <div class="form-group">
                <label>${escapeHtml(addOn.name)} (${escapeHtml(addOn.unit)})</label>
                <small style="color:#777;">₱${Number(addOn.price).toFixed(2)} per ${escapeHtml(addOn.unit)}</small>
            </div>
            <div class="form-group">
                <label for="addonQty_${escapeHtml(addOn.id)}">Quantity</label>
                <input
                    type="number"
                    id="addonQty_${escapeHtml(addOn.id)}"
                    class="facility-addon-qty"
                    data-addon-id="${escapeHtml(addOn.id)}"
                    data-addon-name="${escapeHtml(addOn.name)}"
                    data-addon-unit="${escapeHtml(addOn.unit)}"
                    data-addon-price="${Number(addOn.price).toFixed(2)}"
                    min="0"
                    step="1"
                    value="0">
            </div>
        </div>
    `).join('');
}

function getSelectedFacilityAddOns() {
    const container = document.getElementById('facilityAddOnsContainer');
    if (!container) return [];
    const inputs = container.querySelectorAll('.facility-addon-qty');
    const selected = [];
    inputs.forEach(input => {
        const qty = Math.max(0, parseInt(input.value || '0', 10) || 0);
        if (qty <= 0) return;
        selected.push({
            id: String(input.dataset.addonId || ''),
            name: String(input.dataset.addonName || ''),
            unit: String(input.dataset.addonUnit || 'item'),
            price: Math.max(0, Number(input.dataset.addonPrice || 0)),
            qty
        });
    });
    return selected.filter(item => item.id);
}

function setupEventListeners() {
    const facilitySelect = document.getElementById('facility');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const startDateInput = document.getElementById('eventDate');
    const endDateInput = document.getElementById('eventEndDate');
    const paymentOptionInput = document.getElementById('paymentOption');
    const clientNameInput = document.getElementById('clientName');
    const clientEmailInput = document.getElementById('clientEmail');
    const contactPersonInput = document.getElementById('contactPerson');
    const contactPhoneInput = document.getElementById('contactPhone');
    const addOnsContainer = document.getElementById('facilityAddOnsContainer');
    
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
    paymentOptionInput.addEventListener('change', toggleDownPaymentInput);
    if (clientNameInput) {
        clientNameInput.addEventListener('input', function() {
            this.value = sanitizeNameInput(this.value);
        });
    }
    if (clientEmailInput) {
        clientEmailInput.addEventListener('input', function() {
            this.value = String(this.value || '').trim();
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
    if (addOnsContainer) {
        addOnsContainer.addEventListener('input', function(event) {
            const target = event.target;
            if (!target || !target.classList || !target.classList.contains('facility-addon-qty')) return;
            target.value = sanitizeIntegerInput(target.value);
            calculateCost();
        });
        addOnsContainer.addEventListener('change', function(event) {
            const target = event.target;
            if (!target || !target.classList || !target.classList.contains('facility-addon-qty')) return;
            if (target.value === '') target.value = '0';
            calculateCost();
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
    const archive = document.getElementById('nav-archive');
    const archiveItem = document.getElementById('nav-archive-item');
    const cancelLink = document.getElementById('cancelLink');

    const links = isAdmin
        ? {
            dashboard: 'admin-dashboard.php',
            requests: 'admin-requests.php',
            billing: 'admin-billing.php',
            facilities: 'admin-facilities.php',
            users: 'admin-users.php',
            reports: 'reports.php',
            archive: 'admin-archive.php'
        }
        : {
            dashboard: 'barangay-staff-dashboard.php',
            requests: 'barangay-staff-requests.php',
            billing: 'barangay-staff-billing.php',
            facilities: 'barangay-staff-facilities.php',
            users: '',
            reports: '',
            archive: ''
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
    if (archive && archiveItem) {
        archive.href = links.archive;
        archiveItem.style.display = isAdmin ? '' : 'none';
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
        populateEventTypeOptions(null);
        renderFacilityAddOns(null);
        const medicalRoomGroup = document.getElementById('medicalRoomDetailsGroup');
        if (medicalRoomGroup) medicalRoomGroup.style.display = 'none';
        return;
    }
    
    const facility = getFacilityFromCache(facilityId);
    const facilityPrice = facility ? Number(facility.price || 0) : 0;
    if (facility) {
        document.getElementById('facilityPrice').textContent = `₱${facilityPrice}`;
        populateEventTypeOptions(facility);
        renderFacilityAddOns(facility);
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
    const selectedAddOns = getSelectedFacilityAddOns();
    
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
    const addOnCost = selectedAddOns.reduce((sum, item) => sum + (item.price * item.qty), 0);
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
    const clientEmail = document.getElementById('clientEmail').value.trim();
    const contactPerson = document.getElementById('contactPerson').value.trim();
    const contactPhone = document.getElementById('contactPhone').value.trim();
    const selectedAddOns = getSelectedFacilityAddOns();
    const medicalRoomDetails = (document.getElementById('medicalRoomDetails').value || '').trim();
    const paymentOption = document.getElementById('paymentOption').value;
    const downPaymentAmount = Math.max(0, parseFloat(document.getElementById('downPaymentAmount').value || '0') || 0);
    
    // Validation
    if (!facilityId || !eventDate || !eventEndDate || !startTime || !endTime || !eventType || !expectedGuests) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    if (clientName.length < 3) {
        showToast('Client name is required', 'warning');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        showToast('Please enter a valid client email address', 'warning');
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
    if (String(facility.status || 'available').toLowerCase() !== 'available') {
        showToast('Selected facility is currently unavailable for reservation', 'warning');
        return;
    }
    const allowedEventTypes = getEventTypesForFacility(facility);
    if (eventType && !allowedEventTypes.includes(eventType)) {
        showToast('Selected event type is not allowed for this facility', 'warning');
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
    const addOnCost = selectedAddOns.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalCost = (facility.price * durationHoursCalc) + addOnCost;

    // Create reservation via backend API if possible
    try {
        const reservation = await window.api.createReservation({
            username: clientName,
            clientEmail: clientEmail,
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
            addOns: selectedAddOns.map(item => ({ id: item.id, qty: item.qty })),
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



