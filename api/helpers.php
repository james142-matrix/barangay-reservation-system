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

function default_event_types_for_facility(string $facilityName = ''): array
{
    $name = strtolower(trim($facilityName));

    if ($name === 'medical room') {
        return ['Consultation', 'Checkup', 'Vaccination', 'First Aid', 'Other'];
    }
    if ($name === 'sports complex') {
        return ['Basketball', 'Volleyball', 'Badminton', 'Training', 'Other'];
    }
    if ($name === 'library & learning center') {
        return ['Study Session', 'Reading Program', 'Workshop', 'Seminar', 'Other'];
    }
    if ($name === 'community hall') {
        return ['Birthday Party', 'Wedding', 'Conference', 'Community Event', 'Other'];
    }
    if ($name === 'cultural center') {
        return ['Cultural Show', 'Workshop', 'Training', 'Community Event', 'Other'];
    }
    if ($name === 'garden event space') {
        return ['Wedding', 'Birthday Party', 'Reception', 'Community Event', 'Other'];
    }

    return ['Birthday Party', 'Wedding', 'Conference', 'Community Event', 'Sports Activity', 'Training/Workshop', 'Other'];
}

function parse_event_types_list($value): array
{
    $items = [];

    if (is_array($value)) {
        $items = $value;
    } elseif (is_string($value)) {
        $trimmed = trim($value);
        if ($trimmed !== '') {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                $items = $decoded;
            } else {
                $items = preg_split('/[\r\n,]+/', $trimmed) ?: [];
            }
        }
    }

    $clean = [];
    foreach ($items as $item) {
        $name = trim((string)$item);
        if ($name === '') continue;
        if (!in_array($name, $clean, true)) {
            $clean[] = $name;
        }
    }

    return $clean;
}

function normalize_event_types($value, string $facilityName = ''): array
{
    $clean = parse_event_types_list($value);
    if (!$clean) {
        return default_event_types_for_facility($facilityName);
    }
    return $clean;
}

function resolve_active_event_types($activeValue, $archivedValue, string $facilityName = ''): array
{
    $active = parse_event_types_list($activeValue);
    if ($active) return $active;

    $archived = parse_event_types_list($archivedValue);
    $activeRaw = is_string($activeValue) ? trim($activeValue) : (is_array($activeValue) ? 'array' : '');
    if ($activeRaw === '' && !$archived) {
        return default_event_types_for_facility($facilityName);
    }

    return [];
}

function event_types_to_db_json($value, string $facilityName = ''): string
{
    $types = parse_event_types_list($value);
    return json_encode($types, JSON_UNESCAPED_UNICODE);
}

function normalize_facility_add_ons($value): array
{
    $items = [];
    if (is_array($value)) {
        $items = $value;
    } elseif (is_string($value)) {
        $trimmed = trim($value);
        if ($trimmed !== '') {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                $items = $decoded;
            }
        }
    }

    $clean = [];
    $seen = [];
    foreach ($items as $idx => $item) {
        if (!is_array($item)) continue;
        $id = trim((string)($item['id'] ?? ''));
        $name = trim((string)($item['name'] ?? ''));
        $price = isset($item['price']) ? (float)$item['price'] : 0;
        $unit = trim((string)($item['unit'] ?? 'item'));
        $enabled = !array_key_exists('enabled', $item) ? true : !empty($item['enabled']);

        if ($name === '' || $price < 0) continue;
        if ($unit === '') $unit = 'item';
        if ($id === '') {
            $id = 'addon_' . ($idx + 1);
        }
        if (isset($seen[$id])) continue;
        $seen[$id] = true;

        $clean[] = [
            'id' => $id,
            'name' => $name,
            'price' => round($price, 2),
            'unit' => $unit,
            'enabled' => $enabled,
        ];
    }

    return $clean;
}

function facility_add_ons_to_db_json($value): string
{
    return json_encode(normalize_facility_add_ons($value), JSON_UNESCAPED_UNICODE);
}

function default_add_ons_for_facility(string $facilityName = ''): array
{
    $name = strtolower(trim($facilityName));
    if ($name === 'community hall') {
        return [
            ['id' => 'chairs', 'name' => 'Extra Chairs', 'price' => 10, 'unit' => 'chair', 'enabled' => true],
            ['id' => 'sound', 'name' => 'Sound System', 'price' => 500, 'unit' => 'set', 'enabled' => true],
        ];
    }
    if ($name === 'sports complex') {
        return [
            ['id' => 'lights', 'name' => 'Floodlights', 'price' => 300, 'unit' => 'hour', 'enabled' => true],
            ['id' => 'scoreboard', 'name' => 'Scoreboard Setup', 'price' => 200, 'unit' => 'event', 'enabled' => true],
        ];
    }
    if ($name === 'cultural center') {
        return [
            ['id' => 'projector', 'name' => 'Projector', 'price' => 350, 'unit' => 'set', 'enabled' => true],
            ['id' => 'mic', 'name' => 'Microphone Set', 'price' => 250, 'unit' => 'set', 'enabled' => true],
        ];
    }
    if ($name === 'library & learning center') {
        return [
            ['id' => 'whiteboard', 'name' => 'Whiteboard Kit', 'price' => 150, 'unit' => 'set', 'enabled' => true],
        ];
    }
    if ($name === 'garden event space') {
        return [
            ['id' => 'tent', 'name' => 'Tent Package', 'price' => 1200, 'unit' => 'set', 'enabled' => true],
            ['id' => 'lights', 'name' => 'String Lights', 'price' => 400, 'unit' => 'set', 'enabled' => true],
        ];
    }
    return [];
}

function normalize_selected_add_ons($value): array
{
    $items = is_array($value) ? $value : [];
    $out = [];
    $seen = [];
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $id = trim((string)($item['id'] ?? ''));
        $qty = parse_count($item['qty'] ?? 0);
        if ($id === '' || $qty <= 0) continue;
        if (isset($seen[$id])) continue;
        $seen[$id] = true;
        $out[] = ['id' => $id, 'qty' => $qty];
    }
    return $out;
}

function normalize_reservation_row(array $row): array
{
    $addOnsSnapshot = [];
    $rawAddOns = $row['add_ons_snapshot'] ?? null;
    if (is_string($rawAddOns) && trim($rawAddOns) !== '') {
        $decoded = json_decode($rawAddOns, true);
        if (is_array($decoded)) {
            $addOnsSnapshot = $decoded;
        }
    }

    return [
        'id' => (int)$row['id'],
        'username' => (string)$row['username'],
        'clientEmail' => (string)($row['client_email'] ?? ''),
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
        'addOns' => $addOnsSnapshot,
        'addOnTotal' => isset($row['add_on_total']) ? (float)$row['add_on_total'] : 0,
        'paymentOption' => (string)($row['payment_option'] ?? 'full'),
        'downPaymentAmount' => isset($row['down_payment_amount']) ? (float)$row['down_payment_amount'] : 0,
        'amountPaid' => isset($row['amount_paid']) ? (float)$row['amount_paid'] : 0,
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

function ensure_user_approval_columns(PDO $pdo): void
{
    ensure_table_column($pdo, 'users', 'approval_status', "VARCHAR(20) NOT NULL DEFAULT 'approved'");
    ensure_table_column($pdo, 'users', 'approved_by', 'VARCHAR(100) DEFAULT NULL');
    ensure_table_column($pdo, 'users', 'approved_at', 'DATETIME NULL DEFAULT NULL');
}

function ensure_reservation_optional_columns(PDO $pdo): void
{
    ensure_table_column($pdo, 'reservations', 'client_email', 'VARCHAR(255) DEFAULT NULL');
    ensure_table_column($pdo, 'reservations', 'chairs_count', 'INT DEFAULT 0');
    ensure_table_column($pdo, 'reservations', 'electronics_count', 'INT DEFAULT 0');
    ensure_table_column($pdo, 'reservations', 'medical_room_details', 'VARCHAR(255) DEFAULT NULL');
    ensure_table_column($pdo, 'reservations', 'add_ons_snapshot', 'TEXT DEFAULT NULL');
    ensure_table_column($pdo, 'reservations', 'add_on_total', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    ensure_table_column($pdo, 'reservations', 'payment_option', "VARCHAR(30) NOT NULL DEFAULT 'full'");
    ensure_table_column($pdo, 'reservations', 'down_payment_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    ensure_table_column($pdo, 'reservations', 'amount_paid', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
}

function ensure_facility_optional_columns(PDO $pdo): void
{
    ensure_table_column($pdo, 'facilities', 'event_types', 'TEXT DEFAULT NULL');
    ensure_table_column($pdo, 'facilities', 'event_types_archived', 'TEXT DEFAULT NULL');
    ensure_table_column($pdo, 'facilities', 'add_ons', 'TEXT DEFAULT NULL');
}

function ensure_facility_default_add_ons(PDO $pdo): void
{
    $rows = $pdo->query('SELECT id,name,add_ons FROM facilities WHERE archived = 0')->fetchAll();
    $up = $pdo->prepare('UPDATE facilities SET add_ons = ? WHERE id = ?');
    foreach ($rows as $row) {
        $existing = normalize_facility_add_ons($row['add_ons'] ?? null);
        if ($existing) continue;
        $defaults = default_add_ons_for_facility((string)($row['name'] ?? ''));
        if (!$defaults) continue;
        $up->execute([json_encode($defaults, JSON_UNESCAPED_UNICODE), (int)$row['id']]);
    }
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
    $subject = 'Your Barangay Password Reset Code';
    $body = "Hello,\r\n\r\n"
        . "Your password reset code is: {$code}\r\n"
        . "This code will expire in 10 minutes.\r\n\r\n"
        . "If you did not request this, you can ignore this email.\r\n\r\n"
        . "Barangay Reservation System";
    send_email_message($cfg, $toEmail, $subject, $body);
}

function send_reservation_receipt_email(array $cfg, string $toEmail, array $reservation, string $facilityName): void
{
    $subject = 'Reservation Receipt - Payment Completed';
    $eventDate = (string)($reservation['eventDate'] ?? '');
    $eventEndDate = (string)($reservation['eventEndDate'] ?? $eventDate);
    $startTime = (string)($reservation['startTime'] ?? '');
    $endTime = (string)($reservation['endTime'] ?? '');
    $eventType = (string)($reservation['eventType'] ?? '');
    $status = strtoupper((string)($reservation['status'] ?? 'COMPLETED'));
    $clientName = (string)($reservation['username'] ?? '');
    $paymentStatus = strtoupper((string)($reservation['paymentStatus'] ?? 'PAID'));
    $paymentDate = (string)($reservation['paymentDate'] ?? '');
    $paymentMethod = strtoupper((string)($reservation['paymentMethod'] ?? 'ONSITE_CASH'));
    $totalCost = isset($reservation['totalCost']) ? number_format((float)$reservation['totalCost'], 2) : '0.00';

    $body = "Hello {$clientName},\r\n\r\n"
        . "Your reservation payment is complete. This email serves as your receipt.\r\n\r\n"
        . "Reservation ID: " . (string)($reservation['id'] ?? '') . "\r\n"
        . "Facility: {$facilityName}\r\n"
        . "Event Type: {$eventType}\r\n"
        . "Date: {$eventDate} to {$eventEndDate}\r\n"
        . "Time: {$startTime} - {$endTime}\r\n"
        . "Total Paid: PHP {$totalCost}\r\n"
        . "Payment Status: {$paymentStatus}\r\n"
        . "Payment Method: {$paymentMethod}\r\n"
        . "Payment Date: {$paymentDate}\r\n"
        . "Status: {$status}\r\n\r\n"
        . "Thank you. Your reservation is now completed.\r\n\r\n"
        . "Barangay Reservation System";

    send_email_message($cfg, $toEmail, $subject, $body);
}

function send_partial_payment_receipt_email(
    array $cfg,
    string $toEmail,
    array $reservation,
    string $facilityName,
    float $recentPaymentAmount,
    float $remainingBalance
): void
{
    $subject = 'Partial Payment Received - Reservation';
    $eventDate = (string)($reservation['eventDate'] ?? '');
    $eventEndDate = (string)($reservation['eventEndDate'] ?? $eventDate);
    $startTime = (string)($reservation['startTime'] ?? '');
    $endTime = (string)($reservation['endTime'] ?? '');
    $eventType = (string)($reservation['eventType'] ?? '');
    $clientName = (string)($reservation['username'] ?? '');
    $paymentDate = (string)($reservation['paymentDate'] ?? '');
    $totalCost = isset($reservation['totalCost']) ? number_format((float)$reservation['totalCost'], 2) : '0.00';
    $amountPaid = isset($reservation['amountPaid']) ? number_format((float)$reservation['amountPaid'], 2) : '0.00';
    $recentPaid = number_format(max(0, $recentPaymentAmount), 2);
    $remaining = number_format(max(0, $remainingBalance), 2);

    $body = "Hello {$clientName},\r\n\r\n"
        . "We received your partial payment for your reservation.\r\n\r\n"
        . "Reservation ID: " . (string)($reservation['id'] ?? '') . "\r\n"
        . "Facility: {$facilityName}\r\n"
        . "Event Type: {$eventType}\r\n"
        . "Date: {$eventDate} to {$eventEndDate}\r\n"
        . "Time: {$startTime} - {$endTime}\r\n"
        . "Total Amount: PHP {$totalCost}\r\n"
        . "Recent Payment Received: PHP {$recentPaid}\r\n"
        . "Total Paid So Far: PHP {$amountPaid}\r\n"
        . "Remaining Balance: PHP {$remaining}\r\n"
        . "Payment Date: {$paymentDate}\r\n\r\n"
        . "Please settle the remaining balance at the barangay office.\r\n\r\n"
        . "Barangay Reservation System";

    send_email_message($cfg, $toEmail, $subject, $body);
}

function send_email_message(array $cfg, string $toEmail, string $subject, string $body): void
{
    $driver = strtolower(trim((string)($cfg['mail_driver'] ?? 'smtp')));
    if ($driver === 'gmail_api') {
        send_email_message_gmail_api($cfg, $toEmail, $subject, $body);
        return;
    }
    send_email_message_smtp($cfg, $toEmail, $subject, $body);
}

function send_email_message_smtp(array $cfg, string $toEmail, string $subject, string $body): void
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

function send_email_message_gmail_api(array $cfg, string $toEmail, string $subject, string $body): void
{
    $clientId = trim((string)($cfg['gmail_api_client_id'] ?? ''));
    $clientSecret = trim((string)($cfg['gmail_api_client_secret'] ?? ''));
    $refreshToken = trim((string)($cfg['gmail_api_refresh_token'] ?? ''));
    $sender = trim((string)($cfg['gmail_api_sender'] ?? ''));
    $fromName = trim((string)($cfg['smtp_from_name'] ?? 'Barangay Reservation System'));

    if ($clientId === '' || $clientSecret === '' || $refreshToken === '' || $sender === '') {
        throw new RuntimeException('Gmail API is not configured. Set gmail_api_client_id, gmail_api_client_secret, gmail_api_refresh_token, and gmail_api_sender in api/config.php');
    }

    $accessToken = gmail_api_get_access_token($clientId, $clientSecret, $refreshToken);

    $headers = [
        'From: ' . smtp_format_from($fromName, $sender),
        'To: <' . $toEmail . '>',
        'Subject: ' . smtp_encode_header($subject),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    $mime = implode("\r\n", $headers) . "\r\n\r\n" . $body;
    $raw = rtrim(strtr(base64_encode($mime), '+/', '-_'), '=');
    $payload = json_encode(['raw' => $raw], JSON_UNESCAPED_SLASHES);

    $ch = curl_init('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    if ($ch === false) {
        throw new RuntimeException('Unable to initialize cURL for Gmail API');
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $result = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($result === false || $http < 200 || $http >= 300) {
        $detail = $err !== '' ? $err : (string)$result;
        throw new RuntimeException('Gmail API send failed (HTTP ' . $http . '): ' . $detail);
    }
}

function gmail_api_get_access_token(string $clientId, string $clientSecret, string $refreshToken): string
{
    $ch = curl_init('https://oauth2.googleapis.com/token');
    if ($ch === false) {
        throw new RuntimeException('Unable to initialize cURL for OAuth token');
    }

    $postFields = http_build_query([
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'refresh_token' => $refreshToken,
        'grant_type' => 'refresh_token',
    ], '', '&', PHP_QUERY_RFC3986);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $result = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($result === false || $http < 200 || $http >= 300) {
        $detail = $err !== '' ? $err : (string)$result;
        throw new RuntimeException('OAuth token request failed (HTTP ' . $http . '): ' . $detail);
    }

    $decoded = json_decode((string)$result, true);
    $token = is_array($decoded) ? trim((string)($decoded['access_token'] ?? '')) : '';
    if ($token === '') {
        throw new RuntimeException('OAuth token response did not include access_token');
    }
    return $token;
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
