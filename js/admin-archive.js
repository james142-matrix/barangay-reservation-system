document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth('admin')) return;
    loadArchiveCenter().catch(err => {
        showToast('Failed to load archive center: ' + (err.message || 'Unknown error'), 'danger');
    });
});

let currentArchiveTab = 'users';

function formatDateShort(dateLike) {
    if (!dateLike) return '-';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime12Hour(timeValue) {
    if (!timeValue) return '-';
    const cleaned = String(timeValue).slice(0, 5);
    const [h, m] = cleaned.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return String(timeValue);
    const hour12 = (h % 12) || 12;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatTimeRange(startTime, endTime) {
    return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
}

function setArchiveTab(tab) {
    currentArchiveTab = tab;
    document.getElementById('tab-users').className = tab === 'users' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('tab-facilities').className = tab === 'facilities' ? 'btn btn-primary' : 'btn btn-secondary';
    loadArchiveCenter().catch(err => {
        showToast('Failed to switch archive tab: ' + (err.message || 'Unknown error'), 'danger');
    });
}

async function loadArchiveCenter() {
    if (currentArchiveTab === 'users') {
        await loadArchivedUsers();
        return;
    }
    await loadArchivedFacilities();
}

async function loadArchivedUsers() {
    const list = document.getElementById('archive-list');
    const title = document.getElementById('archive-title');
    title.textContent = 'Archived Users';

    const users = await window.api.getArchivedUsers();
    if (!users || users.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">👥</div>
                <h3>No Archived Users</h3>
                <p>Archived user accounts will appear here.</p>
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
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(u => {
        html += `
            <tr>
                <td>${u.fullname || '-'}</td>
                <td>${u.username || '-'}</td>
                <td>${u.email || '-'}</td>
                <td>${u.role || '-'}</td>
                <td>${u.approvalStatus || '-'}</td>
                <td><button class="btn btn-small btn-success" onclick="restoreArchivedUser(${u.id})">Restore</button></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    list.innerHTML = html;
}

async function loadArchivedFacilities() {
    const list = document.getElementById('archive-list');
    const title = document.getElementById('archive-title');
    title.textContent = 'Archived Facilities';

    const facilities = await window.api.getArchivedFacilities();
    if (!facilities || facilities.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="margin: 0;">
                <div class="empty-state-icon">🏛️</div>
                <h3>No Archived Facilities</h3>
                <p>Archived facilities will appear here.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Capacity</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    facilities.forEach(f => {
        html += `
            <tr>
                <td>${f.name || '-'}</td>
                <td>${Number(f.capacity || 0)}</td>
                <td>₱${Number(f.price || 0).toFixed(2)}</td>
                <td>${f.status || '-'}</td>
                <td><button class="btn btn-small btn-success" onclick="restoreArchivedFacility(${f.id})">Restore</button></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    list.innerHTML = html;
}

async function restoreArchivedUser(id) {
    try {
        await window.api.restoreArchivedUser(id);
        showToast('User restored successfully', 'success');
        await loadArchiveCenter();
    } catch (err) {
        showToast('Failed to restore user: ' + (err.message || 'Unknown error'), 'danger');
    }
}

async function restoreArchivedFacility(id) {
    try {
        await window.api.restoreArchivedFacility(id);
        showToast('Facility restored successfully', 'success');
        await loadArchiveCenter();
    } catch (err) {
        showToast('Failed to restore facility: ' + (err.message || 'Unknown error'), 'danger');
    }
}
