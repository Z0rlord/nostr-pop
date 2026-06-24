import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  browserLocalPersistence,
  setPersistence,
  type Auth,
} from "firebase/auth";

function appId(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID_ ||
    ""
  );
}

function normalizeAuthDomain(domain: string | undefined): string {
  const cleaned = domain?.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
  return cleaned || "auth.tenshinryu.xyz";
}

/** Prefer runtime domain injected in layout (survives stale PWA caches). */
export function getAuthDomain(): string {
  if (typeof window !== "undefined") {
    const injected = (window as Window & { __TENSHINRYU_AUTH_DOMAIN__?: string })
      .__TENSHINRYU_AUTH_DOMAIN__;
    if (injected) return normalizeAuthDomain(injected);
  }
  return normalizeAuthDomain(
    process.env.TENSHINRYU_FIREBASE_AUTH_DOMAIN ||
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  );
}

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: getAuthDomain(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: appId(),
  };
}

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;

export function getAuthInstance(): Auth {
  if (typeof window === "undefined") {
    throw new Error("Firebase auth is only available in the browser");
  }
  if (!firebaseAuth) {
    firebaseApp = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
    firebaseAuth = getAuth(firebaseApp);
    setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {});
  }
  return firebaseAuth;
}

function bindAuth<T extends object>(target: T): T {
  return new Proxy(target, {
    get(_target, prop) {
      const auth = getAuthInstance();
      const value = Reflect.get(auth, prop, auth);
      return typeof value === "function" ? value.bind(auth) : value;
    },
  });
}

export const auth = bindAuth({} as Auth);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
googleProvider.setCustomParameters({ prompt: "select_account" });

const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

export async function signInWithGoogle() {
  const result = await signInWithPopup(getAuthInstance(), googleProvider);
  return result.user;
}

export async function signInWithApple() {
  const result = await signInWithPopup(getAuthInstance(), appleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(getAuthInstance());
}

export function getFirebaseApp(): FirebaseApp {
  getAuthInstance();
  return firebaseApp!;
}

export { googleProvider, appleProvider };
