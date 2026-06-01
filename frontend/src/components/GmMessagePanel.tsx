import { FormEvent, useEffect, useState } from "react";
import { Megaphone, MessageSquare, Send, Dice1 } from "lucide-react";
import type { GmMessage as GmMessageType, Member } from "../api/types";

type GmMessagePanelProps = {
  campaignId: string;
  token: string;
  members: Member[];
};

type Tab = "message" | "announce" | "secret";

export function GmMessagePanel({ campaignId, token, members }: GmMessagePanelProps) {
  const [tab, setTab] = useState<Tab>("message");
  const [recipientId, setRecipientId] = useState("");
  const [content, setContent] = useState("");
  const [formula, setFormula] = useState("1d20");
  const [label, setLabel] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const players = members.filter((m) => m.role === "player" || m.role === "co_gm");

  function resetForm() {
    setContent("");
    setFormula("1d20");
    setLabel("");
    setStatusMsg("");
  }

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || !recipientId) return;
    setIsBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_id: recipientId, content: content.trim() }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setStatusMsg("✅ Message envoyé !");
      resetForm();
    } catch (err: unknown) {
      setStatusMsg(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAnnounce(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setIsBusy(true);
    setStatusMsg("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/announce`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      setStatusMsg("📢 Annonce diffusée !");
      resetForm();
    } catch (err: unknown) {
      setStatusMsg(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSecretRoll(e: FormEvent) {
    e.preventDefault();
    if (!formula.trim()) return;
    setIsBusy(true);
    setStatusMsg("");
    try {
      const body: Record<string, unknown> = { formula: formula.trim(), label: label.trim() || "Jet secret" };
      if (recipientId) body.recipient_id = recipientId;
      const res = await fetch(`/api/campaigns/${campaignId}/secret-roll`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Erreur ${res.status}`);
      setStatusMsg(`🎲 Résultat : ${data.roll_data?.total ?? "?"}`);
      resetForm();
    } catch (err: unknown) {
      setStatusMsg(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setIsBusy(false);
    }
  }

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "message", icon: <MessageSquare size={14} />, label: "Msg privé" },
    { id: "announce", icon: <Megaphone size={14} />, label: "Annonce" },
    { id: "secret", icon: <Dice1 size={14} />, label: "Jet secret" },
  ];

  return (
    <div className="gm-message-panel">
      <div className="message-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`message-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => { setTab(t.id); setStatusMsg(""); }}
            type="button"
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Destinataire ───────────────────────────────────────── */}
      {tab !== "announce" && (
        <div className="message-field">
          <label>Destinataire</label>
          <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}>
            <option value="">-- Choisir un joueur --</option>
            {players.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.display_name} ({p.role})</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Message privé / Annonce ────────────────────────────── */}
      {(tab === "message" || tab === "announce") && (
        <form onSubmit={tab === "message" ? handleSendMessage : handleAnnounce} className="message-form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={tab === "announce" ? "📢 Annonce à tous les joueurs..." : "💬 Message privé..."}
            rows={3}
            maxLength={tab === "announce" ? 1000 : 2000}
          />
          <button className="primary-button compact" disabled={isBusy || !content.trim()} type="submit">
            <Send size={14} /> {tab === "announce" ? "Diffuser" : "Envoyer"}
          </button>
        </form>
      )}

      {/* ── Jet secret ─────────────────────────────────────────── */}
      {tab === "secret" && (
        <form onSubmit={handleSecretRoll} className="message-form">
          <div className="message-field">
            <label>Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex: Perception du dragon" maxLength={200} />
          </div>
          <div className="message-field">
            <label>Formule</label>
            <input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="2d6+4" maxLength={100} />
          </div>
          <button className="primary-button compact" disabled={isBusy || !formula.trim()} type="submit">
            <Dice1 size={14} /> Lancer (secret)
          </button>
        </form>
      )}

      {statusMsg && <p className="message-status">{statusMsg}</p>}
    </div>
  );
}
