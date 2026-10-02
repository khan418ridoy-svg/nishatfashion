// ==========================================
// NISHAT FASHION - MY ACCOUNT JS
// FIRESTORE + LOCAL STORAGE CACHE
// ==========================================

import {
    auth,
    db
} from "../firebase/firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// CACHE SETTINGS
// ==========================================

// Cache 10 minutes valid
const CACHE_TIME = 25 * 60 * 1000;

const CACHE_PREFIX = "nishat_account_";


// ==========================================
// CACHE KEY
// ==========================================

function getCacheKey(uid, type) {

    return `${CACHE_PREFIX}${uid}_${type}`;

}


// ==========================================
// SAVE CACHE
// ==========================================

function saveCache(uid, type, data) {

    try {

        const cacheData = {

            timestamp: Date.now(),

            data: data

        };

        localStorage.setItem(

            getCacheKey(
                uid,
                type
            ),

            JSON.stringify(
                cacheData
            )

        );

    } catch (error) {

        console.warn(
            "Cache save failed:",
            error
        );

    }

}


// ==========================================
// GET CACHE
// ==========================================

function getCache(uid, type) {

    try {

        const key =
            getCacheKey(
                uid,
                type
            );

        const raw =
            localStorage.getItem(
                key
            );


        if (!raw) {

            return null;

        }


        const cache =
            JSON.parse(
                raw
            );


        if (
            !cache ||
            !cache.timestamp ||
            cache.data === undefined
        ) {

            localStorage.removeItem(
                key
            );

            return null;

        }


        // ==================================
        // CHECK CACHE EXPIRY
        // ==================================

        const age =
            Date.now() -
            cache.timestamp;


        if (
            age >
            CACHE_TIME
        ) {

            localStorage.removeItem(
                key
            );

            return null;

        }


        return cache.data;

    } catch (error) {

        console.warn(
            "Cache read failed:",
            error
        );

        return null;

    }

}


// ==========================================
// REMOVE USER CACHE
// ==========================================

function removeAccountCache(uid) {

    const cacheTypes = [

        "profile",

        "wishlist",

        "cart",

        "addresses",

        "orders"

    ];


    cacheTypes.forEach(
        type => {

            try {

                localStorage.removeItem(

                    getCacheKey(
                        uid,
                        type
                    )

                );

            } catch (error) {

                console.warn(
                    "Cache remove failed:",
                    error
                );

            }

        }
    );

}


// ==========================================
// ELEMENTS
// ==========================================

const menuItems =
    document.querySelectorAll(
        ".account-menu-item"
    );


const sections =
    document.querySelectorAll(
        ".account-section"
    );


// ==========================================
// SECTION SWITCH
// ==========================================

menuItems.forEach(
    item => {

        // Logout button section switch করবে না
        if (
            item.id === "logoutBtn"
        ) {

            return;

        }


        item.addEventListener(
            "click",
            () => {

                const target =
                    item.dataset.section;


                if (!target) {

                    return;

                }


                // Remove active menu
                menuItems.forEach(
                    menu => {

                        menu.classList.remove(
                            "active"
                        );

                    }
                );


                // Hide all sections
                sections.forEach(
                    section => {

                        section.classList.remove(
                            "active"
                        );

                    }
                );


                // Active menu
                item.classList.add(
                    "active"
                );


                // Show selected section
                const targetSection =
                    document.getElementById(
                        target
                    );


                if (targetSection) {

                    targetSection.classList.add(
                        "active"
                    );

                }

            }
        );

    }
);


// ==========================================
// AUTH STATE
// ==========================================

onAuthStateChanged(
    auth,
    async user => {

        // ==================================
        // USER NOT LOGGED IN
        // ==================================

        if (!user) {

            window.location.href =
                "../login/login.html";

            return;

        }


        try {

            // ==================================
            // FIREBASE AUTH INFORMATION
            // ==================================

            const name =
                user.displayName ||
                user.email?.split("@")[0] ||
                "User";


            const email =
                user.email ||
                "—";


            // ==================================
            // USER SIDEBAR
            // ==================================

            const userName =
                document.getElementById(
                    "userName"
                );


            const userEmail =
                document.getElementById(
                    "userEmail"
                );


            const userAvatar =
                document.getElementById(
                    "userAvatar"
                );


            if (userName) {

                userName.textContent =
                    name;

            }


            if (userEmail) {

                userEmail.textContent =
                    email;

            }


            if (userAvatar) {

                userAvatar.textContent =
                    name
                        .charAt(0)
                        .toUpperCase();

            }


            // ==================================
            // PROFILE BASIC DATA
            // ==================================

            const profileName =
                document.getElementById(
                    "profileName"
                );


            const profileEmail =
                document.getElementById(
                    "profileEmail"
                );


            const profileUid =
                document.getElementById(
                    "profileUid"
                );


            if (profileName) {

                profileName.textContent =
                    name;

            }


            if (profileEmail) {

                profileEmail.textContent =
                    email;

            }


            if (profileUid) {

                profileUid.textContent =
                    user.uid;

            }


            // ==================================
            // LOAD FIRESTORE DATA
            // ==================================

            await Promise.all([

                loadProfile(
                    user.uid
                ),

                loadWishlist(
                    user.uid
                ),

                loadCart(
                    user.uid
                ),

                loadAddresses(
                    user.uid
                ),

                loadOrders(
                    user.uid
                )

            ]);


        } catch (error) {

            console.error(
                "Account loading error:",
                error
            );

        }

    }
);


// ==========================================
// PROFILE
// users/{uid}/profile/data
// ==========================================

async function loadProfile(uid) {

    // ======================================
    // CHECK CACHE FIRST
    // ======================================

    const cached =
        getCache(
            uid,
            "profile"
        );


    if (cached) {

        applyProfileData(
            cached
        );

        console.log(
            "Profile loaded from cache"
        );

        return;

    }


    // ======================================
    // FIRESTORE
    // ======================================

    try {

        const profileRef =
            doc(
                db,
                "users",
                uid,
                "profile",
                "data"
            );


        const snapshot =
            await getDoc(
                profileRef
            );


        if (!snapshot.exists()) {

            return;

        }


        const data =
            snapshot.data();


        const profileData = {

            name:
                data.name ||
                data.fullName ||
                "User",

            phone:
                data.phone ||
                data.phoneNumber ||
                "—"

        };


        // Save cache
        saveCache(
            uid,
            "profile",
            profileData
        );


        // Apply data
        applyProfileData(
            profileData
        );


        console.log(
            "Profile loaded from Firestore"
        );


    } catch (error) {

        console.error(
            "Profile load error:",
            error
        );

    }

}


// ==========================================
// APPLY PROFILE DATA
// ==========================================

function applyProfileData(data) {

    const name =
        data.name ||
        "User";


    const phone =
        data.phone ||
        "—";


    // Profile name
    const profileName =
        document.getElementById(
            "profileName"
        );


    if (profileName) {

        profileName.textContent =
            name;

    }


    // Profile phone
    const profilePhone =
        document.getElementById(
            "profilePhone"
        );


    if (profilePhone) {

        profilePhone.textContent =
            phone;

    }


    // Sidebar name
    const userName =
        document.getElementById(
            "userName"
        );


    if (userName) {

        userName.textContent =
            name;

    }


    // Avatar
    const userAvatar =
        document.getElementById(
            "userAvatar"
        );


    if (userAvatar) {

        userAvatar.textContent =
            name
                .charAt(0)
                .toUpperCase();

    }

}


// ==========================================
// WISHLIST
// users/{uid}/wishlist/{productId}
// ==========================================

async function loadWishlist(uid) {

    // ======================================
    // CACHE FIRST
    // ======================================

    const cached =
        getCache(
            uid,
            "wishlist"
        );


    if (cached) {

        applyWishlistData(
            cached
        );

        console.log(
            "Wishlist loaded from cache"
        );

        return;

    }


    try {

        const ref =
            collection(
                db,
                "users",
                uid,
                "wishlist"
            );


        const snapshot =
            await getDocs(
                ref
            );


        const wishlistData = {

            count:
                snapshot.size

        };


        // Save cache
        saveCache(
            uid,
            "wishlist",
            wishlistData
        );


        // Apply
        applyWishlistData(
            wishlistData
        );


        console.log(
            "Wishlist loaded from Firestore"
        );


    } catch (error) {

        console.error(
            "Wishlist error:",
            error
        );

    }

}


// ==========================================
// APPLY WISHLIST
// ==========================================

function applyWishlistData(data) {

    const wishlistCount =
        document.getElementById(
            "wishlistCount"
        );


    if (wishlistCount) {

        wishlistCount.textContent =
            Number(
                data.count || 0
            );

    }

}


// ==========================================
// CART
// users/{uid}/cart/{productId}
// ==========================================

async function loadCart(uid) {

    // ======================================
    // CACHE FIRST
    // ======================================

    const cached =
        getCache(
            uid,
            "cart"
        );


    if (cached) {

        applyCartData(
            cached
        );

        console.log(
            "Cart loaded from cache"
        );

        return;

    }


    try {

        const ref =
            collection(
                db,
                "users",
                uid,
                "cart"
            );


        const snapshot =
            await getDocs(
                ref
            );


        let totalQuantity = 0;


        snapshot.forEach(
            item => {

                const data =
                    item.data();


                const quantity =
                    Number(
                        data.quantity ?? 1
                    );


                if (
                    Number.isFinite(
                        quantity
                    ) &&
                    quantity > 0
                ) {

                    totalQuantity +=
                        quantity;

                }

            }
        );


        const cartData = {

            totalQuantity:
                totalQuantity

        };


        // Save cache
        saveCache(
            uid,
            "cart",
            cartData
        );


        // Apply
        applyCartData(
            cartData
        );


        console.log(
            "Cart loaded from Firestore"
        );


    } catch (error) {

        console.error(
            "Cart error:",
            error
        );

    }

}


// ==========================================
// APPLY CART
// ==========================================

function applyCartData(data) {

    const cartCount =
        document.getElementById(
            "cartCount"
        );


    if (cartCount) {

        cartCount.textContent =
            Number(
                data.totalQuantity || 0
            );

    }

}


// ==========================================
// ADDRESSES
// users/{uid}/addresses/{addressId}
// ==========================================

async function loadAddresses(uid) {

    // ======================================
    // CACHE FIRST
    // ======================================

    const cached =
        getCache(
            uid,
            "addresses"
        );


    if (cached) {

        applyAddressesData(
            cached
        );

        console.log(
            "Addresses loaded from cache"
        );

        return;

    }


    try {

        const ref =
            collection(
                db,
                "users",
                uid,
                "addresses"
            );


        const snapshot =
            await getDocs(
                ref
            );


        const addresses = [];


        snapshot.forEach(
            item => {

                const data =
                    item.data();


                addresses.push({

                    id:
                        item.id,

                    name:
                        data.name ||
                        data.fullName ||
                        "Address",

                    phone:
                        data.phone ||
                        data.phoneNumber ||
                        "",

                    address:
                        data.address ||
                        data.fullAddress ||
                        data.street ||
                        "",

                    district:
                        data.district ||
                        ""

                });

            }
        );


        const addressData = {

            count:
                addresses.length,

            addresses:
                addresses

        };


        // Save cache
        saveCache(
            uid,
            "addresses",
            addressData
        );


        // Apply
        applyAddressesData(
            addressData
        );


        console.log(
            "Addresses loaded from Firestore"
        );


    } catch (error) {

        console.error(
            "Address error:",
            error
        );

    }

}


// ==========================================
// APPLY ADDRESSES
// ==========================================

function applyAddressesData(data) {

    const addressCount =
        document.getElementById(
            "addressCount"
        );


    if (addressCount) {

        addressCount.textContent =
            Number(
                data.count || 0
            );

    }


    const container =
        document.getElementById(
            "addressList"
        );


    if (!container) {

        return;

    }


    const addresses =
        Array.isArray(
            data.addresses
        )
            ? data.addresses
            : [];


    // ======================================
    // NO ADDRESS
    // ======================================

    if (
        addresses.length === 0
    ) {

        container.innerHTML = `
            <p class="empty-text">
                No saved addresses.
            </p>
        `;

        return;

    }


    // Clear old data
    container.innerHTML = "";


    // ======================================
    // RENDER ADDRESSES
    // ======================================

    addresses.forEach(
        item => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "address-item";


            div.innerHTML = `

                <strong>
                    ${escapeHTML(
                        item.name
                    )}
                </strong>

                <p>

                    ${escapeHTML(
                        item.phone
                    )}

                    ${
                        item.phone &&
                        item.address
                            ? "<br>"
                            : ""
                    }

                    ${escapeHTML(
                        item.address
                    )}

                    ${
                        item.district
                            ? "<br>" +
                              escapeHTML(
                                  item.district
                              )
                            : ""
                    }

                </p>

            `;


            container.appendChild(
                div
            );

        }
    );

}


// ==========================================
// ORDERS
// users/{uid}/orders/{orderId}
// ==========================================

async function loadOrders(uid) {

    // ======================================
    // CACHE FIRST
    // ======================================

    const cached =
        getCache(
            uid,
            "orders"
        );


    if (cached) {

        applyOrdersData(
            cached
        );

        console.log(
            "Orders loaded from cache"
        );

        return;

    }


    try {

        const ref =
            collection(
                db,
                "users",
                uid,
                "orders"
            );


        const snapshot =
            await getDocs(
                ref
            );


        const orders = [];


        snapshot.forEach(
            item => {

                const data =
                    item.data();


                orders.push({

                    id:
                        item.id,

                    data:
                        data

                });

            }
        );


        const orderData = {

            count:
                orders.length,

            orders:
                orders

        };


        // Save cache
        saveCache(
            uid,
            "orders",
            orderData
        );


        // Apply
        applyOrdersData(
            orderData
        );


        console.log(
            "Orders loaded from Firestore"
        );


    } catch (error) {

        console.error(
            "Orders error:",
            error
        );

    }

}


// ==========================================
// APPLY ORDERS
// ==========================================

function applyOrdersData(data) {

    const orderCount =
        document.getElementById(
            "orderCount"
        );


    if (orderCount) {

        orderCount.textContent =
            Number(
                data.count || 0
            );

    }

}


// ==========================================
// LOGOUT
// ==========================================

async function logout() {

    try {

        const user =
            auth.currentUser;


        // ==================================
        // CLEAR CURRENT USER CACHE
        // ==================================

        if (user) {

            removeAccountCache(
                user.uid
            );

        }


        // ==================================
        // FIREBASE LOGOUT
        // ==================================

        await signOut(
            auth
        );


        // ==================================
        // REDIRECT
        // ==================================

        window.location.href =
            "../login/login.html";


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );


        alert(
            "Logout failed. Please try again."
        );

    }

}


// ==========================================
// LOGOUT BUTTON 1
// ==========================================

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


logoutBtn?.addEventListener(
    "click",
    logout
);


// ==========================================
// LOGOUT BUTTON 2
// ==========================================

const logoutBtn2 =
    document.getElementById(
        "logoutBtn2"
    );


logoutBtn2?.addEventListener(
    "click",
    logout
);


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ==========================================
// DEBUG
// ==========================================

console.log(
    "Nishat Fashion - My Account JS loaded"
);