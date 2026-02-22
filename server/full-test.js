const http = require('http');

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3000, path, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    };
    const r = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  let r, data;
  const ts = Date.now();
  const testUser = 'uitest_' + ts;
  let passed = 0, failed = 0;

  function check(label, condition, detail) {
    if (condition) { console.log('  PASS  ' + label + (detail ? ' — ' + detail : '')); passed++; }
    else           { console.log('  FAIL  ' + label + (detail ? ' — ' + detail : '')); failed++; }
  }

  console.log('=== FULL END-TO-END FLOW TEST ===\n');

  // ─── SIGNUP FLOW ───────────────────────────────────────────────
  console.log('--- SIGNUP FLOW ---');

  // 1. Valid signup (PBKDF2 hashed password like the frontend sends)
  r = await req('POST', '/users', {
    username: testUser,
    password: 'pbkdf2$120000$abc$def',
    email: testUser + '@test.com',
    fullname: 'UI Test User',
    phone: '09123456789',
    address: '123 Test St',
    role: 'resident'
  });
  data = JSON.parse(r.body);
  check('Signup valid (201)', r.status === 201, 'id=' + data.id + ' username=' + data.username + ' role=' + data.role);

  // 2. Duplicate username → 409
  r = await req('POST', '/users', {
    username: testUser, password: 'pass', email: 'x@x.com', fullname: 'Dup', phone: '09', address: 'x', role: 'resident'
  });
  check('Signup duplicate username (409)', r.status === 409, 'status=' + r.status);

  // 3. Missing required fields → 400
  r = await req('POST', '/users', { username: 'onlyuser' });
  check('Signup missing fields (400)', r.status === 400, 'status=' + r.status);

  // ─── LOGIN FLOW ────────────────────────────────────────────────
  console.log('\n--- LOGIN FLOW ---');

  // 4. Login PBKDF2 user → requireClientVerify
  r = await req('POST', '/users/login', { username: testUser, password: 'anypassword' });
  data = JSON.parse(r.body);
  check('Login PBKDF2 user (requireClientVerify)', r.status === 200 && data.requireClientVerify === true,
    'requireClientVerify=' + data.requireClientVerify + ' role=' + (data.user && data.user.role));

  // 5. Login legacy user (staff1/staff123)
  r = await req('POST', '/users/login', { username: 'staff1', password: 'staff123' });
  data = JSON.parse(r.body);
  check('Login legacy staff1 (200)', r.status === 200 && data.username === 'staff1',
    'username=' + data.username + ' role=' + data.role);

  // 6. Login wrong password → 401
  r = await req('POST', '/users/login', { username: 'staff1', password: 'wrongpass' });
  check('Login wrong password (401)', r.status === 401, 'status=' + r.status);

  // 7. Login non-existent user → 401
  r = await req('POST', '/users/login', { username: 'nobody_xyz_' + ts, password: 'pass' });
  check('Login non-existent user (401)', r.status === 401, 'status=' + r.status);

  // ─── RESERVATION FLOW ─────────────────────────────────────────
  console.log('\n--- RESERVATION FLOW ---');

  // 8. Create reservation with ALL fields
  r = await req('POST', '/reservations', {
    username: testUser,
    facilityId: 1,
    eventDate: '2026-04-15',
    eventEndDate: '2026-04-15',
    startTime: '09:00',
    endTime: '18:00',
    eventType: 'Birthday',
    expectedGuests: 100,
    eventDescription: 'Birthday party',
    contactPerson: 'UI Test User',
    contactPhone: '09123456789',
    totalCost: 2000
  });
  data = JSON.parse(r.body);
  const resId = data.id;
  check('Create reservation (201)', r.status === 201,
    'id=' + resId + ' username=' + data.username + ' facilityId=' + data.facilityId +
    ' status=' + data.status + ' totalCost=' + data.totalCost + ' eventType=' + data.eventType);

  // 9. Get reservations by user
  r = await req('GET', '/reservations?user=' + testUser);
  data = JSON.parse(r.body);
  check('Get reservations by user (200, count=1)', r.status === 200 && data.length === 1,
    'count=' + data.length);

  // 10. Missing required fields → 400
  r = await req('POST', '/reservations', { username: testUser });
  check('Reservation missing fields (400)', r.status === 400, 'status=' + r.status);

  // 11. Approve reservation
  r = await req('PUT', '/reservations/' + resId, {
    status: 'approved', approvedBy: 'admin', approvedAt: new Date().toISOString()
  });
  data = JSON.parse(r.body);
  check('Approve reservation (200)', r.status === 200 && data.status === 'approved',
    'status=' + data.status + ' approvedBy=' + data.approvedBy);

  // 12. Update payment status
  r = await req('PUT', '/reservations/' + resId, {
    paymentStatus: 'paid', paymentMethod: 'cash', paymentDate: new Date().toISOString()
  });
  data = JSON.parse(r.body);
  check('Update payment (200)', r.status === 200 && data.paymentStatus === 'paid',
    'paymentStatus=' + data.paymentStatus + ' paymentMethod=' + data.paymentMethod);

  // 13. Reject a second reservation
  r = await req('POST', '/reservations', {
    username: testUser, facilityId: 2, eventDate: '2026-05-01', eventEndDate: '2026-05-01',
    startTime: '10:00', endTime: '14:00', eventType: 'Meeting', expectedGuests: 20, totalCost: 750
  });
  const res2 = JSON.parse(r.body);
  r = await req('PUT', '/reservations/' + res2.id, {
    status: 'rejected', rejectionReason: 'Facility under maintenance',
    rejectedBy: 'staff1', rejectedAt: new Date().toISOString()
  });
  data = JSON.parse(r.body);
  check('Reject reservation (200)', r.status === 200 && data.status === 'rejected',
    'status=' + data.status + ' reason=' + data.rejectionReason);

  // 14. Delete reservation
  r = await req('DELETE', '/reservations/' + resId);
  check('Delete reservation (200)', r.status === 200, r.body);

  // 15. Delete non-existent reservation → 404
  r = await req('DELETE', '/reservations/99999');
  check('Delete non-existent (404)', r.status === 404, 'status=' + r.status);

  // Cleanup
  await req('DELETE', '/reservations/' + res2.id);

  // ─── VERIFY DATA IN MYSQL ──────────────────────────────────────
  console.log('\n--- VERIFY DATA IN MYSQL ---');

  r = await req('GET', '/users');
  data = JSON.parse(r.body);
  const found = data.find(u => u.username === testUser);
  check('User persisted in MySQL', !!found,
    found ? 'id=' + found.id + ' email=' + found.email + ' role=' + found.role : 'NOT FOUND');

  r = await req('GET', '/reservations');
  data = JSON.parse(r.body);
  const resFound = data.find(rv => rv.username === testUser);
  check('Deleted reservations removed from MySQL', !resFound, resFound ? 'STILL EXISTS id=' + resFound.id : 'correctly absent');

  // ─── SUMMARY ──────────────────────────────────────────────────
  console.log('\n=== RESULTS: ' + passed + ' passed, ' + failed + ' failed ===');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
