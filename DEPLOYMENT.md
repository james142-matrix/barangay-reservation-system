# Deployment

This guide explains how to deploy the system for local use and production use.

## 1. Deployment Targets

- Local/Development: XAMPP + PHP + MySQL
- Production: Apache or Nginx + PHP + MySQL + HTTPS

## 2. Local Deployment (XAMPP)

1. Copy project to:
   `C:\xampp\htdocs\barangay-reservation-system`
2. Start Apache and MySQL from XAMPP.
3. Create database `barangay` in phpMyAdmin.
4. Import `database.sql`.
5. Open `api/config.php` and verify DB credentials.
6. Open:
   `http://localhost/barangay-reservation-system/index.php`

Expected local result:
- Login page loads and demo accounts can sign in.

## 3. Production Deployment Basics

1. Prepare Linux/Windows server with PHP and MySQL.
2. Deploy project files to web root.
3. Configure virtual host / site root.
4. Import `database.sql` into production DB.
5. Set production DB credentials in `api/config.php`.
6. Configure SMTP/Gmail settings for forgot-password emails.
7. Enable HTTPS with valid SSL certificate.

## 4. Security Requirements (Production)

- Use HTTPS only.
- Use strong database and SMTP passwords.
- Restrict DB user permissions to required operations.
- Keep session cookie secure and `httpOnly` under HTTPS.
- Restrict CORS origin to known frontend host.
- Disable debug output in production.
- Regularly back up database and test restore process.

## 5. Post-Deployment Validation

Check these before go-live:
- Admin and staff login works
- Reservation create works
- Approve/reject request works
- Confirm cash payment works
- User management (admin) works
- Forgot-password email works
- Reports and exports load successfully

## 6. Maintenance Recommendations

- Keep daily DB backups.
- Track config changes in deployment notes.
- Rotate sensitive credentials regularly.
- Re-run verification checklist after major updates.

Last updated: 2026-03-07
