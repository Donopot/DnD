export type User = {
  id: string;
  email: string;
  display_name: string;
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
};

export type Member = {
  user_id: string;
  email: string;
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
  conditions: string[];
  notes: string;
  is_player_controlled: boolean;
  is_hidden: boolean;
  is_defeated: boolean;
  created_at: string;
  updated_at: string;
};

export type EncounterDetail = Encounter & {
  combatants: Combatant[];
};
