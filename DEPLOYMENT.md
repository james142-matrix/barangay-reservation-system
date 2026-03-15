# Deployment

Deployment notes for the current PHP/XAMPP-style setup.

## 1. Required Environment

Create `.env` from `.env.example` and set:

- `APP_ENV`
- `APP_DEBUG`
- `APP_TIMEZONE`
- `APP_LOG_DIR`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `SESSION_NAME`
- `SESSION_IDLE_TIMEOUT_SEC`
- `LOGIN_RATE_LIMIT_*`

If email features are needed, also configure one mail mode:

- SMTP via `MAIL_DRIVER=smtp` and `SMTP_*`
- Gmail API via `MAIL_DRIVER=gmail_api` and `GMAIL_API_*`

## 2. Database Setup

For a fresh install:

1. Create database `barangay`.
2. Import `database.sql`.

For an older database:

1. Back up the database first.
2. Apply migration files in `migrations/` order.
3. Start the app once so helper-based schema checks can add missing runtime columns if needed.

Current migration files:

- `001_create_schema_migrations.sql`
- `002_create_auth_login_throttle.sql`
- `003_add_reservation_lookup_indexes.sql`
- `004_add_facility_operating_rules.sql`
- `005_add_facility_multi_day_rule.sql`

## 3. Web Server

This repo is currently arranged for XAMPP/Apache under `htdocs`.

Expected local URL:

`http://localhost/barangay-reservation-system/index.php`

## 4. Logs And Writable Paths

- App logs go to `APP_LOG_DIR`
- Ensure the configured log directory exists and is writable by PHP

## 5. Optional Backup

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-db.ps1
```

## 6. Post-Deploy Checks

- Admin login works
- Staff login works
- Signup creates pending staff request
- Admin approval works
- Reservation creation works
- Billing collection works
- Reports load
- Archive center loads
- Forgot-password email works if mail is enabled

## 7. Known Current-State Notes

- The reports page still includes legacy `billing` status labels in some metrics.
- The web archive page currently exposes restore UI for archived users and facilities only, even though reservation archive endpoints exist.
- The Flutter client is present but its default entrypoint is still not wired to the production app shell.

Last updated: 2026-03-15
