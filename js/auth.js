// ── FIREBASE CONFIG ──
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBl1xDUshkJEOrGTbmCGpbNcIi1pHEtDYA",
  authDomain: "riya-ai-2c24e.firebaseapp.com",
  projectId: "riya-ai-2c24e",
  storageBucket: "riya-ai-2c24e.firebasestorage.app",
  messagingSenderId: "395591480225",
  appId: "1:395591480225:web:b012598639e0c347d911e0"
};

const BACKEND = "https://riya-backend-ujz7.onrender.com";

// ── STATE ──
let currentUser = null;
let userPlan = "free";
let userName = "there";
let userPhotoURL = null;

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(FIREBASE_CONFIG);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Optional: Force Local Persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(console.error);

// ── AUTH LISTENER ──
// This runs on every page load to securely check login state
auth.onAuthStateChanged(async (user) => {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.endsWith('/') || currentPath.endsWith('index.html');

  if (user) {
    currentUser = user;
    userName = user.displayName?.split(" ")[0] || "there";
    userPhotoURL = user.photoURL;

    // Load Plan
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        userPlan = doc.data().plan || "free";
      } else {
        await db.collection("users").doc(user.uid).set({
          name: user.displayName,
          email: user.email,
          plan: "free",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch(e) {
      console.log("Firestore Error:", e.message);
    }

    // If logged in and on index page, redirect to dashboard
    if (isLoginPage) {
      window.location.href = "pages/dashboard.html";
    } else {
      // We are on an app page (dashboard/chat). Trigger a custom event so the page knows to populate user info
      document.dispatchEvent(new CustomEvent('authReady'));
    }
  } else {
    // If NOT logged in and trying to access a secure app page, redirect to index
    if (!isLoginPage) {
      window.location.href = "../index.html";
    } else {
      // We are on index and not logged in. Ensure auth screen is visible.
      const authScreen = document.getElementById("authScreen");
      if (authScreen) authScreen.classList.remove("hide");
    }
  }
});

function handleGoogleLogin() {
  const errDiv = document.getElementById("authErr");
  if (errDiv) errDiv.style.display = "none";
  
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(e => {
    if (errDiv) {
      errDiv.textContent = e.message || "Sign in failed. Try again.";
      errDiv.style.display = "block";
    }
  });
}

function handleSignOut() {
  auth.signOut().then(() => {
    window.location.href = "../index.html";
  });
}
