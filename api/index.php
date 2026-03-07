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

function notify_active_staff_admins(PDO $pdo, string $title, string $message, string $type = 'info', ?string $excludeUsername = null): void
{
    $st = $pdo->query('SELECT username FROM users WHERE archived = 0 AND approval_status = "approved" AND role IN ("admin","barangay_staff")');
    $rows = $st ? $st->fetchAll() : [];
    if (!$rows) return;

    $ins = $pdo->prepare('INSERT INTO notifications (username,title,message,type,is_read,reservation_id) VALUES (?,?,?,?,0,NULL)');
    foreach ($rows as $row) {
        $username = (string)($row['username'] ?? '');
        if ($username === '') continue;
        if ($excludeUsername !== null && strtolower($username) === strtolower($excludeUsername)) continue;
        $ins->execute([$username, $title, $message, $type]);
    }
}

try {
    $pdo = db();
    ensure_password_reset_table($pdo);
    ensure_archive_columns($pdo);
    ensure_user_approval_columns($pdo);
    ensure_reservation_optional_columns($pdo);
    ensure_facility_optional_columns($pdo);
    ensure_facility_default_add_ons($pdo);
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
        if (strtolower((string)($user['approval_status'] ?? 'approved')) !== 'approved') {
            send_json(['error' => 'Account pending admin approval. Please wait for confirmation from barangay admin.'], 403);
        }
        if (normalize_role($user['role'] ?? '') === 'resident') {
            send_json(['error' => 'Client account login is disabled. This system is for staff/admin onsite use only.'], 403);
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
        if (strtolower((string)($user['approval_status'] ?? 'approved')) !== 'approved') {
            send_json(['error' => 'Account pending admin approval.'], 403);
        }
        if (normalize_role($user['role'] ?? '') === 'resident') {
            send_json(['error' => 'Client account access is disabled.'], 403);
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

    if ($method === 'POST' && $path === '/auth/signup') {
        $body = get_json_body();
        $username = trim((string)($body['username'] ?? ''));
        $password = (string)($body['password'] ?? '');
        $email = trim((string)($body['email'] ?? ''));
        $fullname = trim((string)($body['fullname'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));

        if ($username === '' || $password === '' || $email === '' || $fullname === '' || $phone === '' || $address === '') {
            send_json(['error' => 'fullname, username, password, email, phone and address are required'], 400);
        }

        $policyErr = validate_password_policy($password);
        if ($policyErr) send_json(['error' => $policyErr, 'code' => 'WEAK_PASSWORD'], 400);

        $exists = $pdo->prepare('SELECT id FROM users WHERE username = ? OR LOWER(email) = LOWER(?) LIMIT 1');
        $exists->execute([$username, $email]);
        if ($exists->fetch()) {
            send_json(['error' => 'username or email already exists'], 409);
        }

        $stored = create_stored_password($password);
        $ins = $pdo->prepare('INSERT INTO users (username,password,email,fullname,phone,address,role,force_password_change,approval_status,approved_by,approved_at) VALUES (?,?,?,?,?,?,?,0,"pending",NULL,NULL)');
        $ins->execute([$username, $stored, $email, $fullname, $phone, $address, 'barangay_staff']);

        send_json([
            'id' => (int)$pdo->lastInsertId(),
            'username' => $username,
            'role' => 'barangay_staff',
            'approvalStatus' => 'pending',
            'message' => 'Signup submitted. Wait for admin approval before login.'
        ], 201);
    }

    // USERS
    if ($method === 'POST' && $path === '/users') {
        $adminUser = require_role(['admin']);
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
        $ins = $pdo->prepare('INSERT INTO users (username,password,email,fullname,phone,address,role,force_password_change,approval_status,approved_by,approved_at) VALUES (?,?,?,?,?,?,?,0,"approved",?,NOW())');
        $ins->execute([$username, $stored, $email, $fullname, $phone, $address, $role, $adminUser['username']]);
        send_json([
            'id' => (int)$pdo->lastInsertId(),
            'username' => $username,
            'role' => $role,
            'approvalStatus' => 'approved'
        ], 201);
    }

    if ($method === 'GET' && $path === '/users') {
        require_role(['admin', 'barangay_staff']);
        $rows = $pdo->query('SELECT id,username,email,fullname,phone,address,role,approval_status,approved_by,approved_at FROM users WHERE archived = 0 ORDER BY id ASC')->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['approvalStatus'] = strtolower((string)($row['approval_status'] ?? 'approved'));
            unset($row['approval_status']);
        }
        send_json($rows);
    }

    if ($method === 'POST' && preg_match('#^/users/(\d+)/approve$#', $path, $m)) {
        $adminUser = require_role(['admin']);
        $id = (int)$m[1];

        $st = $pdo->prepare('SELECT id,role,approval_status FROM users WHERE id = ? AND archived = 0 LIMIT 1');
        $st->execute([$id]);
        $target = $st->fetch();
        if (!$target) send_json(['error' => 'User not found'], 404);

        if (normalize_role($target['role'] ?? '') !== 'barangay_staff') {
            send_json(['error' => 'Only barangay_staff accounts can be approved from signup queue'], 400);
        }

        if (strtolower((string)($target['approval_status'] ?? 'approved')) !== 'approved') {
            $up = $pdo->prepare('UPDATE users SET approval_status = "approved", approved_by = ?, approved_at = NOW() WHERE id = ? AND archived = 0');
            $up->execute([$adminUser['username'], $id]);
        }

        $fresh = $pdo->prepare('SELECT id,username,email,fullname,phone,address,role,approval_status,approved_by,approved_at FROM users WHERE id = ?');
        $fresh->execute([$id]);
        $row = $fresh->fetch();
        $row['id'] = (int)$row['id'];
        $row['approvalStatus'] = strtolower((string)($row['approval_status'] ?? 'approved'));
        unset($row['approval_status']);
        send_json($row);
    }

    if ($method === 'PUT' && preg_match('#^/users/(\d+)$#', $path, $m)) {
        $adminUser = require_role(['admin']);
        $id = (int)$m[1];
        $body = get_json_body();

        $st = $pdo->prepare('SELECT * FROM users WHERE id = ? AND archived = 0 LIMIT 1');
        $st->execute([$id]);
        $user = $st->fetch();
        if (!$user) send_json(['error' => 'User not found'], 404);

        $existingRole = normalize_role($user['role'] ?? '');
        if (array_key_exists('role', $body)) {
            $targetRole = normalize_role($body['role']);
            if ($existingRole === 'admin' && $targetRole !== 'admin') {
                if (strtolower((string)($user['username'] ?? '')) === strtolower((string)$adminUser['username'])) {
                    send_json(['error' => 'You cannot change your own admin role'], 400);
                }
                $countAdmins = (int)$pdo->query('SELECT COUNT(*) AS cnt FROM users WHERE role = "admin" AND archived = 0')->fetchColumn();
                if ($countAdmins <= 1) {
                    send_json(['error' => 'Cannot change role of the last active admin account'], 400);
                }
            }
        }

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

        $fresh = $pdo->prepare('SELECT id,username,email,fullname,phone,address,role,approval_status,approved_by,approved_at FROM users WHERE id = ?');
        $fresh->execute([$id]);
        $row = $fresh->fetch();
        $row['id'] = (int)$row['id'];
        $row['approvalStatus'] = strtolower((string)($row['approval_status'] ?? 'approved'));
        unset($row['approval_status']);
        send_json($row);
    }

    if ($method === 'DELETE' && preg_match('#^/users/(\d+)$#', $path, $m)) {
        $adminUser = require_role(['admin']);
        $id = (int)$m[1];

        $st = $pdo->prepare('SELECT id,username,role FROM users WHERE id = ? AND archived = 0 LIMIT 1');
        $st->execute([$id]);
        $target = $st->fetch();
        if (!$target) send_json(['error' => 'User not found'], 404);

        if (normalize_role($target['role'] ?? '') === 'admin') {
            if (strtolower((string)$target['username']) === strtolower((string)$adminUser['username'])) {
                send_json(['error' => 'You cannot archive your own admin account'], 400);
            }
            $countAdmins = (int)$pdo->query('SELECT COUNT(*) AS cnt FROM users WHERE role = "admin" AND archived = 0')->fetchColumn();
            if ($countAdmins <= 1) {
                send_json(['error' => 'Cannot archive the last active admin account'], 400);
            }
        }

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
            $row['eventTypes'] = resolve_active_event_types($row['event_types'] ?? null, $row['event_types_archived'] ?? null, (string)($row['name'] ?? ''));
            $row['archivedEventTypes'] = parse_event_types_list($row['event_types_archived'] ?? null);
            $row['addOns'] = normalize_facility_add_ons($row['add_ons'] ?? null);
            unset($row['event_types']);
            unset($row['event_types_archived']);
            unset($row['add_ons']);
        }
        send_json($rows);
    }

    if ($method === 'POST' && $path === '/facilities') {
        require_role(['admin']);
        $actor = current_user();
        $body = get_json_body();
        $name = trim((string)($body['name'] ?? ''));
        $description = trim((string)($body['description'] ?? ''));
        $capacity = (int)($body['capacity'] ?? 0);
        $price = (float)($body['price'] ?? 0);
        $icon = (string)($body['icon'] ?? '🏛️');
        $status = (string)($body['status'] ?? 'available');
        $eventTypes = $body['eventTypes'] ?? null;
        $archivedEventTypes = $body['archivedEventTypes'] ?? [];
        $addOns = $body['addOns'] ?? null;

        if ($name === '' || $capacity < 0 || $price < 0) {
            send_json(['error' => 'name, capacity and price are required'], 400);
        }

        $ins = $pdo->prepare('INSERT INTO facilities (name,description,capacity,price,icon,status,event_types,event_types_archived,add_ons) VALUES (?,?,?,?,?,?,?,?,?)');
        $ins->execute([$name, $description, $capacity, $price, $icon, $status, event_types_to_db_json($eventTypes, $name), json_encode(parse_event_types_list($archivedEventTypes), JSON_UNESCAPED_UNICODE), facility_add_ons_to_db_json($addOns)]);
        $id = (int)$pdo->lastInsertId();
        $st = $pdo->prepare('SELECT * FROM facilities WHERE id = ? AND archived = 0');
        $st->execute([$id]);
        $row = $st->fetch();
        $row['id'] = (int)$row['id'];
        $row['capacity'] = (int)$row['capacity'];
        $row['price'] = (float)$row['price'];
        $row['eventTypes'] = resolve_active_event_types($row['event_types'] ?? null, $row['event_types_archived'] ?? null, (string)($row['name'] ?? ''));
        $row['archivedEventTypes'] = parse_event_types_list($row['event_types_archived'] ?? null);
        $row['addOns'] = normalize_facility_add_ons($row['add_ons'] ?? null);
        unset($row['event_types']);
        unset($row['event_types_archived']);
        unset($row['add_ons']);

        $actorName = $actor ? (string)($actor['username'] ?? 'admin') : 'admin';
        notify_active_staff_admins(
            $pdo,
            'Facility Added',
            "Facility \"{$name}\" was added by {$actorName}.",
            'info'
        );
        send_json($row, 201);
    }

    if ($method === 'PUT' && preg_match('#^/facilities/(\d+)$#', $path, $m)) {
        require_role(['admin']);
        $actor = current_user();
        $id = (int)$m[1];
        $body = get_json_body();

        $st = $pdo->prepare('SELECT * FROM facilities WHERE id = ? AND archived = 0 LIMIT 1');
        $st->execute([$id]);
        $existing = $st->fetch();
        if (!$existing) send_json(['error' => 'Facility not found'], 404);

        $newName = array_key_exists('name', $body) ? trim((string)$body['name']) : (string)($existing['name'] ?? '');
        if ($newName === '') {
            send_json(['error' => 'Facility name is required'], 400);
        }

        $fields = [];
        $params = [];
        foreach (['name','description','capacity','price','icon','status'] as $k) {
            if (array_key_exists($k, $body)) {
                $fields[] = "{$k} = ?";
                $params[] = $body[$k];
            }
        }
        if (array_key_exists('eventTypes', $body)) {
            $fields[] = 'event_types = ?';
            $params[] = event_types_to_db_json($body['eventTypes'], $newName);
        }
        if (array_key_exists('archivedEventTypes', $body)) {
            $fields[] = 'event_types_archived = ?';
            $params[] = json_encode(parse_event_types_list($body['archivedEventTypes']), JSON_UNESCAPED_UNICODE);
        }
        if (array_key_exists('addOns', $body)) {
            $fields[] = 'add_ons = ?';
            $params[] = facility_add_ons_to_db_json($body['addOns']);
        }

        if (!$fields) send_json(['error' => 'No valid fields'], 400);

        $params[] = $id;
        $up = $pdo->prepare('UPDATE facilities SET ' . implode(',', $fields) . ' WHERE id = ? AND archived = 0');
        $up->execute($params);

        $st = $pdo->prepare('SELECT * FROM facilities WHERE id = ? AND archived = 0');
        $st->execute([$id]);
        $row = $st->fetch();
        $row['id'] = (int)$row['id'];
        $row['capacity'] = (int)$row['capacity'];
        $row['price'] = (float)$row['price'];
        $row['eventTypes'] = resolve_active_event_types($row['event_types'] ?? null, $row['event_types_archived'] ?? null, (string)($row['name'] ?? ''));
        $row['archivedEventTypes'] = parse_event_types_list($row['event_types_archived'] ?? null);
        $row['addOns'] = normalize_facility_add_ons($row['add_ons'] ?? null);
        unset($row['event_types']);
        unset($row['event_types_archived']);
        unset($row['add_ons']);

        $changedParts = [];
        if (array_key_exists('name', $body)) {
            if (trim((string)$body['name']) !== (string)($existing['name'] ?? '')) $changedParts[] = 'name';
        }
        if (array_key_exists('description', $body)) {
            if (trim((string)$body['description']) !== (string)($existing['description'] ?? '')) $changedParts[] = 'description';
        }
        if (array_key_exists('capacity', $body)) {
            if ((int)$body['capacity'] !== (int)($existing['capacity'] ?? 0)) $changedParts[] = 'capacity';
        }
        if (array_key_exists('price', $body)) {
            if (abs((float)$body['price'] - (float)($existing['price'] ?? 0)) > 0.0001) $changedParts[] = 'price';
        }
        if (array_key_exists('status', $body)) {
            if (strtolower(trim((string)$body['status'])) !== strtolower((string)($existing['status'] ?? ''))) $changedParts[] = 'status';
        }
        if (array_key_exists('eventTypes', $body) || array_key_exists('archivedEventTypes', $body)) {
            $beforeActive = resolve_active_event_types($existing['event_types'] ?? null, $existing['event_types_archived'] ?? null, (string)($existing['name'] ?? ''));
            $afterActive = array_key_exists('eventTypes', $body)
                ? parse_event_types_list($body['eventTypes'])
                : $beforeActive;
            $beforeArchived = parse_event_types_list($existing['event_types_archived'] ?? null);
            $afterArchived = array_key_exists('archivedEventTypes', $body)
                ? parse_event_types_list($body['archivedEventTypes'])
                : $beforeArchived;
            if (json_encode($beforeActive) !== json_encode($afterActive) || json_encode($beforeArchived) !== json_encode($afterArchived)) {
                $changedParts[] = 'event types';
            }
        }
        if (array_key_exists('addOns', $body)) {
            $beforeAddOns = normalize_facility_add_ons($existing['add_ons'] ?? null);
            $afterAddOns = normalize_facility_add_ons($body['addOns']);
            if (json_encode($beforeAddOns) !== json_encode($afterAddOns)) $changedParts[] = 'add-ons';
        }
        $changedText = $changedParts ? (' Updated: ' . implode(', ', $changedParts) . '.') : '';
        $actorName = $actor ? (string)($actor['username'] ?? 'admin') : 'admin';
        if ($changedParts) {
            notify_active_staff_admins(
                $pdo,
                'Facility Updated',
                "Facility \"{$newName}\" was updated by {$actorName}.{$changedText}",
                'info'
            );
        }
        send_json($row);
    }

    if ($method === 'DELETE' && preg_match('#^/facilities/(\d+)$#', $path, $m)) {
        require_role(['admin']);
        $id = (int)$m[1];

        $nameSt = $pdo->prepare('SELECT name FROM facilities WHERE id = ? LIMIT 1');
        $nameSt->execute([$id]);
        $nameRow = $nameSt->fetch();
        $facilityName = (string)($nameRow['name'] ?? ('Facility #' . $id));
        $actor = current_user();

        $arc = $pdo->prepare('UPDATE facilities SET archived = 1 WHERE id = ? AND archived = 0');
        $arc->execute([$id]);
        if ($arc->rowCount() === 0) send_json(['error' => 'Facility not found'], 404);

        $actorName = $actor ? (string)($actor['username'] ?? 'admin') : 'admin';
        notify_active_staff_admins(
            $pdo,
            'Facility Archived',
            "Facility \"{$facilityName}\" was archived by {$actorName}.",
            'info'
        );
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
        $clientEmail = trim((string)($body['clientEmail'] ?? ''));

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
        $selectedAddOns = normalize_selected_add_ons($body['addOns'] ?? []);
        $medicalRoomDetails = trim((string)($body['medicalRoomDetails'] ?? ''));
        $paymentOption = normalize_payment_option($body['paymentOption'] ?? 'full');
        $downPaymentAmount = max(0, (float)($body['downPaymentAmount'] ?? 0));
        $submittedTotalCost = max(0, (float)($body['totalCost'] ?? 0));

        if ($username === '' || $facilityId <= 0 || $eventDate === '' || $startTime === '' || $endTime === '') {
            send_json(['error' => 'Missing required fields'], 400);
        }
        if ($clientEmail !== '' && !filter_var($clientEmail, FILTER_VALIDATE_EMAIL)) {
            send_json(['error' => 'Invalid client email address'], 400);
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

        if ($paymentOption === 'down_payment' && ($downPaymentAmount <= 0 || ($submittedTotalCost > 0 && $downPaymentAmount > $submittedTotalCost))) {
            send_json(['error' => 'Invalid down payment amount'], 400);
        }

        $fs = $pdo->prepare('SELECT id,name,capacity,price,status,event_types,event_types_archived,add_ons FROM facilities WHERE id = ? AND archived = 0 LIMIT 1');
        $fs->execute([$facilityId]);
        $facility = $fs->fetch();
        if (!$facility) send_json(['error' => 'Invalid facility selected'], 400);
        if (strtolower((string)($facility['status'] ?? 'available')) !== 'available') {
            send_json(['error' => 'Selected facility is currently unavailable for reservation'], 409);
        }
        if ($expectedGuests > (int)$facility['capacity']) {
            send_json(['error' => 'Expected guests exceeds facility capacity (' . (int)$facility['capacity'] . ')'], 400);
        }
        $allowedEventTypes = resolve_active_event_types($facility['event_types'] ?? null, $facility['event_types_archived'] ?? null, (string)($facility['name'] ?? ''));
        if ($eventType !== '' && !in_array($eventType, $allowedEventTypes, true)) {
            send_json(['error' => 'Invalid event type for selected facility'], 400);
        }

        $facilityAddOns = normalize_facility_add_ons($facility['add_ons'] ?? null);
        $facilityAddOnMap = [];
        foreach ($facilityAddOns as $addOn) {
            if (!empty($addOn['enabled'])) {
                $facilityAddOnMap[(string)$addOn['id']] = $addOn;
            }
        }
        $addOnSnapshot = [];
        $addOnTotal = 0.0;
        foreach ($selectedAddOns as $sel) {
            $id = (string)$sel['id'];
            if (!isset($facilityAddOnMap[$id])) {
                send_json(['error' => 'Invalid add-on selected for this facility'], 400);
            }
            $def = $facilityAddOnMap[$id];
            $qty = parse_count($sel['qty']);
            if ($qty <= 0) continue;
            $price = (float)$def['price'];
            $lineTotal = round($qty * $price, 2);
            $addOnSnapshot[] = [
                'id' => (string)$def['id'],
                'name' => (string)$def['name'],
                'unit' => (string)$def['unit'],
                'price' => $price,
                'qty' => $qty,
                'total' => $lineTotal,
            ];
            $addOnTotal += $lineTotal;
        }

        $durationHours = ($endDt - $startDt) / 3600;
        $baseCost = round(((float)$facility['price']) * $durationHours, 2);
        $totalCost = round($baseCost + $addOnTotal, 2);
        if ($submittedTotalCost > 0 && abs($submittedTotalCost - $totalCost) > 0.01) {
            send_json(['error' => 'Total cost mismatch. Please refresh and try again.'], 409);
        }
        if ($paymentOption === 'down_payment' && $downPaymentAmount > $totalCost) {
            send_json(['error' => 'Down payment cannot exceed total cost'], 400);
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

        $ins = $pdo->prepare('INSERT INTO reservations (username,client_email,facility_id,event_date,event_end_date,start_time,end_time,event_type,expected_guests,event_description,contact_person,contact_phone,chairs_count,electronics_count,medical_room_details,add_ons_snapshot,add_on_total,payment_option,down_payment_amount,amount_paid,total_cost,status,payment_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,"pending","pending")');
        $ins->execute([
            $username,
            $clientEmail !== '' ? $clientEmail : null,
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
            json_encode($addOnSnapshot, JSON_UNESCAPED_UNICODE),
            $addOnTotal,
            $paymentOption,
            $downPaymentAmount,
            0,
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
            if ($existing['status'] !== 'pending') send_json(['error' => 'Only pending reservations can be edited by clients'], 400);

            $allowed = ['eventDate','eventEndDate','startTime','endTime','eventType','expectedGuests','eventDescription','contactPerson','contactPhone','chairsCount','electronicsCount','medicalRoomDetails'];
            foreach (array_keys($body) as $key) {
                if (!in_array($key, $allowed, true)) {
                    send_json(['error' => 'Clients can only update reservation details before approval'], 403);
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
            'clientEmail' => 'client_email',
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
            'addOns' => 'add_ons_snapshot',
            'addOnTotal' => 'add_on_total',
            'paymentOption' => 'payment_option',
            'downPaymentAmount' => 'down_payment_amount',
            'amountPaid' => 'amount_paid',
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
            if ($in === 'amountPaid') $value = max(0, (float)$value);
            if ($in === 'addOns') $value = json_encode(is_array($value) ? $value : [], JSON_UNESCAPED_UNICODE);
            if ($in === 'addOnTotal') $value = max(0, (float)$value);
            $updates[] = "$dbCol = ?";
            $params[] = $value;
        }

        if (!$updates) send_json(['error' => 'No valid fields to update'], 400);

        if (array_key_exists('amountPaid', $body)) {
            $nextTotalCost = isset($body['totalCost']) ? max(0, (float)$body['totalCost']) : max(0, (float)($existing['totalCost'] ?? 0));
            $nextAmountPaid = max(0, (float)$body['amountPaid']);
            if ($nextAmountPaid > $nextTotalCost) {
                send_json(['error' => 'Amount paid cannot exceed total cost'], 400);
            }
        }

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
        $prevPaymentStatus = strtolower((string)($existing['paymentStatus'] ?? 'pending'));
        $newPaymentStatus = strtolower((string)($row['paymentStatus'] ?? 'pending'));
        $prevAmountPaid = max(0, (float)($existing['amountPaid'] ?? 0));
        $newAmountPaid = max(0, (float)($row['amountPaid'] ?? 0));
        $totalCostAmount = max(0, (float)($row['totalCost'] ?? 0));
        $recentPaymentAmount = max(0, $newAmountPaid - $prevAmountPaid);
        $remainingBalance = max(0, $totalCostAmount - $newAmountPaid);
        $paymentCompletedNow = in_array($newPaymentStatus, ['paid', 'cash'], true)
            && !in_array($prevPaymentStatus, ['paid', 'cash'], true);
        $partialPaymentNow = $newPaymentStatus === 'partial'
            && $recentPaymentAmount > 0
            && $remainingBalance > 0;

        if ($paymentCompletedNow || $partialPaymentNow) {
            $emailTarget = trim((string)($row['clientEmail'] ?? ''));
            if ($emailTarget === '') {
                $u = $pdo->prepare('SELECT email FROM users WHERE username = ? AND archived = 0 LIMIT 1');
                $u->execute([(string)$row['username']]);
                $uRow = $u->fetch();
                $emailTarget = trim((string)($uRow['email'] ?? ''));
            }

            if ($emailTarget !== '' && filter_var($emailTarget, FILTER_VALIDATE_EMAIL)) {
                try {
                    $fs = $pdo->prepare('SELECT name FROM facilities WHERE id = ? LIMIT 1');
                    $fs->execute([(int)($row['facilityId'] ?? 0)]);
                    $frow = $fs->fetch();
                    $facilityName = (string)($frow['name'] ?? 'Facility');
                    if ($paymentCompletedNow) {
                        send_reservation_receipt_email($cfg, $emailTarget, $row, $facilityName);
                    } else {
                        send_partial_payment_receipt_email($cfg, $emailTarget, $row, $facilityName, $recentPaymentAmount, $remainingBalance);
                    }
                } catch (Throwable $mailErr) {
                    error_log('Reservation receipt email failed: ' . $mailErr->getMessage());
                }
            }
        }
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

    // ARCHIVE CENTER (admin only)
    if ($method === 'GET' && $path === '/archive/users') {
        require_role(['admin']);
        $rows = $pdo->query('SELECT id,username,email,fullname,phone,address,role,approval_status,approved_by,approved_at FROM users WHERE archived = 1 ORDER BY id DESC')->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['approvalStatus'] = strtolower((string)($row['approval_status'] ?? 'approved'));
            unset($row['approval_status']);
        }
        send_json($rows);
    }

    if ($method === 'POST' && preg_match('#^/archive/users/(\d+)/restore$#', $path, $m)) {
        require_role(['admin']);
        $id = (int)$m[1];
        $up = $pdo->prepare('UPDATE users SET archived = 0 WHERE id = ? AND archived = 1');
        $up->execute([$id]);
        if ($up->rowCount() === 0) send_json(['error' => 'Archived user not found'], 404);

        $st = $pdo->prepare('SELECT id,username,email,fullname,phone,address,role,approval_status,approved_by,approved_at FROM users WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch();
        $row['id'] = (int)$row['id'];
        $row['approvalStatus'] = strtolower((string)($row['approval_status'] ?? 'approved'));
        unset($row['approval_status']);
        send_json($row);
    }

    if ($method === 'GET' && $path === '/archive/facilities') {
        require_role(['admin']);
        $rows = $pdo->query('SELECT * FROM facilities WHERE archived = 1 ORDER BY id DESC')->fetchAll();
        foreach ($rows as &$row) {
            $row['id'] = (int)$row['id'];
            $row['capacity'] = (int)$row['capacity'];
            $row['price'] = (float)$row['price'];
            $row['eventTypes'] = resolve_active_event_types($row['event_types'] ?? null, $row['event_types_archived'] ?? null, (string)($row['name'] ?? ''));
            $row['archivedEventTypes'] = parse_event_types_list($row['event_types_archived'] ?? null);
            $row['addOns'] = normalize_facility_add_ons($row['add_ons'] ?? null);
            unset($row['event_types']);
            unset($row['event_types_archived']);
            unset($row['add_ons']);
        }
        send_json($rows);
    }

    if ($method === 'POST' && preg_match('#^/archive/facilities/(\d+)/restore$#', $path, $m)) {
        require_role(['admin']);
        $id = (int)$m[1];
        $actor = current_user();
        $up = $pdo->prepare('UPDATE facilities SET archived = 0 WHERE id = ? AND archived = 1');
        $up->execute([$id]);
        if ($up->rowCount() === 0) send_json(['error' => 'Archived facility not found'], 404);

        $st = $pdo->prepare('SELECT * FROM facilities WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch();
        $row['id'] = (int)$row['id'];
        $row['capacity'] = (int)$row['capacity'];
        $row['price'] = (float)$row['price'];
        $row['eventTypes'] = resolve_active_event_types($row['event_types'] ?? null, $row['event_types_archived'] ?? null, (string)($row['name'] ?? ''));
        $row['archivedEventTypes'] = parse_event_types_list($row['event_types_archived'] ?? null);
        $row['addOns'] = normalize_facility_add_ons($row['add_ons'] ?? null);
        unset($row['event_types']);
        unset($row['event_types_archived']);
        unset($row['add_ons']);

        $actorName = $actor ? (string)($actor['username'] ?? 'admin') : 'admin';
        $facilityName = (string)($row['name'] ?? ('Facility #' . $id));
        notify_active_staff_admins(
            $pdo,
            'Facility Restored',
            "Facility \"{$facilityName}\" was restored by {$actorName}.",
            'info'
        );
        send_json($row);
    }

    if ($method === 'GET' && $path === '/archive/reservations') {
        require_role(['admin']);
        $rows = $pdo->query('SELECT * FROM reservations WHERE archived = 1 ORDER BY id DESC')->fetchAll();
        $out = array_map('normalize_reservation_row', $rows);
        send_json($out);
    }

    if ($method === 'POST' && preg_match('#^/archive/reservations/(\d+)/restore$#', $path, $m)) {
        require_role(['admin']);
        $id = (int)$m[1];
        $up = $pdo->prepare('UPDATE reservations SET archived = 0, status = CASE WHEN status = "cancelled" THEN "pending" ELSE status END WHERE id = ? AND archived = 1');
        $up->execute([$id]);
        if ($up->rowCount() === 0) send_json(['error' => 'Archived reservation not found'], 404);

        $st = $pdo->prepare('SELECT * FROM reservations WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch();
        send_json(normalize_reservation_row($row));
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
