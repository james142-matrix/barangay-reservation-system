# Barangay Reservation System

Staff/admin facility reservation and billing system for Barangay Molugan.

## Overview

This project is now fully PHP + MySQL based:
- Frontend pages: top-level `*.php`
- Frontend logic: `js/*.js` (vanilla JavaScript)
- Backend API: `api/index.php`
- Database schema/seed: `database.sql`
- Session auth: PHP session cookie (`barangay_session`)

Important current behavior:
- Login is restricted to `admin` and `barangay_staff`.
- Public resident self-signup is not part of the active onsite flow.

## Main Features

- Role-based login (`admin`, `barangay_staff`)
- Reservation creation with schedule conflict checking
- Request review and approve/reject workflow
- Billing tracking and onsite cash confirmation
- Facility management
- User management (admin)
- Notifications
- Reports and exports
- Forgot password via Gmail SMTP reset code

## Current Pages

### Public
- `index.php`
- `forgot-password.php`
- `signup.php` (legacy UI; API currently allows admin/staff account creation via admin flow)

### Shared Staff/Admin Operations
- `reserve.php`
- `billing.php`
- `facilities.php`
- `my-reservations.php`

### Barangay Staff
- `barangay-staff-dashboard.php`
- `barangay-staff-requests.php`
- `barangay-staff-facilities.php`
- `barangay-staff-billing.php`

### Admin
- `admin-dashboard.php`
- `admin-requests.php`
- `admin-facilities.php`
- `admin-billing.php`
- `admin-users.php`
- `reports.php`

## Quick Run (XAMPP)

1. Import `database.sql` to MySQL (`barangay` database).
2. Put this folder under XAMPP `htdocs`.
3. Verify DB config in `api/config.php`.
4. Open:
   `http://localhost/barangay-reservation-system/index.php`

Demo credentials:
- `admin / admin123`
- `staff1 / staff123`

## Gmail Setup (Forgot Password)

Set these in `api/config.php`:
- `smtp_user`
- `smtp_pass` (Gmail App Password)
- `smtp_from`

Keep:
- `smtp_host = smtp.gmail.com`
- `smtp_port = 587`
- `smtp_secure = tls`

## Documentation Index

- `QUICKSTART.md`
- `HOW-TO-USE.md`
- `ARCHITECTURE.md`
- `DEPLOYMENT.md`
- `FULL-STACK-EXPLANATION.md`
- `SYSTEM-FLOW.md` (new flow-to-flow guide)
- `VERIFICATION.md`
- `COMPLETION.md`
- `TODO.md`

Last updated: 2026-03-03
