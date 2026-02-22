# 📖 How to Use This System — Simple Guide

This system can run in **two modes**:

| Mode | What it means | Who needs it |
|---|---|---|
| 🔴 **Offline Mode** | No server needed. Just open the HTML file. Data saved in your browser. | Anyone doing a demo or testing |
| 🟢 **Online Mode** | Server is running. Data saved in MySQL. Full features enabled (email, real database). | Production / real deployment |

---

## 🔴 OFFLINE MODE — No Setup Needed

> ✅ Works immediately. No installation. No internet. No server.

### How to Start

1. Open the project folder
2. Double-click **`index.html`**
3. It opens in your browser — done!

### What Works Offline

- ✅ Login / Signup
- ✅ Browse facilities
- ✅ Make reservations
- ✅ Admin approval / rejection
- ✅ Billing and payments
- ✅ Notifications
- ✅ Reports and analytics

### Where is the Data Saved?

Your browser's **localStorage** — think of it like a small notebook inside your browser.

```
Browser localStorage  →  key: "barangayDB"
  ├── users        (accounts)
  ├── facilities   (halls, courts, etc.)
  ├── reservations (all bookings)
  └── notifications
```

> ⚠️ **Important:** If you clear your browser cache, all data is deleted. It does NOT sync between different browsers or computers.

### Demo Accounts (Ready to Use)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Barangay Staff | `staff1` | `staff123` |
| Resident | `resident1` | `resident123` |

---

## 🟢 ONLINE MODE — With Server Running

> ✅ Data is saved permanently in MySQL. Email verification works. Multiple users share the same data.

### What You Need First

- [Node.js](https://nodejs.org) installed (v14 or higher)
- MySQL installed and running
- A Gmail account (for email verification)

### Step 1 — Set Up the Database

We provide a ready-made SQL file: **`database.sql`**

#### Option A — Using phpMyAdmin (Easiest)

1. Open your browser → go to `http://localhost/phpmyadmin`
2. Click **"New"** on the left sidebar → type `barangay` → click **"Create"**
3. Click on the **`barangay`** database (left sidebar)
4. Click the **"SQL"** tab at the top
5. Open the file `database.sql` from this project folder, copy everything inside it
6. Paste it into the SQL box in phpMyAdmin
7. Click **"Go"**

✅ Done! All tables and default data are created automatically.

#### Option B — Using Terminal / Command Line

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS barangay CHARACTER SET utf8mb4;"
mysql -u root -p barangay < barangay-reservation-system/database.sql
```

> The `database.sql` file creates all tables AND inserts the default accounts and 6 facilities automatically.

#### What Gets Created

| Table | What it stores |
|---|---|
| `users` | Admin, staff, and resident accounts |
| `facilities` | The 6 barangay venues |
| `reservations` | All booking records |
| `notifications` | Approval/rejection alerts |
| `verification_codes` | Email signup codes |

#### Default Accounts (already inserted by the SQL)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Barangay Staff | `staff1` | `staff123` |
| Barangay Staff | `staff2` | `staff123` |
| Resident | `resident1` | `resident123` |

### Step 2 — Configure the Server

Open `server/index.js` and check these settings match your MySQL:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',       // ← your MySQL username
  password: '',       // ← your MySQL password
  database: 'barangay'
});
```

### Step 3 — Set Up Email (for Signup Verification)

Set these environment variables before starting the server:

**Windows (Command Prompt):**
```cmd
set EMAIL_USER=yourgmail@gmail.com
set EMAIL_PASS=your-gmail-app-password
```

**Mac / Linux:**
```bash
export EMAIL_USER=yourgmail@gmail.com
export EMAIL_PASS=your-gmail-app-password
```

> 💡 You need a **Gmail App Password**, not your regular Gmail password.  
> Get one at: Google Account → Security → 2-Step Verification → App Passwords

### Step 4 — Start the Server

```bash
cd barangay-reservation-system/server
npm install
node index.js
```

You should see:
```
[facilities] seeded default facilities
API listening on port 3000
```

### Step 5 — Open the System

Open **`index.html`** in your browser (same as offline mode).

The system will automatically detect the server is running and use MySQL instead of localStorage.

---

## 🔄 How the System Decides: Online or Offline?

The system is **smart** — it tries the server first, and if it's not available, it falls back to localStorage automatically.

```
You click "Make Reservation"
        ↓
System tries: http://localhost:3000/reservations  (server)
        ↓
  Server ON?  ──YES──▶  Saved to MySQL ✅
        ↓
  Server OFF? ──YES──▶  Saved to localStorage ✅ (fallback)
```

**You don't need to do anything** — it switches automatically.

---

## 👤 How to Use as a Resident

```
1. Open index.html → Login
   Username: resident1 / Password: resident123

2. Dashboard → See your stats (pending, approved, rejected)

3. "Browse Facilities" → See all available venues

4. "Make Reservation"
   → Pick a facility
   → Pick a date and time
   → Fill in event details
   → Submit

5. "My Reservations" → Track your booking status
   🟠 Pending   = waiting for admin
   🟢 Approved  = confirmed!
   🔴 Rejected  = see the reason

6. "Billing" → Pay after your reservation is approved
   → Pay Online (simulated)
   → Mark as Cash (walk-in payment)

7. 🔔 Bell icon → See notifications when status changes
```

---

## 👨‍💼 How to Use as Admin

```
1. Open index.html → Login
   Username: admin / Password: admin123

2. Dashboard → See system overview

3. "Requests" → Review all pending reservations
   → Click "Review" to see details
   → Click "Approve" ✅ or "Reject" ❌ (with reason)

4. "Facilities" → Add, edit, or delete facilities

5. "Users" → Manage resident accounts

6. "Billing" → See all unpaid reservations across all users
   → Mark payments on behalf of residents

7. "Reports" → View analytics
   → Facility usage, top residents, monthly trends
   → Export to CSV
```

---

## 👷 How to Use as Barangay Staff

Same as Admin but with limited access:

```
1. Login with staff account
   Username: staff1 / Password: staff123

2. Can approve/reject reservations ✅
3. Can manage facilities ✅
4. Can handle billing ✅
5. Cannot manage user accounts ❌
6. Cannot view full reports ❌
```

---

## 📧 How Email Verification Works (Signup)

When a new resident signs up:

```
1. Fill in signup form → enter email address
2. Click "Send Code"
3. System sends a 6-digit code to your email
   (In offline/dev mode: the code is shown on screen)
4. Enter the code to verify
5. Account is created ✅
```

> 📌 Email only works in **Online Mode** with the server running and Gmail configured.  
> In **Offline Mode**, the code is displayed directly on the screen for convenience.

---

## 🔑 Forgot Password

```
1. Click "Forgot Password?" on the login page
2. Enter your email address
3. Solve the simple math captcha
4. A reset code is sent to your email
5. Enter the code and set a new password
```

---

## 💾 Data: Online vs Offline Comparison

| Feature | Offline Mode | Online Mode |
|---|---|---|
| Where data is saved | Browser localStorage | MySQL database |
| Data shared between users | ❌ No (each browser is separate) | ✅ Yes (everyone sees same data) |
| Data survives cache clear | ❌ No | ✅ Yes |
| Email verification | Shows code on screen | Sends real email |
| Setup required | ❌ None | ✅ Node.js + MySQL |
| Internet required | ❌ No | ✅ For server connection |
| Good for | Demo, testing, school defense | Real deployment |

---

## 🚨 Common Problems & Fixes

| Problem | Fix |
|---|---|
| Page won't open | Double-click `index.html` directly, don't drag to browser |
| Login not working | Use exact credentials: `admin` / `admin123` |
| Data disappeared | You cleared browser cache — data is gone in offline mode |
| Server won't start | Check MySQL is running, check `user`/`password` in `server/index.js` |
| Email not sending | Check `EMAIL_USER` and `EMAIL_PASS` environment variables |
| Port 3000 in use | Change `PORT` in server: `set PORT=3001 && node index.js` |
| Can't submit reservation | Fill ALL required fields, check date is in the future |

---

## 📁 Key Files at a Glance

```
barangay-reservation-system/
│
├── index.html              ← START HERE (login page)
├── signup.html             ← Create new account
│
├── resident-dashboard.html ← Resident home
├── reserve.html            ← Book a facility
├── my-reservations.html    ← View your bookings
├── billing.html            ← Pay for reservations
│
├── admin-dashboard.html    ← Admin home
├── admin-requests.html     ← Approve/reject bookings
├── admin-facilities.html   ← Manage facilities
├── admin-users.html        ← Manage users
├── admin-billing.html      ← View all payments
├── reports.html            ← Analytics
│
├── js/api.js               ← Connects frontend to server (auto-fallback)
├── js/database.js          ← Offline localStorage database
│
└── server/
    ├── index.js            ← The backend server (Node.js + Express)
    └── package.json        ← Server dependencies
```

---

## ✅ Quick Decision Guide

```
Do you need to run a demo or school defense?
  → Use OFFLINE MODE. Just open index.html. Done.

Do you need multiple real users sharing data?
  → Use ONLINE MODE. Set up Node.js + MySQL + server.

Not sure if server is running?
  → Just open index.html. It will work either way.
