(function() {
    function validatePassword(password, username, email) {
        const value = String(password || "");
        if (value.length < 8) {
            return { ok: false, error: "Password must be at least 8 characters long." };
        }
        if (!/[A-Z]/.test(value)) {
            return { ok: false, error: "Password must include at least one uppercase letter." };
        }
        if (!/[^A-Za-z0-9]/.test(value)) {
            return { ok: false, error: "Password must include at least one special character." };
        }
        if (/\s/.test(value)) {
            return { ok: false, error: "Password must not contain spaces." };
        }
        return { ok: true };
    }

    window.passwordPolicy = {
        validatePassword: validatePassword,
        requirementsText: "Use 8+ chars, with at least one uppercase letter, one symbol, and no spaces."
    };
})();

