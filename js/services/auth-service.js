// Minimal AuthService that uses Firebase Auth when available, otherwise falls back to local DB
(function(){

    // Local login using localStorage DB — uses async verifyPassword() for PBKDF2 hashes
    async function localLogin(username, password) {
        const user = getUserByUsername(username);
        if (!user) {
            throw { code: 'auth/invalid', message: 'Invalid Username or Password' };
        }
        // verifyPassword handles both legacy plain-text and PBKDF2 hashed passwords
        const valid = await verifyPassword(password, user.password);
        if (!valid) {
            throw { code: 'auth/invalid', message: 'Invalid Username or Password' };
        }
        return user;
    }

    // API login — tries the MySQL server first, falls back to localLogin
    async function apiLogin(username, password) {
        if (!window.api || typeof window.api.loginUser !== 'function') {
            throw new Error('API not available');
        }
        const response = await window.api.loginUser(username, password);

        // Server returns { requireClientVerify, storedPassword, user } for PBKDF2 hashes
        if (response && response.requireClientVerify) {
            const valid = await verifyPassword(password, response.storedPassword);
            if (!valid) {
                throw { code: 'auth/invalid', message: 'Invalid Username or Password' };
            }
            return response.user;
        }

        return response;
    }

    async function login(username, password) {
        // Firebase path (email-based login)
        if (window.firebaseAvailable && window.firebaseAuth) {
            if (username && username.indexOf('@') !== -1) {
                try {
                    const cred = await firebase.auth().signInWithEmailAndPassword(username, password);
                    return cred.user;
                } catch (err) {
                    throw { code: err.code, message: err.message };
                }
            }
        }

        // Try MySQL via API first, fall back to localStorage
        try {
            const user = await apiLogin(username, password);
            console.log('[auth] logged in via MySQL API');
            return user;
        } catch (apiErr) {
            // If the API returned an explicit auth failure (401), don't fall back
            if (apiErr && apiErr.message && apiErr.message.includes('Invalid username or password')) {
                throw { code: 'auth/invalid', message: 'Invalid Username or Password' };
            }
            console.warn('[auth] API login failed, falling back to localStorage:', apiErr.message || apiErr);
        }

        // Fallback: localStorage with proper async password verification
        return localLogin(username, password);
    }

    function logout() {
        if (window.firebaseAvailable && window.firebaseAuth) {
            return firebase.auth().signOut();
        }
        return new Promise(function(resolve) {
            localStorage.removeItem('role');
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('loginTime');
            resolve();
        });
    }

    window.AuthService = {
        login: login,
        logout: logout
    };
})();
