import { requireAdmin } from "./admin-auth.js";

import { db, auth } from "../js/firebase.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================
   ADMIN AUTH
========================================= */

const adminUser = await requireAdmin();

if (!adminUser) {
    throw new Error("Unauthorized");
}


/* =========================================
   ELEMENTS
========================================= */

const appShell = document.getElementById("appShell");

const settingsForm = document.getElementById("settingsForm");

const storeNameInput = document.getElementById("storeName");
const currencyInput = document.getElementById("currency");

const bkashDiscountInput =
    document.getElementById("bkashDiscount");

const bkashDiscountMaxInput =
    document.getElementById("bkashDiscountMax");

const bkashEnabledInput =
    document.getElementById("bkashEnabled");

const codEnabledInput =
    document.getElementById("codEnabled");

const saveBtn =
    document.getElementById("saveBtn");

const saveMessage =
    document.getElementById("saveMessage");

const toast =
    document.getElementById("toast");


/* =========================================
   ADMIN HEADER
========================================= */

appShell.innerHTML = `
<header class="admin-header">

    <div class="admin-brand">

        <img
            src="../asset/logo.png"
            alt="Nishat Fashion"
        >

        <span>Admin Panel</span>

    </div>


    <div class="admin-user">

        <span id="adminEmail">
            ${escapeHTML(adminUser.email || "Admin")}
        </span>

        <button
            id="logoutBtn"
            type="button"
        >
            Logout
        </button>

    </div>

</header>
`;


/* =========================================
   LOGOUT
========================================= */

document
    .getElementById("logoutBtn")
    .addEventListener("click", async () => {

        const button =
            document.getElementById("logoutBtn");

        button.disabled = true;
        button.textContent = "Logging out...";

        try {

            await auth.signOut();

            window.location.href = "admin-login.html";

        } catch (error) {

            console.error("Logout error:", error);

            button.disabled = false;
            button.textContent = "Logout";

            showToast(
                "Logout failed",
                "error"
            );
        }

    });


/* =========================================
   FIRESTORE SETTINGS
========================================= */

const settingsRef =
    doc(db, "settings", "store");


/* =========================================
   DEFAULT SETTINGS
========================================= */

const defaultSettings = {

    storeName: "Nishat Fashion",

    currency: "BDT",

    bkashDiscount: 2.5,

    bkashDiscountMax: 50,

    bkashEnabled: true,

    codEnabled: true
};


/* =========================================
   LOAD SETTINGS
========================================= */

async function loadSettings() {

    try {

        setFormDisabled(true);

        const snapshot =
            await getDoc(settingsRef);

        let settings = {
            ...defaultSettings
        };

        if (snapshot.exists()) {

            settings = {
                ...defaultSettings,
                ...snapshot.data()
            };

        }

        /* Store */
        storeNameInput.value =
            settings.storeName ||
            defaultSettings.storeName;

        currencyInput.value =
            settings.currency ||
            defaultSettings.currency;


        /* bKash */
        bkashDiscountInput.value =
            settings.bkashDiscount ??
            defaultSettings.bkashDiscount;

        bkashDiscountMaxInput.value =
            settings.bkashDiscountMax ??
            defaultSettings.bkashDiscountMax;

        bkashEnabledInput.checked =
            settings.bkashEnabled !== false;


        /* COD */
        codEnabledInput.checked =
            settings.codEnabled !== false;


    } catch (error) {

        console.error(
            "Settings load error:",
            error
        );

        showMessage(
            "Settings load failed",
            "error"
        );

        showToast(
            "Settings load failed",
            "error"
        );

    } finally {

        setFormDisabled(false);

    }
}


/* =========================================
   SAVE SETTINGS
========================================= */

settingsForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessage();

        /* Validation */

        const storeName =
            storeNameInput.value.trim();

        const currency =
            currencyInput.value.trim() || "BDT";

        const bkashDiscount =
            Number(
                bkashDiscountInput.value || 0
            );

        const bkashDiscountMax =
            Number(
                bkashDiscountMaxInput.value || 0
            );


        if (!storeName) {

            showMessage(
                "Store name is required.",
                "error"
            );

            storeNameInput.focus();

            return;
        }


        if (
            bkashDiscount < 0 ||
            bkashDiscount > 100
        ) {

            showMessage(
                "bKash discount must be between 0 and 100%.",
                "error"
            );

            bkashDiscountInput.focus();

            return;
        }


        if (bkashDiscountMax < 0) {

            showMessage(
                "Maximum discount cannot be negative.",
                "error"
            );

            bkashDiscountMaxInput.focus();

            return;
        }


        /* Loading */

        setSaving(true);


        try {

            await setDoc(
                settingsRef,
                {

                    storeName,

                    currency,

                    bkashDiscount,

                    bkashDiscountMax,

                    bkashEnabled:
                        bkashEnabledInput.checked,

                    codEnabled:
                        codEnabledInput.checked,

                    updatedAt:
                        serverTimestamp(),

                    updatedBy:
                        adminUser.uid

                },
                {
                    merge: true
                }
            );


            showMessage(
                "Settings saved successfully.",
                "success"
            );

            showToast(
                "Settings saved successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "Settings save error:",
                error
            );

            showMessage(
                getFirebaseErrorMessage(error),
                "error"
            );

            showToast(
                "Could not save settings.",
                "error"
            );

        } finally {

            setSaving(false);

        }

    }
);


/* =========================================
   UI HELPERS
========================================= */

function setSaving(isSaving) {

    saveBtn.disabled = isSaving;

    if (isSaving) {

        saveBtn.classList.add("loading");

        saveBtn.querySelector(
            ".btn-text"
        ).textContent = "Saving...";

    } else {

        saveBtn.classList.remove("loading");

        saveBtn.querySelector(
            ".btn-text"
        ).textContent = "Save Settings";

    }

}


function setFormDisabled(disabled) {

    const fields =
        settingsForm.querySelectorAll(
            "input, button"
        );

    fields.forEach(field => {

        if (
            field.id !== "saveBtn"
        ) {
            field.disabled = disabled;
        }

    });

}


function showMessage(
    message,
    type = "success"
) {

    saveMessage.textContent = message;

    saveMessage.className =
        `save-message ${type}`;

}


function clearMessage() {

    saveMessage.textContent = "";

    saveMessage.className =
        "save-message";

}


let toastTimer = null;


function showToast(
    message,
    type = "success"
) {

    clearTimeout(toastTimer);

    toast.textContent = message;

    toast.className =
        `toast show ${type}`;

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);

}


/* =========================================
   FIREBASE ERROR
========================================= */

function getFirebaseErrorMessage(error) {

    if (!error) {
        return "Something went wrong.";
    }

    switch (error.code) {

        case "permission-denied":
            return "Permission denied. Check Firestore rules.";

        case "unauthenticated":
            return "You are not authenticated.";

        case "unavailable":
            return "Network unavailable. Please try again.";

        default:
            return error.message ||
                "Something went wrong.";

    }

}


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================
   START
========================================= */

await loadSettings();