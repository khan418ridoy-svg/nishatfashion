/* =========================================================
   NISHAT FASHION
   SHOP PRODUCTS SERVICE
========================================================= */

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    db
} from "../firebase/firebase.js";


/* =========================================================
   CACHE
========================================================= */

const CACHE_KEY =
    "nishat_shop_products_v1";

const CACHE_TIME =
    30 * 60 * 1000;


let memoryProducts = null;


/* =========================================================
   CREATE SHOP PRODUCT
========================================================= */

function createShopProduct(doc) {

    const data =
        doc.data() || {};


    return {

        id:
            doc.id,

        name:
            data.name || "",

        salePrice:
            Number(
                data.salePrice
            ) || 0,

        discountPrice:
            Number(
                data.discountPrice
            ) || 0,

        thumbnail:
            data.thumbnail || "",

        category:

            Array.isArray(
                data.category
            )

                ? data.category

                : data.category

                    ? [data.category]

                    : [],

        colors:

            Array.isArray(
                data.colors
            )

                ? data.colors

                : [],

        sizes:

            Array.isArray(
                data.sizes
            )

                ? data.sizes

                : [],

        featured:
            data.featured === true,

        newArrival:
            data.newArrival === true,

        bestSeller:
            data.bestSeller === true,

        active:
            data.active === true,

        updatedAt:
            data.updatedAt || null

    };

}


/* =========================================================
   READ CACHE
========================================================= */

function readCache() {

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
            !Array.isArray(
                cache.products
            ) ||
            !cache.timestamp
        ) {

            return null;

        }


        const age =
            Date.now() -
            Number(
                cache.timestamp
            );


        if (
            age >= CACHE_TIME
        ) {

            localStorage.removeItem(
                CACHE_KEY
            );

            return null;

        }


        return cache.products;

    }
    catch (error) {

        console.error(
            "Product cache read error:",
            error
        );

        return null;

    }

}


/* =========================================================
   SAVE CACHE
========================================================= */

function saveCache(
    products
) {

    try {

        localStorage.setItem(

            CACHE_KEY,

            JSON.stringify({

                timestamp:
                    Date.now(),

                products:
                    products

            })

        );

    }
    catch (error) {

        console.error(
            "Product cache save error:",
            error
        );

    }

}


/* =========================================================
   FIRESTORE
========================================================= */

async function loadFromFirestore() {

    const ref =
        collection(
            db,
            "products"
        );


    const q =
        query(

            ref,

            where(
                "active",
                "==",
                true
            )

        );


    const snapshot =
        await getDocs(q);


    const products =
        snapshot.docs.map(
            doc =>
                createShopProduct(
                    doc
                )
        );


    saveCache(
        products
    );


    memoryProducts =
        products;


    console.log(
        `Firestore → ${products.length} active shop products`
    );


    return products;

}


/* =========================================================
   GET PRODUCTS
========================================================= */

export async function getProducts({

    forceRefresh = false

} = {}) {


    /* MEMORY */

    if (
        !forceRefresh &&
        Array.isArray(
            memoryProducts
        )
    ) {

        return memoryProducts;

    }


    /* LOCAL STORAGE */

    if (!forceRefresh) {

        const cached =
            readCache();


        if (
            cached
        ) {

            memoryProducts =
                cached;

            console.log(
                "Products loaded from 30-minute cache."
            );

            return cached;

        }

    }


    /* FIRESTORE */

    try {

        return await
            loadFromFirestore();

    }
    catch (error) {

        console.error(
            "Firestore products error:",
            error
        );


        /*
           Firebase unavailable হলে
           expired cache ব্যবহার করবে।
        */

        try {

            const raw =
                localStorage.getItem(
                    CACHE_KEY
                );


            if (raw) {

                const cache =
                    JSON.parse(raw);


                if (
                    Array.isArray(
                        cache.products
                    )
                ) {

                    memoryProducts =
                        cache.products;

                    console.warn(
                        "Using expired product cache."
                    );

                    return cache.products;

                }

            }

        }
        catch (
            cacheError
        ) {

            console.error(
                cacheError
            );

        }


        return [];

    }

}


/* =========================================================
   SINGLE PRODUCT
========================================================= */

export async function getProduct(
    productId
) {

    const products =
        await getProducts();


    return products.find(
        product =>
            String(
                product.id
            ) ===
            String(
                productId
            )
    ) || null;

}


/* =========================================================
   FEATURED
========================================================= */

export async function getFeaturedProducts() {

    const products =
        await getProducts();


    return products.filter(
        product =>
            product.featured === true
    );

}


/* =========================================================
   NEW ARRIVALS
========================================================= */

export async function getNewArrivals() {

    const products =
        await getProducts();


    return products.filter(
        product =>
            product.newArrival === true
    );

}


/* =========================================================
   BEST SELLERS
========================================================= */

export async function getBestSellers() {

    const products =
        await getProducts();


    return products.filter(
        product =>
            product.bestSeller === true
    );

}


/* =========================================================
   CATEGORY
========================================================= */

export async function getProductsByCategory(
    category
) {

    const products =
        await getProducts();


    if (!category) {
        return products;
    }


    const target =
        String(category)
            .trim()
            .toLowerCase();


    return products.filter(
        product => {

            const categories =
                Array.isArray(
                    product.category
                )
                    ? product.category
                    : [];


            return categories.some(
                item =>
                    String(item)
                        .trim()
                        .toLowerCase() ===
                    target
            );

        }
    );

}


/* =========================================================
   CLEAR CACHE
========================================================= */

export function clearProductCache() {

    memoryProducts =
        null;


    localStorage.removeItem(
        CACHE_KEY
    );


    console.log(
        "Shop product cache cleared."
    );

}