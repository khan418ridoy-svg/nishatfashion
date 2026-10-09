/* =========================================================
   NISHAT FASHION - HEADER JS
   Dynamic Header Safe Version
   Mobile Menu + Search + Cart/Wishlist Badges
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       PREVENT DUPLICATE INITIALIZATION
    ===================================================== */

    if (window.__NISHAT_HEADER_INITIALIZED__) {
        return;
    }

    window.__NISHAT_HEADER_INITIALIZED__ = true;


    /* =====================================================
       VARIABLES
    ===================================================== */

    let auth = null;
    let db = null;
    let firebaseReady = false;


    /* =====================================================
       HELPER
    ===================================================== */

    const $ = (id) => {
        return document.getElementById(id);
    };


    function setBodyScroll(lock) {

        if (!document.body) {
            return;
        }

        document.body.style.overflow =
            lock ? "hidden" : "";

    }


    /* =====================================================
       WISHLIST COUNT
    ===================================================== */

    function setWishlistCount(count) {

        const total =
            Number(count) || 0;


        const desktopBadge =
            $("nfWishlistCount");

        const mobileBadge =
            $("nfMobileWishlistCount");


        if (desktopBadge) {

            desktopBadge.textContent =
                total;

        }


        if (mobileBadge) {

            mobileBadge.textContent =
                total;

        }

    }


    /* =====================================================
       CART COUNT
    ===================================================== */

    function setCartCount(count) {

        const total =
            Number(count) || 0;


        const desktopBadge =
            $("nfCartCount");

        const mobileBadge =
            $("nfMobileCartCount");


        if (desktopBadge) {

            desktopBadge.textContent =
                total;

        }


        if (mobileBadge) {

            mobileBadge.textContent =
                total;

        }

    }


    /* =====================================================
       LOAD WISHLIST COUNT
    ===================================================== */

    async function loadWishlistCount(uid) {

        if (!db || !uid) {

            setWishlistCount(0);

            return;

        }


        try {

            const {
                collection,
                getDocs
            } = await import(
                "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
            );


            const ref =
                collection(
                    db,
                    "users",
                    uid,
                    "wishlist"
                );


            const snapshot =
                await getDocs(ref);


            setWishlistCount(
                snapshot.size
            );

        } catch (error) {

            console.error(
                "Nishat Fashion: Wishlist count error:",
                error
            );


            setWishlistCount(0);

        }

    }


    /* =====================================================
       LOAD CART COUNT
    ===================================================== */

    async function loadCartCount(uid) {

        if (!db || !uid) {

            setCartCount(0);

            return;

        }


        try {

            const {
                collection,
                getDocs
            } = await import(
                "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
            );


            const ref =
                collection(
                    db,
                    "users",
                    uid,
                    "cart"
                );


            const snapshot =
                await getDocs(ref);


            let totalQuantity = 0;


            snapshot.forEach(
                (cartDoc) => {

                    const data =
                        cartDoc.data() || {};


                    const quantity =
                        Number(
                            data.quantity ?? 1
                        );


                    if (
                        Number.isFinite(quantity) &&
                        quantity > 0
                    ) {

                        totalQuantity +=
                            quantity;

                    }

                }
            );


            setCartCount(
                totalQuantity
            );

        } catch (error) {

            console.error(
                "Nishat Fashion: Cart count error:",
                error
            );


            setCartCount(0);

        }

    }


    /* =====================================================
       FIREBASE BADGES
    ===================================================== */

    async function initFirebaseBadges() {

        try {

            const firebaseModule =
                await import(
                    "../firebase/firebase.js"
                );


            auth =
                firebaseModule.auth;

            db =
                firebaseModule.db;


            if (!auth || !db) {

                throw new Error(
                    "Firebase auth/db not found."
                );

            }


            const {
                onAuthStateChanged
            } = await import(
                "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
            );


            firebaseReady = true;


            onAuthStateChanged(
                auth,
                async (user) => {

                    if (!user) {

                        setWishlistCount(0);

                        setCartCount(0);

                        return;

                    }


                    await Promise.all([
                        loadWishlistCount(
                            user.uid
                        ),

                        loadCartCount(
                            user.uid
                        )
                    ]);

                }
            );


        } catch (error) {

            console.warn(
                "Nishat Fashion: Firebase badge loading skipped.",
                error
            );


            firebaseReady = false;


            setWishlistCount(0);

            setCartCount(0);

        }

    }


    /* =====================================================
       SEARCH
    ===================================================== */

    function openSearch() {

        const searchBox =
            $("nfSearchBox");


        const searchInput =
            $("nfSearchInput");


        if (!searchBox) {

            return;

        }


        searchBox.classList.add(
            "open"
        );


        window.setTimeout(
            () => {

                if (searchInput) {

                    searchInput.focus();

                }

            },
            100
        );

    }


    function closeSearch() {

        const searchBox =
            $("nfSearchBox");


        if (!searchBox) {

            return;

        }


        searchBox.classList.remove(
            "open"
        );

    }


    function initSearch() {

        const searchButton =
            $("nfSearchButton");


        const searchBox =
            $("nfSearchBox");


        const searchInput =
            $("nfSearchInput");


        const mobileSearchButton =
            $("nfMobileSearchButton");


        if (!searchBox) {

            return;

        }


        /* ---------------------------------------------
           DESKTOP SEARCH
        --------------------------------------------- */

        if (searchButton) {

            searchButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    event.stopPropagation();


                    if (
                        searchBox.classList.contains(
                            "open"
                        )
                    ) {

                        closeSearch();

                    } else {

                        openSearch();

                    }

                }
            );

        }


        /* ---------------------------------------------
           MOBILE SEARCH
        --------------------------------------------- */

        if (mobileSearchButton) {

            mobileSearchButton.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                    event.stopPropagation();


                    closeMobileMenu();

                    openSearch();

                }
            );

        }


        /* ---------------------------------------------
           SEARCH SUBMIT
        --------------------------------------------- */

        if (searchInput) {

            searchInput.addEventListener(
                "keydown",
                (event) => {

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        closeSearch();

                    }

                }
            );

        }


        /* ---------------------------------------------
           OUTSIDE CLICK
        --------------------------------------------- */

        if (
            !window.__NISHAT_SEARCH_OUTSIDE_READY__
        ) {

            window.__NISHAT_SEARCH_OUTSIDE_READY__ =
                true;


            document.addEventListener(
                "click",
                (event) => {

                    const currentSearchBox =
                        $("nfSearchBox");


                    if (!currentSearchBox) {

                        return;

                    }


                    if (
                        !currentSearchBox.classList.contains(
                            "open"
                        )
                    ) {

                        return;

                    }


                    const target =
                        event.target;


                    const insideSearch =
                        currentSearchBox.contains(
                            target
                        );


                    const currentSearchButton =
                        $("nfSearchButton");


                    const currentMobileSearch =
                        $("nfMobileSearchButton");


                    const desktopButton =
                        currentSearchButton &&
                        currentSearchButton.contains(
                            target
                        );


                    const mobileButton =
                        currentMobileSearch &&
                        currentMobileSearch.contains(
                            target
                        );


                    if (
                        !insideSearch &&
                        !desktopButton &&
                        !mobileButton
                    ) {

                        closeSearch();

                    }

                },
                false
            );

        }

    }


    /* =====================================================
       CLOSE MOBILE CATEGORY
    ===================================================== */

    function closeMobileCategory() {

        const category =
            $("nfMobileCategory");


        const toggle =
            $("nfCategoryToggle");


        const icon =
            $("nfCategoryIcon");


        if (category) {

            category.classList.remove(
                "open"
            );

        }


        if (toggle) {

            toggle.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        if (icon) {

            icon.textContent =
                "+";

        }

    }


    /* =====================================================
       TOGGLE MOBILE CATEGORY
    ===================================================== */

    function toggleMobileCategory(
        event
    ) {

        if (event) {

            event.preventDefault();

            event.stopPropagation();

        }


        const category =
            $("nfMobileCategory");


        const toggle =
            $("nfCategoryToggle");


        const icon =
            $("nfCategoryIcon");


        if (!category) {

            return;

        }


        const isOpen =
            category.classList.toggle(
                "open"
            );


        if (toggle) {

            toggle.setAttribute(
                "aria-expanded",
                isOpen
                    ? "true"
                    : "false"
            );

        }


        if (icon) {

            icon.textContent =
                isOpen
                    ? "−"
                    : "+";

        }

    }


    /* =====================================================
       CLOSE MOBILE MENU
    ===================================================== */

    function closeMobileMenu() {

        const menu =
            $("nfMobileMenu");


        const overlay =
            $("nfMobileOverlay");


        const button =
            $("nfMenuButton");


        if (menu) {

            menu.classList.remove(
                "open"
            );


            menu.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        if (overlay) {

            overlay.classList.remove(
                "open"
            );


            overlay.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        if (button) {

            button.classList.remove(
                "active"
            );


            button.setAttribute(
                "aria-expanded",
                "false"
            );


            button.setAttribute(
                "aria-label",
                "Open menu"
            );

        }


        closeMobileCategory();


        setBodyScroll(false);

    }


    /* =====================================================
       OPEN MOBILE MENU
    ===================================================== */

    function openMobileMenu() {

        const menu =
            $("nfMobileMenu");


        const overlay =
            $("nfMobileOverlay");


        const button =
            $("nfMenuButton");


        /* ---------------------------------------------
           IMPORTANT:
           Header may not be loaded yet.
        --------------------------------------------- */

        if (!menu) {

            console.warn(
                "Nishat Fashion: Mobile menu is not loaded yet."
            );

            return;

        }


        menu.classList.add(
            "open"
        );


        menu.setAttribute(
            "aria-hidden",
            "false"
        );


        if (overlay) {

            overlay.classList.add(
                "open"
            );


            overlay.setAttribute(
                "aria-hidden",
                "false"
            );

        }


        if (button) {

            button.classList.add(
                "active"
            );


            button.setAttribute(
                "aria-expanded",
                "true"
            );


            button.setAttribute(
                "aria-label",
                "Close menu"
            );

        }


        setBodyScroll(true);

    }


    /* =====================================================
       TOGGLE MOBILE MENU
    ===================================================== */

    function toggleMobileMenu(
        event
    ) {

        if (event) {

            event.preventDefault();

            event.stopPropagation();

        }


        const menu =
            $("nfMobileMenu");


        if (!menu) {

            console.warn(
                "Nishat Fashion: #nfMobileMenu is not available."
            );

            return;

        }


        if (
            menu.classList.contains(
                "open"
            )
        ) {

            closeMobileMenu();

        } else {

            openMobileMenu();

        }

    }


    /* =====================================================
       MOBILE MENU
       DOCUMENT DELEGATION
       
       Header is dynamically injected.
       Therefore we DON'T depend on direct
       button.addEventListener().
    ===================================================== */

    function initMobileMenu() {

        if (
            window.__NISHAT_MOBILE_MENU_READY__
        ) {

            return;

        }


        window.__NISHAT_MOBILE_MENU_READY__ =
            true;


        /* ---------------------------------------------
           CLICK
        --------------------------------------------- */

        document.addEventListener(
            "click",
            (event) => {

                const target =
                    event.target;


                if (!target) {

                    return;

                }


                /* =====================================
                   HAMBURGER
                ===================================== */

                const menuButton =
                    target.closest?.(
                        "#nfMenuButton"
                    );


                if (menuButton) {

                    event.preventDefault();

                    event.stopPropagation();


                    toggleMobileMenu(
                        event
                    );


                    return;

                }


                /* =====================================
                   CLOSE BUTTON
                ===================================== */

                const closeButton =
                    target.closest?.(
                        "#nfMobileClose"
                    );


                if (closeButton) {

                    event.preventDefault();

                    event.stopPropagation();


                    closeMobileMenu();

                    return;

                }


                /* =====================================
                   OVERLAY
                ===================================== */

                const overlay =
                    target.closest?.(
                        "#nfMobileOverlay"
                    );


                if (overlay) {

                    event.preventDefault();

                    event.stopPropagation();


                    closeMobileMenu();

                    return;

                }


                /* =====================================
                   CATEGORY
                ===================================== */

                const categoryToggle =
                    target.closest?.(
                        "#nfCategoryToggle"
                    );


                if (categoryToggle) {

                    event.preventDefault();

                    event.stopPropagation();


                    toggleMobileCategory(
                        event
                    );

                    return;

                }


                /* =====================================
                   MOBILE SEARCH
                ===================================== */

                const mobileSearch =
                    target.closest?.(
                        "#nfMobileSearchButton"
                    );


                if (mobileSearch) {

                    event.preventDefault();

                    event.stopPropagation();


                    closeMobileMenu();

                    openSearch();

                    return;

                }


                /* =====================================
                   MOBILE MENU LINKS
                ===================================== */

                const mobileLink =
                    target.closest?.(
                        "#nfMobileMenu a"
                    );


                if (mobileLink) {

                    closeMobileMenu();

                    return;

                }

            },
            false
        );


        /* ---------------------------------------------
           ESCAPE
        --------------------------------------------- */

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeMobileMenu();

                    closeMobileCategory();

                    closeSearch();

                }

            }
        );


        /* ---------------------------------------------
           RESIZE
        --------------------------------------------- */

        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth > 850
                ) {

                    closeMobileMenu();

                    closeMobileCategory();

                }

            }
        );

    }


    /* =====================================================
       CART UPDATED EVENT
    ===================================================== */
    /* =====================================================
       CART UPDATED EVENT
       Instant UI update + background Firestore sync
    ===================================================== */

    window.addEventListener(
        "nfCartUpdated",
        async (event) => {

            /* -------------------------------------------------
               ১. সাথে সাথে UI update করো (Instant)
            ------------------------------------------------- */

            const desktopBadge =
                $("nfCartCount");

            const mobileBadge =
                $("nfMobileCartCount");


            if (desktopBadge) {

                const current =
                    Number(
                        desktopBadge.textContent
                    ) || 0;

                const detail =
                    event?.detail || {};

                const quantity =
                    Number(
                        detail.quantity || 1
                    ) || 1;


                /* Firestore-এও merge হয়, তাই
                   optimistic ভাবে quantity যোগ করছি না।
                   শুধু header-এ reload করার signal দিচ্ছি। */

            }


            /* -------------------------------------------------
               ২. Background-এ Firestore থেকে সঠিক count আনো
            ------------------------------------------------- */

            if (
                !firebaseReady ||
                !auth?.currentUser
            ) {

                return;

            }


            await loadCartCount(
                auth.currentUser.uid
            );

        }
    );


    /* =====================================================
       WISHLIST UPDATED EVENT
       Instant UI update + background Firestore sync
    ===================================================== */

    window.addEventListener(
        "nfWishlistUpdated",
        async () => {

            if (
                !firebaseReady ||
                !auth?.currentUser
            ) {

                return;

            }


            await loadWishlistCount(
                auth.currentUser.uid
            );

        }
    );


    /* =====================================================
       START HEADER
    ===================================================== */

    function startHeader() {

        /*
         * IMPORTANT:
         * Header HTML has already been injected
         * by common.js before header.js is loaded.
         */

        initMobileMenu();

        initSearch();

        /*
         * Firebase runs separately.
         * Firebase failure will NOT break menu.
         */

        initFirebaseBadges();

    }


    /* =====================================================
       START
       
       Since common.js loads this JS AFTER
       header.html is inserted, we can initialize
       immediately.
    ===================================================== */

    startHeader();


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.NishatHeader = {

        openMobileMenu,

        closeMobileMenu,

        toggleMobileMenu,

        openSearch,

        closeSearch,

        toggleMobileCategory,

        closeMobileCategory

    };


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        "Nishat Fashion Header loaded successfully."
    );


})();