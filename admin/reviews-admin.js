/* =========================================================
   NISHAT FASHION
   ADMIN REVIEW MANAGEMENT

   Actions:
   - Approve
   - Reject
   - Delete
========================================================= */


import {
    requireAdmin
} from "./admin-auth.js";


/* =========================================================
   ADMIN CHECK
========================================================= */

const adminUser =
    await requireAdmin();


if (!adminUser) {

    throw new Error(
        "Unauthorized"
    );

}


/* =========================================================
   CONFIG
========================================================= */

const REVIEW_SHEET_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRDJu6DuknIKhaKFVGi5evJzcmzLtRfb8wqavhWQS00Zy7xt1fsb4nkRoIcTmfeyAvm_CniQskQ-hY9/pub?gid=0&single=true&output=csv";


const REVIEW_WRITE_URL =
    "https://script.google.com/macros/s/AKfycbzvKVkAIgO_CAjQwpaBCoTBKjx_p_I0Q1EJLmJsZQlQMv5xpx9mv8AkWMrN4cvkIJdk/exec";


/* =========================================================
   ELEMENTS
========================================================= */

const reviewsList =
    document.querySelector(
        "#reviewsList"
    );


const searchInput =
    document.querySelector(
        "#searchInput"
    );


const statusFilter =
    document.querySelector(
        "#statusFilter"
    );


const refreshBtn =
    document.querySelector(
        "#refreshBtn"
    );


const message =
    document.querySelector(
        "#message"
    );


const totalCount =
    document.querySelector(
        "#totalCount"
    );


const pendingCount =
    document.querySelector(
        "#pendingCount"
    );


const approvedCount =
    document.querySelector(
        "#approvedCount"
    );


const rejectedCount =
    document.querySelector(
        "#rejectedCount"
    );


/* =========================================================
   STATE
========================================================= */

let reviews = [];

let loading =
    false;


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

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


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    text,
    type = ""
) {

    message.textContent =
        text || "";

    message.className =
        `message ${type}`;

}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(
    csv
) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes =
        false;


    for (
        let i = 0;
        i < csv.length;
        i++
    ) {

        const char =
            csv[i];

        const next =
            csv[i + 1];


        /* =========================
           QUOTES
        ========================== */

        if (
            char === '"' &&
            insideQuotes &&
            next === '"'
        ) {

            value += '"';

            i++;

            continue;

        }


        if (
            char === '"'
        ) {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        /* =========================
           COMMA
        ========================== */

        if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(
                value.trim()
            );

            value = "";

            continue;

        }


        /* =========================
           NEW LINE
        ========================== */

        if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(
                value.trim()
            );

            value = "";


            if (
                row.some(
                    item =>
                        item !== ""
                )
            ) {

                rows.push(
                    row
                );

            }


            row = [];

            continue;

        }


        value += char;

    }


    if (
        value ||
        row.length
    ) {

        row.push(
            value.trim()
        );

        rows.push(
            row
        );

    }


    return rows;

}


/* =========================================================
   LOAD REVIEWS
========================================================= */

async function loadReviews() {

    if (loading) {
        return;
    }

    loading = true;

    showMessage(
        "Loading reviews...",
        "info"
    );

    reviewsList.innerHTML = `
        <div class="loading">
            Loading reviews...
        </div>
    `;

    try {

        /* =====================================================
           LIVE REVIEWS FROM APPS SCRIPT
        ===================================================== */

        const response =
            await fetch(
                REVIEW_WRITE_URL +
                "?action=getReviews&_=" +
                Date.now(),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Review API HTTP ${response.status}`
            );

        }


        /* =====================================================
           IMPORTANT:
           Apps Script এখন JSON return করছে
        ===================================================== */

        const data =
            await response.json();


        console.log(
            "Review API response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.error ||
                "Could not load reviews"
            );

        }


        /* =====================================================
           REVIEWS
        ===================================================== */

        reviews =
            Array.isArray(
                data.reviews
            )
                ? data.reviews
                : [];


        /* =====================================================
           NORMALIZE DATA
        ===================================================== */

        reviews =
            reviews.map(
                review => ({

                    ...review,

                    reviewid:
                        String(
                            review.reviewid ||
                            ""
                        ).trim(),

                    userid:
                        String(
                            review.userid ||
                            ""
                        ).trim(),

                    name:
                        String(
                            review.name ||
                            ""
                        ).trim(),

                    rating:
                        Number(
                            review.rating ||
                            0
                        ),

                    review:
                        String(
                            review.review ||
                            ""
                        ).trim(),

                    productid:
                        String(
                            review.productid ||
                            ""
                        ).trim(),

                    status:
                        String(
                            review.status ||
                            "pending"
                        )
                            .trim()
                            .toLowerCase(),

                    createdat:
                        String(
                            review.createdat ||
                            ""
                        ).trim()

                })
            );


        /* =====================================================
           REMOVE INVALID ROWS
        ===================================================== */

        reviews =
            reviews.filter(
                review =>
                    review.reviewid
            );


        /* =====================================================
           SORT NEWEST FIRST
        ===================================================== */

        reviews.sort(
            (
                a,
                b
            ) => {

                return (
                    new Date(
                        b.createdat || 0
                    ).getTime()
                    -
                    new Date(
                        a.createdat || 0
                    ).getTime()
                );

            }
        );


        console.log(
            "Loaded reviews:",
            reviews
        );


        /* =====================================================
           CLEAR MESSAGE
        ===================================================== */

        showMessage(
            ""
        );


        /* =====================================================
           RENDER
        ===================================================== */

        render();


    } catch (error) {

        console.error(
            "Review load error:",
            error
        );


        showMessage(
            error.message ||
            "Could not load reviews.",
            "error"
        );


        reviews = [];


        reviewsList.innerHTML = `
            <div class="empty">
                Unable to load reviews.
                <br>
                <small>
                    ${escapeHTML(
                        error.message ||
                        ""
                    )}
                </small>
            </div>
        `;


    } finally {

        loading = false;

    }

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleString(
        "en-BD",
        {
            dateStyle:
                "medium",
            timeStyle:
                "short"
        }
    );

}


/* =========================================================
   RENDER
========================================================= */

function render() {

    const search =
        String(
            searchInput.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const selectedStatus =
        statusFilter.value;


    /* =========================
       COUNTS
    ========================== */

    totalCount.textContent =
        reviews.length;


    pendingCount.textContent =
        reviews.filter(
            review =>
                review.status ===
                "pending"
        ).length;


    approvedCount.textContent =
        reviews.filter(
            review =>
                review.status ===
                "approved"
        ).length;


    rejectedCount.textContent =
        reviews.filter(
            review =>
                review.status ===
                "rejected"
        ).length;


    /* =========================
       FILTER
    ========================== */

    const filtered =
        reviews.filter(
            review => {

                const text =
                    [
                        review.name,
                        review.review,
                        review.productid,
                        review.reviewid
                    ]
                        .join(" ")
                        .toLowerCase();


                const searchMatch =
                    !search ||
                    text.includes(
                        search
                    );


                const statusMatch =
                    selectedStatus ===
                    "all" ||
                    review.status ===
                    selectedStatus;


                return (
                    searchMatch &&
                    statusMatch
                );

            }
        );


    if (
        !filtered.length
    ) {

        reviewsList.innerHTML = `
            <div class="empty">
                No reviews found.
            </div>
        `;

        return;

    }


    /* =========================
       CARDS
    ========================== */

    reviewsList.innerHTML =
        filtered.map(
            review =>
                createReviewCard(
                    review
                )
        ).join("");

}


/* =========================================================
   REVIEW CARD
========================================================= */

function createReviewCard(
    review
) {

    const rating =
        Math.max(
            0,
            Math.min(
                5,
                Number(
                    review.rating
                ) || 0
            )
        );


    const stars =
        "★".repeat(
            rating
        ) +
        "☆".repeat(
            5 - rating
        );


    const status =
        review.status ||
        "pending";


    const canApprove =
        status !==
        "approved";


    const canReject =
        status !==
        "rejected";


    return `
        <article
            class="review-card"
        >

            <div
                class="review-head"
            >

                <div>

                    <div
                        class="customer-name"
                    >
                        ${escapeHTML(
        review.name ||
        "Customer"
    )}
                    </div>


                    <div
                        class="review-meta"
                    >
                        Product ID:
                        ${escapeHTML(
        review.productid ||
        "—"
    )}

                        ·

                        ${escapeHTML(
        formatDate(
            review.createdat
        )
    )}
                    </div>

                </div>


                <span
                    class="
                        status
                        ${escapeHTML(
        status
    )}
                    "
                >
                    ${escapeHTML(
        status
    )}
                </span>

            </div>


            <div
                class="review-stars"
            >
                ${stars}
            </div>


            <p
                class="review-text"
            >
                ${escapeHTML(
        review.review ||
        "No review text"
    )}
            </p>


            <div
                class="review-actions"
            >

                <button
                    type="button"
                    class="btn-approve"
                    data-action="approve"
                    data-id="${escapeHTML(
        review.reviewid
    )}"
                    ${canApprove
            ? ""
            : "disabled"}
                >
                    ✓ Approve
                </button>


                <button
                    type="button"
                    class="btn-reject"
                    data-action="reject"
                    data-id="${escapeHTML(
                review.reviewid
            )}"
                    ${canReject
            ? ""
            : "disabled"}
                >
                    ✕ Reject
                </button>


                <button
                    type="button"
                    class="btn-delete"
                    data-action="delete"
                    data-id="${escapeHTML(
                review.reviewid
            )}"
                >
                    🗑 Delete
                </button>

            </div>

        </article>
    `;

}


/* =========================================================
   SEND ACTION
========================================================= */

async function sendReviewAction(reviewId, action) {

    const review = reviews.find(
        item => item.reviewid === reviewId
    );

    if (!review) {
        showMessage("Review not found.", "error");
        return;
    }


    let question = "";

    if (action === "approve") {
        question = "Approve this review?";
    }

    if (action === "reject") {
        question = "Reject this review?";
    }

    if (action === "delete") {
        question = "Delete this review permanently?";
    }


    if (!confirm(question)) {
        return;
    }


    /*
     * Button temporarily disable
     */
    const buttons = document.querySelectorAll(
        `button[data-id="${CSS.escape(reviewId)}"]`
    );

    buttons.forEach(button => {
        button.disabled = true;
    });


    showMessage(
        "Updating review...",
        "info"
    );


    try {

        const payload = {
            action: "updateReviewStatus",
            reviewId: reviewId,

            status:
                action === "approve"
                    ? "approved"
                    : action === "reject"
                        ? "rejected"
                        : "",

            deleteReview:
                action === "delete"
        };


        console.log(
            "Sending review action:",
            payload
        );


        /*
         * IMPORTANT:
         * text/plain keeps this as a simple request,
         * so Apps Script can receive it without
         * browser preflight problems.
         */

        await fetch(
            REVIEW_WRITE_URL,
            {
                method: "POST",

                mode: "no-cors",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(payload)
            }
        );


        /*
         * Give Apps Script a moment to write
         * the Google Sheet.
         */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    1500
                )
        );


        showMessage(
            "Review updated. Reloading...",
            "success"
        );


        /*
         * IMPORTANT:
         * loading=false before loadReviews()
         */

        loading = false;

        await loadReviews();


    } catch (error) {

        console.error(
            "Review update error:",
            error
        );


        showMessage(
            error.message ||
            "Could not update review.",
            "error"
        );


        loading = false;

        render();
    }
}

/* =========================================================
   BUTTON EVENTS
========================================================= */

reviewsList.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button[data-action]"
            );


        if (!button) {
            return;
        }


        const action =
            button.dataset.action;


        const reviewId =
            button.dataset.id;


        if (
            !reviewId ||
            loading
        ) {

            return;

        }


        sendReviewAction(
            reviewId,
            action
        );

    }
);


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
    "input",
    render
);


/* =========================================================
   STATUS FILTER
========================================================= */

statusFilter.addEventListener(
    "change",
    render
);


/* =========================================================
   REFRESH
========================================================= */

refreshBtn.addEventListener(
    "click",
    loadReviews
);


/* =========================================================
   INITIAL LOAD
========================================================= */

await loadReviews();