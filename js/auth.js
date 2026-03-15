let __sessionUserCache = null;
let __sessionUserCacheTs = 0;
const TAB_SESSION_KEY = 'brs_tab_session_id';
const CSRF_TOKEN_KEY = 'brs_csrf_token';

function generateTabSessionId() {
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(24);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }
    return `${Date.now()}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

function getTabSessionId() {
    try {
        return sessionStorage.getItem(TAB_SESSION_KEY) || '';
    } catch (e) {
        return '';
    }
}

function setTabSessionId(value) {
    const sessionId = String(value || '').trim();
    if (!sessionId) return;
    try {
        sessionStorage.setItem(TAB_SESSION_KEY, sessionId);
    } catch (e) {
        // ignore storage failures
    }
}

function ensureTabSessionId() {
    let sessionId = getTabSessionId();
    if (!sessionId) {
        sessionId = generateTabSessionId();
        setTabSessionId(sessionId);
    }
    return sessionId;
}

function getCsrfToken() {
    try {
        return sessionStorage.getItem(CSRF_TOKEN_KEY) || '';
    } catch (e) {
        return '';
    }
}

function setCsrfToken(value) {
    const token = String(value || '').trim();
    if (!token) return;
    try {
        sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    } catch (e) {
        // ignore storage failures
    }
}

function fetchSessionUserSync() {
    const now = Date.now();
    if (__sessionUserCache && (now - __sessionUserCacheTs) < 3000) {
        return __sessionUserCache;
    }

    try {
        const xhr = new XMLHttpRequest();
        const base = window.API_BASE_URL || '/barangay-reservation-system/api';
        xhr.open('GET', `${base}/auth/me`, false);
        xhr.withCredentials = true;
        const tabSessionId = ensureTabSessionId();
        if (tabSessionId) {
            xhr.setRequestHeader('X-Tab-Session', tabSessionId);
        }
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            xhr.setRequestHeader('X-CSRF-Token', csrfToken);
        }
        xhr.send();
        if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
            __sessionUserCache = JSON.parse(xhr.responseText);
            if (__sessionUserCache && __sessionUserCache.sessionId) {
                setTabSessionId(__sessionUserCache.sessionId);
            }
            if (__sessionUserCache && __sessionUserCache.csrfToken) {
                setCsrfToken(__sessionUserCache.csrfToken);
            }
            __sessionUserCacheTs = now;
            return __sessionUserCache;
        }
    } catch (e) {
        // ignore and return null
    }
    __sessionUserCache = null;
    __sessionUserCacheTs = now;
    return null;
}

// Check authentication
function checkAuth(requiredRole) {
    const user = getLoggedInUser();
    if (!user) {
        window.location.href = "index.php?v=20260303b";
        return false;
    }
    if (user.role !== 'admin' && user.role !== 'barangay_staff') {
        window.location.href = "index.php?v=20260303b";
        return false;
    }

    if (requiredRole && user.role !== requiredRole) {
        if (user.role === "admin") {
            window.location.href = "admin-dashboard.php?v=20260303b";
        } else if (user.role === "barangay_staff") {
            window.location.href = "barangay-staff-dashboard.php?v=20260303b";
        } else {
            window.location.href = "index.php?v=20260303b";
        }
        return false;
    }
    return true;
}

// Logout function
function logout() {
    showConfirm("Are you sure you want to logout?", function() {
        const redirect = () => { window.location.href = "index.php?v=20260303b"; };
        __sessionUserCache = null;
        __sessionUserCacheTs = 0;
        if (window.AuthService && typeof window.AuthService.logout === 'function') {
            window.AuthService.logout().finally(redirect);
            return;
        }
        if (window.api && typeof window.api.logout === 'function') {
            window.api.logout().finally(redirect);
            return;
        }
        redirect();
    });
}

// Reusable custom confirm/alert modal
function showDialog(options) {
    if (!options || !options.message) return;
    // prevent multiple dialogs
    if (document.getElementById('confirmModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'confirmModal';
    overlay.style.cssText = `position: fixed; inset: 0; background: rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:10001;`;

    const box = document.createElement('div');
    box.style.cssText = `background: #0f1720; color: #fff; padding: 22px; border-radius: 12px; width: 420px; max-width: 92%; box-shadow: 0 14px 40px rgba(2,6,23,0.6); font-family: inherit;`;

    const title = document.createElement('div');
    title.style.cssText = `font-weight:600; margin-bottom:8px; font-size:16px;`;
    title.textContent = options.title || 'Notice';

    const text = document.createElement('p');
    text.style.cssText = `color: #d1d5db; margin: 0 0 18px 0; font-size:14px;`;
    text.textContent = options.message;

    const actions = document.createElement('div');
    actions.style.cssText = `display:flex; gap:10px; justify-content:flex-end; margin-top:6px;`;

    const okBtn = document.createElement('button');
    okBtn.textContent = options.okText || 'OK';
    okBtn.style.cssText = `background:#e6eefc; color:#0b1220; border:none; padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600;`;

    let cancelBtn = null;
    if (options.showCancel) {
        cancelBtn = document.createElement('button');
        cancelBtn.textContent = options.cancelText || 'Cancel';
        cancelBtn.style.cssText = `background: transparent; color:#cbd5e1; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;`;
        actions.appendChild(cancelBtn);
    }
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

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            cleanup();
            if (typeof options.onCancel === 'function') options.onCancel();
        });
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                cleanup();
                if (typeof options.onCancel === 'function') options.onCancel();
            }
        });
    } else {
        overlay.addEventListener('click', function(e) { if (e.target === overlay) cleanup(); });
    }

    okBtn.addEventListener('click', function() {
        cleanup();
        if (typeof options.onOk === 'function') options.onOk();
    });
}

function showConfirm(message, onConfirm) {
    showDialog({
        title: 'Are you sure',
        message: message,
        showCancel: true,
        okText: 'OK',
        cancelText: 'Cancel',
        onOk: onConfirm
    });
}

function showAlert(message, onOk) {
    showDialog({
        title: 'Notice',
        message: message,
        showCancel: false,
        okText: 'OK',
        onOk: onOk
    });
}

// Get logged in user information
function getLoggedInUser() {
    return fetchSessionUserSync();
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



