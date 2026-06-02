import {
  Castle,
  Dice1,
  Download,
  HeartPulse,
  MessageSquare,
  RefreshCw,
  ScrollText,
  Shield,
  Swords,
  Upload,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  Campaign,
  Character,
  Combatant,
  Encounter,
  GameLogEntry,
  Handout,
  Roll,
  Scene,
  SceneToken,
} from "../api/types";
import { CampaignMap } from "./CampaignMap";
import { EditCharacterSheet } from "./EditCharacterSheet";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { PlayerNotifications } from "./PlayerNotifications";
import { useSceneBackground } from "../hooks/useSceneBackground";

// ─── Types ────────────────────────────────────────────────────────────────

type PlayerViewProps = {
  campaign: Campaign;
  token: string;
  userId: string;
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

type TabId = "characters" | "map" | "dice" | "handouts" | "combat" | "journal";

// ─── API helpers ──────────────────────────────────────────────────────────

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
  userId,
  userDisplayName,
  presenceCount,
  onLogout,
}: PlayerViewProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"offline" | "connecting" | "online">("offline");

  const [summary, setSummary] = useState<PlayerSummary | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [logEntries, setLogEntries] = useState<GameLogEntry[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("characters");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [combatNotification, setCombatNotification] = useState("");

  // ─── Map state (scenes, tokens, background) ──────────────────────────
  const [playerScenes, setPlayerScenes] = useState<Scene[]>([]);
  const [playerScene, setPlayerScene] = useState<Scene | null>(null);
  const [playerTokens, setPlayerTokens] = useState<SceneToken[]>([]);
  const sceneBackgroundObjectUrl = useSceneBackground(playerScene, token);

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
  const [diceMode, setDiceMode] = useState<"normal" | "advantage" | "disadvantage">("normal");
  const [diceResult, setDiceResult] = useState<Roll | null>(null);

  // ─── Journal note ──────────────────────────────────────────────────────
  const [noteText, setNoteText] = useState("");

  const cid = campaign.id;

  // ─── WebSocket ─────────────────────────────────────────────────────────
  useEffect(() => {
    wsRef.current?.close();
    setRealtimeStatus("offline");

    if (!token || !cid) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/ws/campaigns/${cid}`,
    );
    wsRef.current = socket;
    setRealtimeStatus("connecting");

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "auth", token }));
      setRealtimeStatus("online");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "session_changed") {
          void loadSessionLog();
          if (payload.resource === "handout") {
            void loadHandouts();
          }
          if (payload.resource === "encounter") {
            void loadCombatState();
            setCombatNotification("Le combat a été mis à jour !");
          }
          if (payload.resource === "scene" || payload.resource === "token") {
            void loadPlayerMapData();
          }
        }
      } catch {
        /* ignore malformed messages */
      }
    };

    socket.onclose = () => setRealtimeStatus("offline");
    socket.onerror = () => setRealtimeStatus("offline");

    return () => socket.close();
  }, [cid, token]);

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
      setMessage(error instanceof Error ? error.message : "Erreur chargement données");
    }
  }

  async function loadSessionLog() {
    try {
      const entries = await playerRequest<GameLogEntry[]>(
        `/campaigns/${cid}/log?limit=50`,
        token,
      ).catch(() => [] as GameLogEntry[]);
      setLogEntries(entries.filter((e) => e.visibility === "public"));
    } catch { /* ignore */ }
  }

  async function loadHandouts() {
    try {
      setHandouts(await playerRequest<Handout[]>(`/campaigns/${cid}/player/handouts`, token));
    } catch { /* ignore */ }
  }

  async function loadCombatState() {
    try {
      setEncounters(await playerRequest<Encounter[]>(`/campaigns/${cid}/encounters`, token).catch(() => []));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void loadPlayerData();
    void loadSessionLog();
    void loadPlayerMapData();
  }, [cid]);

  // ─── Map data loading ──────────────────────────────────────────────────
  async function loadPlayerMapData() {
    try {
      const scenes = await playerRequest<Scene[]>(`/campaigns/${cid}/player/scenes`, token).catch(() => [] as Scene[]);
      setPlayerScenes(scenes);
      const active = scenes.find((s: Scene) => s.is_active) ?? scenes[0] ?? null;
      if (active) {
        setPlayerScene(active);
        await loadPlayerTokens(active.id);
      }
    } catch { /* ignore */ }
  }

  async function loadPlayerTokens(sceneId: string) {
    try {
      const tokens = await playerRequest<SceneToken[]>(`/player/scenes/${sceneId}/tokens`, token).catch(() => [] as SceneToken[]);
      setPlayerTokens(tokens);
    } catch { /* ignore */ }
  }

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
      setMessage(`${character.name} créé !`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur création personnage");
    } finally {
      setIsBusy(false);
    }
  }

  // ─── Character import/export ───────────────────────────────────────────
  function handleExportCharacter() {
    if (!selectedCharacter) return;
    const blob = new Blob([JSON.stringify(selectedCharacter, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedCharacter.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(`${selectedCharacter.name} exporté !`);
  }

  function handleImportCharacter() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as Character;
        // Create a new character from the imported data
        const pb = Math.max(2, Math.ceil(imported.level / 4) + 1);
        const character = await playerRequest<Character>(
          `/campaigns/${cid}/characters`,
          token,
          {
            method: "POST",
            body: JSON.stringify({
              name: imported.name || "Perso importé",
              ancestry: imported.ancestry || "",
              class_name: imported.class_name || "",
              level: imported.level || 1,
              armor_class: imported.armor_class || 10,
              speed: imported.speed || 30,
              proficiency_bonus: pb,
              hp_current: imported.hp_max || imported.hp_current || 1,
              hp_max: imported.hp_max || 10,
              attributes: imported.attributes || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
              skills: imported.skills || {},
              saving_throws: imported.saving_throws || {},
              attacks: imported.attacks || [],
              inventory: imported.inventory || [],
              spells: imported.spells || [],
              resources: imported.resources || [],
              notes: imported.notes || "",
            }),
          },
        );
        setCharacters((current) => [character, ...current]);
        setSelectedCharacter(character);
        setMessage(`${character.name} importé !`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erreur import");
      }
    };
    input.click();
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
            mode: diceMode,
            visibility: "public",
            character_id: selectedCharacter?.id ?? null,
          }),
        },
      );
      setRolls((current) => [roll, ...current].slice(0, 50));
      setDiceResult(roll);
      setMessage(`Résultat: ${roll.total}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur lancer de dés");
    } finally {
      setIsBusy(false);
    }
  }

  // ─── Quick roll from buttons ────────────────────────────────────────────
  async function handleQuickRoll(formula: string, label: string, mode: Roll["mode"]) {
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
            formula,
            label,
            mode,
            visibility: "public",
            character_id: selectedCharacter?.id ?? null,
          }),
        },
      );
      setRolls((current) => [roll, ...current].slice(0, 50));
      setDiceResult(roll);
      setMessage(`Résultat: ${roll.total}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur lancer de dés");
    } finally {
      setIsBusy(false);
    }
  }

  // ─── Quick d20 / skill roll ────────────────────────────────────────────
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

  // ─── Skill modifiers ───────────────────────────────────────────────────
  const skillMods = useMemo(() => {
    if (!selectedCharacter) return [] as { name: string; mod: number }[];
    const skillNames: Record<string, string[]> = {
      str: ["Athlétisme"],
      dex: ["Acrobaties", "Discrétion", "Escamotage"],
      con: [], // Constitution has no standard skills
      int: ["Arcanes", "Histoire", "Investigation", "Nature", "Religion"],
      wis: ["Dressage", "Médecine", "Perception", "Perspicacité", "Survie"],
      cha: ["Intimidation", "Persuasion", "Représentation", "Tromperie"],
    };

    const skills = selectedCharacter.skills as Record<string, unknown> || {};
    const result: { name: string; mod: number }[] = [];

    for (const [attr, names] of Object.entries(skillNames)) {
      const attrBonus = attrMod[attr] ?? 0;
      for (const name of names) {
        const hasProficiency = skills[name] === "proficient" || skills[name] === "expertise";
        const hasExpertise = skills[name] === "expertise";
        const profBonus = hasExpertise
          ? (selectedCharacter.proficiency_bonus ?? 2) * 2
          : hasProficiency
            ? (selectedCharacter.proficiency_bonus ?? 2)
            : 0;
        result.push({ name, mod: attrBonus + profBonus });
      }
    }

    return result;
  }, [selectedCharacter, attrMod]);

  // ─── Quick d20 modifiers ───────────────────────────────────────────────
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
    ];
  }, [selectedCharacter, attrMod]);

  // ─── Note posting ──────────────────────────────────────────────────────
  async function handlePostNote(event: FormEvent) {
    event.preventDefault();
    if (!cid || !noteText.trim()) return;
    setIsBusy(true);
    try {
      await playerRequest(`/campaigns/${cid}/log`, token, {
        method: "POST",
        body: JSON.stringify({
          message: noteText.trim(),
          visibility: "public",
        }),
      });
      setNoteText("");
      setMessage("Note envoyée !");
      void loadSessionLog();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur envoi note");
    } finally {
      setIsBusy(false);
    }
  }

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
        <span className={`realtime-pill ${realtimeStatus}`}>{realtimeStatus}</span>
        <span className="player-status">
          <Swords aria-hidden="true" /> {presenceCount} connecté(s)
        </span>
        <span className="player-status">
          <Shield aria-hidden="true" /> {userDisplayName} (joueur)
        </span>
        <PlayerNotifications
          campaignId={campaign.id}
          token={token}
          userId={userId}
        />
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
              <p>Crée ton premier personnage.</p>
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

          {/* Import / Export */}
          {characters.length > 0 && (
            <div className="player-char-io">
              <button className="ghost-button compact" onClick={handleExportCharacter} type="button" disabled={!selectedCharacter}>
                <Download size={14} /> Exporter
              </button>
              <button className="ghost-button compact" onClick={handleImportCharacter} type="button">
                <Upload size={14} /> Importer
              </button>
            </div>
          )}
        </div>

        {/* Character sheet + quick rolls */}
        {selectedCharacter ? (
          <>
            <EditCharacterSheet
              character={selectedCharacter}
              token={token}
              isBusy={isBusy}
              onSave={(updated) => {
                setCharacters((current) =>
                  current.map((c) => (c.id === updated.id ? updated : c)),
                );
              }}
            />
            {/* Quick attribute rolls */}
            <div className="player-quick-rolls">
              <p className="small-label">Caractéristiques</p>
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
            {/* Skill rolls */}
            {skillMods.length > 0 && (
              <div className="player-quick-rolls">
                <p className="small-label">Compétences</p>
                <div className="quick-roll-buttons">
                  {skillMods.map((sk) => (
                    <button
                      key={sk.name}
                      className="quick-roll-btn skill"
                      onClick={() => void quickD20(sk.mod, sk.name)}
                      type="button"
                    >
                      {sk.name} {sk.mod >= 0 ? "+" : ""}{sk.mod}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="muted">Sélectionne un personnage.</p>
        )}

        {/* Simplified creation form */}
        <div className="player-char-create">
          <h3>Créer un personnage</h3>
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
            <div className="ability-grid" aria-label="Caractéristiques">
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
              Créer le personnage
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
            <Dice1 aria-hidden="true" /> Lancer les dés
          </h3>

          {/* Quick d20 buttons */}
          <div className="quick-dice-row">
            <button className="quick-dice-btn" onClick={() => handleQuickRoll("1d20", "Initiative", "normal")} type="button">🎯 Initiative</button>
            <button className="quick-dice-btn" onClick={() => handleQuickRoll("1d20", "Attaque", "normal")} type="button">⚔️ Attaque</button>
            <button className="quick-dice-btn" onClick={() => handleQuickRoll("1d20", "Avantage", "advantage")} type="button">⬆ Avantage</button>
            <button className="quick-dice-btn" onClick={() => handleQuickRoll("1d20", "Désavantage", "disadvantage")} type="button">⬇ Désav.</button>
            <button className="quick-dice-btn" onClick={() => handleQuickRoll("1d20", "Sauvegarde", "normal")} type="button">🛡️ Sauvegarde</button>
            <button className="quick-dice-btn" onClick={() => handleQuickRoll("1d20", "Compétence", "normal")} type="button">🔍 Compétence</button>
          </div>

          <form onSubmit={handleRoll} className="form-stack">
            <label>
              {selectedCharacter ? `Joueur: ${selectedCharacter.name}` : "Aucun personnage sélectionné"}
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
              Libellé (optionnel)
              <input
                value={diceLabel}
                onChange={(e) => setDiceLabel(e.target.value)}
                placeholder="Attaque, discrétion..."
              />
            </label>
            <div className="dice-mode-toggle" aria-label="Mode de lancer">
              <button
                className={diceMode === "normal" ? "active" : ""}
                onClick={() => setDiceMode("normal")}
                type="button"
              >
                Normal
              </button>
              <button
                className={diceMode === "advantage" ? "active" : ""}
                onClick={() => setDiceMode("advantage")}
                type="button"
              >
                ⬆ Avantage
              </button>
              <button
                className={diceMode === "disadvantage" ? "active" : ""}
                onClick={() => setDiceMode("disadvantage")}
                type="button"
              >
                ⬇ Désavantage
              </button>
            </div>
            <button className="primary-button" disabled={isBusy} type="submit">
              <Dice1 aria-hidden="true" /> Lancer
            </button>
          </form>

          {diceResult && (
            <div className="dice-result-highlight">
              <Dice1 size={32} aria-hidden="true" />
              <div>
                <strong>{diceResult.total}</strong>
                <small>{diceResult.formula} — {diceResult.label || "Jet"}{diceResult.mode !== "normal" ? ` (${diceResult.mode})` : ""}</small>
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
                    {roll.mode !== "normal" ? ` (${roll.mode})` : ""}
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
        <ScrollText aria-hidden="true" /> Documents partagés
      </h3>
      {handouts.length === 0 ? (
        <div className="empty-state compact-empty">
          <ScrollText aria-hidden="true" />
          <p>Aucun document partagé pour le moment.</p>
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
                <MarkdownRenderer content={handout.content} className="handout-content" />
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
        <Swords aria-hidden="true" /> État du combat
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
                  <small>{enc.status === "active" ? "⚔️ En cours" : enc.status === "ended" ? "✓ Terminé" : "✏ Préparation"}</small>
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
                  <div
                    className={`combatant-readonly-row ${combatant.is_player_controlled ? "my-turn" : ""}`}
                    key={combatant.id}
                  >
                    <span>
                      <strong>{combatant.name}</strong>
                      {combatant.is_player_controlled && (
                        <small className="my-turn-badge">🎯 Ton perso</small>
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

  // ── Journal tab ────────────────────────────────────────────────────────
  const journalTab = (
    <section className="player-tab journal">
      <div className="player-journal-layout">
        {/* Note input */}
        <form className="player-note-form" onSubmit={handlePostNote}>
          <h3>
            <MessageSquare aria-hidden="true" /> Écrire une note
          </h3>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Décris ce que ton personnage fait, pose une question au MJ..."
            rows={3}
            maxLength={2000}
          />
          <button className="primary-button compact" disabled={isBusy || !noteText.trim()} type="submit">
            Envoyer
          </button>
        </form>

        {/* Session log */}
        <div className="player-session-log">
          <div className="section-heading">
            <h3>Journal de session</h3>
            <button className="ghost-button compact" onClick={() => void loadSessionLog()} type="button">
              <RefreshCw size={14} />
            </button>
          </div>
          {logEntries.length === 0 ? (
            <p className="muted">Aucun événement pour le moment.</p>
          ) : (
            <div className="log-list-compact">
              {logEntries.map((entry) => (
                <div className="log-row-compact" key={entry.id}>
                  <span className="log-entry-type">{entry.entry_type === "roll" ? "🎲" : entry.entry_type === "note" ? "📝" : "📋"}</span>
                  <span className="log-entry-msg">{entry.message}</span>
                  {entry.character_id && (
                    <span className="log-entry-char">
                      · {characters.find((c) => c.id === entry.character_id)?.name ?? "PJ"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  // ─── Main render — split layout: map | panels ──────────────────────────
  return (
    <main className="player-campaign-shell">
      {campaignHeader}

      <div className="player-workspace">
        {/* ── Map (left) ──────────────────────────────────────── */}
        <section className="player-map-area">
          <CampaignMap
            isGM={false}
            wsRef={wsRef}
            userId={userId}
            campaignId={cid}
            token={token}
            scenes={playerScenes}
            selectedScene={playerScene ?? undefined}
            selectedSceneId={playerScene?.id ?? ""}
            sceneTokens={playerTokens}
            sceneBackgroundObjectUrl={sceneBackgroundObjectUrl}
            characters={characters}
          />
        </section>

        {/* ── Panels (right) — tabbed ────────────────────────── */}
        <aside className="player-panels">
          {/* Tab bar */}
          <nav className="player-tab-bar" role="tablist" aria-label="Sections joueur">
            {([
              ["characters", "👤", "Persos"],
              ["dice", "🎲", "Dés"],
              ["handouts", "📄", "Docs"],
              ["combat", "⚔️", "Combat"],
              ["journal", "📝", "Journal"],
            ] as const).map(([id, icon, label]) => (
              <button
                key={id}
                className={`player-tab-btn${activeTab === id ? " active" : ""}`}
                onClick={() => setActiveTab(id)}
                role="tab"
                aria-selected={activeTab === id}
                type="button"
                title={label}
              >
                <span className="tab-icon">{icon}</span>
                <span className="tab-label">{label}</span>
              </button>
            ))}
          </nav>

          {/* Tab content */}
          <div className="player-tab-content">
            {activeTab === "characters" && charactersTab}
            {activeTab === "dice" && diceTab}
            {activeTab === "handouts" && handoutsTab}
            {activeTab === "combat" && combatTab}
            {activeTab === "journal" && journalTab}
          </div>
        </aside>
      </div>

      {message && (
        <div className="player-toast">
          <p>{message}</p>
          <button className="ghost-button" onClick={() => setMessage("")} type="button">
            ✕
          </button>
        </div>
      )}

      {combatNotification && (
        <div className="combat-notification" onAnimationEnd={() => setCombatNotification("")}>
          ⚔️ {combatNotification}
        </div>
      )}
    </main>
  );
}
