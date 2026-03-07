// Simple API wrapper that talks to your backend server using cookie-based session auth.
// No localStorage data fallback: all business data must come from MySQL via API.

(function() {
    const BASE_URL = window.API_BASE_URL || '/barangay-reservation-system/api';

    async function request(path, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.credentials = 'include';

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
                throw err;
            }
            throw new Error(text || res.statusText);
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


