/**
 * login.js
 * Handles login, registration, and 3D UI interactions.
 * RECONSTRUCTED FOR STABILITY
 */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // --- DOM ELEMENTS ---
    const loginForm = document.getElementById("login-form");
    const loginMessage = document.getElementById("login-message");
    const loginBtn = document.getElementById("login-button");
    const loginBtnLabel = loginBtn.querySelector(".btn-label");
    const loginBtnSpinner = loginBtn.querySelector(".btn-spinner");

    const openSignupBtn = document.getElementById("open-signup");
    const signupOverlay = document.getElementById("signup-overlay");
    const signupForm = document.getElementById("signup-form");
    const closeSignupBtn = document.getElementById("close-signup");
    const registerBtn = document.getElementById("register-button");

    // --- UTILITIES ---
    const showMessage = (container, text, isError = true) => {
        container.textContent = text;
        container.className = `login-message ${isError ? 'error' : 'success'} is-visible`;
    };

    const clearMessage = (container) => {
        container.textContent = "";
        container.className = "login-message";
    };

    // --- SIGNUP MODAL ---
    const showSignup = (e) => {
        e.preventDefault();
        signupOverlay.classList.add("is-visible");
        signupOverlay.setAttribute("aria-hidden", "false");
    };

    const hideSignup = () => {
        signupOverlay.classList.add("is-leaving");
        signupOverlay.classList.remove("is-visible");
        setTimeout(() => {
            signupOverlay.classList.remove("is-leaving");
            signupOverlay.setAttribute("aria-hidden", "true");
            signupForm.reset();
        }, 500);
    };

    if (openSignupBtn) openSignupBtn.addEventListener("click", showSignup);
    if (closeSignupBtn) closeSignupBtn.addEventListener("click", hideSignup);

    // --- REGISTRATION LOGIC ---
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const idNo = document.getElementById("signup-id-no").value.trim();
            const fullName = document.getElementById("signup-name").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value.trim();

            if (!idNo || !fullName || !email || !password) {
                alert("All fields are required.");
                return;
            }

            registerBtn.disabled = true;
            registerBtn.innerHTML = "Processing...";

            try {
                const response = await fetch("api.php?action=register", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ id_no: idNo, full_name: fullName, email: email, password: password })
                });

                const rawText = await response.text();
                let result;
                try {
                    result = JSON.parse(rawText);
                } catch (e) {
                    console.error("Server returned non-JSON:", rawText);
                    throw new Error("Invalid server response. Check XAMPP logs.");
                }

                if (response.ok) {
                    registerBtn.innerHTML = "Success!";
                    registerBtn.style.backgroundColor = "#4cd137";
                    setTimeout(() => {
                        hideSignup();
                        registerBtn.disabled = false;
                        registerBtn.innerHTML = "Register";
                        registerBtn.style.backgroundColor = "";
                    }, 1000);
                } else {
                    alert(result.error || "Registration failed.");
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = "Register";
                }
            } catch (err) {
                console.error("Registration error:", err);
                alert("Connection error: " + err.message);
                registerBtn.disabled = false;
                registerBtn.innerHTML = "Register";
            }
        });
    }

    // --- LOGIN LOGIC ---
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearMessage(loginMessage);

            const idNo = document.getElementById("login-id-no").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!idNo) {
                showMessage(loginMessage, "Please enter your ID no.");
                return;
            }

            // Spinner toggle
            loginBtnLabel.style.display = "none";
            loginBtnSpinner.hidden = false;
            loginBtn.disabled = true;

            try {
                const response = await fetch("api.php?action=login", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ id_no: idNo, password: password })
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
                    showMessage(loginMessage, "Access Granted. Redirecting...", false);
                    localStorage.setItem("isLoggedIn", "true");
                    localStorage.setItem("userIdNo", result.user.id_no);
                    localStorage.setItem("userName", result.user.full_name);
                    localStorage.setItem("userRole", result.user.role || 'user');
                    
                    setTimeout(() => {
                        if (result.user.role === 'admin') {
                            window.location.href = "admin.html";
                        } else {
                            window.location.href = "index.html";
                        }
                    }, 1000);
                } else {
                    showMessage(loginMessage, result.error || "Authentication failed.");
                    loginBtnLabel.style.display = "inline";
                    loginBtnSpinner.hidden = true;
                    loginBtn.disabled = false;
                }
            } catch (err) {
                console.error("Login error:", err);
                showMessage(loginMessage, "Server Connection Failed.");
                loginBtnLabel.style.display = "inline";
                loginBtnSpinner.hidden = true;
                loginBtn.disabled = false;
            }
        });
    }

    // --- UI POLISH: 3D CARD TILT ---
    const loginCard = document.querySelector(".login-card");
    if (loginCard) {
        document.addEventListener("mousemove", (e) => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            loginCard.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });
    }
});
