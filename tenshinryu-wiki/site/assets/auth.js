/* Tenshinryu wiki sign-in. Firebase Auth, project "dojopop": the same project
   (and so the same account ids) as the KIWAMI app at app.tenshinryu.xyz.
   Loaded on demand by learn.js, only on Learn pages.
   The values below are the public web config, not secrets. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, OAuthProvider, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

var app = initializeApp({
  apiKey: "AIzaSyB0BtSJ2FueSXrrE2TiJZ5OVePHTOebHYc",
  authDomain: "auth.tenshinryu.xyz",
  projectId: "dojopop",
  storageBucket: "dojopop.firebasestorage.app",
  messagingSenderId: "1074321976236",
  appId: "1:1074321976236:web:444cb8ee93aecdccd7e809"
});
var auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(function () {});

var google = new GoogleAuthProvider();
google.addScope("email");
google.addScope("profile");
google.setCustomParameters({ prompt: "select_account" });
var apple = new OAuthProvider("apple.com");
apple.addScope("email");
apple.addScope("name");

export function onUser(cb) { return onAuthStateChanged(auth, cb); }
export function signInGoogle() { return signInWithPopup(auth, google); }
export function signInApple() { return signInWithPopup(auth, apple); }
export function signOutUser() { return signOut(auth); }
export function getToken() {
  var u = auth.currentUser;
  return u ? u.getIdToken() : Promise.resolve(null);
}
