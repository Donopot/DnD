import { Search, Skull, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { BestiaryCreature } from "../api/types";

type BestiaryPanelProps = {
  token: string;
};

const MONSTER_TYPES = [
  "aberration", "beast", "celestial", "construct", "dragon",
  "elemental", "fey", "fiend", "giant", "humanoid",
  "monstrosity", "ooze", "plant", "undead",
];

const SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"];

const ENVIRONMENTS = [
  "arctic", "coastal", "desert", "forest", "grassland",
  "mountain", "swamp", "underdark", "urban",
];

const CR_RANGES: [number, number, string][] = [
  [0, 0, "CR 0"], [0.125, 0.5, "CR 0–½"], [1, 4, "CR 1–4"],
  [5, 10, "CR 5–10"], [11, 16, "CR 11–16"], [17, 30, "CR 17+"],
];

export function BestiaryPanel({ token }: BestiaryPanelProps) {
  const [creatures, setCreatures] = useState<BestiaryCreature[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [monsterType, setMonsterType] = useState("");
  const [crMin, setCrMin] = useState("");
  const [crMax, setCrMax] = useState("");
  const [size, setSize] = useState("");
  const [environment, setEnvironment] = useState("");
  const [selectedCreature, setSelectedCreature] = useState<BestiaryCreature | null>(null);
  const [offset, setOffset] = useState(0);

  async function search() {
    setLoading(true);
    setOffset(0);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (monsterType) params.set("type", monsterType);
      if (crMin) params.set("cr_min", crMin);
      if (crMax) params.set("cr_max", crMax);
      if (size) params.set("size", size);
      if (environment) params.set("environment", environment);
      params.set("limit", "50");

      const res = await fetch(`/api/bestiary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCreatures(await res.json());
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    const newOffset = offset + 50;
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (monsterType) params.set("type", monsterType);
      if (crMin) params.set("cr_min", crMin);
      if (crMax) params.set("cr_max", crMax);
      if (size) params.set("size", size);
      if (environment) params.set("environment", environment);
      params.set("limit", "50");
      params.set("offset", String(newOffset));

      const res = await fetch(`/api/bestiary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const more = await res.json();
        setCreatures((prev) => [...prev, ...more]);
        setOffset(newOffset);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => { void search(); }, []);

  function crLabel(cr: number): string {
    if (cr === 0.125) return "⅛";
    if (cr === 0.25) return "¼";
    if (cr === 0.5) return "½";
    return String(cr);
  }

  return (
    <div className="bestiary-panel">
      {/* ── Search filters ────────────────────────────────────── */}
      <div className="bestiary-filters">
        <div className="bestiary-search-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une créature..."
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="primary-button compact" onClick={search} type="button" disabled={loading}>
            <Search size={14} /> {loading ? "..." : "Chercher"}
          </button>
        </div>

        <div className="bestiary-filter-row">
          <select value={monsterType} onChange={(e) => { setMonsterType(e.target.value); }}>
            <option value="">Tous types</option>
            {MONSTER_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={size} onChange={(e) => { setSize(e.target.value); }}>
            <option value="">Toutes tailles</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select value={environment} onChange={(e) => { setEnvironment(e.target.value); }}>
            <option value="">Tous environnements</option>
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>{env}</option>
            ))}
          </select>
        </div>

        <div className="bestiary-cr-row">
          {CR_RANGES.map(([min, max, label]) => (
            <button
              key={label}
              className={`bestiary-cr-chip ${crMin === String(min) && crMax === String(max) ? "active" : ""}`}
              onClick={() => {
                setCrMin(crMin === String(min) ? "" : String(min));
                setCrMax(crMax === String(max) ? "" : String(max));
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results list ──────────────────────────────────────── */}
      <div className="bestiary-list">
        {creatures.length === 0 && !loading && (
          <p className="muted">Aucune créature trouvée. Lance une recherche !</p>
        )}

        {creatures.map((c) => (
          <button
            key={c.id}
            className="bestiary-row"
            onClick={() => setSelectedCreature(c)}
            type="button"
          >
            <span className="bestiary-cr">CR {crLabel(c.cr)}</span>
            <span className="bestiary-name">{c.name}</span>
            <span className="bestiary-meta">
              {c.size} {c.type} · {c.alignment}
            </span>
          </button>
        ))}

        {creatures.length > 0 && creatures.length % 50 === 0 && (
          <button className="ghost-button" onClick={loadMore} type="button">
            Charger plus...
          </button>
        )}
      </div>

      {/* ── Detail modal ──────────────────────────────────────── */}
      {selectedCreature && (
        <div className="modal-overlay" onClick={() => setSelectedCreature(null)}>
          <div className="bestiary-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bestiary-detail-header">
              <div>
                <h2>{selectedCreature.name}</h2>
                <p className="bestiary-subtitle">
                  {selectedCreature.size} {selectedCreature.type}, {selectedCreature.alignment}
                </p>
              </div>
              <button className="ghost-button" onClick={() => setSelectedCreature(null)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="bestiary-stats-grid">
              <div><strong>Armor Class</strong> {selectedCreature.ac}{selectedCreature.ac_type ? ` (${selectedCreature.ac_type})` : ""}</div>
              <div><strong>Hit Points</strong> {selectedCreature.hp}</div>
              <div><strong>Speed</strong> {selectedCreature.speed}</div>
              <div className="bestiary-cr-badge"><strong>CR</strong> {crLabel(selectedCreature.cr)} ({selectedCreature.xp} XP)</div>
            </div>

            <div className="bestiary-ability-scores">
              {(["str","dex","con","int","wis","cha"] as const).map((ab) => (
                <div key={ab} className="bestiary-ability">
                  <span className="ability-label">{ab.toUpperCase()}</span>
                  <span className="ability-score">{(selectedCreature as any)[ab]}</span>
                  <span className="ability-mod">
                    {(() => { const s = (selectedCreature as any)[ab]; const m = Math.floor((s-10)/2); return m >= 0 ? `+${m}` : `${m}`; })()}
                  </span>
                </div>
              ))}
            </div>

            {selectedCreature.saves && (
              <div className="bestiary-detail-section">
                <strong>Saving Throws</strong> {selectedCreature.saves}
              </div>
            )}
            {selectedCreature.skills && (
              <div className="bestiary-detail-section">
                <strong>Skills</strong> {selectedCreature.skills}
              </div>
            )}
            {selectedCreature.damage_resistances && (
              <div className="bestiary-detail-section">
                <strong>Damage Resistances</strong> {selectedCreature.damage_resistances}
              </div>
            )}
            {selectedCreature.damage_immunities && (
              <div className="bestiary-detail-section">
                <strong>Damage Immunities</strong> {selectedCreature.damage_immunities}
              </div>
            )}
            {selectedCreature.condition_immunities && (
              <div className="bestiary-detail-section">
                <strong>Condition Immunities</strong> {selectedCreature.condition_immunities}
              </div>
            )}
            <div className="bestiary-detail-section">
              <strong>Senses</strong> {selectedCreature.senses}
            </div>
            <div className="bestiary-detail-section">
              <strong>Languages</strong> {selectedCreature.languages}
            </div>

            {selectedCreature.traits.length > 0 && (
              <div className="bestiary-detail-section">
                <h3>Traits</h3>
                {selectedCreature.traits.map((t, i) => (
                  <div key={i} className="bestiary-trait">
                    <em>{t.name}.</em> {t.desc}
                  </div>
                ))}
              </div>
            )}

            {selectedCreature.actions.length > 0 && (
              <div className="bestiary-detail-section">
                <h3>Actions</h3>
                {selectedCreature.actions.map((a, i) => (
                  <div key={i} className="bestiary-trait">
                    <em>{a.name}.</em> {a.desc}
                  </div>
                ))}
              </div>
            )}

            {selectedCreature.legendary_actions.length > 0 && (
              <div className="bestiary-detail-section">
                <h3>Legendary Actions</h3>
                {selectedCreature.legendary_actions.map((la, i) => (
                  <div key={i} className="bestiary-trait">
                    <em>{la.name}.</em> {la.desc}
                  </div>
                ))}
              </div>
            )}

            {selectedCreature.environment && selectedCreature.environment.length > 0 && (
              <div className="bestiary-detail-section">
                <strong>Environment</strong> {selectedCreature.environment.join(", ")}
              </div>
            )}

            <div className="bestiary-detail-footer">
              <em>Source: {selectedCreature.source}</em>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
