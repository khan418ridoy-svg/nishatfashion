// =========================================================
// NISHAT FASHION - LOGIN / REGISTER
// =========================================================

import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    auth
} from "../firebase/firebase.js";


// =========================================================
// ELEMENTS
// =========================================================

const loginTab =
    document.getElementById("loginTab");

const registerTab =
    document.getElementById("registerTab");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");

const loginSubmitBtn =
    document.getElementById("loginSubmitBtn");

const registerSubmitBtn =
    document.getElementById("registerSubmitBtn");

const googleLoginBtn =
    document.getElementById("googleLoginBtn");

const googleRegisterBtn =
    document.getElementById("googleRegisterBtn");

const forgotPassword =
    document.getElementById("forgotPassword");

const authMessage =
    document.getElementById("authMessage");

const authMessageText =
    document.getElementById("authMessageText");

const authLoading =
    document.getElementById("authLoading");

const loadingText =
    document.getElementById("loadingText");


// =========================================================
// GOOGLE
// =========================================================

const googleProvider =
    new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});


// =========================================================
// MESSAGE
// =========================================================

function showMessage(
    message,
    type = "error"
) {

    if (!authMessage) {
        return;
    }

    if (authMessageText) {

        authMessageText.textContent =
            message ||
            "Something went wrong. Please try again.";

    }

    authMessage.classList.toggle(
        "success",
        type === "success"
    );

    authMessage.hidden = false;
}


function hideMessage() {

    if (!authMessage) {
        return;
    }

    authMessage.hidden = true;

    authMessage.classList.remove(
        "success"
    );

    if (authMessageText) {
        authMessageText.textContent = "";
    }
}


// =========================================================
// LOADING
// =========================================================

function setLoading(
    loading,
    text = "Please wait..."
) {

    if (authLoading) {

        authLoading.hidden =
            !loading;

    }

    if (loadingText) {

        loadingText.textContent =
            text;

    }

    if (loginSubmitBtn) {
        loginSubmitBtn.disabled = loading;
    }

    if (registerSubmitBtn) {
        registerSubmitBtn.disabled = loading;
    }

    if (googleLoginBtn) {
        googleLoginBtn.disabled = loading;
    }

    if (googleRegisterBtn) {
        googleRegisterBtn.disabled = loading;
    }
}


// =========================================================
// LOGIN / REGISTER TAB
// =========================================================

function showLogin() {

    loginTab?.classList.add("active");

    registerTab?.classList.remove("active");

    loginForm?.classList.add(
        "active-form"
    );

    registerForm?.classList.remove(
        "active-form"
    );

    hideMessage();

    setLoading(false);
}


function showRegister() {

    registerTab?.classList.add("active");

    loginTab?.classList.remove("active");

    registerForm?.classList.add(
        "active-form"
    );

    loginForm?.classList.remove(
        "active-form"
    );

    hideMessage();

    setLoading(false);
}


loginTab?.addEventListener(
    "click",
    showLogin
);

registerTab?.addEventListener(
    "click",
    showRegister
);


// =========================================================
// PASSWORD SHOW / HIDE
// =========================================================

document
    .querySelectorAll(".password-toggle")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const target =
                    document.getElementById(
                        button.dataset.target
                    );

                if (!target) {
                    return;
                }

                const icon =
                    button.querySelector("i");


                if (
                    target.type ===
                    "password"
                ) {

                    target.type = "text";

                    icon?.classList.remove(
                        "fa-eye"
                    );

                    icon?.classList.add(
                        "fa-eye-slash"
                    );

                } else {

                    target.type =
                        "password";

                    icon?.classList.remove(
                        "fa-eye-slash"
                    );

                    icon?.classList.add(
                        "fa-eye"
                    );

                }

            }
        );

    });


// =========================================================
// FIREBASE ERROR MESSAGE
// =========================================================

function firebaseError(error) {

    console.error(
        "Firebase Error:",
        error
    );


    switch (error?.code) {

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/user-not-found":
            return "No account found with this email.";

        case "auth/wrong-password":
            return "Incorrect email or password.";

        case "auth/email-already-in-use":
            return "An account already exists with this email.";

        case "auth/weak-password":
            return "Password must contain at least 6 characters.";

        case "auth/popup-closed-by-user":
            return "Google login was cancelled.";

        case "auth/popup-blocked":
            return "Browser blocked the Google login popup.";

        case "auth/unauthorized-domain":
            return "This domain is not authorized in Firebase.";

        case "auth/network-request-failed":
            return "Internet connection problem. Please try again.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/operation-not-allowed":
            return "This sign-in method is not enabled in Firebase.";

        default:
            return (
                error?.message ||
                "Something went wrong. Please try again."
            );
    }
}


// =========================================================
// REDIRECT
// =========================================================

function goToRedirect() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    const redirect =
        params.get("redirect");


    if (
        redirect &&
        !redirect.includes("://") &&
        !redirect.startsWith("//")
    ) {

        window.location.href =
            redirect;

        return;
    }


    // Default
    window.location.href =
        "../shop/index.html";
}


// =========================================================
// SAVE CUSTOMER
// =========================================================

function saveCustomer(
    user,
    phone = "",
    provider = "password"
) {

    const customer = {

        uid: user.uid,

        name:
            user.displayName || "",

        email:
            user.email || "",

        phone:
            phone ||
            user.phoneNumber ||
            "",

        photoURL:
            user.photoURL || "",

        provider:
            provider

    };


    localStorage.setItem(
        "nishat_customer",
        JSON.stringify(customer)
    );
}


// =========================================================
// LOGIN
// =========================================================

loginForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        hideMessage();

        setLoading(
            true,
            "Signing you in..."
        );


        try {

            const email =
                document
                    .getElementById(
                        "loginEmail"
                    )
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById(
                        "loginPassword"
                    )
                    ?.value;


            const remember =
                document
                    .getElementById(
                        "rememberMe"
                    )
                    ?.checked;


            if (!email) {

                showMessage(
                    "Please enter your email address."
                );

                return;
            }


            if (!password) {

                showMessage(
                    "Please enter your password."
                );

                return;
            }


            // Remember me
            await setPersistence(
                auth,
                remember
                    ? browserLocalPersistence
                    : browserSessionPersistence
            );


            // Login
            const result =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            saveCustomer(
                result.user,
                "",
                "password"
            );


            showMessage(
                "Login successful. Redirecting...",
                "success"
            );


            // Loading বন্ধ করে redirect
            setLoading(false);


            setTimeout(
                () => {
                    goToRedirect();
                },
                500
            );

        } catch (error) {

            showMessage(
                firebaseError(error)
            );

        } finally {

            // Error হলেও loading বন্ধ হবে
            setLoading(false);

        }

    }
);


// =========================================================
// REGISTER
// =========================================================

registerForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        hideMessage();

        setLoading(
            true,
            "Creating your account..."
        );


        try {

            const name =
                document
                    .getElementById(
                        "registerName"
                    )
                    ?.value
                    .trim();


            const email =
                document
                    .getElementById(
                        "registerEmail"
                    )
                    ?.value
                    .trim();


            const phone =
                document
                    .getElementById(
                        "registerPhone"
                    )
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById(
                        "registerPassword"
                    )
                    ?.value;


            const confirmPassword =
                document
                    .getElementById(
                        "confirmPassword"
                    )
                    ?.value;


            const agreeTerms =
                document
                    .getElementById(
                        "agreeTerms"
                    )
                    ?.checked;


            // --------------------------------
            // VALIDATION
            // --------------------------------

            if (!name) {

                showMessage(
                    "Please enter your full name."
                );

                return;
            }


            if (!email) {

                showMessage(
                    "Please enter your email address."
                );

                return;
            }


            if (!phone) {

                showMessage(
                    "Please enter your mobile number."
                );

                return;
            }


            const cleanPhone =
                phone.replace(
                    /[\s-]/g,
                    ""
                );


            const bdPhone =
                /^(?:\+8801|01)[3-9]\d{8}$/;


            if (
                !bdPhone.test(
                    cleanPhone
                )
            ) {

                showMessage(
                    "Please enter a valid Bangladesh mobile number."
                );

                return;
            }


            if (!password) {

                showMessage(
                    "Please enter a password."
                );

                return;
            }


            if (
                password.length < 6
            ) {

                showMessage(
                    "Password must contain at least 6 characters."
                );

                return;
            }


            if (
                password !==
                confirmPassword
            ) {

                showMessage(
                    "Passwords do not match."
                );

                return;
            }


            if (!agreeTerms) {

                showMessage(
                    "Please agree to the Terms & Conditions."
                );

                return;
            }


            // --------------------------------
            // CREATE ACCOUNT
            // --------------------------------

            const result =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


            const user =
                result.user;


            // Save name
            await updateProfile(
                user,
                {
                    displayName:
                        name
                }
            );


            // Save local customer
            saveCustomer(
                user,
                cleanPhone,
                "password"
            );


            showMessage(
                "Account created successfully. Redirecting...",
                "success"
            );


            setLoading(false);


            setTimeout(
                () => {
                    goToRedirect();
                },
                700
            );

        } catch (error) {

            showMessage(
                firebaseError(error)
            );

        } finally {

            setLoading(false);

        }

    }
);


// =========================================================
// GOOGLE LOGIN
// =========================================================

async function googleLogin() {

    hideMessage();

    setLoading(
        true,
        "Connecting to Google..."
    );


    try {

        const result =
            await signInWithPopup(
                auth,
                googleProvider
            );


        saveCustomer(
            result.user,
            "",
            "google"
        );


        showMessage(
            "Google login successful. Redirecting...",
            "success"
        );


        setLoading(false);


        setTimeout(
            () => {
                goToRedirect();
            },
            500
        );

    } catch (error) {

        showMessage(
            firebaseError(error)
        );

    } finally {

        setLoading(false);

    }

}


googleLoginBtn?.addEventListener(
    "click",
    googleLogin
);

googleRegisterBtn?.addEventListener(
    "click",
    googleLogin
);


// =========================================================
// FORGOT PASSWORD
// =========================================================

forgotPassword?.addEventListener(
    "click",
    async event => {

        event.preventDefault();

        hideMessage();


        const email =
            document
                .getElementById(
                    "loginEmail"
                )
                ?.value
                .trim();


        if (!email) {

            showMessage(
                "Enter your email first."
            );

            document
                .getElementById(
                    "loginEmail"
                )
                ?.focus();

            return;
        }


        setLoading(
            true,
            "Sending reset email..."
        );


        try {

            await sendPasswordResetEmail(
                auth,
                email
            );


            showMessage(
                "Password reset email sent. Please check your inbox.",
                "success"
            );

        } catch (error) {

            showMessage(
                firebaseError(error)
            );

        } finally {

            setLoading(false);

        }

    }
);


// =========================================================
// AUTH STATE
// =========================================================

onAuthStateChanged(
    auth,
    user => {

        if (user) {

            console.log(
                "Logged in:",
                user.email
            );

        }

    }
);


// =========================================================
// INITIAL STATE
// =========================================================

setLoading(false);

hideMessage();

console.log(
    "Nishat Fashion Login loaded."
);