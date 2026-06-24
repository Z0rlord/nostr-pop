"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PlayIcon, PauseIcon, StopIcon, RotateIcon, TimerIcon } from "@/components/icons";

interface PracticeTimerProps {
  onDurationUpdate?: (minutes: number) => void;
  onComplete?: () => void;
  voiceEnabled?: boolean;
}

type TimerMode = "stopwatch" | "countdown";

export function PracticeTimer({ 
  onDurationUpdate, 
  onComplete,
  voiceEnabled = true 
}: PracticeTimerProps) {
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [countdownTarget, setCountdownTarget] = useState(30); // Default 30 min
  const [voiceListening, setVoiceListening] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (mode === "countdown") {
            if (prev <= 1) {
              // Timer complete
              setIsRunning(false);
              onComplete?.();
              return 0;
            }
            return prev - 1;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode, onComplete]);

  // Report duration updates
  useEffect(() => {
    const minutes = Math.floor(seconds / 60);
    onDurationUpdate?.(minutes);
  }, [seconds, onDurationUpdate]);

  // Voice control setup
  useEffect(() => {
    if (!voiceEnabled || typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log("[Timer Voice] Heard:", transcript);

      if (transcript.includes("start") || transcript.includes("begin")) {
        handleStart();
      } else if (transcript.includes("stop") || transcript.includes("pause")) {
        handlePause();
      } else if (transcript.includes("reset") || transcript.includes("clear")) {
        handleReset();
      } else if (transcript.includes("countdown") || transcript.includes("timer")) {
        setMode("countdown");
        // Try to extract minutes
        const match = transcript.match(/(\d+)/);
        if (match) {
          setCountdownTarget(parseInt(match[1]));
          setSeconds(parseInt(match[1]) * 60);
        }
      } else if (transcript.includes("stopwatch")) {
        setMode("stopwatch");
      }
    };

    recognition.onerror = (event: any) => {
      console.log("[Timer Voice] Error:", event.error);
      setVoiceListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [voiceEnabled]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition not supported in this browser");
      return;
    }

    if (voiceListening) {
      recognitionRef.current.stop();
      setVoiceListening(false);
    } else {
      recognitionRef.current.start();
      setVoiceListening(true);
    }
  };

  const handleStart = () => {
    if (mode === "countdown" && seconds === 0) {
      setSeconds(countdownTarget * 60);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSeconds(mode === "countdown" ? countdownTarget * 60 : 0);
  };

  const handleModeChange = (newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    setSeconds(newMode === "countdown" ? countdownTarget * 60 : 0);
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = mode === "countdown" 
    ? (seconds / (countdownTarget * 60)) * 100 
    : 0;

  return (
    <div className="bg-surface rounded-xl border border-surface-border p-4 mb-4">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => handleModeChange("stopwatch")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
            mode === "stopwatch"
              ? "bg-primary text-white"
              : "bg-surface border border-surface-border hover:border-primary/50"
          }`}
        >
          ⏱️ Stopwatch
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("countdown")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
            mode === "countdown"
              ? "bg-primary text-white"
              : "bg-surface border border-surface-border hover:border-primary/50"
          }`}
        >
          ⏲️ Countdown
        </button>
      </div>

      {/* Countdown Settings */}
      {mode === "countdown" && !isRunning && (
        <div className="mb-4">
          <label className="block text-sm text-text-secondary mb-2">
            Set Duration (minutes)
          </label>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => {
                  setCountdownTarget(min);
                  setSeconds(min * 60);
                }}
                className={`flex-1 py-2 rounded-lg text-sm transition ${
                  countdownTarget === min
                    ? "bg-accent text-white"
                    : "bg-surface border border-surface-border hover:border-accent/50"
                }`}
              >
                {min}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div className="relative mb-4">
        {mode === "countdown" && (
          <div className="absolute inset-0 bg-primary/10 rounded-lg overflow-hidden">
            <div
              className="h-full bg-primary/20 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        <div className="relative text-center py-6">
          <div className={`text-5xl font-mono font-bold ${
            mode === "countdown" && seconds < 60 
              ? "text-red-400 animate-pulse" 
              : "text-primary"
          }`}>
            {formatTime(seconds)}
          </div>
          <p className="text-sm text-text-secondary mt-2">
            {isRunning ? "Running..." : "Ready"}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition flex items-center justify-center gap-2"
          >
            <PlayIcon size={18} />
            Start
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePause}
            className="flex-1 py-3 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition flex items-center justify-center gap-2"
          >
            <PauseIcon size={18} />
            Pause
          </button>
        )}
        
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-3 bg-surface border border-surface-border rounded-lg hover:border-primary/50 transition"
          title="Reset"
        >
          <RotateIcon size={18} />
        </button>

        {voiceEnabled && (
          <button
            type="button"
            onClick={toggleVoice}
            className={`px-4 py-3 rounded-lg transition flex items-center gap-2 ${
              voiceListening
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : "bg-surface border border-surface-border hover:border-primary/50"
            }`}
            title={voiceListening ? "Voice active - say 'start', 'stop', 'reset'" : "Enable voice control"}
          >
            🎤
          </button>
        )}
      </div>

      {/* Voice Commands Help */}
      {voiceListening && (
        <div className="mt-3 p-3 bg-primary/10 rounded-lg text-sm">
          <p className="text-primary font-medium mb-1">🎤 Voice Commands:</p>
          <ul className="text-text-secondary space-y-1">
            <li>"Start" or "Begin" - Start timer</li>
            <li>"Stop" or "Pause" - Pause timer</li>
            <li>"Reset" or "Clear" - Reset timer</li>
            <li>"Countdown 30" - Switch to countdown mode</li>
            <li>"Stopwatch" - Switch to stopwatch mode</li>
          </ul>
        </div>
      )}
    </div>
  );
}
