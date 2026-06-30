"use client";

import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

interface Class {
  id: string;
  name: string;
  instructor: { name: string };
  schedule: string;
}

interface QRScannerProps {
  dojoId: string;
}

export default function QRScanner({ dojoId }: QRScannerProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    student?: { name: string; beltRank: string; stripes: number };
  } | null>(null);

  // Load classes on mount
  useEffect(() => {
    // In production, fetch from API
    // For now, mock data
    setClasses([
      { id: "cls_001", name: "Kids BJJ", instructor: { name: "Sensei Mike" }, schedule: "Mon/Wed 16:00" },
      { id: "cls_002", name: "Adult BJJ", instructor: { name: "Professor Ana" }, schedule: "Mon/Wed 19:00" },
      { id: "cls_003", name: "Muay Thai", instructor: { name: "Kru Tom" }, schedule: "Tue/Thu 18:00" },
    ]);
  }, []);

  const handleScan = async (qrCode: string) => {
    if (!scanning || !selectedClass) return;
    setScanning(false);

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode, dojoId, classId: selectedClass }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: "Check-in successful!",
          student: data.student,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Check-in failed",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: "Network error. Please try again.",
      });
    }

    setTimeout(() => {
      setResult(null);
      setScanning(true);
    }, 3000);
  };

  if (result) {
    return (
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
      </div>
    );
  }

  if (!selectedClass) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-center">Select a Class</h3>
        <div className="space-y-2">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls.id)}
              className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">{cls.name}</p>
                  <p className="text-sm text-gray-400">{cls.instructor.name}</p>
                </div>
                <span className="text-sm text-gray-500">{cls.schedule}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const selectedClassData = classes.find((c) => c.id === selectedClass);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
        <div>
          <p className="font-semibold">{selectedClassData?.name}</p>
          <p className="text-sm text-gray-400">{selectedClassData?.instructor.name}</p>
        </div>
        <button
          onClick={() => {
            setSelectedClass("");
            setScanning(false);
          }}
          className="text-sm text-red-400 hover:text-red-300"
        >
          Change
        </button>
      </div>

      {!scanning ? (
        <button
          onClick={() => setScanning(true)}
          className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
        >
          Start Scanning
        </button>
      ) : (
        <div className="aspect-square rounded-lg overflow-hidden bg-black">
          <Scanner
            onScan={(detectedCodes) => {
              if (detectedCodes.length > 0) {
                handleScan(detectedCodes[0].rawValue);
              }
            }}
            onError={(error) => console.error("QR scan error:", error)}
            styles={{ container: { width: "100%", height: "100%" } }}
          />
        </div>
      )}
    </div>
  );
}
