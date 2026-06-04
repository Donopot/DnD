import { Star, Trash2, Plus, Search, Clock, Layers } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";

import { authHeaders } from "../api/client";

// ── Types ──────────────────────────────────────────────────────────────────

type TokenTemplate = {
  id: string;
  name: string;
  color: string;
  size: number;
  tags: string[];
  favorite: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

type TokenLibraryPanelProps = {
  campaignId: string;
  token: string;
  selectedSceneId: string | undefined;
  onTokensChanged: () => void;
};

type SortMode = "recent" | "name" | "favorites";

// ── localStorage helpers ───────────────────────────────────────────────────

function getStorageKey(campaignId: string) {
  return `dnd-token-library:${campaignId}`;
}

function readTemplates(campaignId: string): TokenTemplate[] {
  if (!campaignId) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(campaignId));
    return raw ? (JSON.parse(raw) as TokenTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeTemplates(campaignId: string, templates: TokenTemplate[]) {
  try {
    window.localStorage.setItem(getStorageKey(campaignId), JSON.stringify(templates));
  } catch {
    // storage full — silent fail
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function TokenLibraryPanel({
  campaignId,
  token,
  selectedSceneId,
  onTokensChanged,
}: TokenLibraryPanelProps) {
  const [templates, setTemplates] = useState<TokenTemplate[]>(() =>
    readTemplates(campaignId),
  );
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#7c3aed");
  const [newSize, setNewSize] = useState(1);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function persist(updated: TokenTemplate[]) {
    setTemplates(updated);
    writeTemplates(campaignId, updated);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  function createTemplate() {
    if (!newName.trim()) return;
    const tpl: TokenTemplate = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      color: newColor,
      size: newSize,
      tags: [],
      favorite: false,
      lastUsedAt: null,
      createdAt: new Date().toISOString(),
    };
    persist([...templates, tpl]);
    setNewName("");
    setNewColor("#7c3aed");
    setNewSize(1);
    setShowCreate(false);
  }

  function deleteTemplate(id: string) {
    persist(templates.filter((t) => t.id !== id));
  }

  function toggleFavorite(id: string) {
    persist(
      templates.map((t) => (t.id === id ? { ...t, favorite: !t.favorite } : t)),
    );
  }

  // ── Add to scene ────────────────────────────────────────────────────────

  async function addToScene(tpl: TokenTemplate) {
    if (!selectedSceneId) {
      setError("Aucune scène sélectionnée.");
      return;
    }

    setAddingId(tpl.id);
    setError("");

    try {
      const res = await fetch(`/api/scenes/${selectedSceneId}/tokens`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tpl.name,
          x: 0,
          y: 0,
          size: tpl.size,
          color: tpl.color,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Erreur ajout token");
      }

      // Mark as used
      persist(
        templates.map((t) =>
          t.id === tpl.id ? { ...t, lastUsedAt: new Date().toISOString() } : t,
        ),
      );

      onTokensChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setAddingId(null);
    }
  }

  // ── Filter & sort ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = templates;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }

    if (showFavorites) {
      list = list.filter((t) => t.favorite);
    }

    switch (sortMode) {
      case "recent":
        // Most recently used first, then newest created
        return [...list].sort((a, b) => {
          const aDate = a.lastUsedAt ?? a.createdAt;
          const bDate = b.lastUsedAt ?? b.createdAt;
          return bDate.localeCompare(aDate);
        });
      case "name":
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case "favorites":
        return [...list].sort((a, b) => {
          if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
          const aDate = a.lastUsedAt ?? a.createdAt;
          const bDate = b.lastUsedAt ?? b.createdAt;
          return bDate.localeCompare(aDate);
        });
      default:
        return list;
    }
  }, [search, showFavorites, sortMode, templates]);

  // ── Render ───────────────────────────────────────────────────────────────

  if (!campaignId) {
    return (
      <div className="gm-panel-content" data-vtt-panel>
        <p className="gm-panel-muted">Sélectionnez une campagne.</p>
      </div>
    );
  }

  return (
    <div className="gm-panel-content token-library-panel" data-vtt-panel>
      {/* ── Header ──────────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Bibliothèque tokens</strong>
          <small>{templates.length} template(s)</small>
        </header>

        {/* Search + filters */}
        <div className="token-library-search">
          <Search size={14} className="gm-panel-muted" />
          <input
            type="text"
            placeholder="Rechercher un template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher un template"
          />
        </div>
      </section>

      {/* ── Sort & favorites toggle ─────────────────────────────── */}
      <section className="gm-panel-section">
        <div className="gm-panel-actions three">
          <button
            className={sortMode === "recent" ? "active" : ""}
            onClick={() => setSortMode("recent")}
            type="button"
          >
            <Clock size={12} /> Récents
          </button>
          <button
            className={sortMode === "name" ? "active" : ""}
            onClick={() => setSortMode("name")}
            type="button"
          >
            Nom
          </button>
          <button
            className={`${showFavorites ? "active" : ""}`}
            onClick={() => setShowFavorites(!showFavorites)}
            type="button"
          >
            <Star size={12} /> Favoris
          </button>
        </div>
      </section>

      {/* ── Create template ──────────────────────────────────────── */}
      <section className="gm-panel-section">
        <button
          className={showCreate ? "active" : ""}
          onClick={() => setShowCreate(!showCreate)}
          type="button"
        >
          <Plus size={14} /> {showCreate ? "Annuler" : "Nouveau template"}
        </button>

        {showCreate && (
          <div className="token-library-create-form">
            <input
              type="text"
              placeholder="Nom du template"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={120}
              aria-label="Nom du template"
            />
            <div className="gm-panel-actions three">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                title="Couleur"
                aria-label="Couleur"
              />
              <input
                type="number"
                value={newSize}
                min={1}
                max={8}
                onChange={(e) => setNewSize(Number(e.target.value))}
                title="Taille (cases)"
                aria-label="Taille en cases"
              />
              <button
                onClick={createTemplate}
                disabled={!newName.trim()}
                type="button"
              >
                Créer
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <section className="gm-panel-section">
          <p className="gm-panel-muted" style={{ color: "var(--danger)" }}>
            {error}
          </p>
          <button onClick={() => setError("")} type="button">
            OK
          </button>
        </section>
      )}

      {/* ── Template list ────────────────────────────────────────── */}
      <section className="gm-panel-section">
        <header className="gm-panel-section-header">
          <strong>Templates</strong>
          <small>{filtered.length} résultat(s)</small>
        </header>

        {filtered.length === 0 ? (
          <p className="gm-panel-muted">
            {templates.length === 0
              ? "Aucun template. Créez votre premier token réutilisable !"
              : "Aucun résultat pour ce filtre."}
          </p>
        ) : (
          <div className="gm-panel-list">
            {filtered.map((tpl) => (
              <article
                className={`gm-panel-card token-library-row ${tpl.favorite ? "selected" : ""}`}
                key={tpl.id}
              >
                <header>
                  <span>
                    <span className="token-library-name">
                      <span
                        className="token-library-swatch"
                        style={{ backgroundColor: tpl.color }}
                      />
                      <strong>{tpl.name}</strong>
                    </span>
                    <small>
                      Taille {tpl.size}
                      {tpl.lastUsedAt
                        ? ` · Dernière utilisation ${new Date(tpl.lastUsedAt).toLocaleDateString()}`
                        : ""}
                    </small>
                  </span>
                </header>

                <div className="gm-panel-actions">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(tpl.id)}
                    title={tpl.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                  >
                    <Star size={12} fill={tpl.favorite ? "currentColor" : "none"} />
                  </button>

                  <button
                    type="button"
                    onClick={() => void addToScene(tpl)}
                    disabled={addingId === tpl.id || !selectedSceneId}
                    title={
                      selectedSceneId
                        ? "Ajouter à la scène active"
                        : "Sélectionnez une scène d'abord"
                    }
                  >
                    <Plus size={12} />
                    {addingId === tpl.id ? "..." : "Scène"}
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() => deleteTemplate(tpl.id)}
                    title="Supprimer le template"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Scene indicator ──────────────────────────────────────── */}
      {selectedSceneId ? (
        <footer className="gm-panel-footer">
          <span className="gm-panel-muted">
            <Layers size={12} /> Ajout vers la scène active
          </span>
        </footer>
      ) : (
        <footer className="gm-panel-footer">
          <span className="gm-panel-muted" style={{ color: "var(--danger)" }}>
            Aucune scène — ouvrez une scène pour ajouter des tokens
          </span>
        </footer>
      )}
    </div>
  );
}
