# Barangay Reservation System

A staff and admin reservation system for Barangay Molugan.

This project is built with PHP, MySQL, and vanilla JavaScript. It is designed for onsite barangay operations where staff or admin process facility reservations, approvals, billing, and reports.

## What This System Does

The system helps your team:
- Accept reservation requests for barangay facilities
- Check schedule conflicts before saving
- Approve or reject requests
- Record onsite cash payments
- Manage facilities and staff accounts
- Send notifications for request updates
- Reset passwords through email verification code

## Who Can Access the System

Only these roles can log in:
- `admin`
- `barangay_staff`

Important:
- `resident` login is currently blocked.
- `signup.php` can create a pending staff account, but an admin must approve it first.

## Technology Stack

- Frontend pages: root `*.php` files
- Frontend scripts: `js/*.js`
- Backend API: `api/index.php`
- Database: MySQL (`database.sql`)
- Authentication: PHP session cookie (`barangay_session`)

## Main Features

- Role-based authentication and page access
- Reservation creation with overlap checking
- Approval/rejection workflow
- Onsite cash payment confirmation
- Facility management
- Admin user management
- Notification records
- Reports and exports
- Forgot-password email reset

## Main Pages

### Public Pages
- `index.php`
- `forgot-password.php`
- `signup.php`

### Shared Staff/Admin Pages
- `reserve.php`
- `billing.php`
- `facilities.php`
- `my-reservations.php`

### Barangay Staff Pages
- `barangay-staff-dashboard.php`
- `barangay-staff-requests.php`
- `barangay-staff-facilities.php`
- `barangay-staff-billing.php`

### Admin Pages
- `admin-dashboard.php`
- `admin-requests.php`
- `admin-facilities.php`
- `admin-billing.php`
- `admin-users.php`
- `reports.php`

## Quick Setup (XAMPP)

1. Create database `barangay` in phpMyAdmin.
2. Import `database.sql`.
3. Place project folder inside `C:\xampp\htdocs`.
4. Check database settings in `api/config.php`.
5. Open:
   `http://localhost/barangay-reservation-system/index.php`

Demo accounts:
- `admin / admin123`
- `staff1 / staff123`

## Forgot Password Email Setup

Configure one mail mode in `api/config.php`.

### Option 1: SMTP (simple setup)
- `mail_driver = smtp`
- `smtp_user = your Gmail`
- `smtp_pass = Gmail App Password`
- `smtp_from = your Gmail`
- Keep:
  - `smtp_host = smtp.gmail.com`
  - `smtp_port = 587`
  - `smtp_secure = tls`

### Option 2: Gmail API (OAuth2)
- `mail_driver = gmail_api`
- `gmail_api_client_id`
- `gmail_api_client_secret`
- `gmail_api_refresh_token`
- `gmail_api_sender`

Notes:
- Reset email goes to the user email saved in `users` table.
- If Gmail API is selected but credentials are empty, forgot-password returns config error.

## Common Workflow

1. Staff/admin logs in.
2. Staff/admin creates reservation.
3. Staff/admin approves or rejects request.
4. Staff/admin confirms cash payment after client pays onsite.
5. Admin checks users and reports.

## Documentation Map

- `QUICKSTART.md`: fastest local setup
- `HOW-TO-USE.md`: daily operation guide
- `ARCHITECTURE.md`: system design and layers
- `SYSTEM-FLOW.md`: step-by-step business flow
- `FULL-STACK-EXPLANATION.md`: browser-to-database behavior
- `DEPLOYMENT.md`: local and production deployment
- `VERIFICATION.md`: pre-demo and pre-release checks
- `COMPLETION.md`: completed scope summary
- `TODO.md`: remaining improvements

Last updated: 2026-03-07
