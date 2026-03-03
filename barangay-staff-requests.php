<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Approval Requests - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Staff</a>
</nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="barangay-staff-dashboard.php">📊 Dashboard</a></li>
            <li><a href="barangay-staff-requests.php" class="active">📋 Approval Requests</a></li>
            <li><a href="barangay-staff-billing.php">💳 Billing</a></li>
            <li><a href="barangay-staff-facilities.php">🏛️ Facilities</a></li>
            <li><a href="reserve.php">📝 New Reservation</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header">
            <h1>Reservation Approval Requests</h1>
        </div>

        <!-- Filters -->
        <div class="table-container" style="margin-bottom: 20px;">
            <div style="padding: 15px; display: flex; gap: 15px; align-items: center;">
                <input 
                    type="text" 
                    id="searchInput" 
                    placeholder="Search by resident name or facility..." 
                    onkeyup="filterRequests()"
                    style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; flex: 1; max-width: 400px;">
                <select id="statusFilter" onchange="filterRequests()" style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; width: 200px;">
                    <option value="" selected>All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                </select>
            </div>
        </div>

        <!-- Requests Table -->
        <div class="table-container">
            <div id="requests-list">
                <!-- Requests will be loaded here -->
            </div>
        </div>
    </main>

    <!-- Approval Modal -->
    <div id="approvalModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Review Request</h2>
                <button class="close-modal" onclick="closeApprovalModal()">×</button>
            </div>
            <div class="modal-body" id="approvalBody">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeApprovalModal()">Close</button>
                <button class="btn btn-danger" id="rejectBtnModal" onclick="showRejectForm()">Reject</button>
                <button class="btn btn-success" id="approveBtnModal" onclick="approveResv()">Approve</button>
            </div>
        </div>
    </div>

    <!-- Rejection Reason Modal -->
    <div id="rejectReasonModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Reject Reservation</h2>
                <button class="close-modal" onclick="closeRejectModal()">×</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 15px;">Please provide a reason for rejection:</p>
                <textarea id="rejectionReason" rows="4" placeholder="Enter rejection reason..." style="width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-family: inherit;"></textarea>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeRejectModal()">Cancel</button>
                <button class="btn btn-danger" onclick="submitRejection()">Reject</button>
            </div>
        </div>
    </div>

    <script src="js/database.js?v=20260303b"></script>
    <script src="js/auth.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/barangay-staff-requests.js?v=20260303b"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>





