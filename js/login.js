function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Validation
    if (!username || !password) {
        showMessage("Please enter both username and password", "error");
        return;
    }

    if (username.length < 3 || password.length < 3) {
        showMessage("Username and password must be at least 3 characters", "error");
        return;
    }

    // Check admin account
    if (username === "admin" && password === "admin123") {
        localStorage.setItem("role", "admin");
        localStorage.setItem("loggedInUser", "admin");
        localStorage.setItem("loginTime", new Date().toISOString());
        if (typeof showToast === 'function') showToast(`Welcome, Administrator`, 'success');
        setTimeout(() => { window.location.href = "admin-dashboard.html"; }, 800);
        return;
    }

    // Use AuthService if available (will use Firebase when configured), otherwise fall back to local DB
    if (window.AuthService && typeof AuthService.login === 'function') {
        AuthService.login(username, password)
            .then(function(user) {
                // `user` may be a local user object or a Firebase user
                const isFirebaseUser = user && user.uid;
                const savedUsername = !isFirebaseUser ? (user.username || username) : (user.email || username);
                const role = !isFirebaseUser ? (user.role || 'resident') : (localStorage.getItem('role') || 'resident');

                localStorage.setItem("role", role);
                localStorage.setItem("loggedInUser", savedUsername);
                localStorage.setItem("loginTime", new Date().toISOString());
                if (typeof showToast === 'function') showToast(`Welcome, ${user.fullname || savedUsername}`, 'success');

                const redirectUrl = role === "barangay_staff" ? "barangay-staff-dashboard.html" : (role === 'admin' ? 'admin-dashboard.html' : 'resident-dashboard.html');

                // if the login was handled by Firebase, grab and store the ID token
                if (isFirebaseUser && firebase && firebase.auth().currentUser) {
                    firebase.auth().currentUser.getIdToken()
                        .then(function(token) {
                            // save token for later API requests
                            localStorage.setItem('idToken', token);
                            setTimeout(() => { window.location.href = redirectUrl; }, 800);
                        })
                        .catch(function(e) {
                            console.warn('Failed to get ID token', e);
                            setTimeout(() => { window.location.href = redirectUrl; }, 800);
                        });
                } else {
                    setTimeout(() => { window.location.href = redirectUrl; }, 800);
                }
            })
            .catch(function(err) {
                showMessage(err && err.message ? err.message : "Invalid Username or Password", "error");
            });
        return;
    }

    // Fallback: Check user accounts (residents and staff) using local DB
    // Uses async verifyPassword() to correctly handle PBKDF2-hashed passwords
    const user = getUserByUsername(username);
    if (!user) {
        showMessage("Invalid Username or Password", "error");
        return;
    }

    verifyPassword(password, user.password).then(function(valid) {
        if (valid) {
            localStorage.setItem("role", user.role);
            localStorage.setItem("loggedInUser", username);
            localStorage.setItem("loginTime", new Date().toISOString());
            if (typeof showToast === 'function') showToast(`Welcome, ${user.fullname || username}`, 'success');

            // Redirect based on role
            const redirectUrl = user.role === "barangay_staff"
                ? "barangay-staff-dashboard.html"
                : "resident-dashboard.html";
            setTimeout(() => { window.location.href = redirectUrl; }, 800);
        } else {
            showMessage("Invalid Username or Password", "error");
        }
    }).catch(function() {
        showMessage("Invalid Username or Password", "error");
    });
}

function showMessage(message, type) {
    const messageDiv = document.getElementById("message");
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = type === "error" ? "error-message" : "success-message";
        messageDiv.style.display = "block";
        setTimeout(() => {
            messageDiv.style.display = "none";
        }, 3000);
    }
}

// Allow Enter key to login
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                login();
            }
        });
    }
    // Show password toggle
    // Eye toggle buttons
    function eyeSvg(open){
        if(open){
            return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-6 0-10-7-10-7a20.3 20.3 0 014.07-5.06" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        }
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    document.querySelectorAll('.eye-toggle').forEach(btn => {
        btn.addEventListener('click', function(){
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            this.innerHTML = eyeSvg(!isPassword);
        });
    });

    // Live username preview
    const usernameInput = document.getElementById('username');
    const preview = document.getElementById('loginPreview');
    if (usernameInput && preview) {
        usernameInput.addEventListener('input', function() {
            const v = this.value.trim();
            preview.textContent = v ? `Logging in as: ${v}` : '';
        });
    }
});

