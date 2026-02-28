 // Example Express server with email verification endpoint
// requires: express, firebase-admin, mysql2, cors, nodemailer

const express = require('express');
const admin = require('firebase-admin');
const mysql = require('mysql2/promise');
const cors = require('cors');
const nodemailer = require('nodemailer');
const session = require('express-session');
const crypto = require('crypto');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

// configure your MySQL connection as before
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay'
});

const app = express();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'barangay-dev-session-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// simple in-memory store for codes (for production use a table with expiry!)
const pendingCodes = new Map();
let reservationColumns = new Set();
const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

// setup a transporter for nodemailer (use real SMTP creds or a service)
const transporter = emailConfigured ? nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}) : null;

const DEMO_USERNAMES = new Set(['admin', 'staff1', 'staff2', 'resident1']);

function isStoredPasswordRecord(passwordValue) {
  return typeof passwordValue === 'string' && passwordValue.startsWith('pbkdf2$');
}

function isDemoUser(username) {
  return DEMO_USERNAMES.has(String(username || '').toLowerCase());
}

function validateStrongPassword(password, username = '', email = '') {
  const value = String(password || '');
  if (value.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(value)) {
    return { ok: false, error: 'Password must include at least one uppercase letter' };
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return { ok: false, error: 'Password must include at least one special character' };
  }
  if (/\s/.test(value)) {
    return { ok: false, error: 'Password must not contain spaces' };
  }
  return { ok: true };
}

app.post('/verification-codes', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).send('Email required');
  if (!emailConfigured || !transporter) {
    return res.status(503).json({ error: 'Email service is not configured' });
  }

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

// verify Google ID token using Google's tokeninfo endpoint
app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
      const detail = await response.text();
      return res.status(401).json({ error: 'Invalid Google token', detail });
    }
    const tokenInfo = await response.json();
    // email_verified comes as string "true"/"false" from tokeninfo.
    if (String(tokenInfo.email_verified) !== 'true') {
      return res.status(401).json({ error: 'Google email is not verified' });
    }

    res.json({
      valid: true,
      sub: tokenInfo.sub,
      email: tokenInfo.email || '',
      name: tokenInfo.name || ''
    });
  } catch (e) {
    console.error('google verify error', e);
    res.status(500).json({ error: 'Google verification failed' });
  }
});

function verifyStoredPassword(inputPassword, storedPassword) {
  if (!storedPassword || typeof storedPassword !== 'string') return false;

  // Legacy plain text support
  if (!isStoredPasswordRecord(storedPassword)) {
    return inputPassword === storedPassword;
  }

  const parts = storedPassword.split('$');
  if (parts.length !== 4) return false;

  const iterations = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');

  if (!iterations || !salt.length || !expected.length) return false;

  const derived = crypto.pbkdf2Sync(inputPassword, salt, iterations, expected.length, 'sha256');
  return crypto.timingSafeEqual(derived, expected);
}

function createStoredPassword(password) {
  const iterations = 120000;
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  return `pbkdf2$${iterations}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

function sanitizeUserRow(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullname: user.fullname,
    phone: user.phone,
    address: user.address,
    role: user.role
  };
}

function requiresPasswordReset(user) {
  if (!user) return true;
  if (isDemoUser(user.username)) return false;
  return Boolean(user.force_password_change) || !isStoredPasswordRecord(user.password);
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = req.session.user;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

async function recordPaymentTransaction(reservation, actorUsername) {
  if (!reservation || !reservation.id) return;

  const paymentStatus = String(reservation.paymentStatus || '').toLowerCase();
  if (paymentStatus !== 'paid' && paymentStatus !== 'cash') return;

  const amountValue = Number(reservation.totalCost);
  const amount = Number.isFinite(amountValue) ? amountValue : 0;
  const paymentMethod = reservation.paymentMethod || (paymentStatus === 'cash' ? 'cash' : 'online');
  const paymentDate = reservation.paymentDate ? new Date(reservation.paymentDate) : new Date();

  try {
    await pool.query(
      `INSERT INTO billing_transactions
         (reservation_id, username, facility_id, amount, payment_status, payment_method, payment_date, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         amount = VALUES(amount),
         payment_method = VALUES(payment_method),
         recorded_by = VALUES(recorded_by)`,
      [
        reservation.id,
        reservation.username,
        reservation.facilityId || null,
        amount,
        paymentStatus,
        paymentMethod,
        paymentDate,
        actorUsername || null
      ]
    );
  } catch (e) {
    console.error('record payment transaction error', e);
  }
}

// helper to create necessary tables and seed data
async function initTables() {
  const conn = await pool.getConnection();

  async function getColumnSet(tableName) {
    const [rows] = await conn.query(`SHOW COLUMNS FROM ${tableName}`);
    return new Set(rows.map(r => r.Field));
  }

  async function addColumnIfMissing(tableName, columnName, definitionSql) {
    const cols = await getColumnSet(tableName);
    if (!cols.has(columnName)) {
      await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
    }
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS facilities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      capacity INT NOT NULL DEFAULT 0,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      icon VARCHAR(20) CHARACTER SET utf8mb4 DEFAULT NULL,
      status VARCHAR(50) DEFAULT 'available',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      fullname VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      role VARCHAR(50) DEFAULT 'resident',
      force_password_change TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4;
  `);
  await addColumnIfMissing('users', 'force_password_change', 'TINYINT(1) NOT NULL DEFAULT 0');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      facility_id INT NOT NULL,
      event_date DATE NOT NULL,
      event_end_date DATE,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      event_type VARCHAR(100),
      expected_guests INT,
      event_description TEXT,
      contact_person VARCHAR(255),
      contact_phone VARCHAR(50),
      total_cost DECIMAL(10,2),
      status VARCHAR(20) DEFAULT 'pending',
      approved_by VARCHAR(255),
      approved_at DATETIME,
      payment_status VARCHAR(20),
      payment_method VARCHAR(50),
      payment_date DATETIME,
      rejection_reason TEXT,
      rejected_by VARCHAR(255),
      rejected_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4;
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS billing_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      reservation_id INT NOT NULL,
      username VARCHAR(255) NOT NULL,
      facility_id INT NULL,
      amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      payment_status VARCHAR(20) NOT NULL,
      payment_method VARCHAR(50),
      payment_date DATETIME NOT NULL,
      recorded_by VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_res_payment (reservation_id, payment_status, payment_date),
      KEY idx_bt_username (username),
      KEY idx_bt_payment_date (payment_date),
      CONSTRAINT fk_bt_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
      CONSTRAINT fk_bt_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL
    ) CHARACTER SET utf8mb4;
  `);

  // Backward-compatible migration for older camelCase reservation schemas.
  await addColumnIfMissing('reservations', 'facility_id', 'INT NULL');
  await addColumnIfMissing('reservations', 'event_date', 'DATE NULL');
  await addColumnIfMissing('reservations', 'event_end_date', 'DATE NULL');
  await addColumnIfMissing('reservations', 'start_time', 'TIME NULL');
  await addColumnIfMissing('reservations', 'end_time', 'TIME NULL');
  await addColumnIfMissing('reservations', 'event_type', 'VARCHAR(100) NULL');
  await addColumnIfMissing('reservations', 'expected_guests', 'INT NULL');
  await addColumnIfMissing('reservations', 'event_description', 'TEXT NULL');
  await addColumnIfMissing('reservations', 'contact_person', 'VARCHAR(255) NULL');
  await addColumnIfMissing('reservations', 'contact_phone', 'VARCHAR(50) NULL');
  await addColumnIfMissing('reservations', 'total_cost', 'DECIMAL(10,2) NULL');
  await addColumnIfMissing('reservations', 'approved_by', 'VARCHAR(255) NULL');
  await addColumnIfMissing('reservations', 'approved_at', 'DATETIME NULL');
  await addColumnIfMissing('reservations', 'payment_status', 'VARCHAR(20) NULL');
  await addColumnIfMissing('reservations', 'payment_method', 'VARCHAR(50) NULL');
  await addColumnIfMissing('reservations', 'payment_date', 'DATETIME NULL');
  await addColumnIfMissing('reservations', 'rejection_reason', 'TEXT NULL');
  await addColumnIfMissing('reservations', 'rejected_by', 'VARCHAR(255) NULL');
  await addColumnIfMissing('reservations', 'rejected_at', 'DATETIME NULL');

  const reservationCols = await getColumnSet('reservations');
  reservationColumns = reservationCols;
  const migrationPairs = [
    ['facility_id', 'facilityId'],
    ['event_date', 'eventDate'],
    ['event_end_date', 'eventEndDate'],
    ['start_time', 'startTime'],
    ['end_time', 'endTime'],
    ['event_type', 'eventType'],
    ['expected_guests', 'expectedGuests'],
    ['event_description', 'eventDescription'],
    ['contact_person', 'contactPerson'],
    ['contact_phone', 'contactPhone'],
    ['total_cost', 'totalCost'],
    ['approved_by', 'approvedBy'],
    ['approved_at', 'approvedAt'],
    ['payment_status', 'paymentStatus'],
    ['payment_method', 'paymentMethod'],
    ['payment_date', 'paymentDate'],
    ['rejection_reason', 'rejectionReason'],
    ['rejected_by', 'rejectedBy'],
    ['rejected_at', 'rejectedAt']
  ];
  const assignments = migrationPairs
    .filter(([snake, camel]) => reservationCols.has(snake) && reservationCols.has(camel))
    .map(([snake, camel]) => `${snake} = COALESCE(${snake}, ${camel})`);
  if (assignments.length > 0) {
    await conn.query(`UPDATE reservations SET ${assignments.join(', ')}`);
  }

  await conn.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      reservation_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4;
  `);

  // seed facilities if empty
  const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM facilities');
  if (rows[0].cnt === 0) {
    await conn.query(`INSERT INTO facilities (name,description,capacity,price,icon,status) VALUES ?`, [
      ['Community Hall','Large multi-purpose venue for events and gatherings',200,2000,'🏛️','available'],
      ['Sports Complex','Basketball court, badminton courts, and training facilities',150,1500,'🏀','available'],
      ['Cultural Center','Cultural performances and exhibits',100,1000,'🎭','available'],
      ['Library & Learning Center','Quiet study space with books and computers',50,500,'📚','available'],
      ['Medical Room','Small clinic for first aid and health checks',20,800,'🏥','available'],
      ['Garden Event Space','Outdoor garden ideal for parties and weddings',300,2500,'🌳','available']
    ]);
  }

  // Mark old plaintext passwords as requiring a reset.
  await conn.query(`
    UPDATE users
    SET force_password_change = 1
    WHERE force_password_change = 0
      AND LOWER(username) NOT IN ('admin', 'staff1', 'staff2', 'resident1')
      AND password NOT LIKE 'pbkdf2$%'
  `);

  await conn.query(`
    UPDATE users
    SET force_password_change = 0
    WHERE LOWER(username) IN ('admin', 'staff1', 'staff2', 'resident1')
  `);

  // Ensure at least one admin account exists.
  const [[adminCount]] = await conn.query('SELECT COUNT(*) AS cnt FROM users WHERE role=?', ['admin']);
  if (Number(adminCount.cnt) === 0) {
    await conn.query(
      `INSERT INTO users (username,password,email,fullname,phone,address,role,force_password_change)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        'admin',
        createStoredPassword('admin123'),
        'admin@barangay.local',
        'System Administrator',
        '',
        '',
        'admin',
        1
      ]
    );
  }

  conn.release();
}

// initialize tables on startup
initTables().catch(err => console.error('table init error', err));

// facility routes
app.get('/facilities', requireAuth, requireRole('resident', 'admin', 'barangay_staff'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM facilities ORDER BY id ASC');
    res.json(rows);
  } catch (e) {
    console.error('facilities fetch error', e);
    res.status(500).json({ error: 'Failed to load facilities' });
  }
});

app.post('/facilities', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, capacity, price, description = '', icon = '🏛️', status = 'available' } = req.body;
  if (!name || capacity == null || price == null) {
    return res.status(400).json({ error: 'name, capacity and price are required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO facilities (name,description,capacity,price,icon,status) VALUES (?,?,?,?,?,?)',
      [name, description, capacity, price, icon, status]
    );
    const [[facility]] = await pool.query('SELECT * FROM facilities WHERE id=?', [result.insertId]);
    res.status(201).json(facility);
  } catch (e) {
    console.error('create facility error', e);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

app.put('/facilities/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const id = req.params.id;
  const fields = req.body;
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  const updates = [];
  const values = [];
  for (const key of ['name','description','capacity','price','icon','status']) {
    if (fields[key] !== undefined) {
      updates.push(`${key}=?`);
      values.push(fields[key]);
    }
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields' });
  }
  values.push(id);
  try {
    const [result] = await pool.query(
      `UPDATE facilities SET ${updates.join(',')} WHERE id=?`, values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Facility not found' });
    const [[facility]] = await pool.query('SELECT * FROM facilities WHERE id=?', [id]);
    res.json(facility);
  } catch (e) {
    console.error('update facility error', e);
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

app.delete('/facilities/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const id = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM facilities WHERE id=?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Facility not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('delete facility error', e);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

// user routes
app.post('/users', async (req, res) => {
  const { username, password, email = '', fullname = '', phone = '', address = '', role = 'resident' } = req.body;
  if (!username || !password || !email) return res.status(400).json({ error: 'username, password and email required' });
  const passwordPolicy = validateStrongPassword(password, username, email);
  if (!passwordPolicy.ok) return res.status(400).json({ error: passwordPolicy.error, code: 'WEAK_PASSWORD' });

  try {
    const [[existingEmail]] = await pool.query(
      'SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',
      [email]
    );
    if (existingEmail) return res.status(409).json({ error: 'email already exists' });

    const storedPassword = createStoredPassword(String(password));
    const [result] = await pool.query(
      'INSERT INTO users (username,password,email,fullname,phone,address,role,force_password_change) VALUES (?,?,?,?,?,?,?,0)',
      [username, storedPassword, email, fullname, phone, address, role]
    );
    res.status(201).json({ id: result.insertId, username, role });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'username already exists' });
    console.error('create user error', e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

async function handleLogin(req, res) {
  const { username, password } = req.body;
  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE username=?', [username]);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    if (!verifyStoredPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (requiresPasswordReset(user)) {
      return res.status(403).json({
        error: 'Password change required',
        code: 'PASSWORD_CHANGE_REQUIRED',
        username: user.username
      });
    }

    const safeUser = sanitizeUserRow(user);
    req.session.user = safeUser;
    res.json(safeUser);
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'Login failed' });
  }
}

app.post('/auth/login', handleLogin);
app.post('/users/login', handleLogin);

app.post('/auth/change-password-required', async (req, res) => {
  const { username, currentPassword, newPassword } = req.body || {};
  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'username, currentPassword and newPassword required' });
  }

  try {
    const [[user]] = await pool.query('SELECT * FROM users WHERE username=?', [username]);
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });
    if (!verifyStoredPassword(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const policy = validateStrongPassword(newPassword, user.username, user.email);
    if (!policy.ok) return res.status(400).json({ error: policy.error, code: 'WEAK_PASSWORD' });
    if (verifyStoredPassword(newPassword, user.password)) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const storedPassword = createStoredPassword(String(newPassword));
    await pool.query(
      'UPDATE users SET password=?, force_password_change=0 WHERE id=?',
      [storedPassword, user.id]
    );

    const safeUser = sanitizeUserRow(user);
    req.session.user = safeUser;
    res.json(safeUser);
  } catch (e) {
    console.error('change-password-required error', e);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.get('/auth/me', (req, res) => {
  if (!req.session || !req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.session.user);
});

app.post('/auth/logout', (req, res) => {
  if (!req.session) return res.json({ success: true });
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

app.post('/users/forgot-password/check-email', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const [[user]] = await pool.query(
      'SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1',
      [email]
    );
    if (!user) return res.status(404).json({ error: 'Email is not registered' });
    res.json({ exists: true });
  } catch (e) {
    console.error('forgot-password check-email error', e);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

app.post('/users/forgot-password/request', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  if (!emailConfigured || !transporter) {
    return res.status(503).json({ error: 'Email service is not configured' });
  }

  try {
    const [[user]] = await pool.query('SELECT id FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1', [email]);
    if (!user) return res.status(404).json({ error: 'Email is not registered' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    pendingCodes.set(email.toLowerCase(), { code, expires });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password reset code',
      text: `Your password reset code is ${code}. It expires in 10 minutes.`
    });
    res.json({ status: 'ok' });
  } catch (e) {
    console.error('forgot-password request error', e);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

app.post('/users/forgot-password/reset', async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'email, code and newPassword required' });
  }

  const key = email.toLowerCase();
  const entry = pendingCodes.get(key);
  if (!entry) return res.status(400).json({ error: 'No code requested' });
  if (Date.now() > entry.expires) {
    pendingCodes.delete(key);
    return res.status(400).json({ error: 'Code expired' });
  }
  if (entry.code !== code) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  try {
    const [[user]] = await pool.query('SELECT id,username,email FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1', [email]);
    if (!user) {
      pendingCodes.delete(key);
      return res.status(404).json({ error: 'User not found' });
    }
    const policy = validateStrongPassword(newPassword, user.username, user.email);
    if (!policy.ok) return res.status(400).json({ error: policy.error, code: 'WEAK_PASSWORD' });
    const storedPassword = createStoredPassword(String(newPassword));

    const [result] = await pool.query(
      'UPDATE users SET password=?, force_password_change=0 WHERE LOWER(email)=LOWER(?)',
      [storedPassword, email]
    );
    if (result.affectedRows === 0) {
      pendingCodes.delete(key);
      return res.status(404).json({ error: 'User not found' });
    }
    pendingCodes.delete(key);
    res.json({ status: 'ok' });
  } catch (e) {
    console.error('forgot-password reset error', e);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.post('/users/forgot-password/firebase-reset', async (req, res) => {
  const { oobCode, newPassword } = req.body || {};
  if (!oobCode || !newPassword) {
    return res.status(400).json({ error: 'oobCode and newPassword required' });
  }

  const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyBGUl7ho1zTlylQ9mvR9lkh-YKDPMzKiBA';

  try {
    const resetResp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${encodeURIComponent(firebaseWebApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oobCode, newPassword })
      }
    );

    const resetBody = await resetResp.json().catch(() => ({}));
    if (!resetResp.ok) {
      const firebaseError = resetBody?.error?.message || 'INVALID_RESET_CODE';
      return res.status(400).json({ error: `Firebase reset failed: ${firebaseError}` });
    }

    const email = resetBody.email;
    if (!email) {
      return res.status(500).json({ error: 'Firebase reset succeeded but email was not returned' });
    }

    const [[user]] = await pool.query('SELECT id,username,email,password FROM users WHERE LOWER(email)=LOWER(?) LIMIT 1', [email]);
    if (!user) {
      return res.status(404).json({ error: 'No matching user was found in MySQL' });
    }
    const policy = validateStrongPassword(newPassword, user.username, user.email);
    if (!policy.ok) return res.status(400).json({ error: policy.error, code: 'WEAK_PASSWORD' });
    const storedPassword = createStoredPassword(String(newPassword));
    const [result] = await pool.query(
      'UPDATE users SET password=?, force_password_change=0 WHERE LOWER(email)=LOWER(?)',
      [storedPassword, email]
    );

    res.json({
      status: 'ok',
      email,
      mysqlUpdated: result.affectedRows > 0
    });
  } catch (e) {
    console.error('firebase forgot-password reset error', e);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.get('/users', requireAuth, requireRole('admin', 'barangay_staff'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id,username,email,fullname,phone,address,role FROM users');
    res.json(rows);
  } catch (e) {
    console.error('fetch users error', e);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

app.put('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const id = req.params.id;
  const fields = req.body || {};
  const updates = [];
  const values = [];

  try {
    const [[existingUser]] = await pool.query('SELECT id,username,email FROM users WHERE id=?', [id]);
    if (!existingUser) return res.status(404).json({ error: 'User not found' });

    const effectiveUsername = fields.username || existingUser.username || '';
    const effectiveEmail = fields.email || existingUser.email || '';

    for (const key of ['username', 'password', 'email', 'fullname', 'phone', 'address', 'role']) {
      if (typeof fields[key] !== 'undefined') {
        if (key === 'password') {
          const policy = validateStrongPassword(fields.password, effectiveUsername, effectiveEmail);
          if (!policy.ok) return res.status(400).json({ error: policy.error, code: 'WEAK_PASSWORD' });
          updates.push('password=?');
          values.push(createStoredPassword(String(fields.password)));
          updates.push('force_password_change=0');
          continue;
        }
        updates.push(`${key}=?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    const [result] = await pool.query(`UPDATE users SET ${updates.join(',')} WHERE id=?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    const [[user]] = await pool.query(
      'SELECT id,username,email,fullname,phone,address,role FROM users WHERE id=?',
      [id]
    );
    res.json(user);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'username or email already exists' });
    console.error('update user error', e);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const id = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id=?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('delete user error', e);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// reservation routes
function reservationSelectExpr(snake, camel, alias) {
  const hasSnake = reservationColumns.has(snake);
  const hasCamel = reservationColumns.has(camel);
  if (hasSnake && hasCamel) return `COALESCE(${snake}, ${camel}) AS ${alias}`;
  if (hasSnake) return `${snake} AS ${alias}`;
  if (hasCamel) return `${camel} AS ${alias}`;
  return `NULL AS ${alias}`;
}

function getReservationSelectSQL() {
  return `
    SELECT
      id,
      username,
      ${reservationSelectExpr('facility_id', 'facilityId', 'facilityId')},
      ${reservationSelectExpr('event_date', 'eventDate', 'eventDate')},
      ${reservationSelectExpr('event_end_date', 'eventEndDate', 'eventEndDate')},
      ${reservationSelectExpr('start_time', 'startTime', 'startTime')},
      ${reservationSelectExpr('end_time', 'endTime', 'endTime')},
      ${reservationSelectExpr('event_type', 'eventType', 'eventType')},
      ${reservationSelectExpr('expected_guests', 'expectedGuests', 'expectedGuests')},
      ${reservationSelectExpr('event_description', 'eventDescription', 'eventDescription')},
      ${reservationSelectExpr('contact_person', 'contactPerson', 'contactPerson')},
      ${reservationSelectExpr('contact_phone', 'contactPhone', 'contactPhone')},
      ${reservationSelectExpr('total_cost', 'totalCost', 'totalCost')},
      status,
      ${reservationSelectExpr('approved_by', 'approvedBy', 'approvedBy')},
      ${reservationSelectExpr('approved_at', 'approvedAt', 'approvedAt')},
      ${reservationSelectExpr('payment_status', 'paymentStatus', 'paymentStatus')},
      ${reservationSelectExpr('payment_method', 'paymentMethod', 'paymentMethod')},
      ${reservationSelectExpr('payment_date', 'paymentDate', 'paymentDate')},
      ${reservationSelectExpr('rejection_reason', 'rejectionReason', 'rejectionReason')},
      ${reservationSelectExpr('rejected_by', 'rejectedBy', 'rejectedBy')},
      ${reservationSelectExpr('rejected_at', 'rejectedAt', 'rejectedAt')},
      created_at
    FROM reservations
  `;
}

app.post('/reservations', requireAuth, requireRole('resident', 'admin', 'barangay_staff'), async (req, res) => {
  const data = req.body;
  if (req.user.role === 'resident') {
    data.username = req.user.username;
  }
  // basic validation
  if (!data.username || !data.facilityId || !data.eventDate || !data.startTime || !data.endTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const eventEndDate = data.eventEndDate || data.eventDate;
  const expectedGuests = data.expectedGuests ?? 0;
  const totalCost = data.totalCost ?? 0;
  const eventType = data.eventType || null;
  try {
    const cols = ['username'];
    const vals = [data.username];

    // Support both old (camelCase columns) and new (snake_case) schemas.
    if (reservationColumns.has('facility_id')) { cols.push('facility_id'); vals.push(data.facilityId); }
    if (reservationColumns.has('facilityId')) { cols.push('facilityId'); vals.push(data.facilityId); }
    if (reservationColumns.has('event_date')) { cols.push('event_date'); vals.push(data.eventDate); }
    if (reservationColumns.has('eventDate')) { cols.push('eventDate'); vals.push(data.eventDate); }
    if (reservationColumns.has('event_end_date')) { cols.push('event_end_date'); vals.push(eventEndDate); }
    if (reservationColumns.has('eventEndDate')) { cols.push('eventEndDate'); vals.push(eventEndDate); }
    if (reservationColumns.has('start_time')) { cols.push('start_time'); vals.push(data.startTime); }
    if (reservationColumns.has('startTime')) { cols.push('startTime'); vals.push(data.startTime); }
    if (reservationColumns.has('end_time')) { cols.push('end_time'); vals.push(data.endTime); }
    if (reservationColumns.has('endTime')) { cols.push('endTime'); vals.push(data.endTime); }
    if (reservationColumns.has('event_type')) { cols.push('event_type'); vals.push(eventType); }
    if (reservationColumns.has('eventType')) { cols.push('eventType'); vals.push(eventType); }
    if (reservationColumns.has('expected_guests')) { cols.push('expected_guests'); vals.push(expectedGuests); }
    if (reservationColumns.has('expectedGuests')) { cols.push('expectedGuests'); vals.push(expectedGuests); }
    if (reservationColumns.has('event_description')) { cols.push('event_description'); vals.push(data.eventDescription || null); }
    if (reservationColumns.has('eventDescription')) { cols.push('eventDescription'); vals.push(data.eventDescription || null); }
    if (reservationColumns.has('contact_person')) { cols.push('contact_person'); vals.push(data.contactPerson || null); }
    if (reservationColumns.has('contactPerson')) { cols.push('contactPerson'); vals.push(data.contactPerson || null); }
    if (reservationColumns.has('contact_phone')) { cols.push('contact_phone'); vals.push(data.contactPhone || null); }
    if (reservationColumns.has('contactPhone')) { cols.push('contactPhone'); vals.push(data.contactPhone || null); }
    if (reservationColumns.has('total_cost')) { cols.push('total_cost'); vals.push(totalCost); }
    if (reservationColumns.has('totalCost')) { cols.push('totalCost'); vals.push(totalCost); }

    const placeholders = cols.map(() => '?').join(',');
    const [result] = await pool.query(
      `INSERT INTO reservations (${cols.join(',')}) VALUES (${placeholders})`,
      vals
    );
    const [[row]] = await pool.query(`${getReservationSelectSQL()} WHERE id=?`, [result.insertId]);
    res.status(201).json(row);
  } catch (e) {
    console.error('create reservation error', e);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

app.get('/reservations', requireAuth, requireRole('resident', 'admin', 'barangay_staff'), async (req, res) => {
  try {
    const { user } = req.query;
    const requestedUser = user || null;
    if (req.user.role === 'resident' && requestedUser && requestedUser !== req.user.username) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let query = getReservationSelectSQL();
    const params = [];
    if (req.user.role === 'resident') {
      query += ' WHERE username=?';
      params.push(req.user.username);
    } else if (requestedUser) {
      query += ' WHERE username=?';
      params.push(requestedUser);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error('fetch reservations error', e);
    res.status(500).json({ error: 'Failed to load reservations' });
  }
});

app.put('/reservations/:id', requireAuth, requireRole('resident', 'admin', 'barangay_staff'), async (req, res) => {
  const id = req.params.id;
  const fields = req.body;
  const updates = [];
  const values = [];
  const dualMap = {
    facilityId: ['facility_id', 'facilityId'],
    eventDate: ['event_date', 'eventDate'],
    eventEndDate: ['event_end_date', 'eventEndDate'],
    startTime: ['start_time', 'startTime'],
    endTime: ['end_time', 'endTime'],
    eventType: ['event_type', 'eventType'],
    expectedGuests: ['expected_guests', 'expectedGuests'],
    eventDescription: ['event_description', 'eventDescription'],
    contactPerson: ['contact_person', 'contactPerson'],
    contactPhone: ['contact_phone', 'contactPhone'],
    totalCost: ['total_cost', 'totalCost'],
    approvedBy: ['approved_by', 'approvedBy'],
    approvedAt: ['approved_at', 'approvedAt'],
    paymentStatus: ['payment_status', 'paymentStatus'],
    paymentMethod: ['payment_method', 'paymentMethod'],
    paymentDate: ['payment_date', 'paymentDate'],
    rejectionReason: ['rejection_reason', 'rejectionReason'],
    rejectedBy: ['rejected_by', 'rejectedBy'],
    rejectedAt: ['rejected_at', 'rejectedAt']
  };
  for (const key of Object.keys(fields)) {
    if (key === 'username' || key === 'status') {
      if (reservationColumns.has(key)) {
        updates.push(`${key}=?`);
        values.push(fields[key]);
      }
      continue;
    }
    const targets = dualMap[key];
    if (!targets) continue;
    for (const col of targets) {
      if (reservationColumns.has(col)) {
        updates.push(`${col}=?`);
        values.push(fields[key]);
      }
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
  values.push(id);
  try {
    if (req.user.role === 'resident') {
      const [[existing]] = await pool.query('SELECT username FROM reservations WHERE id=?', [id]);
      if (!existing) return res.status(404).json({ error: 'Reservation not found' });
      if (existing.username !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
    }
    const [result] = await pool.query(`UPDATE reservations SET ${updates.join(',')} WHERE id=?`, values);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Reservation not found' });
    const [[row]] = await pool.query(`${getReservationSelectSQL()} WHERE id=?`, [id]);
    await recordPaymentTransaction(row, req.user && req.user.username ? req.user.username : null);
    res.json(row);
  } catch (e) {
    console.error('update reservation error', e);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
});

app.delete('/reservations/:id', requireAuth, requireRole('resident', 'admin', 'barangay_staff'), async (req, res) => {
  const id = req.params.id;
  try {
    if (req.user.role === 'resident') {
      const [[existing]] = await pool.query('SELECT username FROM reservations WHERE id=?', [id]);
      if (!existing) return res.status(404).json({ error: 'Reservation not found' });
      if (existing.username !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
    }
    const [result] = await pool.query('DELETE FROM reservations WHERE id=?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Reservation not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('delete reservation error', e);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
});

// notification routes
const NOTIFICATION_SELECT_SQL = `
  SELECT
    id,
    username,
    title,
    message,
    type,
    is_read AS isRead,
    reservation_id AS reservationId,
    created_at AS createdAt
  FROM notifications
`;

app.get('/notifications', requireAuth, requireRole('resident', 'admin', 'barangay_staff'), async (req, res) => {
  try {
    const { user } = req.query;
    const requestedUser = user || null;
    if (req.user.role === 'resident' && requestedUser && requestedUser !== req.user.username) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let query = NOTIFICATION_SELECT_SQL;
    const params = [];
    if (req.user.role === 'resident') {
      query += ' WHERE username=?';
      params.push(req.user.username);
    } else if (requestedUser) {
      query += ' WHERE username=?';
      params.push(requestedUser);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    console.error('fetch notifications error', e);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

app.post('/notifications', requireAuth, requireRole('resident', 'admin', 'barangay_staff'), async (req, res) => {
  const {
    username,
    title,
    message,
    type = 'info',
    isRead = false,
    reservationId = null
  } = req.body || {};

  if (!username || !title || !message) {
    return res.status(400).json({ error: 'username, title and message are required' });
  }

  if (req.user.role === 'resident' && username !== req.user.username) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO notifications
         (username,title,message,type,is_read,reservation_id)
       VALUES (?,?,?,?,?,?)`,
      [username, title, message, type, isRead ? 1 : 0, reservationId]
    );
    const [[row]] = await pool.query(`${NOTIFICATION_SELECT_SQL} WHERE id=?`, [result.insertId]);
    res.status(201).json(row);
  } catch (e) {
    console.error('create notification error', e);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

app.put('/notifications/:id/read', requireAuth, requireRole('resident', 'admin', 'barangay_staff'), async (req, res) => {
  const id = req.params.id;
  try {
    if (req.user.role === 'resident') {
      const [[existing]] = await pool.query('SELECT username FROM notifications WHERE id=?', [id]);
      if (!existing) return res.status(404).json({ error: 'Notification not found' });
      if (existing.username !== req.user.username) return res.status(403).json({ error: 'Forbidden' });
    }
    const [result] = await pool.query('UPDATE notifications SET is_read=1 WHERE id=?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Notification not found' });
    const [[row]] = await pool.query(`${NOTIFICATION_SELECT_SQL} WHERE id=?`, [id]);
    res.json(row);
  } catch (e) {
    console.error('mark notification read error', e);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// additional routes could go here
app.use(express.static(path.join(__dirname, '..')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on port ${port}`));
