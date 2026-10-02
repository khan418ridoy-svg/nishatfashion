/* =========================================
   NISHAT FASHION
   FIREBASE.JS
   Firebase SDK 12.2.1
========================================= */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import { doc, getDoc, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// --- CART ---
export async function getFirestoreCart(userId) {
    try {
        const snap = await getDoc(doc(db, "carts", userId));
        return snap.exists() ? (snap.data().items || []) : [];
    } catch { return []; }
}
export async function saveFirestoreCart(userId, items) {
    try {
        await setDoc(doc(db, "carts", userId), { items, updatedAt: new Date() });
    } catch (e) { console.error(e); }
}

// --- WISHLIST ---
export async function getFirestoreWishlist(userId) {
    try {
        const snap = await getDoc(doc(db, "wishlists", userId));
        return snap.exists() ? (snap.data().items || []) : [];
    } catch { return []; }
}
export async function saveFirestoreWishlist(userId, items) {
    try {
        await setDoc(doc(db, "wishlists", userId), { items, updatedAt: new Date() });
    } catch (e) { console.error(e); }
}

// --- CHECKOUT / ORDERS ---
export async function saveFirestoreOrder(userId, orderData) {
    try {
        // orders কালেকশনের ভেতরে ইউজারের আন্ডারে অথবা সরাসরি একটি নতুন অর্ডার ডকুমেন্ট তৈরি হবে
        const orderRef = await addDoc(collection(db, "orders"), {
            userId: userId,
            ...orderData,
            createdAt: new Date()
        });
        return orderRef.id;
    } catch (error) {
        console.error("Order save error:", error);
        throw error;
    }
}
/* =========================================
   FIREBASE CONFIG
========================================= */

const firebaseConfig = {

    apiKey: "AIzaSyDXSDGYVSNzWII98LKJVvPCfRyhlw_18bY",

    authDomain:
        "production-59d81.firebaseapp.com",

    projectId:
        "production-59d81",

    storageBucket:
        "production-59d81.firebasestorage.app",

    messagingSenderId:
        "13000651395",

    appId:
        "1:13000651395:web:d1527a66d2865aa37221b6",

    measurementId:
        "G-RLSC0K0YJK"

};


/* =========================================
   INITIALIZE FIREBASE
========================================= */

const app =
    initializeApp(
        firebaseConfig
    );


/* =========================================
   FIRESTORE
========================================= */

const db =
    getFirestore(
        app
    );


/* =========================================
   AUTH
========================================= */

const auth =
    getAuth(
        app
    );


/* =========================================
   GET CURRENT USER
========================================= */

export function getCurrentUser() {

    return auth.currentUser;

}


/* =========================================
   WAIT FOR AUTH STATE
========================================= */

export function waitForAuthUser() {

    return new Promise(resolve => {

        if (auth.currentUser) {

            resolve(
                auth.currentUser
            );

            return;

        }


        const unsubscribe =
            onAuthStateChanged(
                auth,
                user => {

                    unsubscribe();

                    resolve(user);

                }
            );

    });

}


/* =========================================
   EXPORT
========================================= */

export {
    app,
    db,
    auth
};