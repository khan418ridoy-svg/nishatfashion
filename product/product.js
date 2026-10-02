// ==========================================
// NISHAT FASHION - PRODUCT DETAILS JS
// FIRESTORE + CACHE
// ==========================================

import {
    auth,
    db
} from "../firebase/firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
    limit
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// CACHE
// ==========================================

const CACHE_TIME =
    25 * 60 * 1000;


const PRODUCT_CACHE_PREFIX =
    "nishat_product_";


function getProductCacheKey(id) {

    return `${PRODUCT_CACHE_PREFIX}${id}`;

}


function saveProductCache(id, data) {

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


function getProductCache(id) {

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


        if (
            Date.now() -
            cache.timestamp >
            CACHE_TIME
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


// ==========================================
// URL PRODUCT ID
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );


const productId =
    params.get("id");


// ==========================================
// ELEMENTS
// ==========================================

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


const quantityMinus =
    document.getElementById(
        "quantityMinus"
    );


const quantityPlus =
    document.getElementById(
        "quantityPlus"
    );


// ==========================================
// STATE
// ==========================================

let currentProduct = null;

let selectedSizeValue = "";

let selectedColorValue = "";


// ==========================================
// START
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (!productId) {

            showError();

            return;

        }


        await loadProduct(
            productId
        );

    }
);


// ==========================================
// LOAD PRODUCT
// ==========================================

async function loadProduct(id) {

    // ======================================
    // CACHE FIRST
    // ======================================

    const cached =
        getProductCache(id);


    if (cached) {

        console.log(
            "Product loaded from cache:",
            id
        );

        currentProduct =
            cached;

        renderProduct(
            cached
        );

        await loadRelatedProducts(
            cached
        );

        return;

    }


    // ======================================
    // FIRESTORE
    // ======================================

    try {

        /*
         * IMPORTANT:
         *
         * এখানে products collection ধরে নেওয়া হয়েছে।
         *
         * যদি আপনার Firestore path হয়:
         * products/{productId}
         * তাহলে এই code সরাসরি কাজ করবে।
         */

        const productRef =
            doc(
                db,
                "products",
                id
            );


        const snapshot =
            await getDoc(
                productRef
            );


        if (!snapshot.exists()) {

            showError();

            return;

        }


        const productData = {

            id:
                snapshot.id,

            ...snapshot.data()

        };


        currentProduct =
            productData;


        // Save cache
        saveProductCache(
            id,
            productData
        );


        console.log(
            "Product loaded from Firestore:",
            id
        );


        renderProduct(
            productData
        );


        await loadRelatedProducts(
            productData
        );


    } catch (error) {

        console.error(
            "Product load error:",
            error
        );


        showError();

    }

}


// ==========================================
// RENDER PRODUCT
// ==========================================

function renderProduct(product) {

    if (!product) {

        showError();

        return;

    }


    loading?.classList.add(
        "hidden"
    );


    errorBox?.classList.add(
        "hidden"
    );


    productDetails?.classList.remove(
        "hidden"
    );


    // ======================================
    // NAME
    // ======================================

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


    // ======================================
    // CATEGORY
    // ======================================

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


    // ======================================
    // PRICE
    // ======================================

    const price =
        Number(
            product.salePrice ??
            product.price ??
            0
        );


    if (productPrice) {

        productPrice.textContent =
            formatPrice(
                price
            );

    }


    // ======================================
    // DESCRIPTION
    // ======================================

    if (productDescription) {

        productDescription.textContent =
            product.description ||
            product.shortDescription ||
            "No description available.";

    }


    // ======================================
    // PRODUCT CODE
    // ======================================

    if (productCode) {

        productCode.textContent =
            product.code ||
            product.sku ||
            product.id ||
            "—";

    }


    // ======================================
    // STOCK
    // ======================================

    renderStock(
        product
    );


    // ======================================
    // IMAGES
    // ======================================

    renderImages(
        product
    );


    // ======================================
    // SIZES
    // ======================================

    renderSizes(
        product
    );


    // ======================================
    // COLORS
    // ======================================

    renderColors(
        product
    );


    // ======================================
    // RATING
    // ======================================

    const rating =
        Number(
            product.rating || 0
        );


    const reviews =
        Number(
            product.reviewCount || 0
        );


    if (productRating) {

        productRating.textContent =
            getStars(
                rating
            );

    }


    if (reviewCount) {

        reviewCount.textContent =
            `(${reviews} reviews)`;

    }

}


// ==========================================
// STOCK
// ==========================================

function renderStock(product) {

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


    if (stock <= 0) {

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

}


// ==========================================
// IMAGES
// ==========================================

function renderImages(product) {

    const images =
        getProductImages(
            product
        );


    if (
        images.length === 0
    ) {

        return;

    }


    if (productImage) {

        productImage.src =
            images[0];

        productImage.alt =
            product.name ||
            "Product";

    }


    if (!productThumbnails) {

        return;

    }


    productThumbnails.innerHTML =
        "";


    images.forEach(
        (image, index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "product-thumbnail";


            if (index === 0) {

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
                `Product image ${index + 1}`;


            button.appendChild(
                img
            );


            button.addEventListener(
                "click",
                () => {

                    if (productImage) {

                        productImage.src =
                            image;

                    }


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


// ==========================================
// GET PRODUCT IMAGES
// ==========================================

function getProductImages(product) {

    const images = [];


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
                        image
                    );

                }

            }
        );

    }


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


    return [
        ...new Set(
            images
        )
    ];

}


// ==========================================
// SIZES
// ==========================================

function renderSizes(product) {

    const sizes =
        Array.isArray(
            product.sizes
        )
            ? product.sizes
            : [];


    if (
        sizes.length === 0
    ) {

        return;

    }


    sizeSection?.classList.remove(
        "hidden"
    );


    sizeOptions.innerHTML =
        "";


    sizes.forEach(
        size => {

            const value =
                String(
                    size
                );


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


// ==========================================
// COLORS
// ==========================================

function renderColors(product) {

    const colors =
        Array.isArray(
            product.colors
        )
            ? product.colors
            : [];


    if (
        colors.length === 0
    ) {

        return;

    }


    colorSection?.classList.remove(
        "hidden"
    );


    colorOptions.innerHTML =
        "";


    colors.forEach(
        color => {

            const value =
                String(
                    color
                );


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


// ==========================================
// QUANTITY
// ==========================================

quantityMinus?.addEventListener(
    "click",
    () => {

        let quantity =
            Number(
                quantityInput.value
            ) || 1;


        quantity =
            Math.max(
                1,
                quantity - 1
            );


        quantityInput.value =
            quantity;

    }
);


quantityPlus?.addEventListener(
    "click",
    () => {

        let quantity =
            Number(
                quantityInput.value
            ) || 1;


        quantity =
            Math.min(
                99,
                quantity + 1
            );


        quantityInput.value =
            quantity;

    }
);


quantityInput?.addEventListener(
    "change",
    () => {

        let quantity =
            Number(
                quantityInput.value
            ) || 1;


        quantity =
            Math.max(
                1,
                Math.min(
                    99,
                    quantity
                )
            );


        quantityInput.value =
            quantity;

    }
);


// ==========================================
// ADD TO CART
// ==========================================

addToCartBtn?.addEventListener(
    "click",
    async () => {

        if (!currentProduct) {

            return;

        }


        const user =
            auth.currentUser;


        if (!user) {

            window.location.href =
                `../login/login.html?redirect=${encodeURIComponent(
                    window.location.href
                )}`;

            return;

        }


        const quantity =
            Number(
                quantityInput?.value || 1
            );


        const productRef =
            doc(
                db,
                "users",
                user.uid,
                "cart",
                currentProduct.id
            );


        try {

            /*
             * Cart implementation এখানে
             * আপনার existing cart structure
             * অনুযায়ী করা যাবে।
             *
             * আপাতত login check রাখা হয়েছে।
             */

            console.log(
                "Add to cart:",
                {
                    product:
                        currentProduct.id,

                    quantity:
                        quantity,

                    size:
                        selectedSizeValue,

                    color:
                        selectedColorValue
                }
            );


            alert(
                "Product added to cart."
            );


        } catch (error) {

            console.error(
                "Add to cart error:",
                error
            );

        }

    }
);


// ==========================================
// BUY NOW
// ==========================================

buyNowBtn?.addEventListener(
    "click",
    () => {

        if (!currentProduct) {

            return;

        }


        const user =
            auth.currentUser;


        if (!user) {

            window.location.href =
                `../login/login.html?redirect=${encodeURIComponent(
                    window.location.href
                )}`;

            return;

        }


        const quantity =
            Number(
                quantityInput?.value || 1
            );


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


        sessionStorage.setItem(

            "nishat_buy_now",

            JSON.stringify(
                checkoutData
            )

        );


        window.location.href =
            "../checkout/checkout.html";

    }
);


// ==========================================
// WISHLIST
// ==========================================

wishlistBtn?.addEventListener(
    "click",
    async () => {

        const user =
            auth.currentUser;


        if (!user) {

            window.location.href =
                `../login/login.html?redirect=${encodeURIComponent(
                    window.location.href
                )}`;

            return;

        }


        if (!currentProduct) {

            return;

        }


        console.log(
            "Wishlist:",
            currentProduct.id
        );


        wishlistBtn.classList.toggle(
            "active"
        );


        wishlistBtn.textContent =
            wishlistBtn.classList.contains(
                "active"
            )
                ? "♥"
                : "♡";

    }
);


// ==========================================
// RELATED PRODUCTS
// ==========================================

async function loadRelatedProducts(
    product
) {

    const container =
        document.getElementById(
            "relatedProducts"
        );


    const section =
        document.getElementById(
            "relatedSection"
        );


    if (
        !container ||
        !product
    ) {

        return;

    }


    const category =
        product.category ||
        product.categoryName;


    if (!category) {

        return;

    }


    try {

        const productsRef =
            collection(
                db,
                "products"
            );


        const q =
            query(
                productsRef,
                where(
                    "category",
                    "==",
                    category
                ),
                limit(5)
            );


        const snapshot =
            await getDocs(
                q
            );


        container.innerHTML =
            "";


        snapshot.forEach(
            item => {

                if (
                    item.id ===
                    product.id
                ) {

                    return;

                }


                const data =
                    item.data();


                const card =
                    document.createElement(
                        "a"
                    );


                card.className =
                    "related-card";


                card.href =
                    `./product.html?id=${encodeURIComponent(
                        item.id
                    )}`;


                const image =
                    data.image ||
                    data.imageUrl ||
                    (
                        Array.isArray(
                            data.images
                        )
                            ? data.images[0]
                            : ""
                    );


                const price =
                    Number(
                        data.salePrice ??
                        data.price ??
                        0
                    );


                card.innerHTML = `

                    <div class="related-card-image">

                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(
                                data.name ||
                                data.title ||
                                "Product"
                            )}"
                        >

                    </div>

                    <div class="related-card-info">

                        <div class="related-card-name">

                            ${escapeHTML(
                                data.name ||
                                data.title ||
                                "Product"
                            )}

                        </div>

                        <div class="related-card-price">

                            ${formatPrice(
                                price
                            )}

                        </div>

                    </div>

                `;


                container.appendChild(
                    card
                );

            }
        );


        if (
            container.children.length > 0
        ) {

            section?.classList.remove(
                "hidden"
            );

        }


    } catch (error) {

        console.error(
            "Related products error:",
            error
        );

    }

}


// ==========================================
// SHOW ERROR
// ==========================================

function showError() {

    loading?.classList.add(
        "hidden"
    );


    productDetails?.classList.add(
        "hidden"
    );


    errorBox?.classList.remove(
        "hidden"
    );

}


// ==========================================
// FORMAT PRICE
// ==========================================

function formatPrice(price) {

    const number =
        Number(
            price
        ) || 0;


    return `৳${number.toLocaleString(
        "en-BD"
    )}`;

}


// ==========================================
// STARS
// ==========================================

function getStars(rating) {

    const rounded =
        Math.round(
            Number(
                rating
            ) || 0
        );


    return "★".repeat(
        Math.min(
            5,
            Math.max(
                0,
                rounded
            )
        )
    ) +
    "☆".repeat(
        5 -
        Math.min(
            5,
            Math.max(
                0,
                rounded
            )
        )
    );

}


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
    "Nishat Fashion - Product Details JS loaded"
);