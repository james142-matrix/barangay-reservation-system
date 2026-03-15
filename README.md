# Barangay Reservation System

Barangay Molugan's facility reservation system for onsite staff and admin operations.

The current web app is built with PHP, MySQL, and vanilla JavaScript. It supports staff login, admin approvals, reservation intake, billing, reports, notifications, archives, and password recovery.

## Current Stack

- Web pages: root `*.php` files
- Frontend scripts: `js/*.js`
- API: `api/index.php`
- Database: MySQL via `database.sql`
- Auth: PHP sessions with CSRF token + tab-scoped session support
- Optional mobile client: `mobile_app/` Flutter project

## Supported Roles

- `admin`
- `barangay_staff`

Notes:
- `resident` accounts exist in normalization logic but login is intentionally blocked.
- `signup.php` creates a pending `barangay_staff` request that must be approved by an admin.

## Main Web Pages

### Public

- `index.php`
- `signup.php`
- `forgot-password.php`

### Admin

- `admin-dashboard.php`
- `admin-requests.php`
- `admin-billing.php`
- `admin-facilities.php`
- `admin-users.php`
- `admin-reserve.php`
- `admin-archive.php`
- `reports.php`

### Barangay Staff

- `barangay-staff-dashboard.php`
- `barangay-staff-requests.php`
- `barangay-staff-billing.php`
- `barangay-staff-facilities.php`
- `barangay-staff-reserve.php`

### Shared / Legacy Support Pages

- `reserve-shared.php`
- `facilities.php`
- `billing.php`
- `my-reservations.php`

## What The System Currently Does

- Logs in approved admin and staff accounts only
- Applies login rate limiting and idle session timeout
- Creates reservations with:
  - overlap checking
  - facility operating hours
  - overnight / all-day / multi-day rules
  - max duration limits
  - facility-specific event types
  - optional add-ons and down-payment setup
- Lets admin/staff review reservation requests
- Locks reservation detail edits after billing action starts
- Collects onsite cash for down payment or remaining balance
- Sends notifications for operational events
- Emails forgot-password reset codes
- Emails payment receipts after partial or full payment
- Lets admin approve signup requests and manage users
- Uses archive/restore flows for users, facilities, and reservations

## Important Current Behavior

- Facilities can be viewed by staff, but create/edit/archive actions are currently admin-only.
- Reservation workflow now mainly uses `pending`, `completed`, and `cancelled`.
- Billing is handled from the billing page by updating payment fields, not by a separate approval step.
- The reports page still contains some legacy `billing`-status labels in its UI logic, so "In Billing" metrics may stay `0` unless old records exist with that status.

## Database Highlights

Core tables:

- `users`
- `facilities`
- `reservations`
- `billing_transactions`
- `notifications`
- `password_reset_codes`
- `auth_login_throttle`
- `schema_migrations`

Facility rule columns:

- `opening_time`
- `closing_time`
- `allows_overnight`
- `allows_all_day`
- `allows_multi_day`
- `max_duration_hours`

## Local Setup

1. Put the project in `C:\xampp\htdocs\barangay-reservation-system`.
2. Create database `barangay`.
3. Import `database.sql`.
4. Copy `.env.example` to `.env`.
5. Start Apache and MySQL in XAMPP.
6. Open `http://localhost/barangay-reservation-system/index.php`.

Demo accounts:

- `admin / admin123`
- `staff1 / staff123`

## Mail Setup

Use one of these modes in `.env`:

- `MAIL_DRIVER=smtp`
- `MAIL_DRIVER=gmail_api`

Forgot-password and payment receipt emails depend on valid mail configuration.

## Documentation Map

- `QUICKSTART.md`
- `HOW-TO-USE.md`
- `ARCHITECTURE.md`
- `SYSTEM-FLOW.md`
- `DEPLOYMENT.md`
- `VERIFICATION.md`
- `SIA-PROJECT-DOCUMENTATION.md`
- `mobile_app/README.md`
- `mobile_app/TEST_CHECKLIST.md`

Last updated: 2026-03-15
