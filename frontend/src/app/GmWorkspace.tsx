import {
  Bookmark,
  DoorOpen,
  Eye,
  EyeOff,
  Map,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Save,
  Swords,
  Trash2,
  UserPlus,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { Character } from "../api/types";
import { CampaignMap, type CampaignMapProps } from "../components/CampaignMap";
import { CampaignViewTabs } from "../components/CampaignViewTabs";
import { Tooltip } from "../components/Tooltip";
import { PanelDock } from "../components/PanelDock";
import { SESSION_LIVE_MODES } from "../config/sessionLiveModes";
import { usePanelContext } from "../contexts/PanelContext";
import { useSessionContext } from "../contexts/SessionContext";
import { useWorkspaceActions } from "../contexts/WorkspaceActionsContext";
import { useWorkspaceState } from "../contexts/WorkspaceStateContext";
import { useLayoutPresets } from "../hooks/useLayoutPresets";
import { GmDockedPanels } from "../panels/GmDockedPanels";
import { GmFloatingPanels } from "../panels/GmFloatingPanels";

// ── Props (kept lean — data comes from contexts) ──────────────────────────

export type GmWorkspaceProps = {
  campaignMapProps: CampaignMapProps;
  isMapFloating: boolean;
};

// ── Lazy-loaded heavy components ────────────────────────────────────────────
const GmCharacterInspector = lazy(() =>
  import("../components/GmCharacterInspector").then((m) => ({ default: m.GmCharacterInspector })),
);
const CharacterWizard = lazy(() =>
  import("../components/CharacterWizard").then((m) => ({ default: m.CharacterWizard })),
);
const KeyboardShortcuts = lazy(() =>
  import("../components/KeyboardShortcuts").then((m) => ({ default: m.KeyboardShortcuts })),
);

const MAP_PANEL_ID = "campaign-map";

const PanelFallback = () => (
  <div className="panel-loading">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text short" />
    <div className="skeleton skeleton-text" />
  </div>
);

// ── Component ───────────────────────────────────────────────────────────────

export function GmWorkspace(props: GmWorkspaceProps) {
  const { campaignMapProps, isMapFloating } = props;

  // Read from contexts — GmWorkspace is inside GmWorkspaceProvider
  const state = useWorkspaceState();
  const actions = useWorkspaceActions();
  const panel = usePanelContext();
  const session = useSessionContext();

  const { token, campaigns, selectedCampaign, members, characters, latestInvite } = state;

  const { handleCreateInvite, onLogout, selectCampaign, loadCharacters } = actions;

  const {
    gmView,
    setGmView,
    activeSessionLiveMode,
    setActiveSessionLiveMode,
    isPanelsHidden,
    setIsPanelsHidden,
    isFocusMap,
    setIsFocusMap,
    isPlayerView,
    setIsPlayerView,
    fp,
    showCharacterWizard,
    setShowCharacterWizard,
    showShortcuts,
    setShowShortcuts,
    inspectedCharacterId,
    setInspectedCharacterId,
    isBusy,
    setCharacters,
  } = panel;

  const { presenceCount, realtimeStatus, theme, toggleTheme, toasts, dismissToast } = session;

  // ── Layout presets ───────────────────────────────────────
  const layoutPresets = useLayoutPresets();
  const [presetOpen, setPresetOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const presetRef = useRef<HTMLDivElement>(null);

  const handleSavePreset = useCallback(() => {
    const name = presetName.trim();
    if (!name) return;
    layoutPresets.save(name, fp.panels, activeSessionLiveMode);
    setPresetName("");
    setPresetOpen(false);
  }, [presetName, layoutPresets, fp.panels, activeSessionLiveMode]);

  const handleLoadPreset = useCallback(
    (name: string) => {
      const preset = layoutPresets.presets.find((p) => p.name === name);
      if (!preset) return;
      setActiveSessionLiveMode(preset.mode as never);
      fp.reset();
      setTimeout(() => {
        for (const p of preset.panels) {
          fp.open(p.id, p.title, p.x, p.y, p.width, p.height);
          if (p.pinned) fp.togglePin(p.id);
          if (p.locked) fp.toggleLock(p.id);
          if (p.minimized) fp.minimize(p.id);
        }
        for (const p of preset.panels) {
          if (p.maximized) fp.toggleMaximize(p.id);
        }
      }, 50);
      setPresetOpen(false);
    },
    [layoutPresets.presets, fp, setActiveSessionLiveMode],
  );

  // ── Focus map: Escape to exit, mini-map toggle ────────────
  const [showMiniMap, setShowMiniMap] = useState(false);

  useEffect(() => {
    if (!isFocusMap) {
      setShowMiniMap(false); // P2 fix: reset on exit
      return;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFocusMap(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFocusMap, setIsFocusMap]);

  return (
    <main className={`gm-campaign-shell${isFocusMap ? " focus-map" : ""}`}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="gm-sidebar">
        <div className="brand-mark compact">
          <Swords aria-hidden="true" />
          DnD
        </div>

        <nav className="gm-campaign-list" aria-label="Mes campagnes">
          <h4>Mes tables</h4>
          {campaigns.map((c) => (
            <button
              className={`gm-campaign-item ${selectedCampaign?.id === c.id ? "selected" : ""}`}
              key={c.id}
              onClick={() => selectCampaign(c.id)}
              type="button"
              data-testid="campaign-card"
              aria-label={`${c.name} — ${c.member_count} membres`}
              aria-current={selectedCampaign?.id === c.id ? "true" : undefined}
            >
              <strong>{c.name}</strong>
              <small>{c.member_count} membres</small>
            </button>
          ))}
        </nav>

        <div className="gm-members-list">
          <h4>Membres</h4>
          {members.map((m) => (
            <div className="gm-member-row" key={m.user_id}>
              <span>{m.display_name}</span>
              <small>{m.role}</small>
            </div>
          ))}
        </div>

        <div className="gm-sidebar-actions">
          <button
            className="primary-button compact"
            disabled={isBusy}
            onClick={handleCreateInvite}
            type="button"
          >
            <UserPlus aria-hidden="true" size={14} />
            Inviter
          </button>
          <button className="ghost-button compact" onClick={onLogout} type="button">
            <DoorOpen aria-hidden="true" size={14} />
            Sortir
          </button>
        </div>
        {latestInvite && (
          <div className="invite-link-box">
            <p className="invite-link-label">Lien d'invitation :</p>
            <div className="invite-link-row">
              <input
                className="invite-link-input"
                readOnly
                value={`${window.location.origin}/invite/${latestInvite.token}`}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className="compact"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/invite/${latestInvite.token}`,
                  );
                }}
                type="button"
              >
                📋
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Centre — Carte ──────────────────────────────────── */}
      <section className="gm-map-area">
        <div className={`gm-map-topbar${isFocusMap ? " focus-compact" : ""}`}>
          {!isFocusMap && (
            <div>
              <span className="realtime-pill">{realtimeStatus}</span>
              <span>{presenceCount} connectés</span>
            </div>
          )}
          <span className="gm-campaign-name">{selectedCampaign?.name ?? "Campagne"}</span>

          {/* Mode buttons — hidden in focus */}
          {!isFocusMap && (
            <div className="session-live-mode-buttons compact" aria-label="Modes">
              {SESSION_LIVE_MODES.map((m) => (
                <button
                  key={m.id}
                  className={activeSessionLiveMode === m.id ? "active" : ""}
                  onClick={() => setActiveSessionLiveMode(m.id)}
                  title={m.description}
                  type="button"
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Layout presets — hidden in focus */}
          {!isFocusMap && (
            <div className="preset-selector" ref={presetRef}>
              <Tooltip content="Dispositions sauvegardées">
                <button
                  className="focus-map-btn"
                  onClick={() => setPresetOpen((v) => !v)}
                  aria-label="Dispositions sauvegardées"
                  type="button"
                >
                  <Bookmark size={16} />
                </button>
              </Tooltip>
              {presetOpen && (
                <div className="preset-dropdown">
                  <div className="preset-save-row">
                    <input
                      className="preset-name-input"
                      placeholder="Nom de la dispo…"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSavePreset();
                        if (e.key === "Escape") setPresetOpen(false);
                      }}
                    />
                    <Tooltip content="Sauvegarder la disposition">
                      <button
                        className="compact"
                        onClick={handleSavePreset}
                        disabled={!presetName.trim()}
                        aria-label="Sauvegarder la disposition"
                        type="button"
                      >
                        <Save size={14} />
                      </button>
                    </Tooltip>
                  </div>
                  {layoutPresets.presets.length > 0 && (
                    <ul className="preset-list">
                      {layoutPresets.presets.map((p) => (
                        <li key={p.name} className="preset-item">
                          <button
                            type="button"
                            className="preset-load-btn"
                            onClick={() => handleLoadPreset(p.name)}
                            aria-label={`Charger la disposition « ${p.name} »`}
                          >
                            <Bookmark size={12} />
                            <span>{p.name}</span>
                            <small>{p.mode}</small>
                          </button>
                          <Tooltip content={`Supprimer « ${p.name} »`}>
                            <button
                              type="button"
                              className="preset-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                layoutPresets.remove(p.name);
                              }}
                              aria-label={`Supprimer la disposition « ${p.name} »`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </Tooltip>
                        </li>
                      ))}
                    </ul>
                  )}
                  {layoutPresets.presets.length === 0 && (
                    <p className="preset-empty">
                      Aucune disposition sauvegardée. Ouvrez des panneaux et sauvegardez.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mini-map toggle — only in focus */}
          {isFocusMap && (
            <Tooltip content={showMiniMap ? "Masquer la mini-carte" : "Afficher la mini-carte"}>
              <button
                className={`focus-map-btn${showMiniMap ? " active" : ""}`}
                onClick={() => setShowMiniMap((v) => !v)}
                aria-label={showMiniMap ? "Masquer la mini-carte" : "Afficher la mini-carte"}
                type="button"
              >
                <Map size={16} />
              </button>
            </Tooltip>
          )}

          {/* Focus toggle — always visible */}
          <Tooltip content={isFocusMap ? "Quitter plein écran (Échap)" : "Carte plein écran (F)"}>
            <button
              className={`focus-map-btn${isFocusMap ? " active" : ""}`}
              onClick={() => setIsFocusMap((prev) => !prev)}
              aria-label={isFocusMap ? "Quitter le mode plein écran" : "Passer en mode plein écran"}
              type="button"
            >
              {isFocusMap ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </Tooltip>

          {/* Non-essential buttons — hidden in focus */}
          {!isFocusMap && (
            <>
              <Tooltip content={isPlayerView ? "Revenir en vue MJ" : "Voir comme un joueur"}>
                <button
                  className="focus-map-btn"
                  onClick={() => setIsPlayerView((prev) => !prev)}
                  aria-label={isPlayerView ? "Revenir en vue MJ" : "Voir comme un joueur"}
                  type="button"
                  style={isPlayerView ? { background: "var(--accent)", color: "#fff" } : undefined}
                >
                  {isPlayerView ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </Tooltip>
              <Tooltip content="Réinitialiser la disposition des panneaux">
                <button
                  className="focus-map-btn"
                  onClick={() => fp.reset()}
                  aria-label="Réinitialiser la disposition des panneaux"
                  type="button"
                >
                  <RotateCcw size={16} />
                </button>
              </Tooltip>
              <Tooltip content={isPanelsHidden ? "Afficher les panneaux" : "Masquer les panneaux"}>
                <button
                  className={`gm-panels-toggle${isPanelsHidden ? " active" : ""}`}
                  onClick={() => setIsPanelsHidden((prev) => !prev)}
                  aria-label={isPanelsHidden ? "Afficher les panneaux" : "Masquer les panneaux"}
                  type="button"
                >
                  {isPanelsHidden ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                </button>
              </Tooltip>
              <Tooltip content={theme === "dark" ? "Mode clair" : "Mode sombre"}>
                <button
                  className="focus-map-btn"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                  type="button"
                >
                  {theme === "dark" ? "☀️" : "🌙"}
                </button>
              </Tooltip>
              {!isMapFloating && (
                <Tooltip content="Détacher la carte en panneau flottant">
                  <button
                    className="focus-map-btn"
                    onClick={() => fp.open(MAP_PANEL_ID, "🗺️ Carte", 80, 80, 1100, 720)}
                    aria-label="Détacher la carte en panneau flottant"
                    type="button"
                  >
                    🗺️
                  </button>
                </Tooltip>
              )}
            </>
          )}
        </div>

        {/* P2 fix: hide tabs in focus */}
        {!isFocusMap && <CampaignViewTabs activeView={gmView} onChange={setGmView} />}

        {/* P1 fix: show map in focus even when floating; showMiniMap guard */}
        {(!isMapFloating || isFocusMap) && (
          <CampaignMap {...campaignMapProps} showMiniMap={isFocusMap ? showMiniMap : undefined} />
        )}
      </section>

      {/* ── Droite — Panneaux dockés ─────────────────────────── */}
      <Suspense fallback={<PanelFallback />}>
        <aside
          className="gm-panels"
          style={{ display: isPanelsHidden || isFocusMap ? "none" : "" }}
        >
          <GmDockedPanels />
        </aside>
      </Suspense>

      {/* P2 fix: keep floating panels mounted, hide with CSS */}
      <div style={{ display: isFocusMap ? "none" : undefined }}>
        <GmFloatingPanels />
      </div>

      {/* P2 fix: keep panel dock mounted, hide with CSS */}
      <div style={{ display: isFocusMap ? "none" : undefined }}>
        <PanelDock panels={fp.panels} onRestore={(id) => fp.minimize(id)} />
      </div>

      {/* ── Toast notifications ──────────────────────────────── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item${t.type === "error" ? " error" : ""}`}>
            <span>{t.message}</span>
            <button onClick={() => dismissToast(t.id)} type="button">
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Character Wizard Modal ───────────────────────────── */}
      {showCharacterWizard && (
        <div className="modal-overlay" onClick={() => setShowCharacterWizard(false)}>
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-label="Création de personnage"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "500px" }}
          >
            <CharacterWizard
              token={token}
              campaignId={selectedCampaign?.id ?? ""}
              onCreated={() => {
                setShowCharacterWizard(false);
                if (selectedCampaign) {
                  void loadCharacters(selectedCampaign.id);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── Keyboard Shortcuts Overlay ─────────────────────────── */}
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}

      {/* ── Character Inspector Modal ─────────────────────────── */}
      {inspectedCharacterId &&
        (() => {
          const char = characters.find((c) => c.id === inspectedCharacterId);
          if (!char) return null;
          return (
            <GmCharacterInspector
              character={char}
              token={token}
              onClose={() => setInspectedCharacterId("")}
              onCharacterUpdated={(updated: Character) =>
                setCharacters((c) => c.map((x) => (x.id === updated.id ? updated : x)))
              }
            />
          );
        })()}
    </main>
  );
}
