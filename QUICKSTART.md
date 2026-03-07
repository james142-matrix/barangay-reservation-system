# Quick Start

This is the fastest setup guide for local testing using XAMPP.

## Goal

After finishing this guide, you should be able to:
- Open the login page
- Sign in as admin or staff
- Create and process at least one reservation

## Prerequisites

- XAMPP installed (`Apache` + `MySQL`)
- Project folder at:
  `C:\xampp\htdocs\barangay-reservation-system`
- `database.sql` file available in the project root

## Step 1: Start Services

1. Open XAMPP Control Panel.
2. Start `Apache`.
3. Start `MySQL`.

## Step 2: Prepare Database

1. Open phpMyAdmin (`http://localhost/phpmyadmin`).
2. Create database named `barangay`.
3. Select the `barangay` database.
4. Import `database.sql`.

Expected result:
- Tables like `users`, `facilities`, and `reservations` are created.

## Step 3: Configure API Database Connection

1. Open `api/config.php`.
2. Confirm database values:
- `db_host`
- `db_port`
- `db_name`
- `db_user`
- `db_pass`

Tip:
- On most XAMPP setups, `db_user` is `root` and password may be blank.

## Step 4: Open the System

Open in browser:
`http://localhost/barangay-reservation-system/index.php`

## Step 5: Login (Demo Accounts)

- Admin account: `admin / admin123`
- Staff account: `staff1 / staff123`

## Step 6: Quick Functional Test

1. Login as staff or admin.
2. Go to `reserve.php` and create a reservation.
3. Open requests page (`admin-requests.php` or `barangay-staff-requests.php`).
4. Approve or reject the request.
5. Open billing page and confirm cash payment if approved.
6. Open `reports.php` (admin) to confirm reporting data loads.

## If Something Fails

- Re-check `api/config.php` database credentials.
- Confirm Apache and MySQL are both running.
- Confirm `database.sql` was imported to `barangay`.
- Confirm URL includes project folder name exactly.

Last updated: 2026-03-07
