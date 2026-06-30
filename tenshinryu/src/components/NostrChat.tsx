"use client";

import { useState, useEffect, useRef } from "react";
import { getNostrKey, sendDM, subscribeToDMs, getUserPublicKey, setUserPublicKey } from "@/lib/nostr";

interface ChatProps {
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  recipientPublicKey?: string;
  onClose?: () => void;
}

interface Message {
  id: string;
  content: string;
  sender: "me" | "them";
  timestamp: number;
}

export default function NostrChat({
  currentUserId,
  recipientId,
  recipientName,
  recipientPublicKey: initialPublicKey,
  onClose,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [recipientPublicKey, setRecipientPublicKey] = useState(initialPublicKey || "");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get current user's Nostr key
  const currentUserKey = getNostrKey(currentUserId);

  useEffect(() => {
    // Load recipient's public key if not provided
    if (!recipientPublicKey) {
      const stored = getUserPublicKey(recipientId);
      if (stored) setRecipientPublicKey(stored);
    }

    // Subscribe to incoming messages
    unsubscribeRef.current = subscribeToDMs(currentUserKey.privateKey, (event) => {
      if (event.pubkey === recipientPublicKey) {
        setMessages((prev) => [
          ...prev,
          {
            id: event.id,
            content: event.content,
            sender: "them",
            timestamp: event.created_at * 1000,
          },
        ]);
      }
    });

    return () => {
      unsubscribeRef.current?.();
    };
  }, [currentUserId, recipientId, recipientPublicKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !recipientPublicKey) return;

    setLoading(true);
    
    try {
      const messageId = await sendDM(
        currentUserKey.privateKey,
        recipientPublicKey,
        input.trim()
      );

      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          content: input.trim(),
          sender: "me",
          timestamp: Date.now(),
        },
      ]);
      
      setInput("");
    } catch (err) {
      console.error("Failed to send:", err);
      alert("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPublicKey = () => {
    const key = prompt("Enter recipient's Nostr public key:");
    if (key) {
      setRecipientPublicKey(key);
      setUserPublicKey(recipientId, key);
    }
  };

  if (!recipientPublicKey) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Chat with {recipientName}</h3>
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-400">✕</button>
          )}
        </div>
        <p className="text-gray-400 text-sm">
          To start messaging, you need {recipientName}&apos;s Nostr public key.
        </p>
        <button
          onClick={handleSetPublicKey}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
        >
          Add Public Key
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg flex flex-col h-96">
      <div className="p-3 border-b border-gray-800 flex justify-between items-center">
        <h3 className="font-semibold">{recipientName}</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-400">✕</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-gray-500 text-center text-sm">No messages yet</p>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                msg.sender === "me"
                  ? "bg-blue-600"
                  : "bg-gray-800"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg text-sm font-semibold"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
