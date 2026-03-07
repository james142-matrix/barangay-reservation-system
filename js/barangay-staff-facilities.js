document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth('barangay_staff')) return;
    loadFacilitiesOverview().catch(err => {
        const container = document.getElementById('facilitiesContainer');
        if (container) {
            container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>Failed to load facilities</h3><p>${err.message || 'Unknown error'}</p></div>`;
        }
    });
});

let staffFacilities = [];
let reservationsByFacility = new Map();
let selectedFacility = null;

async function loadFacilitiesOverview() {
    const [facilities, reservations] = await Promise.all([
        window.api.getFacilities(),
        window.api.getAllReservations()
    ]);

    staffFacilities = Array.isArray(facilities) ? facilities : [];
    buildReservationSummary(Array.isArray(reservations) ? reservations : []);
    renderQuickStats();
    renderFacilityCards();
}

function buildReservationSummary(reservations) {
    reservationsByFacility = new Map();

    reservations.forEach(raw => {
        const facilityId = String(raw.facilityId ?? raw.facility_id ?? '');
        if (!facilityId) return;

        if (!reservationsByFacility.has(facilityId)) {
            reservationsByFacility.set(facilityId, { approved: 0, pending: 0, completed: 0 });
        }

        const row = reservationsByFacility.get(facilityId);
        const status = String(raw.status || '').toLowerCase();
        if (status === 'approved') row.approved += 1;
        if (status === 'pending') row.pending += 1;
        if (status === 'completed') row.completed += 1;
    });
}

function renderFacilityCards() {
    const container = document.getElementById('facilitiesContainer');
    if (!container) return;

    if (!staffFacilities.length) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="empty-state-icon">🏢</div>
                <h3>No Facilities Available</h3>
                <p>There are currently no facilities to display.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    staffFacilities.forEach(facility => {
        const card = createFacilityCard(facility);
        container.appendChild(card);
    });
}

function renderQuickStats() {
    const totalEl = document.getElementById('statTotalFacilities');
    const availableEl = document.getElementById('statAvailableFacilities');
    const unavailableEl = document.getElementById('statUnavailableFacilities');
    if (!totalEl || !availableEl || !unavailableEl) return;

    let available = 0;
    let unavailable = 0;
    staffFacilities.forEach((facility) => {
        const status = String(facility.status || 'available').toLowerCase();
        if (status === 'available') available += 1;
        else unavailable += 1;
    });

    totalEl.textContent = String(staffFacilities.length);
    availableEl.textContent = String(available);
    unavailableEl.textContent = String(unavailable);
}

function createFacilityCard(facility) {
    const card = document.createElement('div');
    card.className = 'facility-card staff-facility-card';

    const stats = reservationsByFacility.get(String(facility.id)) || { approved: 0, pending: 0, completed: 0 };
    const price = Number(facility.price || 0).toFixed(2);
    const status = String(facility.status || 'available').toLowerCase();
    const statusClass = status === 'available' ? 'is-available' : 'is-unavailable';
    const statusLabel = status === 'available' ? 'Available' : 'Unavailable';
    const eventTypes = Array.isArray(facility.eventTypes) ? facility.eventTypes.filter(Boolean).slice(0, 3) : [];
    const eventTypeHtml = eventTypes.length
        ? eventTypes.map(type => `<span class="staff-chip">${escapeHtml(type)}</span>`).join('')
        : '<span class="staff-chip">General Event</span>';
    const addOns = Array.isArray(facility.addOns)
        ? facility.addOns.filter(item => item && item.enabled !== false).slice(0, 3)
        : [];
    const addOnChipHtml = addOns.length
        ? addOns.map(item => `<span class="staff-chip">${escapeHtml(item.name || 'Add-on')}</span>`).join('')
        : '<span class="staff-chip">No Add-ons</span>';

    card.innerHTML = `
        <div class="facility-image staff-facility-image">
            <div class="staff-facility-icon">${facility.icon || '🏛️'}</div>
            <span class="staff-status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="facility-info">
            <h3>${facility.name || 'Unnamed Facility'}</h3>
            <p>${facility.description || 'No description provided.'}</p>
            <div class="staff-facility-meta">
                <span class="staff-pill">👥 ${facility.capacity || 0} capacity</span>
                <span class="staff-pill">₱${price} per event</span>
            </div>
            <div class="staff-chip-row">${eventTypeHtml}</div>
            <div class="staff-chip-row">${addOnChipHtml}</div>
            <div class="staff-facility-meta">
                <span class="staff-pill staff-pill-approved">✓ ${stats.approved} approved</span>
                <span class="staff-pill staff-pill-pending">⏳ ${stats.pending} pending</span>
            </div>
            <div class="staff-facility-meta">
                <span class="staff-pill staff-pill-completed">✔ ${stats.completed} completed</span>
                <span class="staff-pill">Total ${stats.approved + stats.pending + stats.completed}</span>
            </div>
            <button type="button" class="btn btn-primary staff-view-btn">View Details</button>
        </div>
    `;

    card.querySelector('.staff-view-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        openFacilityModal(facility, stats);
    });
    card.addEventListener('click', function() {
        openFacilityModal(facility, stats);
    });

    return card;
}

function openFacilityModal(facility, stats) {
    selectedFacility = facility;
    const modal = document.getElementById('facilityModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('facilityModalBody');
    if (!modal || !title || !body) return;

    title.textContent = facility.name || 'Facility Details';
    body.innerHTML = `
        <div style="text-align:center; margin-bottom: 12px;">
            <div style="font-size:54px;">${facility.icon || '🏛️'}</div>
        </div>
        <p style="margin-bottom:12px; color:#666;">${facility.description || 'No description provided.'}</p>
        <div class="form-row">
            <div class="form-group"><label>Capacity</label><div>${facility.capacity || 0} persons</div></div>
            <div class="form-group"><label>Price</label><div>₱${Number(facility.price || 0).toFixed(2)}</div></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Approved Reservations</label><div>${stats.approved}</div></div>
            <div class="form-group"><label>Pending Reservations</label><div>${stats.pending}</div></div>
        </div>
        <div class="form-group"><label>Status</label><div>${capitalize(String(facility.status || 'available'))}</div></div>
    `;

    modal.classList.add('show');
}

function closeFacilityModal() {
    const modal = document.getElementById('facilityModal');
    if (modal) modal.classList.remove('show');
    selectedFacility = null;
}

function capitalize(value) {
    const s = String(value || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('click', function(event) {
    const modal = document.getElementById('facilityModal');
    if (modal && event.target === modal) {
        closeFacilityModal();
    }
});
