<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up - Barangay Molugan</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="auth-container">
        <div class="auth-box">
            <h2>🏛️ Staff Signup</h2>
            <p class="subtitle">Create a staff account request for admin approval</p>

            <div id="message"></div>

            <div class="form-group">
                <label for="fullname">Full Name</label>
                <input id="fullname" type="text" placeholder="Enter full name" autocomplete="name">
            </div>

            <div class="form-group">
                <label for="email">Email</label>
                <input id="email" type="email" placeholder="Enter email address" autocomplete="email">
            </div>

            <div class="form-group">
                <label for="phone">Phone</label>
                <input id="phone" type="text" placeholder="Enter phone number" autocomplete="tel">
            </div>

            <div class="form-group">
                <label for="address">Address</label>
                <input id="address" type="text" placeholder="Enter address" autocomplete="street-address">
            </div>

            <div class="form-group">
                <label for="signup-username">Username</label>
                <input id="signup-username" type="text" placeholder="Choose a username" autocomplete="username">
            </div>

            <div class="form-group input-with-icon">
                <label for="signup-password">Password</label>
                <input id="signup-password" type="password" placeholder="Create password" autocomplete="new-password">
                <button type="button" class="eye-toggle" data-target="signup-password" aria-label="Toggle password visibility">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>

            <div class="form-group input-with-icon">
                <label for="confirm-password">Confirm Password</label>
                <input id="confirm-password" type="password" placeholder="Confirm password" autocomplete="new-password">
                <button type="button" class="eye-toggle" data-target="confirm-password" aria-label="Toggle password visibility">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>

            <div id="signupPreview" style="margin-top:8px; font-size:13px; color:#666;"></div>

            <button class="btn btn-primary" onclick="signup()">Submit Signup Request</button>

            <div class="link-text" style="margin-top: 10px;">
                Onsite access only. Staff accounts require admin approval.
            </div>

            <div class="link-text">
                Already have an approved account? <a href="index.php">Back to Login</a>
            </div>
        </div>
    </div>

    <script src="js/password-policy.js?v=20260303b"></script>
    <script src="js/api.js?v=20260303b"></script>
    <script src="js/signup.js?v=20260303b"></script>
    <script src="js/responsive.js?v=20260303b"></script>
</body>
</html>





