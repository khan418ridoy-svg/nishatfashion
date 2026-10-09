/* =========================================================
   NISHAT FASHION
   CART PAGE

   FIRESTORE:
   users/{uid}/cart/{cartItemId}

   LOCAL STORAGE:
   Cache only

   CHECKOUT:
   sessionStorage
========================================================= */


import {
    waitForAuthUser,
    db
} from "../firebase/firebase.js";


import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// =========================================================
// CONFIG
// =========================================================

const CART_KEY =
    "nishat_cart";

const WISHLIST_KEY =
    "nishat_wishlist";

const CHECKOUT_ITEMS_KEY =
    "nishat_checkout_items";

const CHECKOUT_PRODUCTS_KEY =
    "nishat_checkout_products";

const MAX_QUANTITY =
    10;


// =========================================================
// STATE
// =========================================================

let currentUser = null;

let cart = [];


// =========================================================
// DOM
// =========================================================

const cartContent =
    document.getElementById(
        "cartContent"
    );

const emptyCart =
    document.getElementById(
        "emptyCart"
    );

const cartItems =
    document.getElementById(
        "cartItems"
    );

const selectAll =
    document.getElementById(
        "selectAll"
    );

const removeSelected =
    document.getElementById(
        "removeSelected"
    );

const checkoutBtn =
    document.getElementById(
        "checkoutBtn"
    );

const selectedCount =
    document.getElementById(
        "selectedCount"
    );

const cartSubtotal =
    document.getElementById(
        "cartSubtotal"
    );

const cartTotal =
    document.getElementById(
        "cartTotal"
    );


// =========================================================
// FORMAT PRICE
// =========================================================

function formatPrice(value) {

    const amount =
        Number(value) || 0;

    return (
        "৳" +
        amount.toLocaleString(
            "en-BD"
        )
    );
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    return String(
        value ?? ""
    )
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


// =========================================================
// LOCAL CART
// =========================================================

function getLocalCart() {

    try {

        const data =
            JSON.parse(
                localStorage.getItem(
                    CART_KEY
                ) || "[]"
            );

        return Array.isArray(data)
            ? data
            : [];

    } catch (error) {

        console.error(
            "Local cart read error:",
            error
        );

        return [];
    }
}


function saveLocalCart() {

    try {

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

    } catch (error) {

        console.error(
            "Local cart save error:",
            error
        );
    }
}


// =========================================================
// FIRESTORE CART REF
// =========================================================

function getCartCollectionRef() {

    if (!currentUser) {
        return null;
    }

    return collection(
        db,
        "users",
        currentUser.uid,
        "cart"
    );
}


// =========================================================
// CART ITEM ID
// =========================================================

function createCartItemId(item) {

    const productId =
        String(
            item.productId ||
            item.id ||
            ""
        );

    const size =
        String(
            item.size || ""
        );

    const color =
        String(
            item.color || ""
        );

    return (
        encodeURIComponent(
            productId
        ) +
        "__" +
        encodeURIComponent(
            size
        ) +
        "__" +
        encodeURIComponent(
            color
        )
    );
}


// =========================================================
// LOAD FIRESTORE CART
// =========================================================

async function loadCartFromFirebase() {

    if (!currentUser) {
        return;
    }

    try {

        const cartRef =
            getCartCollectionRef();

        if (!cartRef) {
            return;
        }

        const snapshot =
            await getDocs(
                cartRef
            );

        const firebaseCart = [];

        snapshot.forEach(
            itemDoc => {

                firebaseCart.push({

                    ...itemDoc.data(),

                    cartItemId:
                        itemDoc.id

                });

            }
        );


        // -----------------------------------------------------
        // OLD LOCAL CART MIGRATION
        // -----------------------------------------------------

        if (
            firebaseCart.length === 0 &&
            cart.length > 0
        ) {

            const migrated =
                await migrateLocalCart();

            if (migrated) {
                return;
            }
        }


        // -----------------------------------------------------
        // FIRESTORE SOURCE OF TRUTH
        // -----------------------------------------------------

        cart =
            firebaseCart;

        saveLocalCart();

        renderCart();

    } catch (error) {

        console.error(
            "Firebase cart load error:",
            error
        );

        showToast(
            "Firebase cart load failed"
        );
    }
}


// =========================================================
// MIGRATE LOCAL CART
// =========================================================

async function migrateLocalCart() {

    if (
        !currentUser ||
        !cart.length
    ) {
        return false;
    }

    try {

        for (
            const item of cart
        ) {

            await saveCartItemToFirebase(
                item
            );
        }

        return true;

    } catch (error) {

        console.error(
            "Cart migration error:",
            error
        );

        return false;
    }
}


// =========================================================
// SAVE CART ITEM FIRESTORE
// =========================================================

async function saveCartItemToFirebase(item) {

    if (!currentUser) {

        throw new Error(
            "User not logged in"
        );
    }


    const cartItemId =
        item.cartItemId ||
        createCartItemId(
            item
        );


    const quantity =
        Math.max(
            1,
            Math.min(
                MAX_QUANTITY,
                Number(
                    item.quantity || 1
                )
            )
        );


    /*
     * Support both:
     * item.price
     * item.salePrice
     */

    const price =
        Number(
            item.price ??
            item.salePrice ??
            0
        );


    const cartDocRef =
        doc(
            db,
            "users",
            currentUser.uid,
            "cart",
            cartItemId
        );


    const cartData = {

        cartItemId,

        productId:
            String(
                item.productId ||
                item.id ||
                ""
            ),

        name:
            String(
                item.name ||
                "Product"
            ),

        price,

        image:
            String(
                item.image ||
                item.thumbnail ||
                ""
            ),

        size:
            String(
                item.size ||
                ""
            ),

        color:
            String(
                item.color ||
                ""
            ),

        quantity,

        updatedAt:
            serverTimestamp()

    };


    await setDoc(
        cartDocRef,
        cartData,
        {
            merge: true
        }
    );


    return {

        ...item,

        ...cartData,

        cartItemId

    };
}


// =========================================================
// DELETE FIRESTORE CART ITEM
// =========================================================

async function deleteCartItemFromFirebase(
    item
) {

    if (!currentUser) {
        return;
    }


    const cartItemId =
        item.cartItemId ||
        createCartItemId(
            item
        );


    await deleteDoc(
        doc(
            db,
            "users",
            currentUser.uid,
            "cart",
            cartItemId
        )
    );
}


// =========================================================
// CART COUNT
// =========================================================

function updateCartCount() {

    const count =
        cart.reduce(
            (
                total,
                item
            ) => {

                return (
                    total +
                    Number(
                        item.quantity || 0
                    )
                );

            },
            0
        );


    /*
     * Common header loads asynchronously.
     * So query every time render happens.
     */

    document
        .querySelectorAll(
            ".cart-count"
        )
        .forEach(
            element => {

                element.textContent =
                    count;

            }
        );
}


// =========================================================
// WISHLIST COUNT
// =========================================================

function updateWishlistCount() {

    let wishlist = [];

    try {

        wishlist =
            JSON.parse(
                localStorage.getItem(
                    WISHLIST_KEY
                ) || "[]"
            );

    } catch {

        wishlist = [];
    }


    if (!Array.isArray(wishlist)) {
        wishlist = [];
    }


    document
        .querySelectorAll(
            ".wishlist-count"
        )
        .forEach(
            element => {

                element.textContent =
                    wishlist.length;

            }
        );
}


// =========================================================
// SELECTED INDEXES
// =========================================================

function getSelectedIndexes() {

    return [
        ...document.querySelectorAll(
            ".cart-checkbox:checked"
        )
    ].map(
        checkbox =>
            Number(
                checkbox.dataset.index
            )
    );
}


// =========================================================
// SUMMARY
// =========================================================

function updateSummary() {

    const selected =
        getSelectedIndexes();


    let subtotal = 0;


    selected.forEach(
        index => {

            const item =
                cart[index];

            if (!item) {
                return;
            }


            const price =
                Number(
                    item.price ??
                    item.salePrice ??
                    0
                );


            const quantity =
                Number(
                    item.quantity || 1
                );


            subtotal +=
                price * quantity;
        }
    );


    if (selectedCount) {

        selectedCount.textContent =
            selected.length;

    }


    if (cartSubtotal) {

        cartSubtotal.textContent =
            formatPrice(
                subtotal
            );

    }


    if (cartTotal) {

        cartTotal.textContent =
            formatPrice(
                subtotal
            );

    }


    if (checkoutBtn) {

        checkoutBtn.disabled =
            selected.length === 0;

    }


    // Select All state

    if (!selectAll) {
        return;
    }


    if (!cart.length) {

        selectAll.checked =
            false;

        selectAll.indeterminate =
            false;

        return;
    }


    if (
        selected.length === 0
    ) {

        selectAll.checked =
            false;

        selectAll.indeterminate =
            false;

    } else if (
        selected.length === cart.length
    ) {

        selectAll.checked =
            true;

        selectAll.indeterminate =
            false;

    } else {

        selectAll.checked =
            false;

        selectAll.indeterminate =
            true;

    }
}


// =========================================================
// RENDER CART
// =========================================================

function renderCart() {

    updateCartCount();
    updateWishlistCount();


    if (
        !cartContent ||
        !emptyCart ||
        !cartItems
    ) {
        return;
    }


    // -----------------------------------------------------
    // EMPTY
    // -----------------------------------------------------

    if (!cart.length) {

        cartContent.hidden =
            true;

        emptyCart.hidden =
            false;

        cartItems.innerHTML =
            "";

        updateSummary();

        return;
    }


    // -----------------------------------------------------
    // SHOW
    // -----------------------------------------------------

    cartContent.hidden =
        false;

    emptyCart.hidden =
        true;


    cartItems.innerHTML =
        cart
            .map(
                (
                    item,
                    index
                ) => {


                    const quantity =
                        Math.max(
                            1,
                            Math.min(
                                MAX_QUANTITY,
                                Number(
                                    item.quantity || 1
                                )
                            )
                        );


                    const price =
                        Number(
                            item.price ??
                            item.salePrice ??
                            0
                        );


                    const total =
                        price * quantity;


                    const image =
                        item.image ||
                        item.thumbnail ||
                        "../asset/logo.png";


                    const size =
                        item.size || "";


                    const color =
                        item.color || "";


                    const productId =
                        item.productId ||
                        item.id ||
                        "";


                    return `

                        <article
                            class="cart-item"
                            data-index="${index}"
                        >


                            <!-- CHECKBOX -->

                            <div
                                class="cart-item-check"
                            >

                                <input
                                    type="checkbox"
                                    class="cart-checkbox"
                                    data-index="${index}"
                                    aria-label="Select ${escapeHTML(
                                        item.name
                                    )}"
                                >

                            </div>


                            <!-- IMAGE -->

                            <a
                                class="cart-product-image"
                                href="../product/product.html?id=${encodeURIComponent(
                                    productId
                                )}"
                            >

                                <img
                                    src="${escapeHTML(
                                        image
                                    )}"
                                    alt="${escapeHTML(
                                        item.name ||
                                        "Product"
                                    )}"
                                    loading="lazy"
                                    onerror="
                                        this.onerror=null;
                                        this.src='../asset/logo.png';
                                    "
                                >

                            </a>


                            <!-- PRODUCT INFO -->

                            <div
                                class="cart-product-info"
                            >

                                <h3
                                    class="cart-product-name"
                                >
                                    ${escapeHTML(
                                        item.name ||
                                        "Product"
                                    )}
                                </h3>


                                <div
                                    class="cart-product-meta"
                                >

                                    ${
                                        size
                                            ? `
                                                <span class="cart-meta">
                                                    Size:
                                                    ${escapeHTML(
                                                        size
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }


                                    ${
                                        color
                                            ? `
                                                <span class="cart-meta">
                                                    Color:
                                                    ${escapeHTML(
                                                        color
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }

                                </div>


                                <div
                                    class="cart-product-price"
                                >

                                    ${formatPrice(
                                        price
                                    )}

                                </div>


                                <div
                                    class="cart-product-actions"
                                >

                                    <div
                                        class="quantity-control"
                                    >

                                        <button
                                            type="button"
                                            class="decrease-btn"
                                            data-index="${index}"
                                            aria-label="Decrease quantity"
                                        >
                                            −
                                        </button>


                                        <span
                                            class="quantity-value"
                                        >
                                            ${quantity}
                                        </span>


                                        <button
                                            type="button"
                                            class="increase-btn"
                                            data-index="${index}"
                                            aria-label="Increase quantity"
                                        >
                                            +
                                        </button>

                                    </div>


                                    <button
                                        type="button"
                                        class="cart-remove"
                                        data-index="${index}"
                                    >

                                        <i class="fa-regular fa-trash-can"></i>

                                        Remove

                                    </button>

                                </div>

                            </div>


                            <!-- ITEM TOTAL -->

                            <div
                                class="cart-item-total"
                            >

                                ${formatPrice(
                                    total
                                )}

                            </div>

                        </article>
                    `;
                }
            )
            .join("");


    updateSummary();
}


// =========================================================
// CHANGE QUANTITY
// =========================================================

async function changeQuantity(
    index,
    amount
) {

    const item =
        cart[index];


    if (!item) {
        return;
    }


    const oldQuantity =
        Number(
            item.quantity || 1
        );


    const newQuantity =
        Math.max(
            1,
            Math.min(
                MAX_QUANTITY,
                oldQuantity + amount
            )
        );


    if (
        newQuantity ===
        oldQuantity
    ) {
        return;
    }


    // Instant UI

    item.quantity =
        newQuantity;

    renderCart();


    // Firebase

    try {

        const updated =
            await saveCartItemToFirebase(
                item
            );

        cart[index] =
            updated;

        saveLocalCart();

        renderCart();

    } catch (error) {

        console.error(
            "Quantity update error:",
            error
        );

        showToast(
            "Quantity update করা যায়নি"
        );

        await loadCartFromFirebase();
    }
}


// =========================================================
// REMOVE SINGLE ITEM
// =========================================================

async function removeItem(index) {

    const item =
        cart[index];


    if (!item) {
        return;
    }


    try {

        await deleteCartItemFromFirebase(
            item
        );


        cart.splice(
            index,
            1
        );


        saveLocalCart();

        renderCart();

        showToast(
            "Product removed"
        );

    } catch (error) {

        console.error(
            "Remove product error:",
            error
        );

        showToast(
            "Product remove করা যায়নি"
        );
    }
}


// =========================================================
// REMOVE SELECTED
// =========================================================

async function removeSelectedItems() {

    const selected =
        getSelectedIndexes();


    if (!selected.length) {

        showToast(
            "Please select a product"
        );

        return;
    }


    const selectedItems =
        selected
            .map(
                index =>
                    cart[index]
            )
            .filter(Boolean);


    try {

        for (
            const item of selectedItems
        ) {

            await deleteCartItemFromFirebase(
                item
            );
        }


        const selectedSet =
            new Set(
                selected
            );


        cart =
            cart.filter(
                (
                    item,
                    index
                ) =>
                    !selectedSet.has(
                        index
                    )
            );


        saveLocalCart();

        renderCart();

        showToast(
            "Selected products removed"
        );

    } catch (error) {

        console.error(
            "Remove selected error:",
            error
        );

        showToast(
            "Products remove করা যায়নি"
        );

        await loadCartFromFirebase();
    }
}


// =========================================================
// SELECT ALL
// =========================================================

selectAll?.addEventListener(
    "change",
    () => {

        document
            .querySelectorAll(
                ".cart-checkbox"
            )
            .forEach(
                checkbox => {

                    checkbox.checked =
                        selectAll.checked;

                }
            );

        updateSummary();
    }
);


// =========================================================
// CART CLICK
// =========================================================

cartItems?.addEventListener(
    "click",
    async event => {

        const increase =
            event.target.closest(
                ".increase-btn"
            );


        const decrease =
            event.target.closest(
                ".decrease-btn"
            );


        const remove =
            event.target.closest(
                ".cart-remove"
            );


        if (increase) {

            await changeQuantity(
                Number(
                    increase.dataset.index
                ),
                1
            );

            return;
        }


        if (decrease) {

            await changeQuantity(
                Number(
                    decrease.dataset.index
                ),
                -1
            );

            return;
        }


        if (remove) {

            await removeItem(
                Number(
                    remove.dataset.index
                )
            );
        }
    }
);


// =========================================================
// CHECKBOX CHANGE
// =========================================================

cartItems?.addEventListener(
    "change",
    event => {

        if (
            event.target.matches(
                ".cart-checkbox"
            )
        ) {

            updateSummary();
        }
    }
);


// =========================================================
// REMOVE SELECTED
// =========================================================

removeSelected?.addEventListener(
    "click",
    removeSelectedItems
);


// =========================================================
// CHECKOUT
// =========================================================

checkoutBtn?.addEventListener(
    "click",
    () => {

        const selected =
            getSelectedIndexes();


        if (!selected.length) {

            showToast(
                "Please select at least one product"
            );

            return;
        }


        const selectedItems =
            selected
                .map(
                    index =>
                        cart[index]
                )
                .filter(Boolean);


        sessionStorage.setItem(
            CHECKOUT_ITEMS_KEY,
            JSON.stringify(
                selected
            )
        );


        sessionStorage.setItem(
            CHECKOUT_PRODUCTS_KEY,
            JSON.stringify(
                selectedItems
            )
        );


        window.location.href =
            "../checkout/index.html";
    }
);


// =========================================================
// COMMON HEADER COUNT WATCHER
// =========================================================

/*
 * common.js loads header asynchronously.
 * This observer updates cart/wishlist badges
 * when the header appears.
 */

const headerContainer =
    document.getElementById(
        "header"
    );


if (headerContainer) {

    const observer =
        new MutationObserver(
            () => {

                updateCartCount();
                updateWishlistCount();

            }
        );


    observer.observe(
        headerContainer,
        {
            childList: true,
            subtree: true
        }
    );
}


// =========================================================
// TOAST
// =========================================================

let toastTimer = null;


function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {
        return;
    }


    const text =
        toast.querySelector(
            "span"
        );


    if (text) {

        text.textContent =
            message;
    }


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );
}


// =========================================================
// INITIALIZE
// =========================================================

async function initializeCart() {

    try {

        currentUser =
            await waitForAuthUser();


        if (!currentUser) {

            const redirect =
                encodeURIComponent(
                    window.location.href
                );


            window.location.href =
                `../login/index.html?redirect=${redirect}`;

            return;
        }


        // Local cache first

        cart =
            getLocalCart();


        renderCart();


        // Firebase source of truth

        await loadCartFromFirebase();


    } catch (error) {

        console.error(
            "Cart initialization error:",
            error
        );


        showToast(
            "Cart load করা যায়নি"
        );
    }
}


initializeCart();