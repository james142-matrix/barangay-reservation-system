async function ensureFirebaseUserForSignup(email, password) {
    if (!window.firebaseAuth || typeof window.firebaseAuth.fetchSignInMethodsForEmail !== "function") {
        throw new Error("Firebase Auth is not initialized on signup page");
    }

    const methods = await window.firebaseAuth.fetchSignInMethodsForEmail(email);
    if (Array.isArray(methods) && methods.length > 0) {
        return { created: false, user: null };
    }

    const credential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
    return { created: true, user: credential.user || null };
}

async function signup() {
    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const username = document.getElementById("signup-username").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    // Validation
    if (!fullname || !phone || !address || !username || !password || !confirmPassword) {
        showMessage("All fields are required", "error");
        return;
    }

    if (username.length < 3) {
        showMessage("Username must be at least 3 characters", "error");
        return;
    }

    if (window.passwordPolicy && typeof window.passwordPolicy.validatePassword === "function") {
        const policy = window.passwordPolicy.validatePassword(password, username, email);
        if (!policy.ok) {
            showMessage(policy.error, "error");
            return;
        }
    } else if (password.length < 8) {
        showMessage("Password must be at least 8 characters", "error");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Passwords do not match", "error");
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email address", "error");
        return;
    }

    // Phone validation
    if (phone.length < 10) {
        showMessage("Please enter a valid phone number", "error");
        return;
    }

    let firebaseSync = { created: false, user: null };
    try {
        firebaseSync = await ensureFirebaseUserForSignup(email, password);

        const userData = {
            fullname: fullname,
            email: email,
            phone: phone,
            address: address,
            username: username,
            password: password,
            role: 'resident'
        };

        await window.api.signup(userData);

        if (firebaseSync.created && window.firebaseAuth && typeof window.firebaseAuth.signOut === "function") {
            await window.firebaseAuth.signOut();
        }

        if (typeof showToast === 'function') {
            showToast(`Account created for ${username}`, 'success');
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1000);
        } else {
            showMessage("Account created successfully! Redirecting to login...", "success");
            setTimeout(() => { window.location.href = "index.html"; }, 1200);
        }
    } catch (error) {
        if (firebaseSync.created && firebaseSync.user) {
            try {
                await firebaseSync.user.delete();
            } catch (_) {
                // ignore cleanup errors
            }
            try {
                if (window.firebaseAuth && typeof window.firebaseAuth.signOut === "function") {
                    await window.firebaseAuth.signOut();
                }
            } catch (_) {
                // ignore cleanup errors
            }
        }

        const msg = (error && error.message ? error.message : '').toLowerCase();
        if (msg.includes('firebase') || msg.includes('auth/')) {
            showMessage("Cannot create account right now: Firebase signup is not ready. Check Firebase Email/Password + Authorized Domains.", "error");
            return;
        }
        if (msg.includes('username already exists')) {
            showMessage("Username already taken, please choose another", "error");
            return;
        }
        if (msg.includes('email already exists')) {
            showMessage("Email is already registered", "error");
            return;
        }
        showMessage("Error creating account: " + (error.message || 'Unknown error'), "error");
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
        }, 4000);
    }
}

// Allow Enter key on last input to submit and add live preview + show-password
document.addEventListener('DOMContentLoaded', function() {
    const confirmPasswordInput = document.getElementById("confirm-password");
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                signup();
            }
        });
    }

    // Eye toggle buttons for individual password fields
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
    const usernameInput = document.getElementById('signup-username');
    const preview = document.getElementById('signupPreview');
    if (usernameInput && preview) {
        usernameInput.addEventListener('input', function() {
            const v = this.value.trim();
            preview.textContent = v ? `Signing up as: ${v}` : '';
        });
    }

});

