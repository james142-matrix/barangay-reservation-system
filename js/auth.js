// Check authentication
function checkAuth(requiredRole) {
    const userRole = localStorage.getItem("role");
    const loggedInUser = localStorage.getItem("loggedInUser");

    if (!userRole || !loggedInUser) {
        window.location.href = "index.html";
        return;
    }

    if (requiredRole && userRole !== requiredRole) {
        if (userRole === "admin") {
            window.location.href = "admin-dashboard.html";
        } else if (userRole === "barangay_staff") {
            window.location.href = "barangay-staff-dashboard.html";
        } else {
            window.location.href = "resident-dashboard.html";
        }
    }
}

// Logout function
function logout() {
    showConfirm("Are you sure you want to logout?", function() {
        localStorage.removeItem("role");
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("loginTime");
        window.location.href = "index.html";
    });
}

// Reusable custom confirm modal
function showConfirm(message, onConfirm) {
    // prevent multiple modals
    if (document.getElementById('confirmModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'confirmModal';
    overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:10001;`;

    const box = document.createElement('div');
    box.style.cssText = `background: #0f1720; color: #fff; padding: 22px; border-radius: 12px; width: 420px; max-width: 92%; box-shadow: 0 14px 40px rgba(2,6,23,0.6); font-family: inherit;`;

    const title = document.createElement('div');
    title.style.cssText = `font-weight:600; margin-bottom:8px; font-size:16px;`;
    title.textContent = 'Are you sure';

    const text = document.createElement('p');
    text.style.cssText = `color: #d1d5db; margin: 0 0 18px 0; font-size:14px;`;
    text.textContent = message;

    const actions = document.createElement('div');
    actions.style.cssText = `display:flex; gap:10px; justify-content:flex-end; margin-top:6px;`;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `background: transparent; color:#cbd5e1; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;`;

    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = `background:#e6eefc; color:#0b1220; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600;`;

    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);

    box.appendChild(title);
    box.appendChild(text);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function cleanup() {
        const el = document.getElementById('confirmModal');
        if (el) el.remove();
    }

    cancelBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) cleanup(); });
    okBtn.addEventListener('click', function() { cleanup(); if (typeof onConfirm === 'function') onConfirm(); });
}

// Get logged in user information
function getLoggedInUser() {
    const username = localStorage.getItem("loggedInUser");
    const role = localStorage.getItem("role");

    if (role === "admin") {
        return {
            username: "admin",
            fullname: "Administrator",
            role: "admin"
        };
    }

    if (username && (role === "resident" || role === "barangay_staff")) {
        return getUserByUsername(username) || {
            username: username,
            fullname: "User",
            role: role
        };
    }

    return null;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// Format date only (without time) for notifications - with full year
function formatDateOnly(dateString) {
    const date = new Date(dateString);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
}
// Show toast notification
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `alert alert-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 9999;
        min-width: 300px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}
