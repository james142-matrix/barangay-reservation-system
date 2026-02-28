// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    checkAuth('barangay_staff');
    loadRequests().catch(err => {
        showToast('Failed to load requests: ' + (err.message || 'Unknown error'), 'danger');
    });
});

// Global state
let currentRequest = null;
let currentRequests = [];
let usersByUsername = new Map();
let facilitiesById = new Map();

function normalizeReservation(raw) {
    if (!raw) return raw;
    return {
        ...raw,
        id: typeof raw.id === 'string' ? parseInt(raw.id, 10) : raw.id,
        facilityId: raw.facilityId != null ? raw.facilityId : raw.facility_id,
        eventDate: raw.eventDate || raw.event_date,
        eventStartDate: raw.eventStartDate || raw.event_start_date || raw.eventDate || raw.event_date,
        eventEndDate: raw.eventEndDate || raw.event_end_date,
        startTime: raw.startTime || raw.start_time,
        endTime: raw.endTime || raw.end_time,
        eventType: raw.eventType || raw.event_type || '',
        expectedGuests: raw.expectedGuests != null ? raw.expectedGuests : (raw.expected_guests ?? 0),
        eventDescription: raw.eventDescription || raw.event_description || '',
        contactPerson: raw.contactPerson || raw.contact_person || '',
        contactPhone: raw.contactPhone || raw.contact_phone || '',
        totalCost: raw.totalCost != null ? Number(raw.totalCost) : (raw.total_cost != null ? Number(raw.total_cost) : 0),
        approvedBy: raw.approvedBy || raw.approved_by || null,
        approvedAt: raw.approvedAt || raw.approved_at || null,
        rejectionReason: raw.rejectionReason || raw.rejection_reason || null,
        createdAt: raw.createdAt || raw.created_at || null
    };
}

async function loadRequests() {
    const [allReservations, users, facilities] = await Promise.all([
        window.api.getAllReservations(),
        window.api.getUsers(),
        window.api.getFacilities()
    ]);
    usersByUsername = new Map((users || []).map(u => [u.username, u]));
    facilitiesById = new Map((facilities || []).map(f => [String(f.id), f]));
    currentRequests = (allReservations || []).map(normalizeReservation);
    displayRequests(currentRequests);
}

function displayRequests(requests) {
    const listContainer = document.getElementById('requests-list');

    if (!requests || requests.length === 0) {
        listContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;"><p>No reservation requests found.</p></div>';
        return;
    }

    const sortedRequests = [...requests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    let html = '<table class="table">';
    html += '<thead><tr><th>Resident</th><th>Facility</th><th>Event Date</th><th>Time</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>';
    html += '<tbody>';

    sortedRequests.forEach(req => {
        const resident = usersByUsername.get(req.username);
        const facility = facilitiesById.get(String(req.facilityId));
        const residentName = resident ? resident.fullname : req.username;
        const facilityName = facility ? facility.name : `Facility #${req.facilityId}`;
        const statusClass = req.status === 'pending' ? 'pending' : (req.status === 'approved' ? 'approved' : 'rejected');
        const submittedDate = req.createdAt ? new Date(req.createdAt) : null;
        const formattedSubmitted = submittedDate ? submittedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';

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

function openApprovalModal(requestId) {
    const request = currentRequests.find(r => String(r.id) === String(requestId));
    if (!request) return;

    currentRequest = request;
    const resident = usersByUsername.get(request.username);
    const facility = facilitiesById.get(String(request.facilityId));
    const residentName = resident ? resident.fullname : request.username;
    const facilityName = facility ? facility.name : `Facility #${request.facilityId}`;

    let conflictHtml = '';
    const allResv = currentRequests;
    const reqStart = new Date(`${request.eventStartDate || request.eventDate}T${request.startTime}`);
    const reqEndDate = request.eventEndDate || request.eventDate;
    const reqEnd = new Date(`${reqEndDate}T${request.endTime}`);

    const sameDay = allResv.filter(r => {
        if (r.facilityId !== request.facilityId) return false;
        if (r.status !== 'approved') return false;
        if (r.id === request.id) return false;
        const rStart = new Date(`${r.eventStartDate || r.eventDate}T${r.startTime}`);
        const rEndDate = r.eventEndDate || r.eventDate;
        const rEnd = new Date(`${rEndDate}T${r.endTime}`);
        return !(reqEnd <= rStart || reqStart >= rEnd);
    });

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
                <p style="margin: 5px 0; color: #666;"><strong>Cost:</strong> ₱${Number(request.totalCost || 0).toFixed(2)}</p>
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
                <p style="margin: 5px 0; color: #666;"><strong>Submitted:</strong> ${request.createdAt ? formatDate(request.createdAt) : '-'}</p>
            </div>
        </div>

        <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <strong style="color: #667eea;">Event Description</strong>
            <p style="margin: 8px 0; color: #666;">${request.eventDescription || 'No description provided'}</p>
        </div>

        ${conflictHtml}
    `;

    if (request.status === 'rejected' && request.rejectionReason) {
        approvalBody += `
            <div style="background: #f8d7da; border-left: 4px solid #f5c6cb; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
                <strong style="color: #721c24;">Rejection Reason:</strong>
                <p style="margin: 5px 0; color: #721c24;">${request.rejectionReason}</p>
            </div>
        `;
    }

    if (request.status === 'approved' && request.approvedBy) {
        approvalBody += `
            <div style="background: #d4edda; border-left: 4px solid #c3e6cb; padding: 12px; margin-bottom: 15px; border-radius: 4px;">
                <strong style="color: #155724;">Approved by Staff</strong>
                <p style="margin: 5px 0; color: #155724;">Approved on: ${formatDate(request.approvedAt)}</p>
            </div>
        `;
    }

    document.getElementById('approvalBody').innerHTML = approvalBody;

    const approveBtnModal = document.getElementById('approveBtnModal');
    const rejectBtnModal = document.getElementById('rejectBtnModal');

    if (request.status === 'pending') {
        approveBtnModal.style.display = 'block';
        rejectBtnModal.style.display = 'block';
    } else {
        approveBtnModal.style.display = 'none';
        rejectBtnModal.style.display = 'none';
    }

    document.getElementById('approvalModal').classList.add('show');
}

async function approveResv() {
    if (!currentRequest) return;

    const staff = getLoggedInUser();

    try {
        currentRequest = await window.api.updateReservation(currentRequest.id, {
            status: 'approved',
            approvedBy: staff.username,
            approvedAt: new Date().toISOString()
        });
    } catch (e) {
        showToast('Failed to approve reservation: ' + (e.message || 'Unknown error'), 'danger');
        return;
    }

    const reservation = normalizeReservation(currentRequest);
    if (reservation) {
        const facility = facilitiesById.get(String(reservation.facilityId));
        const facilityName = facility ? facility.name : 'Your facility';
        createNotification(
            reservation.username,
            '✅ Reservation Approved!',
            `Your reservation for ${facilityName} on ${formatDateOnly(reservation.eventDate)} has been APPROVED!`,
            'approved',
            reservation.id
        );
    }

    showToast('Reservation approved successfully!', 'success');
    closeApprovalModal();
    loadRequests();
}

function showRejectForm() {
    document.getElementById('rejectionReason').value = '';
    document.getElementById('rejectReasonModal').classList.add('show');
}

async function submitRejection() {
    if (!currentRequest) return;

    const reason = document.getElementById('rejectionReason').value.trim();
    if (!reason) {
        showToast('Please provide a rejection reason', 'warning');
        return;
    }

    const staff = getLoggedInUser();

    try {
        currentRequest = await window.api.updateReservation(currentRequest.id, {
            status: 'rejected',
            rejectionReason: reason,
            rejectedBy: staff.username,
            rejectedAt: new Date().toISOString()
        });
    } catch (e) {
        showToast('Failed to reject reservation: ' + (e.message || 'Unknown error'), 'danger');
        return;
    }

    const reservation = normalizeReservation(currentRequest);
    if (reservation) {
        const facility = facilitiesById.get(String(reservation.facilityId));
        const facilityName = facility ? facility.name : 'Your facility';
        createNotification(
            reservation.username,
            '❌ Reservation Rejected',
            `Your reservation for ${facilityName} on ${formatDateOnly(reservation.eventDate)} has been REJECTED. Reason: ${reason}`,
            'rejected',
            reservation.id
        );
    }

    showToast('Reservation rejected successfully!', 'success');
    closeRejectModal();
    closeApprovalModal();
    loadRequests();
}

function closeApprovalModal() {
    currentRequest = null;
    document.getElementById('approvalModal').classList.remove('show');
}

function closeRejectModal() {
    document.getElementById('rejectReasonModal').classList.remove('show');
}

function filterRequests() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let allReservations = [...currentRequests];

    if (searchTerm) {
        allReservations = allReservations.filter(req => {
            const resident = usersByUsername.get(req.username);
            const facility = facilitiesById.get(String(req.facilityId));
            const residentName = resident ? resident.fullname.toLowerCase() : req.username.toLowerCase();
            const facilityName = facility ? facility.name.toLowerCase() : '';
            return residentName.includes(searchTerm) || facilityName.includes(searchTerm);
        });
    }

    if (statusFilter) {
        allReservations = allReservations.filter(req => req.status === statusFilter);
    }

    displayRequests(allReservations);
}

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
