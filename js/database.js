/* ===========================
   DATABASE SIMULATION using localStorage
   =========================== */

// Legacy in-memory fallback object (non-persistent).
let legacyDbCache = null;

// Initialize in-memory database (no localStorage persistence)
function initializeDatabase() {
    const defaultData = {
        users: [
            {
                id: 1,
                username: "resident1",
                password: "resident123",
                email: "resident1@barangay.ph",
                fullname: "Juan Dela Cruz",
                phone: "09123456789",
                address: "Molugan, Iloilo",
                role: "resident"
            },
            {
                id: 2,
                username: "staff1",
                password: "staff123",
                email: "staff1@barangay.ph",
                fullname: "Maria Santos",
                phone: "09223456789",
                address: "Molugan, Iloilo",
                role: "barangay_staff"
            },
            {
                id: 3,
                username: "staff2",
                password: "staff123",
                email: "staff2@barangay.ph",
                fullname: "Pedro Reyes",
                phone: "09323456789",
                address: "Molugan, Iloilo",
                role: "barangay_staff"
            }
        ],
        facilities: [
            {
                id: 1,
                name: "Community Hall",
                description: "Large multi-purpose venue for events and gatherings",
                capacity: 200,
                price: 2000,
                icon: "🏛️",
                status: "available"
            },
            {
                id: 2,
                name: "Sports Complex",
                description: "Basketball court, badminton courts, and training facilities",
                capacity: 150,
                price: 1500,
                icon: "🏀",
                status: "available"
            },
            {
                id: 3,
                name: "Cultural Center",
                description: "Dedicated space for cultural events and workshops",
                capacity: 100,
                price: 1000,
                icon: "🎭",
                status: "available"
            },
            {
                id: 4,
                name: "Library & Learning Center",
                description: "Quiet study area with meeting rooms",
                capacity: 50,
                price: 500,
                icon: "📚",
                status: "available"
            },
            {
                id: 5,
                name: "Medical Room",
                description: "First aid and emergency medical services room",
                capacity: 20,
                price: 800,
                icon: "🏥",
                status: "available"
            },
            {
                id: 6,
                name: "Garden Event Space",
                description: "Outdoor venue with covered pavilion",
                capacity: 300,
                price: 2500,
                icon: "🌳",
                status: "available"
            }
        ],
        reservations: [],
        adminApprovals: [],
        notifications: []
    };
    if (!legacyDbCache) {
        legacyDbCache = JSON.parse(JSON.stringify(defaultData));
    }
}

// Get all data
function getDatabase() {
    initializeDatabase();
    return JSON.parse(JSON.stringify(legacyDbCache));
}

// Save database
function saveDatabase(data) {
    legacyDbCache = JSON.parse(JSON.stringify(data));
}

// ===========================
// USER FUNCTIONS
// ===========================

function isSecurePasswordRecord(passwordValue) {
    return typeof passwordValue === "string" && passwordValue.startsWith("pbkdf2$");
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function secureCompareBytes(a, b) {
    if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
    if (a.length !== b.length) return false;

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a[i] ^ b[i];
    }
    return diff === 0;
}

async function hashPassword(password) {
    if (!password || typeof password !== "string") {
        throw new Error("Password is required");
    }

    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
        throw new Error("Secure password hashing is not supported in this browser");
    }

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iterations = 120000;
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );

    const hashBuffer = await window.crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: "SHA-256"
        },
        keyMaterial,
        256
    );

    const saltBase64 = arrayBufferToBase64(salt);
    const hashBase64 = arrayBufferToBase64(hashBuffer);
    return `pbkdf2$${iterations}$${saltBase64}$${hashBase64}`;
}

async function verifyPassword(password, storedPassword) {
    if (!storedPassword || typeof storedPassword !== "string") return false;

    if (!isSecurePasswordRecord(storedPassword)) {
        return password === storedPassword;
    }

    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
        return false;
    }

    const parts = storedPassword.split("$");
    if (parts.length !== 4) return false;

    const iterations = parseInt(parts[1], 10);
    const saltBase64 = parts[2];
    const expectedHashBase64 = parts[3];

    if (!Number.isFinite(iterations) || iterations < 1) return false;

    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );

    const actualHashBuffer = await window.crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: base64ToUint8Array(saltBase64),
            iterations: iterations,
            hash: "SHA-256"
        },
        keyMaterial,
        256
    );

    const expectedHashBytes = base64ToUint8Array(expectedHashBase64);
    const actualHashBytes = new Uint8Array(actualHashBuffer);
    return secureCompareBytes(expectedHashBytes, actualHashBytes);
}

async function authenticateUser(username, password) {
    const db = getDatabase();
    const user = db.users.find(u => u.username === username);
    if (!user) return null;

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return null;

    // Migrate legacy plaintext passwords after first successful login.
    if (!isSecurePasswordRecord(user.password)) {
        user.password = await hashPassword(password);
        saveDatabase(db);
    }

    return user;
}

function getAllUsers() {
    const db = getDatabase();
    // return only non-archived users
    return db.users.filter(u => !u.archived);
}

function getUserByUsername(username) {
    const db = getDatabase();
    return db.users.find(u => u.username === username && !u.archived);
}

function getUserById(id) {
    const db = getDatabase();
    return db.users.find(u => u.id === id && !u.archived);
}

async function createUser(userData) {
    const db = getDatabase();
    const safePassword = userData.password ? String(userData.password) : "";
    const hashedPassword = safePassword && !isSecurePasswordRecord(safePassword)
        ? await hashPassword(safePassword)
        : safePassword;

    const newUser = {
        id: Date.now(),
        ...userData,
        password: hashedPassword,
        role: userData.role || "resident",
        archived: false
    };
    db.users.push(newUser);
    saveDatabase(db);
    return newUser;
}

async function updateUser(id, updates) {
    const db = getDatabase();
    const user = db.users.find(u => u.id === id);
    if (user) {
        const nextUpdates = { ...updates };
        if (Object.prototype.hasOwnProperty.call(nextUpdates, "password")) {
            if (!nextUpdates.password) {
                delete nextUpdates.password;
            } else if (!isSecurePasswordRecord(nextUpdates.password)) {
                nextUpdates.password = await hashPassword(String(nextUpdates.password));
            }
        }
        Object.assign(user, nextUpdates);
        saveDatabase(db);
    }
    return user;
}

// mark a user as archived instead of removing from database
function archiveUser(id) {
    const db = getDatabase();
    const user = db.users.find(u => u.id === id);
    if (user) {
        user.archived = true;
        saveDatabase(db);
    }
    return user;
}

// kept for compatibility (but now archive)
function deleteUser(id) {
    return archiveUser(id);
}

// ===========================
// FACILITY FUNCTIONS
// ===========================

function getAllFacilities() {
    const db = getDatabase();
    if (!Array.isArray(db.facilities) || db.facilities.length === 0) {
        // ensure we always have the default set; this handles cases where
        // localStorage was manually cleared or corrupted by earlier buggy code
        db.facilities = [
            {
                id: 1,
                name: "Community Hall",
                description: "Large multi-purpose venue for events and gatherings",
                capacity: 200,
                price: 2000,
                icon: "🏛️",
                status: "available"
            },
            {
                id: 2,
                name: "Sports Complex",
                description: "Basketball court, badminton courts, and training facilities",
                capacity: 150,
                price: 1500,
                icon: "🏀",
                status: "available"
            },
            {
                id: 3,
                name: "Cultural Center",
                description: "Dedicated space for cultural events and workshops",
                capacity: 100,
                price: 1000,
                icon: "🎭",
                status: "available"
            },
            {
                id: 4,
                name: "Library & Learning Center",
                description: "Quiet study area with meeting rooms",
                capacity: 50,
                price: 500,
                icon: "📚",
                status: "available"
            },
            {
                id: 5,
                name: "Medical Room",
                description: "First aid and emergency medical services room",
                capacity: 20,
                price: 800,
                icon: "🏥",
                status: "available"
            },
            {
                id: 6,
                name: "Garden Event Space",
                description: "Outdoor venue with covered pavilion",
                capacity: 300,
                price: 2500,
                icon: "🌳",
                status: "available"
            }
        ];
        saveDatabase(db);
    }
    return db.facilities;
}

function getFacilityById(id) {
    const db = getDatabase();
    return db.facilities.find(f => String(f.id) === String(id));
}

// add a new facility record
function addFacility(facilityData) {
    const db = getDatabase();
    db.facilities.push(facilityData);
    saveDatabase(db);
    return facilityData;
}

// update an existing facility; returns the updated object or null if not found
function updateFacility(id, updates) {
    const db = getDatabase();
    const f = db.facilities.find(f => String(f.id) === String(id));
    if (!f) return null;
    Object.assign(f, updates);
    saveDatabase(db);
    return f;
}

// remove a facility by id
function deleteFacility(id) {
    const db = getDatabase();
    db.facilities = db.facilities.filter(f => String(f.id) !== String(id));
    saveDatabase(db);
}

// ===========================
// RESERVATION FUNCTIONS
// ===========================

function createReservation(reservationData) {
    const db = getDatabase();
    const newReservation = {
        id: Date.now(),
        ...reservationData,
        // billing related defaults
        totalCost: reservationData.totalCost || 0,
        paymentStatus: "pending", // pending / paid / cash
        paymentMethod: null,

        status: "pending",
        createdAt: new Date().toISOString(),
        approvedAt: null,
        approvedBy: null
    };
    db.reservations.push(newReservation);
    saveDatabase(db);
    return newReservation;
}

function getReservationsByUser(username) {
    const db = getDatabase();
    return db.reservations.filter(r => r.username === username);
}

function getAllReservations() {
    const db = getDatabase();
    return db.reservations;
}

function getReservationById(id) {
    const db = getDatabase();
    return db.reservations.find(r => r.id === parseInt(id));
}

function updateReservation(id, updates) {
    const db = getDatabase();
    const reservation = db.reservations.find(r => r.id === parseInt(id));
    if (reservation) {
        Object.assign(reservation, updates);
        saveDatabase(db);
    }
    return reservation;
}

function deleteReservation(id) {
    const db = getDatabase();
    db.reservations = db.reservations.filter(r => r.id !== parseInt(id));
    saveDatabase(db);
}

function approveReservation(id, adminUsername) {
    return updateReservation(id, {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: adminUsername
    });
}

function rejectReservation(id, reason, adminUsername) {
    return updateReservation(id, {
        status: "rejected",
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: adminUsername
    });
}

// Mark reservation as paid (online) or cash
function payReservation(id, method) {
    const updates = {
        paymentStatus: "paid",
        paymentMethod: method,
        paymentDate: new Date().toISOString(),
        status: "completed" // mark complete once paid
    };
    return updateReservation(id, updates);
}

function markReservationCash(id) {
    const updates = {
        paymentStatus: "cash",
        paymentMethod: "cash",
        paymentDate: new Date().toISOString(),
        status: "completed"
    };
    return updateReservation(id, updates);
}

// ===========================
// BILLING HELPER FUNCTIONS
// ===========================

// Returns approved reservations that have not yet been paid for a specific user
function getUnpaidReservationsByUser(username) {
    const db = getDatabase();
    return db.reservations.filter(r =>
        r.username === username &&
        r.status === 'approved' &&
        r.paymentStatus !== 'paid' &&
        r.paymentStatus !== 'cash'
    );
}

// Convenience wrapper used by billing.js — marks a reservation as paid online
function markReservationPaid(id) {
    return payReservation(id, 'online');
}

// ===========================
// STATISTICS FUNCTIONS
// ===========================

function getReservationStats() {
    const db = getDatabase();
    const reservations = db.reservations;

    return {
        total: reservations.length,
        pending: reservations.filter(r => r.status === "pending").length,
        approved: reservations.filter(r => r.status === "approved").length,
        rejected: reservations.filter(r => r.status === "rejected").length,
        completed: reservations.filter(r => r.status === "completed").length
    };
}

// ===========================
// NOTIFICATION FUNCTIONS
// ===========================

function createNotification(username, title, message, type = 'info', reservationId = null) {
    const newNotification = {
        id: Date.now(),
        username: username,
        title: title,
        message: message,
        type: type, // 'approved', 'rejected', 'info'
        read: false,
        createdAt: new Date().toISOString(),
        reservationId: reservationId
    };
    // Persist notification to MySQL API only.
    if (window.api && typeof window.api.createNotification === 'function') {
        window.api.createNotification({
            username: username,
            title: title,
            message: message,
            type: type,
            reservationId: reservationId
        }).catch(err => {
            console.warn('[notifications] API create failed:', err.message || err);
        });
    }

    return newNotification;
}

function getNotificationsByUser(username) {
    // Pull latest from MySQL (sync signature required by existing UI calls).
    try {
        if (window.api && typeof window.api.getNotificationsByUser === 'function') {
            const xhr = new XMLHttpRequest();
            const base = window.API_BASE_URL || '/barangay-reservation-system/api';
            xhr.open('GET', `${base}/notifications?user=${encodeURIComponent(username)}`, false);
            xhr.withCredentials = true;
            xhr.send();
            if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
                return JSON.parse(xhr.responseText).map(r => ({
                    id: r.id,
                    username: r.username,
                    title: r.title,
                    message: r.message,
                    type: r.type || 'info',
                    read: !!(r.isRead || r.is_read),
                    createdAt: r.createdAt || r.created_at || new Date().toISOString(),
                    reservationId: r.reservationId ?? r.reservation_id ?? null
                }));
            }
        }
    } catch (e) {
        console.warn('[notifications] API get failed:', e.message || e);
    }
    return [];
}

function markNotificationAsRead(notificationId) {
    if (window.api && typeof window.api.markNotificationAsRead === 'function') {
        window.api.markNotificationAsRead(notificationId).catch(err => {
            console.warn('[notifications] API mark-read failed:', err.message || err);
        });
    }
    return { id: parseInt(notificationId, 10), read: true };
}

function markAllNotificationsAsRead(username) {
    const notifications = getNotificationsByUser(username);
    notifications.filter(n => !n.read).forEach(n => markNotificationAsRead(n.id));
}

function getUnreadNotificationsCount(username) {
    return getNotificationsByUser(username).filter(n => !n.read).length;
}

// Initialize database on load
initializeDatabase();



