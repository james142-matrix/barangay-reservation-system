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
let hasAttemptedSubmit = false;
const touchedFields = new Set();
const FEEDBACK_FIELDS = [
    'facility',
    'eventDate',
    'eventEndDate',
    'startTime',
    'endTime',
    'eventType',
    'expectedGuests',
    'purposeOfEvent',
    'clientName',
    'clientAddress',
    'clientEmail',
    'contactPhone',
    'medicalRoomDetails',
    'downPaymentAmount'
];
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

function formatDateForSummary(dateValue) {
    if (!dateValue) return '';
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateValue;
    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function normalizeBooleanFlag(value) {
    if (typeof value === 'boolean') return value;
    const lowered = String(value ?? '').trim().toLowerCase();
    return lowered === '1' || lowered === 'true' || lowered === 'yes';
}

function getFacilityRuleConfig(facility) {
    if (!facility) {
        return {
            openingTime: null,
            closingTime: null,
            allowsOvernight: false,
            allowsAllDay: false,
            allowsMultiDay: false,
            maxDurationHours: null
        };
    }
    const openingRaw = String(facility.openingTime || '').trim();
    const closingRaw = String(facility.closingTime || '').trim();
    const maxRaw = Number(facility.maxDurationHours);
    return {
        openingTime: openingRaw ? openingRaw.slice(0, 5) : null,
        closingTime: closingRaw ? closingRaw.slice(0, 5) : null,
        allowsOvernight: normalizeBooleanFlag(facility.allowsOvernight),
        allowsAllDay: normalizeBooleanFlag(facility.allowsAllDay),
        allowsMultiDay: normalizeBooleanFlag(facility.allowsMultiDay),
        maxDurationHours: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null
    };
}

function getFacilityRuleValidation(facility, eventDate, eventEndDate, startTime, endTime) {
    const errors = {};
    if (!facility || !eventDate || !eventEndDate || !startTime || !endTime) {
        return { errors, valid: true };
    }

    const rules = getFacilityRuleConfig(facility);
    const startDt = new Date(`${eventDate}T${startTime}`);
    const endDt = new Date(`${eventEndDate}T${endTime}`);
    if (Number.isNaN(startDt.getTime()) || Number.isNaN(endDt.getTime())) {
        return { errors, valid: true };
    }

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    const openingMin = parseTimeToMinutes(rules.openingTime);
    const closingMin = parseTimeToMinutes(rules.closingTime);

    if (!rules.allowsMultiDay && eventEndDate !== eventDate) {
        errors.eventEndDate = 'This facility does not allow multi-day reservation.';
    }

    if (endDt <= startDt) {
        errors.endTime = 'End time must be later than start time';
    }

    if (!rules.allowsOvernight && startMin != null && endMin != null && endMin <= startMin) {
        errors.endTime = 'This facility does not allow overnight use.';
    }

    const durationHours = (endDt - startDt) / (1000 * 60 * 60);
    if (!rules.allowsAllDay && durationHours >= 24) {
        errors.endTime = 'This facility does not allow all-day reservation.';
    }
    if (rules.maxDurationHours != null && durationHours > rules.maxDurationHours) {
        errors.endTime = 'This booking exceeds the maximum allowed duration for this facility.';
    }

    if (openingMin != null && closingMin != null && startMin != null && endMin != null) {
        if (startMin < openingMin || startMin > closingMin || endMin < openingMin || endMin > closingMin) {
            errors.startTime = 'Reservation must be within facility operating hours.';
            errors.endTime = 'Reservation must be within facility operating hours.';
        }
    }

    return { errors, valid: Object.keys(errors).length === 0 };
}

function renderFacilityRules(facility) {
    const box = document.getElementById('facilityRulesBox');
    const list = document.getElementById('facilityRulesList');
    const hint = document.getElementById('facilityRulesHint');
    const eventEndDateInput = document.getElementById('eventEndDate');
    const eventDateInput = document.getElementById('eventDate');
    const endDateHelper = document.getElementById('eventEndDateHelper');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    if (!box || !list || !hint) return;

    if (!facility) {
        box.style.display = 'none';
        list.innerHTML = '';
        hint.textContent = '';
        if (eventEndDateInput) eventEndDateInput.disabled = false;
        if (startTimeInput) {
            startTimeInput.removeAttribute('min');
            startTimeInput.removeAttribute('max');
        }
        if (endTimeInput) {
            endTimeInput.removeAttribute('min');
            endTimeInput.removeAttribute('max');
        }
        if (endDateHelper) endDateHelper.textContent = 'For multi-day reservation, set a later end date.';
        return;
    }

    const rules = getFacilityRuleConfig(facility);
    const lines = [
        `Open: ${rules.openingTime ? formatTime12Hour(rules.openingTime) : 'No set hours'}`,
        `Close: ${rules.closingTime ? formatTime12Hour(rules.closingTime) : 'No set hours'}`,
        `Overnight Use: ${rules.allowsOvernight ? 'Allowed' : 'Not Allowed'}`,
        `All-Day Use: ${rules.allowsAllDay ? 'Allowed' : 'Not Allowed'}`,
        `Multi-Day Reservation: ${rules.allowsMultiDay ? 'Allowed' : 'Not Allowed'}`,
        `Maximum Duration: ${rules.maxDurationHours != null ? `${rules.maxDurationHours} hour(s)` : 'No max limit'}`
    ];
    list.innerHTML = lines.map(line => `<li>${escapeHtml(line)}</li>`).join('');
    hint.textContent = rules.allowsMultiDay
        ? 'End date can be later than start date when other rules are satisfied.'
        : 'End date is locked to start date because multi-day reservation is not allowed.';
    box.style.display = 'block';

    if (eventEndDateInput && eventDateInput) {
        if (!rules.allowsMultiDay) {
            eventEndDateInput.disabled = true;
            if (eventDateInput.value) {
                eventEndDateInput.value = eventDateInput.value;
            }
            if (endDateHelper) endDateHelper.textContent = 'Multi-day reservation is not allowed for this facility.';
        } else {
            eventEndDateInput.disabled = false;
            if (endDateHelper) endDateHelper.textContent = 'For multi-day reservation, set a later end date.';
        }
    }

    if (startTimeInput) {
        if (rules.openingTime) startTimeInput.min = rules.openingTime;
        else startTimeInput.removeAttribute('min');
        if (rules.closingTime) startTimeInput.max = rules.closingTime;
        else startTimeInput.removeAttribute('max');
    }
    if (endTimeInput) {
        if (rules.openingTime) endTimeInput.min = rules.openingTime;
        else endTimeInput.removeAttribute('min');
        if (rules.closingTime) endTimeInput.max = rules.closingTime;
        else endTimeInput.removeAttribute('max');
    }
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
    const eventTypeInput = document.getElementById('eventType');
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const eventDateInput = document.getElementById('eventDate');
    const endDateInput = document.getElementById('eventEndDate');
    const paymentOptionInput = document.getElementById('paymentOption');
    const downPaymentInput = document.getElementById('downPaymentAmount');
    const clientNameInput = document.getElementById('clientName');
    const clientAddressInput = document.getElementById('clientAddress');
    const purposeInput = document.getElementById('purposeOfEvent');
    const clientEmailInput = document.getElementById('clientEmail');
    const contactPhoneInput = document.getElementById('contactPhone');
    const addOnsContainer = document.getElementById('facilityAddOnsContainer');
    
    facilitySelect.addEventListener('change', updateFacilityPrice);
    if (eventTypeInput) {
        eventTypeInput.addEventListener('change', function() {
            togglePurposeOfEventInput();
            const result = validateReservationBasics();
            applyReservationFeedback(result.errors);
        });
    }
    startTimeInput.addEventListener('change', function() {
        calculateCost();
    });
    endTimeInput.addEventListener('change', function() {
        calculateCost();
    });
    startTimeInput.addEventListener('input', updateTimeDisplays);
    endTimeInput.addEventListener('input', updateTimeDisplays);
    paymentOptionInput.addEventListener('change', toggleDownPaymentInput);
    if (downPaymentInput) {
        downPaymentInput.addEventListener('input', function() {
            const parsed = parseFloat(String(this.value || '0'));
            if (!Number.isFinite(parsed) || parsed < 0) {
                this.value = '0';
            }
            calculateCost();
            const result = validateReservationBasics();
            applyReservationFeedback(result.errors);
        });
        downPaymentInput.addEventListener('change', function() {
            const parsed = Math.max(0, parseFloat(String(this.value || '0')) || 0);
            this.value = parsed.toFixed(2).replace(/\.00$/, '');
            calculateCost();
            const result = validateReservationBasics();
            applyReservationFeedback(result.errors);
        });
    }
    if (clientNameInput) {
        clientNameInput.addEventListener('input', function() {
            this.value = sanitizeNameInput(this.value);
        });
    }
    if (purposeInput) {
        purposeInput.addEventListener('input', function() {
            this.value = String(this.value || '').replace(/[<>]/g, '');
        });
    }
    if (clientAddressInput) {
        clientAddressInput.addEventListener('input', function() {
            this.value = String(this.value || '').replace(/[<>]/g, '');
        });
    }
    if (clientEmailInput) {
        clientEmailInput.addEventListener('input', function() {
            this.value = String(this.value || '').trim();
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
    FEEDBACK_FIELDS.forEach((fieldId) => {
        const el = document.getElementById(fieldId);
        if (!el) return;
        const evt = (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'time') ? 'change' : 'input';
        el.addEventListener(evt, function() {
            touchedFields.add(fieldId);
            const result = validateReservationBasics();
            applyReservationFeedback(result.errors);
        });
    });
    
    if (eventDateInput) {
        eventDateInput.addEventListener('change', function() {
            if (endDateInput && (!endDateInput.value || endDateInput.disabled)) {
                endDateInput.value = this.value;
            }
            if (endDateInput) {
                endDateInput.min = this.value;
                if (endDateInput.value && endDateInput.value < this.value) {
                    endDateInput.value = this.value;
                }
            }
            const currentFacility = getFacilityFromCache(document.getElementById('facility')?.value || '');
            renderFacilityRules(currentFacility);
            calculateCost();
        });
        eventDateInput.min = toIsoDate(new Date());
    }
    if (endDateInput) {
        endDateInput.addEventListener('change', function() {
            calculateCost();
        });
    }

    toggleDownPaymentInput();
    togglePurposeOfEventInput();
    updateTimeDisplays();
    applyReservationFeedback({});
}

function sanitizeNameInput(value) {
    // Allow letters, spaces, apostrophe, dot, and hyphen.
    return String(value || '').replace(/[^A-Za-z\s.'-]/g, '');
}

function sanitizePhoneInput(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 12);
}

function sanitizeIntegerInput(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits === '') return '';
    return String(parseInt(digits, 10));
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
    const downPaymentInput = document.getElementById('downPaymentAmount');
    if (!downPaymentGroup) return;
    const isDownPayment = paymentOption === 'down_payment';
    downPaymentGroup.style.display = isDownPayment ? 'block' : 'none';
    if (downPaymentInput) {
        downPaymentInput.disabled = !isDownPayment;
        if (!isDownPayment) downPaymentInput.value = '0';
    }
    calculateCost();
    const result = validateReservationBasics();
    applyReservationFeedback(result.errors);
}

function togglePurposeOfEventInput() {
    const eventTypeInput = document.getElementById('eventType');
    const purposeGroup = document.getElementById('purposeOfEventGroup');
    const purposeInput = document.getElementById('purposeOfEvent');
    if (!eventTypeInput || !purposeGroup || !purposeInput) return;

    const isOther = String(eventTypeInput.value || '').trim().toLowerCase() === 'other';
    purposeGroup.style.display = isOther ? 'block' : 'none';
    purposeInput.required = isOther;

    if (!isOther) {
        purposeInput.value = '';
    }
}

function updateFacilityPrice() {
    const facilityId = document.getElementById('facility').value;
    const summaryFacility = document.getElementById('summaryFacility');
    if (!facilityId) {
        document.getElementById('facilityPrice').textContent = '₱0';
        document.getElementById('totalCost').textContent = '₱0';
        const reservationFeeInput = document.getElementById('reservationFee');
        const amountToPayInput = document.getElementById('amountToPay');
        if (reservationFeeInput) reservationFeeInput.value = '₱0';
        if (amountToPayInput) amountToPayInput.value = '₱0';
        populateEventTypeOptions(null);
        togglePurposeOfEventInput();
        renderFacilityAddOns(null);
        renderFacilityRules(null);
        const medicalRoomGroup = document.getElementById('medicalRoomDetailsGroup');
        if (medicalRoomGroup) medicalRoomGroup.style.display = 'none';
        if (summaryFacility) summaryFacility.textContent = 'Not selected';
        updateSummaryGuide();
        return;
    }
    
    const facility = getFacilityFromCache(facilityId);
    const facilityPrice = facility ? Number(facility.price || 0) : 0;
    if (facility) {
        document.getElementById('facilityPrice').textContent = `₱${facilityPrice}`;
        if (summaryFacility) summaryFacility.textContent = `${facility.name} (₱${facilityPrice.toFixed(2)})`;
        const reservationFeeInput = document.getElementById('reservationFee');
        if (reservationFeeInput) reservationFeeInput.value = `₱${facilityPrice.toFixed(2)}`;
        populateEventTypeOptions(facility);
        togglePurposeOfEventInput();
        renderFacilityAddOns(facility);
        renderFacilityRules(facility);
        const medicalRoomGroup = document.getElementById('medicalRoomDetailsGroup');
        if (medicalRoomGroup) {
            medicalRoomGroup.style.display = String(facility.name || '').toLowerCase() === 'medical room' ? 'block' : 'none';
        }
        calculateCost();
    }
}

function updateSummaryGuide() {
    const facility = getFacilityFromCache(document.getElementById('facility')?.value || '');
    const startDate = String(document.getElementById('eventDate')?.value || '').trim();
    const endDate = String(document.getElementById('eventEndDate')?.value || '').trim();
    const startTime = String(document.getElementById('startTime')?.value || '').trim();
    const endTime = String(document.getElementById('endTime')?.value || '').trim();
    const summaryGuide = document.getElementById('summaryGuide');
    const summarySchedule = document.getElementById('summarySchedule');

    if (summarySchedule) {
        if (startDate && endDate && startTime && endTime) {
            const startLabel = `${formatDateForSummary(startDate)} ${formatTime12Hour(startTime)}`;
            const endLabel = `${formatDateForSummary(endDate)} ${formatTime12Hour(endTime)}`;
            summarySchedule.textContent = startDate === endDate
                ? `${formatDateForSummary(startDate)} • ${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`
                : `${startLabel} → ${endLabel}`;
        } else {
            summarySchedule.textContent = 'No date and time selected yet';
        }
    }

    if (!summaryGuide) return;

    if (!facility) {
        summaryGuide.innerHTML = '<strong>Next step:</strong> Select a facility, event date, and time range to calculate the reservation fee.';
        return;
    }

    if (!startDate || !endDate || !startTime || !endTime) {
        summaryGuide.innerHTML = '<strong>Almost there:</strong> Choose the reservation date and time to preview duration, fee, and amount to pay.';
        return;
    }

    summaryGuide.innerHTML = '<strong>Ready:</strong> Review the computed fee and payment amount, then submit the reservation request when all details are correct.';
}

function calculateCost() {
    const facilityId = document.getElementById('facility').value;
    const startDate = document.getElementById('eventDate').value;
    const endDate = document.getElementById('eventEndDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const selectedAddOns = getSelectedFacilityAddOns();
    const paymentOption = String(document.getElementById('paymentOption')?.value || 'full');
    const downPaymentAmount = Math.max(0, parseFloat(String(document.getElementById('downPaymentAmount')?.value || '0')) || 0);
    
    if (!facilityId || !startDate || !endDate || !startTime || !endTime) {
        document.getElementById('totalCost').textContent = '₱0';
        document.getElementById('duration').textContent = '-';
        const amountToPayInput = document.getElementById('amountToPay');
        if (amountToPayInput) amountToPayInput.value = '₱0';
        updateSummaryGuide();
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
    const reservationFeeInput = document.getElementById('reservationFee');
    if (reservationFeeInput) reservationFeeInput.value = `₱${totalCost.toFixed(2)}`;
    const amountToPayInput = document.getElementById('amountToPay');
    if (amountToPayInput) {
        const amountToPay = paymentOption === 'down_payment' ? Math.min(downPaymentAmount, totalCost) : totalCost;
        amountToPayInput.value = `₱${Math.max(0, amountToPay).toFixed(2)}`;
    }
    updateSummaryGuide();
}

function getFieldFeedbackElement(inputEl) {
    if (!inputEl || !inputEl.parentElement) return null;
    let feedback = inputEl.parentElement.querySelector('.field-feedback');
    if (!feedback) {
        feedback = document.createElement('small');
        feedback.className = 'field-feedback';
        feedback.setAttribute('aria-live', 'polite');
        inputEl.parentElement.appendChild(feedback);
    }
    return feedback;
}

function setFieldFeedback(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const feedback = getFieldFeedbackElement(input);
    const text = String(message || '').trim();
    if (text) {
        input.classList.remove('ux-input-ok');
        input.classList.add('ux-input-error');
        if (feedback) feedback.textContent = text;
    } else {
        input.classList.remove('ux-input-error');
        const hasValue = input.type === 'checkbox' ? !!input.checked : String(input.value || '').trim() !== '';
        if (hasValue) {
            input.classList.add('ux-input-ok');
        } else {
            input.classList.remove('ux-input-ok');
        }
        if (feedback) feedback.textContent = '';
    }
}

function applyReservationFeedback(errors) {
    const map = errors || {};
    const showAll = hasAttemptedSubmit;
    FEEDBACK_FIELDS.forEach((fieldId) => {
        const shouldShow = showAll || touchedFields.has(fieldId);
        setFieldFeedback(fieldId, shouldShow ? (map[fieldId] || '') : '');
    });
}

function validateReservationBasics() {
    const errors = {};
    const facilityId = String(document.getElementById('facility')?.value || '').trim();
    const eventDate = String(document.getElementById('eventDate')?.value || '').trim();
    const eventEndDate = String(document.getElementById('eventEndDate')?.value || '').trim();
    const startTime = String(document.getElementById('startTime')?.value || '').trim();
    const endTime = String(document.getElementById('endTime')?.value || '').trim();
    const eventType = String(document.getElementById('eventType')?.value || '').trim();
    const expectedGuestsRaw = String(document.getElementById('expectedGuests')?.value || '').trim();
    const purposeOfEvent = String(document.getElementById('purposeOfEvent')?.value || '').trim();
    const clientName = String(document.getElementById('clientName')?.value || '').trim();
    const clientAddress = String(document.getElementById('clientAddress')?.value || '').trim();
    const clientEmail = String(document.getElementById('clientEmail')?.value || '').trim();
    const contactPhone = String(document.getElementById('contactPhone')?.value || '').trim();
    const paymentOption = String(document.getElementById('paymentOption')?.value || 'full').trim();
    const downPaymentAmount = Math.max(0, parseFloat(String(document.getElementById('downPaymentAmount')?.value || '0')) || 0);
    const medicalRoomDetails = String(document.getElementById('medicalRoomDetails')?.value || '').trim();
    const facility = facilityId ? getFacilityFromCache(facilityId) : null;
    const totalCostRaw = String(document.getElementById('totalCost')?.textContent || '₱0');
    const reservationFee = Math.max(0, parseFloat(totalCostRaw.replace(/[^0-9.]/g, '')) || 0);

    if (!facilityId) errors.facility = 'Please choose a facility';
    if (!eventDate) errors.eventDate = 'Start date is required';
    if (!eventEndDate) errors.eventEndDate = 'End date is required';
    if (eventDate && eventEndDate && new Date(eventEndDate) < new Date(eventDate)) {
        errors.eventEndDate = 'End date cannot be before start date';
    }
    if (!startTime) errors.startTime = 'Start time is required';
    if (!endTime) errors.endTime = 'End time is required';
    if (eventDate && eventEndDate && startTime && endTime) {
        const startDt = new Date(`${eventDate}T${startTime}`);
        const endDt = new Date(`${eventEndDate}T${endTime}`);
        if (endDt <= startDt) {
            errors.endTime = 'End time must be later than start time';
        }
        const ruleResult = getFacilityRuleValidation(facility, eventDate, eventEndDate, startTime, endTime);
        Object.assign(errors, ruleResult.errors);
    }
    if (!eventType) errors.eventType = 'Please select event type';
    if (eventType.toLowerCase() === 'other') {
        if (purposeOfEvent.length < 3) {
            errors.purposeOfEvent = 'Please specify the event purpose for Other';
        }
    } else if (purposeOfEvent !== '' && purposeOfEvent.length < 3) {
        errors.purposeOfEvent = 'If provided, enter at least 3 characters';
    }
    const expectedGuests = parseInt(expectedGuestsRaw, 10);
    if (!expectedGuestsRaw || !Number.isFinite(expectedGuests) || expectedGuests < 1) {
        errors.expectedGuests = 'Participants must be at least 1';
    } else if (facility && expectedGuests > Number(facility.capacity || 0)) {
        errors.expectedGuests = `Max ${facility.capacity} for this facility`;
    }
    if (clientName.length < 3 || !/^[A-Za-z\s.'-]+$/.test(clientName)) {
        errors.clientName = 'Enter a valid client name';
    }
    if (clientAddress.length < 8 || !/[A-Za-z]/.test(clientAddress)) {
        errors.clientAddress = 'Enter a complete address with barangay/city details';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        errors.clientEmail = 'Enter a valid email';
    }
    if (!/^(?:09\d{9}|639\d{9})$/.test(contactPhone)) {
        errors.contactPhone = 'Use a valid PH mobile number';
    }
    if (facility && String(facility.name || '').toLowerCase() === 'medical room' && !medicalRoomDetails) {
        errors.medicalRoomDetails = 'Please specify room/need';
    }
    if (paymentOption === 'down_payment' && downPaymentAmount <= 0) {
        errors.downPaymentAmount = 'Down payment must be greater than 0';
    }
    if (paymentOption === 'down_payment' && reservationFee > 0 && downPaymentAmount > reservationFee) {
        errors.downPaymentAmount = 'Down payment cannot be more than reservation fee';
    }

    const firstField = FEEDBACK_FIELDS.find((id) => !!errors[id]) || null;
    return { ok: firstField === null, errors, firstField };
}

async function submitReservation(event) {
    event.preventDefault();
    hasAttemptedSubmit = true;
    
    const user = getLoggedInUser();
    if (!user || (user.role !== 'admin' && user.role !== 'barangay_staff')) {
        showToast('Only staff/admin can submit reservations from this page.', 'danger');
        return;
    }
    const basicValidation = validateReservationBasics();
    applyReservationFeedback(basicValidation.errors);
    if (!basicValidation.ok) {
        if (basicValidation.firstField) {
            const firstEl = document.getElementById(basicValidation.firstField);
            if (firstEl && typeof firstEl.focus === 'function') firstEl.focus();
            showToast(basicValidation.errors[basicValidation.firstField], 'warning');
        } else {
            showToast('Please review the highlighted fields', 'warning');
        }
        return;
    }

    const facilityId = document.getElementById('facility').value;
    const eventDate = document.getElementById('eventDate').value; // start date
    const eventEndDate = document.getElementById('eventEndDate').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const eventType = document.getElementById('eventType').value;
    const expectedGuests = parseInt(document.getElementById('expectedGuests').value);
    const purposeOfEvent = (document.getElementById('purposeOfEvent').value || '').trim();
    const additionalNotes = document.getElementById('eventDescription').value || '';
    const clientName = document.getElementById('clientName').value.trim();
    const clientAddress = document.getElementById('clientAddress').value.trim();
    const organization = (document.getElementById('organization')?.value || '').trim();
    const clientEmail = document.getElementById('clientEmail').value.trim();
    const contactPhone = document.getElementById('contactPhone').value.trim();
    const contactPerson = clientName;
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
        showToast('Reservation end date cannot be before start date', 'warning');
        return;
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
    const ruleResult = getFacilityRuleValidation(facility, eventDate, eventEndDate, startTime, endTime);
    if (!ruleResult.valid) {
        const firstMessage = Object.values(ruleResult.errors)[0] || 'Please adjust reservation schedule based on facility rules.';
        showToast(firstMessage, 'warning');
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
    if (!/^(?:09\d{9}|639\d{9})$/.test(contactPhone)) {
        showToast('Please enter a valid PH mobile number', 'warning');
        return;
    }
    if (clientAddress.length < 8 || !/[A-Za-z]/.test(clientAddress)) {
        showToast('Please enter a complete address with barangay/city details', 'warning');
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
        if (status !== 'pending' && status !== 'billing') return false;
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
    
    const eventDescriptionParts = [
        purposeOfEvent ? `Purpose of Event: ${purposeOfEvent}` : '',
        clientAddress ? `Client Address: ${clientAddress}` : '',
        organization ? `Organization: ${organization}` : '',
        additionalNotes ? `Additional Notes: ${additionalNotes}` : ''
    ].filter(Boolean);
    const eventDescription = eventDescriptionParts.join('\n');

    // compute total cost before submitting
    const durationHoursCalc = (endDtCheck - startDtCheck) / (1000 * 60 * 60);
    const addOnCost = selectedAddOns.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalCost = (facility.price * durationHoursCalc) + addOnCost;
    if (paymentOption === 'down_payment' && downPaymentAmount > totalCost) {
        showToast('Down payment cannot be more than reservation fee', 'warning');
        return;
    }

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
            clientAddress: clientAddress,
            organization: organization,
            addOns: selectedAddOns.map(item => ({ id: item.id, qty: item.qty })),
            medicalRoomDetails: medicalRoomDetails || null,
            paymentOption: paymentOption,
            downPaymentAmount: paymentOption === 'down_payment' ? downPaymentAmount : 0,
            totalCost: totalCost
        });

        showToast('Reservation submitted successfully.', 'success');
        
        setTimeout(() => {
            window.location.href = user.role === 'admin'
                ? 'admin-requests.php'
                : 'barangay-staff-requests.php';
        }, 2000);
    } catch (error) {
        showToast('Error creating reservation: ' + error.message, 'danger');
    }
}
