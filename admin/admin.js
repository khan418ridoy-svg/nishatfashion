import {
    getAuth,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    app,
    db
} from "../js/firebase.js";


const auth = getAuth(app);


/* =========================
   ELEMENTS
========================= */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const loginMessage = document.getElementById("loginMessage");
const togglePassword = document.getElementById("togglePassword");


/* =========================
   PASSWORD TOGGLE
========================= */

togglePassword.addEventListener("click", () => {

    if (passwordInput.type === "password") {

        passwordInput.type = "text";
        togglePassword.textContent = "Hide";

    } else {

        passwordInput.type = "password";
        togglePassword.textContent = "Show";

    }

});


/* =========================
   LOGIN
========================= */

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("Email and password are required.");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Checking...";
    window.setButtonLoading?.(loginBtn, true, "Checking...");
    clearMessage();

    try {

        /* Firebase Login */

        const result = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = result.user;


        /* =========================
           CHECK ADMIN DOCUMENT
        ========================= */

        const adminRef = doc(
            db,
            "admins",
            user.uid
        );

        const adminSnap = await getDoc(adminRef);


        if (!adminSnap.exists()) {

            await auth.signOut();

            showMessage(
                "Access denied. This account is not an admin."
            );

            window.setButtonLoading?.(loginBtn, false);
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";

            return;
        }


        const adminData = adminSnap.data();


        /* =========================
           CHECK ROLE
        ========================= */

        if (
            adminData.role !== "admin" ||
            adminData.active !== true
        ) {

            await auth.signOut();

            showMessage(
                "Access denied. Admin permission is inactive."
            );

            window.setButtonLoading?.(loginBtn, false);
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";

            return;
        }


        /* =========================
           SUCCESS
        ========================= */

        showMessage(
            "Admin login successful.",
            true
        );

        setTimeout(() => {

            window.location.href = "products.html";

        }, 600);


    } catch (error) {

        console.error("Admin login error:", error);

        let message = "Login failed.";

        switch (error.code) {

            case "auth/invalid-credential":
                message = "Invalid email or password.";
                break;

            case "auth/invalid-email":
                message = "Invalid email address.";
                break;

            case "auth/user-disabled":
                message = "This account has been disabled.";
                break;

            case "auth/too-many-requests":
                message = "Too many attempts. Try again later.";
                break;

            case "auth/network-request-failed":
                message = "Network error. Check your internet.";
                break;

            case "permission-denied":
                message = "Admin permission check failed.";
                break;

            default:
                message = error.message || "Unable to login.";
        }

        showMessage(message);

        window.setButtonLoading?.(loginBtn, false);
        loginBtn.disabled = false;
        loginBtn.textContent = "Sign In";
    }

});


/* =========================
   MESSAGE
========================= */

function showMessage(message, success = false) {

    loginMessage.textContent = message;

    loginMessage.className =
        success
            ? "message success"
            : "message";
}


function clearMessage() {

    loginMessage.textContent = "";
    loginMessage.className = "message";
}

/* =========================
   FAST CLICK / LOADING UI
========================= */
function ensureAdminLoadingOverlay() {
    let overlay = document.getElementById("adminClickLoading");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "adminClickLoading";
    overlay.className = "admin-click-loading hidden";
    overlay.innerHTML = `
        <div class="admin-click-loading-box">
            <div class="admin-click-spinner"></div>
            <div id="adminClickLoadingText">Please wait...</div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

window.setAdminLoading = function (loading, text = "Please wait...") {
    const overlay = ensureAdminLoadingOverlay();
    const message = overlay.querySelector("#adminClickLoadingText");
    if (message) message.textContent = text;
    overlay.classList.toggle("hidden", !loading);
};

window.setButtonLoading = function (button, loading, text = "Please wait...") {
    if (!button) return;
    if (loading) {
        if (!button.dataset.originalText) button.dataset.originalText = button.textContent.trim();
        button.classList.add("is-loading");
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        if (text) button.firstChild && (button.firstChild.nodeType === 3 ? button.firstChild.textContent = text : null);
    } else {
        button.classList.remove("is-loading");
        button.disabled = false;
        button.removeAttribute("aria-busy");
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
};
