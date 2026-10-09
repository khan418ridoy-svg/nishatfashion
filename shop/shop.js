/* =========================================================
   NISHAT FASHION
   SHOP PAGE JS
========================================================= */

import {
    getProducts
} from "./products.js";

import {
    auth,
    db
} from "../firebase/firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   CONFIG
========================================================= */

const PRODUCTS_PER_PAGE = 12;


/* =========================================================
   DOM ELEMENTS
========================================================= */

const productContainer =
    document.getElementById("shopProducts");

const productsLoading =
    document.getElementById("productsLoading");

const emptyProducts =
    document.getElementById("emptyProducts");

const resultCount =
    document.getElementById("resultCount");

const pagination =
    document.getElementById("pagination");

const sortProducts =
    document.getElementById("sortProducts");

const categoryFilters =
    document.getElementById("categoryFilters");

const minPriceInput =
    document.getElementById("minPrice");

const maxPriceInput =
    document.getElementById("maxPrice");

const applyPriceButton =
    document.getElementById("applyPrice");

const clearFiltersButton =
    document.getElementById("clearFilters");

const emptyClearButton =
    document.getElementById("emptyClearBtn");

const filterMobileButton =
    document.getElementById("filterMobileBtn");

const closeFiltersButton =
    document.getElementById("closeFilters");

const filterSidebar =
    document.getElementById("filterSidebar");

/* ✅ নতুন — Active Filter Bar */
const activeFiltersBar =
    document.getElementById("activeFiltersBar");


/* =========================================================
   STATE
========================================================= */

let allProducts = [];

let filteredProducts = [];

let currentPage = 1;


/* =========================================================
   FILTER STATE
========================================================= */

const filterState = {

    search: "",

    categories: [],

    discounts: [],

    minPrice: null,

    maxPrice: null,

    sort: "default",

    /* ✅ নতুন — New Arrival / Best Seller / Featured */
    collection: ""

};


/* =========================================================
   HELPER
========================================================= */

function normalize(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   PRICE FORMAT
========================================================= */

function formatPrice(value) {

    const number =
        Number(value) || 0;

    return number.toLocaleString("en-BD");

}


/* =========================================================
   GET CATEGORIES
========================================================= */

function getProductCategories(product) {

    if (
        Array.isArray(product?.category)
    ) {

        return product.category
            .filter(Boolean)
            .map(
                item =>
                    String(item).trim()
            );

    }


    if (
        product?.category
    ) {

        return [
            String(
                product.category
            ).trim()
        ];

    }


    return [];

}


/* =========================================================
   GET CURRENT PRICE
========================================================= */

function getCurrentPrice(product) {

    const discountPrice =
        Number(
            product?.discountPrice
        );

    const salePrice =
        Number(
            product?.salePrice
        );


    if (
        Number.isFinite(
            discountPrice
        ) &&
        discountPrice > 0 &&
        (
            salePrice <= 0 ||
            discountPrice < salePrice
        )
    ) {

        return discountPrice;

    }


    return Number.isFinite(
        salePrice
    )
        ? salePrice
        : 0;

}


/* =========================================================
   GET OLD PRICE
========================================================= */

function getOldPrice(product) {

    const salePrice =
        Number(
            product?.salePrice
        );

    const discountPrice =
        Number(
            product?.discountPrice
        );


    if (
        salePrice > 0 &&
        discountPrice > 0 &&
        discountPrice < salePrice
    ) {

        return salePrice;

    }


    return 0;

}


/* =========================================================
   GET DISCOUNT %
========================================================= */

function getDiscountPercent(product) {

    const oldPrice =
        getOldPrice(product);

    const currentPrice =
        getCurrentPrice(product);


    if (
        oldPrice <= 0 ||
        currentPrice <= 0 ||
        currentPrice >= oldPrice
    ) {

        return 0;

    }


    return Math.round(

        (
            (
                oldPrice -
                currentPrice
            ) /
            oldPrice
        ) * 100

    );

}


/* =========================================================
   SEARCH TEXT
========================================================= */

function getProductSearchText(product) {

    const categories =
        getProductCategories(
            product
        );


    const colors =
        Array.isArray(
            product?.colors
        )
            ? product.colors
            : [];


    const sizes =
        Array.isArray(
            product?.sizes
        )
            ? product.sizes
            : [];


    return [

        product?.name,

        product?.sku,

        product?.shortDescription,

        ...categories,

        ...colors,

        ...sizes

    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

}


/* =========================================================
   GET UNIQUE CATEGORIES
========================================================= */

function getUniqueCategories() {

    const categoryMap =
        new Map();


    allProducts.forEach(
        product => {

            const categories =
                getProductCategories(
                    product
                );


            categories.forEach(
                category => {

                    if (!category) {
                        return;
                    }


                    const key =
                        normalize(
                            category
                        );


                    if (
                        !categoryMap.has(
                            key
                        )
                    ) {

                        categoryMap.set(
                            key,
                            category
                        );

                    }

                }
            );

        }
    );


    return Array.from(
        categoryMap.values()
    ).sort(
        (a, b) =>
            a.localeCompare(
                b,
                undefined,
                {
                    sensitivity:
                        "base"
                }
            )
    );

}


/* =========================================================
   RENDER CATEGORY FILTERS
========================================================= */

function renderCategoryFilters() {

    if (
        !categoryFilters
    ) {
        return;
    }


    const categories =
        getUniqueCategories();


    if (
        categories.length === 0
    ) {

        categoryFilters.innerHTML = `

            <span class="filter-note">
                No categories available
            </span>

        `;

        return;

    }


    categoryFilters.innerHTML =
        categories
            .map(
                category => {

                    const selected =
                        filterState.categories.some(
                            item =>
                                normalize(
                                    item
                                ) ===
                                normalize(
                                    category
                                )
                        );


                    return `

                        <label class="check-item">

                            <input
                                type="checkbox"
                                class="category-filter"
                                value="${escapeHtml(category)}"
                                ${selected ? "checked" : ""}
                            >

                            <span>
                                ${escapeHtml(category)}
                            </span>

                        </label>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   READ URL PARAMETERS
========================================================= */

function readUrlParameters() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    /* SEARCH */

    const search =
        params.get("search");


    if (search) {

        filterState.search =
            search.trim();

    }


    /* CATEGORY */

    const category =
        params.get("category");


    if (category) {

        filterState.categories =
            category
                .split(",")
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);

    }


    /* SORT */

    const sort =
        params.get("sort");


    const validSorts = [

        "default",

        "newest",

        "price-low",

        "price-high",

        "discount"

    ];


    if (
        validSorts.includes(sort)
    ) {

        filterState.sort =
            sort;

    }


    /* MIN PRICE */

    const min =
        Number(
            params.get(
                "minPrice"
            )
        );


    if (
        Number.isFinite(min) &&
        min > 0
    ) {

        filterState.minPrice =
            min;

    }


    /* MAX PRICE */

    const max =
        Number(
            params.get(
                "maxPrice"
            )
        );


    if (
        Number.isFinite(max) &&
        max > 0
    ) {

        filterState.maxPrice =
            max;

    }


    /* ✅ নতুন — COLLECTION FILTER */

    const filter =
        params.get("filter");


    if (
        filter === "newArrival" ||
        filter === "bestSeller" ||
        filter === "featured"
    ) {

        filterState.collection =
            filter;

    }


    /* UPDATE UI */

    if (
        sortProducts
    ) {

        sortProducts.value =
            filterState.sort;

    }


    if (
        minPriceInput
    ) {

        minPriceInput.value =
            filterState.minPrice ?? "";

    }


    if (
        maxPriceInput
    ) {

        maxPriceInput.value =
            filterState.maxPrice ?? "";

    }


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (
        searchInput &&
        filterState.search
    ) {

        searchInput.value =
            filterState.search;

    }

}


/* =========================================================
   ✅ COLLECTION MATCH — নতুন
========================================================= */

function productMatchesCollection(product) {

    if (!filterState.collection) {

        return true;

    }


    if (
        filterState.collection ===
        "newArrival"
    ) {

        return product?.newArrival === true;

    }


    if (
        filterState.collection ===
        "bestSeller"
    ) {

        return product?.bestSeller === true;

    }


    if (
        filterState.collection ===
        "featured"
    ) {

        return product?.featured === true;

    }


    return true;

}


/* =========================================================
   CATEGORY MATCH
========================================================= */

function productMatchesCategory(
    product
) {

    if (
        filterState.categories.length === 0
    ) {

        return true;

    }


    const productCategories =
        getProductCategories(
            product
        );


    return productCategories.some(
        productCategory =>

            filterState.categories.some(
                selectedCategory =>

                    normalize(
                        productCategory
                    ) ===
                    normalize(
                        selectedCategory
                    )

            )
    );

}


/* =========================================================
   SEARCH MATCH
========================================================= */

function productMatchesSearch(
    product
) {

    if (
        !filterState.search
    ) {

        return true;

    }


    const search =
        normalize(
            filterState.search
        );


    return normalize(
        getProductSearchText(
            product
        )
    ).includes(
        search
    );

}


/* =========================================================
   PRICE MATCH
========================================================= */

function productMatchesPrice(
    product
) {

    const price =
        getCurrentPrice(
            product
        );


    if (
        filterState.minPrice !== null &&
        price < filterState.minPrice
    ) {

        return false;

    }


    if (
        filterState.maxPrice !== null &&
        price > filterState.maxPrice
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   DISCOUNT MATCH
========================================================= */

function productMatchesDiscount(
    product
) {

    if (
        filterState.discounts.length === 0
    ) {

        return true;

    }


    const discount =
        getDiscountPercent(
            product
        );


    return filterState.discounts.some(
        minimum =>
            discount >= minimum
    );

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    filteredProducts =
        allProducts.filter(
            product =>

                productMatchesCollection(
                    product
                ) &&

                productMatchesSearch(
                    product
                ) &&

                productMatchesCategory(
                    product
                ) &&

                productMatchesPrice(
                    product
                ) &&

                productMatchesDiscount(
                    product
                )
        );


    sortFilteredProducts();


    currentPage = 1;


    /* ✅ Active filter chips render */
    renderActiveFilters();


    renderProducts();

}


/* =========================================================
   ✅ ACTIVE FILTER CHIPS
========================================================= */

function getCollectionLabel(value) {

    switch (value) {

        case "newArrival":
            return "New Arrivals";

        case "bestSeller":
            return "Best Sellers";

        case "featured":
            return "Featured";

        default:
            return "";

    }

}


function renderActiveFilters() {

    if (!activeFiltersBar) {

        return;

    }


    const chips = [];


    /* COLLECTION */

    if (filterState.collection) {

        chips.push({

            type: "collection",

            label:
                getCollectionLabel(
                    filterState.collection
                ),

            value:
                filterState.collection

        });

    }


    /* SEARCH */

    if (filterState.search) {

        chips.push({

            type: "search",

            label:
                `Search: "${filterState.search}"`,

            value:
                filterState.search

        });

    }


    /* CATEGORIES */

    filterState.categories.forEach(
        cat => {

            chips.push({

                type: "category",

                label: cat,

                value: cat

            });

        }
    );


    /* DISCOUNTS */

    filterState.discounts.forEach(
        d => {

            chips.push({

                type: "discount",

                label: `${d}% or more`,

                value: d

            });

        }
    );


    /* PRICE */

    if (
        filterState.minPrice !== null ||
        filterState.maxPrice !== null
    ) {

        const minLabel =
            filterState.minPrice !== null
                ? `৳${formatPrice(filterState.minPrice)}`
                : "0";

        const maxLabel =
            filterState.maxPrice !== null
                ? `৳${formatPrice(filterState.maxPrice)}`
                : "∞";


        chips.push({

            type: "price",

            label:
                `Price: ${minLabel} — ${maxLabel}`,

            value: ""

        });

    }


    if (chips.length === 0) {

        activeFiltersBar.innerHTML = "";

        activeFiltersBar.classList.remove("show");

        return;

    }


    activeFiltersBar.innerHTML = `

        <div class="active-filters-inner">

            <span class="active-filters-label">
                Active Filters:
            </span>

            <div class="active-filters-chips">

                ${chips.map(chip => `

                    <button
                        type="button"
                        class="filter-chip"
                        data-chip-type="${escapeHtml(chip.type)}"
                        data-chip-value="${escapeHtml(chip.value)}"
                    >

                        <span>
                            ${escapeHtml(chip.label)}
                        </span>

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                `).join("")}

            </div>

            <button
                type="button"
                class="active-filters-clear"
                id="clearAllChips"
            >
                Clear All
            </button>

        </div>

    `;

    activeFiltersBar.classList.add("show");

}


/* =========================================================
   ✅ REMOVE SINGLE CHIP
========================================================= */

function removeChip(type, value) {

    if (type === "collection") {

        filterState.collection = "";

    }


    if (type === "search") {

        filterState.search = "";

        const searchInput =
            document.getElementById(
                "searchInput"
            );

        if (searchInput) {

            searchInput.value = "";

        }

    }


    if (type === "category") {

        filterState.categories =
            filterState.categories.filter(
                cat =>
                    normalize(cat) !==
                    normalize(value)
            );


        document
            .querySelectorAll(
                ".category-filter"
            )
            .forEach(cb => {

                if (
                    normalize(cb.value) ===
                    normalize(value)
                ) {

                    cb.checked = false;

                }

            });

    }


    if (type === "discount") {

        const numericValue =
            Number(value);


        filterState.discounts =
            filterState.discounts.filter(
                d =>
                    Number(d) !==
                    numericValue
            );


        document
            .querySelectorAll(
                ".discount-filter"
            )
            .forEach(cb => {

                if (
                    Number(cb.value) ===
                    numericValue
                ) {

                    cb.checked = false;

                }

            });

    }


    if (type === "price") {

        filterState.minPrice = null;

        filterState.maxPrice = null;

        if (minPriceInput) {

            minPriceInput.value = "";

        }

        if (maxPriceInput) {

            maxPriceInput.value = "";

        }

    }


    applyFilters();

}


/* =========================================================
   ✅ CHIP CLICK HANDLER
========================================================= */

document.addEventListener(
    "click",
    event => {

        const chip =
            event.target.closest(
                ".filter-chip"
            );


        if (chip) {

            const type =
                chip.dataset.chipType;

            const value =
                chip.dataset.chipValue;


            removeChip(
                type,
                value
            );

            return;

        }


        const clearBtn =
            event.target.closest(
                "#clearAllChips"
            );


        if (clearBtn) {

            clearAllFilters();

        }

    }
);


/* =========================================================
   UPDATED TIME
========================================================= */

function getUpdatedTime(product) {

    const value =
        product?.updatedAt;


    if (
        value &&
        typeof value === "object"
    ) {

        if (
            typeof value.toMillis ===
            "function"
        ) {

            return value.toMillis();

        }


        if (
            Number.isFinite(
                value.seconds
            )
        ) {

            return Number(
                value.seconds
            ) * 1000;

        }

    }


    const parsed =
        Date.parse(
            String(
                value || ""
            )
        );


    return Number.isFinite(
        parsed
    )
        ? parsed
        : 0;

}


/* =========================================================
   SORT
========================================================= */

function sortFilteredProducts() {

    switch (
        filterState.sort
    ) {

        case "price-low":

            filteredProducts.sort(
                (a, b) =>
                    getCurrentPrice(a) -
                    getCurrentPrice(b)
            );

            break;


        case "price-high":

            filteredProducts.sort(
                (a, b) =>
                    getCurrentPrice(b) -
                    getCurrentPrice(a)
            );

            break;


        case "discount":

            filteredProducts.sort(
                (a, b) =>
                    getDiscountPercent(b) -
                    getDiscountPercent(a)
            );

            break;


        case "newest":

            filteredProducts.sort(
                (a, b) =>
                    getUpdatedTime(b) -
                    getUpdatedTime(a)
            );

            break;


        case "default":

        default:

            filteredProducts.sort(
                (a, b) => {

                    const featuredDifference =

                        Number(
                            b.featured === true
                        ) -

                        Number(
                            a.featured === true
                        );


                    if (
                        featuredDifference !== 0
                    ) {

                        return featuredDifference;

                    }


                    return (
                        getUpdatedTime(b) -
                        getUpdatedTime(a)
                    );

                }
            );

            break;

    }

}


/* =========================================================
   GET PRODUCT IMAGE
========================================================= */

function getProductImage(
    product
) {

    if (
        product?.thumbnail
    ) {

        return product.thumbnail;

    }


    if (
        Array.isArray(
            product?.images
        ) &&
        product.images.length > 0
    ) {

        const first =
            product.images[0];


        if (
            typeof first === "string"
        ) {

            return first;

        }


        if (
            first &&
            typeof first === "object"
        ) {

            return (
                first.url ||
                first.src ||
                first.image ||
                ""
            );

        }

    }


    return "../asset/logo.png";

}


/* =========================================================
   PRODUCT CARD
========================================================= */

function createProductCard(
    product
) {

    const productId =
        String(
            product?.id || ""
        );


    const name =
        product?.name ||
        "Unnamed Product";


    const image =
        getProductImage(
            product
        );


    const currentPrice =
        getCurrentPrice(
            product
        );


    const oldPrice =
        getOldPrice(
            product
        );


    const discount =
        getDiscountPercent(
            product
        );


    const categories =
        getProductCategories(
            product
        );


    const firstCategory =
        categories[0] || "";


    const isNew =
        product?.newArrival === true;


    const isWishlisted =
        wishlistIds.has(
            productId
        );


    return `

        <article
            class="product-card"
            data-product-id="${escapeHtml(productId)}"
        >

            <a
                href="../product/?id=${encodeURIComponent(productId)}"
                class="product-image"
            >

                <img
                    src="${escapeHtml(image)}"
                    alt="${escapeHtml(name)}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='../asset/logo.png';"
                >

                ${
                    discount > 0
                        ? `

                            <span class="sale-badge">
                                -${discount}%
                            </span>

                        `
                        : ""
                }

                ${
                    isNew
                        ? `

                            <span class="new-badge">
                                NEW
                            </span>

                        `
                        : ""
                }

            </a>


            <button
                type="button"
                class="wishlist-btn ${
                    isWishlisted
                        ? "active"
                        : ""
                }"
                data-id="${escapeHtml(productId)}"
                aria-label="${
                    isWishlisted
                        ? "Remove from wishlist"
                        : "Add to wishlist"
                }"
            >

                <i
                    class="${
                        isWishlisted
                            ? "fa-solid"
                            : "fa-regular"
                    } fa-heart"
                ></i>

            </button>


            <div class="product-info">

                ${
                    firstCategory
                        ? `

                            <div class="product-category">
                                ${escapeHtml(firstCategory)}
                            </div>

                        `
                        : ""
                }


                <h3 class="product-name">

                    <a
                        href="../product/?id=${encodeURIComponent(productId)}"
                    >
                        ${escapeHtml(name)}
                    </a>

                </h3>


                <div class="product-price">

                    <span class="sale-price">

                        ৳${formatPrice(currentPrice)}

                    </span>


                    ${
                        oldPrice > currentPrice
                            ? `

                                <span class="regular-price">

                                    ৳${formatPrice(oldPrice)}

                                </span>

                            `
                            : ""
                    }

                </div>

            </div>

        </article>

    `;

}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

    if (
        !productContainer
    ) {

        return;

    }


    const total =
        filteredProducts.length;


    if (
        resultCount
    ) {

        resultCount.textContent =
            total;

    }


    if (
        total === 0
    ) {

        productContainer.innerHTML =
            "";


        emptyProducts
            ?.classList.add(
                "show"
            );


        if (
            pagination
        ) {

            pagination.innerHTML =
                "";

        }


        return;

    }


    emptyProducts
        ?.classList.remove(
            "show"
        );


    const totalPages =
        Math.ceil(
            total /
            PRODUCTS_PER_PAGE
        );


    if (
        currentPage > totalPages
    ) {

        currentPage =
            totalPages;

    }


    const startIndex =
        (
            currentPage - 1
        ) *
        PRODUCTS_PER_PAGE;


    const endIndex =
        startIndex +
        PRODUCTS_PER_PAGE;


    const pageProducts =
        filteredProducts.slice(
            startIndex,
            endIndex
        );


    productContainer.innerHTML =
        pageProducts
            .map(
                product =>
                    createProductCard(
                        product
                    )
            )
            .join("");


    renderPagination(
        totalPages
    );

}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(
    totalPages
) {

    if (
        !pagination
    ) {

        return;

    }


    if (
        totalPages <= 1
    ) {

        pagination.innerHTML =
            "";

        return;

    }


    let html = "";


    html += `

        <button
            type="button"
            class="page-btn"
            data-page="${currentPage - 1}"
            aria-label="Previous page"
            ${
                currentPage === 1
                    ? "disabled"
                    : ""
            }
        >

            <i class="fa-solid fa-chevron-left"></i>

        </button>

    `;


    const maxVisiblePages = 7;


    let startPage =
        Math.max(
            1,
            currentPage -
                Math.floor(
                    maxVisiblePages / 2
                )
        );


    let endPage =
        Math.min(
            totalPages,
            startPage +
                maxVisiblePages -
                1
        );


    if (
        endPage - startPage + 1 <
        maxVisiblePages
    ) {

        startPage =
            Math.max(
                1,
                endPage -
                    maxVisiblePages +
                    1
            );

    }


    for (
        let page = startPage;
        page <= endPage;
        page++
    ) {

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

    }


    html += `

        <button
            type="button"
            class="page-btn"
            data-page="${currentPage + 1}"
            aria-label="Next page"
            ${
                currentPage === totalPages
                    ? "disabled"
                    : ""
            }
        >

            <i class="fa-solid fa-chevron-right"></i>

        </button>

    `;


    pagination.innerHTML =
        html;

}


/* =========================================================
   PAGINATION EVENT
========================================================= */

pagination?.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".page-btn"
            );


        if (
            !button ||
            button.disabled
        ) {

            return;

        }


        const page =
            Number(
                button.dataset.page
            );


        if (
            !Number.isInteger(page) ||
            page < 1
        ) {

            return;

        }


        currentPage =
            page;


        renderProducts();


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }
);


/* =========================================================
   CATEGORY FILTER EVENT
========================================================= */

document.addEventListener(
    "change",
    event => {

        if (
            event.target.matches(
                ".category-filter"
            )
        ) {

            filterState.categories =
                Array.from(
                    document.querySelectorAll(
                        ".category-filter:checked"
                    )
                )
                    .map(
                        input =>
                            input.value
                    )
                    .filter(Boolean);


            applyFilters();

        }

    }
);


/* =========================================================
   DISCOUNT FILTER EVENT
========================================================= */

document.addEventListener(
    "change",
    event => {

        if (
            event.target.matches(
                ".discount-filter"
            )
        ) {

            filterState.discounts =
                Array.from(
                    document.querySelectorAll(
                        ".discount-filter:checked"
                    )
                )
                    .map(
                        input =>
                            Number(
                                input.value
                            )
                    )
                    .filter(
                        Number.isFinite
                    );


            applyFilters();

        }

    }
);


/* =========================================================
   SORT EVENT
========================================================= */

sortProducts?.addEventListener(
    "change",
    () => {

        filterState.sort =
            sortProducts.value;


        applyFilters();

    }
);


/* =========================================================
   PRICE FILTER
========================================================= */

applyPriceButton?.addEventListener(
    "click",
    () => {

        const min =
            Number(
                minPriceInput?.value
            );


        const max =
            Number(
                maxPriceInput?.value
            );


        if (
            min > 0 &&
            max > 0 &&
            min > max
        ) {

            alert(
                "Minimum price cannot be higher than maximum price."
            );

            return;

        }


        filterState.minPrice =
            min > 0
                ? min
                : null;


        filterState.maxPrice =
            max > 0
                ? max
                : null;


        applyFilters();

    }
);


/* =========================================================
   PRICE ENTER KEY
========================================================= */

[minPriceInput, maxPriceInput]
    .forEach(
        input => {

            input?.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        applyPriceButton?.click();

                    }

                }
            );

        }
    );


/* =========================================================
   CLEAR FILTERS
========================================================= */

function clearAllFilters() {

    filterState.search =
        "";

    filterState.categories =
        [];

    filterState.discounts =
        [];

    filterState.minPrice =
        null;

    filterState.maxPrice =
        null;

    filterState.sort =
        "default";

    /* ✅ Collection reset */
    filterState.collection =
        "";


    currentPage =
        1;


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    if (
        searchInput
    ) {

        searchInput.value =
            "";

    }


    if (
        sortProducts
    ) {

        sortProducts.value =
            "default";

    }


    if (
        minPriceInput
    ) {

        minPriceInput.value =
            "";

    }


    if (
        maxPriceInput
    ) {

        maxPriceInput.value =
            "";

    }


    document
        .querySelectorAll(
            ".category-filter, .discount-filter"
        )
        .forEach(
            input => {

                input.checked =
                    false;

            }
        );


    applyFilters();

}


/* =========================================================
   CLEAR EVENTS
========================================================= */

clearFiltersButton?.addEventListener(
    "click",
    clearAllFilters
);


emptyClearButton?.addEventListener(
    "click",
    clearAllFilters
);


/* =========================================================
   SEARCH
========================================================= */

function performSearch() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );


    filterState.search =
        searchInput?.value
            ?.trim() || "";


    currentPage =
        1;


    applyFilters();

}


document
    .getElementById(
        "searchBtn"
    )
    ?.addEventListener(
        "click",
        performSearch
    );


document
    .getElementById(
        "searchInput"
    )
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                performSearch();

            }

        }
    );


/* =========================================================
   WISHLIST - FIRESTORE
========================================================= */

let currentUser = null;

let wishlistIds = new Set();


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        currentUser =
            user || null;


        wishlistIds =
            new Set();


        if (currentUser) {

            await loadWishlist();

        }


        renderProducts();

    }
);


/* =========================================================
   LOAD USER WISHLIST
========================================================= */

async function loadWishlist() {

    if (!currentUser) {

        wishlistIds =
            new Set();

        return;

    }


    try {

        const wishlistRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "wishlist"
            );


        const snapshot =
            await getDocs(
                wishlistRef
            );


        wishlistIds =
            new Set();


        snapshot.forEach(
            wishlistDoc => {

                wishlistIds.add(
                    String(
                        wishlistDoc.id
                    )
                );

            }
        );

    }
    catch (error) {

        console.error(
            "Wishlist load error:",
            error
        );


        wishlistIds =
            new Set();

    }

}


/* =========================================================
   LOGIN REDIRECT
========================================================= */

function redirectToLogin() {

    const returnUrl =
        window.location.href;


    const loginUrl =
        `../login/index.html?returnUrl=${encodeURIComponent(returnUrl)}`;


    window.location.href =
        loginUrl;

}


/* =========================================================
   ADD TO FIRESTORE WISHLIST
========================================================= */

async function addToWishlist(
    product
) {

    if (!currentUser) {

        redirectToLogin();

        return false;

    }


    const productId =
        String(
            product?.id || ""
        );


    if (!productId) {

        console.error(
            "Wishlist: Product ID missing."
        );

        return false;

    }


    const price =
        getCurrentPrice(
            product
        );


    const image =
        getProductImage(
            product
        );


    const wishlistRef =
        doc(
            db,
            "users",
            currentUser.uid,
            "wishlist",
            productId
        );


    try {

        await setDoc(
            wishlistRef,
            {

                addedAt:
                    serverTimestamp(),

                image:
                    image || "",

                name:
                    product?.name || "",

                price:
                    price,

                productId:
                    productId

            },
            {
                merge: true
            }
        );


        wishlistIds.add(
            productId
        );


        /* ✅ HEADER-কে সাথে সাথে জানাও */

        window.dispatchEvent(
            new CustomEvent(
                "nfWishlistUpdated",
                {
                    detail: {

                        count:
                            wishlistIds.size,

                        productId:
                            productId,

                        action:
                            "add"

                    }
                }
            )
        );


        return true;

    }
    catch (error) {

        console.error(
            "Add wishlist error:",
            error
        );


        return false;

    }

}


/* =========================================================
   REMOVE FROM FIRESTORE WISHLIST
========================================================= */

async function removeFromWishlist(
    productId
) {

    if (!currentUser) {

        redirectToLogin();

        return false;

    }


    productId =
        String(
            productId || ""
        );


    if (!productId) {

        return false;

    }


    try {

        const wishlistRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "wishlist",
                productId
            );


        await deleteDoc(
            wishlistRef
        );


        wishlistIds.delete(
            productId
        );


        /* ✅ HEADER-কে সাথে সাথে জানাও */

        window.dispatchEvent(
            new CustomEvent(
                "nfWishlistUpdated",
                {
                    detail: {

                        count:
                            wishlistIds.size,

                        productId:
                            productId,

                        action:
                            "remove"

                    }
                }
            )
        );


        return true;

    }
    catch (error) {

        console.error(
            "Remove wishlist error:",
            error
        );


        return false;

    }

}


/* =========================================================
   WISHLIST CLICK
========================================================= */

document.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                ".wishlist-btn"
            );


        if (!button) {

            return;

        }


        event.preventDefault();

        event.stopPropagation();


        const productId =
            String(
                button.dataset.id || ""
            );


        if (!productId) {

            return;

        }


        if (!currentUser) {

            redirectToLogin();

            return;

        }


        const product =
            allProducts.find(
                item =>
                    String(
                        item?.id || ""
                    ) ===
                    productId
            );


        if (!product) {

            console.error(
                "Wishlist product not found:",
                productId
            );

            return;

        }


        if (
            wishlistIds.has(
                productId
            )
        ) {

            const removed =
                await removeFromWishlist(
                    productId
                );


            if (removed) {

                renderProducts();

            }


            return;

        }


        const added =
            await addToWishlist(
                product
            );


        if (added) {

            renderProducts();

        }

    }
);


/* =========================================================
   MOBILE FILTER OPEN
========================================================= */

filterMobileButton?.addEventListener(
    "click",
    () => {

        filterSidebar?.classList.add(
            "open"
        );


        document.body.classList.add(
            "menu-open"
        );

    }
);


/* =========================================================
   MOBILE FILTER CLOSE
========================================================= */

closeFiltersButton?.addEventListener(
    "click",
    () => {

        filterSidebar?.classList.remove(
            "open"
        );


        document.body.classList.remove(
            "menu-open"
        );

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeShop() {

    try {

        readUrlParameters();


        allProducts =
            await getProducts();


        if (
            !Array.isArray(
                allProducts
            )
        ) {

            allProducts =
                [];

        }


        renderCategoryFilters();


        document
            .querySelectorAll(
                ".category-filter"
            )
            .forEach(
                checkbox => {

                    checkbox.checked =
                        filterState.categories.some(
                            category =>
                                normalize(
                                    category
                                ) ===
                                normalize(
                                    checkbox.value
                                )
                        );

                }
            );


        applyFilters();

    }
    catch (error) {

        console.error(
            "Shop initialization failed:",
            error
        );


        allProducts =
            [];

        filteredProducts =
            [];


        if (
            productContainer
        ) {

            productContainer.innerHTML =
                "";

        }


        emptyProducts
            ?.classList.add(
                "show"
            );

    }
    finally {

        productsLoading
            ?.classList.add(
                "hide"
            );

    }

}


/* =========================================================
   START
========================================================= */

initializeShop();