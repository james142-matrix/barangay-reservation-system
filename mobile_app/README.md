# Barangay Reservation Flutter Client

This folder contains a Flutter client for the Barangay Reservation System API.

## Current State

The project already includes real feature modules for:

- login/session
- dashboard
- reservations
- create reservation
- billing
- facilities
- notifications
- users
- reports
- archive center
- profile

Important:

- the real app shell is in `lib/src/app.dart`
- `lib/main.dart` is still pointing to a rubric/demo screen, not the production app shell

So the codebase contains the app structure, but the default entrypoint is not yet wired to the real experience.

## Main Folders

- `lib/src/core` - API client and app config
- `lib/src/features/auth` - login/session handling
- `lib/src/features/dashboard`
- `lib/src/features/reservations`
- `lib/src/features/billing`
- `lib/src/features/facilities`
- `lib/src/features/notifications`
- `lib/src/features/users`
- `lib/src/features/reports`
- `lib/src/features/archive`
- `lib/src/features/profile`

## Dependencies

- `dio`
- `cookie_jar`
- `dio_cookie_manager`

## Running The Project

1. Open a terminal in `mobile_app/`.
2. Run:

```powershell
flutter pub get
flutter run -d chrome
```

If you want the real app shell to launch, update `lib/main.dart` to run `BarangayReservationApp` from `lib/src/app.dart`.

## API Expectation

The Flutter client expects the same PHP backend used by the web app, including cookie-based auth and the existing API routes under `/api`.

## Recommended Next Step

Before wider QA, wire `lib/main.dart` to the real app shell so testing matches the intended mobile experience.

Last updated: 2026-03-15
