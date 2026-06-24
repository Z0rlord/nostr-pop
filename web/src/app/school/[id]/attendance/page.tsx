"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { connectNip07, publishEvent, signEventNip07 } from "@/lib/nip07";
import { truncateNpub } from "@/lib/practice-events";

export default function LogAttendancePage({
  params,
}: {
  params: { id: string };
}) {
  const [npub, setNpub] = useState<string | null>(null);
  const [students, setStudents] = useState<string[]>([]);
  const [discipline, setDiscipline] = useState("aikido");
  const [className, setClassName] = useState("");
  const [location, setLocation] = useState("Warsaw");
  const [startedAt, setStartedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setStartedAt(now.toISOString().slice(0, 16));
  }, []);

  async function init() {
    const identity = await connectNip07();
    if (!identity) {
      setError("Nostr extension required.");
      return;
    }
    setNpub(identity.npub);

    const res = await fetch(
      `/api/schools/${params.id}/roster?npub=${encodeURIComponent(identity.npub)}`
    );
    if (!res.ok) {
      setError("Only the sensei or instructors can log attendance.");
      return;
    }
    const data = await res.json();
    if (data.role !== "owner" && data.role !== "instructor") {
      setError("Only the sensei or instructors can log attendance.");
      return;
    }
    setStudents(data.students || []);
    if (data.school?.disciplines?.[0]) {
      setDiscipline(data.school.disciplines[0]);
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleStudent(studentNpub: string) {
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(studentNpub)) next.delete(studentNpub);
      else next.add(studentNpub);
      return next;
    });
  }

  async function submit() {
    if (!npub || !className || !startedAt) return;
    setSubmitting(true);
    setError(null);

    const prepareRes = await fetch(
      `/api/schools/${params.id}/attendance/prepare`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npub,
          className,
          discipline,
          startedAt: new Date(startedAt).toISOString(),
          location,
          presentNpubs: Array.from(present),
          notes: notes || undefined,
        }),
      }
    );
    const prepareData = await prepareRes.json();
    if (!prepareRes.ok) {
      setError(prepareData.error || "Could not prepare event");
      setSubmitting(false);
      return;
    }

    const signed = await signEventNip07(prepareData.template);
    if (!signed) {
      setError("Signing cancelled or failed.");
      setSubmitting(false);
      return;
    }

    try {
      await publishEvent(signed);
      setSuccess(true);
    } catch {
      setError("Publish failed — is your npub on the relay whitelist?");
    }
    setSubmitting(false);
  }

  return (
    <>
      <Header />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-lg">
          <Link
            href={`/school/${params.id}`}
            className="text-sm text-dojo-mist/60 hover:text-white"
          >
            ← Back to dojo log
          </Link>
          <h1 className="mt-4 font-display text-3xl text-white">Log class</h1>
          <p className="mt-2 text-sm text-dojo-mist/60">
            Check everyone who trained today. One signed record for the whole
            class.
          </p>

          {success ? (
            <p className="mt-8 text-dojo-gold">
              ✓ Class attendance published ({present.size} students).
            </p>
          ) : (
            <form
              className="card-glow mt-8 space-y-5 rounded-2xl border border-white/5 bg-dojo-slate/60 p-8"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div>
                <label className="block text-sm text-dojo-mist">Class name</label>
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-dojo-ink px-3 py-2 text-white"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Monday fundamentals"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dojo-mist">When</label>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-dojo-ink px-3 py-2 text-white"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-dojo-mist">Notes (optional)</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-white/10 bg-dojo-ink px-3 py-2 text-white"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-dojo-mist">
                  Present ({present.size})
                </p>
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {students.length === 0 ? (
                    <li className="text-xs text-dojo-mist/50">
                      No students on roster yet — share the join QR at class.
                    </li>
                  ) : (
                    students.map((s) => (
                      <li key={s}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={present.has(s)}
                            onChange={() => toggleStudent(s)}
                          />
                          <span className="font-mono text-xs">{truncateNpub(s)}</span>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {error && <p className="text-sm text-red-300">{error}</p>}

              <button
                type="submit"
                disabled={submitting || present.size === 0}
                className="w-full rounded-full bg-dojo-crimson py-3 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Publishing…" : "Sign & publish attendance"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
