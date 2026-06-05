import { Edit2, Save, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { apiRequest } from "../api/client";
import type { Character } from "../api/types";

type EditCharacterSheetProps = {
  character: Character;
  token: string;
  isBusy: boolean;
  onSave?: (updated: Character) => void;
};

type CharacterEditData = {
  name: string;
  ancestry: string;
  class_name: string;
  level: number;
  hp_current: number;
  hp_max: number;
  armor_class: number;
  speed: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  inventory: string; // JSON edited as text
  spells: string;
  attacks: string;
  resources: string;
  notes: string;
};

function parseJsonField(raw: unknown): string {
  if (Array.isArray(raw) && raw.length === 0) return "";
  return JSON.stringify(raw, null, 2);
}

function safeParseJson(raw: string): unknown[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function attrMod(value: number) {
  const mod = Math.floor((value - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function EditCharacterSheet({ character, token, isBusy, onSave }: EditCharacterSheetProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CharacterEditData>({
    name: character.name,
    ancestry: character.ancestry,
    class_name: character.class_name,
    level: character.level,
    hp_current: character.hp_current,
    hp_max: character.hp_max,
    armor_class: character.armor_class,
    speed: character.speed,
    str: character.attributes.str,
    dex: character.attributes.dex,
    con: character.attributes.con,
    int: character.attributes.int,
    wis: character.attributes.wis,
    cha: character.attributes.cha,
    inventory: parseJsonField(character.inventory),
    spells: parseJsonField(character.spells),
    attacks: parseJsonField(character.attacks),
    resources: parseJsonField(character.resources),
    notes: character.notes,
  });
  const [message, setMessage] = useState("");

  function resetForm() {
    setForm({
      name: character.name,
      ancestry: character.ancestry,
      class_name: character.class_name,
      level: character.level,
      hp_current: character.hp_current,
      hp_max: character.hp_max,
      armor_class: character.armor_class,
      speed: character.speed,
      str: character.attributes.str,
      dex: character.attributes.dex,
      con: character.attributes.con,
      int: character.attributes.int,
      wis: character.attributes.wis,
      cha: character.attributes.cha,
      inventory: parseJsonField(character.inventory),
      spells: parseJsonField(character.spells),
      attacks: parseJsonField(character.attacks),
      resources: parseJsonField(character.resources),
      notes: character.notes,
    });
    setEditing(false);
    setMessage("");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    const pb = Math.max(2, Math.ceil(form.level / 4) + 1);

    try {
      const updated = await apiRequest<Character>(`/api/characters/${character.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          ancestry: form.ancestry,
          class_name: form.class_name,
          level: form.level,
          hp_current: form.hp_current,
          hp_max: form.hp_max,
          armor_class: form.armor_class,
          speed: form.speed,
          proficiency_bonus: pb,
          attributes: {
            str: form.str,
            dex: form.dex,
            con: form.con,
            int: form.int,
            wis: form.wis,
            cha: form.cha,
          },
          inventory: safeParseJson(form.inventory),
          spells: safeParseJson(form.spells),
          attacks: safeParseJson(form.attacks),
          resources: safeParseJson(form.resources),
          notes: form.notes,
        }),
      });

      onSave?.(updated);
      setEditing(false);
      setMessage("Personnage sauvegarde.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erreur sauvegarde");
    }
  }

  const abilities = [
    { key: "str", label: "FOR", value: form.str },
    { key: "dex", label: "DEX", value: form.dex },
    { key: "con", label: "CON", value: form.con },
    { key: "int", label: "INT", value: form.int },
    { key: "wis", label: "SAG", value: form.wis },
    { key: "cha", label: "CHA", value: form.cha },
  ];

  return (
    <article className="sheet-preview editable">
      <div className="sheet-title">
        <div>
          {editing ? (
            <input
              className="sheet-name-edit"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          ) : (
            <h4>{character.name}</h4>
          )}
          <p>
            {character.ancestry || "Origine libre"} · {character.class_name || "Classe libre"} ·
            niveau {character.level}
          </p>
        </div>
        <div className="sheet-actions">
          {editing ? (
            <>
              <button
                className="ghost-button compact"
                onClick={handleSave}
                disabled={isBusy}
                type="submit"
                title="Sauvegarder"
              >
                <Save size={16} />
              </button>
              <button
                className="ghost-button compact"
                onClick={resetForm}
                disabled={isBusy}
                type="button"
                title="Annuler"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <button
              className="ghost-button compact"
              onClick={() => setEditing(true)}
              type="button"
              title="Editer"
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <form className="character-edit-form" onSubmit={handleSave}>
          {/* Basic info */}
          <div className="edit-grid">
            <label>
              Origine
              <input
                value={form.ancestry}
                onChange={(e) => setForm((f) => ({ ...f, ancestry: e.target.value }))}
                maxLength={80}
              />
            </label>
            <label>
              Classe
              <input
                value={form.class_name}
                onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
                maxLength={80}
              />
            </label>
            <label>
              Niveau
              <input
                type="number"
                min={1}
                max={20}
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) || 1 }))}
              />
            </label>
            <label>
              CA
              <input
                type="number"
                min={1}
                max={40}
                value={form.armor_class}
                onChange={(e) =>
                  setForm((f) => ({ ...f, armor_class: Number(e.target.value) || 10 }))
                }
              />
            </label>
            <label>
              PV actuels
              <input
                type="number"
                min={0}
                value={form.hp_current}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hp_current: Number(e.target.value) || 0 }))
                }
              />
            </label>
            <label>
              PV max
              <input
                type="number"
                min={1}
                value={form.hp_max}
                onChange={(e) => setForm((f) => ({ ...f, hp_max: Number(e.target.value) || 1 }))}
              />
            </label>
            <label>
              Vitesse
              <input
                type="number"
                min={0}
                max={200}
                value={form.speed}
                onChange={(e) => setForm((f) => ({ ...f, speed: Number(e.target.value) || 30 }))}
              />
            </label>
          </div>

          {/* Attributes */}
          <div className="edit-abilities">
            <h5>Caractéristiques</h5>
            <div className="ability-grid">
              {abilities.map(({ key, label, value }) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: Number(e.target.value) || 10 }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Rich fields */}
          <details className="edit-section">
            <summary>Inventaire</summary>
            <textarea
              rows={5}
              value={form.inventory}
              onChange={(e) => setForm((f) => ({ ...f, inventory: e.target.value }))}
              placeholder='[{"name": "Epee longue", "quantity": 1}, ...]'
            />
            <small>Format JSON: tableau d'objets</small>
          </details>

          <details className="edit-section">
            <summary>Attaques</summary>
            <textarea
              rows={5}
              value={form.attacks}
              onChange={(e) => setForm((f) => ({ ...f, attacks: e.target.value }))}
              placeholder='[{"name": "Epee longue", "bonus": 5, "damage": "1d8+3"}]'
            />
            <small>Format JSON: tableau d'objets</small>
          </details>

          <details className="edit-section">
            <summary>Sorts</summary>
            <textarea
              rows={5}
              value={form.spells}
              onChange={(e) => setForm((f) => ({ ...f, spells: e.target.value }))}
              placeholder='[{"name": "Boule de feu", "level": 3}]'
            />
            <small>Format JSON: tableau d'objets</small>
          </details>

          <details className="edit-section">
            <summary>Ressources</summary>
            <textarea
              rows={4}
              value={form.resources}
              onChange={(e) => setForm((f) => ({ ...f, resources: e.target.value }))}
              placeholder='[{"name": "Sorts niv.1", "max": 4, "current": 3}]'
            />
            <small>Format JSON: tableau d'objets</small>
          </details>

          <label className="edit-notes">
            Notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              maxLength={4000}
            />
          </label>

          <button className="primary-button" disabled={isBusy} type="submit">
            <Save size={16} /> Sauvegarder
          </button>
        </form>
      ) : (
        <>
          {/* Read-only view */}
          <div className="stat-strip">
            <span>CA {character.armor_class}</span>
            <span>
              PV {character.hp_current}/{character.hp_max}
            </span>
            <span>VIT {character.speed}</span>
            <span>PB +{character.proficiency_bonus}</span>
          </div>

          <div className="ability-summary">
            {abilities.map(({ key, label, value }) => (
              <span key={key}>
                <strong>{label}</strong>
                {character.attributes[key as keyof typeof character.attributes]}
                <small>
                  ({attrMod(character.attributes[key as keyof typeof character.attributes])})
                </small>
              </span>
            ))}
          </div>

          {/* Inventory */}
          {Array.isArray(character.inventory) && character.inventory.length > 0 && (
            <div className="sheet-section">
              <h5>Inventaire</h5>
              <ul className="sheet-list">
                {character.inventory.map((item: Record<string, unknown>, i) => (
                  <li key={i}>
                    {String(item.name ?? "Objet")}
                    {item.quantity ? ` ×${item.quantity}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Attacks */}
          {Array.isArray(character.attacks) && character.attacks.length > 0 && (
            <div className="sheet-section">
              <h5>Attaques</h5>
              <ul className="sheet-list">
                {character.attacks.map((atk: Record<string, unknown>, i) => (
                  <li key={i}>
                    <strong>{String(atk.name ?? "Attaque")}</strong>
                    {atk.bonus ? ` +${atk.bonus}` : ""}
                    {atk.damage ? ` — ${atk.damage}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Spells */}
          {Array.isArray(character.spells) && character.spells.length > 0 && (
            <div className="sheet-section">
              <h5>Sorts</h5>
              <ul className="sheet-list">
                {character.spells.map((spell: Record<string, unknown>, i) => (
                  <li key={i}>
                    {String(spell.name ?? "Sort")}
                    {spell.level ? ` (niv.${spell.level})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resources */}
          {Array.isArray(character.resources) && character.resources.length > 0 && (
            <div className="sheet-section">
              <h5>Ressources</h5>
              <ul className="sheet-list">
                {character.resources.map((res: Record<string, unknown>, i) => (
                  <li key={i}>
                    {String(res.name ?? "Ressource")}
                    {res.current !== undefined ? `: ${res.current}/${res.max ?? "?"}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {character.notes && <p className="sheet-notes">{character.notes}</p>}
        </>
      )}

      {message && (
        <div className="sheet-toast">
          <p>{message}</p>
          <button onClick={() => setMessage("")} type="button">
            ✕
          </button>
        </div>
      )}
    </article>
  );
}
