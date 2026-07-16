import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";

let adminApp: App | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
  adminApp = initializeApp({ credential: cert(JSON.parse(json)) });
  return adminApp;
}

/** Create or update a Firebase email/password user. Returns uid. */
export async function upsertFirebaseEmailUser(params: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<string> {
  const auth = getAuth(getAdminApp());
  const email = params.email.toLowerCase().trim();
  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, {
      password: params.password,
      displayName: params.displayName || existing.displayName,
      emailVerified: true,
    });
    return existing.uid;
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code !== "auth/user-not-found") throw e;
    const created = await auth.createUser({
      email,
      password: params.password,
      displayName: params.displayName,
      emailVerified: true,
    });
    return created.uid;
  }
}
