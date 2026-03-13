/**
 * login.js
 * Handles login, registration, and 3D UI interactions.
 * RECONSTRUCTED FOR STABILITY
 */

$(function() {
    "use strict";

    // --- DOM ELEMENTS (jQuery Selectors) ---
    const $loginForm = $("#login-form");
    const $loginMessage = $("#login-message");
    const $loginBtn = $("#login-button");
    const $loginBtnLabel = $loginBtn.find(".btn-label");
    const $loginBtnSpinner = $loginBtn.find(".btn-spinner");

    const $openSignupBtn = $("#open-signup");
    const $signupOverlay = $("#signup-overlay");
    const $signupForm = $("#signup-form");
    const $closeSignupBtn = $("#close-signup");
    const $registerBtn = $("#register-button");

    // --- UTILITIES ---
    /**
     * Utility: showMessage
     * Purpose: Displays a message to the user (error or success) on the login screen.
     */
    const showMessage = ($container, text, isError = true) => {
        $container.text(text)
                  .addClass("is-visible")
                  .toggleClass("error", isError)
                  .toggleClass("success", !isError);
    };

    /**
     * Utility: clearMessage
     * Purpose: Hides and clears any existing messages.
     */
    const clearMessage = ($container) => {
        $container.text("").removeClass("is-visible error success");
    };

    // --- SIGNUP MODAL ---
    $openSignupBtn.on("click", (e) => {
        e.preventDefault();
        $signupOverlay.addClass("is-visible").attr("aria-hidden", "false");
    });

    /**
     * Function: hideSignup
     * Purpose: Closes the registration overlay with a smooth exit animation.
     */
    const hideSignup = () => {
        $signupOverlay.addClass("is-leaving").removeClass("is-visible");
        setTimeout(() => {
            $signupOverlay.removeClass("is-leaving").attr("aria-hidden", "true");
            $signupForm[0].reset();
        }, 500);
    };

    $closeSignupBtn.on("click", hideSignup);

    // --- REGISTRATION LOGIC ---
    /**
     * Event Listener: Signup Form Submit
     * Role: Handles new user registration using jQuery's AJAX-like fetch requests.
     */
    $signupForm.on("submit", async function(e) {
        e.preventDefault();

        const idNo = $("#signup-id-no").val().trim();
        const fullName = $("#signup-name").val().trim();
        const email = $("#signup-email").val().trim();
        const password = $("#signup-password").val().trim();

        // [JQUERY VALIDATION]
        if (!idNo || !fullName || !email || !password) {
            alert("All fields are required. (Validated via jQuery)");
            return;
        }

        $registerBtn.prop("disabled", true).text("Processing...");

        try {
            const response = await fetch("api.php?action=register", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: $.param({ id_no: idNo, full_name: fullName, email: email, password: password })
            });

            const rawText = await response.text();
            let result;
            try {
                result = JSON.parse(rawText);
            } catch (e) {
                console.error("Server returned non-JSON:", rawText);
                throw new Error("Invalid server response.");
            }

            if (response.ok) {
                $registerBtn.text("Success!").css("background-color", "#4cd137");
                setTimeout(() => {
                    hideSignup();
                    $registerBtn.prop("disabled", false).text("Register").css("background-color", "");
                }, 1000);
            } else {
                alert(result.error || "Registration failed.");
                $registerBtn.prop("disabled", false).text("Register");
            }
        } catch (err) {
            console.error("Registration error:", err);
            alert("Connection error: " + err.message);
            $registerBtn.prop("disabled", false).text("Register");
        }
    });

    // --- LOGIN LOGIC ---
    /**
     * Event Listener: Login Form Submit
     * Role: Handles user authentication and redirects to the appropriate dashboard.
     */
    $loginForm.on("submit", async function(e) {
        e.preventDefault();
        clearMessage($loginMessage);

        const idNo = $("#login-id-no").val().trim();
        const password = $("#password").val().trim();

        // [JQUERY VALIDATION]
        if (!idNo) {
            showMessage($loginMessage, "Please enter your ID no. (Required field)");
            return;
        }
        // Note: Password check is removed here to allow 'Admin' role bypass 
        // as supported by the backend (api.php). Standard users will still 
        // be challenged by the server.

        // Spinner toggle via jQuery
        $loginBtnLabel.hide();
        $loginBtnSpinner.prop("hidden", false);
        $loginBtn.prop("disabled", true);

        try {
            const response = await fetch("api.php?action=login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: $.param({ id_no: idNo, password: password })
            });

            const rawText = await response.text();
            let result;
            try {
                result = JSON.parse(rawText);
            } catch (e) {
                console.error("Server returned non-JSON:", rawText);
                throw new Error("Invalid server response.");
            }

            if (response.ok) {
                showMessage($loginMessage, "Access Granted. Redirecting...", false);
                localStorage.setItem("isLoggedIn", "true");
                localStorage.setItem("userIdNo", result.user.id_no);
                localStorage.setItem("userName", result.user.full_name);
                localStorage.setItem("userRole", result.user.role || 'user');

                setTimeout(() => {
                    window.location.href = result.user.role === 'admin' ? "admin.html" : "index.html";
                }, 1000);
            } else {
                showMessage($loginMessage, result.error || "Authentication failed.");
                $loginBtnLabel.show();
                $loginBtnSpinner.prop("hidden", true);
                $loginBtn.prop("disabled", false);
            }
        } catch (err) {
            console.error("Login error:", err);
            showMessage($loginMessage, "Server Connection Failed.");
            $loginBtnLabel.show();
            $loginBtnSpinner.prop("hidden", true);
            $loginBtn.prop("disabled", false);
        }
    });

    // --- UI POLISH: 3D CARD TILT ---
    const $loginCard = $(".login-card");
    if ($loginCard.length) {
        $(document).on("mousemove", (e) => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            $loginCard.css("transform", `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`);
        });
    }

    // --- [JQUERY INTERACTION] PASSWORD TOGGLE ---
    $(".toggle-password").on("click", function() {
        const $btn = $(this);
        const $input = $btn.siblings("input");
        const isPassword = $input.attr("type") === "password";
        
        $input.attr("type", isPassword ? "text" : "password");
        $btn.text(isPassword ? "🔒" : "👁"); // Change icon
        $btn.attr("aria-pressed", isPassword ? "true" : "false");
    });
});
