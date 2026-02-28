# Quick Start

Use this if you want to run the project immediately.

## Option A: Offline (No Server)

1. Open `index.html`.
2. Log in with demo credentials or create a resident account.
3. Use the system features directly.

Data is stored in browser localStorage.

## Option B: Online (MySQL + API)

1. Import `database.sql` into MySQL.
2. Start backend API:

```bash
cd server
npm install
node index.js
```

3. Open `index.html`.

## Smoke Test

1. Login as resident.
2. Create a reservation.
3. Login as staff/admin and approve or reject it.
4. Return to resident and confirm status update.
5. If approved, complete billing flow.

## Core Files

- Frontend pages: root `*.html`
- Frontend scripts: `js/*.js`
- Backend API: `server/index.js`
- DB schema/seed: `database.sql`

Last updated: 2026-02-28
