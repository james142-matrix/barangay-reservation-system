<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Admin</a>
</nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="admin-dashboard.php" class="active">📊 Dashboard</a></li>
            <li><a href="admin-requests.php">📋 Approval Requests</a></li>
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
        <div class="dashboard-header">
            <h1>Admin Dashboard</h1>
            <div class="notification-wrap">
                <button id="notificationToggleBtn" class="btn notification-trigger" type="button">
                    🔔 Notifications <span id="notificationBadge" class="notification-dot-count"></span>
                </button>
                <div id="notificationPanel" class="notification-panel"></div>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Reservations</h3>
                <div class="value" id="stat-total">0</div>
            </div>
            <div class="stat-card pending">
                <h3>Pending Approvals</h3>
                <div class="value" id="stat-pending">0</div>
            </div>
            <div class="stat-card approved">
                <h3>Approved</h3>
                <div class="value" id="stat-approved">0</div>
            </div>
            <div class="stat-card rejected">
                <h3>Rejected</h3>
                <div class="value" id="stat-rejected">0</div>
            </div>
            <div class="stat-card" style="border-top-color: #3b82f6;">
                <h3>Completed</h3>
                <div class="value" id="stat-completed" style="color: #3b82f6;">0</div>
            </div>
            <div class="stat-card" style="border-top-color: #8b5cf6;">
                <h3>Unpaid Approved</h3>
                <div class="value" id="stat-unpaid-approved" style="color: #8b5cf6;">0</div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="table-container" style="margin-bottom: 30px;">
            <div class="table-header">
                <h2>Quick Actions</h2>
            </div>
            <div style="padding: 30px; text-align: center;">
                <a href="admin-requests.php" class="btn btn-primary" style="margin: 0 10px 10px;">Review Pending Requests</a>
                <a href="admin-billing.php" class="btn btn-primary" style="margin: 0 10px 10px;">Check Billing</a>
                <a href="admin-users.php" class="btn btn-primary" style="margin: 0 10px 10px;">Manage Users</a>
                <a href="admin-facilities.php" class="btn btn-primary" style="margin: 0 10px 10px;">Manage Facilities</a>
                <a href="reserve.php" class="btn btn-primary" style="margin: 0 10px 10px;">Create Reservation</a>
                <a href="reports.php" class="btn btn-primary" style="margin: 0 10px 10px;">View Reports</a>
                <a href="admin-archive.php" class="btn btn-primary" style="margin: 0 10px 10px;">Archive Center</a>
            </div>
        </div>

        <!-- Upcoming Events -->
        <div class="table-container" style="margin-bottom: 30px;">
            <div class="table-header">
                <h2>Upcoming Events (Next 7 Days)</h2>
            </div>
            <div id="upcoming-events-list">
                <!-- Upcoming events will be loaded here -->
            </div>
        </div>

        <!-- Recent Decisions -->
        <div class="table-container" style="margin-bottom: 30px;">
            <div class="table-header">
                <h2>Recent Decisions</h2>
            </div>
            <div id="recent-decisions-list">
                <!-- Approved/rejected/completed decisions will be loaded here -->
            </div>
        </div>

        <!-- Recent Pending Requests -->
        <div class="table-container" style="margin-bottom: 30px;">
            <div class="table-header">
                <h2>Recent Pending Requests</h2>
                <a href="admin-requests.php" style="color: #e83e8c; text-decoration: none; font-size: 14px;">View All →</a>
            </div>
            <div id="pending-requests-list">
                <!-- Pending requests will be loaded here -->
            </div>
        </div>
    </main>

    <script src="js/database.js?v=20260303b"></script>
    <script src="js/auth.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/admin-dashboard.js?v=20260307a"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>





