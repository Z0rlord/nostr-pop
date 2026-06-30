"use client";

import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

interface UnifiedCheckInProps {
  dojoId: string;
}

export default function UnifiedCheckIn({ dojoId }: UnifiedCheckInProps) {
  const [mode, setMode] = useState<"qr" | "nfc" | "select">("select");
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    student?: { name: string; beltRank: string; stripes: number };
    // tokensAwarded removed - reserved for DojoPop
  } | null>(null);

  // Check NFC support
  useEffect(() => {
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setNfcSupported(true);
    }
  }, []);

  const handleQRScan = async (qrCode: string) => {
    await processCheckIn("qr", qrCode);
  };

  const handleNFC = async () => {
    if (!("NDEFReader" in window)) {
      setResult({
        success: false,
        message: "NFC not supported on this device",
      });
      return;
    }

    setNfcReading(true);
    setResult(null);

    try {
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();

      ndef.addEventListener("reading", async (event: any) => {
        const nfcId = event.serialNumber || event.message?.records[0]?.data;
        if (nfcId) {
          await processCheckIn("nfc", nfcId);
          setNfcReading(false);
        }
      });
    } catch (err) {
      setResult({
        success: false,
        message: "NFC error: " + (err as Error).message,
      });
      setNfcReading(false);
    }
  };

  const processCheckIn = async (method: "qr" | "nfc", code: string) => {
    try {
      const endpoint = method === "qr" ? "/api/checkin" : "/api/checkin/nfc";
      const payload = method === "qr" 
        ? { qrCode: code, dojoId, classId: "default" }
        : { nfcId: code, dojoId, classId: "default" };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: "Check-in successful!",
          student: data.student,
          // tokensAwarded removed - reserved for DojoPop
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Check-in failed",
        });
      }
    } catch (err) {
      setResult({
        success: false,
        message: "Network error",
      });
    }
  };

  if (mode === "select") {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-center">Select Check-in Method</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode("qr")}
            className="p-6 bg-gray-800 hover:bg-gray-700 rounded-lg text-center transition"
          >
            <svg className="w-12 h-12 mx-auto mb-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
              <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM16 13a1 1 0 100 2 1 1 0 000-2zM9 4a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0V4zM13 11a1 1 0 10-2 0v1a1 1 0 002 0v-1z" />
            </svg>
            <p className="font-semibold">Scan QR Code</p>
            <p className="text-sm text-gray-500">Camera scan</p>
          </button>

          <button
            onClick={() => setMode("nfc")}
            disabled={!nfcSupported}
            className={`p-6 rounded-lg text-center transition ${
              nfcSupported
                ? "bg-gray-800 hover:bg-gray-700"
                : "bg-gray-900 opacity-50 cursor-not-allowed"
            }`}
          >
            <svg className="w-12 h-12 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="font-semibold">NFC Tap</p>
            <p className="text-sm text-gray-500">
              {nfcSupported ? "Phone to phone" : "Not available"}
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div
          className={`p-6 rounded-lg text-center ${
            result.success ? "bg-green-900/50" : "bg-red-900/50"
          }`}
        >
          <p className="text-xl font-bold mb-2">
            {result.success ? "✅" : "❌"} {result.message}
          </p>
          
          {result.student && (
            <div className="text-gray-300">
              <p className="font-semibold">{result.student.name}</p>
              <p className="text-sm capitalize">
                {result.student.beltRank.toLowerCase()} belt, {result.student.stripes} stripes
              </p>
            </div>
          )}
          {/* DOJO tokens display removed - reserved for DojoPop */}
        </div>

        <button
          onClick={() => {
            setMode("select");
            setResult(null);
          }}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          Check In Another
        </button>
      </div>
    );
  }

  if (mode === "qr") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode("select")}
          className="text-sm text-gray-500 hover:text-gray-400"
        >
          ← Back
        </button>
        
        <div className="aspect-square rounded-lg overflow-hidden bg-black">
          <Scanner
            onScan={(detectedCodes) => {
              if (detectedCodes.length > 0) {
                handleQRScan(detectedCodes[0].rawValue);
              }
            }}
            onError={(error) => console.error("QR error:", error)}
            styles={{ container: { width: "100%", height: "100%" } }}
          />
        </div>
        <p className="text-center text-gray-500">Point camera at student QR code</p>
      </div>
    );
  }

  if (mode === "nfc") {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setMode("select")}
          className="text-sm text-gray-500 hover:text-gray-400"
        >
          ← Back
        </button>

        <div className="p-8 bg-gray-800 rounded-lg text-center">
          {nfcReading ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500 animate-ping" />
              <p className="text-lg font-semibold">Tap phones together...</p>
              <p className="text-sm text-gray-500">Hold devices close</p>
            </>
          ) : (
            <>
              <svg className="w-16 h-16 mx-auto mb-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <button
                onClick={handleNFC}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
              >
                Start NFC Reading
              </button>
              <p className="text-sm text-gray-500 mt-4">Tap your phone to the student&apos;s phone</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
