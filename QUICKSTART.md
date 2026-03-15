# Quick Start

Fastest local setup for the current PHP + MySQL version.

## Prerequisites

- XAMPP with Apache and MySQL
- Project path: `C:\xampp\htdocs\barangay-reservation-system`
- Access to `database.sql`

## 1. Start Services

1. Open XAMPP Control Panel.
2. Start `Apache`.
3. Start `MySQL`.

## 2. Create The Database

1. Open `http://localhost/phpmyadmin`.
2. Create database `barangay`.
3. Import `database.sql`.

Expected tables include:

- `users`
- `facilities`
- `reservations`
- `billing_transactions`
- `notifications`

## 3. Configure Environment

1. Copy `.env.example` to `.env`.
2. Set at least:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASS`

Typical XAMPP default:

- `DB_USER=root`
- `DB_PASS=` blank

## 4. Open The App

Browse to:

`http://localhost/barangay-reservation-system/index.php`

## 5. Sign In

- Admin: `admin / admin123`
- Staff: `staff1 / staff123`

## 6. Quick Smoke Test

1. Log in as `admin`.
2. Open `admin-reserve.php`.
3. Create a reservation with a valid schedule.
4. Open `admin-requests.php` and confirm it appears.
5. Open `admin-billing.php` and collect down payment or full payment.
6. Open `reports.php` and confirm data loads.
7. Open `admin-archive.php` and confirm the archive center loads.

## Common Problems

- DB connection error: check `.env` values.
- Blank/failed API responses: verify Apache and MySQL are both running.
- Login blocked: account may be pending approval or not an allowed role.
- Forgot-password not sending: mail settings in `.env` are incomplete.

Last updated: 2026-03-15
