// This script adds "Magical Effects" to the library page.
// It makes the cursor glow, adds ripples when you click, and makes book cards tilt.
/**
 * library-interactions.js
 * ============================================================
 * Premium visual effects for the Grand Archive (library.html):
 *
 *  1. GOLD INK RIPPLE  — A glowing ripple bursts from every click
 *                        anywhere on the page.
 *  2. CURSOR GLOW TRAIL — A warm golden halo orbits the cursor,
 *                         leaving a brief ghost trail as you move.
 *  3. BOOK CARD TILT    — Each book card tilts in 3D on hover,
 *                         like picking up a real book from a shelf.
 *  4. EXIT CURTAIN      — Clicking any nav link (back, logout, etc.)
 *                         triggers a smooth curtain drop before leaving.
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ─── 1. GOLD INK RIPPLE ON CLICK ─────────────────────────────────
     * Every click spawns a glowing gold ring that expands and fades out.
     * Inspired by luxury UI / Material Design "light" ripple variants.
     * ──────────────────────────────────────────────────────────────── */
    document.addEventListener('click', (e) => {
        const ripple = document.createElement('span');
        ripple.className = 'click-ripple';
        Object.assign(ripple.style, {
            left: `${e.clientX}px`,
            top: `${e.clientY}px`,
        });
        document.body.appendChild(ripple);
        // Clean up after animation ends
        ripple.addEventListener('animationend', () => ripple.remove());
    });


    /* ─── 2. CURSOR GLOW TRAIL ─────────────────────────────────────────
     * A soft gold ghost that lags behind the real cursor, creating a
     * "torch" feel — like a lantern illuminating the ancient archive.
     * ──────────────────────────────────────────────────────────────── */
    const trail = document.createElement('div');
    trail.id = 'cursor-trail';
    Object.assign(trail.style, {
        position: 'fixed',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(197,160,89,0.5) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: '99998',
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.12s ease-out, top 0.12s ease-out',
        filter: 'blur(3px)',
    });
    document.body.appendChild(trail);

    document.addEventListener('mousemove', (e) => {
        trail.style.left = `${e.clientX}px`;
        trail.style.top = `${e.clientY}px`;
    });


    /* ─── 3. BOOK CARD 3D TILT ─────────────────────────────────────────
     * This makes each book card tilt slightly based on where your mouse is.
     * We use a "MutationObserver" (a JavaScript tool that watches for HTML changes)
     * because books are loaded dynamically from a JSON database, so we need
     * to attach the mouse tracking *after* they appear on the page.
     * ──────────────────────────────────────────────────────────────── */

    // We attach this to existing cards AND re-run for dynamically added ones
    function applyCardTilt() {
        document.querySelectorAll('.book-card-archival, .card').forEach((card) => {
            if (card.dataset.tiltBound) return; // Avoid binding twice
            card.dataset.tiltBound = 'true';

            card.style.transition = 'transform 0.2s ease, box-shadow 0.3s ease';
            card.style.transformStyle = 'preserve-3d';
            card.style.willChange = 'transform';

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = (e.clientX - cx) / (rect.width / 2);
                const dy = (e.clientY - cy) / (rect.height / 2);

                card.style.transform = `
          perspective(700px)
          rotateY(${dx * 10}deg)
          rotateX(${-dy * 10}deg)
          scale(1.04)
        `;
                card.style.boxShadow = `
          ${-dx * 10}px ${dy * 10}px 30px rgba(197,160,89,0.25),
          0 20px 40px rgba(0,0,0,0.6)
        `;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.boxShadow = '';
            });
        });
    }

    // Run now, and again after any DOM mutation (book cards are rendered by JS)
    applyCardTilt();

    // MutationObserver watches the document body. If new books are added
    // by the search or pagination scripts, it immediately runs applyCardTilt() again.
    const observer = new MutationObserver(applyCardTilt);
    observer.observe(document.body, { childList: true, subtree: true });


    /* ─── 4. EXIT CURTAIN ON NAVIGATION ────────────────────────────────
     * Any outgoing link (Return to Menu, auth button) triggers a dark
     * curtain that slides DOWN before the browser navigates away —
     * the reverse of the shutter lifting on entry.
     * ──────────────────────────────────────────────────────────────── */
    const exitCurtain = document.createElement('div');
    exitCurtain.id = 'exit-curtain';
    Object.assign(exitCurtain.style, {
        position: 'fixed',
        inset: '0',
        background: '#12100e',
        zIndex: '99999',
        opacity: '0',
        pointerEvents: 'none',
        transition: 'opacity 0.55s cubic-bezier(0.7, 0, 0.3, 1)',
    });
    document.body.appendChild(exitCurtain);

    function doExitTransition(url) {
        exitCurtain.style.pointerEvents = 'all';
        exitCurtain.style.opacity = '1';
        setTimeout(() => {
            window.location.href = url;
        }, 580);
    }

    // Intercept the "Return to The Menu" link
    const backLink = document.querySelector('.back-link-archival');
    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            doExitTransition(backLink.getAttribute('href'));
        });
    }

    // Intercept the auth/logout button if it has an href or navigates
    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
        authBtn.addEventListener('click', (e) => {
            const href = authBtn.dataset.href || authBtn.getAttribute('href');
            if (href) {
                e.preventDefault();
                doExitTransition(href);
            }
        });
    }

});
