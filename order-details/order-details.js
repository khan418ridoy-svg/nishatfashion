// ============================================================
// NISHAT FASHION
// ORDER DETAILS + REVIEW SYSTEM
// ============================================================

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
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ============================================================
// CONFIG
// ============================================================

// PUT YOUR GOOGLE APPS SCRIPT /exec URL HERE
const GOOGLE_SHEET_API =
    "https://script.google.com/macros/s/AKfycbxjlt6CD52Nql27PFNb9QFTWO_tT0m--fYw4yTC8b5evGC8hi0WFqgrezCWY95oOmP9/exec";


// Cloudinary
const CLOUDINARY_CLOUD_NAME =
    "hsbnrirc";

const CLOUDINARY_UPLOAD_PRESET =
    "review";


// Maximum 3 images per product
const MAX_REVIEW_IMAGES = 3;


// Target image size
const TARGET_IMAGE_BYTES =
    30 * 1024;


// ============================================================
// GLOBAL
// ============================================================

let currentUser = null;

let currentOrder = null;

let currentOrderId = null;

let orderItems = [];

let reviewedProductIds = new Set();
let existingReviews = [];

let selectedProductIds = [];


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializePage();

    }
);


// ============================================================
// INITIALIZE
// ============================================================

function initializePage() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    currentOrderId =
        params.get("orderId");


    if (!currentOrderId) {

        showError(
            "Order ID পাওয়া যায়নি।"
        );

        return;

    }


    setupReviewEvents();


    onAuthStateChanged(
        auth,
        async user => {

            if (!user) {

                window.location.href =
                    "../login/index.html?redirect=" +
                    encodeURIComponent(
                        window.location.href
                    );

                return;

            }


            currentUser = user;


            await loadOrder();

        }
    );

}


// ============================================================
// LOAD ORDER
// ============================================================

async function loadOrder() {

    showLoading(true);


    try {

        const orderRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "orders",
                currentOrderId
            );


        const snapshot =
            await getDoc(orderRef);


        if (!snapshot.exists()) {

            showError(
                "এই order আর পাওয়া যায়নি।"
            );

            return;

        }


        currentOrder = {

            id: snapshot.id,

            data:
                snapshot.data() || {}

        };


        orderItems =
            getOrderItems(
                currentOrder.data
            );


        await loadReviewStatus();


        renderOrder();


        renderProducts();


        showLoading(false);


        document
            .getElementById("orderContent")
            .hidden = false;


    } catch (error) {

        console.error(
            "Order load error:",
            error
        );


        showError(
            "Order load করতে সমস্যা হয়েছে।"
        );

    }

}


// ============================================================
// ORDER ITEMS
// ============================================================

function getOrderItems(data) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        return [];

    }


    const arrays = [

        data.items,

        data.products,

        data.orderItems,

        data.cartItems,

        data.order_items

    ];


    for (const value of arrays) {

        if (Array.isArray(value)) {

            return value.map(
                (item, index) => ({

                    ...item,

                    __reviewIndex:
                        index

                })
            );

        }

    }


    if (
        data.productId ||
        data.name ||
        data.productName
    ) {

        return [
            {
                ...data,

                __reviewIndex: 0

            }
        ];

    }


    return [];

}


// ============================================================
// RENDER ORDER
// ============================================================

function renderOrder() {

    const data =
        currentOrder.data;


    setText(
        "orderId",
        currentOrder.id
    );


    setText(
        "orderDate",
        formatDate(
            data.createdAt ||
            data.orderDate ||
            data.updatedAt
        )
    );


    const status =
        normalizeStatus(
            data.status ||
            data.orderStatus ||
            "pending"
        );


    const statusElement =
        document.getElementById(
            "orderStatus"
        );


    statusElement.textContent =
        capitalize(status);


    statusElement.className =
        "order-status-large " +
        status;


    // Pricing
    const pricing =
        data.pricing || {};


    const subtotal =
        Number(
            pricing.subtotal ?? 0
        );


    const delivery =
        Number(
            pricing.deliveryCharge ?? 0
        );


    const discount =
        Number(
            pricing.discount ?? 0
        );


    const total =
        Number(
            pricing.total ??
            data.total ??
            0
        );


    setText(
        "orderSubtotal",
        formatMoney(subtotal)
    );


    setText(
        "orderDelivery",
        formatMoney(delivery)
    );


    setText(
        "orderDiscount",
        formatMoney(discount)
    );


    setText(
        "orderTotal",
        formatMoney(total)
    );


    renderOrderActions(status);

}


// ============================================================
// ORDER ACTIONS
// ============================================================

function renderOrderActions(status) {

    const container =
        document.getElementById(
            "orderActions"
        );


    container.innerHTML = "";


    // ========================================================
    // SHIPPED / DELIVERED / CANCELLED
    // NO CANCEL BUTTON
    // ========================================================

    if (
        status === "shipped" ||
        status === "delivered" ||
        status === "completed" ||
        status === "cancelled"
    ) {

        return;

    }


    // ========================================================
    // BEFORE SHIPPED
    // ========================================================

    if (
        status === "pending" ||
        status === "confirmed" ||
        status === "processing"
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "cancel-order-btn";


        button.textContent =
            "Cancel Order";


        button.addEventListener(
            "click",
            cancelOrder
        );


        container.appendChild(
            button
        );

    }

}


// ============================================================
// CANCEL ORDER
// ============================================================

async function cancelOrder() {

    if (!currentOrder) return;


    const status =
        normalizeStatus(
            currentOrder.data.status ||
            currentOrder.data.orderStatus ||
            "pending"
        );


    // NEVER cancel shipped/delivered
    if (
        status === "shipped" ||
        status === "delivered" ||
        status === "completed"
    ) {

        alert(
            "এই order এখন cancel করা যাবে না।"
        );

        return;

    }


    const confirmed =
        window.confirm(
            "আপনি কি এই order cancel করতে চান?"
        );


    if (!confirmed) return;


    try {

        const orderRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "orders",
                currentOrderId
            );


        await updateDoc(
            orderRef,
            {
                status: "cancelled",

                updatedAt:
                    serverTimestamp()
            }
        );


        currentOrder.data.status =
            "cancelled";


        renderOrder();


        renderProducts();


        alert(
            "Order cancelled হয়েছে।"
        );


    } catch (error) {

        console.error(
            "Cancel error:",
            error
        );


        alert(
            "Order cancel করা যায়নি।"
        );

    }

}


// ============================================================
// REVIEW STATUS
// ============================================================

async function loadReviewStatus() {

    reviewedProductIds =
        new Set();


    // --------------------------------------------------------
    // IMPORTANT:
    // Google Sheet is the source of truth.
    // --------------------------------------------------------

    if (
        !GOOGLE_SHEET_API ||
        GOOGLE_SHEET_API.includes(
            "PASTE_YOUR"
        )
    ) {

        console.warn(
            "Google Sheet API URL not configured."
        );

        return;

    }


    try {

        const url =
            GOOGLE_SHEET_API +
            "?action=getReviews" +
            "&userId=" +
            encodeURIComponent(
                currentUser.uid
            );


        const response =
            await fetch(url, {
                method: "GET",
                cache: "no-store"
            });


        if (!response.ok) {

            throw new Error(
                "Review API HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        if (
            result.success &&
            Array.isArray(result.reviews)
        ) {

            existingReviews = result.reviews;
            renderExistingReviews();

            result.reviews.forEach(review => {

                const productId =
                    String(
                        review.productId || ""
                    );


                const reviewOrderId = String(review.orderId || "");
                if (productId && reviewOrderId === String(currentOrderId)) {
                    reviewedProductIds.add(productId);
                }

            });

        }

    } catch (error) {

        console.warn(
            "Could not load Google Sheet review status:",
            error
        );

    }

}


// ============================================================
// EXISTING REVIEWS: EDIT / DELETE
// ============================================================
function renderExistingReviews() {
    const container = document.getElementById("existingReviewsList");
    if (!container) return;
    if (!existingReviews.length) {
        container.innerHTML = '<p class="existing-reviews-empty">আপনি এখনো কোনো review দেননি।</p>';
        return;
    }
    container.innerHTML = existingReviews.map(review => `
        <article class="existing-review-card">
            <div class="existing-review-top">
                <strong>${escapeHTML(review.productName || "Product")}</strong>
                <span class="review-status-pill status-${escapeAttribute(normalizeStatus(review.status))}">${escapeHTML(review.status || "pending")}</span>
            </div>
            <div class="existing-review-stars">${"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}${"☆".repeat(5-Math.max(0, Math.min(5, Number(review.rating) || 0)))}</div>
            <p>${escapeHTML(review.reviewText || "")}</p>
            ${[review.image1, review.image2, review.image3].filter(Boolean).length ? `
                <div class="existing-review-images">
                    ${[review.image1, review.image2, review.image3].filter(Boolean).map((url, index) => `
                        <a class="existing-review-image-link" href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" aria-label="Open review photo ${index + 1}">
                            <img class="existing-review-image" src="${escapeAttribute(url)}" alt="Review photo ${index + 1}" loading="lazy" onerror="this.closest('a').style.display='none'">
                        </a>
                    `).join("")}
                </div>
            ` : ""}
            <div class="existing-review-actions">
                <button type="button" class="edit-existing-review" data-edit-review="${escapeAttribute(review.reviewId)}">Edit</button>
                <button type="button" class="delete-existing-review" data-delete-review="${escapeAttribute(review.reviewId)}">Delete</button>
            </div>
        </article>
    `).join("");
    container.querySelectorAll("[data-edit-review]").forEach(button => {
        button.addEventListener("click", () => {
            const review = existingReviews.find(item => item.reviewId === button.dataset.editReview);
            if (!review) return;
            const productId = String(review.productId || "");
            openReviewModal([productId]);
            const form = document.querySelector(`.review-product-form[data-product-id="${CSS.escape(productId)}"]`);
            if (!form) return;
            form.dataset.reviewId = review.reviewId;
            form.dataset.existingImage1 = review.image1 || "";
            form.dataset.existingImage2 = review.image2 || "";
            form.dataset.existingImage3 = review.image3 || "";
            form.querySelector(".star-rating").dataset.rating = String(review.rating || 0);
            form.querySelectorAll(".star-btn").forEach(star => {
                star.classList.toggle("active", Number(star.dataset.star) <= Number(review.rating || 0));
            });
            form.querySelector(".review-textarea").value = review.reviewText || "";
            const preview = form.querySelector(".image-preview-list");
            [review.image1, review.image2, review.image3].filter(Boolean).forEach(url => {
                const item = document.createElement("div");
                item.className = "image-preview";
                item.innerHTML = `<img src="${escapeAttribute(url)}" alt="Existing review photo"><span>Existing photo</span>`;
                preview.appendChild(item);
            });
            document.getElementById("reviewModalTitle").textContent = "Edit Review";
            document.getElementById("submitReviewsBtn").textContent = "Save Changes";
        });
    });
    container.querySelectorAll("[data-delete-review]").forEach(button => {
        button.addEventListener("click", async () => {
            const review = existingReviews.find(item => item.reviewId === button.dataset.deleteReview);
            if (!review || !confirm("এই review delete করতে চান?")) return;
            button.disabled = true;
            try {
                await postReviewAction({action:"deleteReview", reviewId:review.reviewId, userId:currentUser.uid});
                existingReviews = existingReviews.filter(item => item.reviewId !== review.reviewId);
                reviewedProductIds.delete(String(review.productId || ""));
                renderExistingReviews();
                renderProducts();
            } catch (error) {
                alert(error.message || "Review delete করা যায়নি।");
                button.disabled = false;
            }
        });
    });
}

async function postReviewAction(payload) {
    const response = await fetch(GOOGLE_SHEET_API, {
        method: "POST",
        headers: {"Content-Type":"text/plain;charset=utf-8"},
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Google Sheet request failed.");
    const result = await response.json();
    if (!result || result.success !== true) throw new Error(result?.message || "Request failed.");
    return result;
}

// ============================================================
// RENDER PRODUCTS
// ============================================================

function renderProducts() {

    const container =
        document.getElementById(
            "productsList"
        );


    container.innerHTML = "";


    if (
        orderItems.length === 0
    ) {

        container.innerHTML = `
            <div class="order-error">
                <div class="error-icon">📦</div>
                <h2>No products found</h2>
            </div>
        `;

        return;

    }


    orderItems.forEach(
        (item, index) => {

            const productId =
                getProductId(
                    item,
                    index
                );


            const reviewed =
                reviewedProductIds.has(
                    productId
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "product-card";


            const image =
                getProductImage(item);


            const name =
                getProductName(item);


            const quantity =
                getQuantity(item);


            const price =
                getPrice(item);


            card.innerHTML = `

                ${
                    !reviewed
                        ? `
                            <input
                                type="checkbox"
                                class="product-select"
                                data-product-id="${escapeAttribute(productId)}"
                                aria-label="Select ${escapeAttribute(name)}"
                            >
                        `
                        : `
                            <div
                                class="product-select-placeholder"
                            ></div>
                        `
                }


                <div class="product-image">

                    ${
                        image
                            ? `
                                <img
                                    src="${escapeAttribute(image)}"
                                    alt="${escapeAttribute(name)}"
                                    loading="lazy"
                                >
                            `
                            : `
                                <div class="product-no-image">
                                    📦
                                </div>
                            `
                    }

                </div>


                <div class="product-info">

                    <h3 class="product-name">
                        ${escapeHTML(name)}
                    </h3>


                    <div class="product-meta">

                        <span>
                            Qty: ${quantity}
                        </span>

                        ${
                            item.size
                                ? `
                                    <span>
                                        Size: ${escapeHTML(item.size)}
                                    </span>
                                `
                                : ""
                        }

                        ${
                            item.color
                                ? `
                                    <span>
                                        Color: ${escapeHTML(item.color)}
                                    </span>
                                `
                                : ""
                        }

                    </div>


                    <div class="product-price">
                        ${formatMoney(price * quantity)}
                    </div>

                </div>


                <div class="product-review-status">

                    ${
                        reviewed
                            ? `
                                <span class="reviewed-badge ${normalizeStatus((existingReviews.find(r => String(r.productId || "") === productId && String(r.orderId || "") === String(currentOrderId)) || {}).status) === "pending" ? "review-pending" : "review-submitted"}">
                                    ✓ Review submitted
                                </span>
                            `
                            : `
                                <span class="not-reviewed-text">
                                    Not reviewed
                                </span>

                                <br>

                                <button
                                    type="button"
                                    class="review-product-btn"
                                    data-review-product="${escapeAttribute(productId)}"
                                >
                                    Review
                                </button>
                            `
                    }

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );


    bindProductEvents();


    updateSelectedButton();

}


// ============================================================
// PRODUCT EVENTS
// ============================================================

function bindProductEvents() {

    document
        .querySelectorAll(
            ".product-select"
        )
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                updateSelectedButton
            );

        });


    document
        .querySelectorAll(
            "[data-review-product]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const productId =
                        button.dataset.reviewProduct;


                    openReviewModal(
                        [productId]
                    );

                }
            );

        });

}


// ============================================================
// UPDATE SELECTED BUTTON
// ============================================================

function updateSelectedButton() {

    const selected =
        getSelectedProductIds();


    const button =
        document.getElementById(
            "reviewSelectedBtn"
        );


    if (!button) return;


    if (selected.length === 0) {

        button.hidden = true;

        return;

    }


    button.hidden = false;


    button.textContent =
        `Review Selected (${selected.length})`;

}


// ============================================================
// GET SELECTED
// ============================================================

function getSelectedProductIds() {

    return Array.from(
        document.querySelectorAll(
            ".product-select:checked"
        )
    )
        .map(
            checkbox =>
                checkbox.dataset.productId
        )
        .filter(Boolean);

}


// ============================================================
// REVIEW EVENTS
// ============================================================

function setupReviewEvents() {

    const selectedButton =
        document.getElementById(
            "reviewSelectedBtn"
        );


    if (selectedButton) {

        selectedButton.addEventListener(
            "click",
            () => {

                const ids =
                    getSelectedProductIds();


                if (
                    ids.length === 0
                ) {

                    alert(
                        "আগে product select করুন।"
                    );

                    return;

                }


                openReviewModal(ids);

            }
        );

    }


    document
        .getElementById(
            "closeReviewModal"
        )
        ?.addEventListener(
            "click",
            closeReviewModal
        );


    document
        .getElementById(
            "cancelReviewBtn"
        )
        ?.addEventListener(
            "click",
            closeReviewModal
        );


    document
        .getElementById(
            "reviewOverlay"
        )
        ?.addEventListener(
            "click",
            closeReviewModal
        );


    document
        .getElementById(
            "submitReviewsBtn"
        )
        ?.addEventListener(
            "click",
            submitReviews
        );

}


// ============================================================
// OPEN REVIEW MODAL
// ============================================================

function openReviewModal(productIds) {

    document.getElementById("reviewModalTitle").textContent = "Write a Review";
    document.getElementById("submitReviewsBtn").textContent = "Submit Review";
    selectedProductIds =
        productIds;


    const formsContainer =
        document.getElementById(
            "reviewForms"
        );


    formsContainer.innerHTML = "";


    productIds.forEach(
        productId => {

            const item =
                orderItems.find(
                    (product, index) =>
                        getProductId(
                            product,
                            index
                        ) === productId
                );


            if (!item) return;


            formsContainer.appendChild(
                createReviewForm(
                    item,
                    productId
                )
            );

        }
    );


    document
        .getElementById(
            "reviewSubmitStatus"
        )
        .textContent = "";


    document
        .getElementById(
            "reviewModal"
        )
        .hidden = false;


    document.body.classList.add(
        "review-modal-open"
    );

}


// ============================================================
// CREATE REVIEW FORM
// ============================================================

function createReviewForm(
    item,
    productId
) {

    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "review-product-form";


    wrapper.dataset.productId =
        productId;


    const image =
        getProductImage(item);


    const name =
        getProductName(item);


    wrapper.innerHTML = `

        <div class="review-product-form-header">

            <div class="review-form-image">

                ${
                    image
                        ? `
                            <img
                                src="${escapeAttribute(image)}"
                                alt="${escapeAttribute(name)}"
                            >
                        `
                        : ""
                }

            </div>


            <h3 class="review-form-product-name">
                ${escapeHTML(name)}
            </h3>

        </div>


        <label class="rating-label">
            Rating
        </label>


        <div
            class="star-rating"
            data-rating="0"
        >

            ${[1,2,3,4,5]
                .map(number => `
                    <button
                        type="button"
                        class="star-btn"
                        data-star="${number}"
                    >
                        ★
                    </button>
                `)
                .join("")
            }

        </div>


        <label class="review-text-label">
            Review
        </label>


        <textarea
            class="review-textarea"
            maxlength="1000"
            placeholder="Write your review..."
        ></textarea>


        <label class="review-images-label">
            Photos
        </label>


        <input
            type="file"
            class="review-image-input"
            accept="image/jpeg,image/png,image/webp"
            multiple
        >


        <div class="review-image-help">
            Maximum 3 photos. Images will be compressed before upload.
        </div>


        <div class="image-preview-list"></div>

    `;


    // Stars
    wrapper
        .querySelectorAll(
            ".star-btn"
        )
        .forEach(star => {

            star.addEventListener(
                "click",
                () => {

                    const rating =
                        Number(
                            star.dataset.star
                        );


                    const ratingBox =
                        wrapper.querySelector(
                            ".star-rating"
                        );


                    ratingBox.dataset.rating =
                        rating;


                    wrapper
                        .querySelectorAll(
                            ".star-btn"
                        )
                        .forEach(button => {

                            const value =
                                Number(
                                    button.dataset.star
                                );


                            button.classList.toggle(
                                "active",
                                value <= rating
                            );

                        });

                }
            );

        });


    // Image input
    wrapper
        .querySelector(
            ".review-image-input"
        )
        .addEventListener(
            "change",
            () => {

                handleImageSelection(
                    wrapper
                );

            }
        );


    return wrapper;

}


// ============================================================
// IMAGE SELECTION
// ============================================================

function handleImageSelection(
    form
) {

    const input =
        form.querySelector(
            ".review-image-input"
        );


    const preview =
        form.querySelector(
            ".image-preview-list"
        );


    let files =
        Array.from(
            input.files || []
        );


    if (
        files.length > MAX_REVIEW_IMAGES
    ) {

        files =
            files.slice(
                0,
                MAX_REVIEW_IMAGES
            );


        alert(
            "Maximum 3 images allowed."
        );

    }


    // Replace input files with max 3
    const dataTransfer =
        new DataTransfer();


    files.forEach(
        file =>
            dataTransfer.items.add(file)
    );


    input.files =
        dataTransfer.files;


    preview.innerHTML = "";


    files.forEach(
        file => {

            const url =
                URL.createObjectURL(
                    file
                );


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "image-preview";


            item.innerHTML = `

                <img
                    src="${url}"
                    alt="Preview"
                >

                <span>
                    ${(file.size / 1024).toFixed(0)} KB
                </span>

            `;


            preview.appendChild(
                item
            );

        }
    );

}


// ============================================================
// CLOSE REVIEW MODAL
// ============================================================

function closeReviewModal() {

    document
        .getElementById(
            "reviewModal"
        )
        .hidden = true;


    document.body.classList.remove(
        "review-modal-open"
    );


    selectedProductIds = [];

}


// ============================================================
// SUBMIT REVIEWS
// ============================================================

async function submitReviews() {

    const forms =
        Array.from(
            document.querySelectorAll(
                ".review-product-form"
            )
        );


    if (
        forms.length === 0
    ) {

        return;

    }


    const submitButton =
        document.getElementById(
            "submitReviewsBtn"
        );


    const statusBox =
        document.getElementById(
            "reviewSubmitStatus"
        );


    // --------------------------------------------------------
    // Validate
    // --------------------------------------------------------

    const reviewData = [];


    for (const form of forms) {

        const productId =
            form.dataset.productId;


        const item =
            orderItems.find(
                (product, index) =>
                    getProductId(
                        product,
                        index
                    ) === productId
            );


        if (!item) continue;


        const rating =
            Number(
                form
                    .querySelector(
                        ".star-rating"
                    )
                    .dataset.rating
            );


        const reviewText =
            form
                .querySelector(
                    ".review-textarea"
                )
                .value
                .trim();


        if (
            !rating ||
            rating < 1 ||
            rating > 5
        ) {

            statusBox.className =
                "review-submit-status error";


            statusBox.textContent =
                `Rating দিন: ${getProductName(item)}`;


            return;

        }


        if (!reviewText) {

            statusBox.className =
                "review-submit-status error";


            statusBox.textContent =
                `Review লিখুন: ${getProductName(item)}`;


            return;

        }


        const input =
            form.querySelector(
                ".review-image-input"
            );


        const files =
            Array.from(
                input.files || []
            ).slice(
                0,
                MAX_REVIEW_IMAGES
            );


        reviewData.push({

            form,

            item,

            productId,

            rating,

            reviewText,

            files,
            reviewId: form.dataset.reviewId || "",
            existingImages: [
                form.dataset.existingImage1 || "",
                form.dataset.existingImage2 || "",
                form.dataset.existingImage3 || ""
            ]

        });

    }


    if (
        reviewData.length === 0
    ) {

        return;

    }


    submitButton.disabled =
        true;


    statusBox.className =
        "review-submit-status";


    try {

        for (
            let i = 0;
            i < reviewData.length;
            i++
        ) {

            const data =
                reviewData[i];


            statusBox.textContent =
                `Review ${i + 1}/${reviewData.length} save হচ্ছে...`;


            const imageUrls = data.files.length
                ? await uploadReviewImages(data.files)
                : data.existingImages.filter(Boolean);


            await saveReviewToGoogleSheet({

                item:
                    data.item,

                productId:
                    data.productId,

                rating:
                    data.rating,

                reviewText:
                    data.reviewText,

                imageUrls,
                reviewId: data.reviewId

            });

        }


        statusBox.className =
            "review-submit-status success";


        statusBox.textContent =
            "Review successfully submitted.";


        // Update local state
        reviewData.forEach(
            data => {

                reviewedProductIds.add(
                    data.productId
                );

            }
        );


        await loadReviewStatus();
        renderExistingReviews();
        renderProducts();


        setTimeout(
            closeReviewModal,
            900
        );


    } catch (error) {

        console.error(
            "Review submit error:",
            error
        );


        statusBox.className =
            "review-submit-status error";


        statusBox.textContent =
            error.message ||
            "Review submit করা যায়নি।";

    } finally {

        submitButton.disabled =
            false;

    }

}


// ============================================================
// CLOUDINARY UPLOAD
// ============================================================

async function uploadReviewImages(
    files
) {

    const urls = [];


    for (const file of files) {

        const compressed =
            await compressImage(
                file,
                TARGET_IMAGE_BYTES
            );


        const formData =
            new FormData();


        formData.append(
            "file",
            compressed,
            createUploadFileName(file)
        );


        formData.append(
            "upload_preset",
            CLOUDINARY_UPLOAD_PRESET
        );


        const endpoint =
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;


        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            !result.secure_url
        ) {

            throw new Error(
                result?.error?.message ||
                "Cloudinary image upload failed."
            );

        }


        urls.push(
            result.secure_url
        );

    }


    return urls;

}


// ============================================================
// IMAGE COMPRESSION
// ============================================================

async function compressImage(
    file,
    targetBytes
) {

    const bitmap =
        await createImageBitmap(
            file
        );


    // Initial dimensions
    let width =
        bitmap.width;


    let height =
        bitmap.height;


    const MAX_DIMENSION =
        1100;


    if (
        width > MAX_DIMENSION ||
        height > MAX_DIMENSION
    ) {

        const ratio =
            Math.min(
                MAX_DIMENSION / width,
                MAX_DIMENSION / height
            );


        width =
            Math.round(
                width * ratio
            );


        height =
            Math.round(
                height * ratio
            );

    }


    let quality = 0.82;


    let blob =
        await canvasToBlob(
            bitmap,
            width,
            height,
            quality
        );


    // Reduce quality until near target
    for (
        let i = 0;
        i < 8;
        i++
    ) {

        if (
            blob.size <= targetBytes
        ) {

            break;

        }


        quality -= 0.08;


        if (
            quality < 0.35
        ) {

            quality = 0.35;

        }


        blob =
            await canvasToBlob(
                bitmap,
                width,
                height,
                quality
            );

    }


    // Still too large: reduce dimensions
    let attempts = 0;


    while (
        blob.size > targetBytes &&
        attempts < 5
    ) {

        width =
            Math.round(
                width * 0.85
            );


        height =
            Math.round(
                height * 0.85
            );


        blob =
            await canvasToBlob(
                bitmap,
                width,
                height,
                0.5
            );


        attempts++;

    }


    bitmap.close();


    return blob;

}


// ============================================================
// CANVAS TO BLOB
// ============================================================

function canvasToBlob(
    bitmap,
    width,
    height,
    quality
) {

    return new Promise(
        resolve => {

            const canvas =
                document.createElement(
                    "canvas"
                );


            canvas.width =
                width;


            canvas.height =
                height;


            const context =
                canvas.getContext(
                    "2d",
                    {
                        alpha: false
                    }
                );


            context.drawImage(
                bitmap,
                0,
                0,
                width,
                height
            );


            canvas.toBlob(
                blob => {

                    resolve(
                        blob
                    );

                },
                "image/jpeg",
                quality
            );

        }
    );

}


// ============================================================
// UPLOAD FILE NAME
// ============================================================

function createUploadFileName(
    file
) {

    const extension =
        "jpg";


    return (
        "review_" +
        Date.now() +
        "_" +
        Math.random()
            .toString(36)
            .slice(2) +
        "." +
        extension
    );

}


// ============================================================
// SAVE TO GOOGLE SHEET
// ============================================================

async function saveReviewToGoogleSheet(
    data
) {

    if (
        !GOOGLE_SHEET_API ||
        GOOGLE_SHEET_API.includes(
            "PASTE_YOUR"
        )
    ) {

        throw new Error(
            "Google Sheet API URL এখনো set করা হয়নি।"
        );

    }


    const reviewId =
        data.reviewId || createReviewId();


    const image1 =
        data.imageUrls[0] || "";


    const image2 =
        data.imageUrls[1] || "";


    const image3 =
        data.imageUrls[2] || "";


    const userName =
        getOrderUserName();


    const payload = {

        action:
            data.reviewId ? "editReview" : "saveReview",

        reviewId,

        orderId:
            currentOrderId,

        productId:
            data.productId,

        productName:
            getProductName(
                data.item
            ),

        userId:
            currentUser.uid,

        userName,

        rating:
            data.rating,

        reviewText:
            data.reviewText,

        image1,

        image2,

        image3,

        status:
            "pending"

    };


    const response =
        await fetch(
            GOOGLE_SHEET_API,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    if (!response.ok) {

        throw new Error(
            "Google Sheet request failed."
        );

    }


    let result = null;


    try {

        result =
            await response.json();

    } catch {

        // Some Apps Script deployments
        // return non-JSON text.

    }


    if (
        result &&
        result.success === false
    ) {

        throw new Error(
            result.message ||
            "Google Sheet rejected review."
        );

    }


    return true;

}


// ============================================================
// USER NAME
// ============================================================

function getOrderUserName() {

    const data =
        currentOrder?.data || {};


    return (
        data.customer?.name ||
        data.customer?.fullName ||
        data.userName ||
        data.name ||
        currentUser.displayName ||
        "Customer"
    );

}


// ============================================================
// REVIEW ID
// ============================================================

function createReviewId() {

    return (
        "REV-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .slice(2, 8)
            .toUpperCase()
    );

}


// ============================================================
// PRODUCT ID
// ============================================================

function getProductId(
    item,
    index
) {

    return String(
        item?.productId ||
        item?.id ||
        item?.sku ||
        `product-${index}`
    );

}


// ============================================================
// PRODUCT NAME
// ============================================================

function getProductName(item) {

    return (
        item?.name ||
        item?.productName ||
        item?.title ||
        "Product"
    );

}


// ============================================================
// PRODUCT IMAGE
// ============================================================

function getProductImage(item) {

    if (!item) return "";


    const direct = [

        item.image,

        item.imageUrl,

        item.thumbnail,

        item.thumbnailUrl,

        item.productImage

    ];


    for (const image of direct) {

        if (
            typeof image === "string" &&
            image.trim()
        ) {

            return image.trim();

        }

    }


    if (
        Array.isArray(
            item.images
        )
    ) {

        for (
            const image of item.images
        ) {

            if (
                typeof image === "string" &&
                image.trim()
            ) {

                return image.trim();

            }


            if (
                image &&
                typeof image === "object"
            ) {

                const url =
                    image.url ||
                    image.src ||
                    image.image ||
                    image.imageUrl;


                if (
                    typeof url === "string" &&
                    url.trim()
                ) {

                    return url.trim();

                }

            }

        }

    }


    return "";

}


// ============================================================
// PRICE
// ============================================================

function getPrice(item) {

    const values = [

        item?.salePrice,

        item?.discountPrice,

        item?.price,

        item?.unitPrice,

        item?.productPrice

    ];


    for (const value of values) {

        const number =
            Number(value);


        if (
            Number.isFinite(number)
        ) {

            return number;

        }

    }


    return 0;

}


// ============================================================
// QUANTITY
// ============================================================

function getQuantity(item) {

    const quantity =
        Number(
            item?.quantity ??
            item?.qty ??
            item?.count ??
            1
        );


    return (
        Number.isFinite(quantity) &&
        quantity > 0
    )
        ? quantity
        : 1;

}


// ============================================================
// STATUS
// ============================================================

function normalizeStatus(
    status
) {

    return String(
        status || "pending"
    )
        .toLowerCase()
        .trim()
        .replace(
            /\s+/g,
            "-"
        );

}


// ============================================================
// CAPITALIZE
// ============================================================

function capitalize(value) {

    if (!value) return "";

    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

}


// ============================================================
// DATE
// ============================================================

function formatDate(value) {

    if (!value) return "";


    let date;


    if (
        value &&
        typeof value.toDate === "function"
    ) {

        date =
            value.toDate();

    } else {

        date =
            new Date(value);

    }


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleDateString(
        "en-BD",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// ============================================================
// MONEY
// ============================================================

function formatMoney(value) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return "৳0";

    }


    return (
        "৳" +
        number.toLocaleString(
            "en-BD",
            {
                maximumFractionDigits: 2
            }
        )
    );

}


// ============================================================
// SET TEXT
// ============================================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value ?? "";

    }

}


// ============================================================
// LOADING
// ============================================================

function showLoading(
    show
) {

    const loading =
        document.getElementById(
            "orderLoading"
        );


    if (!loading) return;


    loading.hidden =
        !show;

}


// ============================================================
// ERROR
// ============================================================

function showError(
    message
) {

    showLoading(false);


    const error =
        document.getElementById(
            "orderError"
        );


    const text =
        document.getElementById(
            "orderErrorText"
        );


    if (text) {

        text.textContent =
            message;

    }


    if (error) {

        error.hidden =
            false;

    }


    const content =
        document.getElementById(
            "orderContent"
        );


    if (content) {

        content.hidden =
            true;

    }

}


// ============================================================
// ESCAPE
// ============================================================

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


function escapeAttribute(value) {

    return escapeHTML(value);

}