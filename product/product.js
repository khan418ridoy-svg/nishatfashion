// =========================================================
// NISHAT FASHION - PRODUCT DETAILS
// =========================================================
// Direct Firestore Product Load
// No thumbnail field
// Product images come ONLY from images[]
// Google Sheet Reviews
// Approved Reviews Only
// First 3 Reviews
// Load More = 10
// Cart
// Wishlist
// Description / Details / Shipping Tabs
// =========================================================


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
    query,
    where,
    getDocs,
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

const MAX_QUANTITY =
    99;


// =========================================================
// GOOGLE SHEET REVIEW API
// =========================================================

const REVIEWS_API_URL =
    "https://script.google.com/macros/s/AKfycbxjlt6CD52Nql27PFNb9QFTWO_tT0m--fYw4yTC8b5evGC8hi0WFqgrezCWY95oOmP9/exec";


const INITIAL_REVIEWS =
    3;


const MORE_REVIEWS =
    10;


// =========================================================
// URL PRODUCT ID
// =========================================================

const params =
    new URLSearchParams(
        window.location.search
    );


const productId =
    String(
        params.get("id") || ""
    ).trim();


// =========================================================
// STATE
// =========================================================

let currentProduct =
    null;


let selectedSizeValue =
    "";


let selectedColorValue =
    "";


let allApprovedReviews =
    [];


let visibleReviewCount =
    0;


let reviewsLoading =
    false;


// =========================================================
// DOM ELEMENTS
// =========================================================

const productLoading =
    document.getElementById(
        "productLoading"
    );


const productContent =
    document.getElementById(
        "productContent"
    );


const productInfoSection =
    document.getElementById(
        "productInfoSection"
    );


const productVideoSection =
    document.getElementById(
        "productVideoSection"
    );


const productError =
    document.getElementById(
        "productError"
    );


// =========================================================
// IMAGE ELEMENTS
// =========================================================

const mainImage =
    document.getElementById(
        "mainProductImage"
    );


const thumbnailList =
    document.getElementById(
        "thumbnailList"
    );


// =========================================================
// PRODUCT INFO
// =========================================================

const breadcrumbProduct =
    document.getElementById(
        "breadcrumbProduct"
    );


const productCollection =
    document.getElementById(
        "productCollection"
    );


const productName =
    document.getElementById(
        "productName"
    );


const productStars =
    document.getElementById(
        "productStars"
    );


const productRating =
    document.getElementById(
        "productRating"
    );


const productReviews =
    document.getElementById(
        "productReviews"
    );


const productPrice =
    document.getElementById(
        "productPrice"
    );


const productOldPrice =
    document.getElementById(
        "productOldPrice"
    );


const productSave =
    document.getElementById(
        "productSave"
    );


const productDiscount =
    document.getElementById(
        "productDiscount"
    );


const productDescription =
    document.getElementById(
        "productDescription"
    );


const longDescription =
    document.getElementById(
        "longDescription"
    );


// =========================================================
// COLOR
// =========================================================

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


// =========================================================
// SIZE
// =========================================================

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


// =========================================================
// CART
// =========================================================

const stockStatus =
    document.getElementById(
        "stockStatus"
    );


const quantityInput =
    document.getElementById(
        "quantity"
    );


const decreaseQty =
    document.getElementById(
        "decreaseQty"
    );


const increaseQty =
    document.getElementById(
        "increaseQty"
    );


const addToCart =
    document.getElementById(
        "addToCart"
    );


const buyNow =
    document.getElementById(
        "buyNow"
    );


const imageWishlist =
    document.getElementById(
        "imageWishlist"
    );


// =========================================================
// DETAILS
// =========================================================

const detailCategory =
    document.getElementById(
        "detailCategory"
    );


const detailCollection =
    document.getElementById(
        "detailCollection"
    );


const detailBrand =
    document.getElementById(
        "detailBrand"
    );


const detailMaterial =
    document.getElementById(
        "detailMaterial"
    );


const detailFit =
    document.getElementById(
        "detailFit"
    );


const detailSku =
    document.getElementById(
        "detailSku"
    );


// =========================================================
// VIDEO
// =========================================================

const productVideo =
    document.getElementById(
        "productVideo"
    );


// =========================================================
// REVIEWS
// =========================================================

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


// =========================================================
// START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // Tabs
        initInfoTabs();


        if (!productId) {

            showError();

            return;

        }


        await loadProduct(
            productId
        );

    }
);


// =========================================================
// LOAD PRODUCT FROM FIRESTORE
// =========================================================
// First:
// products/{documentId}
//
// If document ID does not match,
// fallback to products where id == URL id.
//
// IMPORTANT:
// thumbnail is NOT used.
// =========================================================

async function loadProduct(
    id
) {

    try {

        let product =
            null;


        // =================================================
        // STEP 1
        // DIRECT DOCUMENT ID
        // =================================================

        const productRef =
            doc(
                db,
                "products",
                id
            );


        const productSnap =
            await getDoc(
                productRef
            );


        if (
            productSnap.exists()
        ) {

            product = {

                id:
                    productSnap.id,

                ...productSnap.data()

            };

        }


        // =================================================
        // STEP 2
        // FALLBACK
        // Firestore field: id
        // =================================================

        if (!product) {

            const productsRef =
                collection(
                    db,
                    "products"
                );


            const q =
                query(
                    productsRef,
                    where(
                        "id",
                        "==",
                        id
                    )
                );


            const querySnapshot =
                await getDocs(
                    q
                );


            if (
                !querySnapshot.empty
            ) {

                const firstDoc =
                    querySnapshot.docs[0];


                product = {

                    id:
                        firstDoc.id,

                    ...firstDoc.data()

                };

            }

        }


        // =================================================
        // NOT FOUND
        // =================================================

        if (!product) {

            console.error(
                "Product not found:",
                id
            );


            showError();

            return;

        }


        currentProduct =
            product;


        console.log(
            "Product loaded from Firestore:",
            currentProduct
        );


        renderProduct(
            currentProduct
        );


    } catch (error) {

        console.error(
            "Firestore product error:",
            error
        );


        showError();

    }

}


// =========================================================
// RENDER PRODUCT
// =========================================================

function renderProduct(
    product
) {

    if (!product) {

        showError();

        return;

    }


    productLoading?.classList.add(
        "hidden"
    );


    productError?.classList.add(
        "hidden"
    );


    productContent?.classList.remove(
        "hidden"
    );


    productInfoSection?.classList.remove(
        "hidden"
    );


    const name =
        String(
            product.name ||
            "Product"
        );


    const category =
        formatList(
            product.category
        );


    const collection =
        String(
            product.collection ||
            product.productCollection ||
            ""
        );


    document.title =
        `${name} — Nishat Fashion`;


    // =====================================================
    // NAME
    // =====================================================

    if (breadcrumbProduct) {

        breadcrumbProduct.textContent =
            name;

    }


    if (productName) {

        productName.textContent =
            name;

    }


    if (productCollection) {

        productCollection.textContent =
            collection;

    }


    // =====================================================
    // PRICE
    // =====================================================

    const salePrice =
        numberValue(
            product.salePrice ??
            product.price
        );


    const discountPrice =
        numberValue(
            product.discountPrice
        );


    const finalPrice =
        (
            discountPrice > 0 &&
            discountPrice < salePrice
        )
            ? discountPrice
            : salePrice;


    if (productPrice) {

        productPrice.textContent =
            money(
                finalPrice
            );

    }


    // =====================================================
    // OLD PRICE
    // =====================================================

    if (productOldPrice) {

        if (
            salePrice >
            finalPrice
        ) {

            productOldPrice.textContent =
                money(
                    salePrice
                );


            productOldPrice.classList.remove(
                "hidden"
            );

        } else {

            productOldPrice.textContent =
                "";


            productOldPrice.classList.add(
                "hidden"
            );

        }

    }


    // =====================================================
    // SAVE
    // =====================================================

    if (productSave) {

        if (
            salePrice >
            finalPrice
        ) {

            productSave.textContent =
                `Save ${money(
                    salePrice -
                    finalPrice
                )}`;


            productSave.classList.remove(
                "hidden"
            );

        } else {

            productSave.textContent =
                "";


            productSave.classList.add(
                "hidden"
            );

        }

    }


    // =====================================================
    // DISCOUNT
    // =====================================================

    if (productDiscount) {

        if (
            salePrice >
                finalPrice &&
            salePrice > 0
        ) {

            const percent =
                Math.round(
                    (
                        (
                            salePrice -
                            finalPrice
                        ) /
                        salePrice
                    ) * 100
                );


            productDiscount.textContent =
                `${percent}% OFF`;


            productDiscount.classList.remove(
                "hidden"
            );

        } else {

            productDiscount.textContent =
                "";


            productDiscount.classList.add(
                "hidden"
            );

        }

    }


    // =====================================================
    // DESCRIPTION
    // =====================================================

    if (productDescription) {

        productDescription.textContent =
            product.shortDescription ||
            product.description ||
            "";

    }


    if (longDescription) {

        longDescription.textContent =
            product.description ||
            product.shortDescription ||
            "";

    }


    // =====================================================
    // DETAILS
    // =====================================================

    if (detailCategory) {

        detailCategory.textContent =
            category ||
            "—";

    }


    if (detailCollection) {

        detailCollection.textContent =
            collection ||
            "—";

    }


    if (detailBrand) {

        detailBrand.textContent =
            String(
                product.brand ||
                "—"
            );

    }


    if (detailMaterial) {

        detailMaterial.textContent =
            String(
                product.material ||
                "—"
            );

    }


    if (detailFit) {

        detailFit.textContent =
            String(
                product.fit ||
                "—"
            );

    }


    if (detailSku) {

        detailSku.textContent =
            String(
                product.sku ||
                product.id ||
                "—"
            );

    }


    // =====================================================
    // IMAGES
    // =====================================================

    renderImages(
        product
    );


    // =====================================================
    // SIZE
    // =====================================================

    renderSizes(
        product
    );


    // =====================================================
    // COLORS
    // =====================================================

    renderColors(
        product
    );


    // =====================================================
    // STOCK
    // =====================================================

    renderStock(
        product
    );


    // =====================================================
    // VIDEO
    // =====================================================

    renderVideo(
        product
    );


    // =====================================================
    // WISHLIST
    // =====================================================

    updateWishlistButton();


    // =====================================================
    // RATING
    // =====================================================

    updateProductRating(
        product
    );


    // =====================================================
    // REVIEWS
    // =====================================================

    loadReviews(
        product.id
    );

}


// =========================================================
// GET PRODUCT IMAGES
// =========================================================
// ONLY images[].
// thumbnail is completely ignored.
// =========================================================

function getProductImages(
    product
) {

    const images =
        [];


    if (
        Array.isArray(
            product?.images
        )
    ) {

        product.images.forEach(
            image => {

                if (
                    typeof image !==
                    "string"
                ) {

                    return;

                }


                const url =
                    image.trim();


                if (!url) {

                    return;

                }


                // Remove duplicate image URLs
                if (
                    !images.includes(
                        url
                    )
                ) {

                    images.push(
                        url
                    );

                }

            }
        );

    }


    return images;

}


// =========================================================
// RENDER IMAGES
// =========================================================

function renderImages(
    product
) {

    const images =
        getProductImages(
            product
        );


    console.log(
        "images[]:",
        images
    );


    // =====================================================
    // NO IMAGE
    // =====================================================

    if (!images.length) {

        if (mainImage) {

            mainImage.src =
                "../asset/logo.png";


            mainImage.alt =
                "Product";

        }


        if (thumbnailList) {

            thumbnailList.innerHTML =
                "";

        }


        return;

    }


    // =====================================================
    // MAIN IMAGE
    // =====================================================

    if (mainImage) {

        mainImage.src =
            images[0];


        mainImage.alt =
            product.name ||
            "Product";


        mainImage.onerror =
            () => {

                mainImage.onerror =
                    null;


                mainImage.src =
                    "../asset/logo.png";

            };

    }


    // =====================================================
    // THUMBNAILS
    // =====================================================

    if (!thumbnailList) {

        return;

    }


    thumbnailList.innerHTML =
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
                "thumbnail";


            if (
                index === 0
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.setAttribute(
                "aria-label",
                `Product image ${
                    index + 1
                }`
            );


            const img =
                document.createElement(
                    "img"
                );


            img.src =
                image;


            img.alt =
                `${product.name || "Product"} image ${
                    index + 1
                }`;


            img.loading =
                index === 0
                    ? "eager"
                    : "lazy";


            img.decoding =
                "async";


            img.onerror =
                () => {

                    img.style.display =
                        "none";

                };


            button.appendChild(
                img
            );


            button.addEventListener(
                "click",
                () => {

                    if (mainImage) {

                        mainImage.src =
                            image;

                    }


                    thumbnailList
                        .querySelectorAll(
                            ".thumbnail"
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


            thumbnailList.appendChild(
                button
            );

        }
    );

}


// =========================================================
// SIZE NORMALIZER
// =========================================================

function normalizeOptionList(
    value
) {

    if (
        !Array.isArray(
            value
        )
    ) {

        return [];

    }


    return value
        .map(
            item => {

                if (
                    typeof item ===
                    "string"
                ) {

                    return item.trim();

                }


                if (
                    item &&
                    typeof item ===
                    "object"
                ) {

                    return String(
                        item.name ||
                        item.label ||
                        item.value ||
                        ""
                    ).trim();

                }


                return "";

            }
        )
        .filter(Boolean);

}


// =========================================================
// RENDER SIZES
// =========================================================

function renderSizes(
    product
) {

    const sizes =
        normalizeOptionList(
            product?.sizes
        );


    if (
        !sizeSection ||
        !sizeOptions
    ) {

        return;

    }


    if (!sizes.length) {

        sizeSection.classList.add(
            "hidden"
        );


        selectedSizeValue =
            "";


        return;

    }


    sizeSection.classList.remove(
        "hidden"
    );


    sizeOptions.innerHTML =
        "";


    sizes.forEach(
        (
            size,
            index
        ) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "size-option";


            if (
                index === 0
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.textContent =
                size;


            button.addEventListener(
                "click",
                () => {

                    selectedSizeValue =
                        size;


                    if (selectedSize) {

                        selectedSize.textContent =
                            size;

                    }


                    sizeOptions
                        .querySelectorAll(
                            ".size-option"
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


    selectedSizeValue =
        sizes[0];


    if (selectedSize) {

        selectedSize.textContent =
            selectedSizeValue;

    }

}


// =========================================================
// NORMALIZE COLORS
// =========================================================

function normalizeColorList(
    value
) {

    if (
        !Array.isArray(
            value
        )
    ) {

        return [];

    }


    return value
        .map(
            item => {

                if (
                    typeof item ===
                    "string"
                ) {

                    return {

                        name:
                            item.trim(),

                        value:
                            colorToCSS(
                                item.trim()
                            )

                    };

                }


                if (
                    item &&
                    typeof item ===
                    "object"
                ) {

                    return {

                        name:
                            String(
                                item.name ||
                                item.label ||
                                item.value ||
                                "Color"
                            ).trim(),

                        value:
                            String(
                                item.hex ||
                                item.color ||
                                item.value ||
                                "#ddd"
                            ).trim()

                    };

                }


                return null;

            }
        )
        .filter(
            Boolean
        )
        .filter(
            item =>
                item.name
        );

}


// =========================================================
// COLOR TO CSS
// =========================================================

function colorToCSS(
    color
) {

    const map = {

        black:
            "#111111",

        white:
            "#ffffff",

        navy:
            "#001f3f",

        "navy blue":
            "#001f3f",

        red:
            "#e53935",

        green:
            "#2e7d32",

        blue:
            "#1565c0",

        yellow:
            "#fdd835",

        pink:
            "#ec407a",

        grey:
            "#9e9e9e",

        gray:
            "#9e9e9e",

        brown:
            "#795548",

        maroon:
            "#800000"

    };


    return (
        map[
            String(
                color
            ).toLowerCase()
        ] ||
        "#dddddd"
    );

}


// =========================================================
// RENDER COLORS
// =========================================================

function renderColors(
    product
) {

    const colors =
        normalizeColorList(
            product?.colors
        );


    if (
        !colorSection ||
        !colorOptions
    ) {

        return;

    }


    if (!colors.length) {

        colorSection.classList.add(
            "hidden"
        );


        selectedColorValue =
            "";


        return;

    }


    colorSection.classList.remove(
        "hidden"
    );


    colorOptions.innerHTML =
        "";


    colors.forEach(
        (
            color,
            index
        ) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "color-option";


            if (
                index === 0
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.title =
                color.name;


            button.setAttribute(
                "aria-label",
                color.name
            );


            button.style.background =
                color.value;


            button.addEventListener(
                "click",
                () => {

                    selectedColorValue =
                        color.name;


                    if (selectedColor) {

                        selectedColor.textContent =
                            color.name;

                    }


                    colorOptions
                        .querySelectorAll(
                            ".color-option"
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


    selectedColorValue =
        colors[0].name;


    if (selectedColor) {

        selectedColor.textContent =
            selectedColorValue;

    }

}


// =========================================================
// STOCK
// =========================================================

function renderStock(
    product
) {

    if (!stockStatus) {

        return;

    }


    const stock =
        Math.max(
            0,
            Math.floor(
                numberValue(
                    product?.stock
                )
            )
        );


    stockStatus.classList.remove(
        "available",
        "low",
        "out",
        "out-of-stock"
    );


    if (
        stock <= 0
    ) {

        stockStatus.textContent =
            "Out of stock";


        stockStatus.classList.add(
            "out"
        );


        if (addToCart) {

            addToCart.disabled =
                true;

        }


        if (buyNow) {

            buyNow.disabled =
                true;

        }


        return;

    }


    if (
        stock <= 5
    ) {

        stockStatus.textContent =
            `Only ${stock} left`;


        stockStatus.classList.add(
            "low"
        );

    } else {

        stockStatus.textContent =
            "In stock";


        stockStatus.classList.add(
            "available"
        );

    }


    if (addToCart) {

        addToCart.disabled =
            false;

    }


    if (buyNow) {

        buyNow.disabled =
            false;

    }


    if (quantityInput) {

        quantityInput.min =
            "1";


        quantityInput.max =
            String(
                Math.min(
                    MAX_QUANTITY,
                    stock
                )
            );


        quantityInput.value =
            "1";

    }

}


// =========================================================
// QUANTITY
// =========================================================

function getQuantity() {

    const stock =
        Math.max(
            1,
            Math.floor(
                numberValue(
                    currentProduct?.stock
                )
            )
        );


    const value =
        Math.floor(
            numberValue(
                quantityInput?.value
            ) || 1
        );


    return Math.max(
        1,
        Math.min(
            MAX_QUANTITY,
            stock,
            value
        )
    );

}


decreaseQty?.addEventListener(
    "click",
    () => {

        if (!quantityInput) {

            return;

        }


        quantityInput.value =
            String(
                Math.max(
                    1,
                    getQuantity() - 1
                )
            );

    }
);


increaseQty?.addEventListener(
    "click",
    () => {

        if (!quantityInput) {

            return;

        }


        const stock =
            Math.max(
                1,
                Math.floor(
                    numberValue(
                        currentProduct?.stock
                    )
                )
            );


        quantityInput.value =
            String(
                Math.min(
                    MAX_QUANTITY,
                    stock,
                    getQuantity() + 1
                )
            );

    }
);


quantityInput?.addEventListener(
    "input",
    () => {

        quantityInput.value =
            String(
                getQuantity()
            );

    }
);


// =========================================================
// ADD TO CART
// =========================================================

addToCart?.addEventListener(
    "click",
    async () => {

        if (!currentProduct) {

            return;

        }


        const user =
            auth.currentUser;


        if (!user) {

            redirectToLogin();

            return;

        }


        const quantity =
            getQuantity();


        const productPrice =
            getFinalPrice(
                currentProduct
            );


        const image =
            getProductImages(
                currentProduct
            )[0] || "";


        try {

            await setDoc(
                doc(
                    db,
                    "users",
                    user.uid,
                    "cart",
                    currentProduct.id
                ),
                {

                    productId:
                        currentProduct.id,

                    name:
                        currentProduct.name ||
                        "Product",

                    price:
                        productPrice,

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

                },
                {
                    merge: true
                }
            );


            updateLocalCartCache(
                currentProduct,
                quantity
            );


            showToast(
                "Added to cart"
            );


        } catch (error) {

            console.error(
                "Add to cart error:",
                error
            );


            showToast(
                "Could not add to cart"
            );

        }

    }
);


// =========================================================
// BUY NOW
// =========================================================

buyNow?.addEventListener(
    "click",
    () => {

        if (!currentProduct) {

            return;

        }


        if (!auth.currentUser) {

            redirectToLogin();

            return;

        }


        const checkoutData = {

            productId:
                currentProduct.id,

            quantity:
                getQuantity(),

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
            "../checkout/index.html";

    }
);


// =========================================================
// LOCAL CART
// =========================================================

function updateLocalCartCache(
    product,
    quantity
) {

    try {

        let cart =
            JSON.parse(
                localStorage.getItem(
                    CART_KEY
                ) || "[]"
            );


        if (
            !Array.isArray(
                cart
            )
        ) {

            cart = [];

        }


        const item = {

            productId:
                product.id,

            name:
                product.name ||
                "Product",

            price:
                getFinalPrice(
                    product
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


        const index =
            cart.findIndex(
                item =>
                    String(
                        item.productId
                    ) ===
                    String(
                        product.id
                    )
            );


        if (
            index >= 0
        ) {

            cart[index] = {

                ...cart[index],

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
            "Cart cache error:",
            error
        );

    }

}


// =========================================================
// WISHLIST
// =========================================================

imageWishlist?.addEventListener(
    "click",
    async () => {

        if (!currentProduct) {

            return;

        }


        const user =
            auth.currentUser;


        if (!user) {

            redirectToLogin();

            return;

        }


        const wishlistRef =
            doc(
                db,
                "users",
                user.uid,
                "wishlist",
                currentProduct.id
            );


        const active =
            imageWishlist.classList.contains(
                "active"
            );


        try {

            if (active) {

                await deleteDoc(
                    wishlistRef
                );


                imageWishlist.classList.remove(
                    "active"
                );


                removeLocalWishlist(
                    currentProduct.id
                );

            } else {

                await setDoc(
                    wishlistRef,
                    {

                        productId:
                            currentProduct.id,

                        name:
                            currentProduct.name ||
                            "Product",

                        price:
                            getFinalPrice(
                                currentProduct
                            ),

                        image:
                            getProductImages(
                                currentProduct
                            )[0] || "",

                        addedAt:
                            serverTimestamp()

                    }
                );


                imageWishlist.classList.add(
                    "active"
                );


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


// =========================================================
// UPDATE WISHLIST
// =========================================================

function updateWishlistButton() {

    if (
        !imageWishlist ||
        !currentProduct
    ) {

        return;

    }


    try {

        const list =
            JSON.parse(
                localStorage.getItem(
                    WISHLIST_KEY
                ) || "[]"
            );


        const active =
            Array.isArray(list) &&
            list.some(
                item =>
                    String(
                        item.productId ??
                        item.id
                    ) ===
                    String(
                        currentProduct.id
                    )
            );


        imageWishlist.classList.toggle(
            "active",
            active
        );

    } catch {

        imageWishlist.classList.remove(
            "active"
        );

    }

}


// =========================================================
// SAVE LOCAL WISHLIST
// =========================================================

function saveLocalWishlist(
    product
) {

    try {

        let list =
            JSON.parse(
                localStorage.getItem(
                    WISHLIST_KEY
                ) || "[]"
            );


        if (
            !Array.isArray(
                list
            )
        ) {

            list = [];

        }


        const exists =
            list.some(
                item =>
                    String(
                        item.productId ??
                        item.id
                    ) ===
                    String(
                        product.id
                    )
            );


        if (!exists) {

            list.push({

                productId:
                    product.id,

                name:
                    product.name ||
                    "Product",

                price:
                    getFinalPrice(
                        product
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


// =========================================================
// REMOVE LOCAL WISHLIST
// =========================================================

function removeLocalWishlist(
    id
) {

    try {

        let list =
            JSON.parse(
                localStorage.getItem(
                    WISHLIST_KEY
                ) || "[]"
            );


        if (
            !Array.isArray(
                list
            )
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
                    String(id)
            );


        localStorage.setItem(
            WISHLIST_KEY,
            JSON.stringify(
                list
            )
        );

    } catch {

        // Ignore

    }

}


// =========================================================
// GOOGLE SHEET REVIEWS
// =========================================================

async function loadReviews(
    id
) {

    if (
        !reviewsList ||
        !reviewsSection
    ) {

        return;

    }


    allApprovedReviews =
        [];


    visibleReviewCount =
        0;


    reviewsSection.classList.remove(
        "hidden"
    );


    reviewsList.innerHTML =
        `
        <div class="reviews-loading">
            Loading reviews...
        </div>
        `;


    if (loadMoreReviewsBtn) {

        loadMoreReviewsBtn.style.display =
            "none";

    }


    try {

        if (reviewsLoading) {

            return;

        }


        reviewsLoading =
            true;


        const url =
            new URL(
                REVIEWS_API_URL
            );


        url.searchParams.set(
            "action",
            "getReviews"
        );


        url.searchParams.set(
            "productId",
            id
        );


        url.searchParams.set(
            "_",
            String(
                Date.now()
            )
        );


        const response =
            await fetch(
                url.toString(),
                {

                    method:
                        "GET",

                    cache:
                        "no-store"

                }
            );


        if (!response.ok) {

            throw new Error(
                `Review API HTTP ${
                    response.status
                }`
            );

        }


        const result =
            await response.json();


        let rows =
            [];


        if (
            Array.isArray(
                result?.reviews
            )
        ) {

            rows =
                result.reviews;

        } else if (
            Array.isArray(
                result
            )
        ) {

            rows =
                result;

        } else if (
            Array.isArray(
                result?.data
            )
        ) {

            rows =
                result.data;

        }


        // =================================================
        // ONLY CURRENT PRODUCT + APPROVED
        // =================================================

        allApprovedReviews =
            rows

                .filter(
                    review => {

                        const reviewProductId =
                            String(
                                review.productId ??
                                review.productid ??
                                ""
                            ).trim();


                        const status =
                            String(
                                review.status ??
                                ""
                            )
                                .trim()
                                .toLowerCase();


                        return (

                            reviewProductId ===
                            String(id)

                            &&

                            status ===
                            "approved"

                        );

                    }
                )


                .map(
                    normalizeReview
                );


        // =================================================
        // NEWEST FIRST
        // =================================================

        allApprovedReviews.sort(
            (
                a,
                b
            ) => {

                const dateA =
                    new Date(
                        a.createdAt || 0
                    ).getTime();


                const dateB =
                    new Date(
                        b.createdAt || 0
                    ).getTime();


                return (
                    dateB -
                    dateA
                );

            }
        );


        // =================================================
        // FIRST 3
        // =================================================

        visibleReviewCount =
            Math.min(
                INITIAL_REVIEWS,
                allApprovedReviews.length
            );


        updateReviewSummary();


        renderReviews();


    } catch (error) {

        console.error(
            "Review loading error:",
            error
        );


        allApprovedReviews =
            [];


        visibleReviewCount =
            0;


        updateReviewSummary();


        reviewsList.innerHTML =
            `
            <div class="reviews-empty">
                Reviews could not be loaded.
            </div>
            `;

    } finally {

        reviewsLoading =
            false;

    }

}


// =========================================================
// NORMALIZE REVIEW
// =========================================================

function normalizeReview(
    review
) {

    return {

        reviewId:
            String(
                review.reviewId ??
                review.reviewid ??
                ""
            ),

        productId:
            String(
                review.productId ??
                review.productid ??
                ""
            ),

        userId:
            String(
                review.userId ??
                review.userid ??
                ""
            ),

        name:
            String(
                review.name ??
                review.userName ??
                "Customer"
            ),

        rating:
            Math.max(
                1,
                Math.min(
                    5,
                    Number(
                        review.rating ||
                        0
                    )
                )
            ),

        reviewText:
            String(
                review.reviewText ??
                review.review ??
                ""
            ),

        status:
            String(
                review.status ||
                ""
            ).toLowerCase(),

        image1:
            String(
                review.image1 ||
                ""
            ),

        image2:
            String(
                review.image2 ||
                ""
            ),

        image3:
            String(
                review.image3 ||
                ""
            ),

        createdAt:
            review.createdAt ??
            review.createdat ??
            "",

        updatedAt:
            review.updatedAt ??
            review.updatedat ??
            ""

    };

}


// =========================================================
// REVIEW SUMMARY
// =========================================================

function updateReviewSummary() {

    const count =
        allApprovedReviews.length;


    let average =
        0;


    if (count) {

        const total =
            allApprovedReviews.reduce(
                (
                    sum,
                    review
                ) => {

                    return (
                        sum +
                        Number(
                            review.rating ||
                            0
                        )
                    );

                },
                0
            );


        average =
            total /
            count;

    } else {

        average =
            numberValue(
                currentProduct?.rating
            );

    }


    if (productRating) {

        productRating.textContent =
            average
                ? average.toFixed(1)
                : "0.0";

    }


    if (productStars) {

        productStars.textContent =
            getStars(
                average
            );

    }


    if (productReviews) {

        productReviews.textContent =
            `${count} Review${
                count === 1
                    ? ""
                    : "s"
            }`;

    }

}


// =========================================================
// RENDER REVIEWS
// =========================================================

function renderReviews() {

    if (!reviewsList) {

        return;

    }


    if (
        !allApprovedReviews.length
    ) {

        reviewsList.innerHTML =
            `
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
        allApprovedReviews
            .slice(
                0,
                visibleReviewCount
            )
            .map(
                createReviewHTML
            )
            .join("");


    if (loadMoreReviewsBtn) {

        const hasMore =
            visibleReviewCount <
            allApprovedReviews.length;


        loadMoreReviewsBtn.style.display =
            hasMore
                ? "inline-flex"
                : "none";

    }

}


// =========================================================
// LOAD MORE REVIEWS
// =========================================================

loadMoreReviewsBtn?.addEventListener(
    "click",
    () => {

        if (reviewsLoading) {

            return;

        }


        visibleReviewCount =
            Math.min(
                visibleReviewCount +
                    MORE_REVIEWS,
                allApprovedReviews.length
            );


        renderReviews();

    }
);


// =========================================================
// REVIEW HTML
// =========================================================

function createReviewHTML(
    review
) {

    const name =
        review.name ||
        "Customer";


    const rating =
        Math.max(
            1,
            Math.min(
                5,
                Number(
                    review.rating ||
                    0
                )
            )
        );


    const text =
        review.reviewText ||
        "";


    const date =
        formatReviewDate(
            review.createdAt
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
                            (
                                image,
                                index
                            ) => `

                            <a
                                href="${escapeHTML(
                                    image
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Review image ${
                                    index + 1
                                }"
                            >

                                <img
                                    src="${escapeHTML(
                                        getSmallReviewImage(
                                            image
                                        )
                                    )}"
                                    alt="Customer review image"
                                    loading="lazy"
                                    decoding="async"
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
                            ||
                            "C"
                        )}

                    </div>


                    <div>

                        <div class="review-user-name">

                            ${escapeHTML(
                                name
                            )}

                        </div>


                        <div class="review-date">

                            ${escapeHTML(
                                date
                            )}

                        </div>

                    </div>

                </div>


                <div
                    class="review-stars"
                    aria-label="${
                        rating
                    } out of 5"
                >

                    ${getStars(
                        rating
                    )}

                </div>

            </div>


            ${
                text
                    ? `
                        <div class="review-text">

                            ${escapeHTML(
                                text
                            )}

                        </div>
                    `
                    : ""
            }


            ${imagesHTML}

        </article>

    `;

}


// =========================================================
// REVIEW IMAGES
// =========================================================

function getReviewImages(
    review
) {

    return [

        review.image1,

        review.image2,

        review.image3

    ]

        .filter(
            Boolean
        )

        .filter(
            (
                value,
                index,
                array
            ) =>
                array.indexOf(
                    value
                ) === index
        )

        .slice(
            0,
            3
        );

}


// =========================================================
// CLOUDINARY REVIEW IMAGE
// =========================================================
// Only small preview.
// Original opens when clicked.
// =========================================================

function getSmallReviewImage(
    url
) {

    const value =
        String(
            url || ""
        );


    if (
        !value.includes(
            "res.cloudinary.com"
        )
    ) {

        return value;

    }


    if (
        !value.includes(
            "/upload/"
        )
    ) {

        return value;

    }


    return value.replace(
        "/upload/",
        "/upload/f_auto,q_auto:low,w_120,h_120,c_fill/"
    );

}


// =========================================================
// DATE
// =========================================================

function formatReviewDate(
    value
) {

    if (!value) {

        return "";

    }


    try {

        let date;


        // Firestore Timestamp
        if (
            value &&
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        } else {

            date =
                new Date(
                    value
                );

        }


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

                day:
                    "numeric",

                month:
                    "short",

                year:
                    "numeric"

            }
        );

    } catch {

        return String(
            value
        );

    }

}


// =========================================================
// PRODUCT VIDEO
// =========================================================

function renderVideo(
    product
) {

    if (
        !productVideo ||
        !productVideoSection
    ) {

        return;

    }


    const url =
        String(
            product.videoUrl ||
            product.video ||
            ""
        ).trim();


    if (!url) {

        productVideoSection.classList.add(
            "hidden"
        );


        productVideo.removeAttribute(
            "src"
        );


        return;

    }


    productVideo.src =
        url;


    productVideoSection.classList.remove(
        "hidden"
    );

}


// =========================================================
// PRODUCT RATING
// =========================================================

function updateProductRating(
    product
) {

    const rating =
        numberValue(
            product?.rating
        );


    if (productStars) {

        productStars.textContent =
            getStars(
                rating
            );

    }


    if (productRating) {

        productRating.textContent =
            rating
                ? rating.toFixed(1)
                : "0.0";

    }


    if (productReviews) {

        const count =
            numberValue(
                product?.reviewCount
            );


        productReviews.textContent =
            `${count} Review${
                count === 1
                    ? ""
                    : "s"
            }`;

    }

}


// =========================================================
// PRODUCT INFORMATION TABS
// =========================================================

function initInfoTabs() {

    const tabs =
        document.querySelectorAll(
            ".info-tab"
        );


    const contents =
        document.querySelectorAll(
            ".info-content"
        );


    if (!tabs.length) {

        return;

    }


    tabs.forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    const targetId =
                        tab.dataset.tab;


                    if (!targetId) {

                        return;

                    }


                    // Remove active from buttons
                    tabs.forEach(
                        item => {

                            item.classList.remove(
                                "active"
                            );

                        }
                    );


                    // Remove active from content
                    contents.forEach(
                        content => {

                            content.classList.remove(
                                "active"
                            );

                        }
                    );


                    // Active button
                    tab.classList.add(
                        "active"
                    );


                    // Active content
                    const target =
                        document.getElementById(
                            targetId
                        );


                    if (target) {

                        target.classList.add(
                            "active"
                        );

                    }

                }
            );

        }
    );

}


// =========================================================
// FINAL PRICE
// =========================================================

function getFinalPrice(
    product
) {

    const salePrice =
        numberValue(
            product?.salePrice ??
            product?.price
        );


    const discountPrice =
        numberValue(
            product?.discountPrice
        );


    if (
        discountPrice > 0 &&
        discountPrice < salePrice
    ) {

        return discountPrice;

    }


    return salePrice;

}


// =========================================================
// NUMBER
// =========================================================

function numberValue(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


// =========================================================
// MONEY
// =========================================================

function money(
    value
) {

    return (
        `৳${numberValue(
            value
        ).toLocaleString(
            "en-BD"
        )}`
    );

}


// =========================================================
// FORMAT LIST
// =========================================================

function formatList(
    value
) {

    if (
        Array.isArray(
            value
        )
    ) {

        return value
            .filter(Boolean)
            .join(", ");

    }


    return String(
        value || ""
    ).trim();

}


// =========================================================
// STARS
// =========================================================

function getStars(
    rating
) {

    const safe =
        Math.max(
            0,
            Math.min(
                5,
                Math.round(
                    numberValue(
                        rating
                    )
                )
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


// =========================================================
// ESCAPE HTML
// =========================================================

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


// =========================================================
// LOGIN
// =========================================================

function redirectToLogin() {

    window.location.href =
        `../login/login.html?redirect=${
            encodeURIComponent(
                window.location.href
            )
        }`;

}


// =========================================================
// TOAST
// =========================================================

function showToast(
    message
) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) {

        alert(
            message
        );

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
        window.__nishatToastTimer
    );


    window.__nishatToastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            1800
        );

}


// =========================================================
// ERROR
// =========================================================

function showError() {

    productLoading?.classList.add(
        "hidden"
    );


    productContent?.classList.add(
        "hidden"
    );


    productInfoSection?.classList.add(
        "hidden"
    );


    productVideoSection?.classList.add(
        "hidden"
    );


    productError?.classList.remove(
        "hidden"
    );

}


// =========================================================
// AUTH STATE
// =========================================================

onAuthStateChanged(
    auth,
    () => {

        updateWishlistButton();

    }
);


// =========================================================
// DEBUG
// =========================================================

console.log(
    "Nishat Fashion Product JS loaded"
);

console.log(
    "Product ID:",
    productId
);