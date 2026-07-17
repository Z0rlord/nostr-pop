"use client";

import { useEffect, useState } from "react";
import {
  partitionDojosByGroup,
  sortDojosByGroup,
} from "@/lib/dojo-groups";

type DojoOption = { id: string; name: string; code?: string | null };

export function DojoSwitcher() {
  const [dojos, setDojos] = useState<DojoOption[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/staff/dojos");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setDojos(sortDojosByGroup(data.dojos || []));
        setActiveId(data.activeDojoId || "");
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || dojos.length <= 1) return null;

  const { japan, keikokai, foreign } = partitionDojosByGroup(dojos);

  const onChange = async (dojoId: string) => {
    setActiveId(dojoId);
    const res = await fetch("/api/staff/dojos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dojoId }),
    });
    if (res.ok) {
      window.location.reload();
    }
  };

  const optionLabel = (d: DojoOption) =>
    d.code ? `${d.code} — ${d.name}` : d.name;

  return (
    <label className="dojo-switcher text-xs flex items-center gap-2">
      <span className="text-muted-foreground whitespace-nowrap">School</span>
      <select
        value={activeId}
        onChange={(e) => onChange(e.target.value)}
        className="border border-border bg-white text-sm px-2 py-1 max-w-[16rem]"
        style={{ borderRadius: "var(--radius-button)" }}
        aria-label="Active school"
      >
        {japan.length > 0 && (
          <optgroup label="Japan branches (支部)">
            {japan.map((d) => (
              <option key={d.id} value={d.id}>
                {optionLabel(d)}
              </option>
            ))}
          </optgroup>
        )}
        {keikokai.length > 0 && (
          <optgroup label="Global Keikokai (稽古会)">
            {keikokai.map((d) => (
              <option key={d.id} value={d.id}>
                {optionLabel(d)}
              </option>
            ))}
          </optgroup>
        )}
        {foreign.length > 0 && (
          <optgroup label="Foreign schools (海外)">
            {foreign.map((d) => (
              <option key={d.id} value={d.id}>
                {optionLabel(d)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}
