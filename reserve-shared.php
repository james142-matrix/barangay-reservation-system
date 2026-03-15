<?php
$roleHintSource = defined('RESERVE_ROLE_HINT') ? RESERVE_ROLE_HINT : ($_GET['role'] ?? '');
$roleHint = strtolower(trim((string)$roleHintSource));
$isAdminHint = $roleHint === 'admin';
// Default to staff links to avoid admin-link flash for staff users on mobile.
$defaultLinks = $isAdminHint
    ? [
        'dashboard' => 'admin-dashboard.php',
        'requests' => 'admin-requests.php',
        'billing' => 'admin-billing.php',
        'facilities' => 'admin-facilities.php',
        'users' => 'admin-users.php',
        'reports' => 'reports.php',
        'archive' => 'admin-archive.php',
        'self' => 'admin-reserve.php',
        'brand' => '🏛️ Barangay Molugan - Admin',
      ]
    : [
        'dashboard' => 'barangay-staff-dashboard.php',
        'requests' => 'barangay-staff-requests.php',
        'billing' => 'barangay-staff-billing.php',
        'facilities' => 'barangay-staff-facilities.php',
        'users' => '',
        'reports' => '',
        'archive' => '',
        'self' => 'barangay-staff-reserve.php',
        'brand' => '🏛️ Barangay Molugan - Staff',
      ];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Make Reservation - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css?v=20260311c">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand" id="navBrand"><?php echo htmlspecialchars($defaultLinks['brand']); ?></a>
</nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="<?php echo htmlspecialchars($defaultLinks['dashboard']); ?>" id="nav-dashboard">📊 Dashboard</a></li>
            <li><a href="<?php echo htmlspecialchars($defaultLinks['requests']); ?>" id="nav-requests">📋 Review Requests</a></li>
            <li><a href="<?php echo htmlspecialchars($defaultLinks['billing']); ?>" id="nav-billing">💳 Payments & Billing</a></li>
            <li id="nav-users-item" style="<?php echo $isAdminHint ? '' : 'display:none;'; ?>"><a href="<?php echo htmlspecialchars($defaultLinks['users']); ?>" id="nav-users">👥 Users</a></li>
            <li><a href="<?php echo htmlspecialchars($defaultLinks['facilities']); ?>" id="nav-facilities">🏛️ Facilities</a></li>
            <li><a href="<?php echo htmlspecialchars($defaultLinks['self']); ?>" class="active">➕ New Reservation</a></li>
            <li id="nav-reports-item" style="<?php echo $isAdminHint ? '' : 'display:none;'; ?>"><a href="<?php echo htmlspecialchars($defaultLinks['reports']); ?>" id="nav-reports">📈 Reports</a></li>
            <li id="nav-archive-item" style="<?php echo $isAdminHint ? '' : 'display:none;'; ?>"><a href="<?php echo htmlspecialchars($defaultLinks['archive']); ?>" id="nav-archive">🗃️ Archive Center</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header">
            <div class="dashboard-heading">
                <h1>Create New Reservation</h1>
                <p class="dashboard-subtitle">Enter client details, set the booking schedule, and review the live cost summary before billing.</p>
            </div>
        </div>

        <div class="reservation-layout">
            <div class="table-container reservation-form-card">
                <div class="reservation-form-shell">
                    <div class="reservation-form-title">
                        <h2>Facility Reservation Request Form</h2>
                        <p>Please complete all required details for barangay facility reservation.</p>
                    </div>
                    <form onsubmit="submitReservation(event)">
                        <section class="reservation-section">
                            <h3>Applicant Information</h3>
                            <div class="form-group">
                                <label for="clientName">Client Name *</label>
                                <input type="text" id="clientName" required maxlength="100" placeholder="Enter full name" pattern="[A-Za-z .'-]+" title="Letters, spaces, apostrophe, dot, and hyphen only">
                            </div>
                            <div class="form-group">
                                <label for="clientAddress">Client Address *</label>
                                <textarea id="clientAddress" rows="2" required maxlength="180" placeholder="Complete barangay/city address"></textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="contactPhone">Contact Number *</label>
                                    <input type="tel" id="contactPhone" required inputmode="numeric" maxlength="12" placeholder="09171234567" pattern="(?:09[0-9]{9}|639[0-9]{9})" title="Use a valid PH mobile number">
                                </div>
                                <div class="form-group">
                                    <label for="clientEmail">Email Address *</label>
                                    <input type="email" id="clientEmail" required maxlength="120" placeholder="name@gmail.com">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="organization">Organization (Optional)</label>
                                <input type="text" id="organization" maxlength="120" placeholder="School, Association, Company, or Group">
                            </div>
                        </section>

                        <section class="reservation-section reservation-section-emphasis">
                            <h3>Reservation Details</h3>
                            <p class="reservation-section-lead">Start with the facility, event type, and schedule. These details drive availability, rules, and pricing.</p>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="facility">Facility Requested *</label>
                                    <select id="facility" required>
                                        <option value="">-- Choose a Facility --</option>
                                    </select>
                                    <div id="facilityRulesBox" class="facility-rules-box" style="display:none;">
                                        <div class="facility-rules-title">Facility Rules</div>
                                        <ul id="facilityRulesList" class="facility-rules-list"></ul>
                                        <small id="facilityRulesHint" class="field-helper"></small>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="eventType">Event Type *</label>
                                    <select id="eventType" required>
                                        <option value="">-- Select Facility First --</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group" id="purposeOfEventGroup" style="display:none;">
                                <label for="purposeOfEvent">Purpose of Event</label>
                                <input type="text" id="purposeOfEvent" placeholder="Please specify the event purpose">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="eventDate">Reservation Start Date *</label>
                                    <input type="date" id="eventDate" required>
                                </div>
                                <div class="form-group">
                                    <label for="eventEndDate">Reservation End Date *</label>
                                    <input type="date" id="eventEndDate" required>
                                    <small class="field-helper" id="eventEndDateHelper">For multi-day reservation, set a later end date.</small>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="expectedGuests">Expected Number of Participants *</label>
                                <input type="number" id="expectedGuests" min="1" step="1" required>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="startTime">Start Time *</label>
                                    <input type="time" id="startTime" required>
                                    <small id="startTimeDisplay" class="field-helper">-</small>
                                </div>
                                <div class="form-group">
                                    <label for="endTime">End Time *</label>
                                    <input type="time" id="endTime" required>
                                    <small id="endTimeDisplay" class="field-helper">-</small>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="eventDescription">Additional Notes / Description</label>
                                <textarea id="eventDescription" rows="3" placeholder="Other details for reviewers (optional)"></textarea>
                            </div>

                            <div class="form-group" id="facilityAddOnsGroup" style="display:none;">
                                <label>Facility Add-ons (Optional)</label>
                                <div id="facilityAddOnsContainer"></div>
                                <small class="field-helper">Add-ons are configured per facility.</small>
                            </div>

                            <div class="form-group" id="medicalRoomDetailsGroup" style="display:none;">
                                <label for="medicalRoomDetails">Medical Room (Specific Room/Need)</label>
                                <input type="text" id="medicalRoomDetails" placeholder="Example: first aid room A / checkup area">
                            </div>
                        </section>

                        <section class="reservation-section">
                            <h3>Payment Information</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="paymentOption">Payment Option *</label>
                                    <select id="paymentOption" required>
                                        <option value="full">Full Payment</option>
                                        <option value="down_payment">Down Payment</option>
                                    </select>
                                </div>
                                <div class="form-group" id="downPaymentGroup" style="display:none;">
                                    <label for="downPaymentAmount">Down Payment Amount</label>
                                    <input type="number" id="downPaymentAmount" min="0" step="0.01" value="0">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Reservation Fee</label>
                                    <input type="text" id="reservationFee" value="₱0" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Amount to Pay</label>
                                    <input type="text" id="amountToPay" value="₱0" readonly>
                                </div>
                            </div>
                        </section>

                        <div class="reservation-actions">
                            <button type="submit" class="btn btn-primary">Submit Reservation Request</button>
                            <a href="#" id="cancelLink" class="btn btn-secondary">Cancel</a>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Cost Summary Sidebar -->
            <div class="table-container reservation-summary-card">
                <div class="table-header">
                    <h2>Cost Summary</h2>
                </div>
                <div style="padding: 20px;">
                    <div class="summary-guide" id="summaryGuide">
                        <strong>Next step:</strong> Select a facility, event date, and time range to calculate the reservation fee.
                    </div>
                    <div class="summary-preview">
                        <div class="summary-preview-item">
                            <span class="summary-preview-label">Facility</span>
                            <strong id="summaryFacility">Not selected</strong>
                        </div>
                        <div class="summary-preview-item">
                            <span class="summary-preview-label">Schedule</span>
                            <strong id="summarySchedule">No date and time selected yet</strong>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0;">
                        <p style="color: #888; font-size: 14px; margin-bottom: 5px;">Facility Price</p>
                        <p style="font-size: 20px; font-weight: 700; color: #e83e8c;" id="facilityPrice">₱0</p>
                    </div>
                    <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0;">
                        <p style="color: #888; font-size: 14px; margin-bottom: 5px;">Duration</p>
                        <p style="font-size: 14px;" id="duration">-</p>
                    </div>
                    <div style="background: #f5f7fa; padding: 15px; border-radius: 8px;">
                        <p style="color: #888; font-size: 12px; margin-bottom: 8px;">TOTAL COST</p>
                        <p style="font-size: 24px; font-weight: 700; color: #e83e8c;" id="totalCost">₱0</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="js/database.js?v=20260309e"></script>
    <script src="js/auth.js?v=20260309d"></script>
    <script src="js/api.js?v=20260309d"></script>
    <script src="js/reserve.js?v=20260311h"></script>
    <script src="js/responsive.js?v=20260309c"></script>
</body>
</html>










