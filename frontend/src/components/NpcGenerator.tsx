import { useState } from "react";
import { apiRequest } from "../api/client";

interface NpcAppearance {
  taille: string;
  carrure: string;
  cheveux: string;
  yeux: string;
  peau: string;
  signe_distinctif: string;
}

interface NpcData {
  race: string;
  genre: string;
  nom: string;
  age: number;
  apparence: NpcAppearance;
  occupation: string;
  personnalite: string;
  ideal: string;
  lien: string;
  defaut: string;
  manierisme: string;
  secret: string;
}

const RACES = [
  "Aléatoire",
  "Humain",
  "Elfe",
  "Nain",
  "Halfelin",
  "Gnome",
  "Demi-elfe",
  "Demi-orc",
  "Tieffelin",
  "Dragonné",
];

const GENRES = ["Aléatoire", "Masculin", "Féminin", "Non-binaire"];

export default function NpcGenerator() {
  const [npc, setNpc] = useState<NpcData | null>(null);
  const [loading, setLoading] = useState(false);
  const [race, setRace] = useState("Aléatoire");
  const [genre, setGenre] = useState("Aléatoire");
  const [history, setHistory] = useState<NpcData[]>([]);
  const [showSecret, setShowSecret] = useState(false);

  const generateNpc = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("dnd_access_token") || "";
      const params = new URLSearchParams();
      if (race !== "Aléatoire") params.set("race", race);
      if (genre !== "Aléatoire") params.set("genre", genre);
      const qs = params.toString();
      const data = await apiRequest<NpcData>(`/api/npc/generate${qs ? "?" + qs : ""}`, token);
      setNpc(data);
      setHistory((prev) => [data, ...prev].slice(0, 10));
      setShowSecret(false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!npc) return;
    const text = [
      `## ${npc.nom}`,
      `**${npc.race}** · ${npc.genre} · ${npc.age} ans`,
      "",
      `**Occupation :** ${npc.occupation}`,
      `**Apparence :** ${npc.apparence.taille}, carrure ${npc.apparence.carrure},`,
      `  cheveux ${npc.apparence.cheveux.toLowerCase()}, yeux ${npc.apparence.yeux.toLowerCase()},`,
      `  peau ${npc.apparence.peau.toLowerCase()}.`,
      `  *Signe distinctif :* ${npc.apparence.signe_distinctif}`,
      "",
      `**Personnalité :** ${npc.personnalite}`,
      `**Idéal :** ${npc.ideal}`,
      `**Lien :** ${npc.lien}`,
      `**Défaut :** ${npc.defaut}`,
      `**Maniérisme :** ${npc.manierisme}`,
    ].join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="npc-generator">
      <div className="npc-controls">
        <select value={race} onChange={(e) => setRace(e.target.value)}>
          {RACES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          {GENRES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={generateNpc} disabled={loading}>
          {loading ? "⚂ Génération…" : "🎲 Générer un PNJ"}
        </button>
        <button className="btn" onClick={() => generateNpc()} title="Générer 5 PNJ">
          ⚡ ×5
        </button>
        {npc && (
          <button className="btn" onClick={copyToClipboard} title="Copier en markdown">
            📋 Copier
          </button>
        )}
      </div>

      {npc && (
        <div className="npc-card">
          <div className="npc-header">
            <h3 className="npc-name">{npc.nom}</h3>
            <span className="npc-race">
              {npc.race} · {npc.genre} · {npc.age} ans
            </span>
          </div>

          <div className="npc-body">
            <div className="npc-section">
              <h4>🎭 Apparence</h4>
              <p>
                {npc.apparence.taille}, carrure {npc.apparence.carrure}. Cheveux{" "}
                {npc.apparence.cheveux.toLowerCase()}, yeux {npc.apparence.yeux.toLowerCase()}, peau{" "}
                {npc.apparence.peau.toLowerCase()}.
              </p>
              <p className="npc-quirk">✦ {npc.apparence.signe_distinctif}</p>
            </div>

            <div className="npc-section">
              <h4>🛠️ Occupation</h4>
              <p>{npc.occupation}</p>
            </div>

            <div className="npc-section">
              <h4>🧠 Personnalité</h4>
              <p>{npc.personnalite}</p>
            </div>

            <div className="npc-traits">
              <div className="npc-trait">
                <span className="trait-label">✨ Idéal</span>
                {npc.ideal}
              </div>
              <div className="npc-trait">
                <span className="trait-label">🔗 Lien</span>
                {npc.lien}
              </div>
              <div className="npc-trait">
                <span className="trait-label">⚠️ Défaut</span>
                {npc.defaut}
              </div>
              <div className="npc-trait">
                <span className="trait-label">💬 Maniérisme</span>
                {npc.manierisme}
              </div>
            </div>

            <div className="npc-section npc-secret">
              <h4 onClick={() => setShowSecret(!showSecret)} style={{ cursor: "pointer" }}>
                {showSecret ? "🔓 Secret" : "🔒 Secret (cliquer pour révéler)"}
              </h4>
              {showSecret && <p>{npc.secret}</p>}
            </div>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="npc-history">
          <h4>📜 Derniers PNJ générés</h4>
          <div className="npc-history-list">
            {history.map((h, i) => (
              <button
                key={i}
                className="npc-history-item"
                onClick={() => {
                  setNpc(h);
                  setShowSecret(false);
                }}
              >
                <strong>{h.nom}</strong> — {h.race}, {h.occupation}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .npc-generator { padding: 8px; }
        .npc-controls {
          display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;
        }
        .npc-controls select {
          background: var(--bg-input, #1c1c1c);
          color: var(--text, #e0e0e0);
          border: 1px solid var(--border, #333);
          border-radius: 6px; padding: 4px 8px; font-size: 13px;
        }
        .npc-card {
          background: var(--bg-card, #1a1a1a);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 8px; overflow: hidden;
        }
        .npc-header {
          background: linear-gradient(135deg, #1f5f43, #163d2c);
          padding: 12px 14px;
        }
        .npc-name { margin: 0; font-size: 18px; color: #f0f0f0; }
        .npc-race { font-size: 12px; color: #a0d0b8; }
        .npc-body { padding: 12px 14px; }
        .npc-section { margin-bottom: 10px; }
        .npc-section h4 { margin: 0 0 4px; font-size: 13px; color: #7eb89a; }
        .npc-section p { margin: 0; font-size: 13px; line-height: 1.5; color: #ccc; }
        .npc-quirk {
          font-style: italic; color: #d4af37 !important;
          margin-top: 4px !important;
        }
        .npc-traits {
          display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
          margin-bottom: 10px;
        }
        .npc-trait {
          background: var(--bg-input, #141414);
          border: 1px solid var(--border, #2a2a2a);
          border-radius: 6px; padding: 6px 8px;
          font-size: 12px; color: #bbb;
        }
        .trait-label {
          display: block; font-size: 10px; text-transform: uppercase;
          color: #7eb89a; margin-bottom: 2px; letter-spacing: 0.5px;
        }
        .npc-secret { margin-top: 4px; }
        .npc-secret h4 { color: #d4af37; user-select: none; }
        .npc-secret p {
          font-style: italic; color: #d4af37; border-left: 2px solid #d4af37;
          padding-left: 8px; margin-top: 4px;
        }
        .npc-history { margin-top: 14px; }
        .npc-history h4 { font-size: 13px; color: #888; margin: 0 0 6px; }
        .npc-history-list { display: flex; flex-direction: column; gap: 3px; }
        .npc-history-item {
          background: none; border: none; color: #999;
          font-size: 12px; text-align: left; padding: 3px 6px;
          cursor: pointer; border-radius: 4px;
        }
        .npc-history-item:hover {
          background: var(--bg-input, #1c1c1c); color: #ddd;
        }
        @media (max-width: 480px) {
          .npc-traits { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
