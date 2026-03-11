/**
 * landing.js
 * This script runs only on the home page (index.html).
 * It handles the top buttons, the statues sliding out, and the smooth transition to the library.
 */
document.addEventListener('DOMContentLoaded', () => {
    // We select the main parts of the page so we can move them later
    const beginBtn = document.getElementById('begin-exploration');
    const decoTop = document.querySelector('.start-top');
    const decoBottom = document.querySelector('.start-bottom');
    const heroContent = document.querySelector('.hero-content');

    // These lines check if you are logged in using the data saved in your browser (LocalStorage)
    const isGuest = localStorage.getItem('isGuest') === 'true';
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    /**
     * Function: updateLandingAuth
     * Purpose: Changes the top-right buttons based on if you are logged in or not.
     */
    function updateLandingAuth() {
        const authLink = document.getElementById('auth-link-landing');
        const logoutBtn = document.getElementById('logout-btn-landing');
        
        if (isLoggedIn) {
            // If you are logged in, we hide the "Login" button and show the red "Logout" button
            if (authLink) authLink.style.display = 'none';
            if (logoutBtn) {
                logoutBtn.style.display = 'inline-block';
                // When you click logout, we clear all saved data and refresh the page
                logoutBtn.onclick = () => {
                    localStorage.clear();
                    window.location.reload();
                };
            }
        } else {
            // If you are NOT logged in, we hide Logout and show the "Scholar Login" button
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (authLink) {
                authLink.style.display = 'inline-block';
                // If you were browsing as a guest, we change the text to "Return to Login"
                authLink.innerText = isGuest ? 'Return to Login' : 'Scholar Login';
                authLink.href = 'login.html';
                // If you click it, we make sure you're no longer considered a guest
                authLink.onclick = () => {
                    localStorage.removeItem('isGuest');
                };
            }
        }
    }
    
    // We run the button check immediately when the page opens
    updateLandingAuth();

    // If the "Begin Exploration" button is missing for some reason, we stop here.
    if (!beginBtn) return;

    // ─── THE TRANSITION CURTAIN ──────────────────────────────────────────────
    // This is an invisible black "blanket" that covers the whole screen.
    // We use it to hide the "blink" or "flash" when moving from this page to the library.
    const curtain = document.createElement('div');
    curtain.id = 'page-curtain';
    Object.assign(curtain.style, {
        position: 'fixed',
        inset: '0',
        background: '#12100e',      // Same dark color as the backgrounds
        zIndex: '99999',
        opacity: '0',
        pointerEvents: 'none',
        transition: 'opacity 0.5s cubic-bezier(0.7, 0, 0.3, 1)',
    });
    document.body.appendChild(curtain);
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * "Begin Exploration" Click Handler
     * Purpose: Makes the statues fly away and fades the screen into the library.
     */
    beginBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Don't let the page change immediately
        const targetUrl = beginBtn.getAttribute('href');

        // STEP 1: Tell the statues and text to start their "Exit" animations (defined in CSS)
        if (decoTop) decoTop.classList.add('is-exiting');
        if (decoBottom) decoBottom.classList.add('is-exiting');
        if (heroContent) heroContent.classList.add('is-exiting');

        // STEP 2: After a split second (600ms), make the black curtain fade in
        setTimeout(() => {
            curtain.style.pointerEvents = 'all'; 
            curtain.style.opacity = '1';
        }, 600);

        // STEP 3: Wait a bit more (1.1 seconds total), then actually go to the library page.
        // It will look perfectly smooth because the new page also starts with a reveal!
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 1100);
    });
});
