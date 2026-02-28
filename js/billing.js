// billing.js
// Handles resident billing dashboard where users can pay for approved reservations

document.addEventListener('DOMContentLoaded', function() {
    checkAuth('resident');
    bindNotificationToggle();
    loadBillingReservations().catch(err => {
        showToast('Failed to load billing reservations: ' + (err.message || 'Unknown error'), 'danger');
    });
    loadNotifications();

    // refresh notification count periodically
    setInterval(() => {
        const user = getLoggedInUser();
        if (user) {
            updateNotificationBadge(user.username);
        }
    }, 3000);
});

// ===========================
// BILLING LOGIC
// ===========================

let billingReservations = [];
let facilitiesById = new Map();

function normalizeReservation(raw) {
    if (!raw) return raw;
    return {
        ...raw,
        id: typeof raw.id === 'string' ? parseInt(raw.id, 10) : raw.id,
        facilityId: raw.facilityId != null ? raw.facilityId : raw.facility_id,
        eventDate: raw.eventDate || raw.event_date,
        startTime: raw.startTime || raw.start_time,
        endTime: raw.endTime || raw.end_time,
        totalCost: raw.totalCost != null ? Number(raw.totalCost) : (raw.total_cost != null ? Number(raw.total_cost) : 0),
        paymentStatus: raw.paymentStatus || raw.payment_status || 'pending'
    };
}

async function loadBillingReservations() {
    const user = getLoggedInUser();
    const [reservationsRaw, facilities] = await Promise.all([
        window.api.getReservationsByUser(user.username),
        window.api.getFacilities()
    ]);
    let reservations = reservationsRaw;
    facilitiesById = new Map((facilities || []).map(f => [String(f.id), f]));

    reservations = (reservations || []).map(normalizeReservation);
    billingReservations = reservations.filter(r =>
        r.status === 'approved' &&
        r.paymentStatus !== 'paid' &&
        r.paymentStatus !== 'cash'
    );

    // debug output
    console.log('billing load for', user && user.username);
    console.log('unpaid reservations for user:', billingReservations);

    displayBillingList(billingReservations);
}

function displayBillingList(reservations) {
    const container = document.getElementById('billing-list');

    if (reservations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💳</div>
                <h3>No Pending Payments</h3>
                <p>You don't have any approved reservations waiting for payment.</p>
                <a href="reserve.html" class="btn btn-primary">Make a Reservation</a>
            </div>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Facility</th>
                    <th>Event Date</th>
                    <th>Time</th>
                    <th>Cost</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    reservations.forEach(r => {
        const facility = facilitiesById.get(String(r.facilityId));
        html += `
            <tr>
                <td>${facility ? facility.name : 'Unknown'}</td>
                <td>${formatDate(r.eventDate).split(',')[0]}</td>
                <td>${r.startTime} - ${r.endTime}</td>
                <td>₱${r.totalCost.toFixed(2)}</td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="payOnline(${r.id})">Pay Online</button>
                    <button class="btn btn-small btn-secondary" onclick="markPaidCash(${r.id})">Mark as Paid (Cash)</button>
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

async function payOnline(reservationId) {
    console.log('billing.payOnline', reservationId);
    const proceedPayment = async () => {
        try {
            const reservation = await window.api.updateReservation(reservationId, {
                paymentStatus: 'paid',
                paymentMethod: 'online',
                paymentDate: new Date().toISOString(),
                status: 'completed'
            });
            console.log('billing.markReservationPaid returned', reservation);
            if (reservation) {
                const user = getLoggedInUser();
                createNotification(user.username, 'Payment Received', `Online payment recorded for reservation ${reservation.id}.`, 'info', reservation.id);
                showToast('Payment successful', 'success');
                loadBillingReservations();
            } else {
                showToast('Unable to record payment', 'danger');
                if (typeof showAlert === 'function') {
                    showAlert('Payment failed - reservation not found.');
                } else {
                    alert('Payment failed - reservation not found.');
                }
            }
        } catch (error) {
            showToast('Payment failed: ' + (error.message || 'Unknown error'), 'danger');
        }
    };

    if (typeof showConfirm === 'function') {
        showConfirm('Proceed with online payment?', proceedPayment);
        return;
    }

    if (!confirm('Proceed with online payment?')) return;
    await proceedPayment();
}

async function markPaidCash(reservationId) {
    console.log('billing.markPaidCash', reservationId);
    const proceedCash = async () => {
        try {
            const reservation = await window.api.updateReservation(reservationId, {
                paymentStatus: 'cash',
                paymentMethod: 'cash',
                paymentDate: new Date().toISOString(),
                status: 'completed'
            });
            console.log('billing.markReservationCash returned', reservation);
            if (reservation) {
                const user = getLoggedInUser();
                createNotification(user.username, 'Payment Recorded', `Cash payment marked for reservation ${reservation.id}.`, 'info', reservation.id);
                showToast('Payment recorded', 'success');
                loadBillingReservations();
            } else {
                showToast('Unable to record payment', 'danger');
                if (typeof showAlert === 'function') {
                    showAlert('Payment failed - reservation not found.');
                } else {
                    alert('Payment failed - reservation not found.');
                }
            }
        } catch (error) {
            showToast('Failed to update payment: ' + (error.message || 'Unknown error'), 'danger');
        }
    };

    if (typeof showConfirm === 'function') {
        showConfirm('Mark this reservation as paid (cash)?', proceedCash);
        return;
    }

    if (!confirm('Mark this reservation as paid (cash)?')) return;
    await proceedCash();
}

// ===========================
// NOTIFICATION FUNCTIONS (copy from my-reservations.js)
// ===========================

function loadNotifications() {
    const user = getLoggedInUser();
    updateNotificationBadge(user.username);
}

function updateNotificationBadge(username) {
    const unreadCount = getUnreadNotificationsCount(username);
    const badge = document.getElementById("notificationBadge");
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

function toggleNotifications() {
    const panel = document.getElementById("notificationPanel");
    const user = getLoggedInUser();
    
    if (!panel.classList.contains('show')) {
        panel.classList.add('show');
        displayNotifications(user.username);
    } else {
        panel.classList.remove('show');
    }
}

function displayNotifications(username) {
    const panel = document.getElementById("notificationPanel");
    const notifications = getNotificationsByUser(username);
    
    if (notifications.length === 0) {
        panel.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #999;">
                <p>📭 No notifications yet</p>
            </div>
        `;
        return;
    }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    
    notifications.forEach(notif => {
        const bgColor = notif.type === 'approved' ? '#d4edda' : notif.type === 'rejected' ? '#f8d7da' : '#e7f3ff';
        const borderColor = notif.type === 'approved' ? '#28a745' : notif.type === 'rejected' ? '#dc3545' : '#2196F3';
        const readClass = notif.read ? 'opacity-50' : 'font-weight-bold';
        
        html += `
            <div style="padding: 12px 15px; border-left: 4px solid ${borderColor}; background: ${bgColor}; cursor: pointer; border-bottom: 1px solid #eee; transition: all 0.3s;" 
                 onmouseover="this.style.background='rgba(0,0,0,0.05)'" 
                 onmouseout="this.style.background='${bgColor}'"
                 onclick="markNotificationRead(${notif.id})">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1; ${readClass}">
                        <p style="margin: 0 0 5px 0; font-weight: bold; color: #333;">${notif.title}</p>
                        <p style="margin: 0 0 5px 0; color: #666; font-size: 13px;">${notif.message}</p>
                        <p style="margin: 0; font-size: 12px; color: #999;">${getTimeAgo(notif.createdAt)}</p>
                    </div>
                    ${!notif.read ? '<span style="display: inline-block; width: 8px; height: 8px; background: #2a5298; border-radius: 50%; margin-left: 10px; margin-top: 4px;"></span>' : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    panel.innerHTML = html;
}

function markNotificationRead(notificationId) {
    markNotificationAsRead(notificationId);
    const user = getLoggedInUser();
    updateNotificationBadge(user.username);
    displayNotifications(user.username);
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// close notification panel when clicking outside
document.addEventListener('click', function(event) {
    const panel = document.getElementById("notificationPanel");
    if (!panel) return;
    if (event.target.closest('#notificationToggleBtn') || event.target.closest('#notificationPanel')) return;
    panel.classList.remove('show');
});

function bindNotificationToggle() {
    const btn = document.getElementById('notificationToggleBtn');
    if (!btn) return;
    btn.addEventListener('click', toggleNotifications);
}
