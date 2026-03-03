// Initialize admin facilities page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    loadFacilitiesList();
});

let currentFacilityId = null;
let currentFacilities = [];

async function loadFacilitiesList() {
    const container = document.getElementById('facilities-list');
    container.innerHTML = '<p style="padding:20px;color:#888;">Loading facilities…</p>';

    let facilities = [];
    try {
        facilities = await window.api.getFacilities();
    } catch (e) {
        console.error('Could not load facilities from API', e);
        container.innerHTML = '<p style="padding:20px;color:#dc2626;">Failed to load facilities from server.</p>';
        return;
    }
    currentFacilities = Array.isArray(facilities) ? facilities : [];

    if (currentFacilities.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">🏢</div>
                <h3>No Facilities Yet</h3>
                <p>Click "Add New Facility" to create your first facility.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Facility Name</th>
                    <th>Capacity</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    currentFacilities.forEach(facility => {
        const statusColor = facility.status === 'available' ? '#10b981' :
                          facility.status === 'maintenance' ? '#f59e0b' : '#ef4444';
        const price = parseFloat(facility.price) || 0;
        const icon = facility.icon || '🏛️';

        html += `
            <tr>
                <td><strong>${icon} ${facility.name}</strong></td>
                <td>${facility.capacity} persons</td>
                <td>₱${price.toFixed(2)}</td>
                <td><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">${facility.status || 'available'}</span></td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="editFacility('${facility.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteFacility('${facility.id}')">Archive</button>
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

function openAddFacilityModal() {
    currentFacilityId = null;
    document.getElementById('modalTitle').textContent = 'Add New Facility';
    document.getElementById('facilityForm').reset();
    document.getElementById('facilityIcon').value = '🏛️';
    document.getElementById('facilityStatus').value = 'available';
    document.getElementById('facilityModal').classList.add('show');
}

function editFacility(facilityId) {
    const facility = currentFacilities.find(f => String(f.id) === String(facilityId));
    if (!facility) {
        if (typeof showToast === 'function') showToast('Facility not found', 'danger');
        return;
    }
    
    currentFacilityId = facilityId;
    document.getElementById('modalTitle').textContent = 'Edit Facility';
    document.getElementById('facilityName').value = facility.name;
    document.getElementById('facilityIcon').value = facility.icon;
    document.getElementById('facilityCapacity').value = facility.capacity;
    document.getElementById('facilityPrice').value = facility.price;
    document.getElementById('facilityDescription').value = facility.description || '';
    document.getElementById('facilityStatus').value = facility.status || 'available';
    
    document.getElementById('facilityModal').classList.add('show');
}

async function saveFacility() {
    const name = document.getElementById('facilityName').value.trim();
    const icon = document.getElementById('facilityIcon').value.trim() || '🏛️';
    const capacity = parseInt(document.getElementById('facilityCapacity').value);
    const price = parseFloat(document.getElementById('facilityPrice').value);
    const description = document.getElementById('facilityDescription').value.trim();
    const status = document.getElementById('facilityStatus').value;

    if (!name || !capacity || isNaN(price)) {
        if (typeof showToast === 'function') showToast('Please fill in all required fields', 'warning');
        return;
    }

    const facilityData = { name, icon, capacity, price, description, status };

    try {
        if (currentFacilityId) {
            await window.api.updateFacility(currentFacilityId, facilityData);
            if (typeof showToast === 'function') showToast('Facility updated successfully', 'success');
        } else {
            await window.api.createFacility(facilityData);
            if (typeof showToast === 'function') showToast('Facility added successfully', 'success');
        }
    } catch (e) {
        console.error('saveFacility error', e);
        if (typeof showToast === 'function') showToast('Failed to save facility: ' + e.message, 'danger');
        return;
    }

    closeFacilityModal();
    loadFacilitiesList();
}

function confirmDeleteFacility(facilityId) {
    if (typeof showConfirm === 'function') {
        showConfirm('Are you sure you want to archive this facility?', function() {
            doDeleteFacility(facilityId);
        });
        return;
    }

    if (confirm('Are you sure you want to archive this facility?')) {
        doDeleteFacility(facilityId);
    }
}

async function doDeleteFacility(facilityId) {
    try {
        await window.api.deleteFacility(facilityId);
        if (typeof showToast === 'function') showToast('Facility archived successfully', 'success');
    } catch (e) {
        console.error('doDeleteFacility error', e);
        if (typeof showToast === 'function') showToast('Failed to archive facility: ' + e.message, 'danger');
    }
    loadFacilitiesList();
}

function closeFacilityModal() {
    document.getElementById('facilityModal').classList.remove('show');
    currentFacilityId = null;
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('facilityModal');
    if (event.target === modal) {
        closeFacilityModal();
    }
});



