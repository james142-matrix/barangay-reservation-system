// Minimal AuthService that uses API login and cookie-based sessions.
(function(){
    async function apiLogin(username, password) {
        if (!window.api || typeof window.api.loginUser !== 'function') {
            throw new Error('API not available');
        }
        return window.api.loginUser(username, password);
    }

    async function login(username, password) {
        try {
            const user = await apiLogin(username, password);
            return user;
        } catch (apiErr) {
            if (apiErr && apiErr.code === 'PASSWORD_CHANGE_REQUIRED') {
                throw apiErr;
            }
            if (apiErr && apiErr.message && apiErr.message.toLowerCase().includes('invalid username or password')) {
                throw { code: 'auth/invalid', message: 'Invalid Username or Password' };
            }
            throw apiErr;
        }
    }

    function logout() {
        if (!window.api || typeof window.api.logout !== 'function') {
            return Promise.resolve();
        }
        return window.api.logout();
    }

    window.AuthService = {
        login: login,
        logout: logout
    };
})();
