// Firebase initializer (simple, non-breaking)
(function(){
    // Placeholder - replace with your Firebase project's config
    window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey: "AIzaSyBGUl7ho1zTlylQ9mvR9lkh-YKDPMzKiBA",
  authDomain: "barangay-reservation.firebaseapp.com",
  projectId: "barangay-reservation",
  storageBucket: "barangay-reservation.firebasestorage.app",
  messagingSenderId: "537024104735",
  appId: "1:537024104735:web:a1675c115fec296dc4082a",
  measurementId: "G-W1P3BGE7Z1"
    };

    window.initFirebase = function(config) {
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded. Skipping Firebase initialization.');
            window.firebaseAvailable = false;
            return;
        }
        try {
            firebase.initializeApp(config || window.FIREBASE_CONFIG);
            window.firebaseApp = firebase.app();
            window.firebaseAuth = firebase.auth();
            window.firebaseFirestore = firebase.firestore();
            window.firebaseAvailable = true;
            console.info('Firebase initialized (firebase-init.js)');
        } catch (e) {
            console.warn('Firebase initialization error:', e);
            window.firebaseAvailable = false;
        }
    };

    // Auto-init on DOMContentLoaded (harmless if SDK not present)
    window.addEventListener('DOMContentLoaded', function(){
        initFirebase();
    });
})();
