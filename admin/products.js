// ============================================================
// NISHAT FASHION - ADMIN PRODUCTS JS
// ============================================================

import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    app,
    db
} from "../firebase/firebase.js";


// ============================================================
// CONFIG
// ============================================================

const CLOUDINARY_CLOUD_NAME = "dmqnuzexg";
const CLOUDINARY_UPLOAD_PRESET = "nishat_products";
const CLOUDINARY_FOLDER = "nishat-fashion/products";


// ============================================================
// AUTH
// ============================================================

const auth = getAuth(app);


// ============================================================
// DOM
// ============================================================

const $ = id => document.getElementById(id);

const adminEmail = $("adminEmail");
const logoutBtn = $("logoutBtn");

const addProductBtn = $("addProductBtn");
const loading = $("loading");
const emptyState = $("emptyState");
const productsBody = $("productsBody");

const searchInput = $("searchInput");
const categoryFilter = $("categoryFilter");

const productModal = $("productModal");
const productForm = $("productForm");
const modalTitle = $("modalTitle");
const closeModal = $("closeModal");
const cancelBtn = $("cancelBtn");
const saveProductBtn = $("saveProductBtn");
const formMessage = $("formMessage");

const productId = $("productId");
const nameInput = $("name");
const skuInput = $("sku");
const categoryInput = $("category");
const collectionInput = $("productCollection");
const brandInput = $("brand");
const materialInput = $("material");
const fitInput = $("fit");

const salePriceInput = $("salePrice");

// HTML field name is discountPrice.
// এখানে এটাকেই regular/original price হিসেবে ব্যবহার করা হচ্ছে.
const discountPriceInput = $("discountPrice");

const discountPercentInput = $("discountPercent");

const stockInput = $("stock");
const colorsInput = $("colors");
const sizesInput = $("sizes");
const tagsInput = $("tags");

const imagesInput = $("images");
const uploadImagesBtn = $("uploadImagesBtn");
const imagePreview = $("imagePreview");
const imageUploadStatus = $("imageUploadStatus");

const videoUrlInput = $("videoUrl");

const shortDescriptionInput = $("shortDescription");
const descriptionInput = $("description");

const seoTitleInput = $("seoTitle");
const seoDescriptionInput = $("seoDescription");

const featuredInput = $("featured");
const newArrivalInput = $("newArrival");
const bestSellerInput = $("bestSeller");
const activeInput = $("active");


// ============================================================
// STATE
// ============================================================

let products = [];
let uploadedImages = [];


// ============================================================
// HELPERS
// ============================================================

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function parseList(value) {
    return [
        ...new Set(
            String(value || "")
                .split(",")
                .map(x => x.trim())
                .filter(Boolean)
        )
    ];
}


function getCategories(product) {
    if (Array.isArray(product?.category)) {
        return product.category.filter(Boolean);
    }

    if (product?.category) {
        return [String(product.category)];
    }

    return [];
}


function getImages(product) {
    if (Array.isArray(product?.images)) {
        return product.images.filter(Boolean);
    }

    return [];
}


function calculateDiscount(originalPrice, salePrice) {

    if (
        !originalPrice ||
        originalPrice <= 0 ||
        salePrice < 0 ||
        salePrice >= originalPrice
    ) {
        return 0;
    }

    return Math.round(
        ((originalPrice - salePrice) / originalPrice) * 100
    );
}


function showMessage(message, success = false) {

    if (!formMessage) return;

    formMessage.textContent = message;

    formMessage.className =
        success
            ? "form-message success"
            : "form-message";
}


function clearMessage() {

    if (!formMessage) return;

    formMessage.textContent = "";
    formMessage.className = "form-message";
}


function setUploadStatus(message, success = true) {

    if (!imageUploadStatus) return;

    imageUploadStatus.style.display = "block";
    imageUploadStatus.textContent = message;

    imageUploadStatus.style.background =
        success ? "#ecfdf5" : "#fef2f2";

    imageUploadStatus.style.color =
        success ? "#047857" : "#b91c1c";

    imageUploadStatus.style.border =
        success
            ? "1px solid #a7f3d0"
            : "1px solid #fecaca";
}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, async user => {

    if (!user) {
        window.location.href = "admin-login.html";
        return;
    }

    try {

        const adminRef = doc(
            db,
            "admins",
            user.uid
        );

        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
            await signOut(auth);
            window.location.href = "admin-login.html";
            return;
        }

        const adminData = adminSnap.data();

        if (
            adminData.role !== "admin" ||
            adminData.active !== true
        ) {
            await signOut(auth);
            window.location.href = "admin-login.html";
            return;
        }

        if (adminEmail) {
            adminEmail.textContent =
                user.email || "Admin";
        }

        await loadProducts();

    } catch (error) {

        console.error(
            "Admin authentication error:",
            error
        );

        await signOut(auth);

        window.location.href =
            "admin-login.html";
    }

});


// ============================================================
// LOGOUT
// ============================================================

logoutBtn?.addEventListener("click", async () => {

    try {

        await signOut(auth);

        window.location.href =
            "admin-login.html";

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

});


// ============================================================
// LOAD PRODUCTS
// ============================================================

async function loadProducts() {

    if (loading) {
        loading.classList.remove("hidden");
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    if (productsBody) {
        productsBody.innerHTML = "";
    }

    try {

        const snapshot = await getDocs(
            collection(db, "products")
        );

        products = snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

        renderCategoryFilter();
        renderProducts();

    } catch (error) {

        console.error(
            "Products loading error:",
            error
        );

        if (loading) {
            loading.textContent =
                "Unable to load products.";
        }

    } finally {

        if (loading) {
            loading.classList.add("hidden");
        }

    }
}


// ============================================================
// CATEGORY FILTER
// ============================================================

function renderCategoryFilter() {

    if (!categoryFilter) return;

    const categories = new Map();

    products.forEach(product => {

        getCategories(product).forEach(category => {

            const value =
                String(category).trim();

            if (!value) return;

            const key =
                value.toLowerCase();

            if (!categories.has(key)) {
                categories.set(key, value);
            }

        });

    });

    const list =
        [...categories.values()]
            .sort((a, b) =>
                a.localeCompare(b)
            );

    categoryFilter.innerHTML = `
        <option value="">
            All Categories
        </option>

        ${list.map(category => `
            <option value="${escapeHtml(category)}">
                ${escapeHtml(category)}
            </option>
        `).join("")}
    `;
}


// ============================================================
// RENDER PRODUCTS
// ============================================================

function renderProducts() {

    if (!productsBody) return;

    const search =
        String(searchInput?.value || "")
            .trim()
            .toLowerCase();

    const selectedCategory =
        String(categoryFilter?.value || "")
            .trim()
            .toLowerCase();

    const filtered = products.filter(product => {

        const categories =
            getCategories(product);

        const searchable = [
            product.name,
            product.sku,
            product.collection,
            product.brand,
            product.material,
            product.fit,
            ...categories,
            ...(Array.isArray(product.tags)
                ? product.tags
                : [])
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const searchMatch =
            !search ||
            searchable.includes(search);

        const categoryMatch =
            !selectedCategory ||
            categories.some(category =>
                String(category)
                    .toLowerCase() ===
                selectedCategory
            );

        return searchMatch && categoryMatch;
    });

    if (!filtered.length) {

        productsBody.innerHTML = "";

        emptyState?.classList.remove(
            "hidden"
        );

        return;
    }

    emptyState?.classList.add("hidden");

    filtered.sort((a, b) =>
        String(a.name || "")
            .localeCompare(
                String(b.name || "")
            )
    );

    productsBody.innerHTML =
        filtered
            .map(createProductRow)
            .join("");
}


// ============================================================
// PRODUCT ROW
// ============================================================

function createProductRow(product) {

    const images = getImages(product);

    const image =
        images[0] ||
        product.thumbnail ||
        "../asset/logo.png";

    const salePrice =
        Number(
            product.salePrice ??
            product.price ??
            0
        );

    const originalPrice =
        Number(
            product.discountPrice ??
            product.oldPrice ??
            0
        );

    const categories =
        getCategories(product);

    const active =
        product.active !== false;

    return `
        <tr>

            <td>

                <div class="product-name">

                    <img
                        class="thumb"
                        src="${escapeHtml(image)}"
                        alt="${escapeHtml(
        product.name ||
        "Product"
    )}"
                        onerror="
                            this.onerror=null;
                            this.src='../asset/logo.png';
                        "
                    >

                    <span>
                        ${escapeHtml(
        product.name ||
        "Unnamed Product"
    )}
                    </span>

                </div>

            </td>


            <td>
                ${escapeHtml(
        categories.join(", ") || "—"
    )}
            </td>


            <td>
                ${escapeHtml(
        product.collection || "—"
    )}
            </td>


            <td>

                <strong>
                    ৳${salePrice.toLocaleString("en-BD")}
                </strong>

                ${originalPrice > salePrice
            ? `
                            <del>
                                ৳${originalPrice.toLocaleString("en-BD")}
                            </del>
                        `
            : ""
        }

            </td>


            <td>
                ${Number(product.stock || 0)}
            </td>


            <td>

                <span class="
                    badge
                    ${active ? "ok" : "warn"}
                ">

                    ${active ? "Active" : "Inactive"}

                </span>

            </td>


            <td>

                <div class="inline-actions">

                    <button
                        type="button"
                        class="btn edit"
                        data-id="${escapeHtml(product.id)}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn danger delete"
                        data-id="${escapeHtml(product.id)}"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>
    `;
}


// ============================================================
// ADD PRODUCT
// ============================================================

addProductBtn?.addEventListener(
    "click",
    openAddProduct
);


function openAddProduct() {

    resetForm();

    if (productId) {
        productId.value = "";
    }

    if (modalTitle) {
        modalTitle.textContent =
            "Add Product";
    }

    if (productModal) {
        productModal.classList.remove("hidden");
    }

}


// ============================================================
// RESET FORM
// ============================================================

function resetForm() {

    productForm?.reset();

    if (productId) {
        productId.value = "";
    }

    if (brandInput) {
        brandInput.value =
            "Nishat Fashion";
    }

    if (activeInput) {
        activeInput.checked = true;
    }

    uploadedImages = [];

    syncImages();
    renderImagePreview();
    clearMessage();

    if (discountPercentInput) {
        discountPercentInput.value = "";
    }

    if (imageUploadStatus) {
        imageUploadStatus.style.display =
            "none";
    }
}


// ============================================================
// EDIT PRODUCT
// ============================================================

async function editProduct(id) {

    try {

        const productRef =
            doc(
                db,
                "products",
                id
            );

        const snapshot =
            await getDoc(productRef);

        if (!snapshot.exists()) {

            alert(
                "Product not found."
            );

            return;
        }

        const product = {
            id: snapshot.id,
            ...snapshot.data()
        };

        fillForm(product);

        if (modalTitle) {
            modalTitle.textContent =
                "Edit Product";
        }

        if (productModal) {
            productModal.classList.remove(
                "hidden"
            );
        }

    } catch (error) {

        console.error(
            "Edit product error:",
            error
        );

        alert(
            "Unable to load product."
        );
    }
}


// ============================================================
// FILL EDIT FORM
// ============================================================

function fillForm(product) {

    if (!product) return;

    if (productId) {
        productId.value =
            product.id || "";
    }

    if (nameInput) {
        nameInput.value =
            product.name || "";
    }

    if (skuInput) {
        skuInput.value =
            product.sku || "";
    }

    if (categoryInput) {
        categoryInput.value =
            getCategories(product).join(", ");
    }

    if (collectionInput) {
        collectionInput.value =
            product.collection || "";
    }

    if (brandInput) {
        brandInput.value =
            product.brand ||
            "Nishat Fashion";
    }

    if (materialInput) {
        materialInput.value =
            product.material || "";
    }

    if (fitInput) {
        fitInput.value =
            product.fit || "";
    }


    const salePrice =
        product.salePrice ??
        product.price ??
        "";

    const originalPrice =
        product.discountPrice ??
        product.oldPrice ??
        "";


    if (salePriceInput) {
        salePriceInput.value =
            salePrice;
    }

    if (discountPriceInput) {
        discountPriceInput.value =
            originalPrice;
    }


    if (discountPercentInput) {

        discountPercentInput.value =
            product.discount ??
            calculateDiscount(
                Number(originalPrice || 0),
                Number(salePrice || 0)
            );

    }


    if (stockInput) {
        stockInput.value =
            product.stock ?? 0;
    }


    if (colorsInput) {
        colorsInput.value =
            Array.isArray(product.colors)
                ? product.colors
                    .map(color =>
                        typeof color === "object"
                            ? color?.name
                            : color
                    )
                    .filter(Boolean)
                    .join(", ")
                : "";
    }


    if (sizesInput) {
        sizesInput.value =
            Array.isArray(product.sizes)
                ? product.sizes.join(", ")
                : "";
    }


    if (tagsInput) {
        tagsInput.value =
            Array.isArray(product.tags)
                ? product.tags.join(", ")
                : "";
    }


    if (videoUrlInput) {
        videoUrlInput.value =
            product.videoUrl || "";
    }


    if (shortDescriptionInput) {
        shortDescriptionInput.value =
            product.shortDescription || "";
    }


    if (descriptionInput) {
        descriptionInput.value =
            product.description ||
            product.longDescription ||
            "";
    }


    if (seoTitleInput) {
        seoTitleInput.value =
            product.seoTitle || "";
    }


    if (seoDescriptionInput) {
        seoDescriptionInput.value =
            product.seoDescription || "";
    }


    if (featuredInput) {
        featuredInput.checked =
            product.featured === true;
    }

    if (newArrivalInput) {
        newArrivalInput.checked =
            product.newArrival === true;
    }

    if (bestSellerInput) {
        bestSellerInput.checked =
            product.bestSeller === true;
    }

    if (activeInput) {
        activeInput.checked =
            product.active !== false;
    }


    uploadedImages =
        getImages(product);

    syncImages();
    renderImagePreview();

}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeProductModal() {

    productModal?.classList.add(
        "hidden"
    );

    resetForm();
}


closeModal?.addEventListener(
    "click",
    closeProductModal
);


cancelBtn?.addEventListener(
    "click",
    closeProductModal
);


productModal?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            productModal
        ) {
            closeProductModal();
        }

    }
);


// ============================================================
// SEARCH
// ============================================================

searchInput?.addEventListener(
    "input",
    renderProducts
);

categoryFilter?.addEventListener(
    "change",
    renderProducts
);


// ============================================================
// TABLE ACTIONS
// ============================================================

productsBody?.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest("button");

        if (!button) return;

        const id =
            button.dataset.id;

        if (!id) return;


        if (
            button.classList.contains("edit")
        ) {

            await editProduct(id);
            return;
        }


        if (
            button.classList.contains("delete")
        ) {

            await deleteProduct(id);
        }

    }
);


// ============================================================
// DELETE
// ============================================================

async function deleteProduct(id) {

    const product =
        products.find(
            item =>
                String(item.id) ===
                String(id)
        );

    if (!product) return;

    const confirmed =
        confirm(
            `Delete "${product.name ||
            "this product"
            }"?`
        );

    if (!confirmed) return;

    try {

        await deleteDoc(
            doc(
                db,
                "products",
                id
            )
        );

        await loadProducts();

    } catch (error) {

        console.error(
            "Delete product error:",
            error
        );

        alert(
            "Unable to delete product."
        );
    }
}


// ============================================================
// SALE PRICE / DISCOUNT PRICE AUTO CALCULATION
// ============================================================

function updateDiscountPercent() {

    if (
        !salePriceInput ||
        !discountPriceInput ||
        !discountPercentInput
    ) {
        return;
    }

    const salePrice =
        Number(salePriceInput.value || 0);

    const discountPrice =
        Number(discountPriceInput.value || 0);

    if (
        salePrice > 0 &&
        discountPrice > 0 &&
        discountPrice < salePrice
    ) {

        const percent =
            Math.round(
                (
                    (salePrice - discountPrice) /
                    salePrice
                ) * 100
            );

        discountPercentInput.value =
            percent;

    } else {

        discountPercentInput.value =
            "0";
    }
}

salePriceInput?.addEventListener(
    "input",
    updateDiscountPercent
);

discountPriceInput?.addEventListener(
    "input",
    updateDiscountPercent
);


// ============================================================
// CLOUDINARY UPLOAD
// ============================================================

uploadImagesBtn?.addEventListener(
    "click",
    () => {

        if (
            typeof window.cloudinary ===
            "undefined"
        ) {

            setUploadStatus(
                "Cloudinary uploader is not loaded. Refresh the page.",
                false
            );

            return;
        }


        const widget =
            window.cloudinary.createUploadWidget(
                {

                    cloudName:
                        CLOUDINARY_CLOUD_NAME,

                    uploadPreset:
                        CLOUDINARY_UPLOAD_PRESET,

                    folder:
                        CLOUDINARY_FOLDER,

                    multiple: true,

                    maxFiles: 10,

                    maxFileSize:
                        10 * 1024 * 1024,

                    resourceType: "image",

                    clientAllowedFormats: [
                        "jpg",
                        "jpeg",
                        "png",
                        "webp"
                    ],

                    sources: [
                        "local"
                    ]

                },

                (
                    error,
                    result
                ) => {

                    if (error) {

                        console.error(
                            "Cloudinary error:",
                            error
                        );

                        setUploadStatus(
                            "Image upload failed.",
                            false
                        );

                        return;
                    }


                    if (
                        result?.event ===
                        "success"
                    ) {

                        const url =
                            result.info?.secure_url;

                        if (
                            url &&
                            !uploadedImages.includes(url)
                        ) {

                            uploadedImages.push(
                                url
                            );
                        }

                        syncImages();
                        renderImagePreview();

                        setUploadStatus(
                            `${uploadedImages.length} image(s) ready.`,
                            true
                        );
                    }

                }
            );


        widget.open();

    }
);


// ============================================================
// IMAGE SYNC
// ============================================================

function syncImages() {

    if (!imagesInput) return;

    imagesInput.value =
        uploadedImages.join("\n");
}


// ============================================================
// IMAGE PREVIEW
// ============================================================

function renderImagePreview() {

    if (!imagePreview) return;

    imagePreview.innerHTML = "";


    if (!uploadedImages.length) {

        imagePreview.innerHTML = `
            <div
                style="
                    padding:16px;
                    border:1px dashed #cbd5e1;
                    border-radius:10px;
                    color:#64748b;
                    text-align:center;
                    grid-column:1/-1;
                "
            >
                No product images uploaded yet.
            </div>
        `;

        return;
    }


    uploadedImages.forEach(
        (url, index) => {

            const item =
                document.createElement("div");

            item.className =
                "image-item";


            item.innerHTML = `

                <img
                    src="${escapeHtml(url)}"
                    alt="Product Image ${index + 1}"
                >

                <span class="image-index">
                    ${index + 1}
                </span>

                <button
                    type="button"
                    data-index="${index}"
                    title="Remove image"
                >
                    ×
                </button>

            `;


            imagePreview.appendChild(
                item
            );

        }
    );


    imagePreview
        .querySelectorAll(
            ".image-item button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.index
                        );

                    uploadedImages.splice(
                        index,
                        1
                    );

                    syncImages();
                    renderImagePreview();

                    setUploadStatus(
                        `${uploadedImages.length} image(s) ready.`,
                        true
                    );

                }
            );

        });

}


// ============================================================
// SAVE PRODUCT
// ============================================================

productForm?.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        clearMessage();


        // ----------------------------------------------------
        // GET FORM VALUES
        // ----------------------------------------------------

        const name =
            nameInput?.value?.trim() || "";

        const category =
            parseList(
                categoryInput?.value || ""
            );

        const salePrice =
            Number(
                salePriceInput?.value || 0
            );

        /*
         * discountPrice field = original/regular price.
         *
         * Example:
         * Sale Price      = 890
         * Discount Price  = 1200
         * Discount        = 26%
         *
         * If Discount Price is empty:
         * no discount.
         */

        const originalPrice =
            Number(
                discountPriceInput?.value || 0
            );

        const stock =
            Number(
                stockInput?.value || 0
            );


        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (!name) {

            showMessage(
                "Product name is required."
            );

            return;
        }


        if (!category.length) {

            showMessage(
                "At least one category is required."
            );

            return;
        }


        if (
            !Number.isFinite(salePrice) ||
            salePrice < 0
        ) {

            showMessage(
                "Please enter a valid sale price."
            );

            return;
        }


        if (
            !Number.isFinite(originalPrice) ||
            originalPrice < 0
        ) {

            showMessage(
                "Please enter a valid discount price."
            );

            return;
        }


        if (
            !Number.isInteger(stock) ||
            stock < 0
        ) {

            showMessage(
                "Please enter a valid stock quantity."
            );

            return;
        }


        /*
         * IMPORTANT:
         * Original price cannot be lower
         * than sale price.
         *
         * Empty original price = allowed.
         */
        if (
            originalPrice > 0 &&
            originalPrice > salePrice
        ) {

            showMessage(
                "Discount Price cannot be greater than Sale Price."
            );

            return;
        }

      const discount =
    salePrice > 0 &&
    originalPrice > 0 &&
    originalPrice < salePrice
        ? Math.round(
            (
                (salePrice - originalPrice) /
                salePrice
            ) * 100
        )
        : 0;


        // ----------------------------------------------------
        // DATA
        // ----------------------------------------------------

        const data = {

            name,

            sku:
                skuInput?.value?.trim() || "",

            category,

            collection:
                collectionInput?.value?.trim() || "",

            brand:
                brandInput?.value?.trim() ||
                "Nishat Fashion",

            material:
                materialInput?.value?.trim() || "",

            fit:
                fitInput?.value?.trim() || "",

            salePrice,

            // Keep both for compatibility
            oldPrice:
                originalPrice,

            discountPrice:
                originalPrice,

            discount,

            stock,

            colors:
                parseList(
                    colorsInput?.value || ""
                ),

            sizes:
                parseList(
                    sizesInput?.value || ""
                ),

            tags:
                parseList(
                    tagsInput?.value || ""
                ),

            images:
                [...uploadedImages],

            thumbnail:
                uploadedImages[0] || "",

            videoUrl:
                videoUrlInput?.value?.trim() || "",

            shortDescription:
                shortDescriptionInput
                    ?.value
                    ?.trim() || "",

            description:
                descriptionInput
                    ?.value
                    ?.trim() || "",

            seoTitle:
                seoTitleInput
                    ?.value
                    ?.trim() || "",

            seoDescription:
                seoDescriptionInput
                    ?.value
                    ?.trim() || "",

            featured:
                featuredInput?.checked === true,

            newArrival:
                newArrivalInput?.checked === true,

            bestSeller:
                bestSellerInput?.checked === true,

            active:
                activeInput?.checked !== false,

            updatedAt:
                serverTimestamp()

        };


        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        if (!saveProductBtn) {

            showMessage(
                "Save button not found."
            );

            return;
        }


        saveProductBtn.disabled =
            true;

        saveProductBtn.textContent =
            "Saving...";


        try {

            let id =
                productId?.value?.trim() ||
                "";


            // NEW PRODUCT
            if (!id) {

                id =
                    "product_" +
                    Date.now();

                data.createdAt =
                    serverTimestamp();
            }


            const productRef =
                doc(
                    db,
                    "products",
                    id
                );


            await setDoc(
                productRef,
                data,
                {
                    merge: true
                }
            );


            showMessage(
                "Product saved successfully.",
                true
            );


            await loadProducts();


            setTimeout(
                closeProductModal,
                700
            );


        } catch (error) {

            console.error(
                "Save product error:",
                error
            );

            showMessage(
                error?.message ||
                "Unable to save product."
            );

        } finally {

            saveProductBtn.disabled =
                false;

            saveProductBtn.textContent =
                "Save Product";

        }

    }
);


// ============================================================
// INITIAL DISCOUNT CALCULATION
// ============================================================

updateDiscountPercent();


// ============================================================
// END
// ============================================================