/* ===========================
   DATABASE SIMULATION using localStorage
   =========================== */

// Initialize database
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

    // Check if data exists, if not initialize
    if (!localStorage.getItem("barangayDB")) {
        localStorage.setItem("barangayDB", JSON.stringify(defaultData));
    } else {
        // Update existing database with new features
        const existingData = JSON.parse(localStorage.getItem("barangayDB"));
        
        // Ensure notifications array exists
        if (!existingData.notifications) {
            existingData.notifications = [];
        }
        
        // Ensure staff users exist in the database
        const staffUsers = [
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
        ];
        
        // Add staff users if they don't already exist
        staffUsers.forEach(staffUser => {
            if (!existingData.users.find(u => u.username === staffUser.username)) {
                existingData.users.push(staffUser);
            }
        });
        
        localStorage.setItem("barangayDB", JSON.stringify(existingData));
    }
}

// Get all data
function getDatabase() {
    initializeDatabase();
    return JSON.parse(localStorage.getItem("barangayDB"));
}

// Save database
function saveDatabase(data) {
    localStorage.setItem("barangayDB", JSON.stringify(data));
}

// ===========================
// USER FUNCTIONS
// ===========================

function getAllUsers() {
    const db = getDatabase();
    return db.users;
}

function getUserByUsername(username) {
    const db = getDatabase();
    return db.users.find(u => u.username === username);
}

function getUserById(id) {
    const db = getDatabase();
    return db.users.find(u => u.id === id);
}

function createUser(userData) {
    const db = getDatabase();
    const newUser = {
        id: Date.now(),
        ...userData,
        role: "resident"
    };
    db.users.push(newUser);
    saveDatabase(db);
    return newUser;
}

function updateUser(id, updates) {
    const db = getDatabase();
    const user = db.users.find(u => u.id === id);
    if (user) {
        Object.assign(user, updates);
        saveDatabase(db);
    }
    return user;
}

function deleteUser(id) {
    const db = getDatabase();
    db.users = db.users.filter(u => u.id !== id);
    saveDatabase(db);
}

// ===========================
// FACILITY FUNCTIONS
// ===========================

function getAllFacilities() {
    const db = getDatabase();
    return db.facilities;
}

function getFacilityById(id) {
    const db = getDatabase();
    return db.facilities.find(f => f.id === parseInt(id));
}

// ===========================
// RESERVATION FUNCTIONS
// ===========================

function createReservation(reservationData) {
    const db = getDatabase();
    const newReservation = {
        id: Date.now(),
        ...reservationData,
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
    const db = getDatabase();
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
    db.notifications.push(newNotification);
    saveDatabase(db);
    return newNotification;
}

function getNotificationsByUser(username) {
    const db = getDatabase();
    return db.notifications.filter(n => n.username === username).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function markNotificationAsRead(notificationId) {
    const db = getDatabase();
    const notification = db.notifications.find(n => n.id === parseInt(notificationId));
    if (notification) {
        notification.read = true;
        saveDatabase(db);
    }
    return notification;
}

function markAllNotificationsAsRead(username) {
    const db = getDatabase();
    db.notifications.forEach(n => {
        if (n.username === username && !n.read) {
            n.read = true;
        }
    });
    saveDatabase(db);
}

function getUnreadNotificationsCount(username) {
    const db = getDatabase();
    return db.notifications.filter(n => n.username === username && !n.read).length;
}

// Initialize database on load
initializeDatabase();

