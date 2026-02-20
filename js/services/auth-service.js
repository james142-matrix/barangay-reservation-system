// Minimal AuthService that uses Firebase Auth when available, otherwise falls back to local DB
(function(){
    function localLogin(username, password) {
        return new Promise(function(resolve, reject) {
            try {
                const user = getUserByUsername(username);
                if (user && user.password === password) {
                    resolve(user);
                } else {
                    reject({ code: 'auth/invalid', message: 'Invalid Username or Password' });
                }
            } catch (e) {
                reject({ code: 'auth/error', message: e.message });
            }
        });
    }

    function login(username, password) {
        if (window.firebaseAvailable && window.firebaseAuth) {
            // If username looks like an email, try Firebase Auth first
            if (username && username.indexOf('@') !== -1) {
                return firebase.auth().signInWithEmailAndPassword(username, password)
                    .then(cred => cred.user)
                    .catch(err => Promise.reject({ code: err.code, message: err.message }));
            }
            // Otherwise, fall back to local lookup for compatibility
            return localLogin(username, password);
        }
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
