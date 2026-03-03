# Quick Start

Fastest way to run the system on XAMPP.

## 1. Prepare Database

1. Open phpMyAdmin.
2. Create/select database `barangay`.
3. Import `database.sql`.

## 2. Configure API

1. Open `api/config.php`.
2. Confirm:
   - `db_host`
   - `db_port`
   - `db_name`
   - `db_user`
   - `db_pass`

## 3. Run in Browser

Open:
`http://localhost/barangay-reservation-system/index.php`

## 4. Login

- Admin: `admin / admin123`
- Staff: `staff1 / staff123`

## 5. Smoke Test

1. Login as staff or admin.
2. Create a reservation in `reserve.php`.
3. Approve/reject in `*-requests.php`.
4. Confirm cash payment in `*-billing.php`.
5. Check reports (`reports.php`, admin only).

Last updated: 2026-03-03
