import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";

let firebaseApp: App | undefined;

function getFirebaseApp(): App | undefined {
  if (firebaseApp) return firebaseApp;
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_JSON not set");
    return undefined;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
    return firebaseApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    return undefined;
  }
}

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

export async function verifyAuth(req: NextRequest): Promise<AuthResult> {
  try {
    const app = getFirebaseApp();
    if (!app) {
      return { 
        authenticated: false, 
        error: "Authentication service unavailable" 
      };
    }

    const authHeader = req.headers.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return { authenticated: false, error: "Missing or invalid authorization header" };
    }

    const token = authHeader.split("Bearer ")[1];
    
    if (!token) {
      return { authenticated: false, error: "No token provided" };
    }

    // Verify the Firebase ID token
    const decodedToken = await getAuth(app).verifyIdToken(token);
    
    return {
      authenticated: true,
      userId: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    return { 
      authenticated: false, 
      error: error instanceof Error ? error.message : "Authentication failed" 
    };
  }
}

// Middleware wrapper for API routes
export function withAuth(
  handler: (req: NextRequest, auth: AuthResult) => Promise<Response>
) {
  return async (req: NextRequest): Promise<Response> => {
    const auth = await verifyAuth(req);
    
    if (!auth.authenticated) {
      return new Response(
        JSON.stringify({ error: auth.error || "Unauthorized", code: "UNAUTHORIZED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return handler(req, auth);
  };
}

// Helper for NextResponse-based routes
export function createUnauthorizedResponse(error: string): NextResponse {
  return NextResponse.json(
    { error, code: "UNAUTHORIZED" },
    { status: 401 }
  );
}
