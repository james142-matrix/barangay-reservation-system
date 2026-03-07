<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Approval Requests - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css?v=20260306d">
</head>
<body class="requests-page">
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Admin</a>
    </nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="admin-dashboard.php">📊 Dashboard</a></li>
            <li><a href="admin-requests.php" class="active">📋 Approval Requests</a></li>
            <li><a href="admin-billing.php">💳 Billing</a></li>
            <li><a href="admin-users.php">👥 Users</a></li>
            <li><a href="admin-facilities.php">🏛️ Facilities</a></li>
            <li><a href="reserve.php">📝 New Reservation</a></li>
            <li><a href="reports.php">📈 Reports</a></li>
            <li><a href="admin-archive.php">🗃️ Archive Center</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header requests-hero">
            <div>
                <h1>Reservation Approval Requests</h1>
                <p>Review and manage incoming client reservations with clear status tracking.</p>
            </div>
            <div class="requests-quick-stats">
                <div class="quick-stat-card">
                    <span class="quick-stat-label">Pending</span>
                    <strong id="statPendingCount">0</strong>
                </div>
                <div class="quick-stat-card">
                    <span class="quick-stat-label">Approved</span>
                    <strong id="statApprovedCount">0</strong>
                </div>
                <div class="quick-stat-card">
                    <span class="quick-stat-label">Completed</span>
                    <strong id="statCompletedCount">0</strong>
                </div>
                <div class="quick-stat-card">
                    <span class="quick-stat-label">Rejected</span>
                    <strong id="statRejectedCount">0</strong>
                </div>
            </div>
        </div>

        <!-- Filters -->
        <div class="table-container requests-filter-shell">
            <div class="filter-bar">
                <input
                    type="text"
                    id="searchInput"
                    placeholder="Search by client name or facility..."
                    onkeyup="filterRequests()">
                <select id="statusFilter" onchange="filterRequests()">
                    <option value="">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
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
            <div class="modal-body" id="approvalBody"></div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeApprovalModal()">Close</button>
                <button class="btn btn-secondary" id="editBtnModal" onclick="enterEditMode()">Edit Details</button>
                <button class="btn btn-secondary" id="cancelEditBtnModal" onclick="cancelEditMode()" style="display:none;">Cancel Edit</button>
                <button class="btn btn-primary" id="saveEditBtnModal" onclick="saveRequestEdits()" style="display:none;">Save Changes</button>
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
    <script src="js/admin-requests.js?v=20260306g"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>




