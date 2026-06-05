import { Heart, Plus, Shield, Swords, Trash2, Zap } from "lucide-react";
import { type FormEvent, useState } from "react";

import { apiRequest } from "../api/client";
import type { Character } from "../api/types";

const CONDITIONS_LIST = [
  "À terre",
  "Aveuglé",
  "Charmé",
  "Empoisonné",
  "Étourdi",
  "Inconscient",
  "Neutralisé",
  "Paralysé",
  "Pétrifié",
  "Terrifié",
  "Agrippé",
  "Restreint",
  "Assourdi",
  "Fatigué",
  "Épuisé",
  "En feu",
  "Béni",
  "Maudit",
] as const;

type GmCharacterInspectorProps = {
  character: Character;
  token: string;
  onClose: () => void;
  onCharacterUpdated: (updated: Character) => void;
};

export function GmCharacterInspector({
  character,
  token,
  onClose,
  onCharacterUpdated,
}: GmCharacterInspectorProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // ── XP form ───────────────────────────────────────────────────────────────
  const [xpAmount, setXpAmount] = useState(0);
  const [xpNote, setXpNote] = useState("");

  // ── HP form ───────────────────────────────────────────────────────────────
  const [hpAmount, setHpAmount] = useState(0);
  const [hpNote, setHpNote] = useState("");

  // ── Conditions checkboxes ─────────────────────────────────────────────────
  const [activeConditions, setActiveConditions] = useState<Set<string>>(
    () => new Set((character.conditions as Array<{ name: string }>)?.map((c) => c.name) ?? []),
  );

  // ── Inventory item form ───────────────────────────────────────────────────
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemDesc, setItemDesc] = useState("");

  async function apiCall<T>(path: string, body: unknown): Promise<T | null> {
    setBusy(true);
    setMessage("");
    try {
      const data = await apiRequest<T>(`/api${path}`, token, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onCharacterUpdated(data as Character);
      return data;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
      return null;
    } finally {
      setBusy(false);
    }
  }

  // ── XP ────────────────────────────────────────────────────────────────────
  async function handleAddXp(e: FormEvent) {
    e.preventDefault();
    await apiCall(`/characters/${character.id}/xp`, {
      amount: xpAmount,
      note: xpNote || undefined,
    });
  }

  // ── HP ────────────────────────────────────────────────────────────────────
  async function handleHpAdjust(amount: number, note?: string) {
    await apiCall(`/characters/${character.id}/hp`, { amount, note: note ?? "" });
  }

  // ── Conditions ────────────────────────────────────────────────────────────
  function toggleCondition(name: string) {
    const next = new Set(activeConditions);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setActiveConditions(next);
  }

  async function saveConditions() {
    const conds = Array.from(activeConditions).map((name) => ({ name }));
    await apiCall(`/characters/${character.id}/conditions`, { conditions: conds });
  }

  // ── Inventory ─────────────────────────────────────────────────────────────
  async function handleAddItem(e: FormEvent) {
    e.preventDefault();
    const ok = await apiCall(`/characters/${character.id}/inventory`, {
      action: "add",
      item: { name: itemName, quantity: itemQty, description: itemDesc },
    });
    if (ok) {
      setItemName("");
      setItemQty(1);
      setItemDesc("");
    }
  }

  async function handleRemoveItem(index: number) {
    await apiCall(`/characters/${character.id}/inventory`, {
      action: "remove",
      item: {},
      index,
    });
  }

  const inventory = (character.inventory as Array<Record<string, unknown>>) ?? [];
  const conds = (character.conditions as Array<{ name: string }>) ?? [];

  return (
    <div
      className="gm-char-inspector backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="gm-char-inspector modal">
        {/* Header */}
        <div className="inspect-header">
          <h2>{character.name}</h2>
          <span className="muted">
            {character.class_name} {character.ancestry} — Niv. {character.level}
          </span>
          <button className="close-btn" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="inspect-body">
          {/* ── Quick stats ──────────────────────────────────────────────── */}
          <div className="inspect-stats">
            <div className="stat-card">
              <Heart size={14} />
              <span className="stat-label">PV</span>
              <span className="stat-value">
                {character.hp_current} / {character.hp_max}
              </span>
              <span className="stat-bar">
                <span
                  className="stat-fill"
                  style={{ width: `${(character.hp_current / character.hp_max) * 100}%` }}
                />
              </span>
            </div>
            <div className="stat-card">
              <Shield size={14} />
              <span className="stat-label">CA</span>
              <span className="stat-value">{character.armor_class}</span>
            </div>
            <div className="stat-card">
              <Zap size={14} />
              <span className="stat-label">XP</span>
              <span className="stat-value">{character.xp ?? 0}</span>
            </div>
            <div className="stat-card">
              <Swords size={14} />
              <span className="stat-label">Bonus</span>
              <span className="stat-value">+{character.proficiency_bonus}</span>
            </div>
          </div>

          {/* ── HP quick actions ──────────────────────────────────────────── */}
          <section className="inspect-section">
            <h4>❤️ Points de vie</h4>
            <div className="hp-actions">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleHpAdjust(hpAmount, hpNote);
                }}
              >
                <div className="inspect-row">
                  <input
                    type="number"
                    value={hpAmount}
                    onChange={(e) => setHpAmount(Number(e.target.value))}
                    className="hp-input"
                    placeholder="PV"
                  />
                  <input
                    type="text"
                    value={hpNote}
                    onChange={(e) => setHpNote(e.target.value)}
                    className="note-input"
                    placeholder="Note (optionnel)"
                  />
                  <button
                    className="primary-button compact"
                    disabled={busy || hpAmount === 0}
                    type="submit"
                  >
                    Appliquer
                  </button>
                </div>
              </form>
              <div className="hp-quick">
                <button
                  onClick={() => handleHpAdjust(5, "Soin +5 PV")}
                  className="quick-btn heal"
                  type="button"
                >
                  +5
                </button>
                <button
                  onClick={() => handleHpAdjust(-5, "Dégâts 5")}
                  className="quick-btn damage"
                  type="button"
                >
                  -5
                </button>
                <button
                  onClick={() => handleHpAdjust(10, "Soin +10 PV")}
                  className="quick-btn heal"
                  type="button"
                >
                  +10
                </button>
                <button
                  onClick={() => handleHpAdjust(-10, "Dégâts 10")}
                  className="quick-btn damage"
                  type="button"
                >
                  -10
                </button>
              </div>
            </div>
          </section>

          {/* ── XP ────────────────────────────────────────────────────────── */}
          <section className="inspect-section">
            <h4>⭐ Expérience</h4>
            <form onSubmit={handleAddXp} className="inspect-row">
              <input
                type="number"
                value={xpAmount}
                onChange={(e) => setXpAmount(Number(e.target.value))}
                min={0}
                className="xp-input"
                placeholder="XP à ajouter"
              />
              <input
                type="text"
                value={xpNote}
                onChange={(e) => setXpNote(e.target.value)}
                className="note-input"
                placeholder="Raison (ex: Gobelins)"
              />
              <button
                className="primary-button compact"
                disabled={busy || xpAmount <= 0}
                type="submit"
              >
                <Plus size={12} /> Ajouter
              </button>
            </form>
            <p className="xp-total muted">Total actuel : {character.xp ?? 0} XP</p>
          </section>

          {/* ── Conditions ────────────────────────────────────────────────── */}
          <section className="inspect-section">
            <h4>⚠️ États / Conditions</h4>
            <div className="conditions-grid">
              {CONDITIONS_LIST.map((name) => (
                <label
                  key={name}
                  className={`cond-chip ${activeConditions.has(name) ? "active" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={activeConditions.has(name)}
                    onChange={() => toggleCondition(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
            <button
              className="primary-button"
              onClick={saveConditions}
              disabled={busy}
              type="button"
            >
              Enregistrer les conditions
            </button>
            {conds.length > 0 && (
              <div className="active-conds muted">
                Actives : {conds.map((c) => c.name).join(", ")}
              </div>
            )}
          </section>

          {/* ── Inventory ─────────────────────────────────────────────────── */}
          <section className="inspect-section">
            <h4>🎒 Inventaire ({inventory.length})</h4>

            <form onSubmit={handleAddItem} className="inspect-row">
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Objet"
                className="item-name-input"
                required
              />
              <input
                type="number"
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
                min={1}
                className="item-qty-input"
                placeholder="Qté"
              />
              <input
                type="text"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                className="note-input"
                placeholder="Description"
              />
              <button className="primary-button compact" disabled={busy} type="submit">
                <Plus size={12} /> Ajouter
              </button>
            </form>

            {inventory.length > 0 && (
              <ul className="inv-list">
                {inventory.map((item, i) => (
                  <li key={i} className="inv-item">
                    <span className="inv-name">{String(item.name ?? "?")}</span>
                    {item.quantity ? (
                      <span className="inv-qty">x{String(item.quantity)}</span>
                    ) : null}
                    {item.description ? (
                      <span className="inv-desc muted">{String(item.description)}</span>
                    ) : null}
                    <button
                      className="inv-remove"
                      onClick={() => handleRemoveItem(i)}
                      disabled={busy}
                      type="button"
                      title="Retirer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Message / error ───────────────────────────────────────────── */}
          {message && <p className="inspect-message">{message}</p>}
        </div>
      </div>
    </div>
  );
}
