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

    // Use AuthService (API/Firebase)
    if (window.AuthService && typeof AuthService.login === 'function') {
        AuthService.login(username, password)
            .then(function(user) {
                const role = user.role || 'resident';
                const savedUsername = user.username || username;
                if (typeof showToast === 'function') showToast(`Welcome, ${user.fullname || savedUsername}`, 'success');

                const redirectUrl = role === "barangay_staff" ? "barangay-staff-dashboard.html" : (role === 'admin' ? 'admin-dashboard.html' : 'resident-dashboard.html');
                setTimeout(() => { window.location.href = redirectUrl; }, 800);
            })
            .catch(async function(err) {
                if (err && err.code === 'PASSWORD_CHANGE_REQUIRED') {
                    await forcePasswordChangeFlow(username, password);
                    return;
                }
                showMessage(err && err.message ? err.message : "Invalid Username or Password", "error");
            });
        return;
    }
    showMessage("Login service unavailable", "error");
}

function validateNewPassword(newPassword, username) {
    if (window.passwordPolicy && typeof window.passwordPolicy.validatePassword === "function") {
        return window.passwordPolicy.validatePassword(newPassword, username, "");
    }
    if (String(newPassword || "").length < 8) {
        return { ok: false, error: "Password must be at least 8 characters long." };
    }
    return { ok: true };
}

async function forcePasswordChangeFlow(username, currentPassword) {
    if (!window.api || typeof window.api.changePasswordRequired !== "function") {
        showMessage("Password must be changed, but API endpoint is unavailable.", "error");
        return;
    }

    const firstPrompt = window.prompt(
        "Password change required.\nEnter a new password (8+ chars, at least 1 uppercase and 1 symbol, no spaces):"
    );
    if (!firstPrompt) {
        showMessage("Password change is required before login.", "error");
        return;
    }

    const validation = validateNewPassword(firstPrompt, username);
    if (!validation.ok) {
        showMessage(validation.error, "error");
        return;
    }

    const confirmPrompt = window.prompt("Confirm your new password:");
    if (!confirmPrompt) {
        showMessage("Password change canceled.", "error");
        return;
    }
    if (firstPrompt !== confirmPrompt) {
        showMessage("Passwords do not match.", "error");
        return;
    }

    try {
        const user = await window.api.changePasswordRequired(username, currentPassword, firstPrompt);
        const role = user.role || 'resident';
        if (typeof showToast === 'function') showToast('Password updated successfully.', 'success');
        const redirectUrl = role === "barangay_staff" ? "barangay-staff-dashboard.html" : (role === 'admin' ? 'admin-dashboard.html' : 'resident-dashboard.html');
        setTimeout(() => { window.location.href = redirectUrl; }, 900);
    } catch (error) {
        showMessage(error && error.message ? error.message : "Failed to change password", "error");
    }
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

