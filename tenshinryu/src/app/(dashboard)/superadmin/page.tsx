"use client";

import { useState, useEffect } from "react";

const SUPERADMIN_KEY = "dev-admin-123"; // Change this in production via env var

export default function SuperAdminPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<any>(null);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Create Dojo form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [dojoName, setDojoName] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [leaderEmail, setLeaderEmail] = useState("");
  const [timezone, setTimezone] = useState("Europe/Warsaw");
  const [creating, setCreating] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<any>(null);
  const [invitingDojoId, setInvitingDojoId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/superadmin/dashboard", {
        headers: { "x-superadmin-key": key }
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || "Failed to load");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const res = await fetch("/api/superadmin/dashboard", {
        method: "POST",
        headers: {
          "x-superadmin-key": key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "listInstructors", data: {} })
      });
      const json = await res.json();
      if (json.success) {
        setInstructors(json.instructors);
      }
    } catch (err) {
      console.error("Failed to fetch instructors");
    }
  };
  const fetchInvites = async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch("/api/superadmin/dashboard", {
        method: "POST",
        headers: {
          "x-superadmin-key": key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "listInvites", data: {} })
      });
      const json = await res.json();
      if (json.success) {
        setInvites(json.invites);
      }
    } catch (err) {
      console.error("Failed to fetch invites");
    } finally {
      setLoadingInvites(false);
    }
  };

  const resendInvite = async (inviteId: string) => {
    setResendingId(inviteId);
    try {
      const res = await fetch("/api/superadmin/dashboard", {
        method: "POST",
        headers: {
          "x-superadmin-key": key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "resendInvite", data: { inviteId } })
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Invite resent successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(json.error || "Failed to resend invite");
      }
    } catch (err) {
      setError("Failed to resend invite");
    } finally {
      setResendingId(null);
    }
  };


  const makeAdmin = async (instructorId: string) => {
    try {
      const res = await fetch("/api/superadmin/dashboard", {
        method: "POST",
        headers: {
          "x-superadmin-key": key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "makeAdmin", data: { instructorId } })
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Instructor promoted to admin!");
        fetchInstructors();
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setError("Failed to promote instructor");
    }
  };

  const inviteOwner = async (dojoId: string, dojoName: string) => {
    const leaderEmail = window.prompt(`Owner email for ${dojoName}:`);
    if (!leaderEmail) return;
    const leaderName = window.prompt("Owner full name:") || "";
    setInvitingDojoId(dojoId);
    setError("");
    try {
      const res = await fetch("/api/superadmin/dashboard", {
        method: "POST",
        headers: {
          "x-superadmin-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "inviteOwner",
          data: { dojoId, leaderEmail, leaderName },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCreatedInvite(json.invite);
        setMessage(json.message);
        fetchInvites();
      } else {
        setError(json.error || "Failed to send owner invite");
      }
    } catch {
      setError("Failed to send owner invite");
    } finally {
      setInvitingDojoId(null);
    }
  };

  const createDojo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setCreatedInvite(null);

    try {
      const res = await fetch("/api/superadmin/dashboard", {
        method: "POST",
        headers: {
          "x-superadmin-key": key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "createDojo",
          data: { dojoName, leaderName, leaderEmail, timezone }
        })
      });

      const json = await res.json();

      if (json.success) {
        setCreatedInvite(json.invite);
        setMessage(`Dojo "${json.dojo.name}" created successfully!`);
        fetchData(); // Refresh dashboard data
        // Reset form
        setDojoName("");
        setLeaderName("");
        setLeaderEmail("");
        setTimeout(() => setMessage(""), 5000);
      } else {
        setError(json.error || "Failed to create dojo");
      }
    } catch (err) {
      setError("Network error while creating dojo");
    } finally {
      setCreating(false);
    }
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2">🔧 Super Admin</h1>
          <p className="text-gray-400 mb-6">System-wide management for Tenshinryu</p>
          
          <div className="bg-gray-900 p-4 rounded border border-gray-800">
            <label className="block text-sm mb-2">Admin Key</label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter super admin key"
              className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
            />
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full mt-3 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Access Dashboard"}
            </button>
            
            {error && <p className="text-red-400 mt-3 text-sm">{error}</p>}
          </div>
          
          <p className="text-gray-500 text-xs mt-4">
            Default key: "dev-admin-123" (set SUPERADMIN_KEY env var in production)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🔧 Super Admin</h1>
            <p className="text-gray-400 text-sm">Last updated: {new Date(data.timestamp).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="px-3 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700"
            >
              Refresh
            </button>
            <button
              onClick={() => { setData(null); setInstructors([]); }}
              className="px-3 py-1 bg-red-900 rounded text-sm hover:bg-red-800"
            >
              Logout
            </button>
          </div>
        </header>

        {message && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-500 rounded text-green-200">
            {message}
          </div>
        )}

        {/* Create New Dojo Section */}
        <section className="mb-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              🏫 Onboard New School
            </h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-blue-600 rounded text-sm hover:bg-blue-700"
            >
              {showCreateForm ? "Cancel" : "+ Create Dojo"}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={createDojo} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Dojo Name *</label>
                  <input
                    type="text"
                    required
                    value={dojoName}
                    onChange={(e) => setDojoName(e.target.value)}
                    placeholder="e.g., Warsaw Tenshinryu Dojo"
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Timezone *</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
                  >
                    <option value="Europe/Warsaw">Europe/Warsaw</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Leader Name *</label>
                  <input
                    type="text"
                    required
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    placeholder="e.g., John Smith"
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Leader Email *</label>
                  <input
                    type="email"
                    required
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                    placeholder="leader@dojo.com"
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
              >
                {creating ? "Creating Dojo & Sending Invite..." : "Create Dojo & Send Invite"}
              </button>
            </form>
          )}

          {createdInvite && (
            <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded">
              <h3 className="font-bold text-green-400 mb-2">✅ Dojo Created Successfully!</h3>
              <p className="text-sm text-gray-300 mb-2">Share this invite link with the school leader:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInvite.link}
                  className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded text-sm font-mono text-gray-400"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdInvite.link);
                    setMessage("Invite link copied to clipboard!");
                    setTimeout(() => setMessage(""), 2000);
                  }}
                  className="px-4 py-2 bg-gray-700 rounded text-sm hover:bg-gray-600"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Expires: {new Date(createdInvite.expiresAt).toLocaleString()}
              </p>
            </div>
          )}
        </section>

        {/* System Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard title="Dojos" value={data.system.totalDojos} />
          <StatCard title="Students" value={data.system.totalStudents} />
          <StatCard title="Instructors" value={data.system.totalInstructors} />
          <StatCard title="Classes" value={data.system.totalClasses} />
          <StatCard title="Check-ins" value={data.system.totalCheckIns} />
          <StatCard title="New (7d)" value={data.system.recentSignups} color="green" />
          <StatCard 
            title="Monthly Revenue" 
            value={`$${data.system.estimatedMonthlyRevenue.toLocaleString()}`} 
            color="amber"
          />
          <StatCard 
            title="Annual Revenue" 
            value={`$${data.system.estimatedAnnualRevenue.toLocaleString()}`} 
            color="purple"
          />
        </section>

        {/* Database Stats */}
        <section className="bg-gray-900 rounded p-4 mb-6">
          <h2 className="font-bold mb-3">💾 Database</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Size</p>
              <p className="font-mono">{data.database.size}</p>
            </div>
            <div>
              <p className="text-gray-400">Students</p>
              <p className="font-mono">{data.database.studentsTable.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400">Check-ins</p>
              <p className="font-mono">{data.database.checkInsTable.toLocaleString()}</p>
            </div>
          </div>
        </section>

        {/* Dojos Table */}
        <section className="mb-6">
          <h2 className="font-bold mb-3">🏫 Dojos ({data.dojos.length})</h2>
          <div className="bg-gray-900 rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-800">
                  <th className="p-3">Name</th>
                  <th className="p-3">Timezone</th>
                  <th className="p-3 text-right">Students</th>
                  <th className="p-3 text-right">Instructors</th>
                  <th className="p-3 text-right">Classes</th>
                  <th className="p-3 text-right">Check-ins</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.dojos.map((dojo: any) => (
                  <tr key={dojo.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="p-3 font-medium">{dojo.name}</td>
                    <td className="p-3 text-gray-400">{dojo.timezone}</td>
                    <td className="p-3 text-right">{dojo.students}</td>
                    <td className="p-3 text-right">{dojo.instructors}</td>
                    <td className="p-3 text-right">{dojo.classes}</td>
                    <td className="p-3 text-right">{dojo.checkIns.toLocaleString()}</td>
                    <td className="p-3 text-gray-400">
                      {new Date(dojo.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => inviteOwner(dojo.id, dojo.name)}
                        disabled={invitingDojoId === dojo.id}
                        className="px-2 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 disabled:opacity-50"
                      >
                        {invitingDojoId === dojo.id ? "Sending…" : "Invite owner"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Instructor Management */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">👥 Instructors</h2>
            <button
              onClick={fetchInstructors}
              className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
            >
              Load Instructors
            </button>
            <button
              onClick={fetchInvites}
              className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700"
            >
              {loadingInvites ? "Loading..." : "Load Invites"}
            </button>
          </div>
          
          {invites.length > 0 && (
            <div className="mt-4 bg-gray-900 rounded overflow-x-auto">
              <h3 className="p-3 font-bold">Pending Invites</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-800">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Dojo</th>
                    <th className="p-3">Expires</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite: any) => (
                    <tr key={invite.id} className="border-b border-gray-800">
                      <td className="p-3">{invite.name || "—"}</td>
                      <td className="p-3 text-gray-400">{invite.email}</td>
                      <td className="p-3">{invite.dojo?.name || "—"}</td>
                      <td className="p-3">{new Date(invite.expiresAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <button
                          onClick={() => resendInvite(invite.id)}
                          disabled={resendingId === invite.id}
                          className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700 disabled:bg-gray-600"
                        >
                          {resendingId === invite.id ? "Resending..." : "Resend"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="bg-gray-900 rounded p-4">
          <h2 className="font-bold mb-3">⚡ Quick Actions</h2>
          <div className="flex gap-2 flex-wrap">
            <a 
              href="/instructor" 
              className="px-3 py-2 bg-blue-600 rounded text-sm hover:bg-blue-700"
            >
              Go to Instructor Dashboard
            </a>
            <a 
              href="/admin" 
              className="px-3 py-2 bg-amber-600 rounded text-sm hover:bg-amber-700"
            >
              Business Dashboard
            </a>
            <a 
              href="https://bit.ly/tenshinryupatron" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-gradient-to-r from-amber-600 to-red-600 rounded text-sm hover:from-amber-700 hover:to-red-700"
            >
              ❤️ Patron Link
            </a>
            <a 
              href="https://console.firebase.google.com/project/dojopop" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-orange-600 rounded text-sm hover:bg-orange-700"
            >
              Firebase Console
            </a>
            <a 
              href="https://console.neon.tech" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-cyan-600 rounded text-sm hover:bg-cyan-700"
            >
              Neon Database
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, color = "gray" }: { title: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-900",
    green: "bg-green-900/30 border-green-500/30",
    amber: "bg-amber-900/30 border-amber-500/30",
    purple: "bg-purple-900/30 border-purple-500/30"
  };

  return (
    <div className={`p-4 rounded ${colors[color]} border border-gray-800`}>
      <p className="text-gray-400 text-xs mb-1">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
