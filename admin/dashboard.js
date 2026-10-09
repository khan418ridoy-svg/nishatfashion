import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { app, db } from "../firebase/firebase.js";

const auth = getAuth(app);
const $ = (id) => document.getElementById(id);

const totalOrdersEl = $("totalOrders");
const pendingOrdersEl = $("pendingOrders");
const deliveredOrdersEl = $("deliveredOrders");
const totalCustomersEl = $("totalCustomers");
const totalProductsEl = $("totalProducts");
const lowStockEl = $("lowStock");
const salesRevenueEl = $("salesRevenue");
const profitEl = $("profit");
const recentOrdersEl = $("recentOrders");
const adminEmailEl = $("adminEmail");
const logoutBtn = $("logoutBtn");
const refreshBtn = $("refreshBtn");
const dashboardLoading = $("dashboardLoading");
const ordersError = $("ordersError");
const clickLoading = $("clickLoading");

const money = (value) =>
    `৳${Number(value || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;

function timestampValue(value) {
    if (!value) return 0;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (value?.seconds) return Number(value.seconds) * 1000;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getOrderStatus(order) {
    return String(
        order.orderStatus ?? order.status ?? order.order_status ?? "pending"
    ).toLowerCase().trim();
}

function getOrderTotal(order) {
    const pricing = order.pricing || {};
    return Number(
        pricing.total ?? order.total ?? order.grandTotal ?? order.amount ?? 0
    );
}

function getCustomerKey(order) {
    const customer = order.customer || {};
    return String(
        customer.phone ||
        customer.email ||
        customer.uid ||
        customer.userId ||
        customer.name ||
        order.userId ||
        order.uid ||
        order.orderId ||
        ""
    ).trim().toLowerCase();
}

function getCustomerName(order) {
    const customer = order.customer || {};
    return customer.name || customer.fullName || customer.email ||
        customer.phone || "Guest";
}

function getOrderId(order, fallback) {
    return String(order.orderId || order.id || fallback || "Order");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function calculateProfit(orders) {
    let profit = 0;
    let hasCostData = false;

    for (const order of orders) {
        const items = Array.isArray(order.items) ? order.items : [];

        for (const item of items) {
            const qty = Number(item.quantity || 1);
            const salePrice = Number(item.price || 0);
            const costPrice = Number(
                item.costPrice ?? item.cost ?? item.purchasePrice ?? 0
            );

            if (
                Object.prototype.hasOwnProperty.call(item, "costPrice") ||
                Object.prototype.hasOwnProperty.call(item, "cost") ||
                Object.prototype.hasOwnProperty.call(item, "purchasePrice")
            ) {
                hasCostData = true;
                profit += (salePrice - costPrice) * qty;
            }
        }
    }

    return { profit, hasCostData };
}

function renderRecentOrders(orders) {
    recentOrdersEl.innerHTML = "";

    if (!orders.length) {
        recentOrdersEl.innerHTML =
            '<tr><td colspan="4" class="table-empty">No orders found.</td></tr>';
        return;
    }

    orders.slice(0, 8).forEach((order, index) => {
        const status = getOrderStatus(order);
        const statusClass = `status-${status.replace(/\s+/g, "-")}`;
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><span class="order-id">${escapeHtml(getOrderId(order, `#${index + 1}`))}</span></td>
            <td><span class="customer-name">${escapeHtml(getCustomerName(order))}</span></td>
            <td><span class="status-badge ${statusClass}">${escapeHtml(status)}</span></td>
            <td>${money(getOrderTotal(order))}</td>
        `;

        recentOrdersEl.appendChild(tr);
    });
}

async function loadDashboard() {
    dashboardLoading?.classList.remove("hidden");
    ordersError?.classList.add("hidden");
    if (refreshBtn) refreshBtn.disabled = true;

    try {
        const [ordersSnap, productsSnap] = await Promise.all([
            getDocs(collection(db, "orders")),
            getDocs(collection(db, "products"))
        ]);

        const orders = ordersSnap.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort(
                (a, b) =>
                    timestampValue(b.createdAt || b.updatedAt) -
                    timestampValue(a.createdAt || a.updatedAt)
            );

        const products = productsSnap.docs.map((item) => ({
            id: item.id, ...item.data()
        }));

        const pendingStatuses = new Set(["pending", "processing", "confirmed"]);
        const deliveredStatuses = new Set(["delivered", "completed"]);
        const cancelledStatuses = new Set(["cancelled", "canceled", "rejected"]);

        const pendingCount = orders.filter((o) =>
            pendingStatuses.has(getOrderStatus(o))
        ).length;

        const deliveredCount = orders.filter((o) =>
            deliveredStatuses.has(getOrderStatus(o))
        ).length;

        const revenue = orders
            .filter((o) => !cancelledStatuses.has(getOrderStatus(o)))
            .reduce((sum, o) => sum + getOrderTotal(o), 0);

        const customerKeys = new Set(
            orders.map(getCustomerKey).filter(Boolean)
        );

        const lowStock = products.filter((product) => {
            const stock = Number(product.stock ?? 0);
            return stock <= 5 && product.active !== false;
        }).length;

        const profitData = calculateProfit(orders);

        totalOrdersEl.textContent = orders.length.toLocaleString("en-BD");
        pendingOrdersEl.textContent = pendingCount.toLocaleString("en-BD");
        deliveredOrdersEl.textContent = deliveredCount.toLocaleString("en-BD");
        totalCustomersEl.textContent = customerKeys.size.toLocaleString("en-BD");
        totalProductsEl.textContent = products.length.toLocaleString("en-BD");
        lowStockEl.textContent = lowStock.toLocaleString("en-BD");
        salesRevenueEl.textContent = money(revenue);
        profitEl.textContent = profitData.hasCostData ? money(profitData.profit) : "৳0";

        renderRecentOrders(orders);

    } catch (error) {
        console.error("Dashboard loading error:", error);

        ordersError.textContent =
            "Dashboard data could not be loaded. Check Firestore rules and the browser console.";
        ordersError.classList.remove("hidden");

        recentOrdersEl.innerHTML =
            '<tr><td colspan="4" class="table-empty">Unable to load dashboard data.</td></tr>';
    } finally {
        dashboardLoading?.classList.add("hidden");
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

async function verifyAdmin(user) {
    if (!user) {
        window.location.replace("admin-login.html");
        return false;
    }

    const adminSnap = await getDoc(doc(db, "admins", user.uid));

    if (!adminSnap.exists()) {
        await signOut(auth);
        window.location.replace("admin-login.html");
        return false;
    }

    const adminData = adminSnap.data();

    if (adminData.role !== "admin" || adminData.active !== true) {
        await signOut(auth);
        window.location.replace("admin-login.html");
        return false;
    }

    if (adminEmailEl) adminEmailEl.textContent = user.email || "Admin";
    return true;
}

onAuthStateChanged(auth, async (user) => {
    try {
        if (!(await verifyAdmin(user))) return;
        await loadDashboard();
    } catch (error) {
        console.error("Admin verification error:", error);
        await signOut(auth);
        window.location.replace("admin-login.html");
    }
});

logoutBtn?.addEventListener("click", async () => {
    clickLoading?.classList.remove("hidden");
    try {
        await signOut(auth);
        window.location.replace("admin-login.html");
    } catch (error) {
        console.error("Logout error:", error);
        clickLoading?.classList.add("hidden");
    }
});

refreshBtn?.addEventListener("click", loadDashboard);
