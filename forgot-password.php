<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="auth-container">
        <div class="auth-box">
            <h2>Reset Password</h2>
            <p class="subtitle">Request a code to Gmail, then enter it below</p>

            <div id="message"></div>

            <div class="form-group">
                <label for="reset-email">Email Address</label>
                <input id="reset-email" type="email" placeholder="your@email.com" autocomplete="email">
            </div>

            <button class="btn btn-secondary" onclick="requestResetCode()">Send Reset Code</button>

            <div class="form-group">
                <label for="reset-code">Reset Code</label>
                <input id="reset-code" type="text" placeholder="6-digit code from Gmail" inputmode="numeric" autocomplete="one-time-code">
            </div>

            <div class="form-group input-with-icon">
                <label for="new-password">New Password</label>
                <input id="new-password" type="password" placeholder="8+ chars, 1 uppercase, 1 symbol, no spaces" autocomplete="new-password">
                <button type="button" class="eye-toggle" data-target="new-password" aria-label="Toggle password visibility">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>

            <div class="form-group input-with-icon">
                <label for="confirm-new-password">Confirm New Password</label>
                <input id="confirm-new-password" type="password" placeholder="Confirm new password" autocomplete="new-password">
                <button type="button" class="eye-toggle" data-target="confirm-new-password" aria-label="Toggle password visibility">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>

            <button class="btn btn-primary" onclick="resetPassword()">Reset Password</button>

            <div class="link-text">
                Back to <a href="index.php">Login</a>
            </div>
        </div>
    </div>

    <script src="js/password-policy.js?v=20260303b"></script>
    <script src="js/database.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/forgot-password.js?v=20260303b"></script>
</body>
</html>



