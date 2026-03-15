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
    <title>Staff Dashboard - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css?v=<?php echo urlencode((string) filemtime(__DIR__ . '/css/style.css')); ?>">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Staff</a>
        <div class="navbar-actions">
            <div class="notification-wrap">
                <button id="notificationToggleBtn" class="btn notification-trigger" type="button">
                    🔔 Notifications <span id="notificationBadge" class="notification-dot-count">0</span>
                </button>
                <div id="notificationPanel" class="notification-panel"></div>
            </div>
        </div>
    </nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="barangay-staff-dashboard.php" class="active">📊 Dashboard</a></li>
            <li><a href="barangay-staff-requests.php">📋 Review Requests</a></li>
            <li><a href="barangay-staff-billing.php">💳 Payments &amp; Billing</a></li>
            <li><a href="barangay-staff-facilities.php">🏛️ Facilities</a></li>
            <li><a href="barangay-staff-reserve.php">➕ New Reservation</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header page-title-row">
            <div class="dashboard-heading">
                <h1>📊 Staff Dashboard</h1>
                <p id="user-greeting" class="dashboard-subtitle"></p>
            </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Reservations</h3>
                <div class="value" id="stat-total">0</div>
            </div>
            <div class="stat-card pending">
                <h3>Pending</h3>
                <div class="value" id="stat-pending">0</div>
            </div>
            <div class="stat-card" style="border-top-color: #8b5cf6;">
                <h3>Completed</h3>
                <div class="value" id="stat-completed" style="color: #8b5cf6;">0</div>
            </div>
            <div class="stat-card rejected">
                <h3>Cancelled</h3>
                <div class="value" id="stat-rejected">0</div>
            </div>
        </div>

        <!-- Recent Review Requests -->
        <div class="table-container" style="margin-bottom: 30px; border-left: 4px solid #e83e8c;">
            <div class="table-header">
                <h2 style="font-size: 1.25rem; font-weight: 700; color: #2d3748;">📋 Recent Pending Requests</h2>
                <a href="barangay-staff-requests.php" style="color: #e83e8c; text-decoration: none; font-size: 14px; font-weight: 500;">View All →</a>
            </div>
            <div id="pending-requests-list">
                <!-- Pending requests will be loaded here -->
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
            <div id="recent-decisions-list"></div>
        </div>
    </main>

    <script src="js/database.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/database.js')); ?>"></script>
    <script src="js/auth.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/auth.js')); ?>"></script>
    <script src="js/api.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/api.js')); ?>"></script>
    <script src="js/barangay-staff-dashboard.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/barangay-staff-dashboard.js')); ?>"></script>
    <script src="js/responsive.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/responsive.js')); ?>"></script>
</body>
</html>
