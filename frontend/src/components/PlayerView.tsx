import {
  Castle,
  Dice1,
  HeartPulse,
  RefreshCw,
  ScrollText,
  Shield,
  Swords,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  Campaign,
  Character,
  Combatant,
  Encounter,
  Handout,
  Member,
  Roll,
} from "../api/types";

// ─── Types ────────────────────────────────────────────────────────────────

type PlayerViewProps = {
  campaign: Campaign;
  token: string;
  userDisplayName: string;
  presenceCount: number;
  onLogout: () => void;
};

type PlayerCharacterFormData = {
  name: string;
  ancestry: string;
  class_name: string;
  level: number;
  hp_max: number;
  armor_class: number;
  speed: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

type PlayerSummary = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string;
  gm_name: string;
  gm_email: string;
  member_count: number;
  members: { user_id: string; display_name: string; role: string }[];
  created_at: string;
};

// ─── API helpers (inline to keep component self-contained) ───────────────

async function playerRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ─── Main Component ──────────────────────────────────────────────────────

export function PlayerView({
  campaign,
  token,
  userDisplayName,
  presenceCount,
  onLogout,
}: PlayerViewProps) {
  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [activeTab, setActiveTab] = useState<"characters" | "dice" | "handouts" | "combat">(
    "characters",
  );
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  // ─── Character creation form ───────────────────────────────────────────
  const [charForm, setCharForm] = useState<PlayerCharacterFormData>({
    name: "",
    ancestry: "",
    class_name: "",
    level: 1,
    hp_max: 10,
    armor_class: 10,
    speed: 30,
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  });

  // ─── Dice roller ───────────────────────────────────────────────────────
  const [diceFormula, setDiceFormula] = useState("1d20");
  const [diceLabel, setDiceLabel] = useState("");
  const [diceResult, setDiceResult] = useState<Roll | null>(null);

  const cid = campaign.id;

  // ─── Data loading ──────────────────────────────────────────────────────
  async function loadPlayerData() {
    try {
      const [sum, chars, hands, encs, rollsData] = await Promise.all([
        playerRequest<PlayerSummary>(`/campaigns/${cid}/player/summary`, token),
        playerRequest<Character[]>(`/campaigns/${cid}/player/characters`, token),
        playerRequest<Handout[]>(`/campaigns/${cid}/player/handouts`, token),
        playerRequest<Encounter[]>(`/campaigns/${cid}/encounters`, token).catch(() => [] as Encounter[]),
        playerRequest<Roll[]>(`/campaigns/${cid}/rolls?limit=50`, token).catch(() => [] as Roll[]),
      ]);
      setSummary(sum);
      setCharacters(chars);
      setHandouts(hands);
      setEncounters(encs);
      setRolls(rollsData);
      if (chars.length > 0 && !selectedCharacter) {
        setSelectedCharacter(chars[0]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur chargement donnees");
    }
  }

  useEffect(() => {
    void loadPlayerData();
  }, [cid]);

  // ─── Load encounter detail ─────────────────────────────────────────────
  async function loadEncounterDetail(encounterId: string) {
    try {
      const detail = await playerRequest<{
        id: string;
        name: string;
        status: string;
        round_number: number;
        turn_index: number;
        combatants: Combatant[];
      }>(`/player/encounters/${encounterId}`, token);
      setSelectedEncounter({
        id: detail.id,
        campaign_id: cid,
        scene_id: null,
        name: detail.name,
        status: detail.status as Encounter["status"],
        round_number: detail.round_number,
        turn_index: detail.turn_index,
        active_combatant_id: null,
        created_at: "",
        updated_at: "",
      });
      setCombatants(detail.combatants);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur chargement combat");
    }
  }

  useEffect(() => {
    if (encounters.length > 0 && !selectedEncounter) {
      void loadEncounterDetail(encounters[0].id);
    }
  }, [encounters]);

  // ─── Character creation ────────────────────────────────────────────────
  async function handleCreateCharacter(event: FormEvent) {
    event.preventDefault();
    if (!cid) return;
    setIsBusy(true);
    setMessage("");

    const pb = Math.max(2, Math.ceil(charForm.level / 4) + 1);

    try {
      const character = await playerRequest<Character>(
        `/campaigns/${cid}/characters`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: charForm.name,
            ancestry: charForm.ancestry,
            class_name: charForm.class_name,
            level: charForm.level,
            armor_class: charForm.armor_class,
            speed: charForm.speed,
            proficiency_bonus: pb,
            hp_current: charForm.hp_max,
            hp_max: charForm.hp_max,
            attributes: {
              str: charForm.str,
              dex: charForm.dex,
              con: charForm.con,
              int: charForm.int,
              wis: charForm.wis,
              cha: charForm.cha,
            },
            inventory: [],
            spells: [],
            attacks: [],
            resources: [],
            notes: "",
          }),
        },
      );

      setCharacters((current) => [character, ...current]);
      setSelectedCharacter(character);
      setCharForm({
        name: "", ancestry: "", class_name: "", level: 1,
        hp_max: 10, armor_class: 10, speed: 30,
        str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
      });
      setMessage(`${character.name} cree !`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur creation personnage");
    } finally {
      setIsBusy(false);
    }
  }

  // ─── Dice roller ───────────────────────────────────────────────────────
  async function handleRoll(event: FormEvent) {
    event.preventDefault();
    if (!cid) return;
    setIsBusy(true);
    setMessage("");

    try {
      const roll = await playerRequest<Roll>(
        `/campaigns/${cid}/rolls`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            formula: diceFormula,
            label: diceLabel || diceFormula,
            mode: "normal",
            visibility: "public",
            character_id: selectedCharacter?.id ?? null,
          }),
        },
      );
      setRolls((current) => [roll, ...current].slice(0, 50));
      setDiceResult(roll);
      setMessage(`Resultat: ${roll.total}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur lancer de des");
    } finally {
      setIsBusy(false);
    }
  }

  // ─── Quick d20 ─────────────────────────────────────────────────────────
  async function quickD20(modifier: number, label: string) {
    if (!cid) return;
    try {
      const roll = await playerRequest<Roll>(
        `/campaigns/${cid}/rolls`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            formula: `1d20${modifier >= 0 ? "+" : ""}${modifier}`,
            label: label,
            mode: "normal",
            visibility: "public",
            character_id: selectedCharacter?.id ?? null,
          }),
        },
      );
      setRolls((current) => [roll, ...current].slice(0, 50));
      setDiceResult(roll);
      setMessage(`${label}: ${roll.total}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur lancer");
    }
  }

  // ─── Attribute modifier ────────────────────────────────────────────────
  const attrMod = useMemo(() => {
    if (!selectedCharacter) return {} as Record<string, number>;
    const mods: Record<string, number> = {};
    for (const [key, value] of Object.entries(selectedCharacter.attributes)) {
      mods[key] = Math.floor((value - 10) / 2);
    }
    return mods;
  }, [selectedCharacter]);

  // ─── Quick d20 modifiers based on selected character ───────────────────
  const quickRolls = useMemo(() => {
    if (!selectedCharacter) return [{ label: "d20", mod: 0 }];
    return [
      { label: "Jet nu", mod: 0 },
      { label: "FOR", mod: attrMod.str ?? 0 },
      { label: "DEX", mod: attrMod.dex ?? 0 },
      { label: "CON", mod: attrMod.con ?? 0 },
      { label: "INT", mod: attrMod.int ?? 0 },
      { label: "SAG", mod: attrMod.wis ?? 0 },
      { label: "CHA", mod: attrMod.cha ?? 0 },
      { label: "Bonus Maitrise", mod: (attrMod.str ?? 0) + selectedCharacter.proficiency_bonus },
    ];
  }, [selectedCharacter, attrMod]);

  // ─── Views ─────────────────────────────────────────────────────────────

  // ── Campaign header ────────────────────────────────────────────────────
  const campaignHeader = (
    <header className="player-campaign-header">
      <div>
        <h2>
          <Castle aria-hidden="true" /> {summary?.name ?? campaign.name}
        </h2>
        {summary && (
          <p className="muted">
            MJ: {summary.gm_name} ({summary.gm_email}) · {summary.member_count} membre(s)
          </p>
        )}
      </div>
      <div className="player-header-meta">
        <span className="player-status">
          <Swords aria-hidden="true" /> {presenceCount} connecte(s)
        </span>
        <span className="player-status">
          <Shield aria-hidden="true" /> {userDisplayName} (joueur)
        </span>
        <button className="ghost-button" onClick={onLogout} type="button">
          Quitter
        </button>
      </div>
    </header>
  );

  // ── Characters tab ─────────────────────────────────────────────────────
  const charactersTab = (
    <section className="player-tab characters">
      <div className="player-char-layout">
        {/* Character list */}
        <div className="player-char-sidebar">
          <h3>Mes personnages</h3>
          {characters.length === 0 ? (
            <div className="empty-state compact-empty">
              <ScrollText aria-hidden="true" />
              <p>Cree ton premier personnage.</p>
            </div>
          ) : (
            characters.map((char) => (
              <button
                className={`player-char-row ${selectedCharacter?.id === char.id ? "selected" : ""}`}
                key={char.id}
                onClick={() => setSelectedCharacter(char)}
                type="button"
              >
                <span>
                  <strong>{char.name}</strong>
                  <small>
                    {char.class_name || "Aventurier"} niv.{char.level}
                  </small>
                </span>
                <em>
                  <HeartPulse size={14} aria-hidden="true" /> {char.hp_current}/{char.hp_max}
                </em>
              </button>
            ))
          )}
        </div>

        {/* Character sheet preview */}
        {selectedCharacter ? (
          <article className="player-sheet-preview">
            <div className="sheet-title">
              <div>
                <h4>{selectedCharacter.name}</h4>
                <p>
                  {selectedCharacter.ancestry || "Origine libre"} ·{" "}
                  {selectedCharacter.class_name || "Classe libre"} · niv. {selectedCharacter.level}
                </p>
              </div>
              <HeartPulse aria-hidden="true" />
            </div>
            <div className="stat-strip">
              <span>CA {selectedCharacter.armor_class}</span>
              <span>PV {selectedCharacter.hp_current}/{selectedCharacter.hp_max}</span>
              <span>VIT {selectedCharacter.speed}</span>
              <span>PB +{selectedCharacter.proficiency_bonus}</span>
            </div>
            <div className="ability-summary">
              {Object.entries(selectedCharacter.attributes).map(([key, value]) => (
                <span key={key}>
                  <strong>{key.toUpperCase()}</strong>
                  {value}
                  <small>({Math.floor((value - 10) / 2) >= 0 ? "+" : ""}
                    {Math.floor((value - 10) / 2)})</small>
                </span>
              ))}
            </div>
            {selectedCharacter.notes && (
              <p className="sheet-notes">{selectedCharacter.notes}</p>
            )}
            {/* Quick roll buttons */}
            <div className="player-quick-rolls">
              <p className="small-label">Jets rapides</p>
              <div className="quick-roll-buttons">
                {quickRolls.map((qr) => (
                  <button
                    key={qr.label}
                    className="quick-roll-btn"
                    onClick={() => void quickD20(qr.mod, qr.label)}
                    type="button"
                  >
                    {qr.label} {qr.mod >= 0 ? "+" : ""}{qr.mod}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ) : (
          <p className="muted">Selectionne un personnage.</p>
        )}

        {/* Simplified creation form */}
        <div className="player-char-create">
          <h3>Creer un personnage</h3>
          <form onSubmit={handleCreateCharacter} className="form-stack">
            <label>
              Nom *
              <input
                value={charForm.name}
                onChange={(e) =>
                  setCharForm((f) => ({ ...f, name: e.target.value }))
                }
                minLength={2}
                maxLength={120}
                required
              />
            </label>
            <label>
              Origine
              <input
                value={charForm.ancestry}
                onChange={(e) =>
                  setCharForm((f) => ({ ...f, ancestry: e.target.value }))
                }
                maxLength={80}
                placeholder="Humain, elfe..."
              />
            </label>
            <label>
              Classe
              <input
                value={charForm.class_name}
                onChange={(e) =>
                  setCharForm((f) => ({ ...f, class_name: e.target.value }))
                }
                maxLength={80}
                placeholder="Guerrier, mage..."
              />
            </label>
            <div className="mini-grid">
              <label>
                Niveau
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={charForm.level}
                  onChange={(e) =>
                    setCharForm((f) => ({ ...f, level: Number(e.target.value) || 1 }))
                  }
                />
              </label>
              <label>
                PV max
                <input
                  type="number"
                  min={1}
                  value={charForm.hp_max}
                  onChange={(e) =>
                    setCharForm((f) => ({ ...f, hp_max: Number(e.target.value) || 1 }))
                  }
                />
              </label>
              <label>
                CA
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={charForm.armor_class}
                  onChange={(e) =>
                    setCharForm((f) => ({
                      ...f,
                      armor_class: Number(e.target.value) || 10,
                    }))
                  }
                />
              </label>
              <label>
                Vitesse
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={charForm.speed}
                  onChange={(e) =>
                    setCharForm((f) => ({ ...f, speed: Number(e.target.value) || 30 }))
                  }
                />
              </label>
            </div>
            <div className="ability-grid" aria-label="Caracteristiques">
              {(["str", "dex", "con", "int", "wis", "cha"] as const).map((ability) => (
                <label key={ability}>
                  {ability.toUpperCase()}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={charForm[ability]}
                    onChange={(e) =>
                      setCharForm((f) => ({
                        ...f,
                        [ability]: Number(e.target.value) || 10,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <button className="primary-button" disabled={isBusy} type="submit">
              <ScrollText aria-hidden="true" />
              Creer le personnage
            </button>
          </form>
        </div>
      </div>
    </section>
  );

  // ── Dice tab ───────────────────────────────────────────────────────────
  const diceTab = (
    <section className="player-tab dice">
      <div className="player-dice-layout">
        {/* Dice roller */}
        <div className="player-dice-roller">
          <h3>
            <Dice1 aria-hidden="true" /> Lancer les des
          </h3>
          <form onSubmit={handleRoll} className="form-stack">
            <label>
              {selectedCharacter ? `Joueur: ${selectedCharacter.name}` : "Aucun personnage selectionne"}
            </label>
            <label>
              Formule
              <input
                value={diceFormula}
                onChange={(e) => setDiceFormula(e.target.value)}
                placeholder="1d20, 2d6+3..."
                required
              />
            </label>
            <label>
              Libelle (optionnel)
              <input
                value={diceLabel}
                onChange={(e) => setDiceLabel(e.target.value)}
                placeholder="Attaque, discretion..."
              />
            </label>
            <button className="primary-button" disabled={isBusy} type="submit">
              <Dice1 aria-hidden="true" /> Lancer
            </button>
          </form>

          {diceResult && (
            <div className="dice-result-highlight">
              <Dice1 size={32} aria-hidden="true" />
              <div>
                <strong>{diceResult.total}</strong>
                <small>{diceResult.formula} — {diceResult.label || "Jet"}</small>
              </div>
            </div>
          )}
        </div>

        {/* Roll history */}
        <div className="player-roll-history">
          <h3>Historique des jets</h3>
          {rolls.length === 0 ? (
            <p className="muted">Aucun jet pour le moment.</p>
          ) : (
            <div className="roll-list-compact">
              {rolls.map((roll) => (
                <div className="roll-row-compact" key={roll.id}>
                  <span className="roll-total">{roll.total}</span>
                  <span className="roll-formula">{roll.formula}</span>
                  <span className="roll-label">
                    {roll.label || ""}
                    {roll.character_id ? " · " + (characters.find((c) => c.id === roll.character_id)?.name ?? "PJ") : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  // ── Handouts tab ───────────────────────────────────────────────────────
  const handoutsTab = (
    <section className="player-tab handouts">
      <h3>
        <ScrollText aria-hidden="true" /> Documents partages
      </h3>
      {handouts.length === 0 ? (
        <div className="empty-state compact-empty">
          <ScrollText aria-hidden="true" />
          <p>Aucun document partage pour le moment.</p>
        </div>
      ) : (
        <div className="handout-list">
          {handouts.map((handout) => (
            <article className={`handout-card ${handout.is_revealed ? "revealed" : ""}`} key={handout.id}>
              <div className="handout-card-header">
                <h4>{handout.title}</h4>
                <span className={`handout-visibility-badge ${handout.visibility}`}>
                  {handout.visibility === "public" ? "🌐 Public" : "👥 Joueurs"}
                </span>
              </div>
              {handout.content && (
                <pre className="handout-content">{handout.content}</pre>
              )}
              {!handout.content && (
                <p className="muted">Aucun contenu textuel.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );

  // ── Combat tab (read-only) ─────────────────────────────────────────────
  const combatTab = (
    <section className="player-tab combat">
      <h3>
        <Swords aria-hidden="true" /> Etat du combat
      </h3>
      {encounters.length === 0 ? (
        <div className="empty-state compact-empty">
          <Swords aria-hidden="true" />
          <p>Aucun combat en cours.</p>
        </div>
      ) : (
        <div className="player-combat-view">
          <div className="encounter-list">
            {encounters.map((enc) => (
              <button
                className={`player-char-row ${selectedEncounter?.id === enc.id ? "selected" : ""}`}
                key={enc.id}
                onClick={() => void loadEncounterDetail(enc.id)}
                type="button"
              >
                <span>
                  <strong>{enc.name}</strong>
                  <small>{enc.status === "active" ? "⚔️ En cours" : enc.status === "ended" ? "✓ Termine" : "✏ Preparation"}</small>
                </span>
                {enc.status === "active" && <em>Round {enc.round_number}</em>}
              </button>
            ))}
          </div>
          {selectedEncounter && combatants.length > 0 && (
            <div className="combatant-readonly-list">
              <p className="small-label">
                {selectedEncounter.status === "active"
                  ? `Round ${selectedEncounter.round_number}`
                  : selectedEncounter.status}
              </p>
              {combatants
                .filter((c) => !c.is_hidden)
                .sort((a, b) => b.initiative - a.initiative)
                .map((combatant) => (
                  <div className="combatant-readonly-row" key={combatant.id}>
                    <span>
                      <strong>{combatant.name}</strong>
                      {combatant.is_player_controlled && (
                        <small>👤 Joueur</small>
                      )}
                    </span>
                    <span>
                      Initiative {combatant.initiative}
                      {combatant.is_defeated && " · ⚰️"}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </section>
  );

  // ─── Main render ───────────────────────────────────────────────────────
  return (
    <main className="player-view">
      {campaignHeader}

      <div className="player-tab-bar">
        <button
          className={`player-tab-btn ${activeTab === "characters" ? "active" : ""}`}
          onClick={() => setActiveTab("characters")}
          type="button"
        >
          <ScrollText size={16} aria-hidden="true" /> Personnages
        </button>
        <button
          className={`player-tab-btn ${activeTab === "dice" ? "active" : ""}`}
          onClick={() => setActiveTab("dice")}
          type="button"
        >
          <Dice1 size={16} aria-hidden="true" /> Des
        </button>
        <button
          className={`player-tab-btn ${activeTab === "handouts" ? "active" : ""}`}
          onClick={() => setActiveTab("handouts")}
          type="button"
        >
          <ScrollText size={16} aria-hidden="true" /> Documents
        </button>
        <button
          className={`player-tab-btn ${activeTab === "combat" ? "active" : ""}`}
          onClick={() => setActiveTab("combat")}
          type="button"
        >
          <Swords size={16} aria-hidden="true" /> Combat
        </button>
      </div>

      <div className="player-tab-content">
        {activeTab === "characters" && charactersTab}
        {activeTab === "dice" && diceTab}
        {activeTab === "handouts" && handoutsTab}
        {activeTab === "combat" && combatTab}
      </div>

      {message && (
        <div className="player-toast">
          <p>{message}</p>
          <button className="ghost-button" onClick={() => setMessage("")} type="button">
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
