# How To Use

Daily usage guide for current onsite workflow.

## Login

1. Open `index.php`.
2. Login using a staff/admin account.
3. System redirects by role:
   - `admin` -> `admin-dashboard.php`
   - `barangay_staff` -> `barangay-staff-dashboard.php`

## Create Reservation (Staff/Admin)

1. Open `reserve.php`.
2. Select facility, date/time, and event details.
3. Enter client/resident name and contact details.
4. Submit request.
5. Request is saved as `pending`.

## Process Requests

1. Open `admin-requests.php` or `barangay-staff-requests.php`.
2. Review reservation details.
3. Approve or reject:
   - Approve sets `status = approved`.
   - Reject requires reason and sets `status = rejected`.
4. Resident/client notification is created.

## Billing

1. Open `admin-billing.php` or `barangay-staff-billing.php`.
2. Filter/search reservation billing rows.
3. For approved unpaid reservations, click `Confirm Cash`.
4. System sets:
   - `paymentStatus = cash`
   - `paymentMethod = onsite_cash`
   - `status = completed`

## Facility Management

- Staff/Admin can manage facilities in role-specific facilities pages.

## User Management (Admin)

- Admin opens `admin-users.php` to create, edit, and archive users.
- Allowed roles: `admin`, `barangay_staff`.

## Forgot Password

1. Open `forgot-password.php`.
2. Enter email and request 6-digit code.
3. Enter code and set new password.

Last updated: 2026-03-03
