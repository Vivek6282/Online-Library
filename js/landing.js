document.addEventListener('DOMContentLoaded', () => {
    const beginBtn = document.getElementById('begin-exploration');
    const decoTop = document.querySelector('.start-top');
    const decoBottom = document.querySelector('.start-bottom');
    const heroContent = document.querySelector('.hero-content');
    const navActions = document.getElementById('nav-actions');

    // --- GUEST RETURN LOGIC ---
    // Here we check if the person is a 'Guest' (meaning they didn't log in).
    // If they are a guest, we show a button that lets them go back to the login page.
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    if (navActions && (isGuest || !isLoggedIn)) {
        const loginBtn = document.createElement('a');
        loginBtn.href = 'login.html';
        loginBtn.className = 'nav-btn';
        loginBtn.style.borderColor = 'transparent';
        loginBtn.innerText = isGuest ? 'Return to Login' : 'Scholar Login';

        loginBtn.addEventListener('click', () => {
            localStorage.removeItem('isGuest'); // When they leave, forget their guest status
        });

        navActions.appendChild(loginBtn);
    }

    if (!beginBtn) return;

    // ─── CREATE THE TRANSITION CURTAIN ───────────────────────────────────────
    // This is an invisible black overlay that we slam down BEFORE navigating.
    // It covers the full screen so there is no white/blank flash when
    // library.html starts loading. The library's shutter-reveal then picks
    // up exactly where this curtain leaves off — seamless.
    const curtain = document.createElement('div');
    curtain.id = 'page-curtain';
    Object.assign(curtain.style, {
        position: 'fixed',
        inset: '0',
        background: '#12100e',      // same dark tone as the library body/shutter
        zIndex: '99999',
        opacity: '0',
        pointerEvents: 'none',
        transition: 'opacity 0.5s cubic-bezier(0.7, 0, 0.3, 1)',
    });
    document.body.appendChild(curtain);
    // ─────────────────────────────────────────────────────────────────────────

    // This logic handles what happens when you click 'Begin Exploration'
    beginBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Stop the page from changing instantly
        const targetUrl = beginBtn.getAttribute('href');

        // PHASE 1 (0 → 900ms): exit animations on index — statues slide out, text fades
        if (decoTop) decoTop.classList.add('is-exiting');
        if (decoBottom) decoBottom.classList.add('is-exiting');
        if (heroContent) heroContent.classList.add('is-exiting');

        // PHASE 2 (600ms): curtain fades in smoothly over everything.
        // This removes ANY white flash / frozen frame between the two pages.
        setTimeout(() => {
            curtain.style.pointerEvents = 'all'; // Block interaction while transitioning
            curtain.style.opacity = '1';
        }, 600);

        // PHASE 3 (1100ms): once the curtain is opaque, navigate.
        // library.html loads invisibly behind the curtain — no jank visible.
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 1100);
    });
});
