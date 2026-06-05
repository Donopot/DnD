import { ArrowLeft, ArrowRight, Check, Dice1 } from "lucide-react";
import { useState } from "react";

import { apiRequest } from "../api/client";
import type { Character } from "../api/types";

// ─── Race data (simplified SRD) ────────────────────────────────────────────

const RACES: { name: string; asi: Record<string, number>; traits: string[] }[] = [
  {
    name: "Humain",
    asi: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: ["Langue supplémentaire"],
  },
  {
    name: "Elfe (haut)",
    asi: { dex: 2, int: 1 },
    traits: ["Vision dans le noir 60 ft.", "Perception", "Transe", "Langues: Commun, Elfique"],
  },
  {
    name: "Elfe (sylvestre)",
    asi: { dex: 2, wis: 1 },
    traits: ["Vision dans le noir 60 ft.", "Perception", "Transe", "Masque de la nature"],
  },
  {
    name: "Nain (collines)",
    asi: { con: 2, wis: 1 },
    traits: ["Vision dans le noir 60 ft.", "Résistance au poison", "Armes naines"],
  },
  {
    name: "Nain (montagnes)",
    asi: { str: 2, con: 2 },
    traits: ["Vision dans le noir 60 ft.", "Résistance au poison", "Armures intermédiaires"],
  },
  {
    name: "Halfelin",
    asi: { dex: 2, cha: 1 },
    traits: ["Chanceux", "Brave", "Agilité halfeline", "Petite taille"],
  },
  {
    name: "Demi-elfe",
    asi: { cha: 2, dex: 1, con: 1 },
    traits: ["Vision dans le noir 60 ft.", "Ascendance féérique", "2 compétences"],
  },
  {
    name: "Demi-orc",
    asi: { str: 2, con: 1 },
    traits: ["Vision dans le noir 60 ft.", "Endurance implacable", "Attaques sauvages"],
  },
  {
    name: "Gnome (forêts)",
    asi: { int: 2, dex: 1 },
    traits: ["Vision dans le noir 60 ft.", "Ruse gnome (magie)"],
  },
  {
    name: "Tieffelin",
    asi: { cha: 2, int: 1 },
    traits: ["Vision dans le noir 60 ft.", "Résistance au feu", "Thaumaturgie"],
  },
  {
    name: "Drakéide",
    asi: { str: 2, cha: 1 },
    traits: ["Souffle draconique", "Résistance aux dégâts (selon ascendance)"],
  },
];

const CLASSES: { name: string; hd: number; primary: string; skills: string[] }[] = [
  {
    name: "Barbare",
    hd: 12,
    primary: "Force",
    skills: ["Athlétisme", "Intimidation", "Nature", "Perception", "Survie"],
  },
  {
    name: "Barde",
    hd: 8,
    primary: "Charisme",
    skills: [
      "Acrobaties",
      "Discrétion",
      "Escamotage",
      "Histoire",
      "Intuition",
      "Investigation",
      "Médecine",
      "Nature",
      "Perception",
      "Perspicacité",
      "Persuasion",
      "Religion",
      "Représentation",
    ],
  },
  {
    name: "Clerc",
    hd: 8,
    primary: "Sagesse",
    skills: ["Histoire", "Intuition", "Médecine", "Persuasion", "Religion"],
  },
  {
    name: "Druide",
    hd: 8,
    primary: "Sagesse",
    skills: [
      "Arcane",
      "Dressage",
      "Intuition",
      "Médecine",
      "Nature",
      "Perception",
      "Religion",
      "Survie",
    ],
  },
  {
    name: "Ensorceleur",
    hd: 6,
    primary: "Charisme",
    skills: ["Arcane", "Intimidation", "Perspicacité", "Persuasion", "Religion"],
  },
  {
    name: "Guerrier",
    hd: 10,
    primary: "Force ou Dextérité",
    skills: [
      "Acrobaties",
      "Athlétisme",
      "Discrétion",
      "Dressage",
      "Histoire",
      "Intimidation",
      "Perception",
      "Survie",
    ],
  },
  {
    name: "Magicien",
    hd: 6,
    primary: "Intelligence",
    skills: ["Arcane", "Histoire", "Intuition", "Investigation", "Médecine", "Religion"],
  },
  {
    name: "Moine",
    hd: 8,
    primary: "Dextérité",
    skills: ["Acrobaties", "Athlétisme", "Discrétion", "Histoire", "Intuition", "Religion"],
  },
  {
    name: "Paladin",
    hd: 10,
    primary: "Force et Charisme",
    skills: ["Athlétisme", "Intimidation", "Médecine", "Persuasion", "Religion"],
  },
  {
    name: "Rôdeur",
    hd: 10,
    primary: "Dextérité et Sagesse",
    skills: [
      "Athlétisme",
      "Discrétion",
      "Dressage",
      "Intuition",
      "Investigation",
      "Nature",
      "Perception",
      "Survie",
    ],
  },
  {
    name: "Roublard",
    hd: 8,
    primary: "Dextérité",
    skills: [
      "Acrobaties",
      "Athlétisme",
      "Discrétion",
      "Escamotage",
      "Intimidation",
      "Intuition",
      "Investigation",
      "Perception",
      "Perspicacité",
      "Persuasion",
      "Représentation",
    ],
  },
  {
    name: "Sorcier",
    hd: 8,
    primary: "Charisme",
    skills: ["Arcane", "Histoire", "Intimidation", "Investigation", "Nature", "Religion"],
  },
];

const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

type CharacterFormData = {
  name: string;
  race: string;
  class_name: string;
  level: number;
  hp_max: number;
  armor_class: number;
  speed: number;
  stats: Record<string, number>;
};

type CharacterWizardProps = {
  token: string;
  campaignId: string;
  onCreated: () => void;
};

export function CharacterWizard({ token, campaignId, onCreated }: CharacterWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CharacterFormData>({
    name: "",
    race: "",
    class_name: "",
    level: 1,
    hp_max: 10,
    armor_class: 10,
    speed: 30,
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  });
  const [busy, setBusy] = useState(false);

  function setStat(ab: string, val: number) {
    setForm((f) => ({ ...f, stats: { ...f.stats, [ab]: Math.max(3, Math.min(20, val)) } }));
  }

  function applyASI() {
    const race = RACES.find((r) => r.name === form.race);
    if (!race) return;
    const newStats = { ...form.stats };
    for (const [ab, bonus] of Object.entries(race.asi)) {
      const base = form.stats[ab] || 10;
      newStats[ab] = base + bonus;
    }
    setForm((f) => ({ ...f, stats: newStats }));
  }

  function randomStats() {
    const rolls = STANDARD_ARRAY;
    setForm((f) => ({
      ...f,
      stats: {
        str: rolls[0],
        dex: rolls[1],
        con: rolls[2],
        int: rolls[3],
        wis: rolls[4],
        cha: rolls[5],
      },
    }));
  }

  function modifier(score: number) {
    const m = Math.floor((score - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  }

  async function handleCreate() {
    setBusy(true);
    try {
      // Auto-calculate HP and AC
      const cls = CLASSES.find((c) => c.name === form.class_name);
      const hd = cls?.hd ?? 8;
      const hp = hd + Math.floor((form.stats.con - 10) / 2);
      const ac = 10 + Math.floor((form.stats.dex - 10) / 2);
      const spd = form.race?.includes("Nain") ? 25 : 30;

      await apiRequest<Character>(`/api/campaigns/${campaignId}/characters`, token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          ancestry: form.race,
          class_name: form.class_name,
          level: form.level,
          hp_max: Math.max(1, hp),
          hp_current: Math.max(1, hp),
          armor_class: ac,
          speed: spd,
          ...form.stats,
        }),
      });

      onCreated();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="character-wizard">
      {/* ── Progress bar ─────────────────────────────────────── */}
      <div className="wizard-progress">
        {["Race", "Classe", "Stats", "Final"].map((label, i) => (
          <div key={i} className={`wizard-step ${step === i ? "active" : step > i ? "done" : ""}`}>
            <span className="wizard-step-num">{step > i ? <Check size={12} /> : i + 1}</span>
            <span className="wizard-step-label">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Step 0: Name + Race ───────────────────────────────── */}
      {step === 0 && (
        <div className="wizard-body">
          <label>
            Nom du personnage
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Elara"
              minLength={2}
              maxLength={80}
              required
            />
          </label>

          <h4>Choisis une race</h4>
          <div className="wizard-grid">
            {RACES.map((race) => (
              <button
                key={race.name}
                className={`wizard-option ${form.race === race.name ? "selected" : ""}`}
                onClick={() => {
                  setForm((f) => ({ ...f, race: race.name }));
                  applyASI();
                }}
                type="button"
              >
                <strong>{race.name}</strong>
                <small>
                  {Object.entries(race.asi)
                    .map(([ab, b]) => `${ab.toUpperCase()} +${b}`)
                    .join(", ")}
                </small>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 1: Class ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="wizard-body">
          <h4>Choisis une classe</h4>
          <div className="wizard-grid">
            {CLASSES.map((cls) => (
              <button
                key={cls.name}
                className={`wizard-option ${form.class_name === cls.name ? "selected" : ""}`}
                onClick={() => setForm((f) => ({ ...f, class_name: cls.name }))}
                type="button"
              >
                <strong>{cls.name}</strong>
                <small>
                  DV d{cls.hd} · {cls.primary}
                </small>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Stats ─────────────────────────────────────── */}
      {step === 2 && (
        <div className="wizard-body">
          <div className="wizard-stats-header">
            <h4>Attributs</h4>
            <button className="ghost-button compact" onClick={randomStats} type="button">
              <Dice1 size={14} /> Standard Array
            </button>
          </div>

          <div className="wizard-stats">
            {ABILITIES.map((ab) => (
              <div key={ab} className="wizard-stat-row">
                <span className="wizard-stat-label">{ab.toUpperCase()}</span>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={form.stats[ab]}
                  onChange={(e) => setStat(ab, Number(e.target.value))}
                />
                <span className="wizard-stat-mod">{modifier(form.stats[ab])}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: Review ────────────────────────────────────── */}
      {step === 3 && (
        <div className="wizard-body">
          <h4>Récapitulatif</h4>
          <div className="wizard-review">
            <div className="wizard-review-row">
              <strong>Nom</strong> {form.name || "—"}
            </div>
            <div className="wizard-review-row">
              <strong>Race</strong> {form.race || "—"}
            </div>
            <div className="wizard-review-row">
              <strong>Classe</strong> {form.class_name || "—"}
            </div>
            <div className="wizard-review-row">
              <strong>Niveau</strong> {form.level}
            </div>
            <div className="wizard-stats-preview">
              {ABILITIES.map((ab) => (
                <span key={ab} className="wizard-stat-badge">
                  {ab.toUpperCase()}: {form.stats[ab]} ({modifier(form.stats[ab])})
                </span>
              ))}
            </div>
          </div>

          <button
            className="primary-button"
            disabled={busy || !form.name || !form.race || !form.class_name}
            onClick={handleCreate}
            type="button"
          >
            <Check size={16} /> Créer le personnage
          </button>
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────── */}
      <div className="wizard-nav">
        {step > 0 && (
          <button className="ghost-button" onClick={() => setStep((s) => s - 1)} type="button">
            <ArrowLeft size={14} /> Précédent
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < 3 && (
          <button
            className="primary-button"
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !form.name) || (step === 1 && !form.class_name)}
            type="button"
          >
            Suivant <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
