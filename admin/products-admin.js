import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
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


const auth = getAuth(app);


/* =========================
   CLOUDINARY CONFIG
========================= */

const CLOUDINARY_CLOUD_NAME = "dmqnuzexg";
const CLOUDINARY_UPLOAD_PRESET = "nishat_products";


/* =========================
   ELEMENTS
========================= */

const adminEmail =
    document.getElementById("adminEmail");

const logoutBtn =
    document.getElementById("logoutBtn");

const addProductBtn =
    document.getElementById("addProductBtn");

const loading =
    document.getElementById("loading");

const emptyState =
    document.getElementById("emptyState");

const productsGrid =
    document.getElementById("productsGrid");


/* =========================
   PRODUCT MODAL ELEMENTS
========================= */

const productModal =
    document.getElementById("productModal");

const productForm =
    document.getElementById("productForm");

const modalTitle =
    document.getElementById("modalTitle");

const closeModalBtn =
    document.getElementById("closeModalBtn");

const cancelProductBtn =
    document.getElementById("cancelProductBtn");

const saveProductBtn =
    document.getElementById("saveProductBtn");

const formMessage =
    document.getElementById("formMessage");


/* =========================
   FORM ELEMENTS
========================= */

const productId =
    document.getElementById("productId");

const productName =
    document.getElementById("productName");

const productCategory =
    document.getElementById("productCategory");

const productStock =
    document.getElementById("productStock");

const productPrice =
    document.getElementById("productPrice");

const productOldPrice =
    document.getElementById("productOldPrice");

const productDiscount =
    document.getElementById("productDiscount");

const productColors =
    document.getElementById("productColors");

const productSizes =
    document.getElementById("productSizes");

const productImages =
    document.getElementById("productImages");

const productDescription =
    document.getElementById("productDescription");

const productLongDescription =
    document.getElementById("productLongDescription");

const productFeatured =
    document.getElementById("productFeatured");

const productNewArrival =
    document.getElementById("productNewArrival");

const productBestSeller =
    document.getElementById("productBestSeller");

const productActive =
    document.getElementById("productActive");


/* =========================
   CLOUDINARY UI ELEMENTS
========================= */

const uploadImagesBtn =
    document.getElementById("uploadImagesBtn");

const imagePreview =
    document.getElementById("imagePreview");

const imageUploadStatus =
    document.getElementById("imageUploadStatus");


/* =========================
   IMAGE STATE
========================= */

let uploadedImages = [];

/* =========================
   RESPONSIVE ACTION LOADING
========================= */
const originalButtonText = new WeakMap();

function actionLoading(button, loading, text = "Loading...") {
    if (!button) return;
    if (loading) {
        if (!originalButtonText.has(button)) originalButtonText.set(button, button.textContent.trim());
        button.disabled = true;
        button.classList.add("is-loading");
        button.setAttribute("aria-busy", "true");
        button.textContent = text;
    } else {
        button.disabled = false;
        button.classList.remove("is-loading");
        button.removeAttribute("aria-busy");
        const original = originalButtonText.get(button);
        if (original !== undefined) {
            button.textContent = original;
            originalButtonText.delete(button);
        }
    }
}

function pageLoading(show, text = "Loading...") {
    if (window.setAdminLoading) window.setAdminLoading(show, text);
}



/* =========================
   BASIC SAFETY CHECK
========================= */

if (
    !productModal ||
    !productForm ||
    !uploadImagesBtn ||
    !imagePreview ||
    !imageUploadStatus
) {
    console.error(
        "Product page HTML is missing required product-form elements."
    );
}


/* =========================
   AUTH CHECK
========================= */

onAuthStateChanged(auth, async (user) => {

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

        const adminSnap =
            await getDoc(adminRef);


        if (!adminSnap.exists()) {

            await signOut(auth);

            window.location.href =
                "admin-login.html";

            return;
        }


        const adminData =
            adminSnap.data();


        if (
            adminData.role !== "admin" ||
            adminData.active !== true
        ) {

            await signOut(auth);

            window.location.href =
                "admin-login.html";

            return;
        }


        adminEmail.textContent =
            user.email || "Admin";


        await loadProducts();


    } catch (error) {

        console.error(
            "Admin verification error:",
            error
        );

        await signOut(auth);

        window.location.href =
            "admin-login.html";
    }

});


/* =========================
   LOAD PRODUCTS
========================= */

async function loadProducts() {

    pageLoading(true, "Loading products...");
    loading.classList.remove("hidden");

    emptyState.classList.add("hidden");

    productsGrid.innerHTML = "";


    try {

        const productsRef =
            collection(
                db,
                "products"
            );


        const snapshot =
            await getDocs(
                productsRef
            );


        const products =
            snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));


        loading.classList.add("hidden");
        pageLoading(false);


        if (products.length === 0) {

            emptyState.classList.remove(
                "hidden"
            );

            return;
        }


        products.sort((a, b) => {

            return Number(
                a.productId || a.id
            ) -
            Number(
                b.productId || b.id
            );

        });


        products.forEach(product => {

            productsGrid.appendChild(
                createProductCard(product)
            );

        });


    } catch (error) {

        console.error(
            "Products loading error:",
            error
        );

        loading.textContent =
            "Unable to load products.";
        pageLoading(false);
    }

}


/* =========================
   PRODUCT CARD
========================= */

function createProductCard(product) {

    const card =
        document.createElement("div");


    card.className =
        "admin-product-card";


    const image =
        product.images?.[0] ||
        "../asset/logo.png";


    const price =
        Number(
            product.price || 0
        );


    const oldPrice =
        Number(
            product.oldPrice || 0
        );


    const stock =
        Number(
            product.stock || 0
        );


    const active =
        product.active === true;


    card.innerHTML = `

        <div class="admin-product-image">

            <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(product.name || "Product")}"
                onerror="this.src='../asset/logo.png'"
            >

        </div>


        <div class="admin-product-info">

            <div class="product-top-row">

                <span class="product-id">
                    #${escapeHTML(
                        String(
                            product.productId ||
                            product.id
                        )
                    )}
                </span>

                <span class="${
                    active
                        ? "status-active"
                        : "status-inactive"
                }">

                    ${
                        active
                            ? "Active"
                            : "Inactive"
                    }

                </span>

            </div>


            <h3>
                ${escapeHTML(
                    product.name ||
                    "Unnamed Product"
                )}
            </h3>


            <p class="product-category">
                ${escapeHTML(
                    product.category ||
                    "Uncategorized"
                )}
            </p>


            <div class="price-row">

                <strong>
                    ৳${price.toLocaleString()}
                </strong>

                ${
                    oldPrice > price
                        ? `
                            <del>
                                ৳${oldPrice.toLocaleString()}
                            </del>
                        `
                        : ""
                }

            </div>


            <div class="stock-row">

                <span>
                    Stock:
                    <strong>
                        ${stock}
                    </strong>
                </span>

                ${
                    product.discount
                        ? `
                            <span>
                                ${Number(
                                    product.discount
                                )}% OFF
                            </span>
                        `
                        : ""
                }

            </div>


            <div class="product-flags">

                ${
                    product.featured
                        ? `<span>Featured</span>`
                        : ""
                }

                ${
                    product.newArrival
                        ? `<span>New</span>`
                        : ""
                }

                ${
                    product.bestSeller
                        ? `<span>Best Seller</span>`
                        : ""
                }

            </div>


            <div class="product-actions">

                <button
                    type="button"
                    class="edit-btn"
                    data-id="${escapeHTML(
                        String(product.id)
                    )}"
                >
                    Edit
                </button>


                <button
                    type="button"
                    class="delete-btn"
                    data-id="${escapeHTML(
                        String(product.id)
                    )}"
                >
                    Delete
                </button>

            </div>

        </div>

    `;


    /* EDIT */

    card
        .querySelector(".edit-btn")
        .addEventListener(
            "click",
            () => {

                const id =
                    card.querySelector(
                        ".edit-btn"
                    ).dataset.id;

                editProduct(id);

            }
        );


    /* DELETE */

    card
        .querySelector(".delete-btn")
        .addEventListener(
            "click",
            () => {

                const id =
                    card.querySelector(
                        ".delete-btn"
                    ).dataset.id;

                deleteProduct(id);

            }
        );


    return card;
}


/* =========================
   ADD PRODUCT
========================= */

addProductBtn.addEventListener(
    "click",
    () => {
        actionLoading(addProductBtn, true, "Opening...");
        requestAnimationFrame(() => {
            openProductModal();
            actionLoading(addProductBtn, false);
        });
    }
);


/* =========================
   OPEN PRODUCT MODAL
========================= */

function openProductModal(product = null) {

    productForm.reset();

    clearFormMessage();

    uploadedImages = [];


    if (product) {

        modalTitle.textContent =
            "Edit Product";


        productId.value =
            product.id || "";


        productName.value =
            product.name || "";


        productCategory.value =
            product.category || "";


        productStock.value =
            product.stock ?? "";


        productPrice.value =
            product.price ?? "";


        productOldPrice.value =
            product.oldPrice ?? "";


        productDiscount.value =
            product.discount ?? "";


        productColors.value =
            (product.colors || [])
                .map(
                    color =>
                        color.name || ""
                )
                .filter(Boolean)
                .join(", ");


        productSizes.value =
            (product.sizes || [])
                .join(", ");


        uploadedImages =
            Array.isArray(
                product.images
            )
                ? [...product.images]
                : [];


        productDescription.value =
            product.description || "";


        productLongDescription.value =
            product.longDescription || "";


        productFeatured.checked =
            product.featured === true;


        productNewArrival.checked =
            product.newArrival === true;


        productBestSeller.checked =
            product.bestSeller === true;


        productActive.checked =
            product.active !== false;


    } else {

        modalTitle.textContent =
            "Add Product";


        productId.value = "";


        productActive.checked =
            true;
    }


    updateImageField();

    renderImagePreview();


    imageUploadStatus.style.display =
        uploadedImages.length
            ? "block"
            : "none";


    if (uploadedImages.length) {

        setUploadStatus(
            `${uploadedImages.length} existing image(s) loaded.`,
            true
        );

    }


    productModal.classList.remove(
        "hidden"
    );

}


/* =========================
   CLOSE PRODUCT MODAL
========================= */

function closeProductModal() {

    productModal.classList.add(
        "hidden"
    );

    productForm.reset();

    uploadedImages = [];

    updateImageField();

    renderImagePreview();

    imageUploadStatus.style.display =
        "none";

    clearFormMessage();
}


closeModalBtn.addEventListener(
    "click",
    () => {
        actionLoading(closeModalBtn, true, "...");
        requestAnimationFrame(() => {
            closeProductModal();
            actionLoading(closeModalBtn, false);
        });
    }
);


cancelProductBtn.addEventListener(
    "click",
    () => {
        actionLoading(cancelProductBtn, true, "...");
        requestAnimationFrame(() => {
            closeProductModal();
            actionLoading(cancelProductBtn, false);
        });
    }
);


productModal.addEventListener(
    "click",
    (event) => {

        if (
            event.target === productModal
        ) {

            closeProductModal();

        }

    }
);


/* =========================
   EDIT PRODUCT
========================= */

async function editProduct(id) {

    try {

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

            alert(
                "Product not found."
            );

            return;
        }


        openProductModal({

            id: snapshot.id,

            ...snapshot.data()

        });


    } catch (error) {

        console.error(
            "Edit product load error:",
            error
        );

        alert(
            "Unable to load product."
        );
    }

}


/* =========================
   CLOUDINARY UPLOAD
========================= */

uploadImagesBtn.addEventListener(
    "click",
    () => {
        actionLoading(uploadImagesBtn, true, "Opening...");
        requestAnimationFrame(() => {
            try {
                openCloudinaryUploader();
            } finally {
                actionLoading(uploadImagesBtn, false);
            }
        });
    }
);


function openCloudinaryUploader() {

    if (
        typeof cloudinary ===
        "undefined"
    ) {

        alert(
            "Cloudinary Upload Widget is not loaded. Please refresh the page."
        );

        return;
    }


    const widget =
        cloudinary.createUploadWidget(

            {

                cloudName:
                    CLOUDINARY_CLOUD_NAME,

                uploadPreset:
                    CLOUDINARY_UPLOAD_PRESET,

                multiple: true,

                maxFiles: 10,

                maxFileSize:
                    5 * 1024 * 1024,

                clientAllowedFormats: [
                    "jpg",
                    "jpeg",
                    "png",
                    "webp"
                ],

                sources: [
                    "local"
                ],

                showAdvancedOptions:
                    false,

                cropping: false,

                resourceType:
                    "image",

                theme:
                    "minimal"

            },

            (
                error,
                result
            ) => {

                if (error) {

                    console.error(
                        "Cloudinary upload error:",
                        error
                    );

                    setUploadStatus(
                        "Image upload failed.",
                        false
                    );

                    return;
                }


                if (
                    result &&
                    result.event ===
                        "success"
                ) {

                    const imageUrl =
                        result.info
                            .secure_url;


                    if (
                        imageUrl &&
                        !uploadedImages.includes(
                            imageUrl
                        )
                    ) {

                        uploadedImages.push(
                            imageUrl
                        );

                    }


                    updateImageField();

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


/* =========================
   IMAGE PREVIEW
========================= */

function renderImagePreview() {

    imagePreview.innerHTML =
        "";


    if (
        uploadedImages.length === 0
    ) {

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
        (imageUrl, index) => {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "cloudinary-image-item";


            wrapper.innerHTML = `

                <img
                    src="${escapeHTML(
                        imageUrl
                    )}"
                    alt="Product Image ${index + 1}"
                >

                <span
                    class="image-number"
                >
                    ${index + 1}
                </span>

                <button
                    type="button"
                    class="remove-product-image"
                    data-index="${index}"
                    title="Remove image"
                >
                    ×
                </button>

            `;


            imagePreview.appendChild(
                wrapper
            );

        }
    );


    imagePreview
        .querySelectorAll(
            ".remove-product-image"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset
                                .index
                        );


                    uploadedImages.splice(
                        index,
                        1
                    );


                    updateImageField();

                    renderImagePreview();


                    setUploadStatus(
                        `${uploadedImages.length} image(s) ready.`,
                        true
                    );

                }
            );

        });

}


/* =========================
   UPDATE IMAGE FIELD
========================= */

function updateImageField() {

    productImages.value =
        uploadedImages.join("\n");

}


/* =========================
   UPLOAD STATUS
========================= */

function setUploadStatus(
    message,
    success = true
) {

    imageUploadStatus.style.display =
        "block";


    imageUploadStatus.textContent =
        message;


    imageUploadStatus.style.background =
        success
            ? "#ecfdf5"
            : "#fef2f2";


    imageUploadStatus.style.color =
        success
            ? "#047857"
            : "#b91c1c";


    imageUploadStatus.style.border =
        success
            ? "1px solid #a7f3d0"
            : "1px solid #fecaca";
}


/* =========================
   SAVE PRODUCT
========================= */

productForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearFormMessage();


        const name =
            productName.value.trim();


        const category =
            productCategory.value.trim();


        const price =
            Number(
                productPrice.value
            );


        const stock =
            Number(
                productStock.value
            );


        if (!name) {

            showFormMessage(
                "Product name is required."
            );

            return;
        }


        if (!category) {

            showFormMessage(
                "Please enter a product category."
            );

            return;
        }


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            showFormMessage(
                "Please enter a valid price."
            );

            return;
        }


        if (
            !Number.isInteger(stock) ||
            stock < 0
        ) {

            showFormMessage(
                "Please enter a valid stock quantity."
            );

            return;
        }


        const oldPrice =
            Number(
                productOldPrice.value ||
                0
            );


        const discount =
            Number(
                productDiscount.value ||
                0
            );


        if (
            !Number.isFinite(
                oldPrice
            ) ||
            oldPrice < 0
        ) {

            showFormMessage(
                "Invalid old price."
            );

            return;
        }


        if (
            !Number.isFinite(
                discount
            ) ||
            discount < 0 ||
            discount > 100
        ) {

            showFormMessage(
                "Discount must be between 0 and 100."
            );

            return;
        }


        if (
            uploadedImages.length === 0
        ) {

            showFormMessage(
                "Please upload at least one product image."
            );

            return;
        }


        const colors =
            productColors.value
                .split(",")
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean)
                .map(name => ({
                    name: name,
                    value: ""
                }));


        const sizes =
            productSizes.value
                .split(",")
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);


        const images =
            [...uploadedImages];


        const productData = {

            name,

            category,

            price,

            oldPrice,

            discount,

            stock,

            colors,

            sizes,

            images,

            description:
                productDescription.value
                    .trim(),

            longDescription:
                productLongDescription.value
                    .trim(),

            featured:
                productFeatured.checked,

            newArrival:
                productNewArrival.checked,

            bestSeller:
                productBestSeller.checked,

            active:
                productActive.checked,

            updatedAt:
                serverTimestamp()

        };


        actionLoading(saveProductBtn, true, "Saving...");


        try {

            /* =========================
               EDIT
            ========================= */

            if (
                productId.value
            ) {

                const ref =
                    doc(
                        db,
                        "products",
                        productId.value
                    );


                await updateDoc(
                    ref,
                    productData
                );


                showFormMessage(
                    "Product updated successfully.",
                    true
                );

            }


            /* =========================
               ADD
            ========================= */

            else {

                const snapshot =
                    await getDocs(
                        collection(
                            db,
                            "products"
                        )
                    );


                let maxId = 0;


                snapshot.forEach(
                    item => {

                        const id =
                            Number(
                                item.data()
                                    .productId ||
                                item.id
                            );


                        if (
                            Number.isFinite(id) &&
                            id > maxId
                        ) {

                            maxId = id;

                        }

                    }
                );


                const newId =
                    String(
                        maxId + 1
                    );


                const ref =
                    doc(
                        db,
                        "products",
                        newId
                    );


                await setDoc(
                    ref,
                    {

                        ...productData,

                        productId:
                            newId,

                        createdAt:
                            serverTimestamp()

                    }
                );


                showFormMessage(
                    "Product added successfully.",
                    true
                );

            }


            setTimeout(
                async () => {

                    closeProductModal();

                    await loadProducts();

                },
                700
            );


        } catch (error) {

            console.error(
                "Save product error:",
                error
            );


            showFormMessage(
                error.message ||
                "Unable to save product."
            );


        } finally {

            actionLoading(saveProductBtn, false);
        }

    }
);


/* =========================
   FORM MESSAGE
========================= */

function showFormMessage(
    message,
    success = false
) {

    formMessage.textContent =
        message;


    formMessage.className =
        success
            ? "form-message success"
            : "form-message";
}


function clearFormMessage() {

    formMessage.textContent =
        "";

    formMessage.className =
        "form-message";
}


/* =========================
   DELETE PRODUCT
========================= */

async function deleteProduct(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this product?"
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


        alert(
            "Product deleted successfully."
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


/* =========================
   LOGOUT
========================= */

logoutBtn.addEventListener(
    "click",
    async () => {

        actionLoading(logoutBtn, true, "Logging out...");

        try {

            await signOut(auth);

            window.location.href =
                "admin-login.html";


        } catch (error) {
            actionLoading(logoutBtn, false);

            console.error(
                "Logout error:",
                error
            );

        }

    }
);


/* =========================
   HTML ESCAPE
========================= */

function escapeHTML(value) {

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
