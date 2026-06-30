import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "./types";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("dojo_locale")?.value;
  if (fromCookie && locales.includes(fromCookie as Locale)) {
    return fromCookie as Locale;
  }

  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.trim().split(";")[0]?.split("-")[0]?.toLowerCase();
    if (code && locales.includes(code as Locale)) {
      return code as Locale;
    }
  }

  return defaultLocale;
}
