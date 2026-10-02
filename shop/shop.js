// ==========================================================
// Nishat Fashion - Shop Page
// ==========================================================
// Features:
// - Products loaded through products.js
// - Memory + localStorage cache handled by products.js
// - NO direct Firestore query here
// - Search
// - Category filter
// - Gender filter
// - Discount filter
// - Price filter
// - Sorting
// - Pagination
// - Wishlist
// - Cart
// - Mobile filter drawer
// - URL filter support
// ==========================================================

import {
    getProducts
} from "./products.js";


// ==========================================================
// CONFIG
// ==========================================================

const PRODUCTS_PER_PAGE = 12;

// Safe fallback image.
// This prevents /shop/assets/placeholder-product.webp 404 errors.
const FALLBACK_IMAGE =
    "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27 width=%27500%27 height=%27580%27 viewBox=%270 0 500 580%27%3E%3Crect width=%27500%27 height=%27580%27 fill=%27%23f3f3f3%27%2F%3E%3Ctext x=%27250%27 y=%27290%27 text-anchor=%27middle%27 dominant-baseline=%27middle%27 fill=%27%23999%27 font-family=%27Arial%27 font-size=%2720%27%3ENishat Fashion%3C%2Ftext%3E%3C%2Fsvg%3E";

const WISHLIST_KEY = "nishat_wishlist";
const CART_KEY = "nishat_cart";


// ==========================================================
// STATE
// ==========================================================

let allProducts = [];
let filteredProducts = [];

let currentPage = 1;

let searchText = "";
let selectedCategory = "";
let selectedGender = "";
let selectedDiscount = "";
let selectedSort = "default";

let minPrice = "";
let maxPrice = "";


// ==========================================================
// DOM HELPERS
// ==========================================================

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);




// ==========================================================
// INIT
// ==========================================================

document.addEventListener("DOMContentLoaded", initShop);


async function initShop() {

    showLoading();

    readURLFilters();

    setupEvents();

    updateCartCount();

    updateWishlistCount();

    try {

        allProducts = await getProducts();

        if (!Array.isArray(allProducts)) {
            allProducts = [];
        }

        filteredProducts = [...allProducts];

        applyFilters();

    } catch (error) {

        console.error("Shop loading error:", error);

        showEmpty(
            "Products could not be loaded.",
            "Please refresh the page and try again."
        );
    }
}


// ==========================================================
// EVENTS
// ==========================================================

function setupEvents() {

    // ------------------------------------------------------
    // Search
    // ------------------------------------------------------

    const searchInput = $("#shopSearch");

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            searchText = searchInput.value.trim();

            currentPage = 1;

            applyFilters();

        });

    }


    // ------------------------------------------------------
    // Sort
    // ------------------------------------------------------

    const sortSelect = $("#sortProducts");

    if (sortSelect) {

        sortSelect.addEventListener("change", () => {

            selectedSort = sortSelect.value;

            currentPage = 1;

            applyFilters();

        });

    }


    // ------------------------------------------------------
    // Category
    // ------------------------------------------------------

    $$(".category-filter").forEach(input => {

        input.addEventListener("change", () => {

            const checked = document.querySelector(
                ".category-filter:checked"
            );

            selectedCategory = checked
                ? checked.value
                : "";

            currentPage = 1;

            applyFilters();

        });

    });


    // ------------------------------------------------------
    // Gender
    // ------------------------------------------------------

    $$(".gender-filter").forEach(input => {

        input.addEventListener("change", () => {

            const checked = document.querySelector(
                ".gender-filter:checked"
            );

            selectedGender = checked
                ? checked.value
                : "";

            currentPage = 1;

            applyFilters();

        });

    });


    // ------------------------------------------------------
    // Discount
    // ------------------------------------------------------

    $$(".discount-filter").forEach(input => {

        input.addEventListener("change", () => {

            const checked = document.querySelector(
                ".discount-filter:checked"
            );

            selectedDiscount = checked
                ? checked.value
                : "";

            currentPage = 1;

            applyFilters();

        });

    });


    // ------------------------------------------------------
    // Price
    // ------------------------------------------------------

    const minPriceInput = $("#minPrice");
    const maxPriceInput = $("#maxPrice");

    if (minPriceInput) {

        minPriceInput.addEventListener("input", () => {

            minPrice = minPriceInput.value;

            currentPage = 1;

            applyFilters();

        });

    }


    if (maxPriceInput) {

        maxPriceInput.addEventListener("input", () => {

            maxPrice = maxPriceInput.value;

            currentPage = 1;

            applyFilters();

        });

    }


    // ------------------------------------------------------
    // Apply Price Button
    // ------------------------------------------------------

    const applyPriceBtn = $("#applyPrice");

    if (applyPriceBtn) {

        applyPriceBtn.addEventListener("click", () => {

            minPrice = minPriceInput?.value || "";
            maxPrice = maxPriceInput?.value || "";

            currentPage = 1;

            applyFilters();

            closeMobileFilters();

        });

    }


    // ------------------------------------------------------
    // Clear Filters
    // ------------------------------------------------------

    const clearBtn = $("#clearFilters");

    if (clearBtn) {

        clearBtn.addEventListener(
            "click",
            clearFilters
        );

    }


    // ------------------------------------------------------
    // Mobile Filter Open
    // ------------------------------------------------------

    const filterOpenBtn = $("#openFilters");

    if (filterOpenBtn) {

        filterOpenBtn.addEventListener(
            "click",
            openMobileFilters
        );

    }


    // ------------------------------------------------------
    // Mobile Filter Close
    // ------------------------------------------------------

    const filterCloseBtn = $("#closeFilters");

    if (filterCloseBtn) {

        filterCloseBtn.addEventListener(
            "click",
            closeMobileFilters
        );

    }


    // ------------------------------------------------------
    // Overlay
    // ------------------------------------------------------

    const overlay = $("#filterOverlay");

    if (overlay) {

        overlay.addEventListener(
            "click",
            closeMobileFilters
        );

    }


    // ------------------------------------------------------
    // Product Grid Delegation
    // ------------------------------------------------------

    const productGrid = $("#shopProducts");

    if (productGrid) {

        productGrid.addEventListener(
            "click",
            handleProductAction
        );

    }


    // ------------------------------------------------------
    // Pagination
    // ------------------------------------------------------

    const pagination = $("#pagination");

    if (pagination) {

        pagination.addEventListener(
            "click",
            handlePagination
        );

    }


    // ------------------------------------------------------
    // Storage Change
    // ------------------------------------------------------

    window.addEventListener("storage", () => {

        updateCartCount();

        updateWishlistCount();

        renderCurrentProducts();

    });

}


// ==========================================================
// URL FILTERS
// ==========================================================

function readURLFilters() {

    const params = new URLSearchParams(
        window.location.search
    );


    searchText =
        params.get("search") ||
        params.get("q") ||
        "";


    selectedCategory =
        params.get("category") ||
        "";


    selectedGender =
        params.get("gender") ||
        "";


    selectedDiscount =
        params.get("discount") ||
        "";


    selectedSort =
        params.get("sort") ||
        "default";


    minPrice =
        params.get("minPrice") ||
        "";


    maxPrice =
        params.get("maxPrice") ||
        "";


    updateFilterUI();

}


// ==========================================================
// UPDATE FILTER UI
// ==========================================================

function updateFilterUI() {

    const searchInput = $("#shopSearch");

    if (searchInput) {
        searchInput.value = searchText;
    }


    const sortSelect = $("#sortProducts");

    if (sortSelect) {
        sortSelect.value = selectedSort;
    }


    const minInput = $("#minPrice");

    if (minInput) {
        minInput.value = minPrice;
    }


    const maxInput = $("#maxPrice");

    if (maxInput) {
        maxInput.value = maxPrice;
    }


    $$(".category-filter").forEach(input => {

        input.checked =
            normalizeValue(input.value) ===
            normalizeValue(selectedCategory);

    });


    $$(".gender-filter").forEach(input => {

        input.checked =
            normalizeValue(input.value) ===
            normalizeValue(selectedGender);

    });


    $$(".discount-filter").forEach(input => {

        input.checked =
            normalizeValue(input.value) ===
            normalizeValue(selectedDiscount);

    });

}


// ==========================================================
// APPLY FILTERS
// ==========================================================

function applyFilters() {

    let products = [...allProducts];


    // ------------------------------------------------------
    // Search
    // ------------------------------------------------------

    if (searchText) {

        const search =
            searchText.toLowerCase();

        products = products.filter(product => {

            const text = [

                product.name,

                product.title,

                product.productName,

                product.category,

                product.gender,

                product.collection,

                product.brand,

                product.sku,

                product.code,

                product.description,

                ...(Array.isArray(product.tags)
                    ? product.tags
                    : [])

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(search);

        });

    }


    // ------------------------------------------------------
    // Category
    // ------------------------------------------------------

    if (selectedCategory) {

        products = products.filter(product => {

            return normalizeValue(
                product.category
            ) === normalizeValue(
                selectedCategory
            );

        });

    }


    // ------------------------------------------------------
    // Gender
    // ------------------------------------------------------

    if (selectedGender) {

        products = products.filter(product => {

            return normalizeValue(
                product.gender
            ) === normalizeValue(
                selectedGender
            );

        });

    }


    // ------------------------------------------------------
    // Discount
    // ------------------------------------------------------

    if (selectedDiscount) {

        const discountValue =
            Number(selectedDiscount);

        if (!Number.isNaN(discountValue)) {

            products = products.filter(product => {

                const discount =
                    getDiscount(product);

                return discount >= discountValue;

            });

        }

    }


    // ------------------------------------------------------
    // Minimum Price
    // ------------------------------------------------------

    if (minPrice !== "") {

        const min =
            Number(minPrice);

        if (!Number.isNaN(min)) {

            products = products.filter(product => {

                return getProductPrice(product) >= min;

            });

        }

    }


    // ------------------------------------------------------
    // Maximum Price
    // ------------------------------------------------------

    if (maxPrice !== "") {

        const max =
            Number(maxPrice);

        if (!Number.isNaN(max)) {

            products = products.filter(product => {

                return getProductPrice(product) <= max;

            });

        }

    }


    // ------------------------------------------------------
    // Sorting
    // ------------------------------------------------------

    products = sortProducts(
        products,
        selectedSort
    );


    filteredProducts = products;


    currentPage = Math.min(
        currentPage,
        Math.max(
            1,
            Math.ceil(
                filteredProducts.length /
                PRODUCTS_PER_PAGE
            )
        )
    );


    renderCurrentProducts();

    updateResultCount();

    updateURL();

}


// ==========================================================
// SORT
// ==========================================================

function sortProducts(products, sort) {

    const result = [...products];


    switch (sort) {

        case "price-low":

        case "price_asc":

            result.sort(
                (a, b) =>
                    getProductPrice(a) -
                    getProductPrice(b)
            );

            break;


        case "price-high":

        case "price_desc":

            result.sort(
                (a, b) =>
                    getProductPrice(b) -
                    getProductPrice(a)
            );

            break;


        case "newest":

            result.sort(
                (a, b) =>
                    getTimestamp(
                        b.createdAt
                    ) -
                    getTimestamp(
                        a.createdAt
                    )
            );

            break;


        case "oldest":

            result.sort(
                (a, b) =>
                    getTimestamp(
                        a.createdAt
                    ) -
                    getTimestamp(
                        b.createdAt
                    )
            );

            break;


        case "discount":

            result.sort(
                (a, b) =>
                    getDiscount(b) -
                    getDiscount(a)
            );

            break;


        case "rating":

            result.sort(
                (a, b) =>
                    Number(b.rating || 0) -
                    Number(a.rating || 0)
            );

            break;


        case "name-asc":

            result.sort(
                (a, b) =>
                    getProductName(a)
                        .localeCompare(
                            getProductName(b)
                        )
            );

            break;


        case "name-desc":

            result.sort(
                (a, b) =>
                    getProductName(b)
                        .localeCompare(
                            getProductName(a)
                        )
            );

            break;


        default:

            // Keep products.js order.

            break;

    }


    return result;

}


// ==========================================================
// RENDER CURRENT PAGE
// ==========================================================

function renderCurrentProducts() {

    const grid =
        $("#shopProducts");

    if (!grid) return;


    if (!filteredProducts.length) {

        showEmpty(
            "No products found",
            "Try changing your search or filters."
        );

        renderPagination(0);

        return;

    }


    const start =
        (currentPage - 1) *
        PRODUCTS_PER_PAGE;


    const end =
        start +
        PRODUCTS_PER_PAGE;


    const pageProducts =
        filteredProducts.slice(
            start,
            end
        );


    grid.innerHTML =
        pageProducts
            .map(renderProductCard)
            .join("");


    renderPagination(
        filteredProducts.length
    );

}


// ==========================================================
// PRODUCT CARD
// ==========================================================

function renderProductCard(product) {

    const id =
        product.id || "";


    const name =
        escapeHTML(
            getProductName(product)
        );


    const price =
        getProductPrice(product);


    const oldPrice =
        getOldPrice(product);


    const discount =
        getDiscount(product);


    const image =
        getProductImage(product);


    const category =
        escapeHTML(
            product.category || ""
        );


    const rating =
        Number(product.rating || 0);


    const reviewCount =
        Number(
            product.reviewCount ||
            0
        );


    const stock =
        Number(product.stock ?? 0);


    const wishlist =
        isWishlisted(id);


    const outOfStock =
        stock <= 0;


    // ======================================================
    // IMPORTANT:
    // Product page is outside /shop/
    //
    // /shop/shop.html
    //       ↓
    // ../product/product.html
    //
    // ======================================================

    const productURL =
        `../product/product.html?id=${encodeURIComponent(id)}`;


    return `

        <article
            class="product-card"
            data-product-id="${escapeAttr(id)}"
        >

            <div class="product-image-wrap">

                <a
                    href="${productURL}"
                    class="product-image-link"
                    aria-label="${name}"
                >

                    <img
                        class="product-image"
                        src="${escapeAttr(image)}"
                        alt="${name}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}';"
                    >

                </a>


                ${
                    discount > 0
                    ? `

                        <span class="product-badge discount-badge">
                            -${discount}%
                        </span>

                    `
                    : ""
                }


                ${
                    outOfStock
                    ? `

                        <span class="product-badge stock-badge">
                            Out of Stock
                        </span>

                    `
                    : ""
                }


                <button
                    type="button"
                    class="wishlist-btn ${
                        wishlist
                            ? "active"
                            : ""
                    }"
                    data-action="wishlist"
                    data-product-id="${escapeAttr(id)}"
                    aria-label="Add to wishlist"
                >

                    ${
                        wishlist
                            ? "♥"
                            : "♡"
                    }

                </button>

            </div>


            <div class="product-info">

                ${
                    category
                    ? `

                        <div class="product-category">
                            ${category}
                        </div>

                    `
                    : ""
                }


                <h3 class="product-name">

                    <a href="${productURL}">
                        ${name}
                    </a>

                </h3>


                <div class="product-rating">

                    ${renderStars(rating)}

                    ${
                        reviewCount > 0
                        ? `

                            <span class="review-count">
                                (${reviewCount})
                            </span>

                        `
                        : ""
                    }

                </div>


                <div class="product-price">

                    <span class="sale-price">
                        ৳${formatMoney(price)}
                    </span>


                    ${
                        oldPrice > price
                        ? `

                            <span class="old-price">
                                ৳${formatMoney(oldPrice)}
                            </span>

                        `
                        : ""
                    }

                </div>


                <div class="product-actions">

                    <button
                        type="button"
                        class="add-cart-btn"
                        data-action="cart"
                        data-product-id="${escapeAttr(id)}"
                        ${
                            outOfStock
                                ? "disabled"
                                : ""
                        }
                    >

                        ${
                            outOfStock
                                ? "Out of Stock"
                                : "Add to Cart"
                        }

                    </button>

                </div>

            </div>

        </article>

    `;

}


// ==========================================================
// PRODUCT ACTION
// ==========================================================

function handleProductAction(event) {

    const button =
        event.target.closest(
            "[data-action]"
        );

    if (!button) return;


    const action =
        button.dataset.action;


    const productId =
        button.dataset.productId;


    if (!productId) return;


    if (action === "wishlist") {

        toggleWishlist(
            productId,
            button
        );

        return;

    }


    if (action === "cart") {

        addToCart(productId);

        return;

    }

}


// ==========================================================
// WISHLIST
// ==========================================================

function getWishlist() {

    try {

        const data =
            localStorage.getItem(
                WISHLIST_KEY
            );

        if (!data) return [];


        const parsed =
            JSON.parse(data);


        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Wishlist read error:",
            error
        );

        return [];

    }

}


function saveWishlist(items) {

    try {

        localStorage.setItem(
            WISHLIST_KEY,
            JSON.stringify(items)
        );

    } catch (error) {

        console.error(
            "Wishlist save error:",
            error
        );

    }

}


function isWishlisted(productId) {

    return getWishlist()
        .some(
            item =>
                String(
                    typeof item === "object"
                        ? item.id
                        : item
                ) ===
                String(productId)
        );

}


function toggleWishlist(
    productId,
    button
) {

    let wishlist =
        getWishlist();


    const index =
        wishlist.findIndex(item => {

            const id =
                typeof item === "object"
                    ? item.id
                    : item;

            return String(id) ===
                String(productId);

        });


    if (index >= 0) {

        wishlist.splice(index, 1);

        button.classList.remove(
            "active"
        );

        button.innerHTML = "♡";

        showToast(
            "Removed from wishlist"
        );

    } else {

        wishlist.push({
            id: productId
        });

        button.classList.add(
            "active"
        );

        button.innerHTML = "♥";

        showToast(
            "Added to wishlist"
        );

    }


    saveWishlist(wishlist);

    updateWishlistCount();

}


// ==========================================================
// CART
// ==========================================================

function getCart() {

    try {

        const data =
            localStorage.getItem(
                CART_KEY
            );

        if (!data) return [];


        const parsed =
            JSON.parse(data);


        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Cart read error:",
            error
        );

        return [];

    }

}


function saveCart(cart) {

    try {

        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );

    } catch (error) {

        console.error(
            "Cart save error:",
            error
        );

    }

}


function addToCart(productId) {

    const product =
        allProducts.find(
            item =>
                String(item.id) ===
                String(productId)
        );


    if (!product) {

        showToast(
            "Product not found"
        );

        return;

    }


    const stock =
        Number(product.stock ?? 0);


    if (stock <= 0) {

        showToast(
            "This product is out of stock"
        );

        return;

    }


    let cart =
        getCart();


    const existingIndex =
        cart.findIndex(item => {

            const id =
                item.productId ||
                item.id;

            return String(id) ===
                String(productId);

        });


    if (existingIndex >= 0) {

        const item =
            cart[existingIndex];


        const currentQty =
            Number(
                item.quantity ||
                item.qty ||
                1
            );


        if (
            stock > 0 &&
            currentQty >= stock
        ) {

            showToast(
                "Maximum available stock reached"
            );

            return;

        }


        item.quantity =
            currentQty + 1;

        item.qty =
            item.quantity;

    } else {

        cart.push({

            id: productId,

            productId: productId,

            name:
                getProductName(product),

            price:
                getProductPrice(product),

            image:
                getProductImage(product),

            quantity: 1,

            qty: 1

        });

    }


    saveCart(cart);

    updateCartCount();

    showToast(
        "Added to cart"
    );

}


// ==========================================================
// CART COUNT
// ==========================================================

function updateCartCount() {

    const cart =
        getCart();


    const count =
        cart.reduce(
            (total, item) =>
                total +
                Number(
                    item.quantity ||
                    item.qty ||
                    1
                ),
            0
        );


    const elements =
        $$(".cart-count");


    elements.forEach(element => {

        element.textContent =
            count;

        element.classList.toggle(
            "hidden",
            count <= 0
        );

    });

}


// ==========================================================
// WISHLIST COUNT
// ==========================================================

function updateWishlistCount() {

    const wishlist =
        getWishlist();


    const count =
        wishlist.length;


    const elements =
        $$(".wishlist-count");


    elements.forEach(element => {

        element.textContent =
            count;

        element.classList.toggle(
            "hidden",
            count <= 0
        );

    });

}


// ==========================================================
// PAGINATION
// ==========================================================

function renderPagination(totalItems) {

    const container =
        $("#pagination");


    if (!container) return;


    const totalPages =
        Math.ceil(
            totalItems /
            PRODUCTS_PER_PAGE
        );


    if (totalPages <= 1) {

        container.innerHTML = "";

        return;

    }


    let html = "";


    // ------------------------------------------------------
    // Previous
    // ------------------------------------------------------

    html += `

        <button
            type="button"
            class="page-btn prev-page"
            data-page="${currentPage - 1}"
            ${
                currentPage === 1
                    ? "disabled"
                    : ""
            }
        >
            ‹
        </button>

    `;


    // ------------------------------------------------------
    // Page numbers
    // ------------------------------------------------------

    const pages =
        getVisiblePages(
            currentPage,
            totalPages
        );


    pages.forEach(page => {

        if (page === "...") {

            html += `

                <span class="page-dots">
                    ...
                </span>

            `;

            return;

        }


        html += `

            <button
                type="button"
                class="page-btn ${
                    page === currentPage
                        ? "active"
                        : ""
                }"
                data-page="${page}"
            >
                ${page}
            </button>

        `;

    });


    // ------------------------------------------------------
    // Next
    // ------------------------------------------------------

    html += `

        <button
            type="button"
            class="page-btn next-page"
            data-page="${currentPage + 1}"
            ${
                currentPage === totalPages
                    ? "disabled"
                    : ""
            }
        >
            ›
        </button>

    `;


    container.innerHTML =
        html;

}


function getVisiblePages(
    current,
    total
) {

    if (total <= 7) {

        return Array.from(
            {
                length: total
            },
            (_, i) => i + 1
        );

    }


    const pages = [];


    pages.push(1);


    if (current > 4) {

        pages.push("...");

    }


    const start =
        Math.max(
            2,
            current - 1
        );


    const end =
        Math.min(
            total - 1,
            current + 1
        );


    for (
        let i = start;
        i <= end;
        i++
    ) {

        pages.push(i);

    }


    if (current < total - 3) {

        pages.push("...");

    }


    pages.push(total);


    return pages;

}


function handlePagination(event) {

    const button =
        event.target.closest(
            "[data-page]"
        );


    if (!button) return;


    if (
        button.disabled ||
        button.dataset.page === "..."
    ) {

        return;

    }


    const page =
        Number(
            button.dataset.page
        );


    if (!page) return;


    const totalPages =
        Math.ceil(
            filteredProducts.length /
            PRODUCTS_PER_PAGE
        );


    if (
        page < 1 ||
        page > totalPages
    ) {

        return;

    }


    currentPage =
        page;


    renderCurrentProducts();

    updateResultCount();


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// ==========================================================
// RESULT COUNT
// ==========================================================

function updateResultCount() {

    const element =
        $("#resultCount");


    if (!element) return;


    const total =
        filteredProducts.length;


    element.textContent =
        `${total} ${
            total === 1
                ? "product"
                : "products"
        }`;

}


// ==========================================================
// EMPTY
// ==========================================================

function showEmpty(
    title = "No products found",
    message = ""
) {

    const grid =
        $("#shopProducts");


    if (!grid) return;


    grid.innerHTML = `

        <div class="shop-empty">

            <div class="empty-icon">
                🛍️
            </div>

            <h3>
                ${escapeHTML(title)}
            </h3>

            ${
                message
                ? `

                    <p>
                        ${escapeHTML(message)}
                    </p>

                `
                : ""
            }


            <button
                type="button"
                class="clear-empty-btn"
                id="emptyClearFilters"
            >
                Clear Filters
            </button>

        </div>

    `;


    const clear =
        $("#emptyClearFilters");


    if (clear) {

        clear.addEventListener(
            "click",
            clearFilters
        );

    }

}


// ==========================================================
// LOADING
// ==========================================================

function showLoading() {

    const grid =
        $("#shopProducts");


    if (!grid) return;


    grid.innerHTML =
        Array.from(
            {
                length: 8
            }
        )
        .map(() => `

            <div class="product-skeleton">

                <div class="skeleton-image"></div>

                <div class="skeleton-line"></div>

                <div class="skeleton-line short"></div>

                <div class="skeleton-line price"></div>

            </div>

        `)
        .join("");

}


// ==========================================================
// CLEAR FILTERS
// ==========================================================

function clearFilters() {

    searchText = "";

    selectedCategory = "";

    selectedGender = "";

    selectedDiscount = "";

    selectedSort = "default";

    minPrice = "";

    maxPrice = "";

    currentPage = 1;


    updateFilterUI();

    applyFilters();

    closeMobileFilters();

}


// ==========================================================
// MOBILE FILTER
// ==========================================================

function openMobileFilters() {

    const sidebar =
        $("#filterSidebar");


    const overlay =
        $("#filterOverlay");


    if (sidebar) {

        sidebar.classList.add(
            "active"
        );

    }


    if (overlay) {

        overlay.classList.add(
            "active"
        );

    }


    document.body.classList.add(
        "filter-open"
    );

}


function closeMobileFilters() {

    const sidebar =
        $("#filterSidebar");


    const overlay =
        $("#filterOverlay");


    if (sidebar) {

        sidebar.classList.remove(
            "active"
        );

    }


    if (overlay) {

        overlay.classList.remove(
            "active"
        );

    }


    document.body.classList.remove(
        "filter-open"
    );

}


// ==========================================================
// URL UPDATE
// ==========================================================

function updateURL() {

    try {

        const url =
            new URL(
                window.location.href
            );


        const params =
            url.searchParams;


        setOrDelete(
            params,
            "search",
            searchText
        );


        setOrDelete(
            params,
            "category",
            selectedCategory
        );


        setOrDelete(
            params,
            "gender",
            selectedGender
        );


        setOrDelete(
            params,
            "discount",
            selectedDiscount
        );


        setOrDelete(
            params,
            "sort",
            selectedSort !== "default"
                ? selectedSort
                : ""
        );


        setOrDelete(
            params,
            "minPrice",
            minPrice
        );


        setOrDelete(
            params,
            "maxPrice",
            maxPrice
        );


        window.history.replaceState(
            {},
            "",
            url
        );

    } catch (error) {

        console.warn(
            "URL update failed:",
            error
        );

    }

}


function setOrDelete(
    params,
    key,
    value
) {

    if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    ) {

        params.set(
            key,
            String(value)
        );

    } else {

        params.delete(key);

    }

}


// ==========================================================
// TOAST
// ==========================================================

function showToast(message) {

    let toast =
        $("#shopToast");


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "shopToast";


        toast.className =
            "shop-toast";


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
        showToast.timer
    );


    showToast.timer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2200);

}


// ==========================================================
// PRODUCT HELPERS
// ==========================================================

function getProductName(product) {

    return (
        product.name ||
        product.title ||
        product.productName ||
        "Unnamed Product"
    );

}


function getProductPrice(product) {

    const value =
        product.salePrice ??
        product.price ??
        product.regularPrice ??
        0;


    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : 0;

}


function getOldPrice(product) {

    const oldPrice =
        product.oldPrice ??
        product.regularPrice ??
        0;


    const number =
        Number(oldPrice);


    return Number.isFinite(number)
        ? number
        : 0;

}


function getDiscount(product) {

    if (
        product.discount !== undefined &&
        product.discount !== null &&
        product.discount !== ""
    ) {

        const discount =
            Number(product.discount);


        if (
            Number.isFinite(discount)
        ) {

            return Math.max(
                0,
                Math.round(discount)
            );

        }

    }


    const oldPrice =
        getOldPrice(product);


    const price =
        getProductPrice(product);


    if (
        oldPrice > price &&
        oldPrice > 0
    ) {

        return Math.round(
            (
                (oldPrice - price) /
                oldPrice
            ) * 100
        );

    }


    return 0;

}


// ==========================================================
// PRODUCT IMAGE
// ==========================================================

function getProductImage(product) {

    if (
        Array.isArray(
            product.images
        ) &&
        product.images.length
    ) {

        const firstImage =
            product.images[0];


        if (
            typeof firstImage === "string" &&
            firstImage.trim()
        ) {

            return firstImage;

        }


        if (
            firstImage &&
            typeof firstImage === "object"
        ) {

            return (
                firstImage.url ||
                firstImage.src ||
                firstImage.image ||
                FALLBACK_IMAGE
            );

        }

    }


    const image =
        product.image ||
        product.imageUrl ||
        product.thumbnail ||
        "";


    return (
        typeof image === "string" &&
        image.trim()
            ? image
            : FALLBACK_IMAGE
    );

}


// ==========================================================
// TIMESTAMP
// ==========================================================

function getTimestamp(value) {

    if (!value) return 0;


    if (
        typeof value === "number"
    ) {

        return value;

    }


    if (
        typeof value === "string"
    ) {

        const time =
            Date.parse(value);


        return Number.isNaN(time)
            ? 0
            : time;

    }


    if (
        typeof value === "object"
    ) {

        if (
            typeof value.seconds ===
            "number"
        ) {

            return (
                value.seconds * 1000
            );

        }


        if (
            typeof value.toMillis ===
            "function"
        ) {

            return value.toMillis();

        }

    }


    return 0;

}


// ==========================================================
// STARS
// ==========================================================

function renderStars(rating) {

    const value =
        Math.max(
            0,
            Math.min(
                5,
                Number(rating) || 0
            )
        );


    let html = "";


    for (
        let i = 1;
        i <= 5;
        i++
    ) {

        if (i <= value) {

            html +=
                `<span class="star filled">★</span>`;

        } else {

            html +=
                `<span class="star">☆</span>`;

        }

    }


    return html;

}


// ==========================================================
// NORMALIZE
// ==========================================================

function normalizeValue(value) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        );

}


// ==========================================================
// MONEY
// ==========================================================

function formatMoney(value) {

    const number =
        Number(value) || 0;


    return number.toLocaleString(
        "en-BD",
        {
            maximumFractionDigits: 0
        }
    );

}


// ==========================================================
// HTML ESCAPE
// ==========================================================

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


function escapeAttr(value) {

    return escapeHTML(value);

}


// ==========================================================
// DEBUG
// ==========================================================

window.nishatShopDebug = function () {

    console.log(
        "Nishat Shop Debug"
    );


    console.log(
        "All products:",
        allProducts.length
    );


    console.log(
        "Filtered products:",
        filteredProducts.length
    );


    console.log(
        "Current page:",
        currentPage
    );


    console.log(
        "Search:",
        searchText
    );


    console.log(
        "Category:",
        selectedCategory
    );


    console.log(
        "Gender:",
        selectedGender
    );


    console.log(
        "Discount:",
        selectedDiscount
    );


    console.log(
        "Sort:",
        selectedSort
    );


    console.log(
        "Price:",
        minPrice,
        maxPrice
    );


    console.log(
        "Product URL example:",
        allProducts[0]
            ? `../product/product.html?id=${encodeURIComponent(allProducts[0].id || "")}`
            : "No product"
    );


    return {

        allProducts,

        filteredProducts,

        currentPage,

        searchText,

        selectedCategory,

        selectedGender,

        selectedDiscount,

        selectedSort,

        minPrice,

        maxPrice

    };

};