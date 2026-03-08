/**
 * galaxy.js
 * ============================================================
 * "Deep Space" — Multiple galaxies visible at once, like looking
 * through a telescope at the cosmos. Each galaxy rotates at its
 * own speed, sits at its own position, and has a unique tilt.
 *
 * Galaxy types rendered:
 *   - Spiral galaxies  (logarithmic arm equations)
 *   - Elliptical blobs (dense core, no arms)
 *   - Lenticular discs (flat band of stars)
 *
 * Additional atmosphere:
 *   - 300 twinkling background stars
 *   - Occasional shooting stars
 *   - Slow drift of the whole starfield (feels like floating)
 *   - Mouse parallax: starfield shifts slightly with cursor
 * ============================================================
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {

        // ── IMPORTANT FACTOR: HTML Canvas ────────────────────────────
        // The <canvas> element is like a blank digital painting board.
        // Instead of making 1,000 separate HTML <div> tags for stars (which 
        // would crash the browser), we tell the canvas to draw 1,000 dots
        // really fast. This is how high-end web games and visual effects work!
        // ─────────────────────────────────────────────────────────────
        const canvas = document.createElement('canvas');
        canvas.id = 'galaxy-canvas';
        Object.assign(canvas.style, {
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '-1',
            opacity: '1', // Increased from 0.88 to make the background more prominent
        });
        document.body.insertBefore(canvas, document.body.firstChild);
        const ctx = canvas.getContext('2d');

        let W, H;
        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        // ── Mouse parallax ───────────────────────────────────────────
        let mx = 0, my = 0, tmx = 0, tmy = 0;
        document.addEventListener('mousemove', (e) => {
            tmx = ((e.clientX / window.innerWidth) - 0.5) * 30;
            tmy = ((e.clientY / window.innerHeight) - 0.5) * 30;
        });

        // ── Galaxy definitions ───────────────────────────────────────
        // Each galaxy is centred at (cx, cy) as a fraction of (W, H).
        // 'type' can be 'spiral', 'elliptical', or 'lenticular'.
        const galaxyDefs = [
            // Large central spiral — main focal galaxy
            {
                type: 'spiral',
                cx: 0.50, cy: 0.50,
                scale: 0.30,
                arms: 3,
                particles: 650,
                rotSpeed: 0.00015,
                rot: 0,
                tilt: 0.0,
                colours: ['rgba(210,170,100,{a})', 'rgba(140,110,200,{a})', 'rgba(80,160,200,{a})'],
                coreColour: 'rgba(255,235,180,{a})',
            },
            // Small spiral upper-right
            {
                type: 'spiral',
                cx: 0.82, cy: 0.14,
                scale: 0.10,
                arms: 2,
                particles: 220,
                rotSpeed: 0.00028,
                rot: 1.2,
                tilt: 0.55,
                colours: ['rgba(180,130,80,{a})', 'rgba(100,80,190,{a})'],
                coreColour: 'rgba(255,220,160,{a})',
            },
            // Elliptical galaxy lower-left
            {
                type: 'elliptical',
                cx: 0.12, cy: 0.78,
                scale: 0.09,
                particles: 300,
                rotSpeed: 0.00010,
                rot: 0.4,
                colours: ['rgba(200,180,140,{a})'],
                coreColour: 'rgba(255,245,220,{a})',
            },
            // Lenticular disc upper-left
            {
                type: 'lenticular',
                cx: 0.15, cy: 0.20,
                scale: 0.08,
                particles: 200,
                rotSpeed: 0.00020,
                rot: 0.8,
                tilt: 0.3,
                colours: ['rgba(160,200,220,{a})', 'rgba(200,180,130,{a})'],
                coreColour: 'rgba(240,235,220,{a})',
            },
            // Tiny distant spiral lower-right
            {
                type: 'spiral',
                cx: 0.88, cy: 0.80,
                scale: 0.065,
                arms: 2,
                particles: 150,
                rotSpeed: 0.00035,
                rot: 2.5,
                tilt: 0.7,
                colours: ['rgba(190,140,90,{a})', 'rgba(120,90,200,{a})'],
                coreColour: 'rgba(255,225,170,{a})',
            },
            // Tiny elliptical mid-right
            {
                type: 'elliptical',
                cx: 0.78, cy: 0.50,
                scale: 0.045,
                particles: 120,
                rotSpeed: 0.00012,
                rot: 1.8,
                colours: ['rgba(210,190,150,{a})'],
                coreColour: 'rgba(255,245,215,{a})',
            },
        ];

        // Pre-build static particle lists for each galaxy
        const galaxies = galaxyDefs.map(def => ({
            ...def,
            pts: buildGalaxy(def),
        }));

        function rgba(template, alpha) {
            return template.replace('{a}', alpha.toFixed(3));
        }

        function buildGalaxy(def) {
            const pts = [];
            const N = def.particles;
            const S = def.scale;

            if (def.type === 'spiral') {
                const arms = def.arms || 2;
                for (let arm = 0; arm < arms; arm++) {
                    const armOff = (arm / arms) * Math.PI * 2;
                    for (let i = 0; i < N / arms; i++) {
                        const t = i / (N / arms);
                        const theta = t * Math.PI * 4 + armOff;
                        const r = Math.pow(t, 0.55) * S;
                        const scatter = (1 - t) * 0.018 + t * 0.04;
                        const sa = Math.random() * Math.PI * 2;
                        const sr = Math.random() * scatter;
                        const x = Math.cos(theta) * r + Math.cos(sa) * sr;
                        const y = Math.sin(theta) * r + Math.sin(sa) * sr;
                        const ci = Math.floor(Math.random() * def.colours.length);
                        // Increased base opacity by around 30% for better visibility
                        const baseAlpha = (Math.random() * 0.4 + 0.15) * (1 - t * 0.4);
                        pts.push({
                            x, y, r: Math.random() * 1.5 + 0.3, colour: def.colours[ci], baseAlpha,
                            tw: Math.random() * Math.PI * 2, ts: Math.random() * 0.012 + 0.003
                        });
                    }
                }
                // Dense core
                for (let i = 0; i < 60; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const d = Math.random() * S * 0.08;
                    pts.push({
                        x: Math.cos(a) * d, y: Math.sin(a) * d, r: Math.random() * 2 + 0.5,
                        // Significantly increased core opacity
                        colour: def.coreColour, baseAlpha: Math.random() * 0.6 + 0.3,
                        tw: Math.random() * Math.PI * 2, ts: Math.random() * 0.015 + 0.004
                    });
                }
            } else if (def.type === 'elliptical') {
                for (let i = 0; i < N; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const d = Math.pow(Math.random(), 0.5) * S;
                    const ex = 1.6; // ellipse x stretch
                    const ey = 1.0;
                    pts.push({
                        x: Math.cos(a) * d * ex, y: Math.sin(a) * d * ey,
                        r: Math.random() * 1.0 + 0.3, colour: def.colours[0] || def.coreColour,
                        // Increased base opacity
                        baseAlpha: (Math.random() * 0.45 + 0.15) * (1 - d / S * 0.5),
                        tw: Math.random() * Math.PI * 2, ts: Math.random() * 0.010 + 0.002
                    });
                }
            } else if (def.type === 'lenticular') {
                for (let i = 0; i < N; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const d = Math.pow(Math.random(), 0.6) * S;
                    const ey = 0.25; // very flat disc
                    const ci = Math.floor(Math.random() * def.colours.length);
                    pts.push({
                        x: Math.cos(a) * d, y: Math.sin(a) * d * ey,
                        r: Math.random() * 0.9 + 0.2, colour: def.colours[ci],
                        // Increased base opacity
                        baseAlpha: (Math.random() * 0.4 + 0.1) * (1 - d / S * 0.4),
                        tw: Math.random() * Math.PI * 2, ts: Math.random() * 0.008 + 0.002
                    });
                }
            }
            return pts;
        }

        // ── Background star field ─────────────────────────────────────
        const STAR_COUNT = 300;
        const stars = Array.from({ length: STAR_COUNT }, () => ({
            x: Math.random(), y: Math.random(),
            r: Math.random() * 1.2 + 0.3, // Slightly larger background stars
            alpha: Math.random() * 0.6 + 0.2, // Increased minimum and max opacity
            tw: Math.random() * Math.PI * 2,
            ts: Math.random() * 0.015 + 0.004,
        }));

        // ── Shooting stars ────────────────────────────────────────────
        let shooters = [];
        function spawnShooter() {
            if (shooters.length < 2 && Math.random() < 0.004) {
                shooters.push({
                    x: Math.random() * W, y: Math.random() * H * 0.45,
                    dx: 6 + Math.random() * 6, dy: 3 + Math.random() * 3,
                    len: 70 + Math.random() * 100,
                    life: 1, decay: 0.022 + Math.random() * 0.015,
                });
            }
        }

        // ── Draw loop ─────────────────────────────────────────────────
        function draw(ts) {
            ctx.clearRect(0, 0, W, H);

            // Smooth parallax
            mx += (tmx - mx) * 0.05;
            my += (tmy - my) * 0.05;

            // ─ Background stars ─
            stars.forEach((s) => {
                s.tw += s.ts;
                const a = s.alpha * (0.55 + 0.45 * Math.sin(s.tw));
                ctx.beginPath();
                ctx.arc(s.x * W + mx * 0.2, s.y * H + my * 0.2, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,245,220,${a})`;
                ctx.fill();
            });

            // ─ Galaxies ─
            galaxies.forEach((g) => {
                g.rot += g.rotSpeed;
                const gx = g.cx * W + mx;
                const gy = g.cy * H + my;

                ctx.save();
                ctx.translate(gx, gy);
                ctx.rotate(g.rot);
                if (g.tilt) ctx.scale(1, 1 - g.tilt * 0.7); // perspective tilt

                g.pts.forEach((p) => {
                    p.tw += p.ts;
                    const pulse = 0.7 + 0.3 * Math.sin(p.tw);
                    const a = p.baseAlpha * pulse;
                    ctx.beginPath();
                    ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = rgba(p.colour, a);
                    ctx.fill();
                });

                ctx.restore();
            });

            // ─ Shooting stars ─
            spawnShooter();
            shooters = shooters.filter(s => s.life > 0);
            shooters.forEach((s) => {
                ctx.save();
                ctx.globalAlpha = s.life * 0.8;
                const g2 = ctx.createLinearGradient(s.x, s.y, s.x - s.dx * s.len / 8, s.y - s.dy * s.len / 8);
                g2.addColorStop(0, 'rgba(255,240,200,0.9)');
                g2.addColorStop(1, 'rgba(255,240,200,0)');
                ctx.strokeStyle = g2;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x - s.dx * s.len / 8, s.y - s.dy * s.len / 8);
                ctx.stroke();
                ctx.restore();
                s.x += s.dx; s.y += s.dy; s.life -= s.decay;
            });

            requestAnimationFrame(draw);
        }

        requestAnimationFrame(draw);
    });

})();
