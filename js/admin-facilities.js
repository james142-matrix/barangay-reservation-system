// Initialize admin facilities page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth('admin');
    loadFacilitiesList();
});

let currentFacilityId = null;

async function loadFacilitiesList() {
    const container = document.getElementById('facilities-list');
    container.innerHTML = '<p style="padding:20px;color:#888;">Loading facilities…</p>';

    let facilities = [];
    try {
        if (window.api) {
            facilities = await window.api.getFacilities();
            // Keep localStorage in sync with server data
            const db = getDatabase();
            db.facilities = facilities;
            saveDatabase(db);
        } else {
            facilities = getAllFacilities();
        }
    } catch (e) {
        console.warn('Could not load facilities from API, using local', e);
        facilities = getAllFacilities();
    }

    if (!Array.isArray(facilities) || facilities.length === 0) {
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

    facilities.forEach(facility => {
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
                    <button class="btn btn-small btn-danger" onclick="confirmDeleteFacility('${facility.id}')">Delete</button>
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
    const facility = getFacilityById(facilityId);
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
            // Edit existing facility — try API first, fallback to localStorage
            if (window.api) {
                const updated = await window.api.updateFacility(currentFacilityId, facilityData);
                // Sync to localStorage using the server-returned data
                updateFacility(String(updated.id || currentFacilityId), facilityData);
            } else {
                updateFacility(currentFacilityId, facilityData);
            }
            if (typeof showToast === 'function') showToast('Facility updated successfully', 'success');
        } else {
            // Add new facility — try API first, fallback to localStorage
            if (window.api) {
                const created = await window.api.createFacility(facilityData);
                // Save the server-assigned record (with numeric id) to localStorage too
                addFacility({
                    id: created.id,
                    name: created.name,
                    icon: created.icon || icon,
                    capacity: created.capacity,
                    price: created.price,
                    description: created.description || description,
                    status: created.status || status
                });
            } else {
                addFacility({
                    id: 'facility_' + Date.now(),
                    ...facilityData,
                    createdAt: new Date().toISOString()
                });
            }
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
    if (confirm('Are you sure you want to delete this facility?')) {
        doDeleteFacility(facilityId);
    }
}

async function doDeleteFacility(facilityId) {
    try {
        if (window.api) {
            await window.api.deleteFacility(facilityId);
        }
        // Always remove from localStorage as well
        const db = getDatabase();
        db.facilities = db.facilities.filter(f => String(f.id) !== String(facilityId));
        saveDatabase(db);
        if (typeof showToast === 'function') showToast('Facility deleted successfully', 'success');
    } catch (e) {
        console.error('doDeleteFacility error', e);
        if (typeof showToast === 'function') showToast('Failed to delete facility: ' + e.message, 'danger');
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
