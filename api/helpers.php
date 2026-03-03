<?php

function send_json($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function get_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function normalize_role($role): string
{
    $value = strtolower((string)$role);
    if (in_array($value, ['resident', 'admin', 'barangay_staff'], true)) {
        return $value;
    }
    return 'resident';
}

function sanitize_user(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'username' => (string)$row['username'],
        'email' => (string)$row['email'],
        'fullname' => (string)($row['fullname'] ?? ''),
        'phone' => (string)($row['phone'] ?? ''),
        'address' => (string)($row['address'] ?? ''),
        'role' => normalize_role($row['role'] ?? 'resident'),
    ];
}

function current_user(): ?array
{
    if (!isset($_SESSION['user']) || !is_array($_SESSION['user'])) {
        return null;
    }
    return $_SESSION['user'];
}

function require_auth(): array
{
    $user = current_user();
    if (!$user) {
        send_json(['error' => 'Unauthorized'], 401);
    }
    return $user;
}

function require_role(array $roles): array
{
    $user = require_auth();
    if (!in_array($user['role'], $roles, true)) {
        send_json(['error' => 'Forbidden'], 403);
    }
    return $user;
}

function validate_password_policy(string $password): ?string
{
    if (strlen($password) < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!preg_match('/[A-Z]/', $password)) {
        return 'Password must include at least one uppercase letter';
    }
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        return 'Password must include at least one special character';
    }
    if (preg_match('/\s/', $password)) {
        return 'Password must not contain spaces';
    }
    return null;
}

function create_stored_password(string $password): string
{
    $iterations = 120000;
    $salt = random_bytes(16);
    $derived = hash_pbkdf2('sha256', $password, $salt, $iterations, 32, true);
    return sprintf('pbkdf2$%d$%s$%s', $iterations, base64_encode($salt), base64_encode($derived));
}

function verify_stored_password(string $inputPassword, string $storedPassword): bool
{
    if (strpos($storedPassword, 'pbkdf2$') !== 0) {
        return hash_equals($storedPassword, $inputPassword);
    }

    $parts = explode('$', $storedPassword);
    if (count($parts) !== 4) {
        return false;
    }

    $iterations = (int)$parts[1];
    $salt = base64_decode($parts[2], true);
    $expected = base64_decode($parts[3], true);

    if ($iterations <= 0 || $salt === false || $expected === false) {
        return false;
    }

    $derived = hash_pbkdf2('sha256', $inputPassword, $salt, $iterations, strlen($expected), true);
    return hash_equals($expected, $derived);
}

function validate_contact_fields(string $contactPerson, string $contactPhone): ?string
{
    if ($contactPerson !== '' && !preg_match("/^[A-Za-z\s.'-]+$/", $contactPerson)) {
        return 'Contact person must contain letters only';
    }
    if ($contactPhone !== '' && !preg_match('/^\d{7,15}$/', $contactPhone)) {
        return 'Contact phone must contain numbers only (7-15 digits)';
    }
    return null;
}

function parse_count($value): int
{
    $num = (int)$value;
    return $num < 0 ? 0 : $num;
}

function normalize_payment_option($value): string
{
    return strtolower((string)$value) === 'down_payment' ? 'down_payment' : 'full';
}

function normalize_reservation_row(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'username' => (string)$row['username'],
        'facilityId' => isset($row['facility_id']) ? (int)$row['facility_id'] : null,
        'eventDate' => $row['event_date'],
        'eventEndDate' => $row['event_end_date'] ?: $row['event_date'],
        'startTime' => substr((string)$row['start_time'], 0, 5),
        'endTime' => substr((string)$row['end_time'], 0, 5),
        'eventType' => (string)($row['event_type'] ?? ''),
        'expectedGuests' => (int)($row['expected_guests'] ?? 0),
        'eventDescription' => (string)($row['event_description'] ?? ''),
        'contactPerson' => (string)($row['contact_person'] ?? ''),
        'contactPhone' => (string)($row['contact_phone'] ?? ''),
        'chairsCount' => (int)($row['chairs_count'] ?? 0),
        'electronicsCount' => (int)($row['electronics_count'] ?? 0),
        'medicalRoomDetails' => (string)($row['medical_room_details'] ?? ''),
        'paymentOption' => (string)($row['payment_option'] ?? 'full'),
        'downPaymentAmount' => isset($row['down_payment_amount']) ? (float)$row['down_payment_amount'] : 0,
        'totalCost' => isset($row['total_cost']) ? (float)$row['total_cost'] : 0,
        'status' => (string)($row['status'] ?? 'pending'),
        'approvedBy' => $row['approved_by'] ?? null,
        'approvedAt' => $row['approved_at'] ?? null,
        'paymentStatus' => $row['payment_status'] ?? 'pending',
        'paymentMethod' => $row['payment_method'] ?? null,
        'paymentDate' => $row['payment_date'] ?? null,
        'rejectionReason' => $row['rejection_reason'] ?? null,
        'rejectedBy' => $row['rejected_by'] ?? null,
        'rejectedAt' => $row['rejected_at'] ?? null,
        'createdAt' => $row['created_at'] ?? null,
    ];
}

function ensure_password_reset_table(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS password_reset_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            code_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL DEFAULT NULL,
            request_ip VARCHAR(45) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_prc_email (email),
            KEY idx_prc_expires (expires_at)
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
}

function ensure_archive_columns(PDO $pdo): void
{
    ensure_table_column($pdo, 'users', 'archived', 'TINYINT(1) NOT NULL DEFAULT 0');
    ensure_table_column($pdo, 'facilities', 'archived', 'TINYINT(1) NOT NULL DEFAULT 0');
    ensure_table_column($pdo, 'reservations', 'archived', 'TINYINT(1) NOT NULL DEFAULT 0');
}

function ensure_reservation_optional_columns(PDO $pdo): void
{
    ensure_table_column($pdo, 'reservations', 'chairs_count', 'INT DEFAULT 0');
    ensure_table_column($pdo, 'reservations', 'electronics_count', 'INT DEFAULT 0');
    ensure_table_column($pdo, 'reservations', 'medical_room_details', 'VARCHAR(255) DEFAULT NULL');
    ensure_table_column($pdo, 'reservations', 'payment_option', "VARCHAR(30) NOT NULL DEFAULT 'full'");
    ensure_table_column($pdo, 'reservations', 'down_payment_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
}

function ensure_table_column(PDO $pdo, string $table, string $column, string $definition): void
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $table) || !preg_match('/^[A-Za-z0-9_]+$/', $column)) {
        throw new RuntimeException('Invalid table/column name for migration');
    }

    $st = $pdo->prepare(
        'SELECT COUNT(*) AS cnt
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?'
    );
    $st->execute([$table, $column]);
    $row = $st->fetch();
    $exists = isset($row['cnt']) ? ((int)$row['cnt'] > 0) : false;
    if ($exists) return;

    $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
}

function send_reset_code_email(array $cfg, string $toEmail, string $code): void
{
    $smtpUser = trim((string)($cfg['smtp_user'] ?? ''));
    $smtpPass = trim((string)($cfg['smtp_pass'] ?? ''));
    if ($smtpUser === '' || $smtpPass === '') {
        throw new RuntimeException('SMTP is not configured. Set smtp_user and smtp_pass in api/config.php');
    }

    $smtpHost = trim((string)($cfg['smtp_host'] ?? 'smtp.gmail.com'));
    $smtpPort = (int)($cfg['smtp_port'] ?? 587);
    $smtpSecure = strtolower(trim((string)($cfg['smtp_secure'] ?? 'tls')));
    $from = trim((string)($cfg['smtp_from'] ?? $smtpUser));
    $fromName = trim((string)($cfg['smtp_from_name'] ?? 'Barangay Reservation System'));

    if ($from === '') {
        $from = $smtpUser;
    }

    $subject = 'Your Barangay Password Reset Code';
    $body = "Hello,\r\n\r\n"
        . "Your password reset code is: {$code}\r\n"
        . "This code will expire in 10 minutes.\r\n\r\n"
        . "If you did not request this, you can ignore this email.\r\n\r\n"
        . "Barangay Reservation System";

    $socket = @stream_socket_client("tcp://{$smtpHost}:{$smtpPort}", $errno, $errstr, 20);
    if (!$socket) {
        throw new RuntimeException("SMTP connection failed ({$errno}): {$errstr}");
    }

    try {
        stream_set_timeout($socket, 20);
        smtp_expect($socket, 220);
        smtp_command($socket, 'EHLO localhost', 250);

        if ($smtpSecure === 'tls') {
            smtp_command($socket, 'STARTTLS', 220);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('Failed to enable TLS for SMTP');
            }
            smtp_command($socket, 'EHLO localhost', 250);
        }

        smtp_command($socket, 'AUTH LOGIN', 334);
        smtp_command($socket, base64_encode($smtpUser), 334);
        smtp_command($socket, base64_encode($smtpPass), 235);

        smtp_command($socket, 'MAIL FROM:<' . $from . '>', 250);
        smtp_command($socket, 'RCPT TO:<' . $toEmail . '>', [250, 251]);
        smtp_command($socket, 'DATA', 354);

        $headers = [
            'From: ' . smtp_format_from($fromName, $from),
            'To: <' . $toEmail . '>',
            'Subject: ' . smtp_encode_header($subject),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];

        $message = implode("\r\n", $headers) . "\r\n\r\n" . $body;
        $message = str_replace(["\r\n.\r\n", "\n.\n"], ["\r\n..\r\n", "\n..\n"], $message);
        fwrite($socket, $message . "\r\n.\r\n");
        smtp_expect($socket, 250);
        smtp_command($socket, 'QUIT', 221);
    } finally {
        fclose($socket);
    }
}

function smtp_command($socket, string $command, $expectedCodes): string
{
    fwrite($socket, $command . "\r\n");
    return smtp_expect($socket, $expectedCodes);
}

function smtp_expect($socket, $expectedCodes): string
{
    $expected = is_array($expectedCodes) ? $expectedCodes : [$expectedCodes];
    $response = '';

    while (($line = fgets($socket, 1024)) !== false) {
        $response .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') {
            break;
        }
    }

    if ($response === '') {
        throw new RuntimeException('SMTP server returned an empty response');
    }

    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $expected, true)) {
        throw new RuntimeException('SMTP error: ' . trim($response));
    }

    return $response;
}

function smtp_format_from(string $name, string $email): string
{
    $cleanName = trim(preg_replace('/[\r\n]+/', ' ', $name));
    if ($cleanName === '') {
        return '<' . $email . '>';
    }
    return '"' . addcslashes($cleanName, '"\\') . '" <' . $email . '>';
}

function smtp_encode_header(string $value): string
{
    return '=?UTF-8?B?' . base64_encode($value) . '?=';
}
