# Deployment

## Environment Targets

- Local/dev: XAMPP + MySQL + PHP
- Production: Apache/Nginx + PHP + MySQL (HTTPS required)

## Local Deployment (XAMPP)

1. Import `database.sql` into `barangay` database.
2. Place project in `C:\xampp\htdocs\barangay-reservation-system`.
3. Update `api/config.php` database settings if needed.
4. Open `http://localhost/barangay-reservation-system/index.php`.

## Production Notes

- Use HTTPS only.
- Protect and rotate DB/SMTP secrets.
- Keep session cookies `httpOnly` and secure in HTTPS setup.
- Restrict CORS origin to known frontend host.
- Add backup + restore testing for MySQL.

## Release Checklist

- Verify admin/staff login.
- Verify reservation create/approve/reject.
- Verify billing cash confirmation.
- Verify user management (admin).
- Verify forgot-password email reset.
- Verify reports load and exports.

Last updated: 2026-03-03
