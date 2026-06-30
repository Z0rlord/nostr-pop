"use client";

import { useState } from "react";
import QRCode from "qrcode";

interface StudentQRProps {
  studentId: string;
  studentName: string;
}

export default function StudentQR({ studentId, studentName }: StudentQRProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const generateQR = async () => {
    try {
      const url = await QRCode.toDataURL(studentId, {
        width: 400,
        margin: 2,
        color: {
          dark: "#dc2626",
          light: "#1a1a1a",
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("Failed to generate QR:", err);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${studentName.replace(/\s+/g, "_")}_qr.png`;
    link.click();
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg text-center">
      <h3 className="font-semibold mb-4">{studentName}</h3>

      {!qrDataUrl ? (
        <button
          onClick={generateQR}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
        >
          Generate QR Code
        </button>
      ) : (
        <div className="space-y-4">
          <img
            src={qrDataUrl}
            alt={`QR code for ${studentName}`}
            className="mx-auto rounded-lg"
          />
          <div className="flex gap-2 justify-center">
            <button
              onClick={downloadQR}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
            >
              Download
            </button>
            <button
              onClick={() => setQrDataUrl(null)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
