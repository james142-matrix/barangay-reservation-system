# Architecture

High-level structure of the current system.

## 1. Layers

### Presentation Layer

- Root PHP pages render the web UI.
- `css/style.css` provides shared styling.
- `js/*.js` handles page logic, filters, modals, and API calls.

### Application Layer

- `js/api.js` is the browser API wrapper.
- `js/auth.js` handles session checks and role redirects.
- `api/index.php` is the central JSON API router.
- `api/helpers.php` contains shared validation, normalization, and mail helpers.

### Data Layer

- MySQL stores all business data.
- `database.sql` provides the current full schema and seed data.
- `migrations/*.sql` support upgrades for older databases.

## 2. Runtime Model

1. Browser loads a PHP page.
2. Page JS calls `GET /auth/me`.
3. If authenticated, frontend requests protected API data.
4. API validates session, role, CSRF token, and payload.
5. API reads/writes MySQL.
6. API returns JSON to the page.

## 3. Authentication Design

- Login uses PHP sessions, not JWT.
- Session cookie name defaults to `barangay_session`.
- API also supports a tab-scoped session id via `X-Tab-Session`.
- CSRF protection is enforced on non-exempt write routes.
- Session idle timeout is controlled by `SESSION_IDLE_TIMEOUT_SEC`.
- Login attempts are rate-limited by user and IP.

## 4. Role Model

Allowed interactive roles:

- `admin`
- `barangay_staff`

Blocked role:

- `resident`

Approval model:

- `signup.php` creates pending staff accounts
- admin approves via `POST /users/:id/approve`

## 5. Main Domain Areas

- Authentication
- Users and approval queue
- Facilities and facility rules
- Reservations
- Billing/payment updates
- Notifications
- Archive and restore
- Reports
- Password recovery

## 6. Core Data Tables

- `users`
- `facilities`
- `reservations`
- `billing_transactions`
- `notifications`
- `password_reset_codes`
- `auth_login_throttle`
- `schema_migrations`

## 7. Facility Rule Architecture

Facility records contain reservation policy fields:

- `opening_time`
- `closing_time`
- `allows_overnight`
- `allows_all_day`
- `allows_multi_day`
- `max_duration_hours`
- `event_types`
- `add_ons`

These rules are validated in the API before reservation create/update succeeds.

## 8. Reservation / Billing Model

- Reservation details live in `reservations`.
- Payment progress is tracked with:
  - `payment_option`
  - `down_payment_amount`
  - `amount_paid`
  - `payment_status`
  - `payment_method`
  - `payment_date`
- Billing actions are currently implemented by updating reservation payment fields from the billing page.
- `billing_transactions` exists for ledger/audit use in the schema, but the current API flow primarily relies on reservation payment columns.

## 9. Archive Model

Most delete actions are soft deletes:

- users -> `archived = 1`
- facilities -> `archived = 1`
- reservations -> `archived = 1`

Admin restore endpoints exist for all three.

## 10. Mobile App Status

`mobile_app/` contains a Flutter client that targets the same API.

Important current state:

- feature modules exist under `mobile_app/lib/src`
- `mobile_app/lib/src/app.dart` contains the actual app shell
- `mobile_app/lib/main.dart` is still wired to a rubric/demo screen, so the mobile app is not yet using the real shell as its active entrypoint

Last updated: 2026-03-15
