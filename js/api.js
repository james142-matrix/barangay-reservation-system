// Simple API wrapper that talks to your backend server using the stored Firebase ID token
// and falls back to the local database functions when the backend isn't available.

(function() {
    const BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

    async function request(path, options) {
        options = options || {};
        options.headers = options.headers || {};

        const token = localStorage.getItem('idToken');
        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }

        const res = await fetch(BASE_URL + path, options);
        if (!res.ok) {
            const text = await res.text();
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
        try {
            return await request('/facilities');
        } catch (e) {
            console.warn('API getFacilities failed, falling back to local', e);
            return getAllFacilities();
        }
    }

    async function createFacility(data) {
        try {
            return await request('/facilities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.warn('API createFacility failed, falling back to local', e);
            if (window.addFacility) return window.addFacility(data);
            throw e;
        }
    }

    async function updateFacility(id, data) {
        try {
            return await request('/facilities/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.warn('API updateFacility failed, falling back to local', e);
            if (window.updateFacility) return window.updateFacility(id, data);
            throw e;
        }
    }

    async function deleteFacility(id) {
        try {
            return await request('/facilities/' + id, { method: 'DELETE' });
        } catch (e) {
            console.warn('API deleteFacility failed, falling back to local', e);
            if (window.deleteFacility) return window.deleteFacility(id);
            throw e;
        }
    }

    async function getReservationsByUser(username) {
        try {
            return await request(`/reservations?user=${encodeURIComponent(username)}`);
        } catch (e) {
            console.warn('API getReservationsByUser failed, falling back to local', e);
            // call the global/local version explicitly to avoid recursion
            if (window.getReservationsByUser) {
                return window.getReservationsByUser(username);
            }
            return [];
        }
    }

    async function createReservation(data) {
        try {
            return await request('/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.warn('API createReservation failed, falling back to local', e);
            if (window.createReservation) {
                return window.createReservation(data);
            }
            throw e;
        }
    }

    // PUT /reservations/:id — update a reservation (approve/reject/pay)
    async function updateReservation(id, data) {
        try {
            return await request('/reservations/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.warn('API updateReservation failed, falling back to local', e);
            if (window.updateReservation) return window.updateReservation(id, data);
            throw e;
        }
    }

    // DELETE /reservations/:id — cancel/delete a reservation
    async function deleteReservation(id) {
        try {
            return await request('/reservations/' + id, { method: 'DELETE' });
        } catch (e) {
            console.warn('API deleteReservation failed, falling back to local', e);
            if (window.deleteReservation) return window.deleteReservation(id);
            throw e;
        }
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
    // Returns the user object on success, or throws on failure.
    // When the server returns { requireClientVerify, storedPassword, user } the caller
    // must verify the password client-side using verifyPassword() from database.js.
    async function loginUser(username, password) {
        return request('/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
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
        createReservation,
        updateReservation,
        deleteReservation,
        signup,
        loginUser
    };
})();
