import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Firebase Auth requires HTTPS redirect URLs; Cloudflare still serves plain HTTP.
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("host") || "";
  const isInternal =
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("0.0.0.0");

  if (proto === "http" && host && !isInternal) {
    const hostname = host.split(":")[0];
    const httpsUrl = new URL(
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
      `https://${hostname}`,
    );
    return NextResponse.redirect(httpsUrl, 308);
  }

  const isPublic =
    pathname === "/" ||
    pathname === "/home" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/student") ||
    pathname.startsWith("/api/classes") ||
    pathname.startsWith("/api/checkin") ||
    pathname.startsWith("/api/attendance") ||
    pathname.startsWith("/api/notifications") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/instructor") ||
    pathname.startsWith("/api/tiers") ||
    pathname.startsWith("/api/paypal/webhook") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/superadmin") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/wiki") ||
    pathname.startsWith("/rules") ||
    pathname.startsWith("/member") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/__/auth") ||
    pathname.startsWith("/__/firebase") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".json") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js";

  if (isPublic) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  const session = req.cookies.get("session")?.value;
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
