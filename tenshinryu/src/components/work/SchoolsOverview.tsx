"use client";

import { useEffect, useState } from "react";

type DojoRow = {
  id: string;
  name: string;
  code?: string | null;
  location?: string | null;
};

function isKeikokai(d: DojoRow) {
  const code = (d.code || "").toUpperCase();
  return code === "KEIKOKAI" || code === "INTL" || code === "GLOBAL";
}

export function SchoolsOverview() {
  const [dojos, setDojos] = useState<DojoRow[]>([]);
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
        setDojos(data.dojos || []);
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

  if (loading || dojos.length === 0) return null;

  const japan = dojos
    .filter((d) => !isKeikokai(d))
    .sort((a, b) => {
      if (a.code === "HQ") return -1;
      if (b.code === "HQ") return 1;
      return a.name.localeCompare(b.name);
    });
  const global = dojos.filter(isKeikokai);

  const switchTo = async (dojoId: string) => {
    if (dojoId === activeId) return;
    const res = await fetch("/api/staff/dojos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dojoId }),
    });
    if (res.ok) window.location.reload();
  };

  return (
    <div className="card space-y-4">
      <div>
        <h3 className="card-title text-base">Schools</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Japan branches (支部) and Global Keikokai (稽古会). Switch to manage that school.
        </p>
      </div>

      <div>
        <p className="text-xs font-bold tracking-wide text-muted-foreground mb-2">
          JAPAN BRANCHES
        </p>
        <ul className="space-y-2">
          {japan.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => switchTo(d.id)}
                className={`w-full text-left px-3 py-2 border transition ${
                  d.id === activeId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
                style={{ borderRadius: "var(--radius-button)" }}
              >
                <span className="font-medium text-sm">
                  {d.code ? `${d.code} · ` : ""}
                  {d.name}
                </span>
                {d.location && (
                  <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {d.location}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {global.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground mb-2">
            GLOBAL KEIKOKAI
          </p>
          <ul className="space-y-2">
            {global.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => switchTo(d.id)}
                  className={`w-full text-left px-3 py-2 border transition ${
                    d.id === activeId
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                  style={{ borderRadius: "var(--radius-button)" }}
                >
                  <span className="font-medium text-sm">
                    {d.code ? `${d.code} · ` : ""}
                    {d.name}
                  </span>
                  {d.location && (
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {d.location}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
