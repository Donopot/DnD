import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import type { Spell } from "../api/types";

type SpellbookPanelProps = {
  token: string;
};

const SCHOOLS = [
  "abjuration",
  "conjuration",
  "divination",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation",
];

const CLASSES = ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"];

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function SpellbookPanel({ token }: SpellbookPanelProps) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<number | null>(null);
  const [school, setSchool] = useState("");
  const [spellClass, setSpellClass] = useState("");
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  async function search() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (level !== null) params.set("level", String(level));
      if (school) params.set("school", school);
      if (spellClass) params.set("class", spellClass);
      params.set("limit", "100");

      const spells = await apiRequest<Spell[]>(`/api/spells?${params}`, token);
      setSpells(spells);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void search();
  }, []);

  function levelLabel(l: number): string {
    if (l === 0) return "Cantrip";
    if (l === 1) return "1er";
    if (l === 2) return "2e";
    return `${l}e`;
  }

  return (
    <div className="bestiary-panel">
      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="bestiary-filters">
        <div className="bestiary-search-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un sort..."
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button
            className="primary-button compact"
            onClick={search}
            type="button"
            disabled={loading}
          >
            <Search size={14} />
          </button>
        </div>

        <div className="bestiary-filter-row">
          <select
            value={school}
            onChange={(e) => {
              setSchool(e.target.value);
            }}
          >
            <option value="">Toutes écoles</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={spellClass}
            onChange={(e) => {
              setSpellClass(e.target.value);
            }}
          >
            <option value="">Toutes classes</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="bestiary-cr-row">
          {LEVELS.map((l) => (
            <button
              key={l}
              className={`bestiary-cr-chip ${level === l ? "active" : ""}`}
              onClick={() => setLevel(level === l ? null : l)}
              type="button"
            >
              {levelLabel(l)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="bestiary-list">
        {spells.map((s) => (
          <button
            key={s.id}
            className="bestiary-row"
            onClick={() => setSelectedSpell(s)}
            type="button"
          >
            <span className="bestiary-cr">Niv. {s.level}</span>
            <span className="bestiary-name">{s.name}</span>
            <span className="bestiary-meta">
              {s.school}
              {s.ritual ? " · Rituel" : ""}
              {s.concentration ? " · Concentration" : ""}
            </span>
          </button>
        ))}
        {spells.length === 0 && !loading && <p className="muted">Aucun sort trouvé.</p>}
      </div>

      {/* ── Detail modal ─────────────────────────────────────── */}
      {selectedSpell && (
        <div className="modal-overlay" onClick={() => setSelectedSpell(null)}>
          <div className="bestiary-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bestiary-detail-header">
              <div>
                <h2>{selectedSpell.name}</h2>
                <p className="bestiary-subtitle">
                  {selectedSpell.level === 0 ? "Cantrip" : `Niveau ${selectedSpell.level}`} ·{" "}
                  {selectedSpell.school}
                  {selectedSpell.ritual && " · Rituel"}
                  {selectedSpell.concentration && " · Concentration"}
                </p>
              </div>
              <button className="ghost-button" onClick={() => setSelectedSpell(null)} type="button">
                <X size={18} />
              </button>
            </div>

            <div className="bestiary-stats-grid">
              <div>
                <strong>Casting Time</strong> {selectedSpell.casting_time}
              </div>
              <div>
                <strong>Range</strong> {selectedSpell.range}
              </div>
              <div>
                <strong>Components</strong> {selectedSpell.components}
              </div>
              <div>
                <strong>Duration</strong> {selectedSpell.duration}
              </div>
            </div>

            <div className="bestiary-detail-section">
              <strong>Classes</strong> {selectedSpell.classes.join(", ")}
            </div>

            <div className="bestiary-detail-section">
              <p style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selectedSpell.description}</p>
            </div>

            {selectedSpell.higher_level && (
              <div className="bestiary-detail-section">
                <h3>At Higher Levels</h3>
                <p style={{ lineHeight: 1.5 }}>{selectedSpell.higher_level}</p>
              </div>
            )}

            <div className="bestiary-detail-footer">
              <em>Source: {selectedSpell.source}</em>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
