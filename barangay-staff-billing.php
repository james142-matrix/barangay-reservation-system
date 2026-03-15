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
    <title>Payments and Billing Management - Barangay Molugan Staff</title>
    <link rel="stylesheet" href="css/style.css?v=<?php echo urlencode((string) filemtime(__DIR__ . '/css/style.css')); ?>">
    <style>
        .billing-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 28px;
        }
        .billing-stat-card {
            background: white;
            border-radius: 12px;
            padding: 22px 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            border-top: 4px solid #e83e8c;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .billing-stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }
        .billing-stat-card.revenue  { border-top-color: #28a745; }
        .billing-stat-card.pending  { border-top-color: #ffa500; }
        .billing-stat-card.online   { border-top-color: #e83e8c; }
        .billing-stat-card.cash     { border-top-color: #17a2b8; }
        .billing-stat-card h4 { font-size: 13px; color: #888; font-weight: 500; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .billing-stat-card .stat-value { font-size: 26px; font-weight: 700; }
        .billing-stat-card.revenue  .stat-value { color: #28a745; }
        .billing-stat-card.pending  .stat-value { color: #ffa500; }
        .billing-stat-card.online   .stat-value { color: #e83e8c; }
        .billing-stat-card.cash     .stat-value { color: #17a2b8; }

        .filter-bar {
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            align-items: flex-end;
        }
        .filter-bar .filter-group { display: flex; flex-direction: column; gap: 4px; }
        .filter-bar label { font-size: 12px; color: #666; font-weight: 500; }
        .filter-bar input,
        .filter-bar select {
            padding: 8px 12px;
            border: 1.5px solid #e0e0e0;
            border-radius: 8px;
            font-size: 13px;
            background: #fafafa;
            min-width: 160px;
        }
        .filter-bar input:focus,
        .filter-bar select:focus { outline: none; border-color: #e83e8c; background: white; }
        .filter-bar .filter-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }

        .filtered-revenue-bar {
            background: linear-gradient(135deg, #e83e8c 0%, #c2185b 100%);
            color: white;
            border-radius: 10px;
            padding: 12px 20px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
        }
        .filtered-revenue-bar strong { font-size: 18px; }

        #billingDetailModal .modal-content { max-width: 640px; }

        @media (max-width: 768px) {
            .filtered-revenue-bar {
                flex-direction: column;
                align-items: flex-start;
                gap: 6px;
            }
        }
    </style>
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
            <li><a href="barangay-staff-billing.php" class="active">💳 Payments & Billing</a></li>
            <li><a href="barangay-staff-facilities.php">🏛️ Facilities</a></li>
            <li><a href="barangay-staff-reserve.php">➕ New Reservation</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header">
            <h1>💳 Payments and Billing Management</h1>
            <button class="btn btn-secondary" onclick="exportBillingCSV()" style="display:flex; align-items:center; gap:6px;">
                📥 Export CSV
            </button>
        </div>

        <!-- Stats -->
        <div class="billing-stats">
            <div class="billing-stat-card revenue">
                <h4>Total Revenue Collected</h4>
                <div class="stat-value" id="stat-revenue">₱0.00</div>
            </div>
            <div class="billing-stat-card pending">
                <h4>Pending Payments</h4>
                <div class="stat-value" id="stat-pending-payment">0</div>
            </div>
            <div class="billing-stat-card cash">
                <h4>Cash Payments</h4>
                <div class="stat-value" id="stat-cash-paid">0</div>
            </div>
        </div>

        <!-- Filters -->
        <div class="filter-bar">
            <div class="filter-group">
                <label for="billingSearch">Search</label>
                <input type="text" id="billingSearch" placeholder="Client name, username, facility…" oninput="filterBillingTable()">
            </div>
            <div class="filter-group">
                <label for="paymentFilter">Payment Status</label>
                <select id="paymentFilter" onchange="filterBillingTable()">
                    <option value="">All Payments</option>
                    <option value="pending">Unpaid</option>
                    <option value="cash">Cash Paid</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="resvStatusFilter">Reservation Status</label>
                <select id="resvStatusFilter" onchange="filterBillingTable()">
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="dateFrom">Event Date From</label>
                <input type="date" id="dateFrom" onchange="filterBillingTable()">
            </div>
            <div class="filter-group">
                <label for="dateTo">Event Date To</label>
                <input type="date" id="dateTo" onchange="filterBillingTable()">
            </div>
            <div class="filter-actions">
                <button class="btn btn-secondary btn-small" onclick="clearFilters()">✕ Clear</button>
            </div>
        </div>

        <!-- Filtered Revenue Summary -->
        <div class="filtered-revenue-bar">
            <span>Revenue from filtered results</span>
            <strong id="filtered-revenue">₱0.00</strong>
        </div>

        <!-- Billing Table -->
        <div class="table-container">
            <div id="billing-table-container">
                <!-- Rows rendered by admin-billing.js -->
            </div>
        </div>
    </main>

    <!-- Billing Detail Modal -->
    <div id="billingDetailModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>📋 Reservation & Payment Details</h2>
                <button class="close-modal" onclick="closeBillingDetailModal()">×</button>
            </div>
            <div class="modal-body" id="billingDetailBody">
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeBillingDetailModal()">Close</button>
                <button class="btn btn-danger" id="modalCancelReservationBtn" style="display:none;" type="button">✖ Cancel Reservation</button>
                <button class="btn btn-success" id="modalConfirmCashBtn" style="display:none;">💵 Confirm Cash Payment</button>
            </div>
        </div>
    </div>

    <script src="js/database.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/database.js')); ?>"></script>
    <script src="js/auth.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/auth.js')); ?>"></script>
    <script src="js/api.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/api.js')); ?>"></script>
    <script src="js/barangay-staff-billing.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/barangay-staff-billing.js')); ?>"></script>
    <script src="js/responsive.js?v=<?php echo urlencode((string) filemtime(__DIR__ . '/js/responsive.js')); ?>"></script>
</body>
</html>











