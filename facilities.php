<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Browse Facilities - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css?v=20260309e">
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
            <li><a href="billing.php">💳 Billing</a></li>
            <li><a href="facilities.php" class="active">🏛️ Facilities</a></li>
            <li><a href="barangay-staff-reserve.php">➕ New Reservation</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header">
            <h1>Browse Our Facilities</h1>
            <div class="notification-wrap">
                <button id="notificationToggleBtn" class="btn notification-trigger" type="button">
                    🔔 Notifications <span id="notificationBadge" class="notification-dot-count"></span>
                </button>
                <div id="notificationPanel" class="notification-panel"></div>
            </div>
        </div>

        <div id="facilities-container" class="facilities-grid">
            <!-- Facilities will be loaded here -->
        </div>
    </main>

    <!-- Facility Detail Modal -->
    <div id="facilityModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Facility Details</h2>
                <button class="close-modal" onclick="closeFacilityModal()" type="button">×</button>
            </div>
            <div class="modal-body" id="modalBody">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeFacilityModal()" type="button">Close</button>
                <button class="btn btn-primary" onclick="goToReserve()" type="button">Make Reservation</button>
            </div>
        </div>
    </div>

    <script src="js/database.js?v=20260309e"></script>
    <script src="js/auth.js?v=20260309d"></script>
    <script src="js/api.js?v=20260309d"></script>
    <script src="js/facilities.js?v=20260309e"></script>
    <script src="js/responsive.js?v=20260309c"></script>
</body>
</html>








