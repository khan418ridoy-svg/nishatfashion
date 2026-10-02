import { requireAdmin } from "./admin-auth.js";

import {
    db,
    auth
} from "../js/firebase.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =====================================================
   ADMIN AUTH
===================================================== */

const adminUser = await requireAdmin();

if (!adminUser) {
    throw new Error("Unauthorized");
}


/* =====================================================
   ELEMENTS
===================================================== */

const appShell =
    document.getElementById("appShell");

const orderPanel =
    document.getElementById("orderPanel");

const orderTitle =
    document.getElementById("orderTitle");

const clickLoading =
    document.getElementById("clickLoading");

const toast =
    document.getElementById("toast");


/* =====================================================
   ADMIN HEADER
===================================================== */

appShell.innerHTML = `

<header class="admin-header">

    <div class="admin-brand">

        <img
            src="../asset/logo.png"
            alt="Nishat Fashion"
        >

        <span>
            Admin Panel
        </span>

    </div>


    <div class="admin-user">

        <a
            href="dashboard.html"
            class="dashboard-btn"
        >
            Dashboard
        </a>

        <span id="adminEmail">
            ${escapeHTML(
                adminUser.email || "Admin"
            )}
        </span>

        <button
            id="logoutBtn"
            type="button"
        >
            Logout
        </button>

    </div>

</header>

`;


/* =====================================================
   LOGOUT
===================================================== */

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        async () => {

            const button =
                document.getElementById(
                    "logoutBtn"
                );

            button.disabled = true;
            button.textContent =
                "Logging out...";

            try {

                await auth.signOut();

                window.location.href =
                    "admin-login.html";

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

                button.disabled = false;
                button.textContent =
                    "Logout";

                showToast(
                    "Logout failed",
                    "error"
                );
            }

        }
    );


/* =====================================================
   ORDER ID
===================================================== */

const params =
    new URLSearchParams(
        window.location.search
    );

const orderId =
    params.get("id");


if (!orderId) {

    orderTitle.textContent =
        "No order ID provided.";

    orderPanel.innerHTML = `

        <div class="empty-state">

            <h2>
                Order ID Missing
            </h2>

            <p>
                Please open this page from the Orders list.
            </p>

            <a
                href="orders.html"
                class="back-btn"
            >
                ← Back to Orders
            </a>

        </div>

    `;

    throw new Error(
        "Missing order ID"
    );
}


/* =====================================================
   LOAD ORDER
===================================================== */

async function loadOrder() {

    try {

        showLoading();


        const orderRef =
            doc(
                db,
                "orders",
                orderId
            );


        const snapshot =
            await getDoc(orderRef);


        if (!snapshot.exists()) {

            orderTitle.textContent =
                "Order not found.";

            orderPanel.innerHTML = `

                <div class="empty-state">

                    <h2>
                        Order Not Found
                    </h2>

                    <p>
                        This order does not exist or may have been deleted.
                    </p>

                    <a
                        href="orders.html"
                        class="back-btn"
                    >
                        ← Back to Orders
                    </a>

                </div>

            `;

            return;
        }


        const order = {

            id: snapshot.id,

            ...snapshot.data()

        };


        renderOrder(order);


    } catch (error) {

        console.error(
            "Order loading error:",
            error
        );


        orderTitle.textContent =
            "Could not load order.";


        orderPanel.innerHTML = `

            <div class="empty-state">

                <h2>
                    Failed to Load Order
                </h2>

                <p class="error-text">
                    ${escapeHTML(
                        getErrorMessage(error)
                    )}
                </p>

                <button
                    id="retryBtn"
                    class="primary-btn"
                    type="button"
                >
                    Try Again
                </button>

            </div>

        `;


        document
            .getElementById("retryBtn")
            ?.addEventListener(
                "click",
                loadOrder
            );

    } finally {

        hideLoading();

    }

}


/* =====================================================
   RENDER ORDER
===================================================== */

function renderOrder(order) {

    const customer =
        order.customer || {};


    const shipping =
        order.shippingAddress ||
        order.address ||
        {};


    const payment =
        order.payment || {};


    const pricing =
        order.pricing || {};


    const items =
        Array.isArray(order.items)
            ? order.items
            : Array.isArray(order.products)
                ? order.products
                : [];


    const status =
        order.orderStatus ||
        order.status ||
        "pending";


    const orderNumber =
        order.orderNumber ||
        order.id;


    orderTitle.textContent =
        `#${orderNumber}`;


    const total =
        getOrderTotal(order);


    const paymentMethod =
        payment.method ||
        order.paymentMethod ||
        "—";


    const paymentStatus =
        payment.status ||
        order.paymentStatus ||
        "pending";


    const orderDate =
        formatDate(
            order.createdAt ||
            order.orderDate ||
            order.created_at
        );


    orderPanel.innerHTML = `

        <div class="order-grid">


            <!-- CUSTOMER -->
            <div class="detail-card">

                <div class="detail-card-title">
                    Customer
                </div>


                <div class="customer-info">

                    <strong>
                        ${escapeHTML(
                            customer.name ||
                            order.customerName ||
                            "—"
                        )}
                    </strong>


                    <span>
                        ${escapeHTML(
                            customer.email ||
                            order.email ||
                            "—"
                        )}
                    </span>


                    <span>
                        ${escapeHTML(
                            customer.phone ||
                            order.phone ||
                            "—"
                        )}
                    </span>

                </div>

            </div>


            <!-- DELIVERY -->
            <div class="detail-card">

                <div class="detail-card-title">
                    Delivery Address
                </div>


                <div class="address-info">

                    <strong>
                        ${escapeHTML(
                            shipping.name ||
                            customer.name ||
                            "Customer"
                        )}
                    </strong>


                    <span>
                        ${escapeHTML(
                            shipping.address ||
                            order.address ||
                            "—"
                        )}
                    </span>


                    ${
                        shipping.thana ||
                        order.thana
                            ? `
                                <span>
                                    Thana:
                                    ${escapeHTML(
                                        shipping.thana ||
                                        order.thana
                                    )}
                                </span>
                              `
                            : ""
                    }


                    ${
                        shipping.district ||
                        order.district
                            ? `
                                <span>
                                    District:
                                    ${escapeHTML(
                                        shipping.district ||
                                        order.district
                                    )}
                                </span>
                              `
                            : ""
                    }


                    ${
                        shipping.postCode ||
                        shipping.postalCode
                            ? `
                                <span>
                                    Postal Code:
                                    ${escapeHTML(
                                        shipping.postCode ||
                                        shipping.postalCode
                                    )}
                                </span>
                              `
                            : ""
                    }

                </div>

            </div>


            <!-- ORDER INFO -->
            <div class="detail-card">

                <div class="detail-card-title">
                    Order Information
                </div>


                <div class="info-list">

                    <div>
                        <span>Order ID</span>
                        <strong>
                            #${escapeHTML(orderNumber)}
                        </strong>
                    </div>


                    <div>
                        <span>Date</span>
                        <strong>
                            ${escapeHTML(orderDate)}
                        </strong>
                    </div>


                    <div>
                        <span>Payment</span>
                        <strong>
                            ${escapeHTML(
                                paymentMethod
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Payment Status</span>
                        <strong>
                            ${escapeHTML(
                                paymentStatus
                            )}
                        </strong>
                    </div>


                    <div>
                        <span>Total</span>
                        <strong class="order-total">
                            ${money(total)}
                        </strong>
                    </div>

                </div>

            </div>


            <!-- STATUS -->
            <div class="detail-card">

                <div class="detail-card-title">
                    Order Status
                </div>


                <div class="status-control">

                    <label
                        for="statusSelect"
                    >
                        Change Status
                    </label>


                    <select
                        id="statusSelect"
                        class="status-select"
                    >

                        <option value="pending">
                            Pending
                        </option>

                        <option value="confirmed">
                            Confirmed
                        </option>

                        <option value="processing">
                            Processing
                        </option>

                        <option value="packed">
                            Packed
                        </option>

                        <option value="shipped">
                            Shipped
                        </option>

                        <option value="delivered">
                            Delivered
                        </option>

                        <option value="cancelled">
                            Cancelled
                        </option>

                        <option value="returned">
                            Returned
                        </option>

                    </select>


                    <button
                        id="saveStatus"
                        class="primary-btn save-status-btn"
                        type="button"
                    >
                        Update Status
                    </button>


                    <span
                        id="statusMessage"
                        class="status-message"
                    ></span>

                </div>

            </div>

        </div>


        <!-- ITEMS -->

        <div class="items-section">

            <div class="section-heading">

                <h2>
                    Order Items
                </h2>

                <span>
                    ${items.length} item(s)
                </span>

            </div>


            <div class="items-list">

                ${
                    items.length
                        ? items
                            .map(
                                (
                                    item,
                                    index
                                ) =>
                                    renderItem(
                                        item,
                                        index
                                    )
                            )
                            .join("")
                        : `
                            <div class="empty-items">
                                No items recorded.
                            </div>
                          `
                }

            </div>

        </div>

    `;


    const statusSelect =
        document.getElementById(
            "statusSelect"
        );


    statusSelect.value =
        normalizeStatus(status);


    statusSelect.classList.add(
        `status-${normalizeStatus(status)}`
    );


    statusSelect.addEventListener(
        "change",
        () => {

            statusSelect.className =
                "status-select";

            statusSelect.classList.add(
                `status-${normalizeStatus(
                    statusSelect.value
                )}`
            );

        }
    );


    document
        .getElementById("saveStatus")
        .addEventListener(
            "click",
            () => updateOrderStatus(
                order.id
            )
        );

}


/* =====================================================
   RENDER ITEM
===================================================== */

function renderItem(
    item,
    index
) {

    const name =
        item.name ||
        item.productName ||
        "Product";


    const quantity =
        Number(
            item.quantity ||
            item.qty ||
            1
        );


    const price =
        Number(
            item.salePrice ||
            item.price ||
            item.unitPrice ||
            0
        );


    const image =
        item.image ||
        item.imageUrl ||
        "";


    return `

        <div class="order-item">

            <div class="item-number">
                ${index + 1}
            </div>


            <div class="item-image">

                ${
                    image
                        ? `
                            <img
                                src="${escapeAttribute(
                                    image
                                )}"
                                alt="${escapeAttribute(
                                    name
                                )}"
                                loading="lazy"
                            >
                          `
                        : `
                            <div class="no-image">
                                No Image
                            </div>
                          `
                }

            </div>


            <div class="item-info">

                <strong>
                    ${escapeHTML(name)}
                </strong>

                ${
                    item.size
                        ? `
                            <span>
                                Size:
                                ${escapeHTML(
                                    item.size
                                )}
                            </span>
                          `
                        : ""
                }

                ${
                    item.color
                        ? `
                            <span>
                                Color:
                                ${escapeHTML(
                                    item.color
                                )}
                            </span>
                          `
                        : ""
                }

            </div>


            <div class="item-qty">
                Qty: ${quantity}
            </div>


            <div class="item-price">

                ${money(price * quantity)}

                <small>
                    ${money(price)} each
                </small>

            </div>

        </div>

    `;

}


/* =====================================================
   UPDATE STATUS
===================================================== */

async function updateOrderStatus(
    orderId
) {

    const select =
        document.getElementById(
            "statusSelect"
        );

    const button =
        document.getElementById(
            "saveStatus"
        );

    const message =
        document.getElementById(
            "statusMessage"
        );


    if (!select || !button) {
        return;
    }


    const newStatus =
        select.value;


    button.disabled = true;

    button.classList.add(
        "is-loading"
    );

    button.textContent =
        "Updating...";


    showClickLoading(
        "Updating order..."
    );


    try {

        await updateDoc(
            doc(
                db,
                "orders",
                orderId
            ),
            {

                orderStatus:
                    newStatus,

                updatedAt:
                    serverTimestamp()

            }
        );


        message.textContent =
            "Status updated successfully.";

        message.className =
            "status-message success";


        showToast(
            "Order status updated.",
            "success"
        );


    } catch (error) {

        console.error(
            "Status update error:",
            error
        );


        message.textContent =
            getErrorMessage(error);

        message.className =
            "status-message error";


        showToast(
            getErrorMessage(error),
            "error"
        );


    } finally {

        hideClickLoading();

        button.disabled = false;

        button.classList.remove(
            "is-loading"
        );

        button.textContent =
            "Update Status";

    }

}


/* =====================================================
   HELPERS
===================================================== */

function normalizeStatus(status) {

    const allowed = [
        "pending",
        "pending_payment",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
        "returned"
    ];


    if (
        status === "pending_payment"
    ) {

        return "pending";

    }


    return allowed.includes(status)
        ? status
        : "pending";

}


function getOrderTotal(order) {

    if (
        order.pricing &&
        order.pricing.total != null
    ) {

        return Number(
            order.pricing.total
        );

    }


    if (order.total != null) {

        return Number(
            order.total
        );

    }


    if (
        order.grandTotal != null
    ) {

        return Number(
            order.grandTotal
        );

    }


    return 0;

}


function money(value) {

    return "৳" +
        Number(
            value || 0
        ).toLocaleString(
            "en-BD",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );

}


function formatDate(value) {

    if (!value) {
        return "—";
    }


    try {

        if (
            typeof value.toDate ===
            "function"
        ) {

            return value
                .toDate()
                .toLocaleString(
                    "en-BD",
                    {
                        dateStyle: "medium",
                        timeStyle: "short"
                    }
                );

        }


        const date =
            new Date(value);


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
                dateStyle: "medium",
                timeStyle: "short"
            }
        );

    } catch {

        return "—";

    }

}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(value);

}


function getErrorMessage(error) {

    if (
        error?.code ===
        "permission-denied"
    ) {

        return "Permission denied. Check Firestore rules.";

    }


    if (
        error?.code ===
        "unauthenticated"
    ) {

        return "Admin authentication required.";

    }


    return error?.message ||
        "Something went wrong.";

}


/* =====================================================
   LOADING
===================================================== */

function showLoading(
    text = "Loading..."
) {

    orderPanel.innerHTML = `

        <div class="loading-inline">

            <span class="spinner"></span>

            ${text}

        </div>

    `;

}


function hideLoading() {

    /* Main loader is replaced by renderOrder */

}


function showClickLoading(
    text = "Processing..."
) {

    if (!clickLoading) {
        return;
    }


    const paragraph =
        clickLoading.querySelector(
            "p"
        );


    if (paragraph) {
        paragraph.textContent = text;
    }


    clickLoading.classList.remove(
        "hidden"
    );

}


function hideClickLoading() {

    if (!clickLoading) {
        return;
    }


    clickLoading.classList.add(
        "hidden"
    );

}


let toastTimer;


function showToast(
    message,
    type = "success"
) {

    if (!toast) {
        return;
    }


    clearTimeout(
        toastTimer
    );


    toast.textContent =
        message;


    toast.className =
        `toast ${type} show`;


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


/* =====================================================
   START
===================================================== */

await loadOrder();