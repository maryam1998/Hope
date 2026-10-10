// Firebase (بارگذاری تنبل، ورود، Firestore)
// بخشی از app.jsx قبلی — برای نگهداری‌پذیری به ماژولِ جدا منتقل شد (منطق دست‌نخورده).


// ---------------------------------------------------------------------------
// FIREBASE — real Google accounts + cross-device sync
// -----------------------------------------------------------------------------
// Free (Spark plan) Firebase project gives you both pieces this needs:
//   • Authentication → Google sign-in provider
//   • Firestore      → stores each user's words/stories/history by uid, so
//                       the same Google account sees the same data on any
//                       device/browser, not just this one's localStorage.
//
// ⚠️ TO ENABLE:
//   1. https://console.firebase.google.com → Add project (free)
//   2. Build → Authentication → Sign-in method → enable "Google"
//   3. Build → Firestore Database → Create database → start in production
//      mode, then add this rule so each user can only read/write their own
//      data (Firestore → Rules tab):
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /users/{uid} {
//              allow read, write: if request.auth != null && request.auth.uid == uid;
//            }
//          }
//        }
//   4. Project settings (gear icon) → General → "Your apps" → Web app (</>) →
//      copy the firebaseConfig object and paste its values below.
// Until FIREBASE_CONFIG.apiKey is filled in, the app falls back to local,
// per-device email/password + demo-Google accounts so it still works.
// ---------------------------------------------------------------------------
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
const FIREBASE_ENABLED = !FIREBASE_CONFIG.apiKey.startsWith("YOUR_");
let fbAuth = null;
let fbDb = null;
let fbGoogleProvider = null;
let fbMod = null; // { auth: {...}, firestore: {...} } — the loaded SDK modules
async function ensureFirebase() {
  if (!FIREBASE_ENABLED) return null;
  if (fbAuth && fbDb) return { auth: fbAuth, db: fbDb };
  const [{ initializeApp }, authMod, storeMod] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  fbMod = { auth: authMod, firestore: storeMod };
  const app = initializeApp(FIREBASE_CONFIG);
  fbAuth = authMod.getAuth(app);
  fbDb = storeMod.getFirestore(app);
  fbGoogleProvider = new authMod.GoogleAuthProvider();
  return { auth: fbAuth, db: fbDb };
}
async function firebaseSignInWithGoogle() {
  const { auth } = await ensureFirebase();
  const cred = await fbMod.auth.signInWithPopup(auth, fbGoogleProvider);
  const u = cred.user;
  return { uid: u.uid, email: u.email, name: u.displayName || u.email, picture: u.photoURL || "", provider: "google" };
}
async function firebaseSignOut() {
  if (!fbAuth) return;
  try {
    await fbMod.auth.signOut(fbAuth);
  } catch {}
}
// Loads this user's synced state from Firestore (users/{uid}), or null if
// there's nothing there yet (first time this account has been used).
async function firestoreLoadState(uid) {
  if (!FIREBASE_ENABLED || !uid) return null;
  try {
    const { db } = await ensureFirebase();
    const ref = fbMod.firestore.doc(db, "users", uid);
    const snap = await fbMod.firestore.getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null; // offline, rules not set up yet, etc. — local storage still works
  }
}
async function firestoreSaveState(uid, data) {
  if (!FIREBASE_ENABLED || !uid) return;
  try {
    const { db } = await ensureFirebase();
    const ref = fbMod.firestore.doc(db, "users", uid);
    await fbMod.firestore.setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    // no network / not signed in yet — the local copy is still saved
  }
}
