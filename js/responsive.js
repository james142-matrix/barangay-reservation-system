// Simple responsive behavior: add a menu toggle and handle sidebar/nav on small screens
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    const sidebar = document.querySelector('.sidebar');
    const navLinks = document.querySelector('.nav-links');
    const mainContent = document.querySelector('.main-content');
    const mobileQuery = window.matchMedia('(max-width: 768px)');

    // Add menu toggle button if not present
    let btn = document.querySelector('.menu-toggle');
    if (!btn) {
        btn = document.createElement('button');
        btn.className = 'menu-toggle';
        btn.setAttribute('aria-label', 'Toggle menu');
        btn.innerHTML = '☰';
        navbar.insertBefore(btn, navbar.firstChild);
    }

    function isMobile() {
        return !!mobileQuery.matches;
    }

    function applyResponsiveState() {
        if (!isMobile()) {
            if (sidebar) {
                sidebar.classList.remove('show');
                sidebar.style.transform = '';
            }
            if (mainContent) {
                mainContent.style.marginLeft = '';
                mainContent.style.width = '';
                mainContent.style.maxWidth = '';
            }
            if (btn) btn.style.display = 'none';
            return;
        }

        if (btn) btn.style.display = 'inline-flex';
        if (mainContent) {
            mainContent.style.marginLeft = '0';
            mainContent.style.width = '100%';
            mainContent.style.maxWidth = '100%';
        }
        if (sidebar && !sidebar.classList.contains('show')) {
            sidebar.style.transform = 'translateX(-100%)';
        }
    }

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (navLinks) navLinks.classList.toggle('show');
        if (sidebar) {
            sidebar.classList.toggle('show');
            if (isMobile()) {
                sidebar.style.transform = sidebar.classList.contains('show') ? 'translateX(0)' : 'translateX(-100%)';
            }
        }
    });

    // Close menus when clicking outside
    document.addEventListener('click', function(ev) {
        if (navLinks && navLinks.classList.contains('show')) {
            if (!navbar.contains(ev.target) && !(sidebar && sidebar.contains(ev.target))) {
                navLinks.classList.remove('show');
            }
        }
        if (sidebar && sidebar.classList.contains('show') && isMobile()) {
            if (!navbar.contains(ev.target) && !sidebar.contains(ev.target)) {
                sidebar.classList.remove('show');
                sidebar.style.transform = 'translateX(-100%)';
            }
        }
    });

    // Close on escape
    document.addEventListener('keydown', function(ev) {
        if (ev.key === 'Escape') {
            if (navLinks) navLinks.classList.remove('show');
            if (sidebar) {
                sidebar.classList.remove('show');
                if (isMobile()) sidebar.style.transform = 'translateX(-100%)';
            }
        }
    });

    // Close sidebar after tapping any sidebar link on mobile.
    if (sidebar) {
        sidebar.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                if (!isMobile()) return;
                sidebar.classList.remove('show');
                sidebar.style.transform = 'translateX(-100%)';
                if (navLinks) navLinks.classList.remove('show');
            });
        });
    }

    if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', applyResponsiveState);
    } else if (typeof mobileQuery.addListener === 'function') {
        mobileQuery.addListener(applyResponsiveState);
    }
    window.addEventListener('resize', applyResponsiveState);
    applyResponsiveState();
});
