<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Make Reservation - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- Navbar -->
    <nav class="navbar">
        <a href="#" class="navbar-brand" id="navBrand">🏛️ Barangay Molugan</a>
</nav>

    <!-- Sidebar -->
    <aside class="sidebar">
        <ul class="sidebar-menu">
            <li><a href="#" id="nav-dashboard">📊 Dashboard</a></li>
            <li><a href="#" id="nav-requests">📋 Approval Requests</a></li>
            <li><a href="#" id="nav-billing">💳 Billing</a></li>
            <li style="display:none;" id="nav-users-item"><a href="#" id="nav-users">👥 Users</a></li>
            <li><a href="#" id="nav-facilities">🏛️ Facilities</a></li>
            <li><a href="reserve.php" class="active">📝 New Reservation</a></li>
            <li style="display:none;" id="nav-reports-item"><a href="#" id="nav-reports">📈 Reports</a></li>
            <li><a href="#" onclick="logout()">🚪 Logout</a></li>
        </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
        <div class="dashboard-header">
            <h1>Create New Reservation</h1>
            <div class="notification-wrap">
                <button id="notificationToggleBtn" class="btn notification-trigger" type="button">
                    🔔 Notifications <span id="notificationBadge" class="notification-dot-count"></span>
                </button>
                <div id="notificationPanel" class="notification-panel"></div>
            </div>
        </div>

        <div class="reservation-layout">
            <div class="table-container reservation-form-card">
                <div style="padding: 30px;">
                    <form onsubmit="submitReservation(event)">
                        <div class="form-group">
                            <label for="facility">Select Facility *</label>
                            <select id="facility" required>
                                <option value="">-- Choose a Facility --</option>
                            </select>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="eventDate">Start Date *</label>
                                <input type="date" id="eventDate" required>
                            </div>
                            <div class="form-group">
                                <label for="eventEndDate">End Date *</label>
                                <input type="date" id="eventEndDate" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="startTime">Start Time *</label>
                                <input type="time" id="startTime" required>
                                <small id="startTimeDisplay" style="color:#666;">-</small>
                            </div>
                            <div class="form-group">
                                <label for="endTime">End Time *</label>
                                <input type="time" id="endTime" required>
                                <small id="endTimeDisplay" style="color:#666;">-</small>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="eventType">Event Type *</label>
                            <select id="eventType" required>
                                <option value="">-- Select Event Type --</option>
                                <option value="Birthday">Birthday Party</option>
                                <option value="Wedding">Wedding</option>
                                <option value="Conference">Conference</option>
                                <option value="Community">Community Event</option>
                                <option value="Sports">Sports Activity</option>
                                <option value="Training">Training/Workshop</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="expectedGuests">Expected Guests *</label>
                            <input type="number" id="expectedGuests" min="1" required>
                        </div>

                        <div class="form-group">
                            <label for="eventDescription">Event Description</label>
                            <textarea id="eventDescription" rows="4" placeholder="Describe your event..."></textarea>
                        </div>

                        <div class="form-group">
                            <label for="clientName">Client / Resident Name *</label>
                            <input type="text" id="clientName" required placeholder="Enter full name of client" pattern="[A-Za-z .'-]+" title="Letters and spaces only">
                        </div>

                        <div class="form-group">
                            <label for="contactPerson">Contact Person *</label>
                            <input type="text" id="contactPerson" required pattern="[A-Za-z .'-]+" title="Letters and spaces only">
                        </div>

                        <div class="form-group">
                            <label for="contactPhone">Contact Phone *</label>
                            <input type="tel" id="contactPhone" required inputmode="numeric" maxlength="15" pattern="[0-9]{7,15}" title="Numbers only (7-15 digits)">
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="chairsCount">Chairs (Qty)</label>
                                <input type="number" id="chairsCount" min="0" step="1" value="0">
                            </div>
                            <div class="form-group">
                                <label for="electronicsCount">Electronics (Qty)</label>
                                <input type="number" id="electronicsCount" min="0" step="1" value="0">
                            </div>
                        </div>
                        <div style="margin-top:-8px; margin-bottom:14px;">
                            <small style="color:#777;">
                                Optional add-ons for billing only. Rate: ₱10 per chair, ₱150 per electronic unit. Leave 0 if none.
                            </small>
                        </div>

                        <div class="form-group" id="medicalRoomDetailsGroup" style="display:none;">
                            <label for="medicalRoomDetails">Medical Room (Specific Room/Need)</label>
                            <input type="text" id="medicalRoomDetails" placeholder="Example: First aid room A / checkup area">
                        </div>

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

                        <div class="reservation-actions">
                            <button type="submit" class="btn btn-primary">Submit Reservation</button>
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
                        <p style="color: #888; font-size: 12px; margin-top: 10px;">Cash payment requires staff/admin confirmation</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <script src="js/database.js?v=20260303b"></script>
    <script src="js/auth.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/reserve.js?v=20260303b"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>





