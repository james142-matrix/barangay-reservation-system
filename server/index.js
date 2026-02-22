// Example Express server with email verification endpoint
// requires: express, firebase-admin, mysql2, cors, nodemailer

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const nodemailer = require('nodemailer');

// Firebase Admin is optional — only initialise when credentials are available
let admin = null;
try {
  admin = require('firebase-admin');
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  console.log('[firebase] Admin SDK initialised');
} catch (e) {
  console.warn('[firebase] Admin SDK not initialised (no credentials) — Firebase features disabled:', e.message);
  admin = null;
}

// configure your MySQL connection as before
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay',
  charset: 'utf8mb4'
});

const app = express();
app.use(cors());
app.use(express.json());

// simple in-memory store for codes (for production use a table with expiry!)
const pendingCodes = new Map();

// setup a transporter for nodemailer (use real SMTP creds or a service)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // set in env
    pass: process.env.EMAIL_PASS
  }
});

app.post('/verification-codes', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send('Email required');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // store code with 10‑minute expiry
  const expires = Date.now() + 10 * 60 * 1000;
  pendingCodes.set(email, { code, expires });

  // log code to console for debugging (remove in production)
  console.log(`[verification] code for ${email} = ${code}`);

  // send email
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is ${code}`
    });
    // also return code in response for development
    res.json({ status: 'ok', code });
  } catch (err) {
    console.error('Email send error', err);
    // include code in response to allow manual entry
    res.status(500).json({ error: 'Failed to send email', code });
  }
});

app.post('/verification-codes/verify', (req, res) => {
  const { email, code } = req.body;
  const entry = pendingCodes.get(email);
  if (!entry) return res.status(400).send('No code requested');
  if (Date.now() > entry.expires) {
    pendingCodes.delete(email);
    return res.status(400).send('Code expired');
  }
  if (entry.code !== code) {
    return res.status(400).send('Invalid code');
  }
  pendingCodes.delete(email);
  res.send('verified');
});

// ===========================
// FACILITIES TABLE SETUP
// ===========================

const DEFAULT_FACILITIES = [
  { name: 'Community Hall',        description: 'Large multi-purpose venue for events and gatherings',  capacity: 200, price: 2000, icon: '🏛️', status: 'available' },
  { name: 'Sports Complex',        description: 'Basketball court, badminton courts, and training facilities', capacity: 150, price: 1500, icon: '🏀', status: 'available' },
  { name: 'Cultural Center',       description: 'Dedicated space for cultural events and workshops',     capacity: 100, price: 1000, icon: '🎭', status: 'available' },
  { name: 'Library & Learning Center', description: 'Quiet study area with meeting rooms',              capacity: 50,  price: 500,  icon: '📚', status: 'available' },
  { name: 'Medical Room',          description: 'First aid and emergency medical services room',         capacity: 20,  price: 800,  icon: '🏥', status: 'available' },
  { name: 'Garden Event Space',    description: 'Outdoor venue with covered pavilion',                   capacity: 300, price: 2500, icon: '🌳', status: 'available' }
];

async function initFacilitiesTable() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS facilities (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(255)   NOT NULL,
        description TEXT,
        capacity    INT            NOT NULL DEFAULT 0,
        price       DECIMAL(10,2)  NOT NULL DEFAULT 0,
        icon        VARCHAR(20)    CHARACTER SET utf8mb4 DEFAULT NULL,
        status      VARCHAR(50)    DEFAULT 'available',
        created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Seed defaults only when the table is empty
    const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM facilities');
    if (rows[0].cnt === 0) {
      for (const f of DEFAULT_FACILITIES) {
        await conn.query(
          'INSERT INTO facilities (name, description, capacity, price, icon, status) VALUES (?, ?, ?, ?, ?, ?)',
          [f.name, f.description, f.capacity, f.price, f.icon, f.status]
        );
      }
      console.log('[facilities] seeded default facilities');
    }
  } finally {
    conn.release();
  }
}

// ===========================
// FACILITIES ROUTES
// ===========================

// GET /facilities — list all facilities
app.get('/facilities', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM facilities ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('GET /facilities error', err);
    res.status(500).json({ error: 'Failed to load facilities' });
  }
});

// POST /facilities — create a new facility
app.post('/facilities', async (req, res) => {
  const { name, description, capacity, price, icon, status } = req.body;
  if (!name || !capacity || price === undefined) {
    return res.status(400).json({ error: 'name, capacity and price are required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO facilities (name, description, capacity, price, icon, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description || '', capacity, price, icon || '🏛️', status || 'available']
    );
    const [rows] = await pool.query('SELECT * FROM facilities WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /facilities error', err);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

// PUT /facilities/:id — update an existing facility
app.put('/facilities/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, capacity, price, icon, status } = req.body;
  try {
    await pool.query(
      'UPDATE facilities SET name=?, description=?, capacity=?, price=?, icon=?, status=? WHERE id=?',
      [name, description || '', capacity, price, icon || '🏛️', status || 'available', id]
    );
    const [rows] = await pool.query('SELECT * FROM facilities WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /facilities/:id error', err);
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

// DELETE /facilities/:id — remove a facility
app.delete('/facilities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM facilities WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /facilities/:id error', err);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

// ===========================
// USERS TABLE SETUP
// ===========================

async function initUsersTable() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        username   VARCHAR(100)  NOT NULL UNIQUE,
        password   VARCHAR(500)  NOT NULL,
        email      VARCHAR(255)  NOT NULL,
        fullname   VARCHAR(255)  NOT NULL,
        phone      VARCHAR(20)   DEFAULT NULL,
        address    TEXT          DEFAULT NULL,
        role       VARCHAR(50)   NOT NULL DEFAULT 'resident',
        archived   TINYINT(1)    NOT NULL DEFAULT 0,
        created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    // Seed default accounts only when the table is empty
    const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM users');
    if (rows[0].cnt === 0) {
      await conn.query(`
        INSERT IGNORE INTO users (id, username, password, email, fullname, phone, address, role, archived)
        VALUES
          (1, 'admin',    'admin123',    'admin@barangay.ph',    'System Administrator', '09000000000', 'Barangay Molugan, Iloilo', 'admin',          0),
          (2, 'staff1',   'staff123',    'staff1@barangay.ph',   'Maria Santos',         '09223456789', 'Molugan, Iloilo',          'barangay_staff', 0),
          (3, 'staff2',   'staff123',    'staff2@barangay.ph',   'Pedro Reyes',          '09323456789', 'Molugan, Iloilo',          'barangay_staff', 0),
          (4, 'resident1','resident123', 'resident1@barangay.ph','Juan Dela Cruz',        '09123456789', 'Molugan, Iloilo',          'resident',       0)
      `);
      console.log('[users] seeded default accounts');
    }
  } finally {
    conn.release();
  }
}

// ===========================
// USERS ROUTES
// ===========================

// POST /users — register a new user (signup)
app.post('/users', async (req, res) => {
  const { username, password, email, fullname, phone, address, role } = req.body;

  if (!username || !password || !email || !fullname) {
    return res.status(400).json({ error: 'username, password, email and fullname are required' });
  }

  try {
    // Check if username already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? AND archived = 0',
      [username]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const [result] = await pool.query(
      `INSERT INTO users (username, password, email, fullname, phone, address, role, archived)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        username,
        password,           // frontend already sends PBKDF2 hash
        email,
        fullname,
        phone   || null,
        address || null,
        role    || 'resident'
      ]
    );

    const [rows] = await pool.query(
      'SELECT id, username, email, fullname, phone, address, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /users error', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /users/login — authenticate a user
app.post('/users/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND archived = 0',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    // The frontend sends the plain-text password; we compare against the stored value.
    // Stored value may be plain-text (legacy) or a PBKDF2 hash (pbkdf2$...).
    // We return the user record and let the frontend verify the hash using its
    // existing verifyPassword() helper so we don't duplicate crypto logic server-side.
    // For a production system you would verify the hash here using node's crypto module.
    // For now: if stored password is plain-text, compare directly.
    let authenticated = false;
    if (user.password && user.password.startsWith('pbkdf2$')) {
      // Return the stored hash so the frontend can verify with verifyPassword()
      // We send a special response so the client knows to do client-side verification
      return res.json({
        requireClientVerify: true,
        storedPassword: user.password,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullname: user.fullname,
          phone: user.phone,
          address: user.address,
          role: user.role
        }
      });
    } else {
      // Legacy plain-text comparison
      authenticated = (user.password === password);
    }

    if (!authenticated) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      phone: user.phone,
      address: user.address,
      role: user.role
    });
  } catch (err) {
    console.error('POST /users/login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /users — list all non-archived users (admin use)
app.get('/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, fullname, phone, address, role, created_at FROM users WHERE archived = 0 ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /users error', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

// ===========================
// RESERVATIONS TABLE SETUP
// ===========================

async function initReservationsTable() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        username          VARCHAR(100)   NOT NULL,
        facility_id       INT            NOT NULL,
        event_date        DATE           NOT NULL,
        event_end_date    DATE           DEFAULT NULL,
        start_time        VARCHAR(10)    NOT NULL,
        end_time          VARCHAR(10)    NOT NULL,
        event_type        VARCHAR(100)   DEFAULT NULL,
        expected_guests   INT            DEFAULT 0,
        event_description TEXT           DEFAULT NULL,
        contact_person    VARCHAR(255)   DEFAULT NULL,
        contact_phone     VARCHAR(20)    DEFAULT NULL,
        status            VARCHAR(50)    NOT NULL DEFAULT 'pending',
        total_cost        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
        payment_status    VARCHAR(50)    NOT NULL DEFAULT 'pending',
        payment_method    VARCHAR(50)    DEFAULT NULL,
        payment_date      TIMESTAMP      NULL DEFAULT NULL,
        approved_at       TIMESTAMP      NULL DEFAULT NULL,
        approved_by       VARCHAR(100)   DEFAULT NULL,
        rejection_reason  TEXT           DEFAULT NULL,
        rejected_at       TIMESTAMP      NULL DEFAULT NULL,
        rejected_by       VARCHAR(100)   DEFAULT NULL,
        created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    // Add event_end_date column if it doesn't exist (for existing tables)
    try {
      await conn.query(`ALTER TABLE reservations ADD COLUMN event_end_date DATE DEFAULT NULL AFTER event_date`);
      console.log('[reservations] added event_end_date column');
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
      // column already exists — that's fine
    }

    console.log('[reservations] table ready');
  } finally {
    conn.release();
  }
}

// Convert a MySQL reservation row (snake_case) to the camelCase shape the frontend expects
function rowToReservation(r) {
  return {
    id:               r.id,
    username:         r.username,
    facilityId:       r.facility_id,
    eventDate:        r.event_date ? r.event_date.toISOString().split('T')[0] : null,
    eventStartDate:   r.event_date ? r.event_date.toISOString().split('T')[0] : null,
    eventEndDate:     r.event_end_date ? r.event_end_date.toISOString().split('T')[0] : null,
    startTime:        r.start_time,
    endTime:          r.end_time,
    eventType:        r.event_type,
    expectedGuests:   r.expected_guests,
    eventDescription: r.event_description,
    contactPerson:    r.contact_person,
    contactPhone:     r.contact_phone,
    status:           r.status,
    totalCost:        parseFloat(r.total_cost) || 0,
    paymentStatus:    r.payment_status,
    paymentMethod:    r.payment_method,
    paymentDate:      r.payment_date,
    approvedAt:       r.approved_at,
    approvedBy:       r.approved_by,
    rejectionReason:  r.rejection_reason,
    rejectedAt:       r.rejected_at,
    rejectedBy:       r.rejected_by,
    createdAt:        r.created_at
  };
}

// ===========================
// RESERVATIONS ROUTES
// ===========================

// GET /reservations — list all; optional ?user= filter
app.get('/reservations', async (req, res) => {
  try {
    let query = 'SELECT * FROM reservations';
    const params = [];
    if (req.query.user) {
      query += ' WHERE username = ?';
      params.push(req.query.user);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows.map(rowToReservation));
  } catch (err) {
    console.error('GET /reservations error', err);
    res.status(500).json({ error: 'Failed to load reservations' });
  }
});

// POST /reservations — create a new reservation
app.post('/reservations', async (req, res) => {
  const {
    username, facilityId, eventDate, eventStartDate, eventEndDate,
    startTime, endTime, eventType, expectedGuests,
    eventDescription, contactPerson, contactPhone, totalCost
  } = req.body;

  const resolvedEventDate = eventDate || eventStartDate;

  if (!username || !facilityId || !resolvedEventDate || !startTime || !endTime) {
    return res.status(400).json({ error: 'username, facilityId, eventDate, startTime and endTime are required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO reservations
         (username, facility_id, event_date, event_end_date, start_time, end_time,
          event_type, expected_guests, event_description, contact_person, contact_phone,
          total_cost, status, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [
        username,
        facilityId,
        resolvedEventDate,
        eventEndDate || resolvedEventDate,
        startTime,
        endTime,
        eventType        || null,
        expectedGuests   || 0,
        eventDescription || null,
        contactPerson    || null,
        contactPhone     || null,
        totalCost        || 0
      ]
    );

    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [result.insertId]);
    res.status(201).json(rowToReservation(rows[0]));
  } catch (err) {
    console.error('POST /reservations error', err);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

// PUT /reservations/:id — update status, payment, approval, rejection
app.put('/reservations/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const fieldMap = {
    status:          'status',
    paymentStatus:   'payment_status',
    paymentMethod:   'payment_method',
    paymentDate:     'payment_date',
    approvedAt:      'approved_at',
    approvedBy:      'approved_by',
    rejectionReason: 'rejection_reason',
    rejectedAt:      'rejected_at',
    rejectedBy:      'rejected_by'
  };

  const setClauses = [];
  const values = [];

  Object.entries(fieldMap).forEach(([jsKey, dbCol]) => {
    if (Object.prototype.hasOwnProperty.call(updates, jsKey)) {
      setClauses.push(`${dbCol} = ?`);
      values.push(updates[jsKey]);
    }
  });

  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(id);

  try {
    const [result] = await pool.query(
      `UPDATE reservations SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Reservation not found' });

    const [rows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [id]);
    res.json(rowToReservation(rows[0]));
  } catch (err) {
    console.error('PUT /reservations/:id error', err);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

// DELETE /reservations/:id — cancel/delete a reservation
app.delete('/reservations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM reservations WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Reservation not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /reservations/:id error', err);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

// ===========================
// SERVER STARTUP
// ===========================

const port = process.env.PORT || 3000;

Promise.all([initFacilitiesTable(), initUsersTable(), initReservationsTable()])
  .then(() => {
    app.listen(port, () => console.log(`API listening on port ${port}`));
  })
  .catch(err => {
    console.error('Failed to initialise tables, starting anyway', err);
    app.listen(port, () => console.log(`API listening on port ${port}`));
  });
