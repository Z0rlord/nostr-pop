"use client";

import { useState, useEffect, useCallback } from "react";

interface VoiceAIProps {
  studentId: string;
  enabled?: boolean;
  locale?: string;
}

interface VoiceResponse {
  text: string;
  action?: string;
  data?: any;
}

export default function VoiceAI({ studentId, enabled = true, locale = "en" }: VoiceAIProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<VoiceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Translations
  const t = {
    en: {
      title: "Voice Assistant",
      beta: "Beta",
      listening: "Listening...",
      thinking: "Thinking...",
      tapToSpeak: "Tap to speak",
      youSaid: "You said:",
      notSupported: "Voice AI not supported in this browser",
      trySaying: "Try saying:",
      examples: [
        "How many times did I practice last week?",
        "What's my current streak?",
        "When is my next class?",
      ],
    },
    ja: {
      title: "音声アシスタント",
      beta: "ベータ",
      listening: "聞いています...",
      thinking: "考え中...",
      tapToSpeak: "タップして話す",
      youSaid: "あなたの言葉:",
      notSupported: "このブラウザでは音声AIがサポートされていません",
      trySaying: "こんなことを言ってみてください:",
      examples: [
        "先週何回稽古しましたか？",
        "現在の連続記録は？",
        "次のクラスはいつですか？",
      ],
    },
    pl: {
      title: "Asystent Głosowy",
      beta: "Beta",
      listening: "Słucham...",
      thinking: "Myślę...",
      tapToSpeak: "Dotknij, aby mówić",
      youSaid: "Powiedziałeś:",
      notSupported: "Asystent głosowy nie jest obsługiwany w tej przeglądarce",
      trySaying: "Spróbuj powiedzieć:",
      examples: [
        "Ile razy trenowałem w zeszłym tygodniu?",
        "Jaki jest mój aktualny streak?",
        "Kiedy mam następną klasę?",
      ],
    },
    el: {
      title: "Φωνητικός Βοηθός",
      beta: "Beta",
      listening: "Ακούω...",
      thinking: "Σκέφτομαι...",
      tapToSpeak: "Πάτα για να μιλήσεις",
      youSaid: "Είπες:",
      notSupported: "Ο φωνητικός βοηθός δεν υποστηρίζεται σε αυτό το πρόγραμμα περιήγησης",
      trySaying: "Δοκίμασε να πεις:",
      examples: [
        "Πόσες φορές προπονήθηκα την περασμένη εβδομάδα;",
        "Ποια είναι η τρέχουσα σειρά μου;",
        "Πότε είναι το επόμενο μάθημά μου;",
      ],
    },
    it: {
      title: "Assistente Vocale",
      beta: "Beta",
      listening: "Ascolto...",
      thinking: "Sto pensando...",
      tapToSpeak: "Tocca per parlare",
      youSaid: "Hai detto:",
      notSupported: "L'assistente vocale non è supportato in questo browser",
      trySaying: "Prova a dire:",
      examples: [
        "Quante volte mi sono allenato la scorsa settimana?",
        "Qual è la mia serie attuale?",
        "Quando è la mia prossima lezione?",
      ],
    },
    fr: {
      title: "Assistant Vocal",
      beta: "Bêta",
      listening: "J'écoute...",
      thinking: "Je réfléchis...",
      tapToSpeak: "Appuyez pour parler",
      youSaid: "Vous avez dit:",
      notSupported: "L'assistant vocal n'est pas pris en charge dans ce navigateur",
      trySaying: "Essayez de dire:",
      examples: [
        "Combien de fois ai-je pratiqué la semaine dernière?",
        "Quelle est ma série actuelle?",
        "Quand est mon prochain cours?",
      ],
    },
    es: {
      title: "Asistente de Voz",
      beta: "Beta",
      listening: "Escuchando...",
      thinking: "Pensando...",
      tapToSpeak: "Toca para hablar",
      youSaid: "Dijiste:",
      notSupported: "El asistente de voz no es compatible con este navegador",
      trySaying: "Intenta decir:",
      examples: [
        "¿Cuántas veces practiqué la semana pasada?",
        "¿Cuál es mi racha actual?",
        "¿Cuándo es mi próxima clase?",
      ],
    },
    de: {
      title: "Sprachassistent",
      beta: "Beta",
      listening: "Ich höre...",
      thinking: "Ich denke nach...",
      tapToSpeak: "Tippen zum Sprechen",
      youSaid: "Du sagtest:",
      notSupported: "Der Sprachassistent wird in diesem Browser nicht unterstützt",
      trySaying: "Versuche zu sagen:",
      examples: [
        "Wie oft habe ich letzte Woche trainiert?",
        "Was ist meine aktuelle Serie?",
        "Wann ist meine nächste Klasse?",
      ],
    },
  };

  const currentLang = (t as any)[locale] || t.en;

  useEffect(() => {
    // Check browser support
    if (typeof window !== "undefined") {
      const hasSpeechRecognition = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      const hasSpeechSynthesis = "speechSynthesis" in window;
      setSpeechSupported(hasSpeechRecognition && hasSpeechSynthesis);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const voiceMap: Record<string, string> = {
      ja: "ja",
      pl: "pl",
      el: "el",
      it: "it",
      fr: "fr",
      es: "es",
      de: "de",
      en: "en",
    };
    const langPrefix = voiceMap[locale] || "en";
    const preferredVoice = voices.find(v => v.lang.startsWith(langPrefix)) ||
                          voices.find(v => v.lang.startsWith("en"));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    window.speechSynthesis.speak(utterance);
  }, [locale]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(currentLang.notSupported);
      return;
    }

    const recognition = new SpeechRecognition();
    const langMap: Record<string, string> = {
      ja: "ja-JP",
      pl: "pl-PL",
      el: "el-GR",
      it: "it-IT",
      fr: "fr-FR",
      es: "es-ES",
      de: "de-DE",
      en: "en-US",
    };
    recognition.lang = langMap[locale] || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setResponse(null);
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      handleQuery(text);
    };

    recognition.onerror = (event: any) => {
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [locale, currentLang]);

  const handleQuery = async (text: string) => {
    setLoading(true);
    
    try {
      const res = await fetch("/api/ai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          studentId,
          language: locale,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        // Gemini API returns {response, action, data}
        setResponse({ text: data.response, action: data.action, data: data.data });
        speak(data.response);
      } else {
        setError(data.error || "Failed to process query");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  if (!speechSupported) {
    return (
      <div className="p-4 bg-gray-900 rounded-lg text-sm text-gray-500">
        {currentLang.notSupported}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 14.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-2v-2.07z" clipRule="evenodd" />
          </svg>
          {currentLang.title}
        </h3>
        <span className="text-xs text-gray-500">{currentLang.beta}</span>
      </div>

      <button
        onClick={startListening}
        disabled={isListening || loading}
        className={`w-full py-4 rounded-lg font-semibold transition flex items-center justify-center gap-3 ${
          isListening
            ? "bg-red-600 animate-pulse"
            : "bg-gray-800 hover:bg-gray-700"
        }`}
      >
        {isListening ? (
          <>
            <span className="w-3 h-3 bg-white rounded-full animate-ping" />
            {currentLang.listening}
          </>
        ) : loading ? (
          currentLang.thinking
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {currentLang.tapToSpeak}
          </>
        )}
      </button>

      {transcript && (
        <div className="p-3 bg-gray-800 rounded text-sm text-gray-300">
          <span className="text-gray-500">{currentLang.youSaid}</span> {transcript}
        </div>
      )}

      {response && (
        <div className="p-3 bg-red-900/30 border border-red-800 rounded">
          <p className="text-red-200">{response.text}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-900/30 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>{currentLang.trySaying}</p>
        <ul className="list-disc list-inside">
          {currentLang.examples.map((example, i) => (
            <li key={i}>{example}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
