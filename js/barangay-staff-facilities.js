// Initialize barangay staff facilities page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth('barangay_staff');
    loadData().catch(err => {
        showToast('Failed to load facilities: ' + (err.message || 'Unknown error'), 'danger');
    });
});

let selectedFacility = null;
let facilitiesCache = [];
let reservationsCache = [];
let usersByUsername = new Map();

async function loadData() {
    const [facilities, reservations, users] = await Promise.all([
        window.api.getFacilities(),
        window.api.getAllReservations(),
        window.api.getUsers()
    ]);
    facilitiesCache = facilities || [];
    reservationsCache = (reservations || []).map(r => ({
        ...r,
        createdAt: r.createdAt || r.created_at || null
    }));
    usersByUsername = new Map((users || []).map(u => [u.username, u]));
    loadFacilities();
    loadTodayReservations();
}

function loadFacilities() {
    const container = document.getElementById('facilities-grid');
    
    if (facilitiesCache.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">🏢</div>
                <h3>No Facilities Available</h3>
                <p>There are currently no facilities in the system</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    facilitiesCache.forEach(facility => {
        const card = createFacilityCard(facility);
        container.appendChild(card);
    });
}

function createFacilityCard(facility) {
    const card = document.createElement('div');
    card.className = 'facility-card';
    
    // Count reservations for this facility
    const facilityReservations = reservationsCache.filter(r => String(r.facilityId) === String(facility.id));
    const approvedCount = facilityReservations.filter(r => r.status === 'approved').length;
    const pendingCount = facilityReservations.filter(r => r.status === 'pending').length;
    
    card.innerHTML = `
        <div class="facility-image">
            ${facility.icon}
        </div>
        <div class="facility-info">
            <h3>${facility.name}</h3>
            <p style="color: #666; font-size: 14px; margin: 8px 0;">${facility.description}</p>
            <div class="facility-details" style="margin: 10px 0; display: flex; gap: 10px; flex-wrap: wrap;">
                <small style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">👥 ${facility.capacity} capacity</small>
                <small style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">₱${facility.price} per event</small>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                <small style="background: #e8f5e9; padding: 4px 8px; border-radius: 4px; text-align: center;">✓ ${approvedCount} approved</small>
                <small style="background: #fff3e0; padding: 4px 8px; border-radius: 4px; text-align: center;">⏳ ${pendingCount} pending</small>
            </div>
            <button class="btn btn-primary" style="width: 100%;" onclick="showFacilityModal(event, '${facility.id}')">View Details</button>
        </div>
    `;
    
    return card;
}

function showFacilityModal(event, facilityId) {
    if (event) event.stopPropagation();
    
    const facility = facilitiesCache.find(f => String(f.id) === String(facilityId));
    if (!facility) return;
    
    selectedFacility = facility;
    const modal = document.getElementById('facilityModal');
    document.getElementById('modalTitle').textContent = facility.name;
    
    // Get reservations for this facility
    const facilityReservations = reservationsCache
        .filter(r => String(r.facilityId) === String(facility.id))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10); // Show last 10 reservations
    
    let reservationsList = '<h4 style="margin-top: 20px;">Recent Reservations</h4>';
    
    if (facilityReservations.length === 0) {
        reservationsList += '<p style="color: #999;">No reservations yet</p>';
    } else {
        reservationsList += '<table style="width: 100%; font-size: 13px;"><thead><tr><th>Date</th><th>Time</th><th>Resident</th><th>Status</th></tr></thead><tbody>';
        
        facilityReservations.forEach(r => {
            const resident = usersByUsername.get(r.username);
            const residentName = resident ? resident.fullname : r.username;
            const eventDate = formatDate(r.eventStartDate || r.eventDate).split(',')[0] +
                (r.eventEndDate && r.eventEndDate !== (r.eventStartDate || r.eventDate) ? ' → ' + formatDate(r.eventEndDate).split(',')[0] : '');
            const statusClass = r.status === 'pending' ? 'pending' : (r.status === 'approved' ? 'approved' : 'rejected');
            const statusBadge = `<span class="badge ${statusClass}">${r.status.toUpperCase()}</span>`;
            
            reservationsList += `<tr><td>${eventDate}</td><td>${r.startTime}-${r.endTime}</td><td>${residentName}</td><td>${statusBadge}</td></tr>`;
        });
        
        reservationsList += '</tbody></table>';
    }
    
    document.getElementById('facilityDetails').innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 64px; margin-bottom: 15px;">${facility.icon}</div>
            <h2>${facility.name}</h2>
            <p style="color: #666; margin-bottom: 20px;">${facility.description}</p>
        </div>
        
        <div style="background: #f5f7fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <p style="color: #888; font-size: 13px; margin: 0;">Capacity</p>
                    <p style="font-size: 20px; font-weight: bold; margin: 5px 0;">${facility.capacity} persons</p>
                </div>
                <div>
                    <p style="color: #888; font-size: 13px; margin: 0;">Price per Event</p>
                    <p style="font-size: 20px; font-weight: bold; margin: 5px 0;">₱${facility.price}</p>
                </div>
            </div>
        </div>
        
        ${reservationsList}
    `;
    
    modal.classList.add('show');
}

function closeFacilityModal() {
    document.getElementById('facilityModal').classList.remove('show');
}

function loadTodayReservations() {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter reservations for today
    const todayReservations = reservationsCache.filter(r => {
        const start = new Date((r.eventStartDate || r.eventDate) + 'T' + r.startTime);
        const endDate = r.eventEndDate || r.eventDate;
        const end = new Date(endDate + 'T' + r.endTime);
        const t = new Date(today + 'T00:00');
        // include if today is between start and end (inclusive start)
        return t >= start && t <= end;
    });
    
    const container = document.getElementById('today-reservations');
    
    if (todayReservations.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #999;">
                <p>No reservations scheduled for today</p>
            </div>
        `;
        return;
    }
    
    let html = '<table class="table"><thead><tr><th>Facility</th><th>Resident</th><th>Time</th><th>Status</th><th>Guests</th></tr></thead><tbody>';
    
    todayReservations.forEach(r => {
        const facility = facilitiesCache.find(f => String(f.id) === String(r.facilityId));
        const resident = usersByUsername.get(r.username);
        const statusClass = r.status === 'pending' ? 'pending' : (r.status === 'approved' ? 'approved' : 'rejected');
        
        html += `<tr>
            <td><strong>${facility ? facility.name : 'Unknown'}</strong></td>
            <td>${resident ? resident.fullname : r.username}</td>
            <td>${r.startTime} - ${r.endTime}</td>
            <td><span class="badge ${statusClass}">${r.status.toUpperCase()}</span></td>
            <td>${r.expectedGuests} guests</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('facilityModal');
    if (event.target === modal) {
        closeFacilityModal();
    }
});
