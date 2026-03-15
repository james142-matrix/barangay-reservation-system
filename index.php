<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barangay Molugan - Facility Reservation System</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="auth-container">
        <div class="auth-box">
            <h2>🏛️ Barangay Molugan</h2>
            <p class="subtitle">Facility Reservation System</p>
            
            <div id="message"></div>
            
            <div class="form-group">
                <label for="username">Username</label>
                <input 
                    id="username" 
                    type="text"
                    placeholder="Enter your username" 
                    autocomplete="username">
            </div>
            
            <div class="form-group input-with-icon">
                <label for="password">Password</label>
                <input 
                    id="password" 
                    type="password"
                    placeholder="Enter your password" 
                    autocomplete="current-password">
                <button type="button" class="eye-toggle" data-target="password" aria-label="Toggle password visibility">
                    <!-- eye icon (closed by default) -->
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 9a3 3 0 100 6 3 3 0 000-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div id="loginPreview" style="margin-top:8px; font-size:13px; color:#666;"></div>
            
            <button class="btn btn-primary" onclick="login()">Login</button>
            <div class="link-text" style="margin-top: 8px;">
                <a href="forgot-password.php">Forgot Password?</a>
            </div>
            
            <div class="link-text">
                Onsite access only. Staff accounts require admin approval.
            </div>

            <div class="link-text" style="margin-top: 8px;">
                New staff? <a href="signup.php">Submit signup request</a>
            </div>
            
        </div>
    </div>

    <script src="js/database.js?v=20260309e"></script>
    <script src="js/services/auth-service.js?v=20260303b"></script>
    <script src="js/api.js?v=20260309d"></script>
    <script src="js/auth.js?v=20260309d"></script>
    <script src="js/login.js?v=20260303b"></script>
    <script src="js/responsive.js?v=20260309c"></script>
</body>
</html>









