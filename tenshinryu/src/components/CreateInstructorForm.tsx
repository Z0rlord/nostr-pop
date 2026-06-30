"use client";

import { useState } from "react";

interface CreateInstructorFormProps {
  dojoId: string;
  onSuccess?: () => void;
}

export default function CreateInstructorForm({
  dojoId,
  onSuccess,
}: CreateInstructorFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    isAdmin: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    if (formData.password !== formData.confirmPassword) {
      setResult({ success: false, message: "Passwords do not match" });
      return;
    }

    if (formData.password.length < 8) {
      setResult({ success: false, message: "Password must be at least 8 characters" });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          isAdmin: formData.isAdmin,
          dojoId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: "Instructor created successfully!" });
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
          isAdmin: false,
        });
        onSuccess?.();
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to create instructor",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {result && (
        <div
          className={`p-3 rounded ${
            result.success ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
          }`}
        >
          {result.message}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:border-red-500 focus:outline-none"
          placeholder="e.g., Sensei Mike"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">
          Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:border-red-500 focus:outline-none"
          placeholder="mike@dojopop.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Password *
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:border-red-500 focus:outline-none"
            placeholder="Min 8 characters"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Confirm Password *
          </label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 rounded-lg border border-gray-800 focus:border-red-500 focus:outline-none"
            placeholder="Re-enter password"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
        <input
          type="checkbox"
          id="isAdmin"
          checked={formData.isAdmin}
          onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
          className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-red-600 focus:ring-red-600"
        />
        <label htmlFor="isAdmin" className="text-sm text-gray-300">
          Admin privileges (can manage other instructors)
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-lg font-semibold transition"
      >
        {loading ? "Creating..." : "Create Instructor"}
      </button>
    </form>
  );
}
