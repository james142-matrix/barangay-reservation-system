// Initialize admin users page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth('admin')) return;
    loadUsers().catch(err => {
        showToast('Failed to load users: ' + (err.message || 'Unknown error'), 'danger');
    });
});

let editingUserId = null;
let allUsers = [];
let currentStatusTab = 'all';

function validateUserForm(userData) {
    const fullname = String(userData.fullname || '').trim();
    const username = String(userData.username || '').trim();
    const email = String(userData.email || '').trim();
    const phone = String(userData.phone || '').trim();
    const address = String(userData.address || '').trim();

    if (!/^[A-Za-z\s.'-]{3,100}$/.test(fullname)) {
        return 'Full name must be 3-100 characters and contain letters and basic punctuation only.';
    }

    if (!/^[A-Za-z0-9_.-]{3,50}$/.test(username)) {
        return 'Username must be 3-50 characters and use letters, numbers, dot, underscore, or hyphen only.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Enter a valid email address.';
    }

    if (phone !== '' && !/^(?:09\d{9}|639\d{9})$/.test(phone)) {
        return 'Phone must be a valid PH mobile number.';
    }

    if (address !== '' && (address.length < 8 || !/[A-Za-z]/.test(address))) {
        return 'Address must include real place details.';
    }

    if (address.length > 180) {
        return 'Address must be 180 characters or less.';
    }

    return null;
}

async function loadUsers() {
    const users = await window.api.getUsers();
    allUsers = users.filter(u => u.role === 'admin' || u.role === 'barangay_staff');
    updateStats();
    filterUsers();
}

function updateStats() {
    const total = allUsers.length;
    const staff = allUsers.filter(u => u.role === 'barangay_staff').length;
    const admins = allUsers.filter(u => u.role === 'admin').length;
    const pending = allUsers.filter(u => (u.approvalStatus || 'approved') !== 'approved').length;

    document.getElementById('stat-total-users').textContent = total;
    document.getElementById('stat-staff').textContent = staff;
    document.getElementById('stat-admins').textContent = admins;
    document.getElementById('stat-pending').textContent = pending;
}

function displayUsers(users) {
    const container = document.getElementById('users-list');
    const currentUser = getLoggedInUser();
    const activeAdminCount = allUsers.filter(u => u.role === 'admin').length;

    if (users.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">👥</div>
                <h3>No Users Found</h3>
                <p>Start by adding your first user.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
        const roleClass = user.role === 'admin' ? 'role-admin' : 'role-staff';
        const roleLabel = user.role === 'admin' ? '👨‍💼 Admin' : '👷 Barangay Staff';
        const approvalStatus = (user.approvalStatus || 'approved').toLowerCase();
        const isPending = approvalStatus !== 'approved';
        const isSelfAdmin = user.role === 'admin' && currentUser && String(user.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase();
        const isProtectedAdmin = user.role === 'admin' && (isSelfAdmin || activeAdminCount <= 1);
        const statusBadge = isPending
            ? '<span class="status-badge status-pending">⏳ Pending</span>'
            : '<span class="status-badge status-approved">✅ Approved</span>';

        const approveButton = isPending && user.role === 'barangay_staff'
            ? `<button class="btn-small btn-success" onclick="approveUser(${user.id})">Approve</button>`
            : '';
        const declineLabel = isPending ? 'Decline' : 'Archive';
        const declineButtonClass = isPending ? 'btn-warning' : 'btn-danger';
        const archiveButton = isPending
            ? `<button class="btn-small ${declineButtonClass}" onclick="deleteUserConfirm(${user.id}, ${isPending})">${declineLabel}</button>`
            : (isProtectedAdmin
                ? `<button class="btn-small btn-disabled" type="button" disabled title="Protected admin account">${isSelfAdmin ? 'Current Admin' : 'Protected Admin'}</button>`
                : `<button class="btn-small ${declineButtonClass}" onclick="deleteUserConfirm(${user.id}, ${isPending})">${declineLabel}</button>`);

        html += `
            <tr>
                <td>${user.fullname || 'N/A'}</td>
                <td><strong>${user.username}</strong></td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td><span class="${roleClass}" style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; background: ${user.role === 'admin' ? '#e83e8c' : '#f06292'}; color: white;">${roleLabel}</span></td>
                <td>${statusBadge}</td>
                <td class="action-cell">
                    ${approveButton}
                    <button class="btn-small btn-info" onclick="editUser(${user.id})">Edit</button>
                    ${archiveButton}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;

    const filtered = allUsers.filter(user => {
        const matchesSearch = !searchTerm || 
            user.fullname?.toLowerCase().includes(searchTerm) ||
            user.username?.toLowerCase().includes(searchTerm) ||
            user.email?.toLowerCase().includes(searchTerm);

        const matchesRole = !roleFilter || user.role === roleFilter;
        const approvalStatus = (user.approvalStatus || 'approved').toLowerCase();
        const matchesStatus = currentStatusTab === 'all'
            || (currentStatusTab === 'pending' && approvalStatus !== 'approved')
            || (currentStatusTab === 'approved' && approvalStatus === 'approved');

        return matchesSearch && matchesRole && matchesStatus;
    });

    displayUsers(filtered);
}

function setStatusTab(tab) {
    currentStatusTab = tab || 'all';

    const tabs = ['all', 'pending', 'approved'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (!btn) return;
        btn.classList.toggle('active-status-tab', t === currentStatusTab);
    });

    filterUsers();
}

function openAddUserModal() {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('password').placeholder = '8+ chars, 1 uppercase, 1 symbol, no spaces';
    document.getElementById('password').required = true;
    document.getElementById('role').disabled = false;
    document.getElementById('role').title = '';
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
    document.getElementById('role').disabled = false;
    document.getElementById('role').title = '';
    editingUserId = null;
}

function editUser(id) {
    const user = allUsers.find(u => String(u.id) === String(id));
    if (!user) return;
    const currentUser = getLoggedInUser();
    const activeAdminCount = allUsers.filter(u => u.role === 'admin').length;
    const isSelfAdmin = user.role === 'admin' && currentUser && String(user.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase();
    const isProtectedAdminRole = user.role === 'admin' && (isSelfAdmin || activeAdminCount <= 1);

    editingUserId = id;
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('fullname').value = user.fullname || '';
    document.getElementById('username').value = user.username;
    document.getElementById('email').value = user.email;
    // for security we do not prefill the password field
    document.getElementById('password').value = '';
    document.getElementById('password').placeholder = 'Leave blank to keep current';
    document.getElementById('password').required = false;
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('address').value = user.address || '';
    document.getElementById('role').value = user.role;
    document.getElementById('role').disabled = !!isProtectedAdminRole;
    document.getElementById('role').title = isProtectedAdminRole
        ? (isSelfAdmin ? 'You cannot change your own admin role.' : 'Cannot change role of the last active admin.')
        : '';
    document.getElementById('userModal').style.display = 'flex';
}

function sanitizeNameInput(value) {
    return String(value || '').replace(/[^A-Za-z\s.'-]/g, '');
}

function sanitizePhoneInput(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 12);
}

function sanitizeAddressInput(value) {
    return String(value || '').replace(/[<>]/g, '').slice(0, 180);
}

async function saveUser(event) {
    event.preventDefault();

    const userData = {
        fullname: document.getElementById('fullname').value.trim(),
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        role: document.getElementById('role').value
    };

    const validationError = validateUserForm(userData);
    if (validationError) {
        showToast(validationError, 'danger');
        return;
    }

    if (userData.password) {
        if (window.passwordPolicy && typeof window.passwordPolicy.validatePassword === 'function') {
            const policy = window.passwordPolicy.validatePassword(userData.password, userData.username, userData.email);
            if (!policy.ok) {
                showToast(policy.error, 'danger');
                return;
            }
        } else if (userData.password.length < 8) {
            showToast('Password must be at least 8 characters long.', 'danger');
            return;
        }
    }

    try {
        if (editingUserId) {
            const payload = { ...userData };
            if (!payload.password) {
                delete payload.password;
            }
            await window.api.updateUser(editingUserId, payload);
            if (typeof showToast === 'function') showToast('User updated successfully!', 'success');
        } else {
            const payload = { ...userData, password: userData.password };
            await window.api.createUser(payload);
            if (typeof showToast === 'function') showToast('User created successfully!', 'success');
        }
    } catch (error) {
        showToast('Failed to save user: ' + (error.message || 'Unknown error'), 'danger');
        return;
    }

    closeUserModal();
    loadUsers();
}

document.addEventListener('DOMContentLoaded', function() {
    const fullnameInput = document.getElementById('fullname');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');

    if (fullnameInput) {
        fullnameInput.addEventListener('input', function() {
            this.value = sanitizeNameInput(this.value);
        });
    }

    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            this.value = sanitizePhoneInput(this.value);
        });
    }

    if (addressInput) {
        addressInput.addEventListener('input', function() {
            this.value = sanitizeAddressInput(this.value);
        });
    }
});

async function deleteUserConfirm(id, isPending = false) {
    const target = allUsers.find(u => String(u.id) === String(id));
    const currentUser = getLoggedInUser();
    const activeAdminCount = allUsers.filter(u => u.role === 'admin').length;
    const isSelfAdmin = target && target.role === 'admin' && currentUser && String(target.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase();
    const isLastAdmin = target && target.role === 'admin' && activeAdminCount <= 1;

    if (isSelfAdmin) {
        showToast('You cannot archive your own admin account.', 'warning');
        return;
    }
    if (isLastAdmin) {
        showToast('Cannot archive the last active admin account.', 'warning');
        return;
    }

    const actionWord = isPending ? 'decline' : 'archive';
    const doneText = isPending ? 'Signup request declined.' : 'User archived successfully!';
    const failText = isPending ? 'Failed to decline signup request: ' : 'Failed to archive user: ';

    const archiveUser = async () => {
        try {
            await window.api.deleteUser(id);
            if (typeof showToast === 'function') showToast(doneText, 'success');
            loadUsers();
        } catch (error) {
            showToast(failText + (error.message || 'Unknown error'), 'danger');
        }
    };

    if (typeof showConfirm === 'function') {
        showConfirm(`Are you sure you want to ${actionWord} this account?`, archiveUser);
        return;
    }

    if (confirm(`Are you sure you want to ${actionWord} this account?`)) {
        await archiveUser();
    }
}

async function approveUser(id) {
    const doApprove = async () => {
        try {
            await window.api.approveUser(id);
            if (typeof showToast === 'function') showToast('User approved successfully!', 'success');
            loadUsers();
        } catch (error) {
            showToast('Failed to approve user: ' + (error.message || 'Unknown error'), 'danger');
        }
    };

    if (typeof showConfirm === 'function') {
        showConfirm('Approve this staff signup request?', doApprove);
        return;
    }

    if (confirm('Approve this staff signup request?')) {
        await doApprove();
    }
}

// Modal styling
const style = document.createElement('style');
style.textContent = `
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        align-items: center;
        justify-content: center;
    }

    .modal-content {
        background-color: #ffffff;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        max-width: 500px;
        width: 100%;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 15px;
    }

    .modal-header h2 {
        margin: 0;
        font-size: 20px;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #999;
    }

    .close-btn:hover {
        color: #333;
    }

    .btn-small {
        padding: 7px 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        transition: all 0.2s;
        min-width: 78px;
    }

    .btn-info {
        background-color: #607d8b;
        color: white;
    }

    .btn-info:hover {
        background-color: #546e7a;
    }

    .btn-danger {
        background-color: #ef5350;
        color: white;
    }

    .btn-danger:hover {
        background-color: #e53935;
    }

    .btn-warning {
        background-color: #fb8c00;
        color: white;
    }

    .btn-warning:hover {
        background-color: #ef6c00;
    }

    .btn-disabled {
        background-color: #c7ced6;
        color: #fff;
        cursor: not-allowed;
    }

    .btn-success {
        background-color: #28a745;
        color: white;
    }

    .btn-success:hover {
        background-color: #218838;
    }

    .role-admin {
        background: linear-gradient(135deg, #e83e8c 0%, #c2185b 100%);
    }

    .role-staff {
        background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
    }

    .status-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        color: white;
        font-weight: 600;
    }

    .status-pending {
        background: #f39c12;
    }

    .status-approved {
        background: #28a745;
    }

    .action-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .active-status-tab {
        background: #e83e8c !important;
        color: #fff !important;
        border-color: #e83e8c !important;
    }
`;
document.head.appendChild(style);

setStatusTab('all');



