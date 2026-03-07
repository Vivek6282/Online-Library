// slider.js
// Handles the full-screen background slider for book images.
// The goal is to automatically use images dropped into /images/books/
// without having to touch HTML. Because front‑end JavaScript in the browser
// cannot list files in a directory directly, this script assumes a simple
// naming convention: book1.jpg, book2.jpg, book3.jpg, ... and will keep
// probing for the next number until an image fails to load. This means
// you can add book4.jpg, book5.jpg, etc. later and they will be picked up
// on the next page load without further code changes.

(() => {
  "use strict";

  // -------------------------------
  // Configuration (easy to tweak)
  // -------------------------------

  const basePath = "images/books/"; // Folder containing the book images
  const baseName = "book"; // File name prefix (e.g., "book1.jpg")
  const extension = ".jpg"; // File extension for images
  const maxProbeCount = 30; // Safety ceiling so we do not loop forever
  const slideIntervalMs = 4000; // Time each image stays visible (4 seconds)

  // -------------------------------
  // Internal state
  // -------------------------------

  /** @type {string[]} */
  const imageUrls = []; // Will hold successfully discovered image URLs
  let currentIndex = 0; // Which image is currently visible
  let intervalId = null; // Stores interval so we could clear it later if needed

  // DOM references (queried once for performance)
  const frameEl = document.querySelector("[data-slider-frame]");

  // If there is no frame element, we bail out quietly to avoid JS errors.
  if (!frameEl) return;

  // ----------------------------------------
  // Helper: Preload a single image by URL
  // ----------------------------------------

  /**
   * Preloads an image and resolves to true on success or false on failure.
   * This allows us to probe images that follow the naming convention and
   * stop once we hit the first missing file.
   */
  function preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.loading = "lazy"; // Hint to browser for performance
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  // -------------------------------------------------------
  // Discover all available book images that follow pattern
  // -------------------------------------------------------

  async function discoverImages() {
    // We optimistically assume book1.jpg exists and keep probing.
    for (let i = 1; i <= maxProbeCount; i += 1) {
      const url = `${basePath}${baseName}${i}${extension}`;
      // eslint-disable-next-line no-await-in-loop -- sequential probing is fine here
      const exists = await preloadImage(url);
      if (!exists) {
        // As soon as one file in the sequence is missing, we assume
        // there are no more and break to avoid unnecessary requests.
        break;
      }
      imageUrls.push(url);
    }
  }

  // ---------------------------------------------
  // Render: apply background for current image
  // ---------------------------------------------

  function showCurrentImage() {
    if (!imageUrls.length) return;

    const url = imageUrls[currentIndex];
    // We update the CSS background-image property instead of using <img>
    // so the image fills the viewport and integrates with our blur/overlay.
    frameEl.style.backgroundImage = `url("${url}")`;

    // Add a class that toggles opacity to create a smooth fade transition.
    frameEl.classList.add("is-visible");
  }

  // ---------------------------------------------
  // Advance to next image with wrapping behavior
  // ---------------------------------------------

  function goToNextImage() {
    if (!imageUrls.length) return;

    // Temporarily hide the frame so the CSS transition can fade it in again.
    frameEl.classList.remove("is-visible");

    // Wait for a brief moment before changing the image so the fade-out
    // feels natural. This delay is shorter than the CSS duration.
    const fadeDelay = 80;
    window.setTimeout(() => {
      currentIndex = (currentIndex + 1) % imageUrls.length;
      showCurrentImage();
    }, fadeDelay);
  }

  // ---------------------------------------------
  // Initialize the slider when DOM is ready
  // ---------------------------------------------

  async function init() {
    try {
      await discoverImages(); // Discover all book images first

      if (!imageUrls.length) {
        // If no images were discoverable, we skip starting the slider and
        // leave the background plain. This prevents console errors when
        // working before assets are added.
        return;
      }

      // Immediately show the first image to avoid an empty background.
      showCurrentImage();

      // Start interval to rotate through images.
      intervalId = window.setInterval(goToNextImage, slideIntervalMs);

      // Expose a minimal handle for possible future use
      window.__bookSlider = {
        next: goToNextImage,
        stop() {
          if (intervalId) {
            window.clearInterval(intervalId);
            intervalId = null;
          }
        },
      };
    } catch (error) {
      // In case of unexpected runtime errors (e.g., security policy),
      // we fail silently but log to console for developers.
      // eslint-disable-next-line no-console
      console.error("Background slider initialization failed:", error);
    }
  }

  // Kick off initialization once DOM is fully parsed.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


