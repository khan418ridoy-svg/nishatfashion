import { requireAdmin } from "./admin-auth.js";

import {
    db
} from "../js/firebase.js";

import {
    collection,
    getDocs,
    doc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// =========================================================
// ADMIN AUTH
// =========================================================

const user = await requireAdmin();

if (!user) {
    throw new Error("Unauthorized");
}


// =========================================================
// DOM
// =========================================================

const productsBody =
    document.getElementById("productsBody");

const productModal =
    document.getElementById("productModal");

const productForm =
    document.getElementById("productForm");

const searchInput =
    document.getElementById("searchInput");

const categoryFilter =
    document.getElementById("categoryFilter");

const loading =
    document.getElementById("loading");

const emptyState =
    document.getElementById("emptyState");

const adminEmail =
    document.getElementById("adminEmail");


// =========================================================
// FORM ELEMENTS
// =========================================================

const productId =
    document.getElementById("productId");

const nameInput =
    document.getElementById("name");

const skuInput =
    document.getElementById("sku");

const categoryInput =
    document.getElementById("category");

const collectionInput =
    document.getElementById("productCollection");

const brandInput =
    document.getElementById("brand");

const materialInput =
    document.getElementById("material");

const fitInput =
    document.getElementById("fit");

const salePriceInput =
    document.getElementById("salePrice");

const oldPriceInput =
    document.getElementById("oldPrice");

const discountInput =
    document.getElementById("discount");

const stockInput =
    document.getElementById("stock");

const colorsInput =
    document.getElementById("colors");

const sizesInput =
    document.getElementById("sizes");

const tagsInput =
    document.getElementById("tags");

const imagesInput =
    document.getElementById("images");

const videoUrlInput =
    document.getElementById("videoUrl");

const shortDescriptionInput =
    document.getElementById("shortDescription");

const descriptionInput =
    document.getElementById("description");

const seoTitleInput =
    document.getElementById("seoTitle");

const seoDescriptionInput =
    document.getElementById("seoDescription");

const featuredInput =
    document.getElementById("featured");

const newArrivalInput =
    document.getElementById("newArrival");

const bestSellerInput =
    document.getElementById("bestSeller");

const activeInput =
    document.getElementById("active");

const formMessage =
    document.getElementById("formMessage");

const modalTitle =
    document.getElementById("modalTitle");

const saveProductBtn =
    document.getElementById("saveProductBtn");

const imagePreview =
    document.getElementById("imagePreview");

const uploadImagesBtn =
    document.getElementById("uploadImagesBtn");

const imageUploadStatus =
    document.getElementById("imageUploadStatus");


// =========================================================
// STATE
// =========================================================

let products = [];

let uploadedImages = [];


// =========================================================
// ADMIN INFO
// =========================================================

if (adminEmail) {
    adminEmail.textContent =
        user.email || "Admin";
}


// =========================================================
// LOAD PRODUCTS
// =========================================================

async function loadProducts() {

    loading.classList.remove("hidden");

    emptyState.classList.add("hidden");

    productsBody.innerHTML = "";

    try {

        const productsRef =
            collection(db, "products");

        const snapshot =
            await getDocs(productsRef);

        products =
            snapshot.docs.map(item => ({
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

        loading.textContent =
            "Unable to load products.";

    } finally {

        loading.classList.add("hidden");

    }

}


// =========================================================
// CATEGORY FILTER
// =========================================================

function renderCategoryFilter() {

    const categories = [
        ...new Set(
            products
                .map(product =>
                    String(
                        product.category || ""
                    ).trim()
                )
                .filter(Boolean)
        )
    ].sort(
        (a, b) =>
            a.localeCompare(b)
    );


    categoryFilter.innerHTML = `
        <option value="">
            All Categories
        </option>

        ${
            categories
                .map(category => `
                    <option value="${escapeHtml(category)}">
                        ${escapeHtml(category)}
                    </option>
                `)
                .join("")
        }
    `;

}


// =========================================================
// RENDER PRODUCTS
// =========================================================

function renderProducts() {

    const search =
        String(
            searchInput.value || ""
        )
            .trim()
            .toLowerCase();

    const selectedCategory =
        categoryFilter.value;


    const filtered =
        products.filter(product => {

            const searchable = [

                product.name,

                product.sku,

                product.category,

                product.collection,

                product.brand,

                product.material,

                ...(product.tags || [])

            ]
                .join(" ")
                .toLowerCase();


            const searchMatch =
                !search ||
                searchable.includes(search);


            const categoryMatch =
                !selectedCategory ||
                product.category ===
                    selectedCategory;


            return (
                searchMatch &&
                categoryMatch
            );

        });


    if (filtered.length === 0) {

        productsBody.innerHTML = "";

        emptyState.classList.remove(
            "hidden"
        );

        return;

    }


    emptyState.classList.add(
        "hidden"
    );


    filtered.sort(
        (a, b) =>
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


// =========================================================
// PRODUCT ROW
// =========================================================

function createProductRow(product) {

    const image =
        product.images?.[0] ||
        product.image ||
        "";


    const price =
        Number(
            product.salePrice ??
            product.price ??
            0
        );


    const stock =
        Number(
            product.stock || 0
        );


    const active =
        product.active !== false;


    return `

        <tr>

            <td>

                <div class="product-name">

                    ${
                        image
                            ? `
                                <img
                                    class="thumb"
                                    src="${escapeHtml(image)}"
                                    alt="${escapeHtml(
                                        product.name ||
                                        "Product"
                                    )}"
                                >
                            `
                            : ""
                    }

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
                    product.category ||
                    "—"
                )}
            </td>


            <td>
                ${escapeHtml(
                    product.collection ||
                    "—"
                )}
            </td>


            <td>
                ৳${price.toLocaleString("en-BD")}
            </td>


            <td>
                ${stock}
            </td>


            <td>

                <span
                    class="
                        badge
                        ${active ? "ok" : "warn"}
                    "
                >
                    ${
                        active
                            ? "Active"
                            : "Inactive"
                    }
                </span>

            </td>


            <td>

                <div class="inline-actions">

                    <button
                        type="button"
                        class="btn edit"
                        data-id="${escapeHtml(
                            String(product.id)
                        )}"
                    >
                        Edit
                    </button>


                    <button
                        type="button"
                        class="btn danger delete"
                        data-id="${escapeHtml(
                            String(product.id)
                        )}"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>

    `;

}


// =========================================================
// OPEN ADD MODAL
// =========================================================

document
    .getElementById("addProductBtn")
    .addEventListener(
        "click",
        () => {

            resetForm();

            modalTitle.textContent =
                "Add Product";

            productModal.classList.remove(
                "hidden"
            );

        }
    );


// =========================================================
// RESET FORM
// =========================================================

function resetForm() {

    productForm.reset();

    productId.value = "";

    brandInput.value =
        "Nishat Fashion";

    activeInput.checked =
        true;

    uploadedImages = [];

    renderImagePreview();

    clearMessage();

}


// =========================================================
// EDIT PRODUCT
// =========================================================

async function editProduct(id) {

    const product =
        products.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if (!product) {

        alert(
            "Product not found."
        );

        return;

    }


    fillForm(product);

    modalTitle.textContent =
        "Edit Product";

    productModal.classList.remove(
        "hidden"
    );

}


// =========================================================
// FILL FORM
// =========================================================

function fillForm(product) {

    productId.value =
        product.id || "";

    nameInput.value =
        product.name || "";

    skuInput.value =
        product.sku || "";

    categoryInput.value =
        product.category || "";

    collectionInput.value =
        product.collection || "";

    brandInput.value =
        product.brand ||
        "Nishat Fashion";

    materialInput.value =
        product.material || "";

    fitInput.value =
        product.fit || "";

    salePriceInput.value =
        product.salePrice ??
        product.price ??
        "";

    oldPriceInput.value =
        product.oldPrice ?? "";

    discountInput.value =
        product.discount ?? "";

    stockInput.value =
        product.stock ?? 0;

    colorsInput.value =
        Array.isArray(product.colors)
            ? product.colors.join(", ")
            : "";

    sizesInput.value =
        Array.isArray(product.sizes)
            ? product.sizes.join(", ")
            : "";

    tagsInput.value =
        Array.isArray(product.tags)
            ? product.tags.join(", ")
            : "";

    videoUrlInput.value =
        product.videoUrl || "";

    shortDescriptionInput.value =
        product.shortDescription || "";

    descriptionInput.value =
        product.description ||
        product.longDescription ||
        "";

    seoTitleInput.value =
        product.seoTitle || "";

    seoDescriptionInput.value =
        product.seoDescription || "";

    featuredInput.checked =
        product.featured === true;

    newArrivalInput.checked =
        product.newArrival === true;

    bestSellerInput.checked =
        product.bestSeller === true;

    activeInput.checked =
        product.active !== false;


    uploadedImages =
        Array.isArray(product.images)
            ? [...product.images]
            : [];


    syncImagesTextarea();

    renderImagePreview();

    clearMessage();

}


// =========================================================
// CLOSE MODAL
// =========================================================

document
    .getElementById("closeModal")
    .addEventListener(
        "click",
        closeModal
    );


document
    .getElementById("cancelBtn")
    .addEventListener(
        "click",
        closeModal
    );


productModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            productModal
        ) {

            closeModal();

        }

    }
);


function closeModal() {

    productModal.classList.add(
        "hidden"
    );

    clearMessage();

}


// =========================================================
// SEARCH
// =========================================================

searchInput.addEventListener(
    "input",
    renderProducts
);


categoryFilter.addEventListener(
    "change",
    renderProducts
);


// =========================================================
// TABLE ACTIONS
// =========================================================

productsBody.addEventListener(
    "click",
    async event => {

        const button =
            event.target.closest(
                "button"
            );


        if (!button) {
            return;
        }


        const id =
            button.dataset.id;


        if (!id) {
            return;
        }


        if (
            button.classList.contains(
                "edit"
            )
        ) {

            await editProduct(id);

            return;

        }


        if (
            button.classList.contains(
                "delete"
            )
        ) {

            await deleteProduct(id);

        }

    }
);


// =========================================================
// DELETE PRODUCT
// =========================================================

async function deleteProduct(id) {

    const product =
        products.find(
            item =>
                String(item.id) ===
                String(id)
        );


    const confirmed =
        confirm(
            `Delete "${product?.name || "this product"}"?`
        );


    if (!confirmed) {
        return;
    }


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
            "Delete error:",
            error
        );

        alert(
            "Unable to delete product."
        );

    }

}


// =========================================================
// SAVE PRODUCT
// =========================================================

productForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        clearMessage();


        const name =
            nameInput.value.trim();

        const category =
            categoryInput.value.trim();

        const salePrice =
            Number(
                salePriceInput.value
            );

        const oldPrice =
            Number(
                oldPriceInput.value || 0
            );

        const discount =
            Number(
                discountInput.value || 0
            );

        const stock =
            Number(
                stockInput.value
            );


        if (!name) {

            showError(
                "Product name is required."
            );

            return;

        }


        if (!category) {

            showError(
                "Category is required."
            );

            return;

        }


        if (
            !Number.isFinite(
                salePrice
            ) ||
            salePrice < 0
        ) {

            showError(
                "Please enter a valid sale price."
            );

            return;

        }


        if (
            !Number.isInteger(stock) ||
            stock < 0
        ) {

            showError(
                "Please enter a valid stock."
            );

            return;

        }


        if (
            discount < 0 ||
            discount > 100
        ) {

            showError(
                "Discount must be between 0 and 100."
            );

            return;

        }


        if (
            oldPrice > 0 &&
            oldPrice < salePrice
        ) {

            showError(
                "Old price should be greater than or equal to sale price."
            );

            return;

        }


        saveProductBtn.disabled =
            true;

        saveProductBtn.textContent =
            "Saving...";


        try {

            let id =
                productId.value.trim();


            if (!id) {

                id =
                    `product_${Date.now()}`;

            }


            const data = {

                name,

                sku:
                    skuInput.value.trim(),

                category,

                collection:
                    collectionInput.value.trim(),

                brand:
                    brandInput.value.trim() ||
                    "Nishat Fashion",

                material:
                    materialInput.value.trim(),

                fit:
                    fitInput.value.trim(),

                salePrice,

                oldPrice,

                discount,

                stock,

                colors:
                    parseCommaList(
                        colorsInput.value
                    ),

                sizes:
                    parseCommaList(
                        sizesInput.value
                    ),

                tags:
                    parseCommaList(
                        tagsInput.value
                    ),

                images:
                    uploadedImages,

                videoUrl:
                    videoUrlInput.value.trim(),

                shortDescription:
                    shortDescriptionInput.value.trim(),

                description:
                    descriptionInput.value.trim(),

                seoTitle:
                    seoTitleInput.value.trim(),

                seoDescription:
                    seoDescriptionInput.value.trim(),

                featured:
                    featuredInput.checked,

                newArrival:
                    newArrivalInput.checked,

                bestSeller:
                    bestSellerInput.checked,

                active:
                    activeInput.checked,

                updatedAt:
                    serverTimestamp()

            };


            const existing =
                products.find(
                    item =>
                        String(item.id) ===
                        String(id)
                );


            if (!existing) {

                data.createdAt =
                    serverTimestamp();

            }


            await setDoc(
                doc(
                    db,
                    "products",
                    id
                ),
                data,
                {
                    merge: true
                }
            );


            showSuccess(
                "Product saved successfully."
            );


            await loadProducts();


            setTimeout(
                () => {

                    closeModal();

                },
                700
            );


        } catch (error) {

            console.error(
                "Save product error:",
                error
            );

            showError(
                "Unable to save product. Please try again."
            );

        } finally {

            saveProductBtn.disabled =
                false;

            saveProductBtn.textContent =
                "Save Product";

        }

    }
);


// =========================================================
// CLOUDINARY UPLOAD
// =========================================================

uploadImagesBtn.addEventListener(
    "click",
    () => {

        if (
            typeof window.cloudinary ===
            "undefined"
        ) {

            showError(
                "Cloudinary Upload Widget is not loaded."
            );

            return;

        }


        imageUploadStatus.style.display =
            "block";

        imageUploadStatus.textContent =
            "Opening image uploader...";


        const widget =
            window.cloudinary.createUploadWidget(

                {
                    cloudName:
                        "dmqnuzexg",

                    uploadPreset:
                        "nishat_products",

                    folder:
                        "nishat-fashion/products",

                    multiple:
                        true,

                    maxFiles:
                        10,

                    resourceType:
                        "auto",

                    clientAllowedFormats: [
                        "jpg",
                        "jpeg",
                        "png",
                        "webp"
                    ],

                    maxFileSize:
                        10000000

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

                        imageUploadStatus.textContent =
                            "Image upload failed.";

                        return;

                    }


                    if (
                        result &&
                        result.event ===
                            "success"
                    ) {

                        const url =
                            result.info
                                .secure_url;


                        if (
                            url &&
                            !uploadedImages.includes(
                                url
                            )
                        ) {

                            uploadedImages.push(
                                url
                            );

                        }


                        syncImagesTextarea();

                        renderImagePreview();


                        imageUploadStatus.style.display =
                            "block";

                        imageUploadStatus.textContent =
                            `${uploadedImages.length} image(s) uploaded.`;

                    }

                }

            );


        widget.open();

    }
);


// =========================================================
// IMAGE PREVIEW
// =========================================================

function renderImagePreview() {

    imagePreview.innerHTML = "";


    uploadedImages.forEach(
        (url, index) => {

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "image-item";


            item.innerHTML = `

                <img
                    src="${escapeHtml(url)}"
                    alt="Product image ${index + 1}"
                >

                <span class="image-index">
                    ${index + 1}
                </span>

                <button
                    type="button"
                    data-index="${index}"
                    aria-label="Remove image"
                >
                    ×
                </button>

            `;


            item
                .querySelector("button")
                .addEventListener(
                    "click",
                    () => {

                        uploadedImages.splice(
                            index,
                            1
                        );

                        syncImagesTextarea();

                        renderImagePreview();

                    }
                );


            imagePreview.appendChild(
                item
            );

        }
    );

}


// =========================================================
// SYNC IMAGE TEXTAREA
// =========================================================

function syncImagesTextarea() {

    imagesInput.value =
        uploadedImages.join("\n");

}


// =========================================================
// PARSE COMMA LIST
// =========================================================

function parseCommaList(value) {

    return [
        ...new Set(
            String(value || "")
                .split(",")
                .map(item =>
                    item.trim()
                )
                .filter(Boolean)
        )
    ];

}


// =========================================================
// MESSAGES
// =========================================================

function clearMessage() {

    formMessage.textContent = "";

    formMessage.className =
        "form-message";

}


function showError(message) {

    formMessage.textContent =
        message;

    formMessage.className =
        "form-message";

}


function showSuccess(message) {

    formMessage.textContent =
        message;

    formMessage.className =
        "form-message success";

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value = "") {

    return String(value)

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
// INITIAL LOAD
// =========================================================

await loadProducts();