<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Users - Barangay Molugan</title>
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
            <li><a href="admin-users.php" class="active">👥 Users</a></li>
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
            <h1>User Management</h1>
            <button class="btn btn-primary" onclick="openAddUserModal()">➕ Add New User</button>
        </div>

        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Users</h3>
                <div class="value" id="stat-total-users">0</div>
            </div>
            <div class="stat-card">
                <h3>Barangay Staff</h3>
                <div class="value" id="stat-staff">0</div>
            </div>
            <div class="stat-card pending">
                <h3>Admins</h3>
                <div class="value" id="stat-admins">0</div>
            </div>
            <div class="stat-card approved">
                <h3>Pending Approval</h3>
                <div class="value" id="stat-pending">0</div>
            </div>
        </div>

        <!-- Search and Filter -->
        <div class="table-container" style="margin-bottom: 20px;">
            <div style="padding: 15px 15px 0 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button id="tab-all" class="btn btn-secondary" type="button" onclick="setStatusTab('all')">All Users</button>
                <button id="tab-pending" class="btn btn-secondary" type="button" onclick="setStatusTab('pending')">Pending Signups</button>
                <button id="tab-approved" class="btn btn-secondary" type="button" onclick="setStatusTab('approved')">Approved Users</button>
            </div>
            <div style="padding: 15px; display: flex; gap: 15px; align-items: center;">
                <input 
                    type="text" 
                    id="searchInput" 
                    placeholder="Search by name, username, or email..." 
                    onkeyup="filterUsers()"
                    style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; flex: 1; max-width: 400px;">
                <select id="roleFilter" onchange="filterUsers()" style="padding: 8px 12px; border: 1px solid #e0e0e0; border-radius: 6px; width: 150px;">
                    <option value="">All Roles</option>
                    <option value="barangay_staff">Barangay Staff</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
        </div>

        <!-- Users Table -->
        <div class="table-container">
            <div class="table-header">
                <h2>All Users</h2>
            </div>
            <div id="users-list">
                <!-- Users will be loaded here -->
            </div>
        </div>
    </main>

    <!-- Add/Edit User Modal -->
    <div id="userModal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2 id="modalTitle">Add New User</h2>
                <button class="close-btn" onclick="closeUserModal()">&times;</button>
            </div>
            <form id="userForm" onsubmit="saveUser(event)">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Full Name *</label>
                    <input type="text" id="fullname" required style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Username *</label>
                    <input type="text" id="username" required style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Email *</label>
                    <input type="email" id="email" required style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Password *</label>
                    <input type="password" id="password" required placeholder="" style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Phone</label>
                    <input type="text" id="phone" style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Address</label>
                    <input type="text" id="address" style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 500;">Role *</label>
                    <select id="role" required style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 6px;">
                        <option value="barangay_staff">Barangay Staff</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="closeUserModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save User</button>
                </div>
            </form>
        </div>
    </div>

    <script src="js/password-policy.js?v=20260303b"></script>
    <script src="js/database.js?v=20260303b"></script>
    <script src="js/auth.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/admin-users.js?v=20260307b"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>




