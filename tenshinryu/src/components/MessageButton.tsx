"use client";

import { useState } from "react";
import NostrChat from "./NostrChat";

interface MessageButtonProps {
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  recipientPublicKey?: string;
}

export default function MessageButton({
  currentUserId,
  recipientId,
  recipientName,
  recipientPublicKey,
}: MessageButtonProps) {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowChat(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Message
      </button>

      {showChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md">
            <NostrChat
              currentUserId={currentUserId}
              recipientId={recipientId}
              recipientName={recipientName}
              recipientPublicKey={recipientPublicKey}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
