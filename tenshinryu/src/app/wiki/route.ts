import { NextRequest, NextResponse } from "next/server";
import { localeFromCookie, wikiHomeUrl } from "@/lib/wiki";

/** Locale-aware redirect to the public Hyoho wiki (wiki.tenshinryu.xyz). */
export function GET(req: NextRequest) {
  const locale = localeFromCookie(req.cookies.get("locale")?.value);
  return NextResponse.redirect(wikiHomeUrl(locale), 302);
}
