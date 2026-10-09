import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { auth } from "../firebase/firebase.js";

const db = getFirestore(auth.app || undefined);
const isLoginPage = location.pathname.endsWith("admin-login.html");

export async function requireAdmin() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        if (!isLoginPage) location.replace("admin-login.html");
        resolve(null); return;
      }
      try {
        const snap = await getDoc(doc(db, "admins", user.uid));
        const data = snap.data();
        if (!snap.exists() || data?.role !== "admin" || data?.active !== true) {
          await signOut(auth);
          if (!isLoginPage) location.replace("admin-login.html");
          resolve(null); return;
        }
        resolve(user);
      } catch {
        await signOut(auth);
        if (!isLoginPage) location.replace("admin-login.html");
        resolve(null);
      }
    });
  });
}

function bootLogin() {
  const form = document.querySelector("#loginForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const error = document.querySelector("#loginError");
    error.textContent = "";
    try {
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
      const user = auth.currentUser;
      const db2 = getFirestore(auth.app || undefined);
      const snap = await getDoc(doc(db2, "admins", user.uid));
      const data = snap.data();
      if (!snap.exists() || data?.role !== "admin" || data?.active !== true) {
        await signOut(auth);
        throw new Error("This account is not an active admin account.");
      }
      location.replace("dashboard.html");
    } catch (err) {
      error.textContent = err.message || "Login failed.";
    }
  });
}
bootLogin();