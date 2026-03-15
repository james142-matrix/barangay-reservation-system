# How To Use

Day-to-day guide for the current web system.

## 1. Log In

1. Open `index.php`.
2. Enter username and password.
3. Approved accounts are redirected by role:
   - `admin` -> `admin-dashboard.php`
   - `barangay_staff` -> `barangay-staff-dashboard.php`

Important:

- Pending signup requests cannot log in until approved.
- Resident/client login is disabled.

## 2. Create A Reservation

Use:

- `admin-reserve.php`
- `barangay-staff-reserve.php`

Steps:

1. Select a facility.
2. Pick start date, optional end date, start time, and end time.
3. Choose event type.
4. Enter client name, email, phone, and event details.
5. Select payment option:
   - full payment
   - down payment
6. Add add-ons if needed.
7. Submit.

The system checks:

- required fields
- valid email and contact info
- facility capacity
- operating hours
- overnight / all-day / multi-day rules
- max duration
- schedule conflicts
- medical room detail requirement

## 3. Review Requests

Use:

- `admin-requests.php`
- `barangay-staff-requests.php`

You can:

- search and filter reservations
- open the reservation detail modal
- edit reservation details only while billing has not been acted on
- view reservation history/status

Current rule:

- once payment becomes `partial`, `paid`, `cash`, or the reservation is cancelled, detail edits are blocked

## 4. Collect Payments

Use:

- `admin-billing.php`
- `barangay-staff-billing.php`

What the billing page does:

- shows total paid revenue
- shows unpaid or partially paid reservations
- supports `Collect Down Payment` for first collection on down-payment reservations
- supports `Collect Balance` for remaining cash
- can cancel unpaid pending reservations

Status behavior:

- first collection on a down-payment reservation usually sets `paymentStatus=partial`
- full collection sets `paymentStatus=cash` or `paid` and `status=completed`
- cancellation sets `status=cancelled`

## 5. Manage Facilities

Pages:

- `admin-facilities.php`
- `barangay-staff-facilities.php`

Current behavior:

- admin can add, edit, and archive facilities
- staff can access the page, but management actions are blocked in the UI

## 6. Manage Users

Page:

- `admin-users.php`

Admin can:

- create active admin/staff accounts
- edit user details
- approve pending staff signup requests
- decline pending signup requests
- archive users

Protection rules:

- admin cannot archive their own admin account
- admin cannot archive the last active admin
- protected admin roles cannot be downgraded from the UI/API

## 7. Use Reports

Page:

- `reports.php`

Available actions:

- date-range filtering
- CSV export
- print-to-PDF export
- facility usage summary
- top clients
- status breakdown
- monthly trend

Note:

- some "In Billing" labels are legacy UI wording and may not reflect the main current status model

## 8. Use Archive Center

Page:

- `admin-archive.php`

Current web UI supports:

- archived users
- archived facilities

The API also supports archived reservations, but that restore flow is not exposed in the current web archive page.

## 9. Forgot Password

1. Open `forgot-password.php`.
2. Enter the account email.
3. Request the verification code.
4. Check email for the 6-digit code.
5. Enter the code and new password.
6. Submit the reset.

Current reset rules:

- reset code expires in 10 minutes
- mail configuration must be valid

Last updated: 2026-03-15
