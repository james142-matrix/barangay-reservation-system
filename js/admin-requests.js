// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth('admin');
    loadRequests();
});

// Global variable to track current selected request
let currentRequest = null;

// Load and display all requests
function loadRequests() {
    const allReservations = getAllReservations();
    displayRequests(allReservations);
}

// Display requests in table format
function displayRequests(requests) {
    const listContainer = document.getElementById('requests-list');
    
    if (!requests || requests.length === 0) {
        listContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;"><p>No reservation requests found.</p></div>';
        return;
    }

    // Sort by date, most recent first
    const sortedRequests = requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let html = '<table class="table">';
    html += '<thead><tr><th>Resident</th><th>Facility</th><th>Event Date</th><th>Time</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>';
    html += '<tbody>';

    sortedRequests.forEach(req => {
        const resident = getUserByUsername(req.username);
        const facility = getFacilityById(req.facilityId);
        const residentName = resident ? resident.fullname : 'Unknown Resident';
        const facilityName = facility ? facility.name : 'Unknown Facility';
        const statusClass = req.status === 'pending' ? 'pending' : (req.status === 'approved' ? 'approved' : 'rejected');
        const submittedDate = new Date(req.createdAt);
        const formattedSubmitted = submittedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        html += '<tr>';
        html += `<td><strong>${residentName}</strong></td>`;
        html += `<td>${facilityName}</td>`;
        html += `<td>${formatDate(req.eventDate).split(' ')[0]}</td>`;
        html += `<td>${req.startTime} - ${req.endTime}</td>`;
        html += `<td><span class="badge ${statusClass}">${req.status.charAt(0).toUpperCase() + req.status.slice(1)}</span></td>`;
        html += `<td>${formattedSubmitted}</td>`;
        html += `<td><button class="btn btn-sm btn-primary" onclick="openApprovalModal('${req.id}')">Review</button></td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    listContainer.innerHTML = html;
}

// Open approval modal with request details
function openApprovalModal(requestId) {
    const request = getReservationById(requestId);
    if (!request) return;

    currentRequest = request;
    const resident = getUserByUsername(request.username);
    const facility = getFacilityById(request.facilityId);
    const residentName = resident ? resident.fullname : 'Unknown';
    const facilityName = facility ? facility.name : 'Unknown';

    // Check for conflicts with other approved reservations
    let conflictHtml = '';
    const allResv = getAllReservations();
    const sameDay = allResv.filter(r => 
        r.facilityId === request.facilityId && 
        r.eventDate === request.eventDate && 
        r.status === 'approved' &&
        r.id !== request.id
    );

    if (sameDay.length > 0) {
        conflictHtml = '<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin-bottom: 15px; border-radius: 4px;">';
        conflictHtml += '<strong>⚠️ Time Conflict Warning:</strong><br>';
        conflictHtml += 'Other approved reservations on this date/facility:';
        sameDay.forEach(r => {
            conflictHtml += `<br>• ${r.startTime} - ${r.endTime}`;
        });
        conflictHtml += '</div>';
    }

    let approvalBody = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong style="color: #667eea;">Resident Information</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${residentName}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Contact:</strong> ${request.contactPerson}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${request.contactPhone}</p>
            </div>
            <div>
                <strong style="color: #667eea;">Facility & Booking</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Facility:</strong> ${facilityName}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${formatDate(request.eventStartDate || request.eventDate).split(' ')[0]}${request.eventEndDate && request.eventEndDate !== (request.eventStartDate || request.eventDate) ? ' → ' + formatDate(request.eventEndDate).split(' ')[0] : ''}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${request.startTime} - ${request.endTime}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Cost:</strong> ₱${request.totalCost ? request.totalCost.toFixed(2) : '0.00'}</p>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong style="color: #667eea;">Event Details</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${request.eventType}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Expected Guests:</strong> ${request.expectedGuests}</p>
            </div>
            <div>
                <strong style="color: #667eea;">Status</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Current:</strong> <span class="badge ${request.status}">${request.status.toUpperCase()}</span></p>
                <p style="margin: 5px 0; color: #666;"><strong>Submitted:</strong> ${formatDate(request.createdAt)}</p>
            </div>
        </div>

        <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <strong style="color: #667eea;">Event Description</strong>
            <p style="margin: 8px 0; color: #666;">${request.eventDescription || 'No description provided'}</p>
        </div>

        ${conflictHtml}
    `;

    // Show rejection reason if already rejected
    if (request.status === 'rejected' && request.rejectionReason) {
        approvalBody += `
            <div style="background: #f8d7da; border-left: 4px solid #f5c6cb; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
                <strong style="color: #721c24;">Rejection Reason:</strong>
                <p style="margin: 5px 0; color: #721c24;">${request.rejectionReason}</p>
            </div>
        `;
    }

    // Show approval date if already approved
    if (request.status === 'approved' && request.approvedBy) {
        approvalBody += `
            <div style="background: #d4edda; border-left: 4px solid #c3e6cb; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
                <strong style="color: #155724;">Approved by Admin</strong>
                <p style="margin: 5px 0; color: #155724;">Approved on: ${formatDate(request.approvedAt)}</p>
            </div>
        `;
    }

    document.getElementById('approvalBody').innerHTML = approvalBody;

    // Only show action buttons if pending
    const approveBtnModal = document.getElementById('approveBtnModal');
    const rejectBtnModal = document.getElementById('rejectBtnModal');
    
    if (request.status === 'pending') {
        approveBtnModal.style.display = 'block';
        rejectBtnModal.style.display = 'block';
    } else {
        approveBtnModal.style.display = 'none';
        rejectBtnModal.style.display = 'none';
    }

    // Show modal
    document.getElementById('approvalModal').classList.add('show');
}

// Approve the reservation
function approveResv() {
    if (!currentRequest) return;

    // Get admin username
    const admin = getLoggedInUser();
    
    // Approve using database function
    approveReservation(currentRequest.id, admin.username);

    // Create notification for the resident
    const reservation = getReservationById(currentRequest.id);
    if (reservation) {
        const facility = getFacilityById(reservation.facilityId);
        const facilityName = facility ? facility.name : 'Your facility';
        createNotification(
            reservation.username,
            '✅ Reservation Approved!',
            `Your reservation for ${facilityName} on ${formatDateOnly(reservation.eventDate)} has been APPROVED! Please visit the Billing dashboard to complete payment.`,
            'approved',
            reservation.id
        );
    }

    // Show success message
    showToast('Reservation approved successfully!', 'success');

    // Close modal and reload
    closeApprovalModal();
    loadRequests();
}

// Show rejection reason form
function showRejectForm() {
    document.getElementById('rejectionReason').value = '';
    document.getElementById('rejectReasonModal').classList.add('show');
}

// Submit rejection
function submitRejection() {
    if (!currentRequest) return;

    const reason = document.getElementById('rejectionReason').value.trim();
    
    if (!reason) {
        showToast('Please provide a rejection reason', 'warning');
        return;
    }

    // Get admin username
    const admin = getLoggedInUser();

    // Reject using database function
    rejectReservation(currentRequest.id, reason, admin.username);

    // Create notification for the resident
    const reservation = getReservationById(currentRequest.id);
    if (reservation) {
        const facility = getFacilityById(reservation.facilityId);
        const facilityName = facility ? facility.name : 'Your facility';
        createNotification(
            reservation.username,
            '❌ Reservation Rejected',
            `Your reservation for ${facilityName} on ${formatDateOnly(reservation.eventDate)} has been REJECTED. Reason: ${reason}`,
            'rejected',
            reservation.id
        );
    }

    // Show success message
    showToast('Reservation rejected successfully!', 'success');

    // Close modals and reload
    closeRejectModal();
    closeApprovalModal();
    loadRequests();
}

// Close approval modal
function closeApprovalModal() {
    currentRequest = null;
    document.getElementById('approvalModal').classList.remove('show');
}

// Close rejection modal
function closeRejectModal() {
    document.getElementById('rejectReasonModal').classList.remove('show');
}

// Filter requests based on search and status
function filterRequests() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let allReservations = getAllReservations();

    // Filter by search term
    if (searchTerm) {
        allReservations = allReservations.filter(req => {
            const resident = getUserByUsername(req.username);
            const facility = getFacilityById(req.facilityId);
            const residentName = resident ? resident.fullname.toLowerCase() : '';
            const facilityName = facility ? facility.name.toLowerCase() : '';

            return residentName.includes(searchTerm) || facilityName.includes(searchTerm);
        });
    }

    // Filter by status
    if (statusFilter) {
        allReservations = allReservations.filter(req => req.status === statusFilter);
    }

    displayRequests(allReservations);
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const approvalModal = document.getElementById('approvalModal');
    const rejectReasonModal = document.getElementById('rejectReasonModal');

    if (event.target === approvalModal) {
        closeApprovalModal();
    }
    if (event.target === rejectReasonModal) {
        closeRejectModal();
    }
});


