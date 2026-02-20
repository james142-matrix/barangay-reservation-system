function signup() {
    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const username = document.getElementById("signup-username").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    // Validation
    if (!fullname || !email || !phone || !address || !username || !password || !confirmPassword) {
        showMessage("All fields are required", "error");
        return;
    }

    if (username.length < 3) {
        showMessage("Username must be at least 3 characters", "error");
        return;
    }

    if (password.length < 6) {
        showMessage("Password must be at least 6 characters", "error");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Passwords do not match", "error");
        return;
    }

    // Check if username already exists
    if (getUserByUsername(username)) {
        showMessage("Username already taken, please choose another", "error");
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

    try {
        // Create user
        const newUser = createUser({
            fullname: fullname,
            email: email,
            phone: phone,
            address: address,
            username: username,
            password: password
        });

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
        showMessage("Error creating account: " + error.message, "error");
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

