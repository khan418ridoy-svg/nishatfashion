// ==========================================================
// NISHAT FASHION
// PRODUCT DETAILS JS
// ==========================================================
// Features:
// - Product loaded from products.js
// - Product cache
// - Google Sheet approved reviews
// - Initial 3 reviews
// - Load more 10 reviews
// - Firebase cart
// - Firebase wishlist
// - LocalStorage cart cache
// - LocalStorage wishlist cache
// - Size selection
// - Color selection
// - Quantity control
// - Buy Now
// - Related products
// - Error handling
// ==========================================================


// ==========================================================
// FIREBASE
// ==========================================================

import {
    auth,
    db
} from "../firebase/firebase.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


import {
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


import {
    getProducts
} from "../shop/products.js";


// ==========================================================
// CONFIG
// ==========================================================

const CACHE_TIME =
    25 * 60 * 1000;


const PRODUCT_CACHE_PREFIX =
    "nishat_product_";


const CART_KEY =
    "nishat_cart";


const WISHLIST_KEY =
    "nishat_wishlist";


const MAX_QUANTITY =
    99;


// ==========================================================
// GOOGLE SHEET REVIEW API
// ==========================================================

const REVIEWS_API_URL =
    "https://script.google.com/macros/s/AKfycbywWOHsHkWGSybOafWxszeyMV_gng4iWj6zFd1lUw_nQ3rzGcXUvs9xml29XD7kdW6b/exec";


const INITIAL_REVIEWS =
    3;


const MORE_REVIEWS =
    10;


// ==========================================================
// URL PRODUCT ID
// ==========================================================

const params =
    new URLSearchParams(
        window.location.search
    );


const productId =
    params.get("id");


// ==========================================================
// STATE
// ==========================================================

let currentProduct = null;

let allProducts = [];

let selectedSizeValue = "";

let selectedColorValue = "";

let reviews = [];

let reviewsLoaded = 0;

let reviewsLoading = false;

let reviewsHasMore = true;

let currentUser = null;


// ==========================================================
// DOM
// ==========================================================

const loading =
    document.getElementById(
        "productLoading"
    );


const errorBox =
    document.getElementById(
        "productError"
    );


const productDetails =
    document.getElementById(
        "productDetails"
    );


const productImage =
    document.getElementById(
        "productImage"
    );


const productThumbnails =
    document.getElementById(
        "productThumbnails"
    );


const productCategory =
    document.getElementById(
        "productCategory"
    );


const productName =
    document.getElementById(
        "productName"
    );


const productRating =
    document.getElementById(
        "productRating"
    );


const reviewCount =
    document.getElementById(
        "reviewCount"
    );


const productPrice =
    document.getElementById(
        "productPrice"
    );


const productStock =
    document.getElementById(
        "productStock"
    );


const productDescription =
    document.getElementById(
        "productDescription"
    );


const productCode =
    document.getElementById(
        "productCode"
    );


const productMetaCategory =
    document.getElementById(
        "productMetaCategory"
    );


const quantityInput =
    document.getElementById(
        "quantity"
    );


const quantityMinus =
    document.getElementById(
        "quantityMinus"
    );


const quantityPlus =
    document.getElementById(
        "quantityPlus"
    );


const sizeSection =
    document.getElementById(
        "sizeSection"
    );


const sizeOptions =
    document.getElementById(
        "sizeOptions"
    );


const selectedSize =
    document.getElementById(
        "selectedSize"
    );


const colorSection =
    document.getElementById(
        "colorSection"
    );


const colorOptions =
    document.getElementById(
        "colorOptions"
    );


const selectedColor =
    document.getElementById(
        "selectedColor"
    );


const addToCartBtn =
    document.getElementById(
        "addToCartBtn"
    );


const buyNowBtn =
    document.getElementById(
        "buyNowBtn"
    );


const wishlistBtn =
    document.getElementById(
        "wishlistBtn"
    );


// ==========================================================
// REVIEW DOM
// ==========================================================

const reviewsSection =
    document.getElementById(
        "reviewsSection"
    );


const reviewsList =
    document.getElementById(
        "reviewsList"
    );


const loadMoreReviewsBtn =
    document.getElementById(
        "loadMoreReviews"
    );


// ==========================================================
// RELATED DOM
// ==========================================================

const relatedSection =
    document.getElementById(
        "relatedSection"
    );


const relatedProducts =
    document.getElementById(
        "relatedProducts"
    );


// ==========================================================
// AUTH STATE
// ==========================================================

onAuthStateChanged(
    auth,
    user => {

        currentUser =
            user;

        updateWishlistButton();

    }
);


// ==========================================================
// START
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        startProductPage();

    }
);


// ==========================================================
// START PRODUCT PAGE
// ==========================================================

async function startProductPage() {

    try {

        if (!productId) {

            showError();

            return;

        }


        await loadProduct(
            productId
        );


    } catch (error) {

        console.error(
            "Product page error:",
            error
        );

        showError();

    }

}


// ==========================================================
// PRODUCT CACHE KEY
// ==========================================================

function getProductCacheKey(
    id
) {

    return `${PRODUCT_CACHE_PREFIX}${id}`;

}


// ==========================================================
// SAVE PRODUCT CACHE
// ==========================================================

function saveProductCache(
    id,
    data
) {

    try {

        localStorage.setItem(
            getProductCacheKey(id),
            JSON.stringify({

                timestamp:
                    Date.now(),

                data:
                    data

            })
        );

    } catch (error) {

        console.warn(
            "Product cache save failed:",
            error
        );

    }

}


// ==========================================================
// GET PRODUCT CACHE
// ==========================================================

function getProductCache(
    id
) {

    try {

        const raw =
            localStorage.getItem(
                getProductCacheKey(id)
            );


        if (!raw) {

            return null;

        }


        const cache =
            JSON.parse(raw);


        if (
            !cache ||
            !cache.timestamp ||
            !cache.data
        ) {

            localStorage.removeItem(
                getProductCacheKey(id)
            );

            return null;

        }


        const age =
            Date.now() -
            cache.timestamp;


        if (
            age > CACHE_TIME
        ) {

            localStorage.removeItem(
                getProductCacheKey(id)
            );

            return null;

        }


        return cache.data;


    } catch (error) {

        console.warn(
            "Product cache read failed:",
            error
        );

        return null;

    }

}


// ==========================================================
// LOAD PRODUCT
// ==========================================================

async function loadProduct(
    id
) {

    try {

        // --------------------------------------------------
        // 1. PRODUCT-SPECIFIC CACHE
        // --------------------------------------------------

        const cached =
            getProductCache(id);


        if (cached) {

            currentProduct =
                normalizeProduct(
                    cached,
                    id
                );


            renderProduct(
                currentProduct
            );


            // Related products from products.js
            await loadAllProductsForRelated();


            return;

        }


        // --------------------------------------------------
        // 2. PRODUCTS.JS CACHE
        // --------------------------------------------------

        allProducts =
            await getProducts();


        if (
            !Array.isArray(
                allProducts
            )
        ) {

            allProducts = [];

        }


        const found =
            allProducts.find(
                product => {

                    const itemId =
                        product.id ??
                        product.productId;


                    return String(
                        itemId
                    ) === String(id);

                }
            );


        if (!found) {

            showError();

            return;

        }


        currentProduct =
            normalizeProduct(
                found,
                id
            );


        saveProductCache(
            id,
            currentProduct
        );


        renderProduct(
            currentProduct
        );


        // Related products
        renderRelatedProducts(
            currentProduct,
            allProducts
        );


    } catch (error) {

        console.error(
            "Product load error:",
            error
        );

        showError();

    }

}


// ==========================================================
// LOAD ALL PRODUCTS FOR RELATED
// ==========================================================

async function loadAllProductsForRelated() {

    try {

        allProducts =
            await getProducts();


        if (
            !Array.isArray(
                allProducts
            )
        ) {

            allProducts = [];

        }


        renderRelatedProducts(
            currentProduct,
            allProducts
        );


    } catch (error) {

        console.warn(
            "Related products error:",
            error
        );

    }

}


// ==========================================================
// NORMALIZE PRODUCT
// ==========================================================

function normalizeProduct(
    product,
    fallbackId
) {

    if (!product) {

        return null;

    }


    return {

        ...product,

        id:
            product.id ??
            product.productId ??
            fallbackId

    };

}


// ==========================================================
// RENDER PRODUCT
// ==========================================================

function renderProduct(
    product
) {

    if (!product) {

        showError();

        return;

    }


    // Hide loading
    loading?.classList.add(
        "hidden"
    );


    // Hide error
    errorBox?.classList.add(
        "hidden"
    );


    // Show details
    productDetails?.classList.remove(
        "hidden"
    );


    // --------------------------------------------------
    // PRODUCT NAME
    // --------------------------------------------------

    const name =
        product.name ||
        product.title ||
        "Product";


    if (productName) {

        productName.textContent =
            name;

    }


    document.title =
        `${name} - Nishat Fashion`;


    // --------------------------------------------------
    // CATEGORY
    // --------------------------------------------------

    const category =
        product.category ||
        product.categoryName ||
        "";


    if (productCategory) {

        productCategory.textContent =
            category;

    }


    if (productMetaCategory) {

        productMetaCategory.textContent =
            category ||
            "—";

    }


    // --------------------------------------------------
    // PRICE
    // --------------------------------------------------

    const price =
        Number(
            product.salePrice ??
            product.price ??
            0
        );


    if (productPrice) {

        productPrice.textContent =
            formatPrice(price);

    }


    // --------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------

    if (productDescription) {

        productDescription.textContent =
            product.description ||
            product.shortDescription ||
            "No description available.";

    }


    // --------------------------------------------------
    // PRODUCT CODE
    // --------------------------------------------------

    if (productCode) {

        productCode.textContent =
            product.code ||
            product.sku ||
            product.id ||
            "—";

    }


    // --------------------------------------------------
    // STOCK
    // --------------------------------------------------

    renderStock(
        product
    );


    // --------------------------------------------------
    // IMAGES
    // --------------------------------------------------

    renderImages(
        product
    );


    // --------------------------------------------------
    // SIZE
    // --------------------------------------------------

    renderSizes(
        product
    );


    // --------------------------------------------------
    // COLOR
    // --------------------------------------------------

    renderColors(
        product
    );


    // --------------------------------------------------
    // RATING
    // --------------------------------------------------

    const rating =
        Number(
            product.rating || 0
        );


    const count =
        Number(
            product.reviewCount || 0
        );


    if (productRating) {

        productRating.textContent =
            getStars(rating);

    }


    if (reviewCount) {

        reviewCount.textContent =
            `(${count} reviews)`;

    }


    // --------------------------------------------------
    // REVIEWS
    // --------------------------------------------------

    loadReviews(
        product.id
    );


    // --------------------------------------------------
    // WISHLIST
    // --------------------------------------------------

    updateWishlistButton();

}


// ==========================================================
// FORMAT PRICE
// ==========================================================

function formatPrice(
    value
) {

    const number =
        Number(value) || 0;


    return new Intl.NumberFormat(
        "en-BD"
    ).format(
        number
    ) + " ৳";

}


// ==========================================================
// GET STARS
// ==========================================================

function getStars(
    rating
) {

    const value =
        Math.max(
            0,
            Math.min(
                5,
                Number(rating) || 0
            )
        );


    const full =
        Math.floor(value);


    const half =
        value - full >= 0.5
            ? 1
            : 0;


    const empty =
        5 -
        full -
        half;


    return (
        "★".repeat(full) +
        (half ? "½" : "") +
        "☆".repeat(empty)
    );

}


// ==========================================================
// STOCK
// ==========================================================

function renderStock(
    product
) {

    if (!productStock) {

        return;

    }


    const stock =
        Number(
            product.stock ??
            product.quantity ??
            0
        );


    productStock.classList.remove(
        "out-of-stock"
    );


    if (
        stock <= 0
    ) {

        productStock.textContent =
            "Out of stock";


        productStock.classList.add(
            "out-of-stock"
        );


        if (addToCartBtn) {

            addToCartBtn.disabled =
                true;

        }


        if (buyNowBtn) {

            buyNowBtn.disabled =
                true;

        }


        return;

    }


    productStock.textContent =
        `${stock} available`;


    if (addToCartBtn) {

        addToCartBtn.disabled =
            false;

    }


    if (buyNowBtn) {

        buyNowBtn.disabled =
            false;

    }


    if (quantityInput) {

        quantityInput.max =
            Math.min(
                MAX_QUANTITY,
                stock
            );

    }

}


// ==========================================================
// PRODUCT IMAGES
// ==========================================================

function getProductImages(
    product
) {

    const images = [];


    // Array images
    if (
        Array.isArray(
            product.images
        )
    ) {

        product.images.forEach(
            image => {

                if (
                    typeof image ===
                        "string" &&
                    image.trim()
                ) {

                    images.push(
                        image.trim()
                    );

                }

            }
        );

    }


    // Main image
    if (
        product.image &&
        typeof product.image ===
            "string"
    ) {

        if (
            !images.includes(
                product.image
            )
        ) {

            images.unshift(
                product.image
            );

        }

    }


    // imageUrl
    if (
        product.imageUrl &&
        typeof product.imageUrl ===
            "string"
    ) {

        if (
            !images.includes(
                product.imageUrl
            )
        ) {

            images.unshift(
                product.imageUrl
            );

        }

    }


    // image1
    if (
        product.image1 &&
        typeof product.image1 ===
            "string"
    ) {

        if (
            !images.includes(
                product.image1
            )
        ) {

            images.unshift(
                product.image1
            );

        }

    }


    return [
        ...new Set(
            images.filter(Boolean)
        )
    ];

}


// ==========================================================
// RENDER IMAGES
// ==========================================================

function renderImages(
    product
) {

    const images =
        getProductImages(
            product
        );


    if (
        !productImage
    ) {

        return;

    }


    if (
        images.length === 0
    ) {

        productImage.src =
            "https://via.placeholder.com/800x900?text=Nishat+Fashion";

        productImage.alt =
            product.name ||
            "Product";


        if (productThumbnails) {

            productThumbnails.innerHTML =
                "";

        }


        return;

    }


    // Main image
    productImage.src =
        images[0];


    productImage.alt =
        product.name ||
        "Nishat Fashion Product";


    // Thumbnails
    if (!productThumbnails) {

        return;

    }


    productThumbnails.innerHTML =
        "";


    images.forEach(
        (
            image,
            index
        ) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "product-thumbnail";


            button.setAttribute(
                "aria-label",
                `View product image ${index + 1}`
            );


            if (
                index === 0
            ) {

                button.classList.add(
                    "active"
                );

            }


            const img =
                document.createElement(
                    "img"
                );


            img.src =
                image;


            img.alt =
                `${product.name || "Product"} image ${index + 1}`;


            img.loading =
                index === 0
                    ? "eager"
                    : "lazy";


            img.onerror =
                () => {

                    img.style.opacity =
                        "0.35";

                };


            button.appendChild(
                img
            );


            button.addEventListener(
                "click",
                () => {

                    productImage.src =
                        image;


                    document
                        .querySelectorAll(
                            ".product-thumbnail"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );

                }
            );


            productThumbnails.appendChild(
                button
            );

        }
    );

}


// ==========================================================
// SIZE
// ==========================================================

function renderSizes(
    product
) {

    const sizes =
        Array.isArray(
            product.sizes
        )
            ? product.sizes
            : [];


    if (
        sizes.length === 0
    ) {

        sizeSection?.classList.add(
            "hidden"
        );

        selectedSizeValue =
            "";

        return;

    }


    sizeSection?.classList.remove(
        "hidden"
    );


    if (!sizeOptions) {

        return;

    }


    sizeOptions.innerHTML =
        "";


    selectedSizeValue =
        "";


    if (selectedSize) {

        selectedSize.textContent =
            "Select";

    }


    sizes.forEach(
        size => {

            const value =
                String(size);


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "option-btn";


            button.textContent =
                value;


            button.addEventListener(
                "click",
                () => {

                    selectedSizeValue =
                        value;


                    if (selectedSize) {

                        selectedSize.textContent =
                            value;

                    }


                    sizeOptions
                        .querySelectorAll(
                            ".option-btn"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );

                }
            );


            sizeOptions.appendChild(
                button
            );

        }
    );

}


// ==========================================================
// COLOR
// ==========================================================

function renderColors(
    product
) {

    const colors =
        Array.isArray(
            product.colors
        )
            ? product.colors
            : [];


    if (
        colors.length === 0
    ) {

        colorSection?.classList.add(
            "hidden"
        );

        selectedColorValue =
            "";

        return;

    }


    colorSection?.classList.remove(
        "hidden"
    );


    if (!colorOptions) {

        return;

    }


    colorOptions.innerHTML =
        "";


    selectedColorValue =
        "";


    if (selectedColor) {

        selectedColor.textContent =
            "Select";

    }


    colors.forEach(
        color => {

            const value =
                String(color);


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "option-btn";


            button.textContent =
                value;


            button.addEventListener(
                "click",
                () => {

                    selectedColorValue =
                        value;


                    if (selectedColor) {

                        selectedColor.textContent =
                            value;

                    }


                    colorOptions
                        .querySelectorAll(
                            ".option-btn"
                        )
                        .forEach(
                            item => {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                    button.classList.add(
                        "active"
                    );

                }
            );


            colorOptions.appendChild(
                button
            );

        }
    );

}


// ==========================================================
// QUANTITY
// ==========================================================

quantityMinus?.addEventListener(
    "click",
    () => {

        let quantity =
            Number(
                quantityInput?.value
            ) || 1;


        quantity =
            Math.max(
                1,
                quantity - 1
            );


        if (quantityInput) {

            quantityInput.value =
                quantity;

        }

    }
);


quantityPlus?.addEventListener(
    "click",
    () => {

        let quantity =
            Number(
                quantityInput?.value
            ) || 1;


        const stock =
            Number(
                currentProduct?.stock ??
                currentProduct?.quantity ??
                MAX_QUANTITY
            );


        const max =
            Math.min(
                MAX_QUANTITY,
                stock > 0
                    ? stock
                    : MAX_QUANTITY
            );


        quantity =
            Math.min(
                max,
                quantity + 1
            );


        if (quantityInput) {

            quantityInput.value =
                quantity;

        }

    }
);


quantityInput?.addEventListener(
    "change",
    () => {

        let quantity =
            Number(
                quantityInput.value
            ) || 1;


        const stock =
            Number(
                currentProduct?.stock ??
                currentProduct?.quantity ??
                MAX_QUANTITY
            );


        const max =
            Math.min(
                MAX_QUANTITY,
                stock > 0
                    ? stock
                    : MAX_QUANTITY
            );


        quantity =
            Math.max(
                1,
                Math.min(
                    max,
                    quantity
                )
            );


        quantityInput.value =
            quantity;

    }
);


// ==========================================================
// GET QUANTITY
// ==========================================================

function getQuantity() {

    let quantity =
        Number(
            quantityInput?.value
        ) || 1;


    const stock =
        Number(
            currentProduct?.stock ??
            currentProduct?.quantity ??
            MAX_QUANTITY
        );


    const max =
        Math.min(
            MAX_QUANTITY,
            stock > 0
                ? stock
                : MAX_QUANTITY
        );


    quantity =
        Math.max(
            1,
            Math.min(
                quantity,
                max
            )
        );


    if (quantityInput) {

        quantityInput.value =
            quantity;

    }


    return quantity;

}


// ==========================================================
// CHECK LOGIN
// ==========================================================

function requireLogin() {

    if (auth.currentUser) {

        return true;

    }


    const redirect =
        encodeURIComponent(
            window.location.href
        );


    window.location.href =
        `../login/login.html?redirect=${redirect}`;


    return false;

}


// ==========================================================
// ADD TO CART
// ==========================================================

addToCartBtn?.addEventListener(
    "click",
    async () => {

        if (!currentProduct) {

            return;

        }


        if (!requireLogin()) {

            return;

        }


        const quantity =
            getQuantity();


        const productId =
            currentProduct.id;


        const cartRef =
            doc(
                db,
                "users",
                auth.currentUser.uid,
                "cart",
                String(productId)
            );


        const image =
            getProductImages(
                currentProduct
            )[0] || "";


        const item = {

            productId:
                productId,

            name:
                currentProduct.name ||
                currentProduct.title ||
                "Product",

            price:
                Number(
                    currentProduct.salePrice ??
                    currentProduct.price ??
                    0
                ),

            image:
                image,

            quantity:
                quantity,

            size:
                selectedSizeValue,

            color:
                selectedColorValue,

            updatedAt:
                serverTimestamp()

        };


        try {

            setButtonLoading(
                addToCartBtn,
                true,
                "Adding..."
            );


            await setDoc(
                cartRef,
                item,
                {
                    merge: true
                }
            );


            updateLocalCartCache(
                currentProduct,
                quantity
            );


            setButtonLoading(
                addToCartBtn,
                false,
                "Add to Cart"
            );


            showToast(
                "Product added to cart."
            );


        } catch (error) {

            console.error(
                "Add to cart error:",
                error
            );


            setButtonLoading(
                addToCartBtn,
                false,
                "Add to Cart"
            );


            showToast(
                "Could not add product to cart."
            );

        }

    }
);


// ==========================================================
// LOCAL CART CACHE
// ==========================================================

function updateLocalCartCache(
    product,
    quantity
) {

    try {

        const raw =
            localStorage.getItem(
                CART_KEY
            );


        let cart =
            raw
                ? JSON.parse(raw)
                : [];


        if (
            !Array.isArray(cart)
        ) {

            cart = [];

        }


        const productId =
            product.id;


        const existingIndex =
            cart.findIndex(
                item =>
                    String(
                        item.productId ??
                        item.id
                    ) ===
                    String(productId)
            );


        const item = {

            productId:
                productId,

            name:
                product.name ||
                product.title ||
                "Product",

            price:
                Number(
                    product.salePrice ??
                    product.price ??
                    0
                ),

            image:
                getProductImages(
                    product
                )[0] || "",

            quantity:
                quantity,

            size:
                selectedSizeValue,

            color:
                selectedColorValue

        };


        if (
            existingIndex >= 0
        ) {

            cart[
                existingIndex
            ] = {

                ...cart[
                    existingIndex
                ],

                ...item

            };

        } else {

            cart.push(
                item
            );

        }


        localStorage.setItem(
            CART_KEY,
            JSON.stringify(
                cart
            )
        );


    } catch (error) {

        console.warn(
            "Local cart cache error:",
            error
        );

    }

}


// ==========================================================
// BUY NOW
// ==========================================================

buyNowBtn?.addEventListener(
    "click",
    async () => {

        if (!currentProduct) {

            return;

        }


        if (!requireLogin()) {

            return;

        }


        const quantity =
            getQuantity();


        const checkoutData = {

            productId:
                currentProduct.id,

            quantity:
                quantity,

            size:
                selectedSizeValue,

            color:
                selectedColorValue

        };


        try {

            sessionStorage.setItem(
                "nishat_buy_now",
                JSON.stringify(
                    checkoutData
                )
            );


            window.location.href =
                "../checkout/checkout.html";


        } catch (error) {

            console.error(
                "Buy now error:",
                error
            );

        }

    }
);


// ==========================================================
// WISHLIST
// ==========================================================

wishlistBtn?.addEventListener(
    "click",
    async () => {

        if (!currentProduct) {

            return;

        }


        if (!requireLogin()) {

            return;

        }


        const productId =
            String(
                currentProduct.id
            );


        const wishlistRef =
            doc(
                db,
                "users",
                auth.currentUser.uid,
                "wishlist",
                productId
            );


        const isActive =
            wishlistBtn.classList.contains(
                "active"
            );


        try {

            wishlistBtn.disabled =
                true;


            if (isActive) {

                await deleteDoc(
                    wishlistRef
                );


                wishlistBtn.classList.remove(
                    "active"
                );


                wishlistBtn.textContent =
                    "♡";


                removeLocalWishlist(
                    productId
                );


                showToast(
                    "Removed from wishlist."
                );


            } else {

                const image =
                    getProductImages(
                        currentProduct
                    )[0] || "";


                await setDoc(
                    wishlistRef,
                    {

                        productId:
                            productId,

                        name:
                            currentProduct.name ||
                            currentProduct.title ||
                            "Product",

                        price:
                            Number(
                                currentProduct.salePrice ??
                                currentProduct.price ??
                                0
                            ),

                        image:
                            image,

                        addedAt:
                            serverTimestamp()

                    },
                    {
                        merge: true
                    }
                );


                wishlistBtn.classList.add(
                    "active"
                );


                wishlistBtn.textContent =
                    "♥";


                saveLocalWishlist(
                    currentProduct
                );


                showToast(
                    "Added to wishlist."
                );

            }


        } catch (error) {

            console.error(
                "Wishlist error:",
                error
            );


            showToast(
                "Wishlist update failed."
            );


        } finally {

            wishlistBtn.disabled =
                false;

        }

    }
);


// ==========================================================
// UPDATE WISHLIST BUTTON
// ==========================================================

function updateWishlistButton() {

    if (
        !wishlistBtn ||
        !currentProduct
    ) {

        return;

    }


    const id =
        String(
            currentProduct.id
        );


    const list =
        getLocalWishlist();


    const exists =
        list.some(
            item =>
                String(
                    item.productId ??
                    item.id
                ) === id
        );


    if (exists) {

        wishlistBtn.classList.add(
            "active"
        );


        wishlistBtn.textContent =
            "♥";


    } else {

        wishlistBtn.classList.remove(
            "active"
        );


        wishlistBtn.textContent =
            "♡";

    }

}


// ==========================================================
// LOCAL WISHLIST
// ==========================================================

function getLocalWishlist() {

    try {

        const raw =
            localStorage.getItem(
                WISHLIST_KEY
            );


        const list =
            raw
                ? JSON.parse(raw)
                : [];


        return Array.isArray(list)
            ? list
            : [];


    } catch {

        return [];

    }

}


// ==========================================================
// SAVE LOCAL WISHLIST
// ==========================================================

function saveLocalWishlist(
    product
) {

    try {

        const list =
            getLocalWishlist();


        const id =
            String(
                product.id
            );


        const exists =
            list.some(
                item =>
                    String(
                        item.productId ??
                        item.id
                    ) === id
            );


        if (!exists) {

            list.push({

                productId:
                    product.id,

                name:
                    product.name ||
                    product.title ||
                    "Product",

                price:
                    Number(
                        product.salePrice ??
                        product.price ??
                        0
                    ),

                image:
                    getProductImages(
                        product
                    )[0] || ""

            });

        }


        localStorage.setItem(
            WISHLIST_KEY,
            JSON.stringify(
                list
            )
        );


    } catch (error) {

        console.warn(
            "Wishlist cache error:",
            error
        );

    }

}


// ==========================================================
// REMOVE LOCAL WISHLIST
// ==========================================================

function removeLocalWishlist(
    productId
) {

    try {

        const list =
            getLocalWishlist()
                .filter(
                    item =>
                        String(
                            item.productId ??
                            item.id
                        ) !==
                        String(productId)
                );


        localStorage.setItem(
            WISHLIST_KEY,
            JSON.stringify(
                list
            )
        );


    } catch (error) {

        console.warn(
            "Remove wishlist cache error:",
            error
        );

    }

}


// ==========================================================
// RELATED PRODUCTS
// ==========================================================

function renderRelatedProducts(
    product,
    products
) {

    if (
        !relatedSection ||
        !relatedProducts ||
        !product
    ) {

        return;

    }


    if (
        !Array.isArray(products)
    ) {

        relatedSection.classList.add(
            "hidden"
        );

        return;

    }


    const currentId =
        String(
            product.id
        );


    const category =
        String(
            product.category ||
            product.categoryName ||
            ""
        )
            .trim()
            .toLowerCase();


    let related =
        products.filter(
            item => {

                const id =
                    String(
                        item.id ??
                        item.productId ??
                        ""
                    );


                if (
                    id === currentId
                ) {

                    return false;

                }


                const itemCategory =
                    String(
                        item.category ||
                        item.categoryName ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                return (
                    category &&
                    itemCategory ===
                        category
                );

            }
        );


    // If same category products are not enough,
    // use other products.
    if (
        related.length < 4
    ) {

        const fallback =
            products.filter(
                item => {

                    const id =
                        String(
                            item.id ??
                            item.productId ??
                            ""
                        );


                    if (
                        id === currentId
                    ) {

                        return false;

                    }


                    return !related.some(
                        relatedItem =>
                            String(
                                relatedItem.id ??
                                relatedItem.productId
                            ) === id
                    );

                }
            );


        related.push(
            ...fallback
        );

    }


    related =
        related.slice(
            0,
            4
        );


    if (
        related.length === 0
    ) {

        relatedSection.classList.add(
            "hidden"
        );

        return;

    }


    relatedSection.classList.remove(
        "hidden"
    );


    relatedProducts.innerHTML =
        related
            .map(
                item =>
                    createRelatedProductHTML(
                        item
                    )
            )
            .join("");


}


// ==========================================================
// RELATED PRODUCT HTML
// ==========================================================

function createRelatedProductHTML(
    product
) {

    const id =
        product.id ??
        product.productId ??
        "";


    const name =
        product.name ||
        product.title ||
        "Product";


    const price =
        Number(
            product.salePrice ??
            product.price ??
            0
        );


    const image =
        getProductImages(
            product
        )[0] || "";


    return `

        <a
            class="related-card"
            href="./product.html?id=${encodeURIComponent(id)}"
        >

            <div class="related-card-image">

                ${
                    image
                        ? `
                            <img
                                src="${escapeHTML(image)}"
                                alt="${escapeHTML(name)}"
                                loading="lazy"
                            >
                        `
                        : `
                            <div class="related-no-image">
                                Nishat Fashion
                            </div>
                        `
                }

            </div>


            <div class="related-card-info">

                <div class="related-card-name">
                    ${escapeHTML(name)}
                </div>


                <div class="related-card-price">
                    ${formatPrice(price)}
                </div>

            </div>

        </a>

    `;

}


// ==========================================================
// REVIEWS
// ==========================================================

async function loadReviews(
    id
) {

    if (!reviewsList) {

        return;

    }


    reviews = [];

    reviewsLoaded = 0;

    reviewsHasMore = true;


    if (reviewsSection) {

        reviewsSection.classList.remove(
            "hidden"
        );

    }


    reviewsList.innerHTML = `

        <div class="reviews-loading">
            Loading reviews...
        </div>

    `;


    if (loadMoreReviewsBtn) {

        loadMoreReviewsBtn.style.display =
            "none";

    }


    await fetchReviews(
        id,
        INITIAL_REVIEWS
    );

}


// ==========================================================
// FETCH REVIEWS
// ==========================================================

async function fetchReviews(
    id,
    limitCount
) {

    if (
        reviewsLoading ||
        !reviewsHasMore
    ) {

        return;

    }


    reviewsLoading =
        true;


    try {

        const offset =
            reviewsLoaded;


        const url =
            new URL(
                REVIEWS_API_URL
            );


        url.searchParams.set(
            "action",
            "reviews"
        );


        url.searchParams.set(
            "productId",
            String(id)
        );


        url.searchParams.set(
            "status",
            "approved"
        );


        url.searchParams.set(
            "limit",
            String(limitCount)
        );


        url.searchParams.set(
            "offset",
            String(offset)
        );


        const response =
            await fetch(
                url.toString(),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Review API HTTP ${response.status}`
            );

        }


        const result =
            await response.json();


        let newReviews =
            [];


        if (
            Array.isArray(result)
        ) {

            newReviews =
                result;

        } else if (
            Array.isArray(
                result?.reviews
            )
        ) {

            newReviews =
                result.reviews;

        } else if (
            Array.isArray(
                result?.data
            )
        ) {

            newReviews =
                result.data;

        }


        // Approved only
        newReviews =
            newReviews.filter(
                review => {

                    const status =
                        String(
                            review.status ??
                            "approved"
                        )
                            .trim()
                            .toLowerCase();


                    return (
                        status ===
                        "approved"
                    );

                }
            );


        reviews.push(
            ...newReviews
        );


        reviewsLoaded =
            reviews.length;


        if (
            newReviews.length <
            limitCount
        ) {

            reviewsHasMore =
                false;

        }


        renderReviews();


    } catch (error) {

        console.error(
            "Reviews loading error:",
            error
        );


        if (
            reviews.length === 0
        ) {

            reviewsList.innerHTML = `

                <div class="reviews-empty">

                    Reviews could not be loaded.

                </div>

            `;

        }


    } finally {

        reviewsLoading =
            false;

    }

}


// ==========================================================
// LOAD MORE REVIEWS
// ==========================================================

loadMoreReviewsBtn?.addEventListener(
    "click",
    async () => {

        if (
            !currentProduct ||
            reviewsLoading ||
            !reviewsHasMore
        ) {

            return;

        }


        const oldText =
            loadMoreReviewsBtn.textContent;


        loadMoreReviewsBtn.disabled =
            true;


        loadMoreReviewsBtn.textContent =
            "Loading...";


        await fetchReviews(
            currentProduct.id,
            MORE_REVIEWS
        );


        loadMoreReviewsBtn.disabled =
            false;


        loadMoreReviewsBtn.textContent =
            oldText ||
            "Load More Reviews";

    }
);


// ==========================================================
// RENDER REVIEWS
// ==========================================================

function renderReviews() {

    if (!reviewsList) {

        return;

    }


    if (
        reviews.length === 0
    ) {

        reviewsList.innerHTML = `

            <div class="reviews-empty">

                <div class="reviews-empty-icon">
                    ★
                </div>

                <div>
                    No reviews yet.
                </div>

            </div>

        `;


        if (loadMoreReviewsBtn) {

            loadMoreReviewsBtn.style.display =
                "none";

        }


        return;

    }


    reviewsList.innerHTML =
        reviews
            .map(
                review =>
                    createReviewHTML(
                        review
                    )
            )
            .join("");


    // IMPORTANT:
    // Button is outside reviewsList in HTML.
    if (loadMoreReviewsBtn) {

        loadMoreReviewsBtn.style.display =
            reviewsHasMore
                ? "block"
                : "none";

    }

}


// ==========================================================
// CREATE REVIEW HTML
// ==========================================================

function createReviewHTML(
    review
) {

    const name =
        review.userName ||
        review.name ||
        "Customer";


    const rating =
        Math.max(
            0,
            Math.min(
                5,
                Number(
                    review.rating || 0
                )
            )
        );


    const text =
        review.reviewText ||
        review.review ||
        review.comment ||
        "";


    const date =
        formatReviewDate(
            review.updatedAt ||
            review.createdAt ||
            review.date
        );


    const images =
        getReviewImages(
            review
        );


    const imagesHTML =
        images.length
            ? `

                <div class="review-images">

                    ${images
                        .map(
                            image => `

                                <a
                                    href="${escapeHTML(image)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >

                                    <img
                                        src="${escapeHTML(image)}"
                                        alt="Customer review image"
                                        loading="lazy"
                                    >

                                </a>

                            `
                        )
                        .join("")}

                </div>

            `
            : "";


    return `

        <article class="review-card">

            <div class="review-header">

                <div class="review-user">

                    <div class="review-avatar">

                        ${escapeHTML(
                            name
                                .trim()
                                .charAt(0)
                                .toUpperCase()
                        )}

                    </div>


                    <div>

                        <div class="review-user-name">
                            ${escapeHTML(name)}
                        </div>


                        <div class="review-date">
                            ${escapeHTML(date)}
                        </div>

                    </div>

                </div>


                <div class="review-stars">
                    ${getStars(rating)}
                </div>

            </div>


            <div class="review-text">
                ${escapeHTML(text)}
            </div>


            ${imagesHTML}

        </article>

    `;

}


// ==========================================================
// REVIEW IMAGES
// ==========================================================

function getReviewImages(
    review
) {

    const images = [];


    if (
        review.image1
    ) {

        images.push(
            review.image1
        );

    }


    if (
        review.image2
    ) {

        images.push(
            review.image2
        );

    }


    if (
        review.image3
    ) {

        images.push(
            review.image3
        );

    }


    if (
        Array.isArray(
            review.images
        )
    ) {

        review.images.forEach(
            image => {

                if (
                    typeof image ===
                        "string" &&
                    image.trim()
                ) {

                    images.push(
                        image.trim()
                    );

                }

            }
        );

    }


    return [
        ...new Set(
            images
                .filter(Boolean)
                .slice(0, 3)
        )
    ];

}


// ==========================================================
// REVIEW DATE
// ==========================================================

function formatReviewDate(
    value
) {

    if (!value) {

        return "";

    }


    try {

        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(
                value
            );

        }


        return date.toLocaleDateString(
            "en-BD",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );


    } catch {

        return String(
            value
        );

    }

}


// ==========================================================
// ESCAPE HTML
// ==========================================================

function escapeHTML(
    value
) {

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


// ==========================================================
// BUTTON LOADING
// ==========================================================

function setButtonLoading(
    button,
    loadingState,
    text
) {

    if (!button) {

        return;

    }


    if (
        loadingState
    ) {

        button.disabled =
            true;

        button.dataset.oldText =
            button.textContent;

        button.textContent =
            text;

    } else {

        button.disabled =
            false;

        button.textContent =
            text ||
            button.dataset.oldText ||
            "Button";

    }

}


// ==========================================================
// TOAST
// ==========================================================

function showToast(
    message
) {

    let toast =
        document.getElementById(
            "productToast"
        );


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "productToast";


        toast.className =
            "product-toast";


        document.body.appendChild(
            toast
        );

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toast._timer
    );


    toast._timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


// ==========================================================
// ERROR
// ==========================================================

function showError() {

    loading?.classList.add(
        "hidden"
    );


    productDetails?.classList.add(
        "hidden"
    );


    relatedSection?.classList.add(
        "hidden"
    );


    errorBox?.classList.remove(
        "hidden"
    );

}


// ==========================================================
// END
// ==========================================================