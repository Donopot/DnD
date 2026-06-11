import { Download, FlaskConical, Plus, Swords, Trash2, Upload } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { apiRequest } from "../api/client";

import type { Encounter, HomebrewCreature, HomebrewItem, Scene } from "../api/types";

type HomebrewPanelProps = {
  campaignId: string;
  token: string;
  scenes: Scene[];
  encounters: Encounter[];
  isBusy: boolean;
};

type CreatureForm = {
  name: string;
  description: string;
  armor_class: number;
  hp_max: number;
  speed: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  size: string;
  challenge_rating: number;
  type: string;
  attacks: string;
  spells: string;
};

type ItemForm = {
  name: string;
  description: string;
  item_type: string;
  rarity: string;
  properties: string;
};

const EMPTY_CREATURE: CreatureForm = {
  name: "",
  description: "",
  armor_class: 10,
  hp_max: 10,
  speed: 30,
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  size: "medium",
  challenge_rating: 0,
  type: "monster",
  attacks: "",
  spells: "",
};

const EMPTY_ITEM: ItemForm = {
  name: "",
  description: "",
  item_type: "misc",
  rarity: "common",
  properties: "",
};

export function HomebrewPanel({
  campaignId,
  token,
  scenes,
  encounters,
  isBusy,
}: HomebrewPanelProps) {
  const [tab, setTab] = useState<"creatures" | "items">("creatures");
  const [creatures, setCreatures] = useState<HomebrewCreature[]>([]);
  const [items, setItems] = useState<HomebrewItem[]>([]);
  const [selectedCreature, setSelectedCreature] = useState<HomebrewCreature | null>(null);
  const [selectedItem, setSelectedItem] = useState<HomebrewItem | null>(null);
  const [creatureForm, setCreatureForm] = useState<CreatureForm>(EMPTY_CREATURE);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [c, i] = await Promise.all([
        apiRequest<HomebrewCreature[]>(`/api/campaigns/${campaignId}/homebrew/creatures`, token),
        apiRequest<HomebrewItem[]>(`/api/campaigns/${campaignId}/homebrew/items`, token),
      ]);
      setCreatures(c);
      setItems(i);
      if (c.length > 0 && !selectedCreature) setSelectedCreature(c[0]);
      if (i.length > 0 && !selectedItem) setSelectedItem(i[0]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur chargement");
    }
  }

  useEffect(() => {
    void load();
  }, [campaignId]);

  // Creature CRUD
  async function createCreature(e: FormEvent) {
    e.preventDefault();
    try {
      const c = await apiRequest<HomebrewCreature>(
        `/api/campaigns/${campaignId}/homebrew/creatures`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: creatureForm.name,
            description: creatureForm.description,
            armor_class: creatureForm.armor_class,
            hp_max: creatureForm.hp_max,
            speed: creatureForm.speed,
            attributes: {
              str: creatureForm.str,
              dex: creatureForm.dex,
              con: creatureForm.con,
              int: creatureForm.int,
              wis: creatureForm.wis,
              cha: creatureForm.cha,
            },
            attacks: creatureForm.attacks ? JSON.parse(creatureForm.attacks) : [],
            spells: creatureForm.spells ? JSON.parse(creatureForm.spells) : [],
            size: creatureForm.size,
            challenge_rating: creatureForm.challenge_rating,
            type: creatureForm.type,
          }),
        },
      );
      setCreatures((prev) => [c, ...prev]);
      setCreatureForm(EMPTY_CREATURE);
      setMessage(`${c.name} creee.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur creation");
    }
  }

  async function deleteCreature(id: string) {
    if (!confirm("Supprimer cette creature ?")) return;
    try {
      await apiRequest<void>(`/api/homebrew/creatures/${id}`, token, { method: "DELETE" });
      setCreatures((prev) => prev.filter((c) => c.id !== id));
      if (selectedCreature?.id === id) setSelectedCreature(null);
      setMessage("Creature supprimee.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur suppression");
    }
  }

  // Item CRUD
  async function createItem(e: FormEvent) {
    e.preventDefault();
    try {
      const item = await apiRequest<HomebrewItem>(
        `/campaigns/${campaignId}/homebrew/items`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            name: itemForm.name,
            description: itemForm.description,
            item_type: itemForm.item_type,
            rarity: itemForm.rarity,
            properties: itemForm.properties ? JSON.parse(itemForm.properties) : {},
          }),
        },
      );
      setItems((prev) => [item, ...prev]);
      setItemForm(EMPTY_ITEM);
      setMessage(`${item.name} cree.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur creation");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Supprimer cet objet ?")) return;
    try {
      await apiRequest<void>(`/homebrew/items/${id}`, token, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      setMessage("Objet supprime.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur suppression");
    }
  }

  // Creature actions
  async function addToScene(creature: HomebrewCreature, sceneId: string) {
    try {
      await apiRequest(`/api/homebrew/creatures/${creature.id}/to-token`, token, {
        method: "POST",
        body: JSON.stringify({ scene_id: sceneId, x: 100, y: 100 }),
      });
      setMessage(`${creature.name} ajoutee a la scene.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur ajout scene");
    }
  }

  async function addToCombat(creature: HomebrewCreature, encounterId: string) {
    try {
      await apiRequest(`/api/homebrew/creatures/${creature.id}/to-combatant`, token, {
        method: "POST",
        body: JSON.stringify({
          encounter_id: encounterId,
          initiative: Math.floor(Math.random() * 20) + 1,
        }),
      });
      setMessage(`${creature.name} ajoutee au combat.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur ajout combat");
    }
  }

  // Export / Import
  async function exportHomebrew() {
    try {
      const data = await apiRequest<unknown>(`/campaigns/${campaignId}/homebrew/export`, token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `homebrew-${campaignId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur export");
    }
  }

  async function importHomebrew(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage("Selectionne un fichier JSON.");
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await apiRequest(`/api/campaigns/${campaignId}/homebrew/import`, token, {
        method: "POST",
        body: JSON.stringify(data),
      });
      await load();
      setMessage("Import reussi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur import");
    }
  }

  const abilities = ["str", "dex", "con", "int", "wis", "cha"] as const;

  return (
    <div className="homebrew-panel">
      <div className="homebrew-tab-bar">
        <button
          className={`homebrew-tab-btn ${tab === "creatures" ? "active" : ""}`}
          onClick={() => setTab("creatures")}
          type="button"
        >
          <Swords size={14} /> Creatures ({creatures.length})
        </button>
        <button
          className={`homebrew-tab-btn ${tab === "items" ? "active" : ""}`}
          onClick={() => setTab("items")}
          type="button"
        >
          <FlaskConical size={14} /> Objets ({items.length})
        </button>
        <div className="homebrew-toolbar-spacer" />
        <button className="ghost-button compact" onClick={exportHomebrew} type="button">
          <Download size={14} /> Export
        </button>
        <form onSubmit={importHomebrew} style={{ display: "inline" }}>
          <label className="import-label">
            <Upload size={14} /> Import
            <input
              type="file"
              name="file"
              accept=".json"
              onChange={(e) => {
                if (e.target.files?.[0]) e.currentTarget.form?.requestSubmit();
              }}
              hidden
            />
          </label>
        </form>
      </div>

      <div className="homebrew-content">
        {tab === "creatures" && (
          <div className="homebrew-creature-layout">
            {/* Creature list */}
            <div className="homebrew-list-sidebar">
              <h4>Creatures</h4>
              {creatures.length === 0 ? (
                <p className="muted">Aucune creature.</p>
              ) : (
                creatures.map((c) => (
                  <button
                    key={c.id}
                    className={`homebrew-row ${selectedCreature?.id === c.id ? "selected" : ""}`}
                    onClick={() => setSelectedCreature(c)}
                    type="button"
                  >
                    <span>
                      <strong>{c.name}</strong>
                      <small>
                        FP {c.challenge_rating} · {c.size} · {c.type}
                      </small>
                    </span>
                    <em>
                      CA {c.armor_class} · {c.hp_max} PV
                    </em>
                  </button>
                ))
              )}
            </div>

            {/* Creature detail */}
            <div className="homebrew-detail">
              {selectedCreature ? (
                <>
                  <h4>{selectedCreature.name}</h4>
                  <p className="muted">{selectedCreature.description || "Aucune description."}</p>
                  <div className="stat-strip">
                    <span>CA {selectedCreature.armor_class}</span>
                    <span>PV {selectedCreature.hp_max}</span>
                    <span>VIT {selectedCreature.speed}</span>
                    <span>FP {selectedCreature.challenge_rating}</span>
                  </div>
                  <div className="ability-summary">
                    {abilities.map((key) => (
                      <span key={key}>
                        <strong>{key.toUpperCase()}</strong>
                        {selectedCreature.attributes[key] ?? 10}
                      </span>
                    ))}
                  </div>
                  <div className="homebrew-detail-actions">
                    <label className="mini-select-label">
                      Scene :
                      <select
                        onChange={(e) =>
                          e.target.value && addToScene(selectedCreature, e.target.value)
                        }
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Ajouter a...
                        </option>
                        {scenes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mini-select-label">
                      Combat :
                      <select
                        onChange={(e) =>
                          e.target.value && addToCombat(selectedCreature, e.target.value)
                        }
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Ajouter a...
                        </option>
                        {encounters.map((enc) => (
                          <option key={enc.id} value={enc.id}>
                            {enc.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="ghost-button danger"
                      onClick={() => deleteCreature(selectedCreature.id)}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">Selectionne une creature.</p>
              )}
            </div>

            {/* Creature create form */}
            <div className="homebrew-create">
              <h4>Nouvelle creature</h4>
              <form onSubmit={createCreature} className="form-stack">
                <label>
                  Nom *{" "}
                  <input
                    value={creatureForm.name}
                    onChange={(e) => setCreatureForm((f) => ({ ...f, name: e.target.value }))}
                    minLength={2}
                    required
                  />
                </label>
                <label>
                  Type{" "}
                  <input
                    value={creatureForm.type}
                    onChange={(e) => setCreatureForm((f) => ({ ...f, type: e.target.value }))}
                    placeholder="monster, humanoid..."
                  />
                </label>
                <div className="mini-grid">
                  <label>
                    CA{" "}
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={creatureForm.armor_class}
                      onChange={(e) =>
                        setCreatureForm((f) => ({ ...f, armor_class: +e.target.value || 10 }))
                      }
                    />
                  </label>
                  <label>
                    PV{" "}
                    <input
                      type="number"
                      min={1}
                      value={creatureForm.hp_max}
                      onChange={(e) =>
                        setCreatureForm((f) => ({ ...f, hp_max: +e.target.value || 1 }))
                      }
                    />
                  </label>
                  <label>
                    VIT{" "}
                    <input
                      type="number"
                      value={creatureForm.speed}
                      onChange={(e) =>
                        setCreatureForm((f) => ({ ...f, speed: +e.target.value || 30 }))
                      }
                    />
                  </label>
                  <label>
                    FP{" "}
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      value={creatureForm.challenge_rating}
                      onChange={(e) =>
                        setCreatureForm((f) => ({ ...f, challenge_rating: +e.target.value || 0 }))
                      }
                    />
                  </label>
                </div>
                <label>
                  Taille
                  <select
                    value={creatureForm.size}
                    onChange={(e) => setCreatureForm((f) => ({ ...f, size: e.target.value }))}
                  >
                    <option value="tiny">TP</option>
                    <option value="small">P</option>
                    <option value="medium">M</option>
                    <option value="large">G</option>
                    <option value="huge">TG</option>
                    <option value="gargantuan">Gig</option>
                  </select>
                </label>
                <div className="ability-grid">
                  {abilities.map((a) => (
                    <label key={a}>
                      {a.toUpperCase()}
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={creatureForm[a]}
                        onChange={(e) =>
                          setCreatureForm((f) => ({ ...f, [a]: +e.target.value || 10 }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Description{" "}
                  <textarea
                    rows={2}
                    value={creatureForm.description}
                    onChange={(e) =>
                      setCreatureForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </label>
                <button className="primary-button" disabled={isBusy} type="submit">
                  <Plus size={14} /> Creer
                </button>
              </form>
            </div>
          </div>
        )}

        {tab === "items" && (
          <div className="homebrew-creature-layout">
            {/* Item list */}
            <div className="homebrew-list-sidebar">
              <h4>Objets</h4>
              {items.length === 0 ? (
                <p className="muted">Aucun objet.</p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    className={`homebrew-row ${selectedItem?.id === item.id ? "selected" : ""}`}
                    onClick={() => setSelectedItem(item)}
                    type="button"
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.item_type} · {item.rarity}
                      </small>
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Item detail */}
            <div className="homebrew-detail">
              {selectedItem ? (
                <>
                  <h4>{selectedItem.name}</h4>
                  <p className="muted">{selectedItem.description || "Aucune description."}</p>
                  <div className="stat-strip">
                    <span>{selectedItem.item_type}</span>
                    <span>{selectedItem.rarity}</span>
                  </div>
                  {Object.keys(selectedItem.properties).length > 0 && (
                    <pre className="handout-content">
                      {JSON.stringify(selectedItem.properties, null, 2)}
                    </pre>
                  )}
                  <div className="homebrew-detail-actions">
                    <button
                      className="ghost-button danger"
                      onClick={() => deleteItem(selectedItem.id)}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">Selectionne un objet.</p>
              )}
            </div>

            {/* Item create form */}
            <div className="homebrew-create">
              <h4>Nouvel objet</h4>
              <form onSubmit={createItem} className="form-stack">
                <label>
                  Nom *{" "}
                  <input
                    value={itemForm.name}
                    onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                    minLength={2}
                    required
                  />
                </label>
                <label>
                  Type{" "}
                  <input
                    value={itemForm.item_type}
                    onChange={(e) => setItemForm((f) => ({ ...f, item_type: e.target.value }))}
                    placeholder="weapon, armor, potion..."
                  />
                </label>
                <label>
                  Rarete
                  <select
                    value={itemForm.rarity}
                    onChange={(e) => setItemForm((f) => ({ ...f, rarity: e.target.value }))}
                  >
                    <option value="common">Commun</option>
                    <option value="uncommon">Inhabituel</option>
                    <option value="rare">Rare</option>
                    <option value="very_rare">Tres rare</option>
                    <option value="legendary">Legendaire</option>
                  </select>
                </label>
                <label>
                  Description{" "}
                  <textarea
                    rows={2}
                    value={itemForm.description}
                    onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </label>
                <button className="primary-button" disabled={isBusy} type="submit">
                  <Plus size={14} /> Creer
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="homebrew-toast">
          <span>{message}</span>
          <button onClick={() => setMessage("")} type="button">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
