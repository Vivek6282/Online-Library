document.addEventListener('DOMContentLoaded', () => {
    const collage = document.getElementById('interactiveLoginBg');
    if (!collage) return;

    // Desktop mouse movement disabled — background images stay fixed.
    // Only mobile gets a gentle float animation.

    // Mobile touch interaction: subtle float since mouse is absent
    if ('ontouchstart' in window) {
        let angle = 0;
        function animateMobile() {
            angle += 0.02;
            const x = Math.sin(angle) * 10;
            const y = Math.cos(angle) * 10;
            collage.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
            requestAnimationFrame(animateMobile);
        }
        animateMobile();
    }
});
