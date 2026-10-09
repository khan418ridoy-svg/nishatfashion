/* =========================================================
   NISHAT FASHION
   ORDER SUCCESS PAGE

   FIRESTORE:
   users/{uid}/orders/{orderId}

   FALLBACK:
   sessionStorage
========================================================= */

import {
    db,
    waitForAuthUser
} from "../firebase/firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   DOM
========================================================= */

const $ = id =>
    document.getElementById(id);


const orderIdElement =
    $("orderId");

const copyOrderIdBtn =
    $("copyOrderId");

const orderStatusElement =
    $("orderStatus");

const customerNameElement =
    $("customerName");

const customerPhoneElement =
    $("customerPhone");

const customerDistrictElement =
    $("customerDistrict");

const customerThanaElement =
    $("customerThana");

const customerAddressElement =
    $("customerAddress");

const orderItemsElement =
    $("orderItems");

const subtotalElement =
    $("subtotal");

const deliveryChargeElement =
    $("deliveryCharge");

const discountElement =
    $("discount");

const discountRow =
    $("discountRow");

const grandTotalElement =
    $("grandTotal");

const paymentMethodElement =
    $("paymentMethod");

const toast =
    $("successToast");


/* =========================================================
   STATE
========================================================= */

let orderData = null;

let currentUser = null;


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        /*
         * Auth is used so that another user cannot
         * simply open an order-success URL and read
         * someone else's Firestore order.
         */

        currentUser =
            await waitForAuthUser();


        if (!currentUser) {

            window.location.href =
                "../login/index.html";

            return;
        }


        /*
         * First get order ID
         */

        const orderId =
            sessionStorage.getItem(
                "nishat_order_id"
            );


        if (!orderId) {

            /*
             * Try local draft
             */

            orderData =
                getSessionOrder();


            if (!orderData) {

                showNoOrder();

                return;
            }

        } else {

            /*
             * Firestore source of truth
             */

            orderData =
                await loadOrderFromFirestore(
                    orderId
                );


            /*
             * Fallback to sessionStorage
             */

            if (!orderData) {

                orderData =
                    getSessionOrder();
            }


            if (!orderData) {

                showNoOrder();

                return;
            }
        }


        renderOrder();

        setupEvents();


    } catch (error) {

        console.error(
            "Order success page error:",
            error
        );


        /*
         * Session fallback
         */

        orderData =
            getSessionOrder();


        if (orderData) {

            renderOrder();
            setupEvents();

        } else {

            showNoOrder();
        }
    }
}


/* =========================================================
   LOAD ORDER FROM FIRESTORE
========================================================= */

async function loadOrderFromFirestore(
    orderId
) {

    if (
        !currentUser ||
        !orderId
    ) {

        return null;
    }


    try {

        const orderRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "orders",
                orderId
            );


        const snapshot =
            await getDoc(
                orderRef
            );


        if (
            !snapshot.exists()
        ) {

            return null;
        }


        return {

            ...snapshot.data(),

            orderId:
                snapshot.id

        };


    } catch (error) {

        console.error(
            "Order Firestore load error:",
            error
        );

        return null;
    }
}


/* =========================================================
   SESSION FALLBACK
========================================================= */

function getSessionOrder() {

    try {

        const data =
            JSON.parse(
                sessionStorage.getItem(
                    "nishat_checkout_draft"
                ) || "null"
            );


        if (
            !data ||
            typeof data !== "object"
        ) {

            return null;
        }


        return data;

    } catch (error) {

        console.error(
            "Session order error:",
            error
        );

        return null;
    }
}


/* =========================================================
   RENDER ORDER
========================================================= */

function renderOrder() {

    if (!orderData) {
        return;
    }


    /* -----------------------------------------
       ORDER ID
    ----------------------------------------- */

    const orderId =
        orderData.orderId ||
        sessionStorage.getItem(
            "nishat_order_id"
        ) ||
        "—";


    if (orderIdElement) {

        orderIdElement.textContent =
            orderId;
    }


    /* -----------------------------------------
       STATUS
    ----------------------------------------- */

    const status =
        orderData.orderStatus ||
        "pending";


    if (orderStatusElement) {

        orderStatusElement.textContent =
            formatStatus(
                status
            );
    }


    /* -----------------------------------------
       CUSTOMER
    ----------------------------------------- */

    const customer =
        orderData.customer ||
        {};


    if (customerNameElement) {

        customerNameElement.textContent =
            customer.name ||
            "—";
    }


    if (customerPhoneElement) {

        customerPhoneElement.textContent =
            customer.phone ||
            "—";
    }


    if (customerDistrictElement) {

        customerDistrictElement.textContent =
            customer.district ||
            "—";
    }


    if (customerThanaElement) {

        customerThanaElement.textContent =
            customer.thana ||
            "—";
    }


    if (customerAddressElement) {

        customerAddressElement.textContent =
            customer.address ||
            "—";
    }


    /* -----------------------------------------
       ITEMS
    ----------------------------------------- */

    renderItems(
        orderData.items ||
        []
    );


    /* -----------------------------------------
       PRICING
    ----------------------------------------- */

    const pricing =
        orderData.pricing ||
        {};


    const subtotal =
        Number(
            pricing.subtotal ||
            0
        );


    const delivery =
        Number(
            pricing.deliveryCharge ||
            0
        );


    const discount =
        Number(
            pricing.discount ||
            0
        );


    const total =
        Number(
            pricing.total ??
            (
                subtotal +
                delivery -
                discount
            )
        );


    if (subtotalElement) {

        subtotalElement.textContent =
            formatPrice(
                subtotal
            );
    }


    if (deliveryChargeElement) {

        deliveryChargeElement.textContent =
            formatPrice(
                delivery
            );
    }


    if (discountElement) {

        discountElement.textContent =
            "-" +
            formatPrice(
                discount
            );
    }


    if (discountRow) {

        discountRow.style.display =
            discount > 0
                ? "flex"
                : "none";
    }


    if (grandTotalElement) {

        grandTotalElement.textContent =
            formatPrice(
                total
            );
    }


    /* -----------------------------------------
       PAYMENT
    ----------------------------------------- */

    const payment =
        orderData.payment ||
        {};


    if (paymentMethodElement) {

        paymentMethodElement.textContent =
            formatPaymentMethod(
                payment.method
            );
    }
}


/* =========================================================
   RENDER ITEMS
========================================================= */

function renderItems(
    items
) {

    if (!orderItemsElement) {
        return;
    }


    if (
        !Array.isArray(items) ||
        !items.length
    ) {

        orderItemsElement.innerHTML = `

            <div class="empty-order-items">

                No item information available.

            </div>

        `;

        return;
    }


    orderItemsElement.innerHTML =
        items
            .map(
                item => {

                    const name =
                        item.name ||
                        "Product";


                    const image =
                        item.image ||
                        "../asset/logo.png";


                    const price =
                        Number(
                            item.price ||
                            0
                        );


                    const quantity =
                        Math.max(
                            1,
                            Number(
                                item.quantity ||
                                1
                            )
                        );


                    const total =
                        price *
                        quantity;


                    const size =
                        item.size || "";


                    const color =
                        item.color || "";


                    return `

                        <div class="success-item">


                            <div
                                class="success-item-image"
                            >

                                <img
                                    src="${escapeHTML(image)}"
                                    alt="${escapeHTML(name)}"
                                    onerror="
                                        this.onerror=null;
                                        this.src='../asset/logo.png';
                                    "
                                >

                            </div>


                            <div
                                class="success-item-info"
                            >

                                <h3
                                    class="success-item-name"
                                >
                                    ${escapeHTML(name)}
                                </h3>


                                <div
                                    class="success-item-meta"
                                >

                                    ${formatItemMeta(
                                        size,
                                        color,
                                        quantity
                                    )}

                                </div>

                            </div>


                            <strong
                                class="success-item-price"
                            >

                                ${formatPrice(total)}

                            </strong>


                        </div>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   ITEM META
========================================================= */

function formatItemMeta(
    size,
    color,
    quantity
) {

    const parts = [];


    if (size) {

        parts.push(
            `Size: ${escapeHTML(size)}`
        );
    }


    if (color) {

        parts.push(
            `Color: ${escapeHTML(color)}`
        );
    }


    parts.push(
        `Qty: ${quantity}`
    );


    return parts.join(
        " • "
    );
}


/* =========================================================
   PAYMENT FORMAT
========================================================= */

function formatPaymentMethod(
    method
) {

    if (!method) {
        return "—";
    }


    const value =
        String(
            method
        ).toLowerCase();


    if (
        value === "bkash"
    ) {

        return "bKash";
    }


    if (
        value === "cod"
    ) {

        return "Cash on Delivery";
    }


    if (
        value === "cash_on_delivery"
    ) {

        return "Cash on Delivery";
    }


    return method;
}


/* =========================================================
   STATUS FORMAT
========================================================= */

function formatStatus(
    status
) {

    const value =
        String(
            status ||
            "pending"
        )
            .replace(
                /_/g,
                " "
            );


    return value
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


/* =========================================================
   FORMAT PRICE
========================================================= */

function formatPrice(
    value
) {

    return (
        "৳" +
        Number(
            value || 0
        ).toLocaleString(
            "en-BD"
        )
    );
}


/* =========================================================
   COPY ORDER ID
========================================================= */

function setupEvents() {

    copyOrderIdBtn?.addEventListener(
        "click",
        copyOrderId
    );
}


async function copyOrderId() {

    const orderId =
        orderIdElement?.textContent
            ?.trim();


    if (
        !orderId ||
        orderId === "—"
    ) {

        return;
    }


    try {

        await navigator.clipboard.writeText(
            orderId
        );


        showToast(
            "Order ID copied"
        );


    } catch (error) {

        /*
         * Fallback for older browsers
         */

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            orderId;


        textarea.style.position =
            "fixed";

        textarea.style.opacity =
            "0";


        document.body.appendChild(
            textarea
        );


        textarea.select();


        document.execCommand(
            "copy"
        );


        textarea.remove();


        showToast(
            "Order ID copied"
        );
    }
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(
    message
) {

    if (!toast) {
        return;
    }


    const text =
        toast.querySelector(
            "span"
        );


    if (text) {

        text.textContent =
            message;
    }


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );
}


/* =========================================================
   NO ORDER
========================================================= */

function showNoOrder() {

    if (orderIdElement) {

        orderIdElement.textContent =
            "No order found";
    }


    if (orderStatusElement) {

        orderStatusElement.textContent =
            "Unavailable";
    }


    if (customerNameElement) {

        customerNameElement.textContent =
            "—";
    }


    if (customerPhoneElement) {

        customerPhoneElement.textContent =
            "—";
    }


    if (customerDistrictElement) {

        customerDistrictElement.textContent =
            "—";
    }


    if (customerThanaElement) {

        customerThanaElement.textContent =
            "—";
    }


    if (customerAddressElement) {

        customerAddressElement.textContent =
            "—";
    }


    if (orderItemsElement) {

        orderItemsElement.innerHTML = `

            <div
                style="
                    padding:20px 0;
                    text-align:center;
                    color:#888;
                    font-size:13px;
                "
            >

                Order information is not available.

                <br><br>

                <a
                    href="../account/account.html"
                    style="
                        color:#111;
                        font-weight:700;
                    "
                >
                    Go to My Account
                </a>

            </div>

        `;
    }
}


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