// ==========================================
// NISHAT FASHION - PRODUCT DETAILS JS
// PRODUCT CACHE + GOOGLE SHEET REVIEWS
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
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getProducts
} from "../shop/products.js";


// ==========================================
// CONFIG
// ==========================================

const CACHE_TIME = 25 * 60 * 1000;

const PRODUCT_CACHE_PREFIX =
    "nishat_product_";

const CART_KEY =
    "nishat_cart";

const WISHLIST_KEY =
    "nishat_wishlist";

const MAX_QUANTITY = 99;


// ==========================================
// GOOGLE SHEET REVIEW API
// ==========================================

const REVIEWS_API_URL =
    "https://script.google.com/macros/s/AKfycbywWOHsHkWGSybOafWxszeyMV_gng4iWj6zFd1lUw_nQ3rzGcXUvs9xml29XD7kdW6b/exec";


// প্রথমে 3টি
const INITIAL_REVIEWS = 3;

// এরপর প্রতি বার 10টি
const MORE_REVIEWS = 10;


// ==========================================
// REVIEW STATE
// ==========================================

let reviews = [];

let reviewsLoaded = 0;

let reviewsLoading = false;

let reviewsHasMore = true;


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
// PRODUCT CACHE
// ==========================================

function getProductCacheKey(id) {

    return `${PRODUCT_CACHE_PREFIX}${id}`;

}


function saveProductCache(
    id,
    data
) {

    try {

        localStorage.setItem(
            getProductCacheKey(id),
            JSON.stringify({
                timestamp: Date.now(),
                data: data
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
// DOM ELEMENTS
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
// REVIEW ELEMENTS
// ==========================================

const reviewsList =
    document.getElementById(
        "reviewsList"
    );

const loadMoreReviewsBtn =
    document.getElementById(
        "loadMoreReviews"
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

    try {

        // --------------------------------------
        // CACHE FIRST
        // --------------------------------------

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


        // --------------------------------------
        // PRODUCTS.JS CACHE
        // --------------------------------------

        const products =
            await getProducts();


        if (
            !Array.isArray(products)
        ) {

            showError();

            return;

        }


        const product =
            products.find(
                item => {

                    const itemId =
                        item.id ??
                        item.productId;

                    return String(
                        itemId
                    ) === String(id);

                }
            );


        if (!product) {

            console.warn(
                "Product not found:",
                id
            );

            showError();

            return;

        }


        const productData = {

            ...product,

            id:
                product.id ??
                product.productId ??
                id

        };


        currentProduct =
            productData;


        saveProductCache(
            id,
            productData
        );


        renderProduct(
            productData
        );


        await loadRelatedProducts(
            productData,
            products
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

function renderProduct(
    product
) {

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


    // --------------------------------------
    // NAME
    // --------------------------------------

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


    // --------------------------------------
    // CATEGORY
    // --------------------------------------

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
            category || "—";

    }


    // --------------------------------------
    // PRICE
    // --------------------------------------

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


    // --------------------------------------
    // DESCRIPTION
    // --------------------------------------

    if (productDescription) {

        productDescription.textContent =
            product.description ||
            product.shortDescription ||
            "No description available.";

    }


    // --------------------------------------
    // PRODUCT CODE
    // --------------------------------------

    if (productCode) {

        productCode.textContent =
            product.code ||
            product.sku ||
            product.id ||
            "—";

    }


    // --------------------------------------
    // STOCK
    // --------------------------------------

    renderStock(
        product
    );


    // --------------------------------------
    // IMAGES
    // --------------------------------------

    renderImages(
        product
    );


    // --------------------------------------
    // SIZES
    // --------------------------------------

    renderSizes(
        product
    );


    // --------------------------------------
    // COLORS
    // --------------------------------------

    renderColors(
        product
    );


    // --------------------------------------
    // PRODUCT RATING
    // --------------------------------------

    const rating =
        Number(
            product.rating || 0
        );

    const productReviews =
        Number(
            product.reviewCount || 0
        );


    if (productRating) {

        productRating.textContent =
            getStars(rating);

    }


    if (reviewCount) {

        reviewCount.textContent =
            `(${productReviews} reviews)`;

    }


    // --------------------------------------
    // GOOGLE SHEET REVIEWS
    // --------------------------------------

    loadReviews(
        product.id
    );

}


// ==========================================
// LOAD REVIEWS
// ==========================================

async function loadReviews(
    id
) {

    if (!reviewsList) {

        console.warn(
            "reviewsList not found."
        );

        return;

    }


    reviews = [];

    reviewsLoaded = 0;

    reviewsHasMore = true;


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


// ==========================================
// FETCH REVIEWS
// ==========================================

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


    reviewsLoading = true;


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
            id
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


        // --------------------------------------
        // SUPPORT DIFFERENT API RESPONSE TYPES
        // --------------------------------------

        let newReviews = [];


        if (
            Array.isArray(result)
        ) {

            newReviews =
                result;

        } else if (
            Array.isArray(
                result.reviews
            )
        ) {

            newReviews =
                result.reviews;

        } else if (
            Array.isArray(
                result.data
            )
        ) {

            newReviews =
                result.data;

        }


        // --------------------------------------
        // ONLY APPROVED
        // --------------------------------------

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


        // --------------------------------------
        // ADD TO CURRENT LIST
        // --------------------------------------

        reviews.push(
            ...newReviews
        );


        reviewsLoaded =
            reviews.length;


        // --------------------------------------
        // HAS MORE
        // --------------------------------------

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


// ==========================================
// LOAD MORE REVIEWS
// ==========================================

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


// ==========================================
// RENDER REVIEWS
// ==========================================

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


    if (
        loadMoreReviewsBtn
    ) {

        loadMoreReviewsBtn.style.display =
            reviewsHasMore
                ? "block"
                : "none";

    }

}


// ==========================================
// CREATE REVIEW HTML
// ==========================================

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


// ==========================================
// REVIEW IMAGES
// ==========================================

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


    // Support array format too

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


// ==========================================
// REVIEW DATE
// ==========================================

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

            return String(value);

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

        return String(value);

    }

}


// ==========================================
// STOCK
// ==========================================

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

}


// ==========================================
// IMAGES
// ==========================================

function renderImages(
    product
) {

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
                `Product image ${index + 1}`;

            img.loading =
                "lazy";


            button.appendChild(
                img
            );


            button.addEventListener(
                "click",
                () => {

                    if (
                        productImage
                    ) {

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

function getProductImages(
    product
) {

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
                        image.trim()
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


                    if (
                        selectedSize
                    ) {

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


                    if (
                        selectedColor
                    ) {

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


        quantity =
            Math.min(
                MAX_QUANTITY,
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


        quantity =
            Math.max(
                1,
                Math.min(
                    MAX_QUANTITY,
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


        const cartRef =
            doc(
                db,
                "users",
                user.uid,
                "cart",
                currentProduct.id
            );


        try {

            await setDoc(
                cartRef,
                {
                    productId:
                        currentProduct.id,

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
                        getProductImages(
                            currentProduct
                        )[0] || "",

                    quantity:
                        quantity,

                    size:
                        selectedSizeValue,

                    color:
                        selectedColorValue,

                    updatedAt:
                        serverTimestamp()
                },
                {
                    merge: true
                }
            );


            updateLocalCartCache(
                currentProduct,
                quantity
            );


            alert(
                "Product added to cart."
            );


        } catch (error) {

            console.error(
                "Add to cart error:",
                error
            );

            alert(
                "Could not add product to cart."
            );

        }

    }
);


// ==========================================
// LOCAL CART CACHE
// ==========================================

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


        const existingIndex =
            cart.findIndex(
                item =>
                    String(
                        item.productId
                    ) === String(
                        product.id
                    )
            );


        const item = {

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

            cart[existingIndex] =
                {
                    ...cart[existingIndex],
                    ...item
                };

        } else {

            cart.push(
                item
            );

        }


        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );


    } catch (error) {

        console.warn(
            "Local cart cache error:",
            error
        );

    }

}


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


        const productId =
            currentProduct.id;


        const wishlistRef =
            doc(
                db,
                "users",
                user.uid,
                "wishlist",
                productId
            );


        const isActive =
            wishlistBtn.classList.contains(
                "active"
            );


        try {

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


            } else {

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
                            getProductImages(
                                currentProduct
                            )[0] || "",

                        addedAt:
                            serverTimestamp()
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

            }


        } catch (error) {

            console.error(
                "Wishlist error:",
                error
            );

        }

    }
);


// ==========================================
// LOCAL WISHLIST
// ==========================================

function saveLocalWishlist(
    product
) {

    try {

        const raw =
            localStorage.getItem(
                WISHLIST_KEY
            );


        let list =
            raw
                ? JSON.parse(raw)
                : [];


        if (
            !Array.isArray(list)
        ) {

            list = [];

        }


        const exists =
            list.some(
                item =>
                    String(
                        item.productId ??
                        item.id
                    ) === String(
                        product.id
                    )
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
            JSON.stringify(list)
        );


    } catch (error) {

        console.warn(
            "Wishlist cache error:",
            error
        );

    }

}


function removeLocalWishlist(
    productId
) {

    try {

        const raw =
            localStorage.getItem(
                WISHLIST_KEY
            );


        let list =
            raw
                ? JSON.parse(raw)
                : [];


        if (
            !Array.isArray(list)
        ) {

            return;

        }


        list =
            list.filter(
                item =>
                    String(
                        item.productId ??
                        item.id
                    ) !==
                    String(productId)
            );


        localStorage.setItem(
            WISHLIST_KEY,
            JSON.stringify(list)
        );


    } catch (error) {

        console.warn(
            "Wishlist remove cache error:",
            error
        );

    }

}


// ==========================================
// RELATED PRODUCTS
// NO EXTRA FIRESTORE QUERY
// ==========================================

async function loadRelatedProducts(
    product,
    productsList = null
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
        product.categoryName ||
        "";


    if (!category) {

        return;

    }


    try {

        let products =
            productsList;


        if (
            !Array.isArray(
                products
            )
        ) {

            products =
                await getProducts();

        }


        const related =
            products
                .filter(
                    item => {

                        if (!item) {

                            return false;

                        }


                        const itemId =
                            item.id ??
                            item.productId;


                        if (
                            String(itemId) ===
                            String(product.id)
                        ) {

                            return false;

                        }


                        const itemCategory =
                            item.category ||
                            item.categoryName ||
                            "";


                        return (
                            String(
                                itemCategory
                            )
                                .toLowerCase() ===
                            String(
                                category
                            )
                                .toLowerCase()
                        );

                    }
                )
                .slice(
                    0,
                    5
                );


        container.innerHTML =
            "";


        if (
            related.length === 0
        ) {

            section?.classList.add(
                "hidden"
            );

            return;

        }


        related.forEach(
            item => {

                const itemId =
                    item.id ??
                    item.productId;


                const name =
                    item.name ||
                    item.title ||
                    "Product";


                const image =
                    item.image ||
                    item.imageUrl ||
                    (
                        Array.isArray(
                            item.images
                        )
                            ? item.images[0]
                            : ""
                    );


                const price =
                    Number(
                        item.salePrice ??
                        item.price ??
                        0
                    );


                const card =
                    document.createElement(
                        "a"
                    );


                card.className =
                    "related-card";


                card.href =
                    `./product.html?id=${encodeURIComponent(
                        itemId
                    )}`;


                card.innerHTML = `

                    <div class="related-card-image">

                        <img
                            src="${escapeHTML(image)}"
                            alt="${escapeHTML(name)}"
                            loading="lazy"
                        >

                    </div>

                    <div class="related-card-info">

                        <div class="related-card-name">
                            ${escapeHTML(name)}
                        </div>

                        <div class="related-card-price">
                            ${formatPrice(price)}
                        </div>

                    </div>

                `;


                container.appendChild(
                    card
                );

            }
        );


        section?.classList.remove(
            "hidden"
        );


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

function formatPrice(
    price
) {

    const number =
        Number(price) || 0;


    return `৳${number.toLocaleString(
        "en-BD"
    )}`;

}


// ==========================================
// STARS
// ==========================================

function getStars(
    rating
) {

    const rounded =
        Math.round(
            Number(
                rating
            ) || 0
        );


    const safe =
        Math.min(
            5,
            Math.max(
                0,
                rounded
            )
        );


    return (
        "★".repeat(
            safe
        ) +
        "☆".repeat(
            5 - safe
        )
    );

}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(
    value
) {

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
// AUTH STATE
// ==========================================

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            return;

        }


        // এখানে future user-specific
        // product actions রাখা যাবে

    }
);


// ==========================================
// DEBUG
// ==========================================

console.log(
    "Nishat Fashion - Product Details JS loaded"
);

console.log(
    "Google Sheet review system enabled"
);