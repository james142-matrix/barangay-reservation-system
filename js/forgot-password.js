function showMessage(message, type) {
    const messageDiv = document.getElementById("message");
    if (!messageDiv) return;
    messageDiv.textContent = message;
    messageDiv.className = type === "error" ? "error-message" : "success-message";
    messageDiv.style.display = "block";
    setTimeout(() => {
        messageDiv.style.display = "none";
    }, 12000);
}

async function requestResetCode() {
    const email = document.getElementById("reset-email").value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email address", "error");
        return;
    }

    if (!window.api || typeof window.api.checkForgotPasswordEmail !== "function") {
        showMessage("API is not initialized on this page", "error");
        return;
    }

    try {
        await window.api.checkForgotPasswordEmail(email);
        const result = await window.api.requestPasswordResetCode(email);
        let msg = "Reset code sent to your Gmail. Check Inbox/Spam, then enter the code below.";
        if (result && result.code) {
            msg += ` [Debug code: ${result.code}]`;
        }
        showMessage(msg, "success");
    } catch (e) {
        if (e && String(e.message || "").toLowerCase().includes("not registered")) {
            showMessage("Email is not registered in this system.", "error");
            return;
        }
        const msg = e && e.message ? e.message : "Unknown error";
        showMessage("Failed to send reset code: " + msg, "error");
    }
}

async function resetPassword() {
    const email = document.getElementById("reset-email").value.trim();
    const code = document.getElementById("reset-code").value.trim();
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-new-password").value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email address.", "error");
        return;
    }
    if (!/^\d{6}$/.test(code)) {
        showMessage("Enter the 6-digit reset code from Gmail.", "error");
        return;
    }
    if (!newPassword || !confirmPassword) {
        showMessage("Please enter and confirm your new password.", "error");
        return;
    }
    if (window.passwordPolicy && typeof window.passwordPolicy.validatePassword === "function") {
        const policy = window.passwordPolicy.validatePassword(newPassword, "", "");
        if (!policy.ok) {
            showMessage(policy.error, "error");
            return;
        }
    } else if (newPassword.length < 8) {
        showMessage("Password must be at least 8 characters.", "error");
        return;
    }
    if (newPassword !== confirmPassword) {
        showMessage("Passwords do not match.", "error");
        return;
    }

    if (!window.api || typeof window.api.resetPasswordWithCode !== "function") {
        showMessage("API not available", "error");
        return;
    }

    try {
        await window.api.resetPasswordWithCode(email, code, newPassword);
        showMessage("Password changed successfully. Redirecting to login...", "success");
        setTimeout(() => {
            window.location.href = "index.php";
        }, 1800);
    } catch (e) {
        const msg = e && e.message ? e.message : "Unknown error";
        showMessage("Reset failed: " + msg, "error");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    showMessage("Step 1: Send code to your Gmail. Step 2: Enter the code and your new password.", "success");

    function eyeSvg(open) {
        if (open) {
            return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-6 0-10-7-10-7a20.3 20.3 0 014.07-5.06" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 1l22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        }
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    document.querySelectorAll(".eye-toggle").forEach(btn => {
        btn.addEventListener("click", function() {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;
            const isPassword = input.type === "password";
            input.type = isPassword ? "text" : "password";
            this.innerHTML = eyeSvg(!isPassword);
        });
    });
});

