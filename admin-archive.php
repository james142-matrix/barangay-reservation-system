<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Archive Center - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Admin</a>
    </nav>

    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="admin-dashboard.php">📊 Dashboard</a></li>
            <li><a href="admin-requests.php">📋 Approval Requests</a></li>
            <li><a href="admin-billing.php">💳 Billing</a></li>
            <li><a href="admin-users.php">👥 Users</a></li>
            <li><a href="admin-facilities.php">🏛️ Facilities</a></li>
            <li><a href="reserve.php">📝 New Reservation</a></li>
            <li><a href="reports.php">📈 Reports</a></li>
            <li><a href="admin-archive.php" class="active">🗃️ Archive Center</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <main class="main-content">
        <div class="dashboard-header">
            <h1>Archive Center</h1>
        </div>

        <div class="table-container" style="margin-bottom: 20px;">
            <div style="padding: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="tab-users" class="btn btn-primary" type="button" onclick="setArchiveTab('users')">Archived Users</button>
                <button id="tab-facilities" class="btn btn-secondary" type="button" onclick="setArchiveTab('facilities')">Archived Facilities</button>
            </div>
        </div>

        <div class="table-container" style="margin-bottom: 30px;">
            <div class="table-header">
                <h2 id="archive-title">Archived Users</h2>
            </div>
            <div id="archive-list"></div>
        </div>
    </main>

    <script src="js/database.js?v=20260303b"></script>
    <script src="js/auth.js?v=20260303b"></script>
    <script src="js/api.js?v=20260306f"></script>
    <script src="js/admin-archive.js?v=20260306b"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>
