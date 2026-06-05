import { Dice1, Plus, Swords } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { apiRequest } from "../api/client";

// D&D 5e XP thresholds per character level
const XP_THRESHOLDS: Record<string, Record<number, number>> = {
  easy: {
    1: 25,
    2: 50,
    3: 75,
    4: 125,
    5: 250,
    6: 300,
    7: 350,
    8: 450,
    9: 550,
    10: 600,
    11: 800,
    12: 1000,
    13: 1100,
    14: 1250,
    15: 1400,
    16: 1600,
    17: 2000,
    18: 2100,
    19: 2400,
    20: 2800,
  },
  medium: {
    1: 50,
    2: 100,
    3: 150,
    4: 250,
    5: 500,
    6: 600,
    7: 750,
    8: 900,
    9: 1100,
    10: 1200,
    11: 1600,
    12: 2000,
    13: 2200,
    14: 2500,
    15: 2800,
    16: 3200,
    17: 3900,
    18: 4200,
    19: 4900,
    20: 5700,
  },
  hard: {
    1: 75,
    2: 150,
    3: 225,
    4: 375,
    5: 750,
    6: 900,
    7: 1100,
    8: 1400,
    9: 1600,
    10: 1900,
    11: 2400,
    12: 3000,
    13: 3400,
    14: 3800,
    15: 4300,
    16: 4800,
    17: 5900,
    18: 6300,
    19: 7300,
    20: 8500,
  },
  deadly: {
    1: 100,
    2: 200,
    3: 400,
    4: 500,
    5: 1100,
    6: 1400,
    7: 1700,
    8: 2100,
    9: 2400,
    10: 2800,
    11: 3600,
    12: 4500,
    13: 5100,
    14: 5700,
    15: 6400,
    16: 7200,
    17: 8800,
    18: 9500,
    19: 10900,
    20: 12700,
  },
};

// CR → XP conversion
const CR_XP: Record<string, number> = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
};

// Random encounter templates by environment
const RANDOM_ENCOUNTERS: Record<string, Array<{ name: string; cr: string; count: string }>> = {
  forest: [
    { name: "Gobelins", cr: "1/4", count: "2d4" },
    { name: "Loup", cr: "1/4", count: "1d4" },
    { name: "Ours noir", cr: "1/2", count: "1d2" },
    { name: "Araignée géante", cr: "1", count: "1d3" },
    { name: "Dryade", cr: "1", count: "1" },
    { name: "Owlbear", cr: "3", count: "1" },
    { name: "Guenaudes", cr: "1/2", count: "2d3" },
    { name: "Sylves", cr: "1/4", count: "3d6" },
    { name: "Serpent venimeux", cr: "1/8", count: "2d4" },
    { name: "Sanglier géant", cr: "2", count: "1d2" },
  ],
  dungeon: [
    { name: "Squelettes", cr: "1/4", count: "2d6" },
    { name: "Zombie", cr: "1/4", count: "2d4" },
    { name: "Mimique", cr: "2", count: "1" },
    { name: "Gelée ocre", cr: "2", count: "1" },
    { name: "Goule", cr: "1", count: "1d4" },
    { name: "Golem de pierre", cr: "10", count: "1" },
    { name: "Beholder zombie", cr: "5", count: "1" },
    { name: "Cube gélatineux", cr: "2", count: "1" },
    { name: "Ombre", cr: "1/2", count: "1d6" },
    { name: "Worg", cr: "1/2", count: "2d4" },
  ],
  mountain: [
    { name: "Orques", cr: "1/2", count: "2d6" },
    { name: "Harpie", cr: "1", count: "1d4" },
    { name: "Géant des collines", cr: "5", count: "1" },
    { name: "Griffon", cr: "2", count: "1d2" },
    { name: "Manticore", cr: "3", count: "1" },
    { name: "Aigle géant", cr: "1", count: "1d3" },
    { name: "Troll", cr: "5", count: "1d2" },
    { name: "Basilic", cr: "3", count: "1" },
  ],
  swamp: [
    { name: "Bullywug", cr: "1/4", count: "2d6" },
    { name: "Crocodile", cr: "1/2", count: "1d4" },
    { name: "Hydre", cr: "8", count: "1" },
    { name: "Troll putride", cr: "5", count: "1" },
    { name: "Serpent constricteur", cr: "1/4", count: "1d3" },
    { name: "Will-o'-wisp", cr: "2", count: "1d3" },
    { name: "Shambling Mound", cr: "5", count: "1" },
  ],
  urban: [
    { name: "Bandits", cr: "1/8", count: "3d6" },
    { name: "Garde", cr: "1/8", count: "2d6" },
    { name: "Assassin", cr: "8", count: "1" },
    { name: "Voleur", cr: "1/2", count: "1d4" },
    { name: "Doppelganger", cr: "3", count: "1" },
    { name: "Gargouille", cr: "2", count: "1d4" },
    { name: "Rakshasa", cr: "13", count: "1" },
  ],
  coastal: [
    { name: "Sahuagin", cr: "1/2", count: "2d6" },
    { name: "Pirate", cr: "1/8", count: "3d6" },
    { name: "Crabe géant", cr: "1/8", count: "2d4" },
    { name: "Merrow", cr: "2", count: "1d4" },
    { name: "Requin chasseur", cr: "2", count: "1d3" },
    { name: "Serpent de mer", cr: "10", count: "1" },
    { name: "Aboleth", cr: "10", count: "1" },
  ],
};

// Multiplier for number of monsters
function encounterMultiplier(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 1.5;
  if (count <= 6) return 2;
  if (count <= 10) return 2.5;
  if (count <= 14) return 3;
  return 4;
}

type MonsterEntry = { name: string; cr: string; count: number };
type Difficulty = "easy" | "medium" | "hard" | "deadly" | "impossible";

type EncounterBuilderProps = {
  campaignId: string;
  token: string;
};

export function EncounterBuilder({ campaignId, token }: EncounterBuilderProps) {
  const [partyLevel, setPartyLevel] = useState(1);
  const [partySize, setPartySize] = useState(4);
  const [monsters, setMonsters] = useState<MonsterEntry[]>([]);
  const [environment, setEnvironment] = useState("forest");
  const [monsterName, setMonsterName] = useState("");
  const [monsterCr, setMonsterCr] = useState("1");
  const [monsterCount, setMonsterCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // Calculate difficulty
  const difficulty = useMemo((): { rating: Difficulty; xp: number; threshold: number } => {
    let totalXp = 0;
    let totalCount = 0;
    for (const m of monsters) {
      const crXp = CR_XP[m.cr] || 0;
      totalXp += crXp * m.count;
      totalCount += m.count;
    }
    const adjusted = Math.round(totalXp * encounterMultiplier(totalCount));

    const level = Math.min(20, Math.max(1, partyLevel));
    const easyThreshold = XP_THRESHOLDS.easy[level] * partySize;
    const mediumThreshold = XP_THRESHOLDS.medium[level] * partySize;
    const hardThreshold = XP_THRESHOLDS.hard[level] * partySize;
    const deadlyThreshold = XP_THRESHOLDS.deadly[level] * partySize;

    let rating: Difficulty;
    if (adjusted < easyThreshold) rating = "easy";
    else if (adjusted < mediumThreshold) rating = "medium";
    else if (adjusted < hardThreshold) rating = "hard";
    else if (adjusted < deadlyThreshold) rating = "deadly";
    else rating = "impossible";

    return { rating, xp: adjusted, threshold: deadlyThreshold };
  }, [monsters, partyLevel, partySize]);

  function addMonster(e: FormEvent) {
    e.preventDefault();
    if (!monsterName.trim()) return;
    setMonsters((prev) => [
      ...prev,
      { name: monsterName.trim(), cr: monsterCr, count: monsterCount },
    ]);
    setMonsterName("");
    setMonsterCr("1");
    setMonsterCount(1);
  }

  function removeMonster(idx: number) {
    setMonsters((prev) => prev.filter((_, i) => i !== idx));
  }

  function rollDice(notation: string): number {
    const match = notation.match(/^(\d+)d(\d+)$/);
    if (!match) return 1;
    const [, num, sides] = match;
    let total = 0;
    for (let i = 0; i < parseInt(num); i++) {
      total += Math.floor(Math.random() * parseInt(sides)) + 1;
    }
    return total;
  }

  function generateRandom() {
    const templates = RANDOM_ENCOUNTERS[environment] || RANDOM_ENCOUNTERS.forest;
    // Pick 1-3 random templates, filtered by party level
    const viable = templates.filter(
      (t) => (CR_XP[t.cr] || 0) <= (XP_THRESHOLDS.deadly[Math.min(20, partyLevel)] || 9999),
    );
    const picked = [...viable]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);
    const newMonsters: MonsterEntry[] = picked.map((t) => ({
      name: t.name,
      cr: t.cr,
      count: rollDice(t.count),
    }));
    setMonsters(newMonsters);
  }

  async function createEncounter() {
    if (monsters.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const encounter = await apiRequest<{ id: string; name: string }>(
        `/api/campaigns/${campaignId}/encounters`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ name: `Rencontre ${environment}` }),
        },
      );

      for (const m of monsters) {
        for (let i = 0; i < m.count; i++) {
          await apiRequest(`/api/encounters/${encounter.id}/combatants`, token, {
            method: "POST",
            body: JSON.stringify({
              name: m.count > 1 ? `${m.name} #${i + 1}` : m.name,
              initiative: 0,
              armor_class: 10 + Math.floor(Math.random() * 8),
              hp_current: Math.floor(20 + Math.random() * 50),
              hp_max: Math.floor(20 + Math.random() * 50),
              is_player_controlled: false,
            }),
          });
        }
      }

      setMessage(
        `Combat "${encounter.name}" créé avec ${monsters.reduce((s, m) => s + m.count, 0)} combattants !`,
      );
      setMonsters([]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(false);
  }

  const diffColors: Record<Difficulty, string> = {
    easy: "#22c55e",
    medium: "#eab308",
    hard: "#f97316",
    deadly: "#ef4444",
    impossible: "#7c3aed",
  };
  const diffLabels: Record<Difficulty, string> = {
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    deadly: "Mortel",
    impossible: "TPK probable",
  };

  return (
    <div className="encounter-builder">
      {/* Party config */}
      <div className="eb-config">
        <label>
          Niveau moyen:
          <input
            type="number"
            value={partyLevel}
            onChange={(e) => setPartyLevel(Number(e.target.value))}
            min={1}
            max={20}
          />
        </label>
        <label>
          Joueurs:
          <input
            type="number"
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            min={1}
            max={10}
          />
        </label>
      </div>

      {/* Add monster form */}
      <form onSubmit={addMonster} className="eb-add-form">
        <input
          type="text"
          value={monsterName}
          onChange={(e) => setMonsterName(e.target.value)}
          placeholder="Nom du monstre"
          required
        />
        <select value={monsterCr} onChange={(e) => setMonsterCr(e.target.value)}>
          {Object.keys(CR_XP).map((cr) => (
            <option key={cr} value={cr}>
              CR {cr}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={monsterCount}
          onChange={(e) => setMonsterCount(Number(e.target.value))}
          min={1}
          max={20}
          style={{ width: 50 }}
        />
        <button type="submit" disabled={busy} className="primary-button compact">
          <Plus size={12} />
        </button>
      </form>

      {/* Random encounter */}
      <div className="eb-random">
        <select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
          {Object.keys(RANDOM_ENCOUNTERS).map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>
        <button onClick={generateRandom} disabled={busy} className="combat-btn" type="button">
          <Dice1 size={12} /> Aléatoire
        </button>
      </div>

      {/* Monster list */}
      {monsters.length > 0 && (
        <div className="eb-monsters">
          {monsters.map((m, i) => (
            <div key={i} className="eb-monster-row">
              <span className="eb-monster-name">{m.name}</span>
              <span className="eb-monster-cr">CR {m.cr}</span>
              <span className="eb-monster-count">×{m.count}</span>
              <button
                onClick={() => removeMonster(i)}
                className="inv-remove"
                type="button"
                title="Retirer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Difficulty meter */}
      {monsters.length > 0 && (
        <div className="eb-difficulty">
          <div className="eb-diff-bar">
            <span
              className="eb-diff-fill"
              style={{
                width: `${Math.min(100, (difficulty.xp / Math.max(1, difficulty.threshold)) * 100)}%`,
                background: diffColors[difficulty.rating],
              }}
            />
          </div>
          <div className="eb-diff-info">
            <span style={{ color: diffColors[difficulty.rating], fontWeight: 700 }}>
              {diffLabels[difficulty.rating]}
            </span>
            <span className="muted">{difficulty.xp.toLocaleString()} XP ajusté</span>
          </div>
        </div>
      )}

      {/* Create encounter */}
      {monsters.length > 0 && (
        <button onClick={createEncounter} disabled={busy} className="primary-button" type="button">
          <Swords size={14} /> Créer le combat
        </button>
      )}

      {message && <p className="combat-message">{message}</p>}
    </div>
  );
}
