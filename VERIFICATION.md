# Verification Checklist

Use this checklist before demo/release.

## Documentation

- [x] `README.md` matches current PHP structure
- [x] `QUICKSTART.md` reflects XAMPP/MySQL startup path
- [x] `HOW-TO-USE.md` reflects staff/admin onsite workflow
- [x] `ARCHITECTURE.md` reflects PHP API + session auth
- [x] `DEPLOYMENT.md` reflects current deployment model
- [x] `FULL-STACK-EXPLANATION.md` matches active code paths
- [x] `SYSTEM-FLOW.md` exists and explains end-to-end flow
- [x] `TODO.md` and `COMPLETION.md` are synchronized

## Application Smoke Tests

- [ ] Login works for `admin`
- [ ] Login works for `barangay_staff`
- [ ] Staff/admin can create reservation (`reserve.php`)
- [ ] Staff/admin can approve/reject (`*-requests.php`)
- [ ] Billing confirm cash works (`*-billing.php`)
- [ ] Notifications appear after approval/rejection/payment
- [ ] Admin user CRUD works in `admin-users.php`
- [ ] Reports load in `reports.php`
- [ ] Forgot-password reset works with Gmail SMTP

## API Smoke Tests

- [ ] `POST /auth/login`
- [ ] `GET /auth/me`
- [ ] `POST /auth/logout`
- [ ] `GET/POST/PUT/DELETE /facilities`
- [ ] `GET/POST/PUT/DELETE /reservations`
- [ ] `GET/POST/PUT /notifications`
- [ ] `GET/POST/PUT/DELETE /users` (role-restricted)
- [ ] Forgot-password endpoints

Last updated: 2026-03-03
