# How To Use

This guide explains day-to-day usage in simple steps.

## 1. Login

1. Open `index.php`.
2. Enter username and password.
3. Click login.
4. The system redirects by role:
- `admin` -> `admin-dashboard.php`
- `barangay_staff` -> `barangay-staff-dashboard.php`

## 2. Create a Reservation (Staff/Admin)

1. Open `reserve.php`.
2. Select facility, date, start time, and end time.
3. Enter event details.
4. Enter client name and contact number.
5. Submit form.

What happens next:
- The reservation is saved as `pending`.
- The API checks schedule conflicts before saving.

## 3. Review Reservation Requests

Use:
- `admin-requests.php` (admin)
- `barangay-staff-requests.php` (staff)

Steps:
1. Open the request list.
2. Select a reservation.
3. Review facility, schedule, and event details.
4. Choose action:
- Approve -> status becomes `approved`
- Reject -> enter reason, status becomes `rejected`

System action:
- A notification entry is created for the related user.

## 4. Confirm Billing (Onsite Cash)

Use:
- `admin-billing.php`
- `barangay-staff-billing.php`

Steps:
1. Open billing list.
2. Find approved reservations that are unpaid.
3. After onsite payment is received, click `Confirm Cash`.

System updates:
- `paymentStatus = cash`
- `paymentMethod = onsite_cash`
- `status = completed`

## 5. Manage Facilities

Pages:
- `admin-facilities.php`
- `barangay-staff-facilities.php`

You can:
- Add facility
- Edit facility details (name, capacity, cost)
- Archive facility (soft delete)

## 6. Manage Users (Admin Only)

Page:
- `admin-users.php`

Admin can:
- Create users
- Edit users
- Archive users

Allowed roles for active login:
- `admin`
- `barangay_staff`

## 7. Check Reports (Admin)

Page:
- `reports.php`

Use this page to review reservation and billing information for operations and reporting.

## 8. Forgot Password

1. Open `forgot-password.php`.
2. Enter email.
3. Request verification code.
4. Check email for 6-digit code.
5. Enter code and new password.
6. Submit reset.

Important:
- Reset code expires in 10 minutes.

## Good Operating Practice

- Review requests quickly to avoid booking delays.
- Confirm payment only after actual cash receipt.
- Keep facility pricing and capacity updated.
- Archive inactive users instead of deleting records permanently.

Last updated: 2026-03-07
