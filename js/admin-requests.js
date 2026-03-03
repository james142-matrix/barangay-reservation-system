// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth('admin')) return;
    loadRequests().catch(err => {
        showToast('Failed to load requests: ' + (err.message || 'Unknown error'), 'danger');
    });
});

// Global variable to track current selected request
let currentRequest = null;
let currentRequests = [];
let usersByUsername = new Map();
let facilitiesById = new Map();

function formatFullDate(dateValue) {
    if (!dateValue) return '-';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime12Hour(timeValue) {
    if (!timeValue) return '-';
    const cleaned = String(timeValue).slice(0, 5);
    const [h, m] = cleaned.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return String(timeValue);
    const hour12 = (h % 12) || 12;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatTimeRange(startTime, endTime) {
    return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
}

function calculateAddonSubtotal(chairsCount, electronicsCount) {
    const chairs = Number(chairsCount || 0);
    const electronics = Number(electronicsCount || 0);
    return (chairs * 10) + (electronics * 150);
}

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
        chairsCount: raw.chairsCount != null ? raw.chairsCount : (raw.chairs_count ?? 0),
        electronicsCount: raw.electronicsCount != null ? raw.electronicsCount : (raw.electronics_count ?? 0),
        paymentOption: raw.paymentOption || raw.payment_option || 'full',
        downPaymentAmount: raw.downPaymentAmount != null ? Number(raw.downPaymentAmount) : (raw.down_payment_amount != null ? Number(raw.down_payment_amount) : 0),
        paymentStatus: raw.paymentStatus || raw.payment_status || 'pending',
        totalCost: raw.totalCost != null ? Number(raw.totalCost) : (raw.total_cost != null ? Number(raw.total_cost) : 0),
        approvedBy: raw.approvedBy || raw.approved_by || null,
        approvedAt: raw.approvedAt || raw.approved_at || null,
        rejectionReason: raw.rejectionReason || raw.rejection_reason || null,
        createdAt: raw.createdAt || raw.created_at || null
    };
}

// Load and display all requests
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

// Display requests in table format
function displayRequests(requests) {
    const listContainer = document.getElementById('requests-list');
    
    if (!requests || requests.length === 0) {
        listContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: #999;"><p>No reservation requests found.</p></div>';
        return;
    }

    // Sort by date, most recent first
    const sortedRequests = [...requests].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    let html = '<table class="table">';
    html += '<thead><tr><th>Resident</th><th>Facility</th><th>Event Date</th><th>Time</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>';
    html += '<tbody>';

    sortedRequests.forEach(req => {
        const resident = usersByUsername.get(req.username);
        const facility = facilitiesById.get(String(req.facilityId));
        const residentName = resident ? resident.fullname : 'Unknown Resident';
        const facilityName = facility ? facility.name : 'Unknown Facility';
        const statusClass = req.status === 'pending' ? 'pending' : (req.status === 'approved' ? 'approved' : 'rejected');
        const formattedSubmitted = formatFullDate(req.createdAt);

        html += '<tr>';
        html += `<td><strong>${residentName}</strong></td>`;
        html += `<td>${facilityName}</td>`;
        html += `<td>${formatFullDate(req.eventDate)}</td>`;
        html += `<td>${formatTimeRange(req.startTime, req.endTime)}</td>`;
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
    const request = currentRequests.find(r => String(r.id) === String(requestId));
    if (!request) return;

    currentRequest = request;
    const resident = usersByUsername.get(request.username);
    const facility = facilitiesById.get(String(request.facilityId));
    const residentName = resident ? resident.fullname : 'Unknown';
    const facilityName = facility ? facility.name : 'Unknown';

    // Check for conflicts with other approved reservations
    let conflictHtml = '';
    const allResv = currentRequests;
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
            conflictHtml += `<br>• ${formatTimeRange(r.startTime, r.endTime)}`;
        });
        conflictHtml += '</div>';
    }

    let approvalBody = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong style="color: #e83e8c;">Resident Information</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${residentName}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Contact:</strong> ${request.contactPerson}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${request.contactPhone}</p>
            </div>
            <div>
                <strong style="color: #e83e8c;">Facility & Booking</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Facility:</strong> ${facilityName}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${formatFullDate(request.eventStartDate || request.eventDate)}${request.eventEndDate && request.eventEndDate !== (request.eventStartDate || request.eventDate) ? ' → ' + formatFullDate(request.eventEndDate) : ''}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${formatTimeRange(request.startTime, request.endTime)}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Cost:</strong> ₱${Number(request.totalCost || 0).toFixed(2)}</p>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
                <strong style="color: #e83e8c;">Event Details</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${request.eventType}</p>
                <p style="margin: 5px 0; color: #666;"><strong>Expected Guests:</strong> ${request.expectedGuests}</p>
            </div>
            <div>
                <strong style="color: #e83e8c;">Status</strong>
                <p style="margin: 5px 0; color: #666;"><strong>Current:</strong> <span class="badge ${request.status}">${request.status.toUpperCase()}</span></p>
                <p style="margin: 5px 0; color: #666;"><strong>Submitted:</strong> ${formatFullDate(request.createdAt)}</p>
            </div>
        </div>

        <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <strong style="color: #e83e8c;">Event Description</strong>
            <p style="margin: 8px 0; color: #666;">${request.eventDescription || 'No description provided'}</p>
        </div>

        <div style="background: #eef4ff; border: 1px solid #dce7ff; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <strong style="color: #3557d6;">Invoice Summary</strong>
            <p style="margin: 8px 0 4px; color: #445;"><strong>Total Amount:</strong> ₱${Number(request.totalCost || 0).toFixed(2)}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Payment Option:</strong> ${request.paymentOption === 'down_payment' ? 'Down Payment' : 'Full Payment'}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Down Payment:</strong> ₱${Number(request.downPaymentAmount || 0).toFixed(2)}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Remaining Balance:</strong> ₱${Math.max(0, Number(request.totalCost || 0) - Number(request.downPaymentAmount || 0)).toFixed(2)}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Payment Status:</strong> ${(request.paymentStatus || 'pending').toUpperCase()}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Add-ons:</strong> Chairs ${Number(request.chairsCount || 0)}, Electronics ${Number(request.electronicsCount || 0)}</p>
            <p style="margin: 4px 0; color: #445;"><strong>Add-on Subtotal:</strong> ₱${calculateAddonSubtotal(request.chairsCount, request.electronicsCount).toFixed(2)}</p>
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
                <p style="margin: 5px 0; color: #155724;">Approved on: ${formatFullDate(request.approvedAt)}</p>
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
async function approveResv() {
    if (!currentRequest) return;

    // Get admin username
    const admin = getLoggedInUser();
    
    try {
        currentRequest = await window.api.updateReservation(currentRequest.id, {
            status: 'approved',
            approvedBy: admin.username,
            approvedAt: new Date().toISOString()
        });
    } catch (e) {
        showToast('Failed to approve reservation: ' + (e.message || 'Unknown error'), 'danger');
        return;
    }

    // Create notification for the resident
    const reservation = normalizeReservation(currentRequest);
    if (reservation) {
        const facility = facilitiesById.get(String(reservation.facilityId));
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
async function submitRejection() {
    if (!currentRequest) return;

    const reason = document.getElementById('rejectionReason').value.trim();
    
    if (!reason) {
        showToast('Please provide a rejection reason', 'warning');
        return;
    }

    // Get admin username
    const admin = getLoggedInUser();

    try {
        currentRequest = await window.api.updateReservation(currentRequest.id, {
            status: 'rejected',
            rejectionReason: reason,
            rejectedBy: admin.username,
            rejectedAt: new Date().toISOString()
        });
    } catch (e) {
        showToast('Failed to reject reservation: ' + (e.message || 'Unknown error'), 'danger');
        return;
    }

    // Create notification for the resident
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

    let allReservations = [...currentRequests];

    // Filter by search term
    if (searchTerm) {
        allReservations = allReservations.filter(req => {
            const resident = usersByUsername.get(req.username);
            const facility = facilitiesById.get(String(req.facilityId));
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






