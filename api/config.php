<?php

require_once __DIR__ . '/load-env.php';
load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');

$env = static function (string $key, $default = null) {
    $value = getenv($key);
    if ($value === false || $value === null || $value === '') {
        return $default;
    }
    return $value;
};

$envBool = static function (string $key, bool $default = false) use ($env): bool {
    $raw = $env($key, $default ? '1' : '0');
    $parsed = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    return $parsed === null ? $default : $parsed;
};

return [
    'app_env' => (string)$env('APP_ENV', 'local'),
    'app_debug' => $envBool('APP_DEBUG', true),
    'log_dir' => (string)$env('APP_LOG_DIR', dirname(__DIR__) . DIRECTORY_SEPARATOR . 'logs' . DIRECTORY_SEPARATOR . 'app'),

    'db_host' => (string)$env('DB_HOST', '127.0.0.1'),
    'db_port' => (int)$env('DB_PORT', 3306),
    'db_name' => (string)$env('DB_NAME', 'barangay'),
    'db_user' => (string)$env('DB_USER', 'root'),
    'db_pass' => (string)$env('DB_PASS', ''),

    'mail_driver' => (string)$env('MAIL_DRIVER', 'gmail_api'), // smtp | gmail_api
    'smtp_host' => (string)$env('SMTP_HOST', 'smtp.gmail.com'),
    'smtp_port' => (int)$env('SMTP_PORT', 587),
    'smtp_secure' => (string)$env('SMTP_SECURE', 'tls'),
    'smtp_user' => (string)$env('SMTP_USER', 'jameshabutay@gmail.com'),
    'smtp_pass' => (string)$env('SMTP_PASS', 'jameshabutay_7680'),
    'smtp_from' => (string)$env('SMTP_FROM', 'jameshabutay@gmail.com'),
    'smtp_from_name' => (string)$env('SMTP_FROM_NAME', 'Barangay Reservation System'),

    'gmail_api_client_id' => (string)$env('GMAIL_API_CLIENT_ID', '1016100047755-glmpe41bnpfilte6gjko261ki30jv7o8.apps.googleusercontent.com'),
    'gmail_api_client_secret' => (string)$env('GMAIL_API_CLIENT_SECRET', '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'),
    'gmail_api_refresh_token' => (string)$env('GMAIL_API_REFRESH_TOKEN', '1//04RPX-TcP0aw4CgYIARAAGAQSNwF-L9Ir0rKwYV-SOqNunSkdt3fHnzkHkD8SK2iMifMfPL0SPzOqHCCB8j2AS_dtpHv9qAJUTIY'),
    'gmail_api_sender' => (string)$env('GMAIL_API_SENDER', 'jameshabutay@gmail.com'),

    'forgot_password_debug_return_code' => $envBool('FORGOT_PASSWORD_DEBUG_RETURN_CODE', false),

    'session_name' => (string)$env('SESSION_NAME', 'barangay_session'),
    'timezone' => (string)$env('APP_TIMEZONE', 'Asia/Manila'),
    'csrf_header' => (string)$env('CSRF_HEADER', 'X-CSRF-Token'),
    'session_idle_timeout_sec' => (int)$env('SESSION_IDLE_TIMEOUT_SEC', 1800),
    'login_rate_limit_window_sec' => (int)$env('LOGIN_RATE_LIMIT_WINDOW_SEC', 900),
    'login_rate_limit_max_attempts' => (int)$env('LOGIN_RATE_LIMIT_MAX_ATTEMPTS', 5),
    'login_rate_limit_lockout_sec' => (int)$env('LOGIN_RATE_LIMIT_LOCKOUT_SEC', 900),
];
