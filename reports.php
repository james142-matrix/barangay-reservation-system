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
    <title>Reports - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css?v=<?php echo urlencode((string) filemtime(__DIR__ . '/css/style.css')); ?>">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Admin</a>
</nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="admin-dashboard.php">📊 Dashboard</a></li>
            <li><a href="admin-requests.php">📋 Review Requests</a></li>
            <li><a href="admin-billing.php">💳 Payments & Billing</a></li>
            <li><a href="admin-users.php">👥 Users</a></li>
            <li><a href="admin-facilities.php">🏛️ Facilities</a></li>
            <li><a href="admin-reserve.php">➕ New Reservation</a></li>
            <li><a href="reports.php" class="active">📈 Reports</a></li>
            <li><a href="admin-archive.php">🗃️ Archive Center</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header">
            <h1>System Reports</h1>
        </div>

        <!-- Date Range Filter -->
        <div class="table-container" style="margin-bottom: 20px; padding: 15px;">
            <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
                <label for="dateRange" style="font-weight: 600; color: #333;">Date Range:</label>
                <select id="dateRange" onchange="updateReports()" style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; width: 200px;">
                    <option value="this-month">This Month</option>
                    <option value="last-3-months">Last 3 Months</option>
                    <option value="last-6-months">Last 6 Months</option>
                    <option value="all-time">All Time</option>
                </select>
                <button id="exportCsvBtn" class="btn btn-primary" type="button">Export CSV</button>
                <button id="exportPdfBtn" class="btn btn-secondary" type="button">Export PDF</button>
            </div>
        </div>

        <!-- Key Metrics Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #e83e8c;" id="total-reservations">0</div>
                <div style="color: #999; margin-top: 8px;">Total Reservations</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #28a745;" id="billing-count">0</div>
                <div style="color: #999; margin-top: 8px;">In Billing</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #ffa500;" id="pending-count">0</div>
                <div style="color: #999; margin-top: 8px;">Pending</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #ff6b6b;" id="cancelled-count">0</div>
                <div style="color: #999; margin-top: 8px;">Cancelled</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;" id="completed-count">0</div>
                <div style="color: #999; margin-top: 8px;">Completed</div>
            </div>
            <div class="stat-card revenue">
                <div style="font-size: 28px; font-weight: bold; color: #17a2b8;" id="revenue-total">₱0.00</div>
                <div style="color: #999; margin-top: 8px;">Total Revenue</div>
            </div>
        </div>

        <!-- Reports Sections -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
            <!-- Facility Usage -->
            <div class="table-container">
                <h3 style="margin-top: 0; color: #333; padding: 0 15px; padding-top: 15px;">📊 Facility Usage</h3>
                <div id="facility-usage-list" style="padding: 15px;">
                    <!-- Facility usage will be loaded here -->
                </div>
            </div>

            <!-- Top Clients -->
            <div class="table-container">
                <h3 style="margin-top: 0; color: #333; padding: 0 15px; padding-top: 15px;">👥 Top Clients</h3>
                <div id="top-clients-list" style="padding: 15px;">
                    <!-- Top clients will be loaded here -->
                </div>
            </div>
        </div>

        <!-- Status Breakdown -->
        <div class="table-container" style="margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333; padding: 0 15px; padding-top: 15px;">📈 Status Breakdown</h3>
            <div id="status-breakdown" style="padding: 15px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px;">
                <!-- Status breakdown will be loaded here -->
            </div>
        </div>

        <!-- Monthly Trend -->
        <div class="table-container" style="margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333; padding: 0 15px; padding-top: 15px;">📅 Monthly Trend</h3>
            <div id="monthly-trend" style="padding: 15px;">
                <!-- Monthly trend will be loaded here -->
            </div>
        </div>

        <!-- Detailed Transactions Table -->
        <div class="table-container" style="margin-top: 20px;">
            <h3 style="margin-top: 0; color: #333; padding: 0 15px; padding-top: 15px;">📋 All Transactions</h3>
            <div id="detailed-table" style="padding: 15px;">
                <!-- Detailed table will be loaded here -->
            </div>
        </div>
    </main>

    <script src="js/database.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/database.js')); ?>"></script>
    <script src="js/auth.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/auth.js')); ?>"></script>
    <script src="js/api.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/api.js')); ?>"></script>
    <script src="js/reports.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/reports.js')); ?>"></script>
    <script src="js/responsive.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/responsive.js')); ?>"></script>
</body>
</html>











