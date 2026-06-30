"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";
import { SparklesIcon } from "@/components/icons";

interface AIInsightsProps {
  studentId: string;
}

interface InsightResponse {
  insight: string;
  source: string;
}

export function AIInsights({ studentId }: AIInsightsProps) {
  const { t, locale } = useI18n();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<InsightResponse | null>(null);
  const [error, setError] = useState("");

  const suggestions = [
    { key: "practiceCount", icon: "📝" },
    { key: "bestClassTime", icon: "⏰" },
    { key: "attendancePattern", icon: "📊" },
    { key: "consistency", icon: "🔥" },
  ];

  const handleSubmit = async (e?: React.FormEvent, presetQuestion?: string) => {
    e?.preventDefault();
    
    const q = presetQuestion || question;
    if (!q.trim()) return;

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: q, locale }),
      });

      if (!res.ok) {
        throw new Error("Failed to get insights");
      }

      const data = await res.json();
      setResponse(data);
      if (!presetQuestion) {
        setQuestion("");
      }
    } catch (err) {
      setError(t("common.error") || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getSuggestionText = (key: string): string => {
    const texts: Record<string, Record<string, string>> = {
      en: {
        practiceCount: "How many times have I practiced?",
        bestClassTime: "When is the best class for me?",
        attendancePattern: "What's my attendance pattern?",
        consistency: "How consistent am I?",
      },
      ja: {
        practiceCount: "何回練習しましたか？",
        bestClassTime: "自分に合ったクラスはいつですか？",
        attendancePattern: "出席パターンは？",
        consistency: "継続性はどうですか？",
      },
      pl: {
        practiceCount: "Ile razy trenowałem?",
        bestClassTime: "Kiedy są dla mnie najlepsze zajęcia?",
        attendancePattern: "Jaki jest mój wzorzec obecności?",
        consistency: "Jak konsekwentny jestem?",
      },
      el: {
        practiceCount: "Πόσες φορές προπόνησα;",
        bestClassTime: "Πότε είναι το καλύτερο μάθημα για μένα;",
        attendancePattern: "Ποιο είναι το μοτίβο παρουσίας μου;",
        consistency: "Πόσο συνεπής είμαι;",
      },
    };
    return texts[locale]?.[key] || texts["en"][key];
  };

  return (
    <div className="bg-surface border border-neutral-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <SparklesIcon className="w-6 h-6 text-accent" />
        <h3 className="font-bold text-lg">
          {t("aiInsights.title") || "Practice Insights"}
        </h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {t("aiInsights.description") || "Ask about your practice data and attendance patterns."}
      </p>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestions.map((s) => (
          <button
            key={s.key}
            onClick={() => handleSubmit(undefined, getSuggestionText(s.key))}
            disabled={loading}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-full text-sm transition-colors disabled:opacity-50"
          >
            <span className="mr-1">{s.icon}</span>
            {getSuggestionText(s.key)}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("aiInsights.askPlaceholder") || "Ask about your data..."}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-black border border-neutral-700 rounded text-sm focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="animate-pulse">{t("common.loading")}</span>
          ) : (
            t("aiInsights.ask") || "Ask"
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-900/30 border border-red-500/30 rounded text-sm text-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
          <div className="flex items-start gap-3">
            <SparklesIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm leading-relaxed">{response.insight}</p>
              {response.source === "gemini" && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✨ {t("aiInsights.poweredBy") || "AI-powered analysis"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-neutral-800">
        {t("aiInsights.disclaimer") || "This analyzes your personal data only. No training advice."}
      </p>
    </div>
  );
}
