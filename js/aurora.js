/**
 * aurora.js
 * ============================================================
 * Pinterest-inspired Aurora Borealis (Northern Lights) effect
 * for the login page background.
 *
 * How it works:
 *   - Multiple translucent ribbons of colour stretch across the
 *     screen horizontally.
 *   - Each ribbon is drawn with a Bézier curve whose control
 *     points oscillate on independent sine wave timers.
 *   - Ribbons gently cross, blend & breathe using globalAlpha.
 *   - The palette (deep purple, teal, warm gold, rose) fits
 *     beautifully over the existing dark academia background.
 *   - A subtle "global pulse" slowly brightens and dims the
 *     whole aurora, giving it a living, breathing quality.
 *
 * Canvas sits at z-index 0 — above the galaxy (-1) but behind
 * the dust motes (1) and all UI elements (2+).
 * ============================================================
 */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {

        // ── Canvas setup ──────────────────────────────────────────────
        const canvas = document.createElement('canvas');
        canvas.id = 'aurora-canvas';
        Object.assign(canvas.style, {
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: '0',          // Between galaxy (-1) and dust (1)
            mixBlendMode: 'screen', // Screened on top = glowy, never white-washes
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

        // ── Ribbon definitions ────────────────────────────────────────
        // Each ribbon has:
        //   baseY   — its vertical "home" position (fraction of H)
        //   colour  — RGBA base colour (keep alpha LOW for see-through)
        //   waves   — array of sine oscillators that push the ribbon around
        //   width   — how thick (in px) the stroke is
        //   speed   — overall time multiplier

        const ribbons = [
            {
                baseY: 0.22,
                colour: 'rgba(100, 60, 200, 0.13)', // deep violet
                width: 260,
                speed: 0.00045,
                waves: [
                    { amp: 0.09, freq: 1.1, phase: 0.0 },
                    { amp: 0.04, freq: 2.3, phase: 1.2 },
                ],
            },
            {
                baseY: 0.36,
                colour: 'rgba(40, 160, 160, 0.10)', // teal cyan
                width: 210,
                speed: 0.00038,
                waves: [
                    { amp: 0.08, freq: 0.9, phase: 2.5 },
                    { amp: 0.05, freq: 1.8, phase: 0.7 },
                ],
            },
            {
                baseY: 0.50,
                colour: 'rgba(190, 130, 60, 0.09)',  // warm gold
                width: 230,
                speed: 0.00033,
                waves: [
                    { amp: 0.10, freq: 1.3, phase: 4.2 },
                    { amp: 0.03, freq: 2.7, phase: 1.8 },
                ],
            },
            {
                baseY: 0.65,
                colour: 'rgba(180, 50, 120, 0.08)',  // rose magenta
                width: 190,
                speed: 0.00042,
                waves: [
                    { amp: 0.07, freq: 1.0, phase: 3.1 },
                    { amp: 0.06, freq: 2.1, phase: 0.3 },
                ],
            },
            {
                baseY: 0.14,
                colour: 'rgba(60, 80, 220, 0.09)',   // indigo blue
                width: 180,
                speed: 0.00030,
                waves: [
                    { amp: 0.06, freq: 0.8, phase: 5.5 },
                    { amp: 0.04, freq: 3.0, phase: 2.2 },
                ],
            },
            {
                baseY: 0.80,
                colour: 'rgba(80, 200, 130, 0.07)',  // emerald green (subtle)
                width: 170,
                speed: 0.00028,
                waves: [
                    { amp: 0.05, freq: 1.5, phase: 1.0 },
                    { amp: 0.03, freq: 2.5, phase: 3.5 },
                ],
            },
        ];

        // ── Global breathing pulse ────────────────────────────────────
        // Slowly ramps globalAlpha up and down so the aurora "breathes"
        let pulsePhase = 0;
        const PULSE_SPEED = 0.0006;

        // ── Draw one ribbon as a filled, semi-transparent band ─────────
        // We draw the ribbon as two offset Bézier curves that form a
        // ribbon shape (top edge + bottom edge), filled with a gradient.
        function drawRibbon(ribbon, t) {
            const STEPS = 120;          // How smooth the curve is
            const halfW = ribbon.width / 2;

            // Compute the Y displacement at any x position (0..1)
            function dysAt(xFrac) {
                let dy = 0;
                ribbon.waves.forEach((w) => {
                    dy += Math.sin(xFrac * Math.PI * 2 * w.freq + w.phase + t * ribbon.speed * 1000) * w.amp * H;
                });
                return dy;
            }

            // Build top-edge and bottom-edge arrays
            const topPts = [];
            const botPts = [];
            for (let i = 0; i <= STEPS; i++) {
                const xFrac = i / STEPS;
                const x = xFrac * W;
                const baseY = ribbon.baseY * H;
                const dy = dysAt(xFrac);
                topPts.push({ x, y: baseY + dy - halfW * 0.5 });
                botPts.push({ x, y: baseY + dy + halfW * 0.5 });
            }

            // Vertical gradient for this ribbon (bright centre, fade at edges)
            const midY = ribbon.baseY * H;
            const grad = ctx.createLinearGradient(0, midY - halfW, 0, midY + halfW);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.35, ribbon.colour);
            grad.addColorStop(0.5, ribbon.colour.replace(/[\d.]+\)$/, '0.22)')); // brighter core
            grad.addColorStop(0.65, ribbon.colour);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.beginPath();
            // Top edge: left → right
            ctx.moveTo(topPts[0].x, topPts[0].y);
            for (let i = 1; i < topPts.length; i++) {
                ctx.lineTo(topPts[i].x, topPts[i].y);
            }
            // Bottom edge: right → left (close the ribbon shape)
            for (let i = botPts.length - 1; i >= 0; i--) {
                ctx.lineTo(botPts[i].x, botPts[i].y);
            }
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // ── Animation loop ────────────────────────────────────────────
        function draw(timestamp) {
            ctx.clearRect(0, 0, W, H);

            // Global pulse: alpha oscillates between 0.6 and 1.0
            pulsePhase += PULSE_SPEED;
            const pulse = 0.72 + 0.28 * Math.sin(pulsePhase);
            ctx.globalAlpha = pulse;

            ribbons.forEach((r) => drawRibbon(r, timestamp));

            ctx.globalAlpha = 1; // Reset
            requestAnimationFrame(draw);
        }

        requestAnimationFrame(draw);
    });

})();
