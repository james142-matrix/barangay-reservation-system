<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Billing - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan</a>
</nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="barangay-staff-dashboard.php">📊 Dashboard</a></li>
            <li><a href="barangay-staff-requests.php">📋 Review Requests</a></li>
            <li><a href="facilities.php">🏛️ Facilities</a></li>
            <li><a href="barangay-staff-reserve.php">➕ New Reservation</a></li>
            <li><a href="billing.php" class="active">💳 Billing</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header">
            <h1>Billing Dashboard</h1>
            <div class="notification-wrap">
                <button id="notificationToggleBtn" class="btn notification-trigger" type="button">
                    🔔 Notifications <span id="notificationBadge" class="notification-dot-count"></span>
                </button>
                <div id="notificationPanel" class="notification-panel"></div>
            </div>
        </div>

        <div class="table-container billing-shell" style="max-width:1200px;">
            <div style="margin-bottom:20px; font-size:14px; color:#555;">
                <div class="billing-info-banner">
                    After your reservation is <em>approved</em> by barangay staff or admin, you can settle the
                    payment onsite at the barangay office. This system now supports <strong>onsite cash only</strong>.
                    Staff/Admin will record and confirm your payment after verification.
                </div>
            </div>
            <div id="billing-list">
                <!-- unpaid reservations will be shown here -->
            </div>
        </div>
    </main>

    <script src="js/database.js?v=20260309e"></script>
    <script src="js/auth.js?v=20260309d"></script>
    <script src="js/api.js?v=20260309d"></script>
    <script src="js/billing.js?v=20260303b"></script>
    <script src="js/responsive.js?v=20260309c"></script>
</body>
</html>









