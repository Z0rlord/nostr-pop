"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/components/I18nProvider";

interface Invite {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

interface InstructorInviteModalProps {
  onClose: () => void;
}

export default function InstructorInviteModal({ onClose }: InstructorInviteModalProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ email: string; inviteUrl: string } | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [activeTab, setActiveTab] = useState<"send" | "list">("send");
  const [copied, setCopied] = useState(false);
  
  // Resend email states
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentEmail, setResentEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const res = await fetch("/api/instructor/invite");
      const data = await res.json();
      if (data.success) {
        setInvites(data.invites);
      }
    } catch (err) {
      console.error("Failed to fetch invites:", err);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(null);
    
    if (!email || !email.includes("@")) {
      setError(t("instructor.invite.errors.invalidEmail"));
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch("/api/instructor/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess({
          email: data.invite.email,
          inviteUrl: data.invite.inviteUrl,
        });
        setEmail("");
        setName("");
        fetchInvites();
      } else {
        setError(data.error || t("instructor.invite.errors.generic"));
      }
    } catch (err) {
      setError(t("instructor.invite.errors.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (inviteId: string, email: string) => {
    setResendingId(inviteId);
    setResentEmail(null);
    
    try {
      const res = await fetch("/api/instructor/invite", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResentEmail(email);
        // Clear success message after 3 seconds
        setTimeout(() => setResentEmail(null), 3000);
      } else {
        alert(data.error || "Failed to resend email");
      }
    } catch (err) {
      console.error("Failed to resend invite:", err);
      alert("Failed to resend email");
    } finally {
      setResendingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded">{t("instructor.invite.status.pending")}</span>;
      case "accepted":
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">{t("instructor.invite.status.accepted")}</span>;
      case "expired":
        return <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">{t("instructor.invite.status.expired")}</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-neutral-700 rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-xl font-bold">{t("instructor.invite.title")}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-700">
          <button
            onClick={() => setActiveTab("send")}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "send"
                ? "text-accent border-b-2 border-accent"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t("instructor.invite.tabs.send")}
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 text-sm font-medium ${
              activeTab === "list"
                ? "text-accent border-b-2 border-accent"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t("instructor.invite.tabs.list")} ({invites.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === "send" ? (
            <>
              {success ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400">✓</span>
                    <span className="font-medium">{t("instructor.invite.success", { email: success.email })}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{t("instructor.invite.shareLink")}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={success.inviteUrl}
                      readOnly
                      className="flex-1 px-3 py-2 bg-black border border-neutral-700 rounded text-sm text-gray-400"
                    />
                    <button
                      onClick={() => copyToClipboard(success.inviteUrl)}
                      className="px-3 py-2 bg-accent text-white rounded text-sm hover:bg-accent/90"
                    >
                      {copied ? t("instructor.invite.linkCopied") : t("instructor.invite.copyLink")}
                    </button>
                  </div>
                  <button
                    onClick={() => setSuccess(null)}
                    className="mt-3 text-sm text-accent hover:underline"
                  >
                    {t("instructor.invite.sendAnother")}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">{t("instructor.invite.email")} *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("instructor.invite.emailPlaceholder")}
                      className="w-full px-3 py-2 bg-black border border-neutral-700 rounded text-white placeholder-gray-500 focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t("instructor.invite.name")}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("instructor.invite.namePlaceholder")}
                      className="w-full px-3 py-2 bg-black border border-neutral-700 rounded text-white placeholder-gray-500 focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="text-sm text-gray-400">
                    <p>{t("instructor.invite.description")}</p>
                    <p>{t("instructor.invite.expires")}</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-accent text-white font-medium rounded hover:bg-accent/90 disabled:opacity-50"
                  >
                    {loading ? t("instructor.invite.sending") : t("instructor.invite.send")}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {resentEmail && (
                <div className="bg-green-500/10 border border-green-500/30 rounded p-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-sm text-green-400">Email resent to {resentEmail}</span>
                  </div>
                </div>
              )}
              
              {loadingInvites ? (
                <div className="text-center py-8 text-gray-400">{t("common.loading")}</div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8 text-gray-400">{t("instructor.invite.list.empty")}</div>
              ) : (
                invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="p-3 bg-black border border-neutral-700 rounded"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        {invite.name && (
                          <p className="text-sm text-gray-400">{invite.name}</p>
                        )}
                      </div>
                      {getStatusBadge(invite.status)}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {invite.status === "pending" && (
                        <div className="flex items-center justify-between">
                          <span>{t("instructor.invite.list.sent")}: {formatDate(invite.createdAt)} • {t("instructor.invite.list.expires")}: {formatDate(invite.expiresAt)}</span>
                          <button
                            onClick={() => handleResendEmail(invite.id, invite.email)}
                            disabled={resendingId === invite.id}
                            className="ml-2 px-2 py-1 text-xs bg-accent/20 text-accent hover:bg-accent/30 rounded disabled:opacity-50"
                          >
                            {resendingId === invite.id ? "Sending..." : "Resend Email"}
                          </button>
                        </div>
                      )}
                      {invite.status === "accepted" && (
                        <>{t("instructor.invite.list.accepted")}: {formatDate(invite.acceptedAt!)}</>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
