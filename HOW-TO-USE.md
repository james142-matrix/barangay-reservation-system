# How To Use

This guide explains daily usage by role.

## Modes

- Offline mode: open `index.html`; localStorage is used.
- Online mode: run API server; MySQL-backed data is used where available.

## Resident Flow

1. Sign up or login.
2. Open `facilities.html` to view available venues.
3. Open `reserve.html` to submit a reservation.
4. Track requests in `my-reservations.html`.
5. If approved, pay in `billing.html`.
6. Check notifications in dashboard pages.

## Barangay Staff Flow

1. Login with staff account.
2. Use dashboard for current metrics.
3. Review and process requests.
4. Manage facilities.
5. Process billing updates.

## Admin Flow

1. Login with admin account.
2. Review and process requests.
3. Manage facilities and users.
4. Verify payments and billing status.
5. Review analytics in `reports.html`.

## Forgot Password

1. Open `forgot-password.html`.
2. Enter email and complete captcha/OTP steps.
3. Set a new password.

## Common Issues

- Cannot login: verify username/password and role.
- Data missing: localStorage may have been cleared.
- API unavailable: start backend or continue in offline mode.
- Email verification reset issues: confirm server env variables are set.

Last updated: 2026-02-28