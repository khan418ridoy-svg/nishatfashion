// ============================================================
// NISHAT FASHION - MY ACCOUNT
// account.js
// ============================================================

import { auth, db } from "../firebase/firebase.js";

import {
    onAuthStateChanged,
    signOut,
    updateProfile,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ============================================================
// CONFIG
// ============================================================

const INITIAL_ORDER_LIMIT = 3;
const INITIAL_WISHLIST_LIMIT = 3;

let allOrders = [];
let allWishlist = [];

let ordersExpanded = false;
let wishlistExpanded = false;

let currentUser = null;
let allAddresses = [];
let currentUserData = {};
let orderSearchValue = "";
let orderStatusValue = "all";
let orderSortValue = "newest";


// ============================================================
// DOM READY
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    setupNavigation();
    openSectionFromURL();
    setupDashboardButtons();
    setupLogoutButtons();
    setupAccountEditors();
    setupOrderFilters();
    setupWishlistNavigation();

    onAuthStateChanged(auth, async (user) => {

        if (!user) {

            const currentPage =
                window.location.href;

            window.location.href =
                "../login/index.html?redirect=" +
                encodeURIComponent(currentPage);

            return;
        }

        currentUser = user;

        try {

            await Promise.all([
                loadUserProfile(user),
                loadOrders(user.uid),
                loadWishlist(user.uid),
                loadCart(user.uid),
                loadAddresses(user.uid)
            ]);

        } catch (error) {

            console.error(
                "Account initialization error:",
                error
            );

        }

    });

});


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    // Sidebar buttons
    document
        .querySelectorAll("[data-section]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const section =
                    button.dataset.section;

                if (!section) return;

                showSection(section);

            });

        });


    // Dashboard buttons
    document
        .querySelectorAll("[data-open-section]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const section =
                    button.dataset.openSection;

                if (!section) return;

                showSection(section);

            });

        });

}


// ============================================================
// SHOW SECTION
// ============================================================
// ============================================================
// SHOW SECTION - FIXED
// ============================================================

function showSection(sectionName) {
    const allowedSections = [
        "dashboard",
        "profile",
        "orders",
        "wishlist",
        "addresses",
        "settings"
    ];

    if (!allowedSections.includes(sectionName)) {
        sectionName = "dashboard";
    }

    // Show selected section only
    document.querySelectorAll(".account-section").forEach(section => {
        section.classList.toggle(
            "active",
            section.id === sectionName
        );
    });

    // Highlight selected sidebar item
    document.querySelectorAll(".account-menu-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionName
        );
    });

    // Update URL without reloading the page
    const newHash = `#${sectionName}`;

    if (window.location.hash !== newHash) {
        history.replaceState(
            null,
            "",
            window.location.pathname +
            window.location.search +
            newHash
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "auto"
    });
}


// ============================================================
// OPEN SECTION FROM URL
// ============================================================

function openSectionFromURL() {
    const sectionName = window.location.hash.replace("#", "").trim();

    showSection(sectionName || "dashboard");
}


// Handle URL hash changes
window.addEventListener("hashchange", openSectionFromURL);




// ============================================================
// DASHBOARD BUTTONS
// ============================================================

function setupDashboardButtons() {

    const ordersMoreBtn =
        document.getElementById(
            "ordersMoreBtn"
        );


    if (ordersMoreBtn) {

        ordersMoreBtn.addEventListener(
            "click",
            () => {

                ordersExpanded =
                    !ordersExpanded;

                renderOrders();

            }
        );

    }


    const wishlistMoreBtn =
        document.getElementById(
            "wishlistMoreBtn"
        );


    if (wishlistMoreBtn) {

        wishlistMoreBtn.addEventListener(
            "click",
            () => {

                wishlistExpanded =
                    !wishlistExpanded;

                renderWishlist();

            }
        );

    }

}


// ============================================================
// LOGOUT
// ============================================================

function setupLogoutButtons() {

    const logoutButtons = [
        document.getElementById("logoutBtn"),
        document.getElementById("logoutBtn2")
    ];


    logoutButtons.forEach(button => {

        if (!button) return;

        button.addEventListener(
            "click",
            logoutUser
        );

    });

}


async function logoutUser() {

    try {

        await signOut(auth);

        window.location.href =
            "../login/index.html";

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            "Logout করতে সমস্যা হয়েছে।"
        );

    }

}


// ============================================================
// USER PROFILE
// ============================================================

async function loadUserProfile(user) {

    let userData = {};


    try {

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );


        const snapshot =
            await getDoc(userRef);


        if (snapshot.exists()) {

            userData =
                snapshot.data() || {};

        }

    } catch (error) {

        console.warn(
            "User document load failed:",
            error
        );

    }


    currentUserData = userData;

    const name =
        userData.name ||
        userData.displayName ||
        user.displayName ||
        "User";


    const email =
        userData.email ||
        user.email ||
        "";


    const phone =
        userData.phone ||
        userData.phoneNumber ||
        user.phoneNumber ||
        "Not added";


    // Sidebar
    setText(
        "userName",
        name
    );


    setText(
        "userEmail",
        email
    );


    // Profile
    setText(
        "profileName",
        name
    );


    setText(
        "profileEmail",
        email
    );


    setText(
        "profilePhone",
        phone
    );


    setText(
        "profileUid",
        user.uid
    );


    // Avatar
    const avatar =
        document.getElementById(
            "userAvatar"
        );


    if (avatar) {

        if (user.photoURL) {

            avatar.innerHTML = `
                <img
                    src="${escapeAttribute(user.photoURL)}"
                    alt="Profile"
                >
            `;

        } else {

            avatar.textContent =
                getInitials(name);

        }

    }

}


// ============================================================
// PROFILE / ADDRESS EDITING AND SETTINGS
// ============================================================

function setupAccountEditors() {
    const addAddressBtn = document.getElementById("addAddressBtn");
    if (addAddressBtn) {
        addAddressBtn.addEventListener("click", () => openAddressEditor());
    }

    const resetPasswordBtn = document.getElementById("resetPasswordBtn");
    if (resetPasswordBtn) resetPasswordBtn.addEventListener("click", resetPassword);

    document.addEventListener("click", event => {
        const profileButton = event.target.closest("[data-edit-profile-field]");
        if (profileButton) {
            openProfileEditor(profileButton.dataset.editProfileField);
        }
    });

    ensureAccountModal();
}

function ensureAccountModal() {
    if (document.getElementById("accountEditorModal")) return;

    const modal = document.createElement("div");
    modal.id = "accountEditorModal";
    modal.className = "account-modal";
    modal.hidden = true;
    modal.innerHTML = `
        <div class="account-modal-backdrop" data-modal-close></div>
        <section class="account-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="accountModalTitle">
            <div class="account-modal-header">
                <h3 id="accountModalTitle">Edit information</h3>
                <button type="button" class="account-modal-x" aria-label="Close" data-modal-close>&times;</button>
            </div>
            <form id="accountEditorForm" novalidate>
                <div id="accountModalFields" class="account-modal-fields"></div>
                <p id="accountModalError" class="account-modal-error" role="alert"></p>
                <div class="account-modal-actions">
                    <button type="button" class="account-action-btn account-action-secondary" data-modal-close>Cancel</button>
                    <button type="submit" class="account-action-btn" id="accountModalSave">Save changes</button>
                </div>
            </form>
        </section>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", event => {
        if (event.target.closest("[data-modal-close]")) closeAccountModal();
    });

    document.getElementById("accountEditorForm").addEventListener("submit", saveAccountModal);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !modal.hidden) closeAccountModal();
    });
}

let accountModalMode = "";
let editingAddressId = null;
let deliveryDistrictData = null;

function openAccountModal(title, mode, fieldsHtml) {
    ensureAccountModal();
    accountModalMode = mode;
    document.getElementById("accountModalTitle").textContent = title;
    document.getElementById("accountModalFields").innerHTML = fieldsHtml;
    document.getElementById("accountModalError").textContent = "";
    const modal = document.getElementById("accountEditorModal");
    modal.hidden = false;
    document.body.classList.add("account-modal-open");
    const firstInput = modal.querySelector("input, select, textarea");
    if (firstInput) setTimeout(() => firstInput.focus(), 0);
}

function closeAccountModal() {
    const modal = document.getElementById("accountEditorModal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("account-modal-open");
    accountModalMode = "";
    editingAddressId = null;
}

function modalError(message) {
    const error = document.getElementById("accountModalError");
    if (error) error.textContent = message;
}

function openProfileEditor(field) {
    if (!currentUser) return;
    const isName = field === "name";
    if (!isName && field !== "phone") return;

    const currentValue = isName
        ? (currentUserData.name || currentUserData.displayName || currentUser.displayName || "")
        : (currentUserData.phone || currentUserData.phoneNumber || currentUser.phoneNumber || "");

    const label = isName ? "Full name" : "Phone number";
    const inputType = isName ? "text" : "tel";
    const placeholder = isName ? "Enter your full name" : "01XXXXXXXXX";

    openAccountModal(`Edit ${label.toLowerCase()}`, `profile-${field}`, `
        <label class="account-modal-label" for="accountModalValue">${label}<span>*</span></label>
        <input class="account-modal-input" id="accountModalValue" name="value" type="${inputType}"
            value="${escapeAttribute(currentValue)}" placeholder="${placeholder}" required maxlength="${isName ? 100 : 20}">
        <small class="account-modal-help">${isName ? "Use at least 2 characters." : "Enter a Bangladesh mobile number or an international phone number."}</small>
    `);
}

async function loadDeliveryDistrictData() {
    if (deliveryDistrictData) return deliveryDistrictData;
    const response = await fetch("../asset/json/delivery.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load asset/json/delivery.json");
    const data = await response.json();
    if (!data || !data.districts || typeof data.districts !== "object") {
        throw new Error("delivery.json must contain a districts object.");
    }
    deliveryDistrictData = data.districts;
    return deliveryDistrictData;
}

async function openAddressEditor(address = null) {
    if (!currentUser) return;
    if (!address && allAddresses.length >= 3) {
        alert("You can save up to 3 addresses. Edit or delete an existing address first.");
        return;
    }

    editingAddressId = address?.id || null;
    let districts;
    try {
        districts = await loadDeliveryDistrictData();
    } catch (error) {
        console.error("Delivery district data load failed:", error);
        alert("District list could not be loaded. Check the path ../asset/json/delivery.json.");
        return;
    }

    const existing = address || {};
    const selectedDistrict = existing.district || "";
    const thanaValue = existing.thana || existing.area || "";
    const districtOptions = Object.keys(districts).sort().map(district =>
        `<option value="${escapeAttribute(district)}" ${district === selectedDistrict ? "selected" : ""}>${escapeHTML(district)}</option>`
    ).join("");

    openAccountModal(address ? "Edit delivery address" : "Add delivery address", "address", `
        <div class="account-modal-grid">
            <div class="account-modal-field account-modal-field-full">
                <label class="account-modal-label" for="addressModalName">Full name<span>*</span></label>
                <input class="account-modal-input" id="addressModalName" name="name" required maxlength="100"
                    value="${escapeAttribute(existing.name || existing.fullName || currentUserData.name || currentUser.displayName || "")}">
            </div>
            <div class="account-modal-field">
                <label class="account-modal-label" for="addressModalPhone">Phone number<span>*</span></label>
                <input class="account-modal-input" id="addressModalPhone" name="phone" type="tel" required maxlength="20"
                    placeholder="01XXXXXXXXX" value="${escapeAttribute(existing.phone || existing.phoneNumber || currentUserData.phone || "")}">
            </div>
            <div class="account-modal-field">
                <label class="account-modal-label" for="addressModalDistrict">District<span>*</span></label>
                <select class="account-modal-input" id="addressModalDistrict" name="district" required>
                    <option value="">Select District</option>${districtOptions}
                </select>
            </div>
            <div class="account-modal-field">
                <label class="account-modal-label" for="addressModalThana">Thana / Upazila<span>*</span></label>
                <select class="account-modal-input" id="addressModalThana" name="thana" required disabled>
                    <option value="">Select District First</option>
                </select>
            </div>
            <div class="account-modal-field account-modal-field-full">
                <label class="account-modal-label" for="addressModalText">Full address<span>*</span></label>
                <textarea class="account-modal-input account-modal-textarea" id="addressModalText" name="address" required minlength="5"
                    placeholder="House / Road / Village / Area">${escapeHTML(existing.address || existing.fullAddress || existing.addressLine || "")}</textarea>
            </div>
        </div>
    `);

    const districtSelect = document.getElementById("addressModalDistrict");
    const thanaSelect = document.getElementById("addressModalThana");
    const populateThanas = (district, preferredThana = "") => {
        const thanas = Array.isArray(districts[district]?.thanas) ? districts[district].thanas : [];
        thanaSelect.innerHTML = `<option value="">${thanas.length ? "Select Thana / Upazila" : "No Thana Available"}</option>`;
        thanaSelect.disabled = !thanas.length;
        thanas.forEach(thana => {
            const option = document.createElement("option");
            option.value = thana;
            option.textContent = thana;
            if (thana === preferredThana) option.selected = true;
            thanaSelect.appendChild(option);
        });
    };
    districtSelect.addEventListener("change", () => populateThanas(districtSelect.value));
    if (selectedDistrict) populateThanas(selectedDistrict, thanaValue);
}

async function saveAccountModal(event) {
    event.preventDefault();
    if (!currentUser) return;

    const saveButton = document.getElementById("accountModalSave");
    const form = event.currentTarget;
    const data = new FormData(form);
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = "Saving…";
    modalError("");

    try {
        if (accountModalMode === "profile-name" || accountModalMode === "profile-phone") {
            const field = accountModalMode === "profile-name" ? "name" : "phone";
            const value = String(data.get("value") || "").trim();

            if (field === "name" && value.length < 2) {
                modalError("Please enter a valid name (at least 2 characters).");
                return;
            }
            if (field === "phone" && value && !/^[+0-9()\-\s]{7,20}$/.test(value)) {
                modalError("Please enter a valid phone number.");
                return;
            }

            const updates = { updatedAt: serverTimestamp() };
            if (field === "name") {
                updates.name = value;
                updates.displayName = value;
            } else {
                updates.phone = value;
            }

            await setDoc(doc(db, "users", currentUser.uid), updates, { merge: true });
            if (field === "name" && currentUser.displayName !== value) {
                await updateProfile(currentUser, { displayName: value });
            }
            currentUserData = { ...currentUserData, ...updates, [field]: value };
            await loadUserProfile(currentUser);
            closeAccountModal();
            return;
        }

        if (accountModalMode === "address") {
            const name = String(data.get("name") || "").trim();
            const phone = String(data.get("phone") || "").trim();
            const district = String(data.get("district") || "").trim();
            const thana = String(data.get("thana") || "").trim();
            const addressText = String(data.get("address") || "").trim();

            if (name.length < 2) return modalError("Enter a valid full name.");
            if (!/^01[3-9]\d{8}$/.test(phone)) return modalError("Enter a valid Bangladesh mobile number (01XXXXXXXXX).");
            if (!district) return modalError("Please select a district.");
            if (!thana) return modalError("Please select a Thana / Upazila.");
            if (addressText.length < 5) return modalError("Please enter your complete address.");

            const districts = await loadDeliveryDistrictData();
            if (!Array.isArray(districts[district]?.thanas) || !districts[district].thanas.includes(thana)) {
                return modalError("The selected Thana / Upazila does not match the selected district.");
            }

            const values = { name, phone, district, thana, area: thana, address: addressText, updatedAt: serverTimestamp() };
            const addressCollection = collection(db, "users", currentUser.uid, "addresses");
            if (editingAddressId) {
                await updateDoc(doc(db, "users", currentUser.uid, "addresses", editingAddressId), values);
            } else {
                if (allAddresses.length >= 3) return modalError("You can save up to 3 addresses.");
                await addDoc(addressCollection, { ...values, createdAt: serverTimestamp() });
            }

            await loadAddresses(currentUser.uid);
            closeAccountModal();
        }
    } catch (error) {
        console.error("Account edit save failed:", error);
        modalError("Could not save changes. Check your internet connection and Firestore Security Rules.");
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    }
}

async function removeAddress(addressId) {
    if (!currentUser || !addressId || !confirm("Delete this address?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "addresses", addressId));
        await loadAddresses(currentUser.uid);
    } catch (error) {
        console.error("Delete address failed:", error);
        alert("Could not delete address. Check Firestore rules and try again.");
    }
}

async function resetPassword() {
    const email = currentUser?.email;
    if (!email) return alert("No email is linked to this account.");
    if (!confirm(`Send a password reset link to ${email}?`)) return;
    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset email sent. Please check your inbox and spam folder.");
    } catch (error) {
        console.error("Password reset failed:", error);
        alert(error.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." : "Could not send reset email. Check Firebase Authentication email settings.");
    }
}

function setupOrderFilters() {
    const search = document.getElementById("orderSearch");
    const status = document.getElementById("orderStatusFilter");
    const sort = document.getElementById("orderSort");
    if (search) search.addEventListener("input", () => { orderSearchValue = search.value.trim().toLowerCase(); renderOrders(); });
    if (status) status.addEventListener("change", () => { orderStatusValue = status.value; renderOrders(); });
    if (sort) sort.addEventListener("change", () => { orderSortValue = sort.value; renderOrders(); });
}


function setupWishlistNavigation() {
    const container = document.getElementById("wishlistList");
    if (!container) return;

    container.addEventListener("click", event => {
        const card = event.target.closest(".wishlist-item");

        if (!card || !container.contains(card)) return;

        // NOT FOUND বা STOCK OUT হলে click বন্ধ
        if (card.classList.contains("is-unavailable")) {
            event.preventDefault();
            return;
        }

        const productId = card.dataset.productId?.trim();

        if (!productId) return;

        window.location.href =
            `../product/?id=${encodeURIComponent(productId)}`;
    });
}


// ============================================================
// WISHLIST
// ============================================================


async function loadWishlist(uid) {

    try {

        const wishlistRef =
            collection(
                db,
                "users",
                uid,
                "wishlist"
            );


        const snapshot =
            await getDocs(wishlistRef);

allWishlist = await Promise.all(
    snapshot.docs.map(async (item) => {
        const data = item.data() || {};

        const productId = String(
            data.productId ||
            data.productID ||
            data.product_id ||
            data.id ||
            item.id ||
            ""
        ).trim();

        let availabilityStatus = "not-found";

        if (productId) {
            try {
                const productSnap = await getDoc(
                    doc(db, "products", productId)
                );

                if (productSnap.exists()) {
                    const productData = productSnap.data() || {};
                    const stock = Number(productData.stock ?? 0);

                    availabilityStatus =
                        stock > 0 ? "available" : "stock-out";
                }
            } catch (error) {
                console.error(
                    "Wishlist product check error:",
                    productId,
                    error
                );
            }
        }

        return {
            id: item.id,
            productId,
            name: data.name || "Product",
            image:
                data.image ||
                data.imageUrl ||
                data.thumbnail ||
                "",
            price: data.price ?? data.salePrice ?? 0,
            salePrice: data.salePrice ?? data.discountPrice ?? null,
            addedAt: data.addedAt || null,
            availabilityStatus
        };
    })
);
        // Newest first
        allWishlist.sort(
            (a, b) =>
                getTime(b.addedAt) -
                getTime(a.addedAt)
        );


        setText(
            "wishlistCount",
            allWishlist.length
        );


        renderWishlist();

    } catch (error) {

        console.error(
            "Wishlist error:",
            error
        );

        allWishlist = [];

        setText(
            "wishlistCount",
            "0"
        );

        renderWishlist();

    }

}


// ============================================================
// RENDER WISHLIST
// ============================================================

function renderWishlist() {

    const container =
        document.getElementById(
            "wishlistList"
        );


    if (!container) return;


    if (allWishlist.length === 0) {

        container.innerHTML = `
            <div class="empty-text account-empty-state">
                <div class="empty-icon">♡</div>
                <strong>Wishlist is empty</strong>
                <p>
                    Your saved products will appear here.
                </p>
            </div>
        `;


        updateMoreButton(
            "wishlistMoreBtn",
            0,
            false
        );


        return;

    }


    const visibleItems =
        wishlistExpanded
            ? allWishlist
            : allWishlist.slice(
                0,
                INITIAL_WISHLIST_LIMIT
            );


    container.innerHTML =
        visibleItems
            .map(createWishlistCard)
            .join("");


    updateMoreButton(
        "wishlistMoreBtn",
        allWishlist.length,
        wishlistExpanded
    );

}


// ============================================================
// WISHLIST CARD
// ============================================================


function createWishlistCard(item) {
    const isUnavailable =
        item.availabilityStatus === "not-found" ||
        item.availabilityStatus === "stock-out";

    const badgeText =
        item.availabilityStatus === "not-found"
            ? "NOT FOUND"
            : "STOCK OUT";

    const image = item.image
        ? `
            <img
                src="${escapeAttribute(item.image)}"
                alt="${escapeAttribute(item.name)}"
                loading="lazy"
            >
        `
        : `
            <div class="wishlist-no-image">
                ♡
            </div>
        `;

    const price = formatMoney(
        item.salePrice ?? item.price ?? 0
    );

    return `
        <div
            class="wishlist-item ${isUnavailable ? "is-unavailable" : ""}"
            data-product-id="${escapeAttribute(item.productId)}"
        >
            <div class="wishlist-image">
                ${image}

                ${
                    isUnavailable
                        ? `
                            <div class="wishlist-status-badge">
                                ${badgeText}
                            </div>
                        `
                        : ""
                }
            </div>

            <div class="wishlist-info">
                <h3>${escapeHTML(item.name)}</h3>

                <div class="wishlist-price">
                    ${price}
                </div>
            </div>

            <div class="wishlist-arrow">
                ›
            </div>
        </div>
    `;
}



// ============================================================
// CART
// ============================================================

async function loadCart(uid) {

    try {

        const cartRef =
            collection(
                db,
                "users",
                uid,
                "cart"
            );


        const snapshot =
            await getDocs(cartRef);


        let totalQuantity = 0;


        snapshot.forEach(item => {

            const data =
                item.data() || {};


            const quantity =
                Number(
                    data.quantity ??
                    data.qty ??
                    1
                );


            if (
                Number.isFinite(quantity) &&
                quantity > 0
            ) {

                totalQuantity += quantity;

            }

        });


        setText(
            "cartCount",
            totalQuantity
        );


    } catch (error) {

        console.error(
            "Cart error:",
            error
        );

        setText(
            "cartCount",
            "0"
        );

    }

}


// ============================================================
// ORDERS
// ============================================================

async function loadOrders(uid) {

    try {

        const ordersRef =
            collection(
                db,
                "users",
                uid,
                "orders"
            );


        const snapshot =
            await getDocs(ordersRef);


        allOrders =
            snapshot.docs.map(item => ({

                id: item.id,

                data:
                    item.data() || {}

            }));


        // Newest first
        allOrders.sort(
            (a, b) =>
                getOrderDate(b.data) -
                getOrderDate(a.data)
        );


        setText(
            "orderCount",
            allOrders.length
        );


        renderOrders();

    } catch (error) {

        console.error(
            "Orders error:",
            error
        );

        allOrders = [];

        setText(
            "orderCount",
            "0"
        );

        renderOrders();

    }

}


// ============================================================
// RENDER ORDERS
// ============================================================

function renderOrders() {

    const container =
        document.getElementById(
            "ordersList"
        );


    if (!container) return;


    if (allOrders.length === 0) {

        container.innerHTML = `
            <div class="account-empty-state">
                <div class="empty-icon">📦</div>
                <strong>No orders yet</strong>
                <p>
                    Your orders will appear here.
                </p>
            </div>
        `;


        updateMoreButton(
            "ordersMoreBtn",
            0,
            false
        );


        return;

    }


    let filteredOrders = allOrders.filter(order => {
        const data = order.data || {};
        const status = normalizeStatus(data.status || data.orderStatus || "pending");
        const searchable = `${order.id} ${getOrderItems(data).map(item => item.name || item.productName || "").join(" ")}`.toLowerCase();
        return (orderStatusValue === "all" || status === orderStatusValue) && (!orderSearchValue || searchable.includes(orderSearchValue));
    });
    filteredOrders.sort((a, b) => {
        if (orderSortValue === "oldest") return getOrderDate(a.data) - getOrderDate(b.data);
        if (orderSortValue === "high") return getOrderTotal(b.data) - getOrderTotal(a.data);
        if (orderSortValue === "low") return getOrderTotal(a.data) - getOrderTotal(b.data);
        return getOrderDate(b.data) - getOrderDate(a.data);
    });
    const visibleOrders = ordersExpanded ? filteredOrders : filteredOrders.slice(0, INITIAL_ORDER_LIMIT);
    if (!filteredOrders.length) {
        container.innerHTML = `<div class="account-empty-state"><div class="empty-icon">⌕</div><strong>No matching orders</strong><p>Try changing the search or filters.</p></div>`;
    } else {
        container.innerHTML = visibleOrders.map(createOrderCard).join("");
    }
    updateMoreButton("ordersMoreBtn", filteredOrders.length, ordersExpanded);


    // Open order details
    container
        .querySelectorAll(".order-item")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const orderId =
                        card.dataset.orderId;


                    if (!orderId) return;


                    window.location.href =
                        "../order-details/index.html?orderId=" +
                        encodeURIComponent(orderId);

                }
            );

        });

}


// ============================================================
// CREATE ORDER CARD
// ============================================================

function createOrderCard(order) {

    const data =
        order.data || {};


    const items =
        getOrderItems(data);


    const status =
        normalizeStatus(
            data.status ||
            data.orderStatus ||
            "pending"
        );


    const total =
        getOrderTotal(data);


    const date =
        formatDate(
            getOrderDateValue(data)
        );


    const images =
        createOrderImagesHTML(items);


    const products =
        createOrderProductsHTML(items);


    return `
        <div
            class="order-item"
            data-order-id="${escapeAttribute(order.id)}"
        >

            <div class="order-card-main">

                <div class="order-images">
                    ${images}
                </div>


                <div class="order-card-content">

                    <div class="order-top">

                        <div class="order-id">
                            ${escapeHTML(order.id)}
                        </div>


                        <div
                            class="order-status ${escapeAttribute(status)}"
                        >
                            ${escapeHTML(
        capitalize(status)
    )}
                        </div>

                    </div>


                    <div class="order-products">
                        ${products}
                    </div>


                    <div class="order-bottom">

                        <div class="order-date">
                            ${escapeHTML(date)}
                        </div>


                        <div class="order-total">
                            ${formatMoney(total)}
                        </div>

                    </div>

                </div>

            </div>

        </div>
    `;

}


// ============================================================
// ALL ORDER IMAGES
// ============================================================

function createOrderImagesHTML(items) {

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        return `
            <div class="order-image no-image">
                📦
            </div>
        `;

    }


    return items
        .map(item => {

            const image =
                getItemImage(item);


            const name =
                item.name ||
                item.productName ||
                "Product";


            if (image) {

                return `
                    <div class="order-image">

                        <img
                            src="${escapeAttribute(image)}"
                            alt="${escapeAttribute(name)}"
                            loading="lazy"
                        >

                    </div>
                `;

            }


            return `
                <div class="order-image no-image">
                    📦
                </div>
            `;

        })
        .join("");

}


// ============================================================
// ORDER PRODUCT LIST
// ============================================================

function createOrderProductsHTML(items) {

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        return `
            <div class="order-product-row">
                Order details
            </div>
        `;

    }


    return items
        .map(item => {

            const name =
                item.name ||
                item.productName ||
                "Product";


            const quantity =
                getItemQuantity(item);


            return `
                <div class="order-product-row">

                    <span class="order-product-name">
                        ${escapeHTML(name)}
                    </span>

                    <span class="order-product-qty">
                        ×${quantity}
                    </span>

                </div>
            `;

        })
        .join("");

}


// ============================================================
// GET ORDER ITEMS
// ============================================================

function getOrderItems(data) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        return [];

    }


    const possibleArrays = [

        data.items,

        data.products,

        data.orderItems,

        data.cartItems,

        data.order_items

    ];


    for (const value of possibleArrays) {

        if (Array.isArray(value)) {

            return value;

        }

    }


    // If order itself is a single product
    if (
        data.productId ||
        data.name ||
        data.productName
    ) {

        return [data];

    }


    return [];

}


// ============================================================
// GET PRODUCT IMAGE
// ============================================================

function getItemImage(item) {

    if (
        !item ||
        typeof item !== "object"
    ) {

        return "";

    }


    const directImages = [

        item.image,

        item.imageUrl,

        item.thumbnail,

        item.thumbnailUrl,

        item.productImage

    ];


    for (const image of directImages) {

        if (
            typeof image === "string" &&
            image.trim()
        ) {

            return image.trim();

        }

    }


    // images array
    if (Array.isArray(item.images)) {

        for (const image of item.images) {

            if (
                typeof image === "string" &&
                image.trim()
            ) {

                return image.trim();

            }


            if (
                image &&
                typeof image === "object"
            ) {

                const url =
                    image.url ||
                    image.src ||
                    image.image ||
                    image.imageUrl;


                if (
                    typeof url === "string" &&
                    url.trim()
                ) {

                    return url.trim();

                }

            }

        }

    }


    return "";

}


// ============================================================
// GET ORDER TOTAL
// ============================================================

function getOrderTotal(data) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        return 0;

    }


    // ========================================================
    // YOUR FIRESTORE STRUCTURE
    //
    // pricing:
    //   currency: "BDT"
    //   deliveryCharge: 170
    //   discount: 0
    //   subtotal: 2780
    //   total: 2950
    //
    // ========================================================

    const pricingTotal =
        Number(
            data.pricing?.total
        );


    if (
        Number.isFinite(pricingTotal)
    ) {

        return pricingTotal;

    }


    // ========================================================
    // OTHER POSSIBLE TOTAL FIELDS
    // ========================================================

    const possibleTotals = [

        data.grandTotal,

        data.totalAmount,

        data.orderTotal,

        data.payableAmount,

        data.finalTotal,

        data.totalPrice,

        data.total

    ];


    for (const value of possibleTotals) {

        const number =
            Number(value);


        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }


    // ========================================================
    // FALLBACK
    // ========================================================

    const items =
        getOrderItems(data);


    if (items.length > 0) {

        const itemTotal =
            items.reduce(
                (sum, item) => {

                    const price =
                        getItemPrice(item);


                    const quantity =
                        getItemQuantity(item);


                    return sum +
                        (
                            price *
                            quantity
                        );

                },
                0
            );


        return itemTotal;

    }


    return 0;

}


// ============================================================
// GET PRODUCT PRICE
// ============================================================

function getItemPrice(item) {

    if (
        !item ||
        typeof item !== "object"
    ) {

        return 0;

    }


    const prices = [

        item.salePrice,

        item.discountPrice,

        item.price,

        item.unitPrice,

        item.productPrice,

        item.amount

    ];


    for (const value of prices) {

        const number =
            Number(value);


        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }


    return 0;

}


// ============================================================
// GET QUANTITY
// ============================================================

function getItemQuantity(item) {

    if (
        !item ||
        typeof item !== "object"
    ) {

        return 1;

    }


    const quantity =
        Number(
            item.quantity ??
            item.qty ??
            item.count ??
            1
        );


    if (
        Number.isFinite(quantity) &&
        quantity > 0
    ) {

        return quantity;

    }


    return 1;

}


// ============================================================
// ORDER DATE
// ============================================================

function getOrderDate(data) {

    return getTime(
        getOrderDateValue(data)
    );

}


function getOrderDateValue(data) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        return null;

    }


    return (
        data.createdAt ||
        data.orderDate ||
        data.date ||
        data.timestamp ||
        data.updatedAt ||
        null
    );

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(value) {

    if (!value) {

        return "";

    }


    let date;


    if (
        value &&
        typeof value.toDate === "function"
    ) {

        date = value.toDate();

    } else {

        date = new Date(value);

    }


    if (
        !date ||
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleDateString(
        "en-BD",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ============================================================
// FIRESTORE DATE / TIME
// ============================================================

function getTime(value) {

    if (!value) {

        return 0;

    }


    if (
        value &&
        typeof value.toMillis === "function"
    ) {

        return value.toMillis();

    }


    if (
        value &&
        typeof value.toDate === "function"
    ) {

        return value.toDate().getTime();

    }


    if (value instanceof Date) {

        return value.getTime();

    }


    if (
        typeof value === "number"
    ) {

        return value;

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return 0;

    }


    return date.getTime();

}


// ============================================================
// SEE MORE BUTTON
// ============================================================

function updateMoreButton(
    buttonId,
    total,
    expanded
) {

    const button =
        document.getElementById(
            buttonId
        );


    if (!button) return;


    if (
        total <= 3
    ) {

        button.hidden = true;

        return;

    }


    button.hidden = false;


    button.textContent =
        expanded
            ? "See Less"
            : `See More (${total - 3})`;

}


// ============================================================
// LOAD ADDRESSES
// ============================================================

async function loadAddresses(uid) {
    const countElement = document.getElementById("addressCount");
    const container = document.getElementById("addressList");
    const addButton = document.getElementById("addAddressBtn");
    if (!container) return;
    try {
        const snapshot = await getDocs(collection(db, "users", uid, "addresses"));
        allAddresses = snapshot.docs.map(item => ({ id: item.id, ...(item.data() || {}) }));
        if (countElement) countElement.textContent = allAddresses.length;
        if (addButton) addButton.disabled = allAddresses.length >= 3;
        const note = document.getElementById("addressLimitNote");
        if (note) note.textContent = `${allAddresses.length}/3 addresses saved`;
        container.innerHTML = allAddresses.length
            ? allAddresses.map(createAddressCard).join("")
            : `<div class="account-empty-state"><div class="empty-icon">📍</div><strong>No saved addresses</strong><p>Add an address for faster checkout.</p></div>`;
    } catch (error) {
        console.warn("Address collection load failed:", error);
        if (countElement) countElement.textContent = "0";
        allAddresses = [];
        container.innerHTML = `<p class="empty-text">Could not load addresses. Please refresh and try again.</p>`;
    }
}


// ============================================================
// ADDRESS CARD
// ============================================================

function createAddressCard(address) {
    const name = address.name || address.fullName || "";
    const phone = address.phone || address.phoneNumber || "";
    const addressText = address.address || address.fullAddress || address.addressLine || "";
    const area = address.area || address.thana || "";
    const district = address.district || "";
    return `<article class="address-card">
        <div class="address-card-content">
            <strong>${escapeHTML(name)}</strong>
            <div class="address-phone">${escapeHTML(phone)}</div>
            <div class="address-text">${escapeHTML(addressText)}</div>
            <div class="address-location">${escapeHTML([area, district].filter(Boolean).join(", "))}</div>
        </div>
        <div class="address-actions">
            <button type="button" class="account-action-btn account-action-secondary" data-edit-address="${escapeAttribute(address.id)}">Edit</button>
            <button type="button" class="account-action-btn account-action-danger" data-delete-address="${escapeAttribute(address.id)}">Delete</button>
        </div>
    </article>`;
}

// Address action buttons use event delegation.
document.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit-address]");
    const deleteButton = event.target.closest("[data-delete-address]");
    if (editButton) {
        const address = allAddresses.find(item => item.id === editButton.dataset.editAddress);
        if (address) openAddressEditor(address);
    }
    if (deleteButton) removeAddress(deleteButton.dataset.deleteAddress);
});


// ============================================================
// MONEY
// ============================================================

function formatMoney(value) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "৳0";

    }


    return (
        "৳" +
        number.toLocaleString(
            "en-BD",
            {
                maximumFractionDigits: 2
            }
        )
    );

}


// ============================================================
// STATUS
// ============================================================

function normalizeStatus(status) {

    return String(
        status || "pending"
    )
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");

}


function capitalize(value) {

    if (!value) return "";

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


// ============================================================
// TEXT
// ============================================================

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value ?? "";

    }

}


// ============================================================
// INITIALS
// ============================================================

function getInitials(name) {

    const words =
        String(name || "User")
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    return words
        .slice(0, 2)
        .map(word =>
            word
                .charAt(0)
                .toUpperCase()
        )
        .join("");

}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(value) {

    return escapeHTML(value);

}