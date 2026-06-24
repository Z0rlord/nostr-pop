"use client";

import { ReactNode } from "react";

// Simple auth provider - no next-auth dependency
// Firebase auth is handled directly in components
export default function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
