import { useEffect, useRef, useState } from "react";

interface ChatMessage {
  type: "chat_message";
  content: string;
  mode: "ic" | "ooc" | "whisper";
  sender_id: string;
  sender_name: string;
  sender_role: string;
  target?: string;
  ts: number;
}

interface ChatPanelProps {
  campaignId: string;
  wsRef: React.RefObject<WebSocket | null>;
  userId?: string;
  displayName?: string;
}

const MODE_LABELS: Record<string, string> = {
  ic: "🎭 En personnage",
  ooc: "💬 Hors-jeu",
  whisper: "🤫 Chuchotement",
};

export default function ChatPanel({ wsRef, userId, displayName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"ic" | "ooc">("ic");
  const [whisperTarget, setWhisperTarget] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen for chat messages from WebSocket
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws) return;

    const originalOnMessage = ws.onmessage;

    ws.onmessage = (event) => {
      // Call original handler first
      if (originalOnMessage) {
        originalOnMessage.call(ws, event);
      }

      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat_message") {
          setMessages((prev) => [...prev, data as ChatMessage]);
        }
      } catch {
        // ignore non-JSON
      }
    };

    return () => {
      ws.onmessage = originalOnMessage;
    };
  }, [wsRef]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !input.trim()) return;

    const effectiveMode = whisperTarget ? "whisper" : mode;

    ws.send(
      JSON.stringify({
        type: "chat_message",
        content: input.trim(),
        mode: effectiveMode,
        target: whisperTarget || undefined,
        ts: Date.now(),
      }),
    );

    setInput("");
    setWhisperTarget("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick dice roller
  const rollDice = (formula: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(
      JSON.stringify({
        type: "chat_message",
        content: `🎲 /r ${formula}`,
        mode: "ooc",
        ts: Date.now(),
      }),
    );
  };

  const messagesEnd = messages.length === 0;

  return (
    <div className="chat-panel">
      {/* Messages area */}
      <div className="chat-messages" ref={scrollRef}>
        {messagesEnd && (
          <div className="chat-empty">
            <p>💬 Le chat est vide</p>
            <p className="chat-hint">
              Les messages envoyés ici sont visibles par tous les joueurs connectés.
            </p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === userId;
          const isGM = msg.sender_role === "gm" || msg.sender_role === "co_gm";
          const isWhisper = msg.mode === "whisper";
          const isOoc = msg.mode === "ooc";

          return (
            <div
              key={i}
              className={`chat-msg ${isOwn ? "chat-own" : ""} ${isWhisper ? "chat-whisper" : ""}`}
            >
              <span className={`chat-sender ${isGM ? "chat-gm" : ""}`}>
                {msg.sender_name}
                {isGM && " ⭐"}
                {isWhisper && msg.target && ` → ${msg.target}`}
              </span>
              <span
                className={`chat-content ${isOoc ? "chat-ooc" : ""} ${isWhisper ? "chat-whisper-text" : ""}`}
              >
                {msg.content}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dice quick bar */}
      <div className="chat-dice-bar">
        {["1d20", "1d8", "1d6", "1d4", "2d6", "1d100"].map((d) => (
          <button key={d} className="chat-dice-btn" onClick={() => rollDice(d)}>
            {d}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-mode-row">
          <button
            className={`chat-mode-btn ${mode === "ic" ? "active" : ""}`}
            onClick={() => setMode("ic")}
          >
            🎭 IC
          </button>
          <button
            className={`chat-mode-btn ${mode === "ooc" ? "active" : ""}`}
            onClick={() => setMode("ooc")}
          >
            💬 OOC
          </button>
          <input
            className="chat-whisper-input"
            placeholder="Chuchoter à…"
            value={whisperTarget}
            onChange={(e) => setWhisperTarget(e.target.value)}
          />
        </div>
        <div className="chat-send-row">
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              whisperTarget
                ? `Chuchoter à ${whisperTarget}…`
                : mode === "ic"
                  ? "Parler en personnage…"
                  : "Message hors-jeu…"
            }
          />
          <button className="chat-send-btn" onClick={sendMessage}>
            Envoyer
          </button>
        </div>
      </div>

      <style>{`
        .chat-panel {
          display: flex; flex-direction: column; height: 100%;
          background: var(--bg-card, #1a1a1a);
          border-radius: 6px; overflow: hidden;
        }
        .chat-messages {
          flex: 1; overflow-y: auto; padding: 8px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .chat-empty {
          text-align: center; color: #666; margin-top: 40px;
        }
        .chat-empty p { margin: 4px 0; font-size: 13px; }
        .chat-hint { font-size: 11px !important; color: #555 !important; }
        .chat-msg {
          padding: 3px 6px; border-radius: 4px; font-size: 13px;
          line-height: 1.4;
        }
        .chat-msg:hover { background: rgba(255,255,255,0.03); }
        .chat-own { background: rgba(31,95,67,0.12); }
        .chat-sender {
          font-weight: 600; margin-right: 6px; font-size: 12px;
          color: #999;
        }
        .chat-gm { color: #d4af37; }
        .chat-content { color: #ddd; }
        .chat-ooc { color: #8ab4f8; font-style: italic; }
        .chat-whisper { background: rgba(180,100,220,0.08); }
        .chat-whisper-text { color: #c4a0e0; font-style: italic; }
        .chat-dice-bar {
          display: flex; gap: 4px; padding: 4px 8px;
          border-top: 1px solid var(--border, #2a2a2a);
        }
        .chat-dice-btn {
          background: var(--bg-input, #1c1c1c);
          border: 1px solid var(--border, #333);
          color: #aaa; padding: 2px 8px; border-radius: 4px;
          font-size: 12px; cursor: pointer;
        }
        .chat-dice-btn:hover { background: #2a3a30; color: #ddd; }
        .chat-input-area { border-top: 1px solid var(--border, #2a2a2a); }
        .chat-mode-row {
          display: flex; gap: 4px; padding: 4px 8px; align-items: center;
        }
        .chat-mode-btn {
          background: none; border: 1px solid var(--border, #333);
          color: #888; padding: 2px 8px; border-radius: 4px;
          font-size: 11px; cursor: pointer;
        }
        .chat-mode-btn.active {
          background: #1f5f43; color: #fff; border-color: #1f5f43;
        }
        .chat-whisper-input {
          flex: 1; background: var(--bg-input, #1c1c1c);
          border: 1px solid var(--border, #333);
          color: #c4a0e0; padding: 2px 6px; border-radius: 4px;
          font-size: 11px; max-width: 130px;
        }
        .chat-send-row {
          display: flex; gap: 4px; padding: 0 8px 6px;
        }
        .chat-input {
          flex: 1; background: var(--bg-input, #1c1c1c);
          border: 1px solid var(--border, #333);
          color: #e0e0e0; padding: 6px 8px; border-radius: 6px;
          font-size: 13px; outline: none;
        }
        .chat-input:focus { border-color: #1f5f43; }
        .chat-send-btn {
          background: #1f5f43; border: none; color: #fff;
          padding: 6px 14px; border-radius: 6px; font-size: 13px;
          cursor: pointer;
        }
        .chat-send-btn:hover { background: #267a55; }
      `}</style>
    </div>
  );
}
