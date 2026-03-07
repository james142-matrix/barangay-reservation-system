<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reports - Barangay Molugan</title>
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
            <li><a href="admin-dashboard.php">📊 Dashboard</a></li>
            <li><a href="admin-requests.php">📋 Approval Requests</a></li>
            <li><a href="admin-billing.php">💳 Billing</a></li>
            <li><a href="admin-users.php">👥 Users</a></li>
            <li><a href="admin-facilities.php">🏛️ Facilities</a></li>
            <li><a href="reserve.php">📝 New Reservation</a></li>
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
            <div style="display: flex; gap: 15px; align-items: center;">
                <label for="dateRange" style="font-weight: 600; color: #333;">Date Range:</label>
                <select id="dateRange" onchange="updateReports()" style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; width: 200px;">
                    <option value="this-month">This Month</option>
                    <option value="last-3-months">Last 3 Months</option>
                    <option value="last-6-months">Last 6 Months</option>
                    <option value="all-time">All Time</option>
                </select>
            </div>
        </div>

        <!-- Key Metrics Grid -->
        <div class="stats-grid">
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #e83e8c;" id="total-reservations">0</div>
                <div style="color: #999; margin-top: 8px;">Total Reservations</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #28a745;" id="approved-count">0</div>
                <div style="color: #999; margin-top: 8px;">Approved</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #ffa500;" id="pending-count">0</div>
                <div style="color: #999; margin-top: 8px;">Pending</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #ff6b6b;" id="rejected-count">0</div>
                <div style="color: #999; margin-top: 8px;">Rejected</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 28px; font-weight: bold; color: #6f42c1;" id="completed-count">0</div>
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
            <div id="status-breakdown" style="padding: 15px; display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 15px;">
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

    <script src="js/database.js?v=20260303b"></script>
    <script src="js/auth.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/reports.js?v=20260306b"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>






