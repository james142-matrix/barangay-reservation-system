# System Flow

Actual end-to-end flow of the current system.

## 1. Login Flow

1. User opens `index.php`.
2. `js/login.js` sends `POST /auth/login`.
3. API verifies:
   - username/password
   - account is not archived
   - `approval_status=approved`
   - role is `admin` or `barangay_staff`
4. API creates session data and returns `sessionId` + `csrfToken`.
5. Frontend stores tab session info and redirects by role.

## 2. Session Guard Flow

1. Protected pages call `checkAuth()` from `js/auth.js`.
2. Browser requests `GET /auth/me`.
3. Invalid session redirects to `index.php`.
4. Wrong role redirects to the correct dashboard.

## 3. Staff Signup Flow

1. User opens `signup.php`.
2. Form sends `POST /auth/signup`.
3. API creates a `barangay_staff` account with `approval_status=pending`.
4. Account cannot log in yet.
5. Admin approves from `admin-users.php`.

## 4. Reservation Creation Flow

1. Staff/admin opens `admin-reserve.php` or `barangay-staff-reserve.php`.
2. Frontend loads available facilities.
3. User fills in schedule, client info, event type, guests, payment option, and add-ons.
4. API validates:
   - facility exists and is not archived
   - facility is available
   - schedule order is valid
   - facility rules are satisfied
   - guests do not exceed capacity
   - event type is allowed for that facility
   - no overlap with active reservations
5. API saves reservation as `pending` with payment fields initialized.

## 5. Request Review Flow

1. Reviewer opens role-specific requests page.
2. Reservations load with facility and user details.
3. Reviewer may inspect and search records.
4. Reservation details may still be edited only while:
   - `status=pending`
   - `payment_status=pending`
5. After billing action starts, requests become view-only.

## 6. Billing Flow

1. Reviewer opens billing page.
2. Page lists reservations with payment details and due-now amount.
3. If reservation uses down payment and nothing has been paid yet:
   - action is `Collect Down Payment`
   - payment usually becomes `partial`
4. If remaining balance exists:
   - action is `Collect Balance`
5. Once fully paid:
   - `payment_status` becomes `cash` or `paid`
   - `payment_method=onsite_cash`
   - `status=completed`
6. Payment receipt email is attempted.
7. Notification is created.

## 7. Cancellation Flow

1. Pending unpaid reservation can be cancelled from billing.
2. API updates:
   - `status=cancelled`
   - `payment_status=cancelled`
   - rejection metadata
3. Notification is created.

## 8. Facility Management Flow

1. Admin opens facilities page.
2. Create/update/delete actions call `/facilities` endpoints.
3. Delete is soft archive.
4. Notifications are generated for facility changes.

## 9. User Management Flow

1. Admin opens `admin-users.php`.
2. User list loads from `GET /users`.
3. Admin may create, edit, approve, decline, or archive users.
4. Protected admin checks prevent unsafe archive/role changes.

## 10. Archive Flow

Admin API supports:

- `GET /archive/users`
- `POST /archive/users/:id/restore`
- `GET /archive/facilities`
- `POST /archive/facilities/:id/restore`
- `GET /archive/reservations`
- `POST /archive/reservations/:id/restore`

Current web archive page exposes restore UI for users and facilities.

## 11. Forgot Password Flow

1. User checks if email exists.
2. User requests a reset code.
3. API stores a hashed 6-digit code with 10-minute expiry.
4. Email is sent through SMTP or Gmail API.
5. User submits email, code, and new password.
6. API verifies code and updates password.

## 12. Notification Flow

- Notification records are stored in `notifications`.
- Operational changes can create records automatically.
- Users can load their own notifications and mark them read.

Last updated: 2026-03-15
