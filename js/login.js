// login.js
// Handles AJAX-based authentication, client-side validation, UX feedback,
// and basic security features (lockout, trimming input, etc.) for the
// Library Pavilion login page.

(() => {
  "use strict";

  // -------------------------------
  // Configuration (easy to change)
  // -------------------------------

  const USERS_ENDPOINT = "data/users.json"; // Where predefined credentials live
  const MAX_ATTEMPTS = 3; // Number of allowed failed attempts before lockout
  const LOCKOUT_MS = 60_000; // Lockout duration in milliseconds (e.g., 1 minute)
  const REDIRECT_URL = "dashboard.html"; // Destination after successful login

  // -------------------------------
  // Cached DOM elements
  // -------------------------------

  const formEl = document.getElementById("login-form");
  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");
  const loginButtonEl = document.getElementById("login-button");
  const messageEl = document.getElementById("login-message");
  const lockoutInfoEl = document.getElementById("lockout-info");
  const togglePasswordEl = document.querySelector(".toggle-password");
  const loginCardEl = document.querySelector(".login-card");
  const rememberMeEl = document.getElementById("remember-me");
  const btnSpinnerEl = loginButtonEl
    ? loginButtonEl.querySelector(".btn-spinner")
    : null;

  // If any of the critical elements are missing, we abort safely.
  if (
    !formEl ||
    !usernameEl ||
    !passwordEl ||
    !loginButtonEl ||
    !messageEl
  ) {
    // eslint-disable-next-line no-console
    console.error("Login form elements are missing. Aborting login.js setup.");
    return;
  }

  // -------------------------------
  // State for attempts and lockout
  // -------------------------------

  let failedAttempts = 0;
  let lockoutUntil = 0; // Timestamp in ms; 0 when not locked out

  // -------------------------------
  // Helper: update UI messaging
  // -------------------------------

  /**
   * Shows an informational or error message above the form.
   * @param {string} text Human-readable message to display
   * @param {"error" | "success" | "info"} [type] Type of message (affects style)
   */
  function showMessage(text, type = "info") {
    messageEl.textContent = text;
    messageEl.classList.remove("login-message--success");
    if (type === "success") {
      messageEl.classList.add("login-message--success");
    }
  }

  /**
   * Updates lockout info text below the button to help users understand
   * why they cannot currently attempt to log in.
   */
  function showLockoutInfo() {
    if (!lockoutUntil) {
      lockoutInfoEl.textContent = "";
      return;
    }
    const remainingMs = lockoutUntil - Date.now();
    if (remainingMs <= 0) {
      lockoutInfoEl.textContent = "";
      lockoutUntil = 0;
      failedAttempts = 0;
      setButtonEnabled(true);
      return;
    }
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    lockoutInfoEl.textContent = `Too many attempts. Please try again in ${remainingSeconds} seconds.`;
  }

  // -------------------------------
  // Helper: enable/disable button
  // -------------------------------

  /**
   * Toggles the login button disabled state, including ARIA attributes and
   * visual spinner visibility.
   */
  function setButtonEnabled(isEnabled) {
    loginButtonEl.disabled = !isEnabled;
    loginButtonEl.setAttribute("aria-disabled", String(!isEnabled));
  }

  function showSpinner(isVisible) {
    if (!btnSpinnerEl) return;
    if (isVisible) {
      btnSpinnerEl.hidden = false;
    } else {
      btnSpinnerEl.hidden = true;
    }
  }

  // -------------------------------
  // Helper: shake animation
  // -------------------------------

  /**
   * Adds a temporary CSS class to trigger a shake animation when login fails.
   */
  function triggerShake() {
    if (!loginCardEl) return;
    loginCardEl.classList.remove("is-shaking");
    // Force reflow so that re-adding the class retriggers the animation
    // eslint-disable-next-line no-unused-expressions
    loginCardEl.offsetHeight;
    loginCardEl.classList.add("is-shaking");
  }

  // -------------------------------
  // Helper: Remember Me
  // -------------------------------

  /**
   * Loads any stored username from localStorage and pre-fills the input.
   * This is optional and can be turned off by users.
   */
  function hydrateRememberedUser() {
    try {
      const stored = window.localStorage.getItem("libraryLogin.rememberedUser");
      if (!stored) return;
      const data = JSON.parse(stored);
      if (data?.username) {
        usernameEl.value = data.username;
        rememberMeEl.checked = true;
      }
    } catch {
      // If localStorage is not available or corrupted, we fail silently.
    }
  }

  function persistRememberedUser(username) {
    if (!rememberMeEl.checked) {
      window.localStorage.removeItem("libraryLogin.rememberedUser");
      return;
    }
    try {
      const payload = JSON.stringify({ username });
      window.localStorage.setItem("libraryLogin.rememberedUser", payload);
    } catch {
      // Ignore storage errors (e.g., quota); not critical for login.
    }
  }

  // -------------------------------
  // Validation
  // -------------------------------

  /**
   * Performs lightweight front-end validation and returns a trimmed payload
   * if inputs are valid. Otherwise, returns null and shows an error message.
   */
  function validateInputs() {
    const usernameRaw = usernameEl.value.trim();
    const passwordRaw = passwordEl.value.trim();

    if (!usernameRaw && !passwordRaw) {
      showMessage("Please enter both your username and password.", "error");
      return null;
    }
    if (!usernameRaw) {
      showMessage("Please enter your username.", "error");
      return null;
    }
    if (!passwordRaw) {
      showMessage("Please enter your password.", "error");
      return null;
    }

    return {
      username: usernameRaw,
      password: passwordRaw,
    };
  }

  // -------------------------------
  // AJAX: fetch credentials
  // -------------------------------

  /**
   * Fetches allowed user credentials from users.json using fetch(),
   * then returns the first (and currently only) user object.
   * Structured this way so it is easy to move to a real backend endpoint later.
   * Fallback included for local file access (file:// protocol) where fetch is blocked.
   */
  async function fetchUsers() {
    try {
      const response = await fetch(USERS_ENDPOINT, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        // FIX: If the file is missing (404), it's likely a local dev environment issue; otherwise, throw
        if (response.status === 404) {
          console.info("users.json not found on server, using local guest fallback.");
        } else {
          throw new Error(`Server returned status ${response.status}`);
        }
      } else {
        const data = await response.json();
        return data.users;
      }
    } catch (err) {
      // FIX: Improved error logging to distinguish between network failure and intentional fallback
      console.warn("Credential fetch failed. Using local curator fallback.", err.message);
    }

    // Fallback included for local file access (file:// protocol) where fetch is blocked, 
    // or when data/users.json is not present on the server.
    return [
      {
        username: "curator",
        password: "AuroraTree!23",
      },
    ];
  }

  /**
   * Compares user input with stored credentials. For now we only support
   * a single predefined user, but returning a boolean keeps the function
   * ready for multiple accounts or server-side validation.
   */
  function compareCredentials(input, users) {
    // In the future this could handle multiple records or roles.
    const match = users.find(
      (user) =>
        user.username === input.username && user.password === input.password
    );
    return Boolean(match);
  }

  // -------------------------------
  // Core login flow
  // -------------------------------

  async function handleSubmit(event) {
    event.preventDefault(); // Prevent page reload on form submit

    // If user is currently locked out, we simply explain why and exit.
    if (lockoutUntil && Date.now() < lockoutUntil) {
      showLockoutInfo();
      triggerShake();
      return;
    }

    const payload = validateInputs();
    if (!payload) {
      triggerShake();
      return;
    }

    // Start loading state before performing network request
    setButtonEnabled(false);
    showSpinner(true);
    showMessage("Authenticating, please wait…", "info");

    try {
      const users = await fetchUsers();
      const isValid = compareCredentials(payload, users);

      if (!isValid) {
        failedAttempts += 1;

        if (failedAttempts >= MAX_ATTEMPTS) {
          lockoutUntil = Date.now() + LOCKOUT_MS;
          showMessage("Too many failed attempts.", "error");
          showLockoutInfo();
          setButtonEnabled(false);
        } else {
          const remaining = MAX_ATTEMPTS - failedAttempts;
          showMessage(
            `Incorrect username or password. You have ${remaining} attempt${remaining === 1 ? "" : "s"
            } left.`,
            "error"
          );
          triggerShake();
          setButtonEnabled(true);
        }
        return;
      }

      // Successful login:
      showMessage("Welcome back, curator. Redirecting…", "success");
      persistRememberedUser(payload.username);

      // Store login state
      window.localStorage.setItem("isLoggedIn", "true");
      window.localStorage.removeItem("isGuest");

      // Slight delay so the user can see the success message
      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 700);
    } catch (error) {
      // Network or JSON loading error: we inform the user clearly.
      // eslint-disable-next-line no-console
      console.error("Login request failed:", error);
      showMessage(
        "We could not reach the credential service. Please check your connection and try again.",
        "error"
      );
      triggerShake();
      setButtonEnabled(true);
    } finally {
      showSpinner(false);
    }
  }

  // -------------------------------
  // Password show/hide toggle
  // -------------------------------

  function setupPasswordToggle() {
    const toggles = document.querySelectorAll(".toggle-password");
    toggles.forEach(toggle => {
      const input = toggle.parentElement.querySelector("input");
      if (!input) return; // Ensure there's an associated input

      toggle.addEventListener("click", () => {
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";

        // Update accessible label and pressed state
        toggle.setAttribute(
          "aria-label",
          isHidden ? "Hide password" : "Show password"
        );
        toggle.setAttribute("aria-pressed", String(isHidden));
      });
    });
  }

  // -------------------------------
  // Initialize listeners + state
  // -------------------------------

  function init() {
    formEl.addEventListener("submit", handleSubmit);

    // Pressing Enter in inputs will already submit the form in most browsers,
    // but this listener ensures it works even when focus is on custom elements.
    formEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        // Allow native submit behavior by doing nothing here. We keep the
        // handler only in case additional keyboard shortcuts are needed later.
      }
    });

    setupPasswordToggle();
    hydrateRememberedUser();

    // --- 3D INTERACTIVE TILT (Card only) ---
    // This tilts the login card in 3D with the mouse.
    // The background images are intentionally NOT moved — they stay fixed.
    document.addEventListener("mousemove", (e) => {
      if (!loginCardEl) return;

      const { clientY, clientX } = e;
      const { innerWidth, innerHeight } = window;

      // Calculate rotation based on mouse position
      const xPos = (clientX / innerWidth) - 0.5;
      const yPos = (clientY / innerHeight) - 0.5;

      // Card 3D Tilt only — background stays static
      const rotateY = xPos * 40;
      const rotateX = -yPos * 40;
      loginCardEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    // Reset rotation when mouse leaves the window (optional but feels cleaner)
    document.addEventListener("mouseleave", () => {
      if (loginCardEl) {
        loginCardEl.style.transform = `rotateX(0deg) rotateY(0deg)`;
      }
    });

    // If we are currently locked out (e.g., from sessionStorage in the future),
    // we would re-apply the lock here. For now it is reset per page load.
  }

  /**
   * Signup Card Logic
   */
  function setupSignupFlow() {
    const openSignupBtn = document.getElementById("open-signup");
    const signupOverlay = document.getElementById("signup-overlay");
    const signupForm = document.getElementById("signup-form");
    const closeSignupBtn = document.getElementById("close-signup");

    if (!openSignupBtn || !signupOverlay || !signupForm) return;

    const showSignup = (e) => {
      e.preventDefault();
      signupOverlay.classList.add("is-visible");
      signupOverlay.setAttribute("aria-hidden", "false");
    };

    const hideSignup = () => {
      signupOverlay.classList.add("is-leaving");
      signupOverlay.classList.remove("is-visible");

      // Wait for animation to finish before resetting classes
      setTimeout(() => {
        signupOverlay.classList.remove("is-leaving");
        signupOverlay.setAttribute("aria-hidden", "true");
        signupForm.reset();
      }, 500);
    };

    openSignupBtn.addEventListener("click", showSignup);
    closeSignupBtn.addEventListener("click", hideSignup);

    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // Since it's a front-end assignment, we just show success and disappear
      const registerBtn = document.getElementById("register-button");
      registerBtn.innerHTML = "Success!";
      registerBtn.style.background = "#4cd137";

      setTimeout(() => {
        hideSignup();
        // Reset button after it closes
        setTimeout(() => {
          registerBtn.innerHTML = "Register";
          registerBtn.style.background = "";
        }, 600);
      }, 800);
    });

    // Close on overlay click
    signupOverlay.addEventListener("click", (e) => {
      if (e.target === signupOverlay) hideSignup();
    });

    // --- GUEST MODE TRACKING ---
    // This part watches for clicks on the 'Continue as Guest' link.
    // If clicked, we save a 'guest' flag in the browser's memory so other pages know.
    const guestLink = document.getElementById("guest-link");
    if (guestLink) {
      guestLink.addEventListener("click", () => {
        window.localStorage.setItem("isGuest", "true"); // Remember this person is a guest
        window.localStorage.removeItem("isLoggedIn"); // They are NOT a logged-in member
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init();
      setupSignupFlow();
    });
  } else {
    init();
    setupSignupFlow();
  }
})();


