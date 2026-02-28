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

let resetOobCode = "";

function extractOobCodeFromLink(value) {
    if (!value) return "";
    const raw = String(value).trim();
    if (!raw) return "";

    try {
        const url = new URL(raw);
        return url.searchParams.get("oobCode") || "";
    } catch (_) {
        return "";
    }
}

async function requestResetCode() {
    const email = document.getElementById("reset-email").value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email address", "error");
        return;
    }

    if (!window.firebaseAuth || typeof window.firebaseAuth.sendPasswordResetEmail !== "function") {
        showMessage("Firebase Auth is not initialized on this page", "error");
        return;
    }
    if (!window.api || typeof window.api.checkForgotPasswordEmail !== "function") {
        showMessage("API is not initialized on this page", "error");
        return;
    }

    try {
        await window.api.checkForgotPasswordEmail(email);
        await window.firebaseAuth.sendPasswordResetEmail(email);
        showMessage("Reset link sent to Gmail. Check Inbox/Spam, open the link, then set a new password here.", "success");
    } catch (e) {
        if (e && String(e.message || "").toLowerCase().includes("not registered")) {
            showMessage("Email is not registered in this system.", "error");
            return;
        }
        if (e && String(e.message || "").includes("auth/user-not-found")) {
            showMessage("Email is not registered in Firebase Auth.", "error");
            return;
        }
        const msg = e && e.message ? e.message : "Unknown error";
        showMessage("Failed to send reset link: " + msg, "error");
    }
}

async function resetPassword() {
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-new-password").value;

    if (!resetOobCode) {
        showMessage("Open this page from the reset link in your email first.", "error");
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

    if (!window.api || typeof window.api.resetPasswordWithFirebaseCode !== "function") {
        showMessage("API not available", "error");
        return;
    }

    try {
        const result = await window.api.resetPasswordWithFirebaseCode(resetOobCode, newPassword);
        if (result && result.mysqlUpdated === false) {
            showMessage("Password changed in Firebase, but no matching email was found in MySQL.", "error");
            return;
        }
        showMessage("Password changed successfully. You can now log in.", "success");
    } catch (e) {
        const msg = e && e.message ? e.message : "Unknown error";
        showMessage("Reset failed: " + msg, "error");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const params = new URLSearchParams(window.location.search);
    resetOobCode = params.get("oobCode") || "";

    if (!resetOobCode) {
        const wrappedLink = params.get("link");
        if (wrappedLink) {
            const decoded = decodeURIComponent(wrappedLink);
            resetOobCode = extractOobCodeFromLink(decoded);
        }
    }

    if (resetOobCode) {
        showMessage("Reset link verified. Enter your new password below.", "success");
    } else {
        showMessage("Step 1: Send reset link. Step 2: Open that email link here.", "error");
    }

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
