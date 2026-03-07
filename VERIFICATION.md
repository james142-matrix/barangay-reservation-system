# Verification Checklist

Use this checklist before demo, handoff, or release.

## 1. Documentation Accuracy

Mark each item once verified against actual behavior.

- [ ] `README.md` matches current pages, API, and role policy
- [ ] `QUICKSTART.md` works as-is on a clean local setup
- [ ] `HOW-TO-USE.md` matches real staff/admin operations
- [ ] `ARCHITECTURE.md` matches current PHP session architecture
- [ ] `SYSTEM-FLOW.md` matches real API and page workflow
- [ ] `FULL-STACK-EXPLANATION.md` matches active code paths
- [ ] `DEPLOYMENT.md` matches deployment method in use
- [ ] `TODO.md` and `COMPLETION.md` are synchronized

## 2. UI Smoke Tests

- [ ] Login works for `admin`
- [ ] Login works for `barangay_staff`
- [ ] Unauthorized role is blocked
- [ ] Reservation creation works in `reserve.php`
- [ ] Request approve/reject works in `*-requests.php`
- [ ] Billing cash confirmation works in `*-billing.php`
- [ ] Notifications appear after request updates and payment
- [ ] Admin user management works in `admin-users.php`
- [ ] Reports load correctly in `reports.php`
- [ ] Forgot-password flow works end-to-end

## 3. API Smoke Tests

- [ ] `POST /auth/login`
- [ ] `GET /auth/me`
- [ ] `POST /auth/logout`
- [ ] `GET /facilities`
- [ ] `POST /facilities`
- [ ] `PUT /facilities/:id`
- [ ] `DELETE /facilities/:id`
- [ ] `GET /reservations`
- [ ] `POST /reservations`
- [ ] `PUT /reservations/:id`
- [ ] `DELETE /reservations/:id`
- [ ] `GET /notifications`
- [ ] `POST /notifications`
- [ ] `PUT /notifications/:id/read`
- [ ] `GET /users`
- [ ] `POST /users`
- [ ] `PUT /users/:id`
- [ ] `DELETE /users/:id`
- [ ] `POST /users/forgot-password/check-email`
- [ ] `POST /users/forgot-password/request`
- [ ] `POST /users/forgot-password/reset`

## 4. Data Verification

- [ ] Reservation records show correct status transitions
- [ ] Payment fields are correct after cash confirmation
- [ ] Notification records match user actions
- [ ] Archived items are hidden from normal active lists

## 5. Release Decision

- [ ] All critical checks passed
- [ ] Known issues are documented
- [ ] Team agrees build is ready for demo/release

Last updated: 2026-03-07
