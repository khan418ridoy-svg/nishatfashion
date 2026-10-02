/* =========================================================
   NISHAT FASHION
   ADMIN ORDERS
   Firestore Order Management
========================================================= */

import {
    requireAdmin
} from "./admin-auth.js";


import {
    db,
    auth
} from "../js/firebase.js";


import {
    collection,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   ELEMENTS
========================================================= */

const appShell =
    document.querySelector("#appShell");

const ordersBody =
    document.querySelector("#ordersBody");

const searchInput =
    document.querySelector("#searchInput");

const statusFilter =
    document.querySelector("#statusFilter");

const refreshBtn =
    document.querySelector("#refreshBtn");

const orderCount =
    document.querySelector("#orderCount");

const clickLoading =
    document.querySelector("#clickLoading");

const toast =
    document.querySelector("#toast");


/* =========================================================
   STATE
========================================================= */

let orders = [];

let isLoading = false;

let toastTimer = null;


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
   ADMIN HEADER
========================================================= */

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

        <span id="adminEmail">
            ${escapeHTML(
                adminUser.email || "Admin"
            )}
        </span>
<a
            href="dashboard.html"
            class="dashboard-btn"
            id="dashboardBtn"
        >
            Dashboard
        </a>
        <button
            id="logoutBtn"
            type="button"
        >
            Logout
        </button>

    </div>

</header>

`;


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   MONEY
========================================================= */

function money(value) {

    return (
        "৳" +
        Number(
            value || 0
        ).toLocaleString(
            "en-BD",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );

}


/* =========================================================
   DATE
========================================================= */

function formatDate(value) {

    if (!value) {

        return "—";

    }


    try {

        let date;


        if (
            typeof value.toDate ===
            "function"
        ) {

            date =
                value.toDate();

        }

        else if (
            value.seconds !== undefined
        ) {

            date =
                new Date(
                    Number(
                        value.seconds
                    ) * 1000
                );

        }

        else {

            date =
                new Date(value);

        }


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
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        );

    }

    catch {

        return "—";

    }

}


/* =========================================================
   FIRESTORE TIME
========================================================= */

function getTime(value) {

    if (!value) {

        return 0;

    }


    if (
        typeof value.toMillis ===
        "function"
    ) {

        return value.toMillis();

    }


    if (
        value.seconds !== undefined
    ) {

        return (
            Number(
                value.seconds
            ) * 1000
        );

    }


    const parsed =
        Date.parse(value);


    return Number.isNaN(parsed)
        ? 0
        : parsed;

}


/* =========================================================
   STATUS
========================================================= */

function getStatus(order) {

    return String(

        order.orderStatus ??
        order.status ??
        "pending"

    )
        .toLowerCase()
        .trim();

}


/* =========================================================
   PAYMENT STATUS
========================================================= */

function getPaymentStatus(order) {

    return String(

        order.payment?.status ??
        order.paymentStatus ??
        "pending"

    )
        .toLowerCase()
        .trim();

}


/* =========================================================
   PAYMENT METHOD
========================================================= */

function getPaymentMethod(order) {

    return String(

        order.payment?.method ??
        order.paymentMethod ??
        "cod"

    )
        .toUpperCase();

}


/* =========================================================
   TOTAL
========================================================= */

function getTotal(order) {

    return Number(

        order.pricing?.total ??
        order.total ??
        order.grandTotal ??
        0

    );

}


/* =========================================================
   CUSTOMER
========================================================= */

function getCustomer(order) {

    const customer =
        order.customer || {};


    return {

        name:
            customer.name ||
            customer.fullName ||
            order.customerName ||
            "Guest",

        email:
            customer.email ||
            order.email ||
            "",

        phone:
            customer.phone ||
            order.phone ||
            ""

    };

}


/* =========================================================
   ORDER NUMBER
========================================================= */

function getOrderNumber(order) {

    return (

        order.orderNumber ||
        order.orderId ||
        order.id

    );

}


/* =========================================================
   SEARCH TEXT
========================================================= */

function getSearchText(order) {

    const customer =
        getCustomer(order);


    return [

        order.id,

        order.orderId,

        order.orderNumber,

        customer.name,

        customer.email,

        customer.phone,

        getStatus(order),

        getPaymentStatus(order),

        getPaymentMethod(order)

    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "success"
) {

    if (!toast) {

        return;

    }


    toast.textContent =
        message;


    toast.className =
        `toast show ${type}`;


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.className =
                    "toast";

            },
            3000
        );

}


/* =========================================================
   LOADING
========================================================= */

function showLoading() {

    clickLoading
        ?.classList
        .remove("hidden");

}


function hideLoading() {

    clickLoading
        ?.classList
        .add("hidden");

}


/* =========================================================
   STATUS CLASS
========================================================= */

function statusClass(status) {

    return (

        "status-" +

        String(status)
            .replace(
                /[^a-z0-9]+/gi,
                "-"
            )

    );

}


/* =========================================================
   LOAD ORDERS
========================================================= */

async function loadOrders() {

    if (isLoading) {

        return;

    }


    isLoading = true;


    refreshBtn.disabled =
        true;


    ordersBody.innerHTML = `

        <tr>

            <td
                colspan="7"
                class="table-empty"
            >

                <div class="loading-inline">

                    <span class="spinner"></span>

                    Loading orders...

                </div>

            </td>

        </tr>

    `;


    try {

        const snapshot =
            await getDocs(
                collection(
                    db,
                    "orders"
                )
            );


        orders =
            snapshot.docs.map(
                document => ({

                    id:
                        document.id,

                    ...document.data()

                })
            );


        orders.sort(
            (a, b) => {

                return (
                    getTime(
                        b.createdAt
                    ) -
                    getTime(
                        a.createdAt
                    )
                );

            }
        );


        renderOrders();

    }

    catch (error) {

        console.error(
            "Orders loading error:",
            error
        );


        ordersBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="table-empty error-text"
                >

                    Failed to load orders.

                    <br><br>

                    Check Firestore Rules
                    and browser console.

                </td>

            </tr>

        `;


        showToast(
            "Failed to load orders.",
            "error"
        );

    }

    finally {

        isLoading =
            false;

        refreshBtn.disabled =
            false;

    }

}


/* =========================================================
   RENDER ORDERS
========================================================= */

function renderOrders() {

    const search =
        String(
            searchInput.value
        )
            .trim()
            .toLowerCase();


    const selectedStatus =
        statusFilter.value;


    const filtered =
        orders.filter(
            order => {

                const status =
                    getStatus(order);


                const matchesStatus =
                    !selectedStatus ||
                    status ===
                    selectedStatus;


                const matchesSearch =
                    !search ||
                    getSearchText(
                        order
                    ).includes(
                        search
                    );


                return (
                    matchesStatus &&
                    matchesSearch
                );

            }
        );


    orderCount.textContent =
        filtered.length;


    if (!filtered.length) {

        ordersBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="table-empty"
                >

                    No orders found.

                </td>

            </tr>

        `;

        return;

    }


    ordersBody.innerHTML =
        filtered
            .map(
                order =>
                    renderOrderRow(
                        order
                    )
            )
            .join("");


    document
        .querySelectorAll(
            ".status-select"
        )
        .forEach(
            select => {

                select.addEventListener(
                    "change",
                    handleStatusChange
                );

            }
        );

}


/* =========================================================
   RENDER ORDER ROW
========================================================= */

function renderOrderRow(
    order
) {

    const customer =
        getCustomer(order);


    const status =
        getStatus(order);


    const paymentStatus =
        getPaymentStatus(order);


    const paymentMethod =
        getPaymentMethod(order);


    const orderNumber =
        getOrderNumber(order);


    return `

        <tr>

            <td>

                <a
                    class="order-link"
                    href="order-details.html?id=${encodeURIComponent(
                        order.id
                    )}"
                >

                    #${escapeHTML(
                        orderNumber
                    )}

                </a>

            </td>


            <td>

                <div class="customer">

                    <strong>
                        ${escapeHTML(
                            customer.name
                        )}
                    </strong>

                    ${
                        customer.email
                            ? `
                                <small>
                                    ${escapeHTML(
                                        customer.email
                                    )}
                                </small>
                              `
                            : ""
                    }

                    ${
                        customer.phone
                            ? `
                                <small>
                                    ${escapeHTML(
                                        customer.phone
                                    )}
                                </small>
                              `
                            : ""
                    }

                </div>

            </td>


            <td>

                ${escapeHTML(
                    formatDate(
                        order.createdAt
                    )
                )}

            </td>


            <td>

                <div class="payment">

                    <strong>
                        ${escapeHTML(
                            paymentMethod
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            paymentStatus
                        )}
                    </small>

                </div>

            </td>


            <td>

                <select
                    class="
                        status-select
                        ${statusClass(status)}
                    "
                    data-order-id="${escapeHTML(
                        order.id
                    )}"
                    aria-label="Change order status"
                >

                    ${statusOption(
                        "pending",
                        status,
                        "Pending"
                    )}

                    ${statusOption(
                        "confirmed",
                        status,
                        "Confirmed"
                    )}

                    ${statusOption(
                        "processing",
                        status,
                        "Processing"
                    )}

                    ${statusOption(
                        "packed",
                        status,
                        "Packed"
                    )}

                    ${statusOption(
                        "shipped",
                        status,
                        "Shipped"
                    )}

                    ${statusOption(
                        "delivered",
                        status,
                        "Delivered"
                    )}

                    ${statusOption(
                        "cancelled",
                        status,
                        "Cancelled"
                    )}

                    ${statusOption(
                        "returned",
                        status,
                        "Returned"
                    )}

                </select>

            </td>


            <td>

                <strong>
                    ${money(
                        getTotal(order)
                    )}
                </strong>

            </td>


            <td>

                <a
                    class="view-btn"
                    href="order-details.html?id=${encodeURIComponent(
                        order.id
                    )}"
                >
                    View
                </a>

            </td>

        </tr>

    `;

}


/* =========================================================
   STATUS OPTION
========================================================= */

function statusOption(
    value,
    current,
    label
) {

    return `

        <option
            value="${value}"
            ${
                current === value
                    ? "selected"
                    : ""
            }
        >

            ${label}

        </option>

    `;

}


/* =========================================================
   UPDATE STATUS
========================================================= */

async function handleStatusChange(
    event
) {

    const select =
        event.currentTarget;


    const orderId =
        select.dataset.orderId;


    const newStatus =
        select.value;


    const order =
        orders.find(
            item =>
                item.id ===
                orderId
        );


    if (!order) {

        return;

    }


    const oldStatus =
        getStatus(order);


    if (
        oldStatus ===
        newStatus
    ) {

        return;

    }


    select.disabled =
        true;


    showLoading();


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


        order.orderStatus =
            newStatus;


        showToast(
            `Order status changed to ${newStatus}.`
        );


        renderOrders();

    }

    catch (error) {

        console.error(
            "Order status update error:",
            error
        );


        showToast(
            "Could not update order status.",
            "error"
        );


        select.value =
            oldStatus;

    }

    finally {

        hideLoading();

        select.disabled =
            false;

    }

}


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
    "input",
    renderOrders
);


statusFilter.addEventListener(
    "change",
    renderOrders
);


/* =========================================================
   REFRESH
========================================================= */

refreshBtn.addEventListener(
    "click",
    async () => {

        showLoading();

        try {

            await loadOrders();

        }

        finally {

            hideLoading();

        }

    }
);


/* =========================================================
   LOGOUT
========================================================= */

document
    .querySelector("#logoutBtn")
    .addEventListener(
        "click",
        async () => {

            showLoading();

            try {

                const {
                    signOut
                } = await import(
                    "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
                );


                await signOut(
                    auth
                );


                location.replace(
                    "admin-login.html"
                );

            }

            catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

                hideLoading();

            }

        }
    );


/* =========================================================
   INITIAL LOAD
========================================================= */

await loadOrders();