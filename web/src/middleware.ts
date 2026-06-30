import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { locales, type Locale } from "@/i18n/types";
import { PRACTICE_VIDEO_REDIRECTS } from "@/lib/practice-video-redirects";

export function middleware(request: NextRequest) {
  const videoMatch = request.nextUrl.pathname.match(/^\/v\/([a-f0-9]{64})$/i);
  if (videoMatch) {
    const replacement = PRACTICE_VIDEO_REDIRECTS[videoMatch[1].toLowerCase()];
    if (replacement) {
      const url = request.nextUrl.clone();
      url.pathname = `/v/${replacement}`;
      return NextResponse.redirect(url, 301);
    }
  }

  const lang = request.nextUrl.searchParams.get("lang");
  const response = NextResponse.next();

  if (lang && locales.includes(lang as Locale)) {
    response.cookies.set("dojo_locale", lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|og|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
