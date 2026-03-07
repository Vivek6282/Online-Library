document.addEventListener('DOMContentLoaded', () => {
    const collage = document.getElementById('interactiveLoginBg');
    if (!collage) return;

    // Subtle parallax effect on mouse move
    document.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.pageX) / 40;
        const y = (window.innerHeight / 2 - e.pageY) / 40;

        // Applying a slight smooth transition for fluidity
        collage.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
    });

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
