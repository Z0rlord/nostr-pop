import { NextRequest } from "next/server";

// Key-based superadmin auth, same convention as /api/superadmin/dashboard.
export function isSuperadminKey(req: NextRequest): boolean {
  const key = process.env.SUPERADMIN_KEY;
  if (!key) return false;
  const header = req.headers.get("x-superadmin-key");
  return !!header && header === key;
}
