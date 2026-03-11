// This script creates the "Atmosphere" on the login page.
// It adds floating dust particles and makes the background glow where your mouse is.
/**
 * login-atmosphere.js
 * =====================================================================
 * Three premium visual effects for the login page, inspired by high-end
 * Pinterest and Awwwards designs.
 *
 *  1. MOUSE GLOW  — A warm gold spotlight that follows your cursor,
 *                   glowing through the glassmorphism card.
 *  2. DUST MOTES  — Tiny floating particles on a canvas, like old
 *                   library dust drifting in shaft of light.
 *  3. MAGNETIC BTN — The login button subtly pulls toward the cursor
 *                    when hovered, giving a tactile, premium feel.
 * =====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ─────────────────────────────────────────────────────────────────
     *  0. GOLD SHIMMER SWEEP
     *     A one-time flash of light across the login card, right after
     *     the 3D entrance animation finishes landing.
     *     Inspired by premium credit card and luxury brand animations.
     * ───────────────────────────────────────────────────────────────── */

    const loginCard = document.querySelector('.login-card');
    if (loginCard) {
        const shimmer = document.createElement('div');
        shimmer.className = 'shimmer-sweep';
        loginCard.appendChild(shimmer);

        // Remove the shimmer element after it plays so it doesn't sit in the DOM
        shimmer.addEventListener('animationend', () => shimmer.remove());
    }

    /* ─────────────────────────────────────────────────────────────────
     *  1. MOUSE GLOW SPOTLIGHT
     *     A radial gradient "torch beam" that follows the mouse.
     *     It sits BEHIND the card but in front of the dark background,
     *     creating a sense of a lantern illuminating an old archive.
     * ───────────────────────────────────────────────────────────────── */

    const glow = document.createElement('div');
    glow.id = 'mouse-glow';
    // Style the glow element — it's an absolutely-positioned overlay
    Object.assign(glow.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',   // Never block clicks
        zIndex: 0,               // Behind the card (card is z-index: 10+)
        transition: 'opacity 0.6s ease',
        opacity: '0',
    });
    document.body.appendChild(glow);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    // Track the mouse position globally
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        glow.style.opacity = '1'; // Only show when mouse is inside the page

        // Update the glow position using CSS variables for silky smoothness
        glow.style.background = `
      radial-gradient(
        600px circle at ${mouseX}px ${mouseY}px,
        rgba(197, 160, 89, 0.12),
        rgba(197, 160, 89, 0.04) 30%,
        transparent 70%
      )
    `;
    });

    // Fade out glow when cursor leaves the window
    document.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
    });


    /* ─────────────────────────────────────────────────────────────────
     *  2. FLOATING DUST MOTES (Canvas)
     *     Inspired by old library aesthetics — tiny golden particles
     *     drift lazily across the screen like dust in archive shafts.
     * ───────────────────────────────────────────────────────────────── */

    const canvas = document.createElement('canvas');
    canvas.id = 'dust-canvas';
    Object.assign(canvas.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,            // Just above the glow, below the page content
        opacity: '0.7',
    });
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    // Make canvas match window size at all times
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // --- Particle configuration ---
    const PARTICLE_COUNT = 55;
    const particles = [];

    // Each mote has its own size, speed, opacity, and wobble
    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.8 + 0.4,     // Very tiny
            speedY: -(Math.random() * 0.3 + 0.08), // Drifts slowly upward
            speedX: (Math.random() - 0.5) * 0.15,  // Slight horizontal drift
            opacity: Math.random() * 0.5 + 0.1,    // Semi-transparent
            wobble: Math.random() * Math.PI * 2,   // Starting wobble phase
            wobbleSpeed: Math.random() * 0.006 + 0.002,
        };
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
    }

    // Animation loop — runs every frame
    function animateDust() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
            // Move the particle
            p.wobble += p.wobbleSpeed;
            p.x += p.speedX + Math.sin(p.wobble) * 0.25; // Gentle horizontal sway
            p.y += p.speedY;

            // Wrap particles back to bottom when they float off the top
            if (p.y < -5) {
                p.y = canvas.height + 5;
                p.x = Math.random() * canvas.width;
            }

            // Draw a soft glowing circle for each mote
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(197, 160, 89, ${p.opacity})`;
            ctx.shadowColor = 'rgba(197, 160, 89, 0.5)';
            ctx.shadowBlur = 4;
            ctx.fill();
        });

        requestAnimationFrame(animateDust);
    }

    animateDust();


    /* ─────────────────────────────────────────────────────────────────
     *  3. MAGNETIC LOGIN BUTTON
     *     The login button "pulls" toward the cursor when the mouse is
     *     within a radius, then snaps back on release — inspired by
     *     high-end Awwwards/Dribbble portfolio interactions.
     * ───────────────────────────────────────────────────────────────── */

    const loginBtn = document.getElementById('login-button');
    if (loginBtn) {
        const ATTRACTION_RADIUS = 90; // px — how close the mouse needs to be
        const PULL_STRENGTH = 0.38;   // 0–1 — how strongly the button pulls

        document.addEventListener('mousemove', (e) => {
            const rect = loginBtn.getBoundingClientRect();
            const btnCenterX = rect.left + rect.width / 2;
            const btnCenterY = rect.top + rect.height / 2;

            const dx = e.clientX - btnCenterX;
            const dy = e.clientY - btnCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ATTRACTION_RADIUS) {
                // Inside the magnetic field — pull toward cursor
                const pullX = dx * PULL_STRENGTH;
                const pullY = dy * PULL_STRENGTH;
                loginBtn.style.transform = `translate(${pullX}px, ${pullY}px) scale(1.04)`;
                loginBtn.style.boxShadow = '0 12px 35px rgba(197, 160, 89, 0.35)';
                loginBtn.style.transition = 'transform 0.15s ease, box-shadow 0.3s ease';
            } else {
                // Outside — snap back to original position
                loginBtn.style.transform = '';
                loginBtn.style.boxShadow = '';
                loginBtn.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.5s ease';
            }
        });

        // Always reset when mouse leaves the whole window
        document.addEventListener('mouseleave', () => {
            loginBtn.style.transform = '';
            loginBtn.style.boxShadow = '';
        });
    }

});
