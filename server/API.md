# Barangay Molugan — Backend API Documentation

**Base URL:** `http://localhost:3000`  
**Server:** Node.js + Express  
**Database:** MySQL (`barangay` database, `utf8mb4` charset)  
**Port:** `3000` (configurable via `PORT` environment variable)

---

## Application Architecture

This system follows a **3-Tier Architecture**:

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
│  └──────────────────────┘       │  Routes:             │    │
│  ┌──────────────────────┐       │  POST /verification- │    │
│  │  js/database.js      │       │       codes          │    │
│  │  (localStorage CRUD  │       │  POST /verification- │    │
│  │   simulation)        │       │       codes/verify   │    │
│  └──────────────────────┘       │  GET  /facilities    │    │
│  ┌──────────────────────┐       │  POST /facilities    │    │
│  │  js/auth.js          │       │  PUT  /facilities/:id│    │
│  │  (session + role     │       │  DELETE /facilities/ │    │
│  │   management)        │       │       :id            │    │
│  └──────────────────────┘       └──────────────────────┘    │
└──────────────────────────┬──────────────────┬───────────────┘
                           │                  │
          ┌────────────────▼──┐    ┌──────────▼──────────────┐
          │   DATA LAYER      │    │      DATA LAYER         │
          │                   │    │                         │
          │  localStorage     │    │  MySQL Database         │
          │  (Browser)        │    │  database: barangay     │
          │                   │    │  charset: utf8mb4       │
          │  - users          │    │                         │
          │  - facilities     │    │  Tables:                │
          │  - reservations   │    │  - facilities           │
          │  - notifications  │    │  - reservations         │
          └───────────────────┘    │  - users                │
                                   └─────────────────────────┘
```

### Layer Responsibilities

#### 1. Presentation Layer
| File | Role |
|------|------|
| `*.html` | Page structure and UI components |
| `css/style.css` | Styling and layout |
| `js/reserve.js` | Reservation form logic |
| `js/admin-facilities.js` | Admin facility management UI |
| `js/resident-dashboard.js` | Resident dashboard UI |
| `js/billing.js`, `js/reports.js`, etc. | Feature-specific page logic |

#### 2. Application Layer
| File | Role |
|------|------|
| `js/api.js` | **API client** — bridges the browser to the Express server. Sends HTTP requests and automatically falls back to `localStorage` if the server is unreachable |
| `server/index.js` | **Express REST API** — handles HTTP requests, validates input, executes MySQL queries, returns JSON responses |
| `js/database.js` | **localStorage engine** — simulates a database in the browser using `localStorage`. Used as offline fallback and for data not yet migrated to MySQL |
| `js/auth.js` | **Auth manager** — handles login sessions, role-based access control (`admin`, `barangay_staff`, `resident`), and logout |
| `js/firebase-init.js` | **Firebase client** — initialises Firebase Auth for token-based authentication |

#### 3. Data Layer
| Storage | Location | Used For |
|---------|----------|----------|
| **MySQL** | Server (`localhost:3306`) | Persistent server-side storage: facilities, reservations, users |
| **localStorage** | Browser | Offline fallback, session data, notifications, client-side cache |
| **Firebase Auth** | Cloud | ID token generation and verification |

### Data Flow — New Reservation (Example)
```
Resident fills form (reserve.html)
        │
        ▼
js/reserve.js validates input
        │
        ▼
window.api.getFacilities()          ← js/api.js
        │
        ├─ Server online?  ──YES──▶ GET http://localhost:3000/facilities
        │                                    │
        │                                    ▼
        │                           MySQL: SELECT * FROM facilities
        │
        └─ Server offline? ──YES──▶ getAllFacilities() from localStorage
        │
        ▼
Dropdown populated with facilities
        │
        ▼
Resident submits form
        │
        ▼
window.api.createReservation(data)  ← js/api.js
        │
        ├─ Server online?  ──YES──▶ POST http://localhost:3000/reservations
        │
        └─ Server offline? ──YES──▶ createReservation() in localStorage
```

### Offline Fallback Strategy
`js/api.js` wraps every server call in a `try/catch`. If the server is unreachable (network error, server not running), it automatically falls back to the equivalent `localStorage` function from `js/database.js`. This means the application works **fully offline** using browser storage.

---

## Getting Started

### Prerequisites
- Node.js v14+
- MySQL running with a database named `barangay`
- Environment variables set (for email features):
  - `EMAIL_USER` — Gmail address used to send verification emails
  - `EMAIL_PASS` — Gmail app password

### Start the Server
```bash
cd barangay-reservation-system/server
npm install
node index.js
```

> On first start, the server automatically creates the `facilities` table and seeds 6 default facilities if the table is empty.

---

## Endpoints

### 1. Email Verification

---

#### `POST /verification-codes`

Generates a 6-digit verification code and sends it to the given email address. The code expires after **10 minutes**.

**Request Body**
```json
{
  "email": "user@example.com"
}
```

| Field   | Type   | Required | Description              |
|---------|--------|----------|--------------------------|
| `email` | string | ✅ Yes   | Recipient email address  |

**Success Response — `200 OK`**
```json
{
  "status": "ok",
  "code": "482910"
}
```
> ⚠️ The `code` is returned in the response for development convenience. Remove this in production.

**Error Responses**

| Status | Body                          | Reason                        |
|--------|-------------------------------|-------------------------------|
| `400`  | `Email required`              | `email` field missing         |
| `500`  | `{ "error": "Failed to send email", "code": "..." }` | SMTP error (code still returned) |

---

#### `POST /verification-codes/verify`

Verifies a code previously sent to an email address.

**Request Body**
```json
{
  "email": "user@example.com",
  "code": "482910"
}
```

| Field   | Type   | Required | Description                        |
|---------|--------|----------|------------------------------------|
| `email` | string | ✅ Yes   | Email address the code was sent to |
| `code`  | string | ✅ Yes   | 6-digit code to verify             |

**Success Response — `200 OK`**
```
verified
```

**Error Responses**

| Status | Body               | Reason                              |
|--------|--------------------|-------------------------------------|
| `400`  | `No code requested`| No code was generated for this email|
| `400`  | `Code expired`     | Code is older than 10 minutes       |
| `400`  | `Invalid code`     | Code does not match                 |

---

### 2. Facilities

All facility data is stored in the MySQL `facilities` table.

#### Facility Object Schema

```json
{
  "id": 1,
  "name": "Community Hall",
  "description": "Large multi-purpose venue for events and gatherings",
  "capacity": 200,
  "price": "2000.00",
  "icon": "🏛️",
  "status": "available",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

| Field         | Type    | Description                                              |
|---------------|---------|----------------------------------------------------------|
| `id`          | integer | Auto-incremented primary key                             |
| `name`        | string  | Facility name                                            |
| `description` | string  | Short description of the facility                        |
| `capacity`    | integer | Maximum number of persons                                |
| `price`       | decimal | Price per event in Philippine Peso (₱)                   |
| `icon`        | string  | Emoji icon representing the facility                     |
| `status`      | string  | `available` \| `maintenance` \| `unavailable`            |
| `created_at`  | string  | ISO 8601 timestamp of when the record was created        |

---

#### `GET /facilities`

Returns a list of all facilities ordered by `id` ascending.

**Request:** No body required.

**Success Response — `200 OK`**
```json
[
  {
    "id": 1,
    "name": "Community Hall",
    "description": "Large multi-purpose venue for events and gatherings",
    "capacity": 200,
    "price": "2000.00",
    "icon": "🏛️",
    "status": "available",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Sports Complex",
    "description": "Basketball court, badminton courts, and training facilities",
    "capacity": 150,
    "price": "1500.00",
    "icon": "🏀",
    "status": "available",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

**Error Response**

| Status | Body                              | Reason           |
|--------|-----------------------------------|------------------|
| `500`  | `{ "error": "Failed to load facilities" }` | MySQL error |

---

#### `POST /facilities`

Creates a new facility.

**Request Body**
```json
{
  "name": "Rooftop Garden",
  "description": "Open-air rooftop venue with city views",
  "capacity": 80,
  "price": 1200,
  "icon": "🌿",
  "status": "available"
}
```

| Field         | Type    | Required | Default   | Description                                   |
|---------------|---------|----------|-----------|-----------------------------------------------|
| `name`        | string  | ✅ Yes   | —         | Facility name                                 |
| `capacity`    | integer | ✅ Yes   | —         | Maximum number of persons                     |
| `price`       | number  | ✅ Yes   | —         | Price per event in ₱                          |
| `description` | string  | ❌ No    | `""`      | Short description                             |
| `icon`        | string  | ❌ No    | `"🏛️"`   | Emoji icon                                    |
| `status`      | string  | ❌ No    | `"available"` | `available` \| `maintenance` \| `unavailable` |

**Success Response — `201 Created`**
```json
{
  "id": 7,
  "name": "Rooftop Garden",
  "description": "Open-air rooftop venue with city views",
  "capacity": 80,
  "price": "1200.00",
  "icon": "🌿",
  "status": "available",
  "created_at": "2024-06-01T10:00:00.000Z"
}
```

**Error Responses**

| Status | Body                                              | Reason                              |
|--------|---------------------------------------------------|-------------------------------------|
| `400`  | `{ "error": "name, capacity and price are required" }` | Missing required fields        |
| `500`  | `{ "error": "Failed to create facility" }`        | MySQL error                         |

---

#### `PUT /facilities/:id`

Updates an existing facility by its `id`.

**URL Parameter**

| Parameter | Type    | Description              |
|-----------|---------|--------------------------|
| `id`      | integer | ID of the facility to update |

**Request Body**
```json
{
  "name": "Rooftop Garden (Updated)",
  "description": "Renovated open-air rooftop venue",
  "capacity": 100,
  "price": 1500,
  "icon": "🌿",
  "status": "maintenance"
}
```

All fields are optional — only provided fields will be updated. Fields not included will be set to their defaults (`""` for description, `"🏛️"` for icon, `"available"` for status).

**Success Response — `200 OK`**
```json
{
  "id": 7,
  "name": "Rooftop Garden (Updated)",
  "description": "Renovated open-air rooftop venue",
  "capacity": 100,
  "price": "1500.00",
  "icon": "🌿",
  "status": "maintenance",
  "created_at": "2024-06-01T10:00:00.000Z"
}
```

**Error Responses**

| Status | Body                                          | Reason                    |
|--------|-----------------------------------------------|---------------------------|
| `404`  | `{ "error": "Facility not found" }`           | No facility with that `id`|
| `500`  | `{ "error": "Failed to update facility" }`    | MySQL error               |

---

#### `DELETE /facilities/:id`

Deletes a facility by its `id`.

**URL Parameter**

| Parameter | Type    | Description                  |
|-----------|---------|------------------------------|
| `id`      | integer | ID of the facility to delete |

**Request:** No body required.

**Success Response — `200 OK`**
```json
{
  "success": true
}
```

**Error Responses**

| Status | Body                                          | Reason                    |
|--------|-----------------------------------------------|---------------------------|
| `404`  | `{ "error": "Facility not found" }`           | No facility with that `id`|
| `500`  | `{ "error": "Failed to delete facility" }`    | MySQL error               |

---

## Default Facilities (Auto-Seeded)

When the `facilities` table is empty, the server seeds these 6 defaults:

| ID | Icon | Name                     | Capacity | Price (₱) | Status    |
|----|------|--------------------------|----------|-----------|-----------|
| 1  | 🏛️  | Community Hall           | 200      | 2,000     | available |
| 2  | 🏀  | Sports Complex           | 150      | 1,500     | available |
| 3  | 🎭  | Cultural Center          | 100      | 1,000     | available |
| 4  | 📚  | Library & Learning Center| 50       | 500       | available |
| 5  | 🏥  | Medical Room             | 20       | 800       | available |
| 6  | 🌳  | Garden Event Space       | 300      | 2,500     | available |

---

## Error Format

All error responses return JSON with an `error` field:
```json
{
  "error": "Description of what went wrong"
}
```
Plain-text errors (e.g., `Email required`, `Code expired`) are returned as raw strings for legacy compatibility.

---

## Frontend Integration

The frontend (`js/api.js`) wraps all endpoints with automatic fallback to `localStorage` when the server is unreachable:

```javascript
// Get all facilities (falls back to localStorage)
const facilities = await window.api.getFacilities();

// Create a facility (falls back to localStorage)
const facility = await window.api.createFacility({ name, capacity, price, ... });

// Update a facility (falls back to localStorage)
const updated = await window.api.updateFacility(id, { name, capacity, price, ... });

// Delete a facility (falls back to localStorage)
await window.api.deleteFacility(id);
```

---

## MySQL Table Schema

```sql
CREATE TABLE IF NOT EXISTS facilities (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255)  NOT NULL,
  description TEXT,
  capacity    INT           NOT NULL DEFAULT 0,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  icon        VARCHAR(20)   CHARACTER SET utf8mb4 DEFAULT NULL,
  status      VARCHAR(50)   DEFAULT 'available',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Dependencies

| Package          | Version  | Purpose                          |
|------------------|----------|----------------------------------|
| `express`        | latest   | HTTP server framework            |
| `mysql2`         | latest   | MySQL client with Promise support|
| `cors`           | latest   | Cross-Origin Resource Sharing    |
| `firebase-admin` | latest   | Firebase authentication          |
| `nodemailer`     | latest   | Email sending (verification)     |
