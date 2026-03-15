<?php
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Review Requests - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css?v=<?php echo urlencode((string) filemtime(__DIR__ . '/css/style.css')); ?>">
</head>
<body class="requests-page">
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Staff</a>
</nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="barangay-staff-dashboard.php">📊 Dashboard</a></li>
            <li><a href="barangay-staff-requests.php" class="active">📋 Review Requests</a></li>
            <li><a href="barangay-staff-billing.php">💳 Payments & Billing</a></li>
            <li><a href="barangay-staff-facilities.php">🏛️ Facilities</a></li>
            <li><a href="barangay-staff-reserve.php">➕ New Reservation</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header page-title-row">
            <div class="dashboard-heading">
                <h1>📋 Reservation Review Requests</h1>
            </div>
        </div>

        <div class="requests-stats">
            <div class="requests-stat-card">
                <h4>Total</h4>
                <div class="stat-value" id="statTotalCount">0</div>
            </div>
            <div class="requests-stat-card pending">
                <h4>Pending</h4>
                <div class="stat-value" id="statPendingCount">0</div>
            </div>
            <div class="requests-stat-card completed">
                <h4>Completed</h4>
                <div class="stat-value" id="statCompletedCount">0</div>
            </div>
            <div class="requests-stat-card rejected">
                <h4>Cancelled</h4>
                <div class="stat-value" id="statRejectedCount">0</div>
            </div>
        </div>

        <div class="filter-bar requests-filter-bar">
            <div class="filter-group">
                <label for="searchInput">Search</label>
                <input 
                    type="text" 
                    id="searchInput" 
                    placeholder="Client name or facility..." 
                    onkeyup="filterRequests()">
            </div>
            <div class="filter-group">
                <label for="statusFilter">Request Status</label>
                <select id="statusFilter" onchange="filterRequests()">
                    <option value="" selected>All Requests</option>
                    <option value="pending">Pending</option>
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

    <!-- Review Modal -->
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
                <button class="btn btn-secondary" id="editBtnModal" onclick="enterEditMode()">Edit Details</button>
                <button class="btn btn-secondary" id="cancelEditBtnModal" onclick="cancelEditMode()" style="display:none;">Cancel Edit</button>
                <button class="btn btn-primary" id="saveEditBtnModal" onclick="saveRequestEdits()" style="display:none;">Save Changes</button>
            </div>
        </div>
    </div>

    <script src="js/database.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/database.js')); ?>"></script>
    <script src="js/auth.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/auth.js')); ?>"></script>
    <script src="js/api.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/api.js')); ?>"></script>
    <script src="js/barangay-staff-requests.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/barangay-staff-requests.js')); ?>"></script>
    <script src="js/responsive.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/responsive.js')); ?>"></script>
</body>
</html>











