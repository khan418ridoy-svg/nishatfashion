/* =========================================================
   NISHAT FASHION
   ADMIN CUSTOMERS
   Firestore Customer Management
   ========================================================= */

import { requireAdmin } from "./admin-auth.js";

import {
    db,
    auth
} from "../js/firebase.js";

import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// =========================================================
// ELEMENTS
// =========================================================

const appShell = document.querySelector("#appShell");
const customersBody = document.querySelector("#customersBody");
const searchInput = document.querySelector("#searchInput");
const refreshBtn = document.querySelector("#refreshBtn");

const customerCount = document.querySelector("#customerCount");
const activeCustomerCount = document.querySelector("#activeCustomerCount");
const totalCustomerOrders = document.querySelector("#totalCustomerOrders");
const totalSpent = document.querySelector("#totalSpent");

const clickLoading = document.querySelector("#clickLoading");
const toast = document.querySelector("#toast");


// =========================================================
// STATE
// =========================================================

let customers = [];
let orders = [];
let isLoading = false;
let toastTimer = null;


// =========================================================
// ADMIN CHECK
// =========================================================

const adminUser = await requireAdmin();

if (!adminUser) {
    throw new Error("Unauthorized");
}


// =========================================================
// ADMIN HEADER
// =========================================================

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
            ${escapeHTML(adminUser.email || "Admin")}
        </span>

        <a
            class="dashboard-btn"
            href="dashboard.html"
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


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================================================
// MONEY
// =========================================================

function money(value) {

    const amount = Number(value || 0);

    return (
        "৳" +
        amount.toLocaleString("en-BD", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        })
    );
}


// =========================================================
// DATE
// =========================================================

function formatDate(value) {

    if (!value) {
        return "—";
    }

    try {

        let date;

        if (typeof value?.toDate === "function") {

            date = value.toDate();

        } else if (
            value &&
            typeof value === "object" &&
            value.seconds !== undefined
        ) {

            date = new Date(
                Number(value.seconds) * 1000
            );

        } else {

            date = new Date(value);

        }

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en-BD", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });

    } catch {

        return "—";
    }
}


// =========================================================
// TIMESTAMP
// =========================================================

function timestampValue(value) {

    if (!value) {
        return 0;
    }

    if (typeof value?.toMillis === "function") {
        return value.toMillis();
    }

    if (
        value &&
        typeof value === "object" &&
        value.seconds !== undefined
    ) {
        return Number(value.seconds) * 1000;
    }

    const parsed = Date.parse(value);

    return Number.isNaN(parsed)
        ? 0
        : parsed;
}


// =========================================================
// CUSTOMER NAME
// =========================================================

function getCustomerName(customer) {

    return (
        customer.name ||
        customer.displayName ||
        customer.fullName ||
        customer.customerName ||
        customer.customer?.name ||
        customer.email ||
        customer.phone ||
        "Unnamed Customer"
    );
}


// =========================================================
// CUSTOMER EMAIL
// =========================================================

function getCustomerEmail(customer) {

    return (
        customer.email ||
        customer.emailAddress ||
        customer.customer?.email ||
        ""
    );
}


// =========================================================
// CUSTOMER PHONE
// =========================================================

function getCustomerPhone(customer) {

    return (
        customer.phone ||
        customer.phoneNumber ||
        customer.mobile ||
        customer.customer?.phone ||
        ""
    );
}


// =========================================================
// CUSTOMER UID
// =========================================================

function getCustomerUid(customer) {

    return String(
        customer.uid ||
        customer.userId ||
        customer.customerId ||
        customer.id ||
        ""
    ).trim();
}


// =========================================================
// ORDER USER ID
// =========================================================

function getOrderUserId(order) {

    return String(
        order.userId ||
        order.uid ||
        order.customerId ||
        order.customer?.uid ||
        order.customer?.userId ||
        ""
    ).trim();
}


// =========================================================
// ORDER EMAIL
// =========================================================

function getOrderEmail(order) {

    return String(
        order.customer?.email ||
        order.email ||
        order.customerEmail ||
        ""
    )
        .trim()
        .toLowerCase();
}


// =========================================================
// ORDER PHONE
// =========================================================

function getOrderPhone(order) {

    return String(
        order.customer?.phone ||
        order.phone ||
        order.customerPhone ||
        ""
    )
        .trim();
}


// =========================================================
// ORDER NAME
// =========================================================

function getOrderCustomerName(order) {

    return (
        order.customer?.name ||
        order.customer?.fullName ||
        order.customerName ||
        order.name ||
        order.customer?.email ||
        order.email ||
        order.customer?.phone ||
        order.phone ||
        "Guest Customer"
    );
}


// =========================================================
// ORDER TOTAL
// =========================================================

function getOrderTotal(order) {

    return Number(
        order.pricing?.total ??
        order.total ??
        order.grandTotal ??
        order.amount ??
        0
    );
}


// =========================================================
// ORDER DATE
// =========================================================

function getOrderDate(order) {

    return (
        order.createdAt ||
        order.orderDate ||
        order.date ||
        order.updatedAt ||
        null
    );
}


// =========================================================
// NORMALIZE PHONE
// =========================================================

function normalizePhone(value) {

    return String(value || "")
        .replace(/[^\d+]/g, "")
        .replace(/^(\+88)?0/, "0")
        .trim();
}


// =========================================================
// FIND EXISTING CUSTOMER
// =========================================================

function findExistingCustomer(
    list,
    order
) {

    const orderUserId =
        getOrderUserId(order);

    const orderEmail =
        getOrderEmail(order);

    const orderPhone =
        normalizePhone(
            getOrderPhone(order)
        );


    // -----------------------------------------
    // 1. Match by UID
    // -----------------------------------------

    if (orderUserId) {

        const byUid = list.find(customer => {

            const customerUid =
                getCustomerUid(customer);

            return (
                customerUid &&
                customerUid === orderUserId
            );

        });

        if (byUid) {
            return byUid;
        }
    }


    // -----------------------------------------
    // 2. Match by email
    // -----------------------------------------

    if (orderEmail) {

        const byEmail = list.find(customer => {

            const email =
                getCustomerEmail(customer)
                    .trim()
                    .toLowerCase();

            return (
                email &&
                email === orderEmail
            );

        });

        if (byEmail) {
            return byEmail;
        }
    }


    // -----------------------------------------
    // 3. Match by phone
    // -----------------------------------------

    if (orderPhone) {

        const byPhone = list.find(customer => {

            const phone =
                normalizePhone(
                    getCustomerPhone(customer)
                );

            return (
                phone &&
                phone === orderPhone
            );

        });

        if (byPhone) {
            return byPhone;
        }
    }


    return null;
}


// =========================================================
// CREATE CUSTOMER FROM ORDER
// =========================================================

function createCustomerFromOrder(
    order,
    orderDocumentId
) {

    const uid =
        getOrderUserId(order);

    const email =
        getOrderEmail(order);

    const phone =
        getOrderPhone(order);

    const name =
        getOrderCustomerName(order);

    const createdAt =
        getOrderDate(order);


    /*
       Important:

       If order contains userId,
       use it as customer ID.

       Otherwise create a stable ID
       from email / phone / order ID.
    */

    let customerId = uid;

    if (!customerId && email) {

        customerId =
            `email:${email}`;

    }

    if (!customerId && phone) {

        customerId =
            `phone:${normalizePhone(phone)}`;

    }

    if (!customerId) {

        customerId =
            `order:${orderDocumentId}`;

    }


    return {

        id: customerId,

        uid: uid || "",

        userId: uid || "",

        name,

        displayName: name,

        email: email || "",

        phone: phone || "",

        photoURL:
            order.customer?.photoURL ||
            order.photoURL ||
            "",

        createdAt,

        fromOrder: true,

        sourceOrderId:
            orderDocumentId

    };
}


// =========================================================
// BUILD CUSTOMER LIST
// =========================================================

function buildCustomers(
    usersList,
    ordersList
) {

    const result = [];

    /*
       --------------------------------------------
       STEP 1
       Add all users collection customers
       --------------------------------------------
    */

    for (const user of usersList) {

        const customer = {
            id: user.id,
            ...user
        };

        result.push(customer);
    }


    /*
       --------------------------------------------
       STEP 2
       Add customers found in orders
       --------------------------------------------
    */

    for (const order of ordersList) {

        const existing =
            findExistingCustomer(
                result,
                order
            );


        if (existing) {

            /*
               If user exists but some information
               is missing, fill it from order.
            */

            if (
                !getCustomerName(existing) ||
                getCustomerName(existing) ===
                "Unnamed Customer"
            ) {

                const orderName =
                    getOrderCustomerName(order);

                if (orderName) {
                    existing.name = orderName;
                }
            }


            if (
                !getCustomerEmail(existing)
            ) {

                const email =
                    getOrderEmail(order);

                if (email) {
                    existing.email = email;
                }
            }


            if (
                !getCustomerPhone(existing)
            ) {

                const phone =
                    getOrderPhone(order);

                if (phone) {
                    existing.phone = phone;
                }
            }

            continue;
        }


        /*
           Customer doesn't exist in users collection.

           Create temporary customer from order.
        */

        const generated =
            createCustomerFromOrder(
                order,
                order.id
            );


        /*
           Before pushing, perform one more
           duplicate check.
        */

        const duplicate =
            findExistingCustomer(
                result,
                order
            );

        if (!duplicate) {

            result.push(generated);

        }
    }


    /*
       --------------------------------------------
       STEP 3
       Sort newest customer first
       --------------------------------------------
    */

    result.sort(
        (a, b) => {

            const dateA =
                timestampValue(
                    a.createdAt
                );

            const dateB =
                timestampValue(
                    b.createdAt
                );

            return dateB - dateA;
        }
    );


    return result;
}


// =========================================================
// CUSTOMER ORDER DATA
// =========================================================

function getCustomerOrderData(
    customer
) {

    const customerId =
        String(customer.id || "")
            .trim();

    const customerUid =
        getCustomerUid(customer);

    const customerEmail =
        getCustomerEmail(customer)
            .trim()
            .toLowerCase();

    const customerPhone =
        normalizePhone(
            getCustomerPhone(customer)
        );


    const customerOrders =
        orders.filter(order => {

            /*
               -----------------------------------
               UID / USER ID MATCH
               -----------------------------------
            */

            const orderUserId =
                getOrderUserId(order);

            if (
                orderUserId &&
                (
                    orderUserId === customerId ||
                    (
                        customerUid &&
                        orderUserId === customerUid
                    )
                )
            ) {

                return true;
            }


            /*
               -----------------------------------
               EMAIL MATCH
               -----------------------------------
            */

            const orderEmail =
                getOrderEmail(order);

            if (
                customerEmail &&
                orderEmail &&
                customerEmail === orderEmail
            ) {

                return true;
            }


            /*
               -----------------------------------
               PHONE MATCH
               -----------------------------------
            */

            const orderPhone =
                normalizePhone(
                    getOrderPhone(order)
                );

            if (
                customerPhone &&
                orderPhone &&
                customerPhone === orderPhone
            ) {

                return true;
            }


            return false;
        });


    const spent =
        customerOrders.reduce(
            (
                total,
                order
            ) => {

                return (
                    total +
                    getOrderTotal(order)
                );

            },
            0
        );


    return {

        orders:
            customerOrders,

        count:
            customerOrders.length,

        spent

    };
}


// =========================================================
// LOAD DATA
// =========================================================

async function loadCustomers() {

    if (isLoading) {
        return;
    }


    isLoading = true;

    refreshBtn.disabled = true;


    customersBody.innerHTML = `
        <tr>
            <td
                colspan="5"
                class="table-empty"
            >
                <div class="loading-inline">
                    <span class="spinner"></span>
                    Loading customers...
                </div>
            </td>
        </tr>
    `;


    try {

        /*
           ---------------------------------------
           Load USERS + ORDERS simultaneously
           ---------------------------------------
        */

        const [
            usersSnapshot,
            ordersSnapshot
        ] = await Promise.all([

            getDocs(
                collection(
                    db,
                    "users"
                )
            ),

            getDocs(
                collection(
                    db,
                    "orders"
                )
            )

        ]);


        /*
           ---------------------------------------
           Convert users
           ---------------------------------------
        */

        const usersList =
            usersSnapshot.docs.map(
                document => ({

                    id:
                        document.id,

                    ...document.data()

                })
            );


        /*
           ---------------------------------------
           Convert orders
           ---------------------------------------
        */

        orders =
            ordersSnapshot.docs.map(
                document => ({

                    id:
                        document.id,

                    ...document.data()

                })
            );


        /*
           ---------------------------------------
           Build combined customers
           ---------------------------------------
        */

        customers =
            buildCustomers(
                usersList,
                orders
            );


        console.log(
            "Users:",
            usersList.length
        );

        console.log(
            "Orders:",
            orders.length
        );

        console.log(
            "Combined customers:",
            customers.length
        );


        /*
           ---------------------------------------
           Update dashboard cards
           ---------------------------------------
        */

        updateSummary();


        /*
           ---------------------------------------
           Render table
           ---------------------------------------
        */

        renderCustomers();

    }


    catch (error) {

        console.error(
            "Customers loading error:",
            error
        );


        customersBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="table-empty error-text"
                >
                    Failed to load customers.
                    <br><br>
                    Check Firestore Rules
                    and browser console.
                </td>
            </tr>
        `;


        showToast(
            "Failed to load customers.",
            "error"
        );

    }


    finally {

        isLoading = false;

        refreshBtn.disabled = false;

        hideLoading();

    }
}


// =========================================================
// SUMMARY
// =========================================================

function updateSummary() {

    let customersWithOrders = 0;

    let orderCount = 0;

    let spent = 0;


    customers.forEach(
        customer => {

            const data =
                getCustomerOrderData(
                    customer
                );


            if (
                data.count > 0
            ) {

                customersWithOrders++;

            }


            orderCount +=
                data.count;


            spent +=
                data.spent;

        }
    );


    customerCount.textContent =
        customers.length
            .toLocaleString("en-BD");


    activeCustomerCount.textContent =
        customersWithOrders
            .toLocaleString("en-BD");


    totalCustomerOrders.textContent =
        orderCount
            .toLocaleString("en-BD");


    totalSpent.textContent =
        money(spent);

}


// =========================================================
// SEARCH
// =========================================================

function renderCustomers() {

    const query =
        String(
            searchInput.value || ""
        )
            .trim()
            .toLowerCase();


    const filtered =
        customers.filter(
            customer => {

                const name =
                    getCustomerName(
                        customer
                    )
                        .toLowerCase();


                const email =
                    getCustomerEmail(
                        customer
                    )
                        .toLowerCase();


                const phone =
                    getCustomerPhone(
                        customer
                    )
                        .toLowerCase();


                const id =
                    String(
                        customer.id || ""
                    )
                        .toLowerCase();


                return (
                    !query ||
                    name.includes(query) ||
                    email.includes(query) ||
                    phone.includes(query) ||
                    id.includes(query)
                );

            }
        );


    if (!filtered.length) {

        customersBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="table-empty"
                >
                    ${
                        customers.length
                            ? "No matching customers found."
                            : "No customers found."
                    }
                </td>
            </tr>
        `;

        return;
    }


    customersBody.innerHTML =
        filtered
            .map(
                customer =>
                    renderCustomerRow(
                        customer
                    )
            )
            .join("");
}


// =========================================================
// CUSTOMER ROW
// =========================================================

function renderCustomerRow(
    customer
) {

    const name =
        getCustomerName(
            customer
        );


    const email =
        getCustomerEmail(
            customer
        ) || "—";


    const photo =
        customer.photoURL ||
        customer.photoUrl ||
        customer.avatar ||
        customer.customer?.photoURL ||
        "";


    const orderData =
        getCustomerOrderData(
            customer
        );


    const avatarHTML =
        photo

            ? `
                <img
                    class="avatar"
                    src="${escapeHTML(photo)}"
                    alt=""
                    loading="lazy"
                    referrerpolicy="no-referrer"
                >
            `

            : `
                <div
                    class="avatar avatar-placeholder"
                >
                    ${escapeHTML(
                        name
                            .charAt(0)
                            .toUpperCase()
                    )}
                </div>
            `;


    return `
        <tr>

            <td>

                <div class="customer">

                    ${avatarHTML}

                    <div class="customer-info">

                        <strong>
                            ${escapeHTML(name)}
                        </strong>

                        <small>
                            ID:
                            ${escapeHTML(
                                customer.id
                            )}
                        </small>

                    </div>

                </div>

            </td>


            <td>

                <span class="email-cell">
                    ${escapeHTML(email)}
                </span>

            </td>


            <td>

                ${escapeHTML(
                    formatDate(
                        customer.createdAt
                    )
                )}

            </td>


            <td>

                <span
                    class="
                        order-count
                        ${
                            orderData.count
                                ? "has-orders"
                                : ""
                        }
                    "
                >
                    ${orderData.count}
                </span>

            </td>


            <td>

                <strong class="spent">
                    ${money(
                        orderData.spent
                    )}
                </strong>

            </td>

        </tr>
    `;
}


// =========================================================
// TOAST
// =========================================================

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


// =========================================================
// SEARCH EVENT
// =========================================================

searchInput.addEventListener(
    "input",
    renderCustomers
);


// =========================================================
// REFRESH
// =========================================================

refreshBtn.addEventListener(
    "click",
    async () => {

        showLoading();

        try {

            await loadCustomers();

        }

        finally {

            hideLoading();

        }

    }
);


// =========================================================
// LOADING
// =========================================================

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


// =========================================================
// LOGOUT
// =========================================================

document
    .querySelector("#logoutBtn")
    ?.addEventListener(
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


                showToast(
                    "Logout failed.",
                    "error"
                );

            }

        }
    );


// =========================================================
// INITIAL LOAD
// =========================================================

await loadCustomers();