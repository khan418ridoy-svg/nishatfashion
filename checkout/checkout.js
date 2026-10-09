/* =========================================================
   NISHAT FASHION
   CHECKOUT.JS
   ========================================================= */

import {
    db,
    auth
} from "../firebase/firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    collection,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   CONFIG
   ========================================================= */

const DELIVERY_JSON_URL =
    "../asset/json/delivery.json";

const CART_KEY =
    "nishat_cart";

const CHECKOUT_ITEMS_KEY =
    "nishat_checkout_items";

const MAX_SAVED_ADDRESSES =
    3;



const BUY_NOW_KEY =
    "nishat_buy_now";


/* =========================================================
   PAYMENT SETTINGS
   ========================================================= */

let PAYMENT_SETTINGS = {

    bkashEnabled: false,

    codEnabled: true,

    bkashDiscountEnabled: false,

    bkashDiscountPercent: 0,

    bkashDiscountMax: 0

};


/* =========================================================
   STATE
   ========================================================= */

let deliveryData = null;

let cart = [];

let checkoutItems = [];

let savedAddresses = [];

let checkoutIndexes = [];

let selectedAddressId = "";

let subtotal = 0;

let deliveryCharge = 0;

let discount = 0;

let grandTotal = 0;


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const districtSelect =
    document.getElementById(
        "district"
    );

const thanaSelect =
    document.getElementById(
        "thana"
    );

const checkoutItemsContainer =
    document.getElementById(
        "checkoutItems"
    );

const subtotalElement =
    document.getElementById(
        "subtotal"
    );

const deliveryElement =
    document.getElementById(
        "deliveryCharge"
    );

const discountElement =
    document.getElementById(
        "discount"
    );

const discountRow =
    document.getElementById(
        "discountRow"
    );

const grandTotalElement =
    document.getElementById(
        "grandTotal"
    );

const itemCountElement =
    document.getElementById(
        "itemCount"
    );

const bkashDiscountInfo =
    document.getElementById(
        "bkashDiscountInfo"
    );

const placeOrderBtn =
    document.getElementById(
        "placeOrderBtn"
    );

const loadingElement =
    document.getElementById(
        "checkoutLoading"
    );


/* =========================================================
   ADDRESS UI
   ========================================================= */

let savedAddressBox = null;


/* =========================================================
   PAGE START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeCheckout
);


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            savedAddresses = [];

            selectedAddressId = "";

            renderSavedAddresses();

            updateAddressInputVisibility();

            return;

        }


        try {

            await loadSavedAddresses();

            renderSavedAddresses();

            updateAddressInputVisibility();

        } catch (error) {

            console.error(
                "Auth address loading error:",
                error
            );

        }

    }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeCheckout() {

    console.log(
        "Nishat Fashion Checkout Started"
    );


    loadCart();


    await loadCheckoutItems();


    await loadDeliveryData();


    await loadStoreSettings();


    loadDistricts();


    renderCheckoutItems();


    setupEvents();


    injectAddressStyles();


    createSavedAddressUI();


    await loadSavedAddresses();


    renderSavedAddresses();


    updateAddressInputVisibility();


    renderPaymentMethods();


    calculateTotals();


    updatePaymentUI();

}


/* =========================================================
   STORE SETTINGS
   ========================================================= */

async function loadStoreSettings() {

    try {

        const settingsRef =
            doc(
                db,
                "settings",
                "store"
            );


        const snapshot =
            await getDoc(
                settingsRef
            );


        if (
            snapshot.exists()
        ) {

            const data =
                snapshot.data();


            PAYMENT_SETTINGS = {

                bkashEnabled:
                    data.bkashEnabled === true,

                codEnabled:
                    data.codEnabled === true,

                bkashDiscountEnabled:
                    data.bkashEnabled === true &&
                    Number(
                        data.bkashDiscount || 0
                    ) > 0,

                bkashDiscountPercent:
                    Math.max(
                        0,
                        Number(
                            data.bkashDiscount || 0
                        )
                    ),

                bkashDiscountMax:
                    Math.max(
                        0,
                        Number(
                            data.bkashDiscountMax || 0
                        )
                    )

            };

        }


        console.log(
            "STORE SETTINGS:",
            PAYMENT_SETTINGS
        );


    } catch (error) {

        console.error(
            "Store settings error:",
            error
        );


        PAYMENT_SETTINGS = {

            bkashEnabled: false,

            codEnabled: true,

            bkashDiscountEnabled: false,

            bkashDiscountPercent: 0,

            bkashDiscountMax: 0

        };

    }

}


/* =========================================================
   CART LOAD
   ========================================================= */

function loadCart() {

    try {

        const savedCart =
            localStorage.getItem(
                CART_KEY
            );


        cart =
            savedCart
                ? JSON.parse(
                    savedCart
                )
                : [];


        if (
            !Array.isArray(cart)
        ) {

            cart = [];

        }


    } catch (error) {

        console.error(
            "Cart loading error:",
            error
        );


        cart = [];

    }

}


/* =========================================================
   CHECKOUT ITEMS
   ========================================================= */

/* =========================================================
   LOAD CHECKOUT ITEMS
========================================================= */

async function loadCheckoutItems() {

    checkoutItems = [];

    /*
     * =====================================================
     * FIRST: BUY NOW
     * =====================================================
     */

    try {

        const buyNowRaw =
            sessionStorage.getItem(
                BUY_NOW_KEY
            );


        if (buyNowRaw) {

            const buyNow =
                JSON.parse(
                    buyNowRaw
                );


            console.log(
                "BUY NOW DATA:",
                buyNow
            );


            if (
                buyNow &&
                buyNow.productId
            ) {

                /*
                 * Product document ID
                 */

                const productRef =
                    doc(
                        db,
                        "products",
                        String(
                            buyNow.productId
                        )
                    );


                const productSnap =
                    await getDoc(
                        productRef
                    );


                if (
                    productSnap.exists()
                ) {

                    const product =
                        productSnap.data();


                    /*
                     * Get product image
                     */

                    let image = "";


                    if (
                        Array.isArray(
                            product.images
                        )
                    ) {

                        image =
                            product.images[0] ||
                            "";

                    } else if (
                        typeof product.images ===
                        "string"
                    ) {

                        image =
                            product.images;

                    } else if (
                        product.image
                    ) {

                        image =
                            product.image;

                    }


                    /*
                     * Get final price
                     */

                    let price =
                        Number(
                            product.salePrice ||
                            product.price ||
                            0
                        );


                    /*
                     * If discountPrice exists
                     * and is lower than current price
                     */

                    const discountPrice =
                        Number(
                            product.discountPrice ||
                            0
                        );


                    if (
                        discountPrice > 0 &&
                        discountPrice < price
                    ) {

                        price =
                            discountPrice;

                    }


                    /*
                     * Create checkout item
                     */

                    checkoutItems = [

                        {

                            productId:
                                productSnap.id,

                            name:
                                product.name ||
                                "Product",

                            price:
                                price,

                            image:
                                image,

                            quantity:
                                Math.max(
                                    1,
                                    Number(
                                        buyNow.quantity ||
                                        1
                                    )
                                ),

                            size:
                                buyNow.size ||
                                "",

                            color:
                                buyNow.color ||
                                "",

                            buyNow:
                                true

                        }

                    ];


                    /*
                     * IMPORTANT
                     *
                     * Buy Now item is NOT from cart.
                     */

                    checkoutIndexes = [];


                    console.log(
                        "BUY NOW CHECKOUT ITEM:",
                        checkoutItems
                    );


                    return;

                }


                /*
                 * Product document not found
                 */

                console.error(
                    "BUY NOW PRODUCT NOT FOUND:",
                    buyNow.productId
                );


                sessionStorage.removeItem(
                    BUY_NOW_KEY
                );

            }

        }

    } catch (error) {

        console.error(
            "Buy Now checkout error:",
            error
        );

    }


    /*
     * =====================================================
     * SECOND: SELECTED CHECKOUT PRODUCTS
     * =====================================================
     */

    try {

        const savedProducts =
            sessionStorage.getItem(
                "nishat_checkout_products"
            );


        if (savedProducts) {

            const selectedProducts =
                JSON.parse(
                    savedProducts
                );


            if (
                Array.isArray(
                    selectedProducts
                ) &&
                selectedProducts.length
            ) {

                checkoutItems =
                    selectedProducts
                        .map(
                            selected => {

                                if (
                                    selected.cartItemId
                                ) {

                                    const firebaseItem =
                                        cart.find(
                                            item =>
                                                item.cartItemId ===
                                                selected.cartItemId
                                        );


                                    if (
                                        firebaseItem
                                    ) {

                                        return {
                                            ...firebaseItem
                                        };

                                    }

                                }


                                const firebaseItem =
                                    cart.find(
                                        item =>

                                            String(
                                                item.productId ||
                                                ""
                                            ) ===
                                            String(
                                                selected.productId ||
                                                ""
                                            ) &&

                                            String(
                                                item.size ||
                                                ""
                                            ) ===
                                            String(
                                                selected.size ||
                                                ""
                                            ) &&

                                            String(
                                                item.color ||
                                                ""
                                            ) ===
                                            String(
                                                selected.color ||
                                                ""
                                            )
                                    );


                                return firebaseItem
                                    ? {
                                        ...firebaseItem
                                    }
                                    : null;

                            }
                        )
                        .filter(Boolean);


                if (
                    checkoutItems.length
                ) {

                    checkoutIndexes =
                        checkoutItems.map(
                            item =>
                                cart.findIndex(
                                    cartItem =>
                                        cartItem.cartItemId ===
                                        item.cartItemId
                                )
                        );


                    return;

                }

            }

        }

    } catch (error) {

        console.error(
            "Checkout products session error:",
            error
        );

    }


    /*
     * =====================================================
     * THIRD: OLD INDEX SYSTEM
     * =====================================================
     */

    try {

        const savedIndexes =
            sessionStorage.getItem(
                CHECKOUT_ITEMS_KEY
            );


        const indexes =
            savedIndexes
                ? JSON.parse(
                    savedIndexes
                )
                : [];


        if (
            Array.isArray(
                indexes
            )
        ) {

            checkoutIndexes =
                indexes
                    .map(Number)
                    .filter(
                        index =>
                            Number.isInteger(
                                index
                            ) &&
                            cart[index]
                    );


            if (
                checkoutIndexes.length
            ) {

                checkoutItems =
                    checkoutIndexes
                        .map(
                            index =>
                                cart[index]
                        )
                        .filter(Boolean);


                return;

            }

        }

    } catch (error) {

        console.error(
            "Checkout index error:",
            error
        );

    }


    /*
     * =====================================================
     * FOURTH: FULL CART
     * =====================================================
     */

    checkoutIndexes = [];

    checkoutItems =
        [...cart];


    console.log(
        "NORMAL CART CHECKOUT:",
        checkoutItems
    );

}


/* =========================================================
   DELIVERY JSON
   ========================================================= */

async function loadDeliveryData() {

    try {

        const response =
            await fetch(
                DELIVERY_JSON_URL
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Delivery JSON load failed"
            );

        }


        deliveryData =
            await response.json();


        if (
            !deliveryData ||
            !deliveryData.districts
        ) {

            throw new Error(
                "Invalid delivery JSON"
            );

        }


    } catch (error) {

        console.error(
            "Delivery JSON error:",
            error
        );


        deliveryData = {

            currency:
                "BDT",

            districts: {

                Dhaka: {

                    charge:
                        70,

                    thanas: [

                        "Dhanmondi",
                        "Mirpur",
                        "Uttara"

                    ]

                }

            }

        };

    }

}


/* =========================================================
   DISTRICTS
   ========================================================= */

function loadDistricts() {

    if (
        !districtSelect
    ) {

        return;

    }


    districtSelect.innerHTML = `

        <option value="">
            Select District
        </option>

    `;


    const districts =
        Object.keys(
            deliveryData?.districts || {}
        ).sort();


    districts.forEach(
        district => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                district;


            option.textContent =
                district;


            districtSelect.appendChild(
                option
            );

        }
    );


    resetThana();

}


/* =========================================================
   THANA
   ========================================================= */

function loadThanas(
    district
) {

    if (
        !thanaSelect
    ) {

        return;

    }


    thanaSelect.innerHTML =
        "";


    if (
        !district
    ) {

        resetThana();

        return;

    }


    const districtData =
        deliveryData
            ?.districts
        ?.[
        district
        ];


    if (
        !districtData
    ) {

        resetThana();

        return;

    }


    const thanas =
        Array.isArray(
            districtData.thanas
        )
            ? districtData.thanas
            : [];


    if (
        !thanas.length
    ) {

        thanaSelect.disabled =
            true;


        thanaSelect.innerHTML = `

            <option value="">
                No Thana Available
            </option>

        `;

        return;

    }


    thanaSelect.disabled =
        false;


    thanaSelect.innerHTML = `

        <option value="">
            Select Thana / Upazila
        </option>

    `;


    thanas.forEach(
        thana => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                thana;


            option.textContent =
                thana;


            thanaSelect.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   RESET THANA
   ========================================================= */

function resetThana() {

    if (
        !thanaSelect
    ) {

        return;

    }


    thanaSelect.disabled =
        true;


    thanaSelect.innerHTML = `

        <option value="">
            Select District First
        </option>

    `;

}









/* =========================================================
   EVENTS
   ========================================================= */

function setupEvents() {


    if (
        districtSelect
    ) {

        districtSelect.addEventListener(
            "change",
            () => {

                loadThanas(
                    districtSelect.value
                );


                clearFieldError(
                    "district"
                );


                updateDeliveryCharge();


                calculateTotals();

            }
        );

    }


    if (
        thanaSelect
    ) {

        thanaSelect.addEventListener(
            "change",
            () => {

                clearFieldError(
                    "thana"
                );


                calculateTotals();

            }
        );

    }


    document
        .querySelectorAll(
            'input[name="paymentMethod"]'
        )
        .forEach(
            input => {

                input.addEventListener(
                    "change",
                    () => {

                        updatePaymentUI();

                        calculateTotals();

                    }
                );

            }
        );


    [
        "customerName",
        "phone",
        "address"

    ].forEach(
        id => {

            const field =
                document.getElementById(
                    id
                );


            if (
                !field
            ) {

                return;

            }


            field.addEventListener(
                "input",
                () => {

                    clearFieldError(
                        id
                    );

                }
            );

        }
    );


    if (
        placeOrderBtn
    ) {

        placeOrderBtn.addEventListener(
            "click",
            placeOrder
        );

    }

}


/* =========================================================
   ADDRESS CSS
   ========================================================= */

function injectAddressStyles() {

    if (
        document.getElementById(
            "nishatCheckoutAddressCSS"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "nishatCheckoutAddressCSS";


    style.textContent = `

        .nf-address-box {

            margin-bottom:18px;

            padding:16px;

            border:1px solid #e5e7eb;

            border-radius:16px;

            background:#fff;

            box-shadow:
                0 6px 24px
                rgba(0,0,0,.05);

        }


        .nf-address-header {

            display:flex;

            align-items:center;

            justify-content:space-between;

            margin-bottom:14px;

        }


        .nf-address-title {

            font-size:18px;

            font-weight:700;

            color:#111827;

        }


        .nf-address-count {

            margin-top:3px;

            font-size:12px;

            color:#6b7280;

        }


        .nf-address-list {

            display:grid;

            gap:10px;

        }


        .nf-address-card {

            width:100%;

            display:block;

            padding:14px;

            text-align:left;

            border:1px solid #e5e7eb;

            border-radius:13px;

            background:#fafafa;

            cursor:pointer;

            transition:.2s ease;

        }


        .nf-address-card:hover {

            border-color:#111827;

        }


        .nf-address-card.selected {

            border:2px solid #111827;

            background:#f8fafc;

        }


        .nf-address-top {

            display:flex;

            justify-content:space-between;

            align-items:center;

            gap:10px;

        }


        .nf-address-name {

            font-size:15px;

            font-weight:700;

            color:#111827;

        }


        .nf-address-badge {

            padding:4px 9px;

            border-radius:20px;

            background:#111827;

            color:#fff;

            font-size:10px;

            font-weight:600;

        }


        .nf-address-info {

            margin-top:8px;

            font-size:13px;

            line-height:1.7;

            color:#6b7280;

        }


        .nf-address-use {

            margin-top:8px;

            font-size:12px;

            font-weight:600;

            color:#111827;

        }


        .nf-address-status {

            margin-top:10px;

            font-size:12px;

            color:#6b7280;

        }


        .nf-address-empty {

            padding:14px;

            text-align:center;

            border:1px dashed #d1d5db;

            border-radius:12px;

            font-size:13px;

            color:#6b7280;

        }


        .nf-address-hidden-fields {

            display:none !important;

        }


        @media(max-width:600px) {

            .nf-address-box {

                padding:13px;

                border-radius:14px;

            }


            .nf-address-title {

                font-size:16px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =========================================================
   CREATE SAVED ADDRESS UI
   ========================================================= */

function createSavedAddressUI() {

    const addressField =
        document.getElementById(
            "address"
        );


    if (
        !addressField
    ) {

        return;

    }


    if (
        document.getElementById(
            "nfSavedAddressBox"
        )
    ) {

        savedAddressBox =
            document.getElementById(
                "nfSavedAddressBox"
            );

        return;

    }


    savedAddressBox =
        document.createElement(
            "section"
        );


    savedAddressBox.id =
        "nfSavedAddressBox";


    savedAddressBox.className =
        "nf-address-box";


    savedAddressBox.innerHTML = `

        <div
            class="nf-address-header"
        >

            <div>

                <div
                    class="nf-address-title"
                >
                    Delivery Address
                </div>

                <div
                    id="nfAddressCount"
                    class="nf-address-count"
                >
                    Loading...
                </div>

            </div>

        </div>


        <div
            id="nfAddressList"
            class="nf-address-list"
        ></div>


        <div
            id="nfAddressStatus"
            class="nf-address-status"
        ></div>

    `;


    const firstAddressGroup =
        document.getElementById(
            "customerName"
        )
            ?.closest(
                ".form-group"
            );


    if (
        firstAddressGroup
    ) {

        firstAddressGroup.parentNode.insertBefore(
            savedAddressBox,
            firstAddressGroup
        );

    } else {

        addressField.parentNode.insertBefore(
            savedAddressBox,
            addressField
        );

    }

}


/* =========================================================
   LOAD SAVED ADDRESSES
   ========================================================= */

async function loadSavedAddresses() {

    const user =
        auth.currentUser;


    if (
        !user
    ) {

        savedAddresses = [];

        return;

    }


    try {

        const addressRef =
            collection(
                db,
                "users",
                user.uid,
                "addresses"
            );


        const snapshot =
            await getDocs(
                addressRef
            );


        savedAddresses =
            snapshot.docs
                .map(
                    addressDoc => ({

                        id:
                            addressDoc.id,

                        ...addressDoc.data()

                    })
                )
                .slice(
                    0,
                    MAX_SAVED_ADDRESSES
                );


        console.log(
            "SAVED ADDRESSES:",
            savedAddresses
        );


    } catch (error) {

        console.error(
            "Address load error:",
            error
        );


        savedAddresses = [];

    }

}


/* =========================================================
   RENDER SAVED ADDRESSES
   ========================================================= */
/* =========================================================
   RENDER SAVED ADDRESSES
   ========================================================= */

function renderSavedAddresses() {

    if (!savedAddressBox) {
        return;
    }

    const list =
        document.getElementById("nfAddressList");

    const count =
        document.getElementById("nfAddressCount");

    const status =
        document.getElementById("nfAddressStatus");


    /* COUNT */

    if (count) {

        count.textContent =
            `${savedAddresses.length}/${MAX_SAVED_ADDRESSES} saved`;

    }


    if (!list) {
        return;
    }


    /* EMPTY */

    if (!savedAddresses.length) {

        list.innerHTML = `
            <div class="nf-address-empty">
                Enter your delivery details below.
                They will be saved automatically
                when you place your order.
            </div>
        `;

    } else {

        list.innerHTML =
            savedAddresses
                .map(address => {

                    const selected =
                        String(address.id) ===
                        String(selectedAddressId);


                    return `
                        <button
                            type="button"
                            class="nf-address-card ${selected ? "selected" : ""
                        }"
                            data-address-id="${escapeAttribute(
                            address.id
                        )}"
                        >

                            <div class="nf-address-top">

                                <span class="nf-address-name">
                                    ${escapeHTML(
                            address.name ||
                            "Saved Address"
                        )}
                                </span>

                                ${selected
                            ? `
                                            <span class="nf-address-badge">
                                                Selected
                                            </span>
                                        `
                            : ""
                        }

                            </div>


                            <div class="nf-address-info">

                                ${escapeHTML(
                            address.phone || ""
                        )}

                                <br>

                                ${escapeHTML(
                            address.district || ""
                        )}

                                ${address.thana
                            ? `
                                            •
                                            ${escapeHTML(
                                address.thana
                            )}
                                        `
                            : ""
                        }

                                <br>

                                ${escapeHTML(
                            address.address || ""
                        )}

                            </div>


                            <div class="nf-address-use">

                                ${selected
                            ? "✓ Selected address"
                            : "Use this address"
                        }

                            </div>

                        </button>
                    `;

                })
                .join("");


        /*
         * IMPORTANT
         * Event delegation
         * Works even after innerHTML changes.
         */

        list.onclick = function (event) {

            const card =
                event.target.closest(
                    "[data-address-id]"
                );


            if (!card) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            const addressId =
                card.getAttribute(
                    "data-address-id"
                );


            console.log(
                "ADDRESS CARD CLICKED:",
                addressId
            );


            useSavedAddress(addressId);

        };

    }


    /* STATUS */

    if (status) {

        if (
            savedAddresses.length >=
            MAX_SAVED_ADDRESSES
        ) {

            status.textContent =
                "3 addresses saved. Select one to continue.";

        } else {

            status.textContent =
                "Your address will be saved automatically when you place the order.";

        }

    }

}


/* =========================================================
   USE SAVED ADDRESS
   ========================================================= */

function useSavedAddress(addressId) {

    console.log(
        "Trying to select address:",
        addressId
    );


    const address =
        savedAddresses.find(
            item =>
                String(item.id) ===
                String(addressId)
        );


    if (!address) {

        console.error(
            "Saved address not found:",
            addressId,
            savedAddresses
        );

        setAddressStatus(
            "Saved address could not be found."
        );

        return;

    }


    /* SET SELECTED ID */

    selectedAddressId =
        String(address.id);


    console.log(
        "SELECTED ADDRESS:",
        selectedAddressId,
        address
    );


    /* NAME */

    const nameField =
        document.getElementById(
            "customerName"
        );

    if (nameField) {

        nameField.value =
            address.name || "";

    }


    /* PHONE */

    const phoneField =
        document.getElementById(
            "phone"
        );

    if (phoneField) {

        phoneField.value =
            address.phone || "";

    }


    /* DISTRICT */

    if (districtSelect) {

        districtSelect.value =
            address.district || "";

        loadThanas(
            address.district || ""
        );

    }


    /* THANA */

    if (thanaSelect) {

        thanaSelect.value =
            address.thana || "";

    }


    /* ADDRESS */

    const addressField =
        document.getElementById(
            "address"
        );

    if (addressField) {

        addressField.value =
            address.address || "";

    }


    /* UPDATE DELIVERY */

    updateDeliveryCharge();

    calculateTotals();


    /* CLEAR ERRORS */

    clearErrors();


    /* RENDER SELECTED STATE */

    renderSavedAddresses();


    /* HIDE INPUTS IF 3 ADDRESSES */

    updateAddressInputVisibility();


    /* STATUS */

    setAddressStatus(
        "✓ Saved address selected."
    );

}


/* =========================================================
   AUTO SAVE CURRENT ADDRESS
   ========================================================= */

async function saveCurrentAddressAutomatically() {

    const user =
        auth.currentUser;


    if (!user) {

        console.error(
            "Cannot save address: user not logged in."
        );

        return null;

    }


    /*
     * Already 3 addresses.
     */

    if (
        savedAddresses.length >=
        MAX_SAVED_ADDRESSES
    ) {

        if (selectedAddressId) {

            return selectedAddressId;

        }

        return null;

    }


    /* GET VALUES */

    const name =
        document
            .getElementById("customerName")
            ?.value
            ?.trim() || "";


    const phone =
        document
            .getElementById("phone")
            ?.value
            ?.trim() || "";


    const district =
        districtSelect?.value || "";


    const thana =
        thanaSelect?.value || "";


    const address =
        document
            .getElementById("address")
            ?.value
            ?.trim() || "";


    console.log(
        "ADDRESS DATA:",
        {
            name,
            phone,
            district,
            thana,
            address
        }
    );


    /* VALIDATE */

    if (
        !name ||
        !phone ||
        !district ||
        !thana ||
        address.length < 5
    ) {

        console.warn(
            "Address not saved: required field missing."
        );

        return null;

    }


    /* CHECK DUPLICATE */

    const existing =
        savedAddresses.find(
            item =>

                String(
                    item.name || ""
                )
                    .trim()
                    .toLowerCase() ===
                name
                    .trim()
                    .toLowerCase()

                &&

                String(
                    item.phone || ""
                )
                    .trim() ===
                phone
                    .trim()

                &&

                String(
                    item.district || ""
                ) ===
                district

                &&

                String(
                    item.thana || ""
                ) ===
                thana

                &&

                String(
                    item.address || ""
                )
                    .trim()
                    .toLowerCase() ===
                address
                    .trim()
                    .toLowerCase()
        );


    if (existing) {

        console.log(
            "Existing address selected:",
            existing.id
        );


        /*
         * IMPORTANT:
         * Actually select the existing address.
         */

        useSavedAddress(
            existing.id
        );


        return existing.id;

    }


    try {

        const addressRef =
            collection(
                db,
                "users",
                user.uid,
                "addresses"
            );


        /* CHECK LATEST COUNT */

        const latest =
            await getDocs(
                addressRef
            );


        if (
            latest.size >=
            MAX_SAVED_ADDRESSES
        ) {

            await loadSavedAddresses();

            renderSavedAddresses();

            updateAddressInputVisibility();


            /*
             * If addresses exist,
             * select first one.
             */

            if (
                savedAddresses.length &&
                !selectedAddressId
            ) {

                useSavedAddress(
                    savedAddresses[0].id
                );

            }


            return selectedAddressId || null;

        }


        /* ADDRESS DATA */

        const addressData = {

            name:
                name,

            phone:
                phone,

            district:
                district,

            thana:
                thana,

            address:
                address,

            createdAt:
                serverTimestamp(),

            updatedAt:
                serverTimestamp()

        };


        console.log(
            "Saving address to Firestore:",
            addressData
        );


        /* SAVE */

        const newAddress =
            await addDoc(
                addressRef,
                addressData
            );


        console.log(
            "ADDRESS SAVED:",
            newAddress.id
        );


        /* RELOAD */

        await loadSavedAddresses();


        /*
         * IMPORTANT:
         * Directly select the newly saved address.
         */

        useSavedAddress(
            newAddress.id
        );


        return newAddress.id;


    } catch (error) {

        console.error(
            "ADDRESS SAVE ERROR:",
            error
        );


        throw error;

    }

}

function updateAddressInputVisibility() {

    const fields = [

        "customerName",

        "phone",

        "district",

        "thana",

        "address"

    ];


    /*
     * Only hide input fields when
     * exactly/at least 3 saved addresses exist.
     */

    const hideFields =
        savedAddresses.length >=
        MAX_SAVED_ADDRESSES;


    fields.forEach(
        id => {

            const field =
                document.getElementById(
                    id
                );


            if (
                !field
            ) {

                return;

            }


            const group =
                field.closest(
                    ".form-group"
                );


            if (
                !group
            ) {

                return;

            }


            group.classList.toggle(
                "nf-address-hidden-fields",
                hideFields
            );

        }
    );


    /*
     * When 3 saved addresses exist,
     * automatically use first one if
     * nothing is selected.
     */

    if (
        hideFields &&
        !selectedAddressId &&
        savedAddresses.length
    ) {

        useSavedAddress(
            savedAddresses[0].id
        );

    }

}

/* =========================================================
   CHECKOUT ITEMS RENDER
   ========================================================= */

function renderCheckoutItems() {

    if (
        !checkoutItemsContainer
    ) {

        return;

    }


    if (
        !checkoutItems.length
    ) {

        checkoutItemsContainer.innerHTML = `

            <div
                style="
                    padding:20px;
                    text-align:center;
                    color:#888;
                "
            >
                Your cart is empty.
            </div>

        `;


        if (
            placeOrderBtn
        ) {

            placeOrderBtn.disabled =
                true;

        }


        return;

    }


    if (
        placeOrderBtn
    ) {

        placeOrderBtn.disabled =
            false;

    }


    checkoutItemsContainer.innerHTML =
        "";


    let totalQuantity =
        0;


    checkoutItems.forEach(
        item => {

            const quantity =
                clampQuantity(
                    Number(
                        item.quantity
                    )
                );


            totalQuantity +=
                quantity;


            const price =
                Number(
                    item.price || 0
                );


            const itemTotal =
                price *
                quantity;


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "checkout-item";


            div.innerHTML = `

                <div
                    class="checkout-item-image"
                >

                    <img
                        src="${escapeAttribute(
                item.image || ""
            )}"
                        alt="${escapeAttribute(
                item.name ||
                "Product"
            )}"
                    >

                </div>


                <div
                    class="checkout-item-info"
                >

                    <p
                        class="checkout-item-name"
                    >
                        ${escapeHTML(
                item.name ||
                "Product"
            )}
                    </p>


                    <div
                        class="checkout-item-meta"
                    >

                        ${item.size
                    ? `
                                    Size:
                                    ${escapeHTML(
                        item.size
                    )}
                                `
                    : ""
                }

                        ${item.color
                    ? `
                                    · Color:
                                    ${escapeHTML(
                        item.color
                    )}
                                `
                    : ""
                }

                        <br>

                        Qty:
                        ${quantity}

                    </div>

                </div>


                <div
                    class="checkout-item-price"
                >
                    ৳${formatMoney(
                    itemTotal
                )}
                </div>

            `;


            checkoutItemsContainer.appendChild(
                div
            );

        }
    );


    if (
        itemCountElement
    ) {

        itemCountElement.textContent =
            `${totalQuantity} ${totalQuantity === 1
                ? "Item"
                : "Items"
            }`;

    }

}


/* =========================================================
   TOTALS
   ========================================================= */

function calculateSubtotal() {

    subtotal = 0;


    checkoutItems.forEach(
        item => {

            const quantity =
                clampQuantity(
                    Number(
                        item.quantity
                    )
                );


            subtotal +=

                Number(
                    item.price || 0
                ) *

                quantity;

        }
    );


    return subtotal;

}


function updateDeliveryCharge() {

    const district =
        districtSelect
            ?.value || "";


    if (
        !district
    ) {

        deliveryCharge =
            0;


        return;

    }


    const districtData =
        deliveryData
            ?.districts
        ?.[
        district
        ];


    deliveryCharge =
        Number(
            districtData?.charge || 0
        );

}


function getPaymentMethod() {

    const selected =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );


    return selected
        ? selected.value
        : "";

}


function calculateDiscount() {

    const method =
        getPaymentMethod();


    if (
        method !==
        "bkash"
    ) {

        return 0;

    }


    if (
        !PAYMENT_SETTINGS.bkashEnabled ||
        !PAYMENT_SETTINGS.bkashDiscountEnabled
    ) {

        return 0;

    }


    const percent =
        Number(
            PAYMENT_SETTINGS
                .bkashDiscountPercent
        );


    const maximum =
        Number(
            PAYMENT_SETTINGS
                .bkashDiscountMax
        );


    const calculated =
        subtotal *
        (
            percent /
            100
        );


    return Math.min(
        calculated,
        maximum
    );

}


function calculateTotals() {

    calculateSubtotal();


    updateDeliveryCharge();


    discount =
        calculateDiscount();


    grandTotal =
        subtotal +
        deliveryCharge -
        discount;


    updateSummaryUI();

}


function updateSummaryUI() {

    if (
        subtotalElement
    ) {

        subtotalElement.textContent =
            `৳${formatMoney(
                subtotal
            )}`;

    }


    if (
        deliveryElement
    ) {

        deliveryElement.textContent =
            deliveryCharge > 0

                ? `৳${formatMoney(
                    deliveryCharge
                )}`

                : "Select district";

    }


    if (
        discountRow
    ) {

        discountRow.classList.toggle(
            "hidden",
            discount <= 0
        );

    }


    if (
        discountElement &&
        discount > 0
    ) {

        discountElement.textContent =
            `-৳${formatMoney(
                discount
            )}`;

    }


    if (
        grandTotalElement
    ) {

        grandTotalElement.textContent =
            `৳${formatMoney(
                grandTotal
            )}`;

    }

}


/* =========================================================
   PAYMENT UI
   ========================================================= */

function renderPaymentMethods() {

    const inputs =
        document.querySelectorAll(
            'input[name="paymentMethod"]'
        );


    inputs.forEach(
        input => {

            const method =
                String(
                    input.value || ""
                )
                    .trim()
                    .toLowerCase();


            const enabled =

                method === "bkash"

                    ? PAYMENT_SETTINGS.bkashEnabled

                    : method === "cod"

                        ? PAYMENT_SETTINGS.codEnabled

                        : true;


            const wrapper =
                input.closest(
                    "label, .payment-option, .payment-method, .payment-item, .form-check, .payment-card"
                ) ||
                input.parentElement;


            if (
                wrapper
            ) {

                wrapper.style.display =
                    enabled
                        ? ""
                        : "none";


                wrapper.classList.toggle(
                    "hidden",
                    !enabled
                );

            }


            input.disabled =
                !enabled;


            if (
                !enabled
            ) {

                input.checked =
                    false;

            }

        }
    );


    const selected =
        document.querySelector(
            'input[name="paymentMethod"]:checked:not(:disabled)'
        );


    if (
        !selected
    ) {

        const first =
            document.querySelector(
                'input[name="paymentMethod"]:not(:disabled)'
            );


        if (
            first
        ) {

            first.checked =
                true;

        }

    }

}


function updatePaymentUI() {

    if (
        !bkashDiscountInfo
    ) {

        return;

    }


    const show =

        getPaymentMethod() ===
        "bkash"

        &&

        PAYMENT_SETTINGS.bkashEnabled

        &&

        PAYMENT_SETTINGS.bkashDiscountEnabled;


    bkashDiscountInfo.classList.toggle(
        "hidden",
        !show
    );

}


function validatePaymentMethod() {

    const selected =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );


    if (
        !selected
    ) {

        alert(
            "Please select a payment method."
        );


        return false;

    }


    if (
        selected.value ===
        "bkash" &&

        !PAYMENT_SETTINGS.bkashEnabled
    ) {

        alert(
            "bKash payment is currently unavailable."
        );


        return false;

    }


    if (
        selected.value ===
        "cod" &&

        !PAYMENT_SETTINGS.codEnabled
    ) {

        alert(
            "Cash on Delivery is currently unavailable."
        );


        return false;

    }


    return true;

}


/* =========================================================
   VALIDATION
   ========================================================= */

function validateCheckout() {

    clearErrors();


    let valid =
        true;


    const name =
        document
            .getElementById(
                "customerName"
            )
            ?.value
            ?.trim() || "";


    const phone =
        document
            .getElementById(
                "phone"
            )
            ?.value
            ?.trim() || "";


    const district =
        districtSelect
            ?.value || "";


    const thana =
        thanaSelect
            ?.value || "";


    const address =
        document
            .getElementById(
                "address"
            )
            ?.value
            ?.trim() || "";


    /*
     * If 3 saved addresses exist,
     * selected address must exist.
     */

    if (
        savedAddresses.length >=
        MAX_SAVED_ADDRESSES
    ) {

        if (
            !selectedAddressId
        ) {

            setAddressStatus(
                "Please select one saved address."
            );


            alert(
                "Please select one of your 3 saved addresses."
            );


            return false;

        }


        return (
            checkoutItems.length > 0
        );

    }


    /* NAME */

    if (
        !name
    ) {

        showError(
            "customerName",
            "Please enter your name."
        );


        valid =
            false;

    }


    /* PHONE */

    if (
        !phone
    ) {

        showError(
            "phone",
            "Please enter your phone number."
        );


        valid =
            false;


    } else if (
        !/^01[3-9]\d{8}$/.test(
            phone
        )
    ) {

        showError(
            "phone",
            "Enter a valid Bangladesh mobile number."
        );


        valid =
            false;

    }


    /* DISTRICT */

    if (
        !district
    ) {

        showError(
            "district",
            "Please select your district."
        );


        valid =
            false;

    }


    const districtData =
        deliveryData
            ?.districts
        ?.[
        district
        ];


    if (
        district &&
        !districtData
    ) {

        showError(
            "district",
            "Selected district is not available."
        );


        valid =
            false;

    }


    /* THANA */

    if (
        !thana
    ) {

        showError(
            "thana",
            "Please select your Thana / Upazila."
        );


        valid =
            false;


    } else if (
        !Array.isArray(
            districtData?.thanas
        ) ||

        !districtData.thanas.includes(
            thana
        )
    ) {

        showError(
            "thana",
            "Please select a valid Thana / Upazila."
        );


        valid =
            false;

    }


    /* ADDRESS */

    if (
        address.length < 5
    ) {

        showError(
            "address",
            "Please enter your complete delivery address."
        );


        valid =
            false;

    }


    /* CART */

    if (
        !checkoutItems.length
    ) {

        alert(
            "Your cart is empty."
        );


        valid =
            false;

    }


    return valid;

}


function showError(
    fieldId,
    message
) {

    const field =
        document.getElementById(
            fieldId
        );


    if (
        !field
    ) {

        return;

    }


    const group =
        field.closest(
            ".form-group"
        );


    if (
        !group
    ) {

        return;

    }


    group.classList.add(
        "error"
    );


    const error =
        group.querySelector(
            ".error-message"
        );


    if (
        error
    ) {

        error.textContent =
            message;

    }

}


function clearFieldError(
    fieldId
) {

    const field =
        document.getElementById(
            fieldId
        );


    if (
        !field
    ) {

        return;

    }


    const group =
        field.closest(
            ".form-group"
        );


    if (
        !group
    ) {

        return;

    }


    group.classList.remove(
        "error"
    );


    const error =
        group.querySelector(
            ".error-message"
        );


    if (
        error
    ) {

        error.textContent =
            "";

    }

}


function clearErrors() {

    document
        .querySelectorAll(
            ".form-group.error"
        )
        .forEach(
            group => {

                group.classList.remove(
                    "error"
                );


                const error =
                    group.querySelector(
                        ".error-message"
                    );


                if (
                    error
                ) {

                    error.textContent =
                        "";

                }

            }
        );

}


/* =========================================================
   PLACE ORDER
   ========================================================= */

async function placeOrder() {

    if (
        !validateCheckout()
    ) {

        return;

    }


    if (
        !validatePaymentMethod()
    ) {

        return;

    }


    const user =
        auth.currentUser;


    if (
        !user
    ) {

        alert(
            "Please login before placing your order."
        );


        window.location.href =
            "../login/index.html";


        return;

    }


    try {

        showLoading();


        /*
         * Automatically save address
         * when Place Order is clicked.
         *
         * If 3 addresses already exist,
         * no new address is created.
         */

        if (
            savedAddresses.length <
            MAX_SAVED_ADDRESSES
        ) {

            await saveCurrentAddressAutomatically();

        }


        /*
         * If there are 3 addresses,
         * make sure selected address exists.
         */

        if (
            savedAddresses.length >=
            MAX_SAVED_ADDRESSES &&
            !selectedAddressId
        ) {

            hideLoading();


            alert(
                "Please select a saved address."
            );


            return;

        }


        calculateTotals();


        const paymentMethod =
            getPaymentMethod();


        const customerName =
            document
                .getElementById(
                    "customerName"
                )
                ?.value
                ?.trim() || "";


        const phone =
            document
                .getElementById(
                    "phone"
                )
                ?.value
                ?.trim() || "";


        const district =
            districtSelect
                ?.value || "";


        const thana =
            thanaSelect
                ?.value || "";


        const address =
            document
                .getElementById(
                    "address"
                )
                ?.value
                ?.trim() || "";


        /*
         * If 3 saved addresses are being used,
         * values should already be loaded into
         * the form.
         */


        const now =
            new Date();


        const year =
            now.getFullYear();


        const month =
            String(
                now.getMonth() + 1
            )
                .padStart(
                    2,
                    "0"
                );


        const day =
            String(
                now.getDate()
            )
                .padStart(
                    2,
                    "0"
                );


        const random =
            Math.floor(
                1000 +
                Math.random() *
                9000
            );


        const orderId =
            `NF-${year}${month}${day}-${random}`;


        /* =================================================
           ORDER DATA
           ================================================= */

        const orderData = {

            orderId:
                orderId,


            userId:
                user.uid,


            customer: {

                name:
                    customerName,

                phone:
                    phone,

                district:
                    district,

                thana:
                    thana,

                address:
                    address

            },


            items:

                checkoutItems.map(
                    item => ({

                        productId:
                            item.productId ||
                            item.id ||
                            "",

                        name:
                            item.name ||
                            "Product",

                        price:
                            Number(
                                item.price ||
                                0
                            ),

                        image:
                            item.image ||
                            "",

                        size:
                            item.size ||
                            "",

                        color:
                            item.color ||
                            "",

                        quantity:
                            clampQuantity(
                                Number(
                                    item.quantity
                                )
                            )

                    })
                ),


            payment: {

                method:
                    paymentMethod,

                status:
                    "pending"

            },


            pricing: {

                subtotal:
                    subtotal,

                deliveryCharge:
                    deliveryCharge,

                discount:
                    discount,

                total:
                    grandTotal,

                currency:
                    deliveryData?.currency ||
                    "BDT"

            },


            orderStatus:
                "pending",


            createdAt:
                serverTimestamp(),


            updatedAt:
                serverTimestamp()

        };


        /* =================================================
           SAVE ORDER
           PATH:

           users/{uid}/orders/{orderId}
           ================================================= */

        await setDoc(

            doc(
                db,
                "users",
                user.uid,
                "orders",
                orderId
            ),

            orderData

        );


        console.log(
            "ORDER SAVED:",
            `users/${user.uid}/orders/${orderId}`
        );


        /* =================================================
           FIRESTORE CART CLEANUP
           ================================================= */

        try {

            await removePurchasedItemsFromFirestoreCart(
                user.uid
            );

        } catch (cartError) {

            console.error(
                "Firestore cart cleanup failed:",
                cartError
            );

        }


        /* =================================================
           LOCAL CART CLEANUP
           ================================================= */

        removePurchasedItemsFromLocalCart();


        /* =================================================
           LOCAL ORDER COPY
           ================================================= */

        const localOrder = {

            ...orderData,

            createdAt:
                new Date()
                    .toISOString(),

            updatedAt:
                new Date()
                    .toISOString()

        };


        sessionStorage.setItem(

            "nishat_checkout_draft",

            JSON.stringify(
                localOrder
            )

        );


        sessionStorage.setItem(

            "nishat_order_id",

            orderId

        );


        sessionStorage.removeItem(
            CHECKOUT_ITEMS_KEY
        );

        sessionStorage.removeItem(
            BUY_NOW_KEY
        );

        sessionStorage.removeItem(
            "nishat_checkout_products"
        );
        /* =================================================
           SUCCESS
           ================================================= */

        window.location.href =
            "../success/index.html";


    } catch (error) {

        console.error(
            "ORDER ERROR:",
            error
        );


        alert(
            "Order place করা যায়নি: " +
            error.message
        );


        hideLoading();

    }

}


/* =========================================================
   FIRESTORE CART CLEANUP
   ========================================================= */

async function removePurchasedItemsFromFirestoreCart(
    uid
) {

    const cartRef =
        collection(
            db,
            "users",
            uid,
            "cart"
        );


    const snapshot =
        await getDocs(
            cartRef
        );


    if (
        snapshot.empty
    ) {

        return;

    }


    for (
        const cartDoc of snapshot.docs
    ) {

        const data =
            cartDoc.data();


        const cartProductId =
            String(
                data.productId ||
                data.id ||
                cartDoc.id
            );


        const cartSize =
            String(
                data.size || ""
            );


        const cartColor =
            String(
                data.color || ""
            );


        const purchased =
            checkoutItems.find(
                item => {

                    const productId =
                        String(
                            item.productId ||
                            item.id ||
                            ""
                        );


                    return (

                        productId ===
                        cartProductId

                        &&

                        String(
                            item.size || ""
                        ) ===
                        cartSize

                        &&

                        String(
                            item.color || ""
                        ) ===
                        cartColor

                    );

                }
            );


        if (
            !purchased
        ) {

            continue;

        }


        const purchasedQty =
            clampQuantity(
                Number(
                    purchased.quantity
                )
            );


        const currentQty =
            clampQuantity(
                Number(
                    data.quantity ||
                    1
                )
            );


        const remainingQty =
            currentQty -
            purchasedQty;


        const cartDocRef =
            doc(
                db,
                "users",
                uid,
                "cart",
                cartDoc.id
            );


        if (
            remainingQty > 0
        ) {

            await updateDoc(
                cartDocRef,
                {

                    quantity:
                        remainingQty,

                    updatedAt:
                        serverTimestamp()

                }
            );


        } else {

            await deleteDoc(
                cartDocRef
            );

        }


        console.log(
            "Firestore cart cleaned:",
            cartDoc.id
        );

    }

}


/* =========================================================
   LOCAL CART CLEANUP
   ========================================================= */

function removePurchasedItemsFromLocalCart() {

    const remaining =
        cart.filter(
            cartItem => {

                const cartProductId =
                    String(
                        cartItem.productId ||
                        cartItem.id ||
                        ""
                    );


                const cartSize =
                    String(
                        cartItem.size || ""
                    );


                const cartColor =
                    String(
                        cartItem.color || ""
                    );


                const purchased =
                    checkoutItems.find(
                        item => {

                            return (

                                String(
                                    item.productId ||
                                    item.id ||
                                    ""
                                ) ===
                                cartProductId

                                &&

                                String(
                                    item.size || ""
                                ) ===
                                cartSize

                                &&

                                String(
                                    item.color || ""
                                ) ===
                                cartColor

                            );

                        }
                    );


                if (
                    !purchased
                ) {

                    return true;

                }


                const purchasedQty =
                    clampQuantity(
                        Number(
                            purchased.quantity
                        )
                    );


                const currentQty =
                    clampQuantity(
                        Number(
                            cartItem.quantity
                        )
                    );


                const remainingQty =
                    currentQty -
                    purchasedQty;


                if (
                    remainingQty > 0
                ) {

                    cartItem.quantity =
                        remainingQty;


                    return true;

                }


                return false;

            }
        );


    cart =
        remaining;


    localStorage.setItem(

        CART_KEY,

        JSON.stringify(
            cart
        )

    );


    console.log(
        "LOCAL CART UPDATED:",
        cart
    );

}


/* =========================================================
   LOADING
   ========================================================= */

function showLoading() {

    if (
        loadingElement
    ) {

        loadingElement.classList.remove(
            "hidden"
        );

    }


    if (
        placeOrderBtn
    ) {

        placeOrderBtn.disabled =
            true;

    }

}


function hideLoading() {

    if (
        loadingElement
    ) {

        loadingElement.classList.add(
            "hidden"
        );

    }


    if (
        placeOrderBtn
    ) {

        placeOrderBtn.disabled =
            false;

    }

}


/* =========================================================
   HELPERS
   ========================================================= */

function clampQuantity(
    quantity
) {

    if (
        !Number.isFinite(
            quantity
        )
    ) {

        return 1;

    }


    return Math.min(

        10,

        Math.max(

            1,

            Math.floor(
                quantity
            )

        )

    );

}


function formatMoney(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(

        "en-BD",

        {

            maximumFractionDigits:
                2

        }

    );

}


function escapeHTML(
    value
) {

    return String(
        value
    ).replace(

        /[&<>"']/g,

        character => ({

            "&":
                "&amp;",

            "<":
                "&lt;",

            ">":
                "&gt;",

            '"':
                "&quot;",

            "'":
                "&#039;"

        })[character]

    );

}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


function setAddressStatus(
    message
) {

    const element =
        document.getElementById(
            "nfAddressStatus"
        );


    if (
        element
    ) {

        element.textContent =
            message;

    }

}