"use client";

import { useEffect, useState } from "react";
import {
  isJapanBranchDojo,
  partitionDojosByGroup,
} from "@/lib/dojo-groups";

type DojoRow = {
  id: string;
  name: string;
  code?: string | null;
  location?: string | null;
};

function SchoolList({
  rows,
  activeId,
  onSwitch,
}: {
  rows: DojoRow[];
  activeId: string;
  onSwitch: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {rows.map((d) => (
        <li key={d.id}>
          <button
            type="button"
            onClick={() => onSwitch(d.id)}
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
  );
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

  const { japan, keikokai, foreign } = partitionDojosByGroup(dojos);
  const japanSorted = [...japan].sort((a, b) => {
    if (isJapanBranchDojo(a) && a.code === "HQ") return -1;
    if (isJapanBranchDojo(b) && b.code === "HQ") return 1;
    return a.name.localeCompare(b.name);
  });
  const foreignSorted = [...foreign].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

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
          Japan branches, Global Keikokai, and foreign schools. Switch to manage
          that school.
        </p>
      </div>

      {japanSorted.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground mb-2">
            JAPAN BRANCHES
          </p>
          <SchoolList rows={japanSorted} activeId={activeId} onSwitch={switchTo} />
        </div>
      )}

      {keikokai.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground mb-2">
            GLOBAL KEIKOKAI
          </p>
          <SchoolList rows={keikokai} activeId={activeId} onSwitch={switchTo} />
        </div>
      )}

      {foreignSorted.length > 0 && (
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground mb-2">
            FOREIGN SCHOOLS
          </p>
          <SchoolList
            rows={foreignSorted}
            activeId={activeId}
            onSwitch={switchTo}
          />
        </div>
      )}
    </div>
  );
}
