// Simple responsive behavior: add a menu toggle and handle sidebar/nav on small screens
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Add menu toggle button if not present
    if (!document.querySelector('.menu-toggle')) {
        const btn = document.createElement('button');
        btn.className = 'menu-toggle';
        btn.setAttribute('aria-label', 'Toggle menu');
        btn.innerHTML = '☰';
        // insert before nav-links for easier access
        navbar.insertBefore(btn, navbar.firstChild);

        const navLinks = document.querySelector('.nav-links');
        const sidebar = document.querySelector('.sidebar');

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (navLinks) navLinks.classList.toggle('show');
            // also toggle sidebar on mobile if exists
            if (sidebar) sidebar.classList.toggle('show');
        });

        // Close menus when clicking outside
        document.addEventListener('click', function(ev) {
            if (navLinks && navLinks.classList.contains('show')) {
                if (!navbar.contains(ev.target) && !(sidebar && sidebar.contains(ev.target))) {
                    navLinks.classList.remove('show');
                }
            }
        });

        // Close on escape
        document.addEventListener('keydown', function(ev) {
            if (ev.key === 'Escape') {
                if (navLinks) navLinks.classList.remove('show');
                if (sidebar) sidebar.classList.remove('show');
            }
        });
    }
});
