// Simple API wrapper that talks to your backend server using cookie-based session auth.
// No localStorage data fallback: all business data must come from MySQL via API.

(function() {
    const BASE_URL = window.API_BASE_URL || '/barangay-reservation-system/api';
    const TAB_SESSION_KEY = 'brs_tab_session_id';
    const CSRF_TOKEN_KEY = 'brs_csrf_token';

    function generateTabSessionId() {
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
            const bytes = new Uint8Array(24);
            window.crypto.getRandomValues(bytes);
            return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        }
        return `${Date.now()}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
    }

    function getTabSessionId() {
        try {
            return sessionStorage.getItem(TAB_SESSION_KEY) || '';
        } catch (e) {
            return '';
        }
    }

    function setTabSessionId(value) {
        const sessionId = String(value || '').trim();
        if (!sessionId) return;
        try {
            sessionStorage.setItem(TAB_SESSION_KEY, sessionId);
        } catch (e) {
            // Ignore storage failures.
        }
    }

    function clearTabSessionId() {
        try {
            sessionStorage.removeItem(TAB_SESSION_KEY);
        } catch (e) {
            // Ignore storage failures.
        }
    }

    function getCsrfToken() {
        try {
            return sessionStorage.getItem(CSRF_TOKEN_KEY) || '';
        } catch (e) {
            return '';
        }
    }

    function setCsrfToken(value) {
        const token = String(value || '').trim();
        if (!token) return;
        try {
            sessionStorage.setItem(CSRF_TOKEN_KEY, token);
        } catch (e) {
            // Ignore storage failures.
        }
    }

    function clearCsrfToken() {
        try {
            sessionStorage.removeItem(CSRF_TOKEN_KEY);
        } catch (e) {
            // Ignore storage failures.
        }
    }

    function ensureTabSessionId() {
        let sessionId = getTabSessionId();
        if (!sessionId) {
            sessionId = generateTabSessionId();
            setTabSessionId(sessionId);
        }
        return sessionId;
    }

    async function request(path, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.credentials = 'include';
        const tabSessionId = ensureTabSessionId();
        if (tabSessionId) {
            options.headers['X-Tab-Session'] = tabSessionId;
        }
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            options.headers['X-CSRF-Token'] = csrfToken;
        }

        const res = await fetch(BASE_URL + path, options);
        if (!res.ok) {
            const text = await res.text();
            let parsed = null;
            try {
                parsed = JSON.parse(text);
            } catch {
                parsed = null;
            }
            if (parsed && typeof parsed === 'object') {
                const err = new Error(parsed.error || res.statusText);
                Object.keys(parsed).forEach(key => {
                    err[key] = parsed[key];
                });
                if (res.status === 401 && (parsed.code === 'SESSION_EXPIRED' || parsed.code === 'UNAUTHORIZED')) {
                    clearCsrfToken();
                    clearTabSessionId();
                }
                throw err;
            }
            throw new Error(text || res.statusText);
        }
        // try parse JSON, but return text if it fails
        const contentType = res.headers.get('content-type') || '';
        if (contentType.indexOf('application/json') !== -1) {
            const payload = await res.json();
            if (payload && typeof payload === 'object' && !Array.isArray(payload) && payload.csrfToken) {
                setCsrfToken(payload.csrfToken);
            }
            return payload;
        }
        return res.text();
    }

    async function getFacilities() {
        return request('/facilities');
    }

    async function createFacility(data) {
        return request('/facilities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    async function updateFacility(id, data) {
        return request('/facilities/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    async function deleteFacility(id) {
        return request('/facilities/' + id, { method: 'DELETE' });
    }

    async function getArchivedFacilities() {
        return request('/archive/facilities');
    }

    async function restoreArchivedFacility(id) {
        return request('/archive/facilities/' + id + '/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async function getReservationsByUser(username) {
        return request(`/reservations?user=${encodeURIComponent(username)}`);
    }

    async function getAllReservations() {
        return request('/reservations');
    }

    async function createReservation(data) {
        return request('/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    // PUT /reservations/:id — update a reservation (approve/reject/pay)
    async function updateReservation(id, data) {
        return request('/reservations/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    // DELETE /reservations/:id — cancel/delete a reservation
    async function deleteReservation(id) {
        return request('/reservations/' + id, { method: 'DELETE' });
    }

    async function getArchivedReservations() {
        return request('/archive/reservations');
    }

    async function restoreArchivedReservation(id) {
        return request('/archive/reservations/' + id + '/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async function getUsers() {
        return request('/users');
    }

    async function getArchivedUsers() {
        return request('/archive/users');
    }

    async function restoreArchivedUser(id) {
        return request('/archive/users/' + id + '/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async function updateUser(id, data) {
        return request('/users/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    async function deleteUser(id) {
        return request('/users/' + id, { method: 'DELETE' });
    }

    async function getNotificationsByUser(username) {
        return request(`/notifications?user=${encodeURIComponent(username)}`);
    }

    async function createNotification(data) {
        return request('/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    async function markNotificationAsRead(id) {
        return request('/notifications/' + id + '/read', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // POST /auth/signup — public staff signup request (pending admin approval)
    async function signup(userData) {
        return request('/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
    }

    // POST /users — admin creates an active user account
    async function createUser(userData) {
        return request('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
    }

    async function approveUser(id) {
        return request('/users/' + id + '/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // POST /users/login — authenticate against MySQL
    async function loginUser(username, password) {
        // Always rotate tab session id on a fresh login attempt to avoid collisions
        // when a browser tab was duplicated from an existing logged-in tab.
        setTabSessionId(generateTabSessionId());
        const user = await request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (user && user.sessionId) {
            setTabSessionId(user.sessionId);
        }
        return user;
    }

    async function changePasswordRequired(username, currentPassword, newPassword) {
        const user = await request('/auth/change-password-required', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, currentPassword, newPassword })
        });
        if (user && user.sessionId) {
            setTabSessionId(user.sessionId);
        }
        return user;
    }

    async function getSessionUser() {
        const user = await request('/auth/me');
        if (user && user.sessionId) {
            setTabSessionId(user.sessionId);
        }
        return user;
    }

    async function logout() {
        try {
            return await request('/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } finally {
            clearTabSessionId();
            clearCsrfToken();
        }
    }

    async function requestPasswordResetCode(email) {
        return request('/users/forgot-password/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
    }

    async function checkForgotPasswordEmail(email) {
        return request('/users/forgot-password/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
    }

    async function resetPasswordWithCode(email, code, newPassword) {
        return request('/users/forgot-password/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword })
        });
    }

    // expose
    window.api = {
        request,
        getFacilities,
        createFacility,
        updateFacility,
        deleteFacility,
        getArchivedFacilities,
        restoreArchivedFacility,
        getReservationsByUser,
        getAllReservations,
        createReservation,
        updateReservation,
        deleteReservation,
        getArchivedReservations,
        restoreArchivedReservation,
        getNotificationsByUser,
        createNotification,
        markNotificationAsRead,
        signup,
        createUser,
        approveUser,
        getUsers,
        getArchivedUsers,
        restoreArchivedUser,
        updateUser,
        deleteUser,
        loginUser,
        changePasswordRequired,
        getSessionUser,
        logout,
        checkForgotPasswordEmail,
        requestPasswordResetCode,
        resetPasswordWithCode
    };
})();


