import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Item } from "../api/types";

type ItemCompendiumProps = { token: string };

const CATEGORIES = ["weapon","armor","potion","scroll","ring","rod","staff","wand","wondrous","gear","tool"];
const RARITIES = ["common","uncommon","rare","very_rare","legendary","artifact"];

export function ItemCompendium({ token }: ItemCompendiumProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [rarity, setRarity] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  async function search() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (rarity) params.set("rarity", rarity);
      params.set("limit", "50");

      const res = await fetch(`/api/items?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setItems(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void search(); }, []);

  return (
    <div className="bestiary-panel">
      <div className="bestiary-filters">
        <div className="bestiary-search-row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un objet..." onKeyDown={(e) => e.key === "Enter" && search()} />
          <button className="primary-button compact" onClick={search} type="button" disabled={loading}><Search size={14} /></button>
        </div>
        <div className="bestiary-filter-row">
          <select value={category} onChange={(e) => { setCategory(e.target.value); }}>
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
          <select value={rarity} onChange={(e) => { setRarity(e.target.value); }}>
            <option value="">Toutes raretés</option>
            {RARITIES.map((r) => (<option key={r} value={r}>{r}</option>))}
          </select>
        </div>
      </div>

      <div className="bestiary-list">
        {items.map((item) => (
          <button key={item.id} className="bestiary-row" onClick={() => setSelectedItem(item)} type="button">
            <span className="bestiary-cr">{item.rarity}</span>
            <span className="bestiary-name">{item.name}</span>
            <span className="bestiary-meta">{item.category}{item.cost ? ` · ${item.cost}` : ""}</span>
          </button>
        ))}
        {items.length === 0 && !loading && <p className="muted">Aucun objet trouvé.</p>}
      </div>

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="bestiary-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bestiary-detail-header">
              <div>
                <h2>{selectedItem.name}</h2>
                <p className="bestiary-subtitle">{selectedItem.rarity} · {selectedItem.category}{selectedItem.attunement ? " · Attunement requis" : ""}</p>
              </div>
              <button className="ghost-button" onClick={() => setSelectedItem(null)} type="button"><X size={18} /></button>
            </div>
            <div className="bestiary-stats-grid">
              {selectedItem.cost && <div><strong>Cost</strong> {selectedItem.cost}</div>}
              {selectedItem.weight && <div><strong>Weight</strong> {selectedItem.weight}</div>}
              {selectedItem.damage && <div><strong>Damage</strong> {selectedItem.damage}</div>}
              {selectedItem.ac !== null && selectedItem.ac !== undefined && <div><strong>AC</strong> {selectedItem.ac}{selectedItem.armor_type ? ` (${selectedItem.armor_type})` : ""}</div>}
            </div>
            {selectedItem.properties.length > 0 && (
              <div className="bestiary-detail-section"><strong>Properties</strong> {selectedItem.properties.join(", ")}</div>
            )}
            <div className="bestiary-detail-section">
              <p style={{ lineHeight: 1.6 }}>{selectedItem.description}</p>
            </div>
            <div className="bestiary-detail-footer"><em>Source: {selectedItem.source}</em></div>
          </div>
        </div>
      )}
    </div>
  );
}
