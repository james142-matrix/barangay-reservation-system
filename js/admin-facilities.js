// Initialize admin facilities page
document.addEventListener('DOMContentLoaded', function() {
    checkAuth('admin');
    loadFacilitiesList();
});

let currentFacilityId = null;

function loadFacilitiesList() {
    const facilities = getAllFacilities();
    const container = document.getElementById('facilities-list');
    
    if (facilities.length === 0) {
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
        
        html += `
            <tr>
                <td><strong>${facility.icon} ${facility.name}</strong></td>
                <td>${facility.capacity} persons</td>
                <td>₱${facility.price.toFixed(2)}</td>
                <td><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: capitalize;">${facility.status}</span></td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="editFacility('${facility.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteFacility('${facility.id}')">Delete</button>
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

function saveFacility() {
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
    
    if (currentFacilityId) {
        // Edit existing facility
        updateFacility(currentFacilityId, {
            name,
            icon,
            capacity,
            price,
            description,
            status
        });
        if (typeof showToast === 'function') showToast('Facility updated successfully', 'success');
    } else {
        // Add new facility
        const newFacility = {
            id: 'facility_' + Date.now(),
            name,
            icon,
            capacity,
            price,
            description,
            status,
            createdAt: new Date().toISOString()
        };
        addFacility(newFacility);
        if (typeof showToast === 'function') showToast('Facility added successfully', 'success');
    }
    
    closeFacilityModal();
    loadFacilitiesList();
}

function deleteFacility(facilityId) {
    if (confirm('Are you sure you want to delete this facility?')) {
        const facilities = getAllFacilities();
        const updatedFacilities = facilities.filter(f => f.id !== facilityId);
        localStorage.setItem('facilities', JSON.stringify(updatedFacilities));
        if (typeof showToast === 'function') showToast('Facility deleted successfully', 'success');
        loadFacilitiesList();
    }
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
