<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservation Records - Barangay Molugan Staff</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand">🏛️ Barangay Molugan - Staff</a>
</nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="barangay-staff-dashboard.php">📊 Dashboard</a></li>
            <li><a href="barangay-staff-requests.php">📋 Review Requests</a></li>
            <li><a href="billing.php">💳 Billing</a></li>
            <li><a href="facilities.php">🏛️ Facilities</a></li>
            <li><a href="barangay-staff-reserve.php">➕ New Reservation</a></li>
            <li><a href="my-reservations.php" class="active">📋 Reservation Records</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header">
            <h1>Reservation Records</h1>
            <div style="display: flex; gap: 10px; align-items: center;">
                <div class="notification-wrap">
                    <button id="notificationToggleBtn" class="btn notification-trigger" type="button">
                        🔔 Notifications <span id="notificationBadge" class="notification-dot-count"></span>
                    </button>
                    <div id="notificationPanel" class="notification-panel"></div>
                </div>
                <a href="barangay-staff-reserve.php" class="btn btn-primary">➕ New Reservation</a>
            </div>
        </div>

        <!-- Filter  -->
        <div class="table-container" style="margin-bottom: 20px;">
            <div style="padding: 15px; display: flex; gap: 15px; align-items: center;">
                <label for="statusFilter" style="font-weight: 500;">Filter by Status:</label>
                <select id="statusFilter" onchange="filterReservations()" style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; width: 200px;">
                    <option value="">All Reservations</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
                <label for="paymentFilter" style="font-weight: 500;">Payment:</label>
                <select id="paymentFilter" onchange="filterReservations()" style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; width: 180px;">
                    <option value="">Any</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="cash">Cash</option>
                </select>
            </div>
        </div>

        <!-- Reservations Table -->
        <div class="table-container">
            <div id="reservations-list">
                <!-- Reservations will be loaded here -->
            </div>
        </div>
    </main>

    <!-- Reservation Detail Modal -->
    <div id="detailModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Reservation Details</h2>
                <button class="close-modal" onclick="closeDetailModal()">×</button>
            </div>
            <div class="modal-body" id="detailBody">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeDetailModal()">Close</button>
                <button class="btn btn-success" id="payBtnModal" onclick="window.location.href='billing.php'" style="display:none;">Pay Now</button>
                <button class="btn btn-danger" id="cancelBtnModal" onclick="cancelReservation()" style="display:none;">Cancel Reservation</button>
            </div>
        </div>
    </div>

    <!-- include API helper to allow backend calls -->
    <script src="js/api.js?v=20260309d"></script>
    <script src="js/database.js?v=20260309e"></script>
    <script src="js/auth.js?v=20260309d"></script>
    <script src="js/my-reservations.js?v=20260303b"></script>
    <script src="js/responsive.js?v=20260309c"></script>
</body>
</html>









