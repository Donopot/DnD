export type User = {
  id: string;
  email: string;
  display_name: string;
  account_type: "gm" | "player";
  created_at: string;
};

export type Campaign = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string;
  role: "gm" | "co_gm" | "player";
  member_count: number;
  created_at: string;
  updated_at: string;
  gm_settings?: Record<string, boolean>;
};

export type Member = {
  user_id: string;
  display_name: string;
  role: string;
  joined_at: string;
};

export type AuthResponse = {
  access_token: string;
  user: User;
};

export type Invite = {
  token: string;
  campaign_id: string;
  role: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
};

export type Character = {
  id: string;
  campaign_id: string;
  owner_user_id: string | null;
  name: string;
  ancestry: string;
  class_name: string;
  level: number;
  armor_class: number;
  speed: number;
  proficiency_bonus: number;
  hp_current: number;
  hp_max: number;
  xp: number;
  conditions: Record<string, unknown>[];
  attributes: Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>;
  skills: Record<string, unknown>;
  saving_throws: Record<string, unknown>;
  attacks: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  spells: Record<string, unknown>[];
  resources: Record<string, unknown>[];
  notes: string;
  created_at: string;
  updated_at: string;
};

/** Minimal player-facing view — returned when querying others' characters */
export type PlayerCharacter = {
  id: string;
  name: string;
  ancestry: string;
  class_name: string;
  level: number;
  armor_class: number;
  speed: number;
  hp_current: number;
  hp_max: number;
  conditions: Record<string, unknown>[];
  status: string;
};

export type Roll = {
  id: string;
  campaign_id: string;
  user_id: string;
  character_id: string | null;
  visibility: "public" | "gm";
  label: string;
  formula: string;
  mode: "normal" | "advantage" | "disadvantage";
  total: number;
  detail: Record<string, unknown>;
  created_at: string;
};

export type GameLogEntry = {
  id: string;
  campaign_id: string;
  user_id: string | null;
  character_id: string | null;
  entry_type: "roll" | "note" | "system";
  visibility: "public" | "gm";
  message: string;
  payload: Record<string, unknown>;
  category: "general" | "combat" | "rp" | "exploration" | "gm_note";
  linked_scene_id: string | null;
  linked_encounter_id: string | null;
  linked_character_id: string | null;
  pinned: boolean;
  session_marker: boolean;
  created_at: string;
};

export type Scene = {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  grid_size: number;
  width: number;
  height: number;
  background_url: string | null;
  background_asset_id: string | null;
  is_active: boolean;
  is_secret: boolean;
  snap_to_grid?: boolean;
  view_zoom?: number;
  view_pan_x?: number;
  view_pan_y?: number;
  created_at: string;
  updated_at: string;
};

export type SceneToken = {
  id: string;
  scene_id: string;
  character_id: string | null;
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
  is_hidden: boolean;
  vision_radius: number;
  z_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type GMNote = {
  id: string;
  campaign_id: string;
  scene_id: string | null;
  token_id: string | null;
  author_user_id: string | null;
  title: string;
  content: string;
  visibility: "gm_team" | "author_only";
  version: number;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: string;
  campaign_id: string;
  uploader_user_id: string | null;
  name: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  asset_type: "map" | "token" | "handout";
  content_url: string;
  created_at: string;
};

export type Encounter = {
  id: string;
  campaign_id: string;
  scene_id: string | null;
  name: string;
  status: "draft" | "active" | "ended";
  round_number: number;
  turn_index: number;
  active_combatant_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CombatantCondition =
  | string
  | {
      name: string;
      duration?: number | null;
      duration_unit?: "rounds" | "minutes" | "hours" | null;
      source?: string | null;
      is_concentration?: boolean;
    };

export type Combatant = {
  id: string;
  encounter_id: string;
  token_id: string | null;
  character_id: string | null;
  name: string;
  initiative: number;
  armor_class: number | null;
  hp_current: number | null;
  hp_max: number | null;
  conditions: CombatantCondition[];
  notes: string;
  is_player_controlled: boolean;
  is_hidden: boolean;
  is_defeated: boolean;
  created_at: string;
  updated_at: string;
};

export type Handout = {
  id: string;
  campaign_id: string;
  author_user_id: string;
  title: string;
  content: string;
  visibility: "public" | "players" | "gm" | "gm_team";
  asset_id: string | null;
  scene_id: string | null;
  is_revealed: boolean;
  revealed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EncounterDetail = Encounter & {
  combatants: Combatant[];
};

export type HomebrewCreature = {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  armor_class: number;
  hp_max: number;
  speed: number;
  attributes: Record<string, number>;
  attacks: Record<string, unknown>[];
  spells: Record<string, unknown>[];
  size: string;
  challenge_rating: number;
  type: string;
  created_at: string;
  updated_at: string;
};

export type HomebrewItem = {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  item_type: string;
  rarity: string;
  properties: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// Phase 21: Communication MJ↔Joueur
export type GmMessage = {
  id: string;
  campaign_id: string;
  sender_id: string;
  recipient_id: string | null;
  content: string;
  kind: "message" | "announcement" | "secret_roll";
  roll_data?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

// ── Bestiary ────────────────────────────────────────────────────────────

export type BestiaryTrait = {
  name: string;
  desc: string;
};

export type BestiaryCreature = {
  id: string;
  name: string;
  type: string;
  size: string;
  alignment: string;
  cr: number;
  xp: number;
  ac: number;
  ac_type: string | null;
  hp: string;
  hp_avg: number;
  speed: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  skills: string | null;
  saves: string | null;
  damage_resistances: string | null;
  damage_immunities: string | null;
  condition_immunities: string | null;
  senses: string;
  languages: string;
  traits: BestiaryTrait[];
  actions: BestiaryTrait[];
  legendary_actions: BestiaryTrait[];
  environment: string[] | null;
  source: string;
  created_at: string;
};

// ── Spells ──────────────────────────────────────────────────────────────

export type Spell = {
  id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  higher_level: string | null;
  classes: string[];
  ritual: boolean;
  concentration: boolean;
  source: string;
  created_at: string;
};

// ── Items ────────────────────────────────────────────────────────────────

export type Item = {
  id: string;
  name: string;
  category: string;
  rarity: string;
  attunement: boolean;
  cost: string | null;
  weight: string | null;
  description: string;
  properties: string[];
  damage: string | null;
  ac: number | null;
  armor_type: string | null;
  source: string;
  created_at: string;
};
