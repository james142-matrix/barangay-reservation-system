# Frontend to Backend — Simple Explanation

## 🍽️ Think of it Like a Restaurant

| Restaurant | Your System |
|---|---|
| Customer | User (Resident / Staff / Admin) |
| Menu / Dining Area | HTML pages (`reserve.html`, `admin-dashboard.html`, etc.) |
| Waiter | `js/api.js` |
| Kitchen | `server/index.js` (Node.js + Express) |
| Fridge/Storage | MySQL Database |
| Snack bar at your table | `js/database.js` + localStorage (offline backup) |

---

## 🏗️ The 3 Layers

```
LAYER 1 — What You SEE
  *.html pages + css/style.css
  (reserve.html, admin-dashboard.html, facilities.html, etc.)
        |
        | user clicks a button / submits a form
        ↓
LAYER 2 — Page Brain + The Bridge
  js/[page].js  →  js/api.js
  (reserve.js calls window.api.createReservation())
        |
        |── Server ON?  → fetch("http://localhost:3000/...")
        |                        ↓
        |               LAYER 3A: server/index.js
        |               (Node.js + Express receives request)
        |                        ↓
        |                    MySQL Database
        |                    (permanent storage)
        |
        └── Server OFF? → js/database.js
                          (localStorage in browser = temporary backup)
```

---

## 📁 What Each File Does — Simply

| File | Simple Role |
|---|---|
| `*.html` | The pages the user sees and interacts with |
| `js/reserve.js`, `js/admin-facilities.js`, etc. | Page brains — handle button clicks and form logic for each specific page |
| `js/api.js` | **The Waiter** — takes requests from pages and sends them to the server via HTTP `fetch()`. If the server is down, it automatically falls back to localStorage |
| `server/index.js` | **The Kitchen** — Node.js + Express server that receives HTTP requests, runs MySQL queries, and sends back JSON data |
| `js/database.js` | **The Backup** — simulates a full database inside the browser using `localStorage`. Used when the server is offline |
| `js/auth.js` | **The Bouncer** — checks your role (admin / barangay_staff / resident) and controls what pages you can access |
| `js/firebase-init.js` | **The ID Card** — Firebase generates a token proving who you are; `api.js` attaches it to every server request |

---

## 🚶 Step-by-Step: Resident Books a Facility

```
1. Resident opens reserve.html
2. js/reserve.js runs and loads the page
3. Resident picks a facility from the dropdown

4. js/reserve.js calls:
      window.api.getFacilities()          ← asks the waiter (api.js)

5. api.js tries:
      fetch("http://localhost:3000/facilities")   ← calls the kitchen

   ✅ Server ON  → server/index.js runs:
                   SELECT * FROM facilities  (MySQL)
                   → returns JSON list of facilities

   ❌ Server OFF → api.js catches the error
                   → falls back to getAllFacilities() in database.js
                   → returns list from localStorage instead

6. Dropdown is filled with facilities ✓

7. Resident fills the form and clicks "Reserve"

8. js/reserve.js calls:
      window.api.createReservation(data)

9. api.js tries:
      fetch("http://localhost:3000/reservations", { method: "POST" })

   ✅ Server ON  → saved to MySQL (permanent)
   ❌ Server OFF → saved to localStorage via database.js (temporary)

10. Reservation created ✓
```

---

## 🔐 How Login Works

```
User types username + password
        ↓
js/login.js → authenticateUser() in database.js
        ↓
Checks localStorage users list
Password verified using PBKDF2 secure hashing
        ↓
If valid → saves session to localStorage:
  currentUser = { username, role, ... }
        ↓
js/auth.js reads the role:
  "admin"          → admin-dashboard.html
  "barangay_staff" → barangay-staff-dashboard.html
  "resident"       → resident-dashboard.html
```

> Firebase also generates an `idToken` stored in localStorage. `api.js` attaches this as a `Bearer` header on every server request so the server knows who is calling.

---

## 📧 How Email Verification Works (Signup)

```
User signs up → enters email
        ↓
js/signup.js → POST http://localhost:3000/verification-codes
        ↓
server/index.js generates a 6-digit code
  → stores it in memory with 10-minute expiry
  → sends it via Gmail (nodemailer)
        ↓
User enters the code
        ↓
POST http://localhost:3000/verification-codes/verify
        ↓
Server checks: correct? not expired? → replies "verified"
```

---

## 🧠 The Key Smart Feature: Offline Fallback

Every function in `js/api.js` follows this exact pattern:

```javascript
async function getFacilities() {
    try {
        return await request('/facilities');   // Try real server → MySQL
    } catch (e) {
        return getAllFacilities();             // Fallback → localStorage
    }
}
```

This means:
- ✅ **Server running** → data saved to MySQL (permanent, shared across all users)
- ✅ **Server offline** → data saved to localStorage (temporary, browser-only)
- The user barely notices the difference in either case

---

## 🗂️ One-Line Summary Per File

| File | What it does |
|---|---|
| `*.html` | What you see on screen |
| `js/[page].js` | What happens when you click things on that page |
| `js/api.js` | Sends your actions to the server (or localStorage if offline) |
| `server/index.js` | The server that receives requests and talks to MySQL |
| `js/database.js` | The offline backup that mimics the server using browser storage |
| `js/auth.js` | Controls who can access what based on their role |
| `MySQL` | The real permanent database on the server |

---

## 🔗 Full Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                        │
│  HTML Pages: reserve.html, admin-facilities.html, etc.      │
│  CSS: css/style.css                                         │
│  Page Scripts: js/reserve.js, js/admin-facilities.js, etc.  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP fetch() calls
┌──────────────────────────▼──────────────────────────────────┐
│                   APPLICATION LAYER                         │
│                                                             │
│  CLIENT-SIDE (Browser)          SERVER-SIDE (Node.js)       │
│  ┌──────────────────────┐       ┌──────────────────────┐    │
│  │  js/api.js           │──────▶│  server/index.js     │    │
│  │  (API wrapper +      │       │  (Express REST API)  │    │
│  │   localStorage       │       │  Port: 3000          │    │
│  │   fallback)          │       │                      │    │
│  └──────────────────────┘       └──────────────────────┘    │
│  ┌──────────────────────┐                                    │
│  │  js/database.js      │                                    │
│  │  (localStorage CRUD  │                                    │
│  │   simulation)        │                                    │
│  └──────────────────────┘                                    │
│  ┌──────────────────────┐                                    │
│  │  js/auth.js          │                                    │
│  │  (session + role     │                                    │
│  │   management)        │                                    │
│  └──────────────────────┘                                    │
└──────────────────────────┬──────────────────┬───────────────┘
                           │                  │
          ┌────────────────▼──┐    ┌──────────▼──────────────┐
          │   DATA LAYER      │    │      DATA LAYER         │
          │  localStorage     │    │  MySQL Database         │
          │  (Browser)        │    │  database: barangay     │
          │                   │    │                         │
          │  - users          │    │  Tables:                │
          │  - facilities     │    │  - facilities           │
          │  - reservations   │    │  - reservations         │
          │  - notifications  │    │  - users                │
          └───────────────────┘    └─────────────────────────┘
