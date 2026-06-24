"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { connectNip07 } from "@/lib/nip07";
import { presentHexToNpubs, type ClassAttendanceRecord } from "@/lib/class-attendance";
import { truncateNpub } from "@/lib/practice-events";

export default function SchoolDashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const [npub, setNpub] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [role, setRole] = useState<string>("");
  const [records, setRecords] = useState<ClassAttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(npubValue: string) {
    setError(null);
    const rosterRes = await fetch(
      `/api/schools/${params.id}/roster?npub=${encodeURIComponent(npubValue)}`
    );
    if (!rosterRes.ok) {
      setError("Members only — join at the dojo QR first.");
      return;
    }
    const roster = await rosterRes.json();
    setSchoolName(roster.school.name);
    setRole(roster.role);

    const attRes = await fetch(
      `/api/schools/${params.id}/attendance?npub=${encodeURIComponent(npubValue)}`
    );
    if (attRes.ok) {
      const data = await attRes.json();
      setRecords(data.records || []);
    }
  }

  async function connect() {
    const identity = await connectNip07();
    if (!identity) {
      setError("Connect a Nostr browser extension to view this dojo log.");
      return;
    }
    setNpub(identity.npub);
    await load(identity.npub);
  }

  useEffect(() => {
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl text-white">
            {schoolName || "Dojo attendance"}
          </h1>
          <p className="mt-2 text-sm text-dojo-mist/60">
            Members-only class log · encrypted on Nostr
          </p>

          {error && (
            <p className="mt-6 rounded-xl border border-dojo-crimson/30 bg-dojo-crimson/10 p-4 text-sm">
              {error}{" "}
              <Link
                href={`/school/${params.id}/join`}
                className="text-dojo-gold hover:underline"
              >
                Join roster
              </Link>
            </p>
          )}

          {npub && !error && (
            <>
              {(role === "owner" || role === "instructor") && (
                <Link
                  href={`/school/${params.id}/attendance`}
                  className="mt-6 inline-block rounded-full bg-dojo-crimson px-5 py-2 text-sm text-white hover:bg-red-700"
                >
                  Log class attendance
                </Link>
              )}

              <div className="mt-10 space-y-4">
                {records.length === 0 ? (
                  <p className="text-dojo-mist/60">No classes logged yet.</p>
                ) : (
                  records.map((r) => (
                    <article
                      key={r.id}
                      className="card-glow rounded-xl border border-white/5 bg-dojo-slate/60 p-5"
                    >
                      <h2 className="font-medium text-white">{r.title}</h2>
                      <p className="mt-1 text-xs text-dojo-mist/50">
                        {new Date(r.startedAt * 1000).toLocaleString()} ·{" "}
                        {r.payload.class.discipline} ·{" "}
                        {r.payload.present.length} present
                      </p>
                      {r.payload.notes && (
                        <p className="mt-2 text-sm text-dojo-mist/70">
                          {r.payload.notes}
                        </p>
                      )}
                      <p className="mt-2 font-mono text-[10px] text-dojo-mist/40">
                        {presentHexToNpubs(r.payload.present)
                          .map((n) => truncateNpub(n))
                          .join(", ")}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </>
          )}

          {!npub && !error && (
            <button
              type="button"
              onClick={connect}
              className="mt-8 rounded-full border border-white/15 px-5 py-2 text-sm text-dojo-mist hover:text-white"
            >
              Connect Nostr
            </button>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
