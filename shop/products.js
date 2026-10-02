// ==========================================================
// NISHAT FASHION - PRODUCTS.JS
// ==========================================================
// Shared Product Loader
//
// Used by:
//   shop.js
//   product.js
//   other product-related pages
//
// Features:
//   - Firestore products collection
//   - LocalStorage cache
//   - Memory cache
//   - Low Firestore reads
//   - getProducts()
//   - getProductById()
//   - clearProductsCache()
// ==========================================================

import {
    db
} from "../firebase/firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================================
// CONFIG
// ==========================================================

const COLLECTION_NAME = "products";

const CACHE_KEY = "nishat_products_cache";

const CACHE_TIME = 25 * 60 * 1000;


// ==========================================================
// MEMORY CACHE
// ==========================================================

let productsMemoryCache = null;

let productsLoadingPromise = null;


// ==========================================================
// GET CACHE
// ==========================================================

function getLocalCache() {

    try {

        const raw =
            localStorage.getItem(
                CACHE_KEY
            );

        if (!raw) {

            return null;

        }


        const cache =
            JSON.parse(raw);


        if (
            !cache ||
            !Array.isArray(cache.data) ||
            !cache.timestamp
        ) {

            localStorage.removeItem(
                CACHE_KEY
            );

            return null;

        }


        const age =
            Date.now() -
            Number(cache.timestamp);


        if (
            age > CACHE_TIME
        ) {

            localStorage.removeItem(
                CACHE_KEY
            );

            return null;

        }


        return cache.data;


    } catch (error) {

        console.warn(
            "Products cache read error:",
            error
        );

        return null;

    }

}


// ==========================================================
// SAVE CACHE
// ==========================================================

function saveLocalCache(
    products
) {

    try {

        localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({

                timestamp:
                    Date.now(),

                data:
                    products

            })
        );


    } catch (error) {

        console.warn(
            "Products cache save error:",
            error
        );

    }

}


// ==========================================================
// NORMALIZE PRODUCT
// ==========================================================

function normalizeProduct(
    product
) {

    if (!product) {

        return null;

    }


    return {

        ...product,

        id:
            product.id ??
            product.productId ??
            "",

        name:
            product.name ??
            product.title ??
            "Unnamed Product",

        title:
            product.title ??
            product.name ??
            "Unnamed Product",

        price:
            Number(
                product.price ??
                product.salePrice ??
                0
            ),

        salePrice:
            Number(
                product.salePrice ??
                product.price ??
                0
            ),

        stock:
            Number(
                product.stock ??
                product.quantity ??
                0
            ),

        quantity:
            Number(
                product.quantity ??
                product.stock ??
                0
            ),

        category:
            product.category ??
            "",

        description:
            product.description ??
            "",

        sku:
            product.sku ??
            product.code ??
            "",

        code:
            product.code ??
            product.sku ??
            "",

        images:
            normalizeImages(
                product
            ),

        sizes:
            normalizeArray(
                product.sizes
            ),

        colors:
            normalizeArray(
                product.colors
            ),

        rating:
            Number(
                product.rating ??
                0
            ),

        reviewCount:
            Number(
                product.reviewCount ??
                0
            )

    };

}


// ==========================================================
// NORMALIZE ARRAY
// ==========================================================

function normalizeArray(
    value
) {

    if (
        Array.isArray(value)
    ) {

        return value;

    }


    if (
        typeof value ===
        "string"
    ) {

        return value
            .split(",")
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);

    }


    return [];

}


// ==========================================================
// NORMALIZE IMAGES
// ==========================================================

function normalizeImages(
    product
) {

    const images = [];


    // ------------------------------------------------------
    // images array
    // ------------------------------------------------------

    if (
        Array.isArray(
            product.images
        )
    ) {

        product.images.forEach(
            image => {

                if (
                    typeof image ===
                    "string"
                ) {

                    if (
                        image.trim()
                    ) {

                        images.push(
                            image.trim()
                        );

                    }

                } else if (
                    image &&
                    typeof image ===
                    "object"
                ) {

                    const url =
                        image.url ??
                        image.src ??
                        image.image ??
                        image.secure_url ??
                        "";


                    if (url) {

                        images.push(
                            url
                        );

                    }

                }

            }
        );

    }


    // ------------------------------------------------------
    // image
    // ------------------------------------------------------

    if (
        typeof product.image ===
        "string" &&
        product.image.trim()
    ) {

        images.push(
            product.image.trim()
        );

    }


    // ------------------------------------------------------
    // imageUrl
    // ------------------------------------------------------

    if (
        typeof product.imageUrl ===
        "string" &&
        product.imageUrl.trim()
    ) {

        images.push(
            product.imageUrl.trim()
        );

    }


    // ------------------------------------------------------
    // image1
    // ------------------------------------------------------

    if (
        typeof product.image1 ===
        "string" &&
        product.image1.trim()
    ) {

        images.push(
            product.image1.trim()
        );

    }


    // ------------------------------------------------------
    // image2
    // ------------------------------------------------------

    if (
        typeof product.image2 ===
        "string" &&
        product.image2.trim()
    ) {

        images.push(
            product.image2.trim()
        );

    }


    // ------------------------------------------------------
    // image3
    // ------------------------------------------------------

    if (
        typeof product.image3 ===
        "string" &&
        product.image3.trim()
    ) {

        images.push(
            product.image3.trim()
        );

    }


    // ------------------------------------------------------
    // Remove duplicates
    // ------------------------------------------------------

    return [
        ...new Set(
            images.filter(Boolean)
        )
    ];

}


// ==========================================================
// LOAD FROM FIRESTORE
// ==========================================================

async function loadProductsFromFirestore() {

    const productsRef =
        collection(
            db,
            COLLECTION_NAME
        );


    const snapshot =
        await getDocs(
            productsRef
        );


    const products = [];


    snapshot.forEach(
        docSnapshot => {

            const data =
                docSnapshot.data();


            products.push(

                normalizeProduct({

                    ...data,

                    id:
                        docSnapshot.id

                })

            );

        }
    );


    return products;

}


// ==========================================================
// GET PRODUCTS
// ==========================================================
// Main function.
//
// First:
//   Memory cache
//
// Second:
//   LocalStorage cache
//
// Third:
//   Firestore
//
// This prevents unnecessary Firestore reads.
// ==========================================================

export async function getProducts() {

    // ------------------------------------------------------
    // MEMORY CACHE
    // ------------------------------------------------------

    if (
        Array.isArray(
            productsMemoryCache
        )
    ) {

        return productsMemoryCache;

    }


    // ------------------------------------------------------
    // PREVENT DUPLICATE FIRESTORE REQUESTS
    // ------------------------------------------------------

    if (
        productsLoadingPromise
    ) {

        return productsLoadingPromise;

    }


    // ------------------------------------------------------
    // LOCAL STORAGE CACHE
    // ------------------------------------------------------

    const cached =
        getLocalCache();


    if (
        Array.isArray(cached)
    ) {

        productsMemoryCache =
            cached;


        return productsMemoryCache;

    }


    // ------------------------------------------------------
    // FIRESTORE
    // ------------------------------------------------------

    productsLoadingPromise =
        loadProductsFromFirestore();


    try {

        const products =
            await productsLoadingPromise;


        productsMemoryCache =
            products;


        saveLocalCache(
            products
        );


        return products;


    } catch (error) {

        console.error(
            "Failed to load products from Firestore:",
            error
        );


        // --------------------------------------------------
        // If Firestore fails, try old cache even if expired
        // --------------------------------------------------

        try {

            const raw =
                localStorage.getItem(
                    CACHE_KEY
                );


            if (raw) {

                const oldCache =
                    JSON.parse(raw);


                if (
                    Array.isArray(
                        oldCache?.data
                    )
                ) {

                    productsMemoryCache =
                        oldCache.data;


                    console.warn(
                        "Using expired products cache."
                    );


                    return productsMemoryCache;

                }

            }

        } catch (
            cacheError
        ) {

            console.warn(
                "Expired cache unavailable:",
                cacheError
            );

        }


        throw error;


    } finally {

        productsLoadingPromise =
            null;

    }

}


// ==========================================================
// GET PRODUCT BY ID
// ==========================================================

export async function getProductById(
    productId
) {

    if (
        !productId
    ) {

        return null;

    }


    const products =
        await getProducts();


    const id =
        String(
            productId
        );


    return (
        products.find(
            product => {

                return (
                    String(
                        product.id
                    ) === id
                );

            }
        ) || null
    );

}


// ==========================================================
// GET PRODUCTS BY CATEGORY
// ==========================================================

export async function getProductsByCategory(
    category
) {

    if (
        !category
    ) {

        return [];

    }


    const products =
        await getProducts();


    const target =
        String(
            category
        )
            .trim()
            .toLowerCase();


    return products.filter(
        product => {

            const value =
                String(
                    product.category ??
                    ""
                )
                    .trim()
                    .toLowerCase();


            return (
                value === target
            );

        }
    );

}


// ==========================================================
// SEARCH PRODUCTS
// ==========================================================

export async function searchProducts(
    searchText
) {

    const products =
        await getProducts();


    const search =
        String(
            searchText ?? ""
        )
            .trim()
            .toLowerCase();


    if (!search) {

        return products;

    }


    return products.filter(
        product => {

            const name =
                String(
                    product.name ??
                    ""
                ).toLowerCase();


            const title =
                String(
                    product.title ??
                    ""
                ).toLowerCase();


            const category =
                String(
                    product.category ??
                    ""
                ).toLowerCase();


            const sku =
                String(
                    product.sku ??
                    ""
                ).toLowerCase();


            const code =
                String(
                    product.code ??
                    ""
                ).toLowerCase();


            const description =
                String(
                    product.description ??
                    ""
                ).toLowerCase();


            return (

                name.includes(search) ||

                title.includes(search) ||

                category.includes(search) ||

                sku.includes(search) ||

                code.includes(search) ||

                description.includes(search)

            );

        }
    );

}


// ==========================================================
// CLEAR PRODUCTS CACHE
// ==========================================================
// Use this after admin changes products.
// ==========================================================

export function clearProductsCache() {

    productsMemoryCache =
        null;


    productsLoadingPromise =
        null;


    try {

        localStorage.removeItem(
            CACHE_KEY
        );

    } catch (error) {

        console.warn(
            "Could not clear products cache:",
            error
        );

    }

}


// ==========================================================
// REFRESH PRODUCTS
// ==========================================================
// Forces a new Firestore read.
// ==========================================================

export async function refreshProducts() {

    clearProductsCache();


    return await getProducts();

}


// ==========================================================
// PRODUCT CACHE STATUS
// ==========================================================

export function hasProductsCache() {

    return (
        Array.isArray(
            productsMemoryCache
        )
    );

}


// ==========================================================
// DEFAULT EXPORT
// ==========================================================

export default getProducts;