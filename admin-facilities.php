<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Facilities - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="staff-facilities-page">
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
            <li><a href="admin-facilities.php" class="active">🏛️ Facilities</a></li>
            <li><a href="reserve.php">📝 New Reservation</a></li>
            <li><a href="reports.php">📈 Reports</a></li>
            <li><a href="admin-archive.php">🗃️ Archive Center</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header staff-facilities-hero">
            <div>
                <h1>Facilities Overview</h1>
                <p>Manage facility availability, pricing, event types, and booking activity with full admin control.</p>
            </div>
            <div class="staff-hero-actions">
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
                <button class="btn btn-primary" onclick="openAddFacilityModal()">+ Add New Facility</button>
            </div>
        </div>

        <!-- Facilities List -->
        <div id="facilities-list" class="facilities-grid staff-facilities-grid">
            <!-- Facilities cards will be loaded here -->
        </div>
    </main>

    <!-- Add/Edit Facility Modal -->
    <div id="facilityModal" class="modal facility-edit-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Add New Facility</h2>
                <button class="close-modal" onclick="closeFacilityModal()">×</button>
            </div>
            <div class="modal-body">
                <form id="facilityForm">
                    <div class="form-group">
                        <label for="facilityName">Facility Name</label>
                        <input type="text" id="facilityName" required>
                    </div>

                    <div class="form-group">
                        <label for="facilityIcon">Icon/Emoji</label>
                        <input type="text" id="facilityIcon" placeholder="e.g., 🏛️" maxlength="3">
                    </div>

                    <div class="form-group">
                        <label for="facilityCapacity">Capacity (persons)</label>
                        <input type="number" id="facilityCapacity" required min="1">
                    </div>

                    <div class="form-group">
                        <label for="facilityPrice">Price per Event (₱)</label>
                        <input type="number" id="facilityPrice" required min="0" step="0.01">
                    </div>

                    <div class="form-group">
                        <label for="facilityDescription">Description</label>
                        <textarea id="facilityDescription" rows="4"></textarea>
                    </div>

                    <div class="form-group">
                        <label>Event Types</label>
                        <div id="facilityEventTypeRows" class="facility-addon-editor"></div>
                        <button type="button" class="btn btn-secondary btn-small" id="addFacilityEventTypeBtn">+ Add Event Type</button>
                    </div>

                    <div class="form-group">
                        <label>Facility Add-ons</label>
                        <div id="facilityAddOnsRows" class="facility-addon-editor"></div>
                        <button type="button" class="btn btn-secondary btn-small" id="addFacilityAddOnBtn">+ Add Add-on</button>
                        <small style="color:#777; display:block; margin-top:8px;">No special format needed. Just fill Name, Price, and Unit.</small>
                    </div>

                    <div class="form-group">
                        <label for="facilityStatus">Status</label>
                        <select id="facilityStatus">
                            <option value="available">Available</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeFacilityModal()">Cancel</button>
                <button class="btn btn-primary" onclick="saveFacility()">Save Facility</button>
            </div>
        </div>
    </div>

    <script src="js/database.js?v=20260303b"></script>
    <script src="js/auth.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/admin-facilities.js?v=20260306e"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>




