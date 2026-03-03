<?php

$cfg = require __DIR__ . '/config.php';
date_default_timezone_set($cfg['timezone']);

session_name($cfg['session_name']);
session_start();

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/helpers.php';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
if ($origin === 'null' || $origin === '') {
    $origin = '*';
}
header('Access-Control-Allow-Origin: ' . $origin);
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function get_route_path(): string
{
    $uriPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    $scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
    if ($scriptDir !== '' && $scriptDir !== '/' && strpos($uriPath, $scriptDir) === 0) {
        $uriPath = substr($uriPath, strlen($scriptDir));
    }
    if ($uriPath === '' || $uriPath === false) {
        $uriPath = '/';
    }
    return $uriPath;
}

function notification_row(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'username' => (string)$row['username'],
        'title' => (string)$row['title'],
        'message' => (string)$row['message'],
        'type' => (string)($row['type'] ?? 'info'),
        'isRead' => (bool)($row['is_read'] ?? 0),
        'reservationId' => isset($row['reservation_id']) ? (int)$row['reservation_id'] : null,
        'createdAt' => $row['created_at'] ?? null,
    ];
}

function get_reservation_by_id(PDO $pdo, int $id): ?array
{
    $st = $pdo->prepare('SELECT * FROM reservations WHERE id = ? AND archived = 0 LIMIT 1');
    $st->execute([$id]);
    $row = $st->fetch();
    return $row ? normalize_reservation_row($row) : null;
}

try {
    $pdo = db();
    ensure_password_reset_table($pdo);
    ensure_archive_columns($pdo);
    ensure_reservation_optional_columns($pdo);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = get_route_path();

    if ($path === '/' || $path === '') {
        send_json(['name' => 'Barangay PHP API', 'status' => 'ok']);
    }

    // AUTH
    if ($method === 'POST' && ($path === '/auth/login' || $path === '/users/login')) {
        $body = get_json_body();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');

        if ($username === '' || $password === '') {
            send_json(['error' => 'username and password required'], 400);
        }

        $st = $pdo->prepare('SELECT * FROM users WHERE username = ? AND archived = 0 LIMIT 1');
        $st->execute([$username]);
        $user = $st->fetch();
        if (!$user || !verify_stored_password($password, (string)$user['password'])) {
            send_json(['error' => 'Invalid username or password'], 401);
        }
        if (normalize_role($user['role'] ?? '') === 'resident') {
            send_json(['error' => 'Resident account login is disabled. This system is for staff/admin onsite use only.'], 403);
        }

        $safeUser = sanitize_user($user);
        $_SESSION['user'] = $safeUser;
        send_json($safeUser);
    }

    if ($method === 'GET' && $path === '/auth/me') {
        $user = current_user();
        if (!$user) send_json(['error' => 'Unauthorized'], 401);
        send_json($user);
    }

    if ($method === 'POST' && $path === '/auth/logout') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 3600, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        send_json(['success' => true]);
    }

    if ($method === 'POST' && $path === '/auth/change-password-required') {
        $body = get_json_body();
        $username = trim((string)($body['username'] ?? ''));
        $currentPassword = (string)($body['currentPassword'] ?? '');
        $newPassword = (string)($body['newPassword'] ?? '');

        if ($username === '' || $currentPassword === '' || $newPassword === '') {
            send_json(['error' => 'username, currentPassword and newPassword required'], 400);
        }

        $st = $pdo->prepare('SELECT * FROM users WHERE username = ? AND archived = 0 LIMIT 1');
        $st->execute([$username]);
        $user = $st->fetch();
        if (!$user || !verify_stored_password($currentPassword, (string)$user['password'])) {
            send_json(['error' => 'Invalid username or password'], 401);
        }
        if (normalize_role($user['role'] ?? '') === 'resident') {
            send_json(['error' => 'Resident account access is disabled.'], 403);
        }

        $policyErr = validate_password_policy($newPassword);
        if ($policyErr) send_json(['error' => $policyErr, 'code' => 'WEAK_PASSWORD'], 400);

        if (verify_stored_password($newPassword, (string)$user['password'])) {
            send_json(['error' => 'New password must be different from current password'], 400);
        }

        $stored = create_stored_password($newPassword);
        $up = $pdo->prepare('UPDATE users SET password = ?, force_password_change = 0 WHERE id = ?');
        $up->execute([$stored, (int)$user['id']]);

        $safeUser = sanitize_user($user);
        $_SESSION['user'] = $safeUser;
        send_json($safeUser);
    }

    // USERS
    if ($method === 'POST' && $path === '/users') {
        require_role(['admin']);
        $body = get_json_body();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $email = trim((string)($body['email'] ?? ''));
        $fullname = trim((string)($body['fullname'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $role = normalize_role($body['role'] ?? 'barangay_staff');

        if ($username === '' || $password === '' || $email === '') {
            send_json(['error' => 'username, password and email required'], 400);
        }
        if (!in_array($role, ['admin', 'barangay_staff'], true)) {
            send_json(['error' => 'Only admin and barangay_staff accounts are allowed'], 400);
        }

        $policyErr = validate_password_policy($password);
        if ($policyErr) send_json(['error' => $policyErr, 'code' => 'WEAK_PASSWORD'], 400);

        $exists = $pdo->prepare('SELECT id FROM users WHERE username = ? OR LOWER(email) = LOWER(?) LIMIT 1');
        $exists->execute([$username, $email]);
        if ($exists->fetch()) {
            send_json(['error' => 'username or email already exists'], 409);
        }

        $stored = create_stored_password($password);
        $ins = $pdo->prepare('INSERT INTO users (username,password,email,fullname,phone,address,role,force_password_change) VALUES (?,?,?,?,?,?,?,0)');
        $ins->execute([$username, $stored, $email, $fullname, $phone, $address, $role]);
        send_json(['id' => (int)$pdo->lastInsertId(), 'username' => $username, 'role' => $role], 201);
    }

    if ($method === 'GET' && $path === '/users') {
        require_role(['admin', 'barangay_staff']);
        $rows = $pdo->query('SELECT id,username,email,fullname,phone,address,role FROM users WHERE archived = 0 ORDER BY id ASC')->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
        }
        send_json($rows);
    }

    if ($method === 'PUT' && preg_match('#^/users/(\d+)$#', $path, $m)) {
        require_role(['admin']);
        $id = (int)$m[1];
        $body = get_json_body();

        $st = $pdo->prepare('SELECT * FROM users WHERE id = ? AND archived = 0 LIMIT 1');
        $st->execute([$id]);
        $user = $st->fetch();
        if (!$user) send_json(['error' => 'User not found'], 404);

        $fields = [];
        $params = [];
        foreach (['username','email','fullname','phone','address','role'] as $k) {
            if (array_key_exists($k, $body)) {
                if ($k === 'role') {
                    $normalizedRole = normalize_role($body[$k]);
                    if (!in_array($normalizedRole, ['admin', 'barangay_staff'], true)) {
                        send_json(['error' => 'Only admin and barangay_staff roles are allowed'], 400);
                    }
                }
                $fields[] = "$k = ?";
                $params[] = $k === 'role' ? normalize_role($body[$k]) : $body[$k];
            }
        }
        if (array_key_exists('password', $body) && (string)$body['password'] !== '') {
            $policyErr = validate_password_policy((string)$body['password']);
            if ($policyErr) send_json(['error' => $policyErr, 'code' => 'WEAK_PASSWORD'], 400);
            $fields[] = 'password = ?';
            $params[] = create_stored_password((string)$body['password']);
            $fields[] = 'force_password_change = 0';
        }

        if (!$fields) send_json(['error' => 'No valid fields to update'], 400);

        $params[] = $id;
        $up = $pdo->prepare('UPDATE users SET ' . implode(',', $fields) . ' WHERE id = ?');
        $up->execute($params);

        $fresh = $pdo->prepare('SELECT id,username,email,fullname,phone,address,role FROM users WHERE id = ?');
        $fresh->execute([$id]);
        $row = $fresh->fetch();
        $row['id'] = (int)$row['id'];
        send_json($row);
    }

    if ($method === 'DELETE' && preg_match('#^/users/(\d+)$#', $path, $m)) {
        require_role(['admin']);
        $id = (int)$m[1];
        $arc = $pdo->prepare('UPDATE users SET archived = 1 WHERE id = ? AND archived = 0');
        $arc->execute([$id]);
        if ($arc->rowCount() === 0) send_json(['error' => 'User not found'], 404);
        send_json(['success' => true, 'archived' => true]);
    }

    // forgot password (MySQL + Gmail SMTP)
    if ($method === 'POST' && $path === '/users/forgot-password/check-email') {
        $body = get_json_body();
        $email = trim((string)($body['email'] ?? ''));
        if ($email === '') send_json(['error' => 'email required'], 400);
        $st = $pdo->prepare('SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND archived = 0 LIMIT 1');
        $st->execute([$email]);
        if (!$st->fetch()) send_json(['error' => 'Email is not registered'], 404);
        send_json(['exists' => true]);
    }

    if ($method === 'POST' && $path === '/users/forgot-password/request') {
        $body = get_json_body();
        $email = trim((string)($body['email'] ?? ''));
        if ($email === '') send_json(['error' => 'email required'], 400);

        $st = $pdo->prepare('SELECT id FROM users WHERE LOWER(email)=LOWER(?) AND archived = 0 LIMIT 1');
        $st->execute([$email]);
        if (!$st->fetch()) send_json(['error' => 'Email is not registered'], 404);

        $code = (string)random_int(100000, 999999);
        $codeHash = password_hash($code, PASSWORD_BCRYPT);
        $requestIp = $_SERVER['REMOTE_ADDR'] ?? null;

        $pdo->prepare('UPDATE password_reset_codes SET used_at = NOW() WHERE LOWER(email) = LOWER(?) AND used_at IS NULL')
            ->execute([$email]);

        $ins = $pdo->prepare(
            'INSERT INTO password_reset_codes (email, code_hash, expires_at, request_ip) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), ?)'
        );
        $ins->execute([$email, $codeHash, $requestIp]);

        try {
            send_reset_code_email($cfg, $email, $code);
        } catch (Throwable $e) {
            send_json(['error' => 'Failed to send reset email: ' . $e->getMessage()], 500);
        }

        $resp = ['status' => 'ok', 'message' => 'Reset code sent to your Gmail'];
        if (!empty($cfg['forgot_password_debug_return_code'])) {
            $resp['code'] = $code;
        }
        send_json($resp);
    }

    if ($method === 'POST' && $path === '/users/forgot-password/reset') {
        $body = get_json_body();
        $email = trim((string)($body['email'] ?? ''));
        $code = trim((string)($body['code'] ?? ''));
        $newPassword = (string)($body['newPassword'] ?? '');
        if ($email === '' || $code === '' || $newPassword === '') {
            send_json(['error' => 'email, code and newPassword required'], 400);
        }

        $st = $pdo->prepare(
            'SELECT id, code_hash, expires_at
             FROM password_reset_codes
             WHERE LOWER(email) = LOWER(?) AND used_at IS NULL
             ORDER BY id DESC
             LIMIT 1'
        );
        $st->execute([$email]);
        $entry = $st->fetch();
        if (!$entry) send_json(['error' => 'No code requested'], 400);

        if (strtotime((string)$entry['expires_at']) < time()) {
            send_json(['error' => 'Code expired'], 400);
        }
        if (!password_verify($code, (string)$entry['code_hash'])) {
            send_json(['error' => 'Invalid code'], 400);
        }

        $policyErr = validate_password_policy($newPassword);
        if ($policyErr) send_json(['error' => $policyErr, 'code' => 'WEAK_PASSWORD'], 400);

        $stored = create_stored_password($newPassword);
        $up = $pdo->prepare('UPDATE users SET password = ?, force_password_change = 0 WHERE LOWER(email) = LOWER(?)');
        $up->execute([$stored, $email]);
        if ($up->rowCount() === 0) send_json(['error' => 'User not found'], 404);

        $used = $pdo->prepare('UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?');
        $used->execute([(int)$entry['id']]);
        send_json(['status' => 'ok']);
    }

    // FACILITIES
    if ($method === 'GET' && $path === '/facilities') {
        require_role(['resident', 'admin', 'barangay_staff']);
        $rows = $pdo->query('SELECT * FROM facilities WHERE archived = 0 ORDER BY id ASC')->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['capacity'] = (int)$row['capacity'];
            $row['price'] = (float)$row['price'];
        }
        send_json($rows);
    }

    if ($method === 'POST' && $path === '/facilities') {
        require_role(['admin', 'barangay_staff']);
        $body = get_json_body();
        $name = trim((string)($body['name'] ?? ''));
        $description = trim((string)($body['description'] ?? ''));
        $capacity = (int)($body['capacity'] ?? 0);
        $price = (float)($body['price'] ?? 0);
        $icon = (string)($body['icon'] ?? '🏛️');
        $status = (string)($body['status'] ?? 'available');

        if ($name === '' || $capacity < 0 || $price < 0) {
            send_json(['error' => 'name, capacity and price are required'], 400);
        }

        $ins = $pdo->prepare('INSERT INTO facilities (name,description,capacity,price,icon,status) VALUES (?,?,?,?,?,?)');
        $ins->execute([$name, $description, $capacity, $price, $icon, $status]);
        $id = (int)$pdo->lastInsertId();
        $st = $pdo->prepare('SELECT * FROM facilities WHERE id = ? AND archived = 0');
        $st->execute([$id]);
        $row = $st->fetch();
        $row['id'] = (int)$row['id'];
        $row['capacity'] = (int)$row['capacity'];
        $row['price'] = (float)$row['price'];
        send_json($row, 201);
    }

    if ($method === 'PUT' && preg_match('#^/facilities/(\d+)$#', $path, $m)) {
        require_role(['admin', 'barangay_staff']);
        $id = (int)$m[1];
        $body = get_json_body();

        $fields = [];
        $params = [];
        foreach (['name','description','capacity','price','icon','status'] as $k) {
            if (array_key_exists($k, $body)) {
                $fields[] = "$k = ?";
                $params[] = $body[$k];
            }
        }

        if (!$fields) send_json(['error' => 'No valid fields'], 400);

        $params[] = $id;
        $up = $pdo->prepare('UPDATE facilities SET ' . implode(',', $fields) . ' WHERE id = ? AND archived = 0');
        $up->execute($params);
        if ($up->rowCount() === 0) send_json(['error' => 'Facility not found'], 404);

        $st = $pdo->prepare('SELECT * FROM facilities WHERE id = ? AND archived = 0');
        $st->execute([$id]);
        $row = $st->fetch();
        $row['id'] = (int)$row['id'];
        $row['capacity'] = (int)$row['capacity'];
        $row['price'] = (float)$row['price'];
        send_json($row);
    }

    if ($method === 'DELETE' && preg_match('#^/facilities/(\d+)$#', $path, $m)) {
        require_role(['admin', 'barangay_staff']);
        $id = (int)$m[1];
        $arc = $pdo->prepare('UPDATE facilities SET archived = 1 WHERE id = ? AND archived = 0');
        $arc->execute([$id]);
        if ($arc->rowCount() === 0) send_json(['error' => 'Facility not found'], 404);
        send_json(['success' => true, 'archived' => true]);
    }

    // RESERVATIONS
    if ($method === 'POST' && $path === '/reservations') {
        $authUser = require_role(['resident', 'admin', 'barangay_staff']);
        $body = get_json_body();

        $username = trim((string)($body['username'] ?? ''));
        if ($authUser['role'] === 'resident') {
            $username = $authUser['username'];
        }

        $facilityId = (int)($body['facilityId'] ?? 0);
        $eventDate = trim((string)($body['eventDate'] ?? ''));
        $eventEndDate = trim((string)($body['eventEndDate'] ?? $eventDate));
        $startTime = trim((string)($body['startTime'] ?? ''));
        $endTime = trim((string)($body['endTime'] ?? ''));
        $eventType = trim((string)($body['eventType'] ?? ''));
        $expectedGuests = (int)($body['expectedGuests'] ?? 0);
        $eventDescription = trim((string)($body['eventDescription'] ?? ''));
        $contactPerson = trim((string)($body['contactPerson'] ?? ''));
        $contactPhone = trim((string)($body['contactPhone'] ?? ''));
        $chairsCount = parse_count($body['chairsCount'] ?? 0);
        $electronicsCount = parse_count($body['electronicsCount'] ?? 0);
        $medicalRoomDetails = trim((string)($body['medicalRoomDetails'] ?? ''));
        $paymentOption = normalize_payment_option($body['paymentOption'] ?? 'full');
        $downPaymentAmount = max(0, (float)($body['downPaymentAmount'] ?? 0));
        $totalCost = max(0, (float)($body['totalCost'] ?? 0));

        if ($username === '' || $facilityId <= 0 || $eventDate === '' || $startTime === '' || $endTime === '') {
            send_json(['error' => 'Missing required fields'], 400);
        }

        $startDt = strtotime($eventDate . ' ' . $startTime);
        $endDt = strtotime($eventEndDate . ' ' . $endTime);
        if ($startDt === false || $endDt === false || $endDt <= $startDt) {
            send_json(['error' => 'End date/time must be after start date/time'], 400);
        }

        if ($expectedGuests < 1) {
            send_json(['error' => 'Expected guests must be at least 1'], 400);
        }

        $contactError = validate_contact_fields($contactPerson, $contactPhone);
        if ($contactError) send_json(['error' => $contactError], 400);

        if ($paymentOption === 'down_payment' && ($downPaymentAmount <= 0 || $downPaymentAmount > $totalCost)) {
            send_json(['error' => 'Invalid down payment amount'], 400);
        }

        $fs = $pdo->prepare('SELECT id,name,capacity FROM facilities WHERE id = ? AND archived = 0 LIMIT 1');
        $fs->execute([$facilityId]);
        $facility = $fs->fetch();
        if (!$facility) send_json(['error' => 'Invalid facility selected'], 400);
        if ($expectedGuests > (int)$facility['capacity']) {
            send_json(['error' => 'Expected guests exceeds facility capacity (' . (int)$facility['capacity'] . ')'], 400);
        }

        if (strtolower((string)$facility['name']) === 'medical room' && $medicalRoomDetails === '') {
            send_json(['error' => 'Medical room requires a specific room/details input'], 400);
        }

        // conflict check
        $conf = $pdo->prepare('SELECT event_date,event_end_date,start_time,end_time FROM reservations WHERE facility_id = ? AND archived = 0 AND status IN ("pending","approved")');
        $conf->execute([$facilityId]);
        while ($r = $conf->fetch()) {
            $rStart = strtotime($r['event_date'] . ' ' . $r['start_time']);
            $rEnd = strtotime(($r['event_end_date'] ?: $r['event_date']) . ' ' . $r['end_time']);
            if ($rStart && $rEnd && !($endDt <= $rStart || $startDt >= $rEnd)) {
                send_json(['error' => 'This facility is already reserved for the selected schedule'], 409);
            }
        }

        $ins = $pdo->prepare('INSERT INTO reservations (username,facility_id,event_date,event_end_date,start_time,end_time,event_type,expected_guests,event_description,contact_person,contact_phone,chairs_count,electronics_count,medical_room_details,payment_option,down_payment_amount,total_cost,status,payment_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,"pending","pending")');
        $ins->execute([
            $username,
            $facilityId,
            $eventDate,
            $eventEndDate,
            $startTime,
            $endTime,
            $eventType,
            $expectedGuests,
            $eventDescription,
            $contactPerson,
            $contactPhone,
            $chairsCount,
            $electronicsCount,
            $medicalRoomDetails !== '' ? $medicalRoomDetails : null,
            $paymentOption,
            $downPaymentAmount,
            $totalCost,
        ]);

        $row = get_reservation_by_id($pdo, (int)$pdo->lastInsertId());
        send_json($row, 201);
    }

    if ($method === 'GET' && $path === '/reservations') {
        $authUser = require_role(['resident', 'admin', 'barangay_staff']);
        $requestedUser = isset($_GET['user']) ? trim((string)$_GET['user']) : '';

        if ($authUser['role'] === 'resident') {
            $st = $pdo->prepare('SELECT * FROM reservations WHERE username = ? AND archived = 0 ORDER BY id DESC');
            $st->execute([$authUser['username']]);
        } elseif ($requestedUser !== '') {
            $st = $pdo->prepare('SELECT * FROM reservations WHERE username = ? AND archived = 0 ORDER BY id DESC');
            $st->execute([$requestedUser]);
        } else {
            $st = $pdo->query('SELECT * FROM reservations WHERE archived = 0 ORDER BY id DESC');
        }

        $rows = $st->fetchAll();
        $out = array_map('normalize_reservation_row', $rows);
        send_json($out);
    }

    if ($method === 'PUT' && preg_match('#^/reservations/(\d+)$#', $path, $m)) {
        $authUser = require_role(['resident', 'admin', 'barangay_staff']);
        $id = (int)$m[1];
        $body = get_json_body();

        $existing = get_reservation_by_id($pdo, $id);
        if (!$existing) send_json(['error' => 'Reservation not found'], 404);

        if ($authUser['role'] === 'resident') {
            if ($existing['username'] !== $authUser['username']) send_json(['error' => 'Forbidden'], 403);
            if ($existing['status'] !== 'pending') send_json(['error' => 'Only pending reservations can be edited by residents'], 400);

            $allowed = ['eventDate','eventEndDate','startTime','endTime','eventType','expectedGuests','eventDescription','contactPerson','contactPhone','chairsCount','electronicsCount','medicalRoomDetails'];
            foreach (array_keys($body) as $key) {
                if (!in_array($key, $allowed, true)) {
                    send_json(['error' => 'Residents can only update reservation details before approval'], 403);
                }
            }
        }

        if (isset($body['paymentMethod']) && strtolower((string)$body['paymentMethod']) !== 'onsite_cash') {
            send_json(['error' => 'Only onsite cash payment is allowed'], 400);
        }

        $updates = [];
        $params = [];
        $map = [
            'username' => 'username',
            'status' => 'status',
            'eventDate' => 'event_date',
            'eventEndDate' => 'event_end_date',
            'startTime' => 'start_time',
            'endTime' => 'end_time',
            'eventType' => 'event_type',
            'expectedGuests' => 'expected_guests',
            'eventDescription' => 'event_description',
            'contactPerson' => 'contact_person',
            'contactPhone' => 'contact_phone',
            'chairsCount' => 'chairs_count',
            'electronicsCount' => 'electronics_count',
            'medicalRoomDetails' => 'medical_room_details',
            'paymentOption' => 'payment_option',
            'downPaymentAmount' => 'down_payment_amount',
            'totalCost' => 'total_cost',
            'approvedBy' => 'approved_by',
            'approvedAt' => 'approved_at',
            'paymentStatus' => 'payment_status',
            'paymentMethod' => 'payment_method',
            'paymentDate' => 'payment_date',
            'rejectionReason' => 'rejection_reason',
            'rejectedBy' => 'rejected_by',
            'rejectedAt' => 'rejected_at',
        ];

        foreach ($map as $in => $dbCol) {
            if (!array_key_exists($in, $body)) continue;
            $value = $body[$in];
            if ($in === 'chairsCount' || $in === 'electronicsCount') $value = parse_count($value);
            if ($in === 'paymentOption') $value = normalize_payment_option($value);
            if ($in === 'downPaymentAmount') $value = max(0, (float)$value);
            $updates[] = "$dbCol = ?";
            $params[] = $value;
        }

        if (!$updates) send_json(['error' => 'No valid fields to update'], 400);

        if (isset($body['contactPerson']) || isset($body['contactPhone'])) {
            $contactError = validate_contact_fields(
                trim((string)($body['contactPerson'] ?? $existing['contactPerson'])),
                trim((string)($body['contactPhone'] ?? $existing['contactPhone']))
            );
            if ($contactError) send_json(['error' => $contactError], 400);
        }

        if (isset($body['eventDate']) || isset($body['eventEndDate']) || isset($body['startTime']) || isset($body['endTime'])) {
            $sDate = (string)($body['eventDate'] ?? $existing['eventDate']);
            $eDate = (string)($body['eventEndDate'] ?? $existing['eventEndDate'] ?? $sDate);
            $sTime = (string)($body['startTime'] ?? $existing['startTime']);
            $eTime = (string)($body['endTime'] ?? $existing['endTime']);
            $s = strtotime($sDate . ' ' . $sTime);
            $e = strtotime($eDate . ' ' . $eTime);
            if ($s === false || $e === false || $e <= $s) {
                send_json(['error' => 'End date/time must be after start date/time'], 400);
            }
        }

        $params[] = $id;
        $up = $pdo->prepare('UPDATE reservations SET ' . implode(',', $updates) . ' WHERE id = ?');
        $up->execute($params);

        $row = get_reservation_by_id($pdo, $id);
        send_json($row);
    }

    if ($method === 'DELETE' && preg_match('#^/reservations/(\d+)$#', $path, $m)) {
        $authUser = require_role(['resident', 'admin', 'barangay_staff']);
        $id = (int)$m[1];

        if ($authUser['role'] === 'resident') {
            $st = $pdo->prepare('SELECT username FROM reservations WHERE id = ? AND archived = 0 LIMIT 1');
            $st->execute([$id]);
            $row = $st->fetch();
            if (!$row) send_json(['error' => 'Reservation not found'], 404);
            if ($row['username'] !== $authUser['username']) send_json(['error' => 'Forbidden'], 403);
        }

        $arc = $pdo->prepare('UPDATE reservations SET archived = 1, status = "cancelled" WHERE id = ? AND archived = 0');
        $arc->execute([$id]);
        if ($arc->rowCount() === 0) send_json(['error' => 'Reservation not found'], 404);
        send_json(['success' => true, 'archived' => true]);
    }

    // NOTIFICATIONS
    if ($method === 'GET' && $path === '/notifications') {
        $authUser = require_role(['resident', 'admin', 'barangay_staff']);
        $requestedUser = isset($_GET['user']) ? trim((string)$_GET['user']) : '';

        if ($authUser['role'] === 'resident') {
            $st = $pdo->prepare('SELECT * FROM notifications WHERE username = ? ORDER BY created_at DESC');
            $st->execute([$authUser['username']]);
        } elseif ($requestedUser !== '') {
            $st = $pdo->prepare('SELECT * FROM notifications WHERE username = ? ORDER BY created_at DESC');
            $st->execute([$requestedUser]);
        } else {
            $st = $pdo->query('SELECT * FROM notifications ORDER BY created_at DESC');
        }

        $rows = $st->fetchAll();
        $out = array_map('notification_row', $rows);
        send_json($out);
    }

    if ($method === 'POST' && $path === '/notifications') {
        $authUser = require_role(['resident', 'admin', 'barangay_staff']);
        $body = get_json_body();
        $username = trim((string)($body['username'] ?? ''));
        $title = trim((string)($body['title'] ?? ''));
        $message = trim((string)($body['message'] ?? ''));
        $type = trim((string)($body['type'] ?? 'info'));
        $isRead = !empty($body['isRead']) ? 1 : 0;
        $reservationId = isset($body['reservationId']) ? (int)$body['reservationId'] : null;

        if ($username === '' || $title === '' || $message === '') {
            send_json(['error' => 'username, title and message are required'], 400);
        }

        if ($authUser['role'] === 'resident' && $username !== $authUser['username']) {
            send_json(['error' => 'Forbidden'], 403);
        }

        $ins = $pdo->prepare('INSERT INTO notifications (username,title,message,type,is_read,reservation_id) VALUES (?,?,?,?,?,?)');
        $ins->execute([$username, $title, $message, $type, $isRead, $reservationId]);
        $id = (int)$pdo->lastInsertId();

        $st = $pdo->prepare('SELECT * FROM notifications WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        send_json(notification_row($row), 201);
    }

    if ($method === 'PUT' && preg_match('#^/notifications/(\d+)/read$#', $path, $m)) {
        $authUser = require_role(['resident', 'admin', 'barangay_staff']);
        $id = (int)$m[1];

        if ($authUser['role'] === 'resident') {
            $st = $pdo->prepare('SELECT username FROM notifications WHERE id = ? LIMIT 1');
            $st->execute([$id]);
            $row = $st->fetch();
            if (!$row) send_json(['error' => 'Notification not found'], 404);
            if ($row['username'] !== $authUser['username']) send_json(['error' => 'Forbidden'], 403);
        }

        $up = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = ?');
        $up->execute([$id]);
        if ($up->rowCount() === 0) send_json(['error' => 'Notification not found'], 404);

        $st = $pdo->prepare('SELECT * FROM notifications WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        send_json(notification_row($row));
    }

    send_json(['error' => 'Not found', 'path' => $path], 404);
} catch (Throwable $e) {
    send_json(['error' => 'Server error', 'detail' => $e->getMessage()], 500);
}
