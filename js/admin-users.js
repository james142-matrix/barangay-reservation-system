// Initialize admin users page
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth('admin')) return;
    loadUsers().catch(err => {
        showToast('Failed to load users: ' + (err.message || 'Unknown error'), 'danger');
    });
});

let editingUserId = null;
let allUsers = [];

async function loadUsers() {
    const users = await window.api.getUsers();
    allUsers = users.filter(u => u.role === 'admin' || u.role === 'barangay_staff');
    updateStats();
    displayUsers(allUsers);
}

function updateStats() {
    const total = allUsers.length;
    const staff = allUsers.filter(u => u.role === 'barangay_staff').length;
    const admins = allUsers.filter(u => u.role === 'admin').length;

    document.getElementById('stat-total-users').textContent = total;
    document.getElementById('stat-staff').textContent = staff;
    document.getElementById('stat-admins').textContent = admins;
}

function displayUsers(users) {
    const container = document.getElementById('users-list');

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
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
        const roleClass = user.role === 'admin' ? 'role-admin' : 'role-staff';
        const roleLabel = user.role === 'admin' ? '👨‍💼 Admin' : '👷 Barangay Staff';

        html += `
            <tr>
                <td>${user.fullname || 'N/A'}</td>
                <td><strong>${user.username}</strong></td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td><span class="${roleClass}" style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; background: ${user.role === 'admin' ? '#e83e8c' : '#f06292'}; color: white;">${roleLabel}</span></td>
                <td>
                    <button class="btn-small btn-info" onclick="editUser(${user.id})" style="margin: 0 5px;">✏️ Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteUserConfirm(${user.id})" style="margin: 0 5px;">🗄️ Archive</button>
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

        return matchesSearch && matchesRole;
    });

    displayUsers(filtered);
}

function openAddUserModal() {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('password').placeholder = '8+ chars, 1 uppercase, 1 symbol, no spaces';
    document.getElementById('password').required = true;
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
    editingUserId = null;
}

function editUser(id) {
    const user = allUsers.find(u => String(u.id) === String(id));
    if (!user) return;

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
    document.getElementById('userModal').style.display = 'flex';
}

async function saveUser(event) {
    event.preventDefault();

    const userData = {
        fullname: document.getElementById('fullname').value,
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        role: document.getElementById('role').value
    };

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
            await window.api.signup(payload);
            if (typeof showToast === 'function') showToast('User created successfully!', 'success');
        }
    } catch (error) {
        showToast('Failed to save user: ' + (error.message || 'Unknown error'), 'danger');
        return;
    }

    closeUserModal();
    loadUsers();
}

async function deleteUserConfirm(id) {
    const archiveUser = async () => {
        try {
            await window.api.deleteUser(id);
            if (typeof showToast === 'function') showToast('User archived successfully!', 'success');
            loadUsers();
        } catch (error) {
            showToast('Failed to archive user: ' + (error.message || 'Unknown error'), 'danger');
        }
    };

    if (typeof showConfirm === 'function') {
        showConfirm('Are you sure you want to archive this user?', archiveUser);
        return;
    }

    if (confirm('Are you sure you want to archive this user?')) {
        await archiveUser();
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
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
    }

    .btn-info {
        background-color: #f06292;
        color: white;
    }

    .btn-info:hover {
        background-color: #3a96e0;
    }

    .btn-danger {
        background-color: #f5576c;
        color: white;
    }

    .btn-danger:hover {
        background-color: #e04555;
    }

    .role-admin {
        background: linear-gradient(135deg, #e83e8c 0%, #c2185b 100%);
    }

    .role-staff {
        background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
    }
`;
document.head.appendChild(style);




