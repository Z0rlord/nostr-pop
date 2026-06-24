"use client";

import { useEffect } from "react";

export function PracticeViewTracker({ eventId }: { eventId: string }) {
  useEffect(() => {
    void fetch("/api/practice/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    }).catch(() => {});
  }, [eventId]);

  return null;
}
