<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Facilities - Barangay Molugan Staff</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="staff-facilities-page">
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Staff</a>
    </nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="barangay-staff-dashboard.php">📊 Dashboard</a></li>
            <li><a href="barangay-staff-requests.php">📋 Approval Requests</a></li>
            <li><a href="barangay-staff-billing.php">💳 Billing</a></li>
            <li><a href="barangay-staff-facilities.php" class="active">🏛️ Facilities</a></li>
            <li><a href="reserve.php">📝 New Reservation</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header staff-facilities-hero">
            <div>
                <h1>Facilities Overview</h1>
                <p>View all facilities and monitor capacity, pricing, and booking activity in one place.</p>
            </div>
            <div id="facilitiesQuickStats" class="staff-quick-stats">
                <div class="quick-stat-card">
                    <span class="quick-stat-label">Total</span>
                    <strong id="statTotalFacilities">0</strong>
                </div>
                <div class="quick-stat-card">
                    <span class="quick-stat-label">Available</span>
                    <strong id="statAvailableFacilities">0</strong>
                </div>
                <div class="quick-stat-card">
                    <span class="quick-stat-label">Unavailable</span>
                    <strong id="statUnavailableFacilities">0</strong>
                </div>
            </div>
        </div>

        <div id="facilitiesContainer" class="facilities-grid staff-facilities-grid">
            <!-- Cards will be loaded here -->
        </div>
    </main>

    <!-- Facility Details Modal -->
    <div id="facilityModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Facility Details</h2>
                <button class="close-modal" onclick="closeFacilityModal()">×</button>
            </div>
            <div class="modal-body" id="facilityModalBody"></div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeFacilityModal()">Close</button>
                <a href="reserve.php" class="btn btn-primary">New Reservation</a>
            </div>
        </div>
    </div>

    <script src="js/database.js?v=20260303b"></script>
    <script src="js/auth.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/barangay-staff-facilities.js?v=20260306b"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>




