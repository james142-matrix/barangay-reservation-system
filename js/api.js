// Simple API wrapper that talks to your backend server using cookie-based session auth.
// No localStorage data fallback: all business data must come from MySQL via API.

(function() {
    const BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

    async function request(path, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.credentials = 'include';

        const res = await fetch(BASE_URL + path, options);
        if (!res.ok) {
            const text = await res.text();
            try {
                const parsed = JSON.parse(text);
                const err = new Error(parsed.error || res.statusText);
                if (parsed && typeof parsed === 'object') {
                    Object.keys(parsed).forEach(key => {
                        err[key] = parsed[key];
                    });
                }
                throw err;
            } catch {
                throw new Error(text || res.statusText);
            }
        }
        // try parse JSON, but return text if it fails
        const contentType = res.headers.get('content-type') || '';
        if (contentType.indexOf('application/json') !== -1) {
            return res.json();
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

    async function getUsers() {
        return request('/users');
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

    async function verifyGoogleToken(idToken) {
        return request('/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });
    }

    // POST /users — register a new user; sends the already-hashed password
    async function signup(userData) {
        return request('/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
    }

    // POST /users/login — authenticate against MySQL
    async function loginUser(username, password) {
        return request('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    }

    async function changePasswordRequired(username, currentPassword, newPassword) {
        return request('/auth/change-password-required', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, currentPassword, newPassword })
        });
    }

    async function getSessionUser() {
        return request('/auth/me');
    }

    async function logout() {
        return request('/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
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

    async function resetPasswordWithFirebaseCode(oobCode, newPassword) {
        return request('/users/forgot-password/firebase-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oobCode, newPassword })
        });
    }

    // expose
    window.api = {
        request,
        getFacilities,
        createFacility,
        updateFacility,
        deleteFacility,
        getReservationsByUser,
        getAllReservations,
        createReservation,
        updateReservation,
        deleteReservation,
        getNotificationsByUser,
        createNotification,
        markNotificationAsRead,
        verifyGoogleToken,
        signup,
        getUsers,
        updateUser,
        deleteUser,
        loginUser,
        changePasswordRequired,
        getSessionUser,
        logout,
        checkForgotPasswordEmail,
        requestPasswordResetCode,
        resetPasswordWithCode,
        resetPasswordWithFirebaseCode
    };
})();
