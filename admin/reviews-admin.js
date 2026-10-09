/* ============================================================
   NISHAT FASHION — ADMIN REVIEW MANAGEMENT
   File: admin/reviews-admin.js

   Features:
   - Google Apps Script JSON API
   - Product image/name from ../shop/products.js
   - Search and status filter
   - Pending / Approved / Rejected
   - Review image previews
   - Refresh and logout
============================================================ */

import { requireAdmin } from "./admin-auth.js";
import { getProducts } from "../shop/products.js";

// ============================================================
// CONFIG
// ============================================================

const REVIEW_API =
    "https://script.google.com/macros/s/AKfycbxjlt6CD52Nql27PFNb9QFTWO_tT0m--fYw4yTC8b5evGC8hi0WFqgrezCWY95oOmP9/exec";

// ============================================================
// AUTH
// ============================================================

const adminUser = await requireAdmin();

if (!adminUser) {
    throw new Error("Unauthorized");
}

// ============================================================
// DOM
// ============================================================

const $ = id => document.getElementById(id);

const adminEmail = $("adminEmail");
const reviewsList = $("reviewsList");
const searchInput = $("searchInput");
const statusFilter = $("statusFilter");
const refreshBtn = $("refreshBtn");
const logoutBtn = $("logoutBtn");
const message = $("message");

const totalCount = $("totalCount");
const pendingCount = $("pendingCount");
const approvedCount = $("approvedCount");
const rejectedCount = $("rejectedCount");

const pageLoading = $("pageLoading");
const loadingText = $("loadingText");

if (adminEmail) {
    adminEmail.textContent = adminUser.email || "Admin";
}

// ============================================================
// STATE
// ============================================================

let reviews = [];
let productsById = new Map();
let loading = false;

// ============================================================
// HELPERS
// ============================================================

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function safeImageURL(value) {
    const url = String(value || "").trim();

    if (!url) return "";

    try {
        const parsed = new URL(url);

        if (
            parsed.protocol !== "https:" &&
            parsed.protocol !== "http:"
        ) {
            return "";
        }

        return parsed.href;
    } catch {
        return "";
    }
}

function normalizeStatus(value) {
    const status = String(value || "pending")
        .trim()
        .toLowerCase();

    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";

    return "pending";
}

function parseDate(value) {
    if (!value) return 0;

    const time = new Date(value).getTime();

    return Number.isFinite(time) ? time : 0;
}

function formatDate(value) {
    const time = parseDate(value);

    if (!time) return "—";

    return new Date(time).toLocaleString("en-BD", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function showMessage(text, type = "") {
    if (!message) return;

    message.textContent = text || "";
    message.className = `message ${type}`;
}

function showPageLoading(text = "Processing...") {
    if (loadingText) {
        loadingText.textContent = text;
    }

    pageLoading?.classList.remove("hidden");
}

function hidePageLoading() {
    pageLoading?.classList.add("hidden");
}

// ============================================================
// LOAD PRODUCT CATALOG
// Uses the existing shop cache where available.
// ============================================================

async function loadProductCatalog() {
    try {
        const products = await getProducts();

        productsById = new Map();

        for (const product of products || []) {
            if (!product?.id) continue;

            productsById.set(
                String(product.id),
                {
                    id: String(product.id),
                    name: String(product.name || ""),
                    thumbnail: safeImageURL(product.thumbnail)
                }
            );
        }

        console.log(
            `Review admin: ${productsById.size} shop products loaded.`
        );

    } catch (error) {
        console.error("Product catalog error:", error);

        // Reviews can still be shown using the Google Sheet data.
        productsById = new Map();
    }
}

// ============================================================
// NORMALIZE REVIEW
// Apps Script returns camelCase fields.
// ============================================================

function normalizeReview(item) {
    const productId = String(
        item.productId ?? item.productid ?? ""
    ).trim();

    const catalogProduct = productsById.get(productId);

    return {
        reviewid: String(
            item.reviewId ?? item.reviewid ?? ""
        ).trim(),

        orderid: String(
            item.orderId ?? item.orderid ?? ""
        ).trim(),

        productid: productId,

        // Prefer current catalog data.
        // Fall back to the name saved in Google Sheets.
        productname: String(
            catalogProduct?.name ||
            item.productName ||
            item.productname ||
            ""
        ).trim(),

        // The image comes from shop/products.js.
        productimage: catalogProduct?.thumbnail || "",

        userid: String(
            item.userId ?? item.userid ?? ""
        ).trim(),

        name: String(
            item.userName ??
            item.name ??
            item.customerName ??
            ""
        ).trim(),

        rating: Math.max(
            0,
            Math.min(5, Number(item.rating) || 0)
        ),

        review: String(
            item.reviewText ??
            item.review ??
            item.comment ??
            ""
        ).trim(),

        image1: safeImageURL(item.image1),
        image2: safeImageURL(item.image2),
        image3: safeImageURL(item.image3),

        status: normalizeStatus(item.status),

        createdat: item.createdAt ?? item.createdat ?? "",
        updatedat: item.updatedAt ?? item.updatedat ?? ""
    };
}

// ============================================================
// LOAD REVIEWS
// ============================================================

async function loadReviews() {
    if (loading) return;

    loading = true;

    if (refreshBtn) {
        refreshBtn.disabled = true;
    }

    showMessage("Loading reviews...", "info");

    if (reviewsList) {
        reviewsList.innerHTML = `
            <div class="loading-card">
                <span class="spinner"></span>
                <span>Loading reviews...</span>
            </div>
        `;
    }

    try {
        // Load catalog first so every review can resolve its product.
        await loadProductCatalog();

        const url = new URL(REVIEW_API);

        url.searchParams.set("action", "getReviews");
        url.searchParams.set("_", String(Date.now()));

        const response = await fetch(url.toString(), {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(
                `Review API HTTP ${response.status}`
            );
        }

        const data = await response.json();

        if (!data || data.success !== true) {
            throw new Error(
                data?.message || "Google Sheet API failed."
            );
        }

        if (!Array.isArray(data.reviews)) {
            throw new Error(
                "API response does not contain a reviews array."
            );
        }

        reviews = data.reviews
            .map(normalizeReview)
            .filter(review => review.reviewid);

        reviews.sort(
            (a, b) =>
                parseDate(b.createdat) -
                parseDate(a.createdat)
        );

        render();

        showMessage(
            `${reviews.length} review(s) loaded.`,
            "success"
        );

    } catch (error) {
        console.error("Review load error:", error);

        reviews = [];
        render();

        showMessage(
            error.message || "Could not load reviews.",
            "error"
        );

        if (reviewsList) {
            reviewsList.innerHTML = `
                <div class="empty">
                    Unable to load reviews.
                    Check the Apps Script deployment and API response.
                </div>
            `;
        }

    } finally {
        loading = false;

        if (refreshBtn) {
            refreshBtn.disabled = false;
        }

        hidePageLoading();
    }
}

// ============================================================
// PRODUCT DISPLAY
// ============================================================

function createProductHTML(review) {
    const productName = review.productname || "Product name unavailable";
    const productId = review.productid || "—";
    const image = safeImageURL(review.productimage);

    const imageHTML = image
        ? `
            <img
                class="review-product-image"
                src="${escapeHTML(image)}"
                alt="${escapeHTML(productName)}"
                loading="lazy"
                onerror="this.style.display='none'"
            >
        `
        : `
            <div class="review-product-placeholder">
                No image
            </div>
        `;

    return `
        <div class="review-product">
            ${imageHTML}

            <div class="review-product-info">
                <strong>${escapeHTML(productName)}</strong>
                <span>Product ID: ${escapeHTML(productId)}</span>
            </div>
        </div>
    `;
}

// ============================================================
// RENDER
// ============================================================

function render() {
    if (!reviewsList) return;

    const search = String(searchInput?.value || "")
        .trim()
        .toLowerCase();

    const selectedStatus = statusFilter?.value || "all";

    if (totalCount) {
        totalCount.textContent = reviews.length;
    }

    if (pendingCount) {
        pendingCount.textContent = reviews.filter(
            review => review.status === "pending"
        ).length;
    }

    if (approvedCount) {
        approvedCount.textContent = reviews.filter(
            review => review.status === "approved"
        ).length;
    }

    if (rejectedCount) {
        rejectedCount.textContent = reviews.filter(
            review => review.status === "rejected"
        ).length;
    }

    const filtered = reviews.filter(review => {
        const text = [
            review.name,
            review.productname,
            review.productid,
            review.review,
            review.userid,
            review.orderid,
            review.reviewid
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const matchesSearch =
            !search || text.includes(search);

        const matchesStatus =
            selectedStatus === "all" ||
            review.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    if (!filtered.length) {
        reviewsList.innerHTML = `
            <div class="empty">No reviews found.</div>
        `;

        return;
    }

    reviewsList.innerHTML = filtered
        .map(createReviewCard)
        .join("");
}

// ============================================================
// REVIEW CARD
// ============================================================

function createReviewCard(review) {
    const status = normalizeStatus(review.status);

    const stars =
        "★".repeat(review.rating) +
        "☆".repeat(5 - review.rating);

    const customerName = review.name || "Customer";

    const reviewImages = [
        review.image1,
        review.image2,
        review.image3
    ].filter(Boolean);

    const imagesHTML = reviewImages.length
        ? `
            <div class="review-images">
                ${reviewImages.map((image, index) => `
                    <a
                        class="review-image"
                        href="${escapeHTML(image)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open review image ${index + 1}"
                    >
                        <img
                            src="${escapeHTML(image)}"
                            alt="Review image ${index + 1}"
                            loading="lazy"
                        >
                    </a>
                `).join("")}
            </div>
        `
        : "";

    const reviewId = escapeHTML(review.reviewid);

    return `
        <article class="review-card">

            <div class="review-head">
                <div>
                    <div class="customer-name">
                        ${escapeHTML(customerName)}
                    </div>

                    <div class="review-meta">
                        ${escapeHTML(formatDate(review.createdat))}
                    </div>
                </div>

                <span class="status ${status}">
                    ${escapeHTML(status)}
                </span>
            </div>

            <div class="review-product-section">
                <div class="review-section-label">
                    Reviewed product
                </div>

                ${createProductHTML(review)}
            </div>

            <div class="review-stars">${stars}</div>

            <p class="review-text">
                ${escapeHTML(review.review || "No review text")}
            </p>

            ${imagesHTML}

            <div class="review-details">
                <div class="detail-item">
                    <span>Order ID</span>
                    <strong>${escapeHTML(review.orderid || "—")}</strong>
                </div>

                <div class="detail-item">
                    <span>User ID</span>
                    <strong>${escapeHTML(review.userid || "—")}</strong>
                </div>

                <div class="detail-item">
                    <span>Review ID</span>
                    <strong>${reviewId}</strong>
                </div>
            </div>

            <div class="review-control">
                <label for="status-${reviewId}">Review status</label>

                <select
                    id="status-${reviewId}"
                    class="review-status-select ${status}"
                    data-review-id="${reviewId}"
                    data-current-status="${status}"
                >
                    <option value="pending"
                        ${status === "pending" ? "selected" : ""}>
                        Pending
                    </option>

                    <option value="approved"
                        ${status === "approved" ? "selected" : ""}>
                        Approved
                    </option>

                    <option value="rejected"
                        ${status === "rejected" ? "selected" : ""}>
                        Rejected
                    </option>
                </select>
            </div>

        </article>
    `;
}

// ============================================================
// UPDATE REVIEW STATUS
// ============================================================

async function changeReviewStatus(reviewId, newStatus, select) {
    const review = reviews.find(
        item => item.reviewid === String(reviewId)
    );

    if (!review) {
        showMessage("Review not found.", "error");
        return;
    }

    const oldStatus = review.status;
    newStatus = normalizeStatus(newStatus);

    if (oldStatus === newStatus) return;

    const confirmation = {
        approved: "Approve this review?",
        rejected: "Reject this review?",
        pending: "Move this review back to pending?"
    };

    if (!window.confirm(confirmation[newStatus])) {
        select.value = oldStatus;
        return;
    }

    select.disabled = true;
    showPageLoading("Updating review status...");

    try {
        // Keep no-cors because this Apps Script endpoint may not
        // expose CORS headers. This request cannot confirm success.
        await fetch(REVIEW_API, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "updateReviewStatus",
                reviewId: String(reviewId),
                status: newStatus
            })
        });

        // Re-fetch the source of truth instead of claiming success.
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Load fresh API data and re-render the card.
        // If the Apps Script write failed, the old status will return.
        await reloadAfterStatusChange();

        const updated = reviews.find(
            item => item.reviewid === String(reviewId)
        );

        if (updated?.status === newStatus) {
            showMessage(
                `Review status verified: ${newStatus}.`,
                "success"
            );
        } else {
            showMessage(
                "Could not verify the new status. Check Apps Script permissions and execution logs.",
                "error"
            );
        }

    } catch (error) {
        console.error("Review status error:", error);

        showMessage(
            error.message || "Could not update review status.",
            "error"
        );

    } finally {
        hidePageLoading();

        // Re-render creates a new select element.
        render();
    }
}

async function reloadAfterStatusChange() {
    const url = new URL(REVIEW_API);

    url.searchParams.set("action", "getReviews");
    url.searchParams.set("_", String(Date.now()));

    const response = await fetch(url.toString(), {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Review API HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data?.success || !Array.isArray(data.reviews)) {
        throw new Error(data?.message || "Could not verify status.");
    }

    reviews = data.reviews
        .map(normalizeReview)
        .filter(review => review.reviewid);

    reviews.sort(
        (a, b) => parseDate(b.createdat) - parseDate(a.createdat)
    );

    render();
}

// ============================================================
// STATUS EVENTS
// ============================================================

reviewsList?.addEventListener("change", event => {
    const select = event.target.closest(
        ".review-status-select"
    );

    if (!select) return;

    const oldStatus = select.dataset.currentStatus;
    const newStatus = select.value;

    select.classList.remove("pending", "approved", "rejected");
    select.classList.add(newStatus);

    // Immediately disable to prevent duplicate submissions.
    select.disabled = true;

    changeReviewStatus(
        select.dataset.reviewId,
        newStatus,
        select
    ).catch(error => {
        console.error(error);

        select.value = oldStatus;
        select.disabled = false;
    });
});

// ============================================================
// SEARCH AND FILTER
// ============================================================

searchInput?.addEventListener("input", render);
statusFilter?.addEventListener("change", render);

// ============================================================
// REFRESH
// ============================================================

refreshBtn?.addEventListener("click", async () => {
    showPageLoading("Refreshing reviews...");

    try {
        await loadReviews();
    } finally {
        hidePageLoading();
    }
});

// ============================================================
// LOGOUT
// ============================================================

logoutBtn?.addEventListener("click", async () => {
    if (!window.confirm("Logout from admin panel?")) {
        return;
    }

    showPageLoading("Logging out...");

    try {
        const { signOut } = await import(
            "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
        );

        const { auth } = await import("../js/firebase.js");

        await signOut(auth);

        window.location.replace("admin-login.html");

    } catch (error) {
        console.error("Logout error:", error);

        showMessage(
            error.message || "Logout failed.",
            "error"
        );

    } finally {
        hidePageLoading();
    }
});

// ============================================================
// INITIAL LOAD
// ============================================================

await loadReviews();