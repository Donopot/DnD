import {
  Bookmark,
  ChevronDown,
  Copy,
  DoorOpen,
  ExternalLinkIcon,
  Eye,
  EyeOff,
  // biome-ignore lint/suspicious/noShadowRestrictedNames: Map icon from lucide-react
  Map,
  Maximize2,
  Minimize2,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Save,
  Sun,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { Campaign } from "../api/types";
import type { CampaignMapProps } from "../components/CampaignMap";
import { CampaignMap } from "../components/CampaignMap";
import { GmDock } from "../components/GmDock";
import { GmRail, type RailSection } from "../components/GmRail";
import { PanelDock } from "../components/PanelDock";
import { Tooltip } from "../components/Tooltip";
import { SESSION_LIVE_MODES } from "../config/sessionLiveModes";
import { usePanelContext } from "../contexts/PanelContext";
import { useSessionContext } from "../contexts/SessionContext";
import { useWorkspaceActions } from "../contexts/WorkspaceActionsContext";
import { useWorkspaceState } from "../contexts/WorkspaceStateContext";
import { useLayoutPresets } from "../hooks/useLayoutPresets";
import { GmDockedPanels } from "../panels/GmDockedPanels";
import { GmFloatingPanels } from "../panels/GmFloatingPanels";

// ── Props ──────────────────────────────────────────────────────────────────

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

// ── Rail → gmView mapping ──────────────────────────────────────────────────

const RAIL_TO_VIEW: Record<RailSection, string> = {
  map: "live",
  scenes: "preparation",
  combat: "live",
  characters: "characters",
  library: "library",
  journal: "journal",
  settings: "campaign",
};

// ── Component ───────────────────────────────────────────────────────────────

export function GmWorkspace(props: GmWorkspaceProps) {
  const { campaignMapProps, isMapFloating } = props;

  // Read from contexts
  const state = useWorkspaceState();
  const actions = useWorkspaceActions();
  const panel = usePanelContext();
  const session = useSessionContext();

  const { token, campaigns, selectedCampaign, characters, latestInvite } = state;
  const { handleCreateInvite, onLogout, selectCampaign } = actions;

  const {
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
    railSection,
    setRailSection,
    setCharacters,
  } = panel;

  const { presenceCount, realtimeStatus, theme, toggleTheme, toasts, dismissToast } = session;

  // ── Campaign switcher dropdown ────────────────────────
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false);
  const campaignMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (campaignMenuRef.current && !campaignMenuRef.current.contains(e.target as Node)) {
        setCampaignMenuOpen(false);
      }
    }
    if (campaignMenuOpen) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [campaignMenuOpen]);

  const handleCampaignSwitch = useCallback(
    (c: Campaign) => {
      selectCampaign(c.id);
      setCampaignMenuOpen(false);
    },
    [selectCampaign],
  );

  // ── Rail → gmView sync ────────────────────────────────
  const handleRailSelect = useCallback(
    (section: RailSection) => {
      setRailSection(section);
      const view = RAIL_TO_VIEW[section];
      if (view) setGmView(view as never);
    },
    [setRailSection, setGmView],
  );

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

  // ── Focus map ───────────────────────────────────────
  const [showMiniMap, setShowMiniMap] = useState(false);

  useEffect(() => {
    if (!isFocusMap) {
      setShowMiniMap(false);
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
    <div className="gm-shell-v2">
      {/* ── Rail gauche ───────────────────────────────────── */}
      <GmRail active={railSection} onSelect={handleRailSelect} />

      {/* ── Zone principale ───────────────────────────────── */}
      <div className="gm-main-area">
        {/* ── Topbar simplifiée ──────────────────────────── */}
        <header className={`gm-topbar-v2${isFocusMap ? " focus-compact" : ""}`}>
          {/* Session status */}
          <div className="gm-topbar-status">
            <span className="realtime-pill">{realtimeStatus}</span>
            <span className="gm-topbar-presence">{presenceCount} connectés</span>
          </div>

          {/* Campagne active — dropdown */}
          <div className="gm-campaign-switcher" ref={campaignMenuRef}>
            <button
              type="button"
              className="gm-campaign-current"
              onClick={() => setCampaignMenuOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={campaignMenuOpen}
            >
              <span>{selectedCampaign?.name ?? "Sans campagne"}</span>
              <ChevronDown size={14} />
            </button>
            {campaignMenuOpen && (
              <div className="gm-campaign-dropdown" role="listbox">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    className={`gm-campaign-option${selectedCampaign?.id === c.id ? " active" : ""}`}
                    aria-selected={selectedCampaign?.id === c.id}
                    onClick={() => handleCampaignSwitch(c)}
                  >
                    <strong>{c.name}</strong>
                    <small>{c.member_count} membres</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Session live modes — hidden in focus */}
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

          {/* Toolbar actions — right side */}
          <div className="gm-topbar-actions">
            {/* Layout presets — hidden in focus */}
            {!isFocusMap && (
              <div className="preset-selector" ref={presetRef}>
                <Tooltip content="Dispositions sauvegardées">
                  <button
                    className="gm-topbar-btn"
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

            {/* Non-essential buttons */}
            {!isFocusMap && (
              <>
                <Tooltip content={isPlayerView ? "Revenir en vue MJ" : "Voir comme un joueur"}>
                  <button
                    className="gm-topbar-btn"
                    onClick={() => setIsPlayerView((prev) => !prev)}
                    aria-label={isPlayerView ? "Revenir en vue MJ" : "Voir comme un joueur"}
                    type="button"
                    style={
                      isPlayerView ? { background: "var(--accent)", color: "#fff" } : undefined
                    }
                  >
                    {isPlayerView ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </Tooltip>
                <Tooltip content="Réinitialiser la disposition des panneaux">
                  <button
                    className="gm-topbar-btn"
                    onClick={() => fp.reset()}
                    aria-label="Réinitialiser la disposition des panneaux"
                    type="button"
                  >
                    <RotateCcw size={16} />
                  </button>
                </Tooltip>
                <Tooltip
                  content={isPanelsHidden ? "Afficher les panneaux" : "Masquer les panneaux"}
                >
                  <button
                    className={`gm-topbar-btn${isPanelsHidden ? " active" : ""}`}
                    onClick={() => setIsPanelsHidden((prev) => !prev)}
                    aria-label={isPanelsHidden ? "Afficher les panneaux" : "Masquer les panneaux"}
                    type="button"
                  >
                    {isPanelsHidden ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                  </button>
                </Tooltip>
                <Tooltip content={theme === "dark" ? "Mode clair" : "Mode sombre"}>
                  <button
                    className="gm-topbar-btn"
                    onClick={toggleTheme}
                    aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                    type="button"
                  >
                    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </Tooltip>
                {!isMapFloating && (
                  <Tooltip content="Détacher la carte en panneau flottant">
                    <button
                      className="gm-topbar-btn"
                      onClick={() => fp.open(MAP_PANEL_ID, "Carte", 80, 80, 1100, 720)}
                      aria-label="Détacher la carte en panneau flottant"
                      type="button"
                    >
                      <ExternalLinkIcon size={16} />
                    </button>
                  </Tooltip>
                )}
              </>
            )}

            {/* Focus toggle — always visible */}
            <Tooltip content={isFocusMap ? "Quitter plein écran (Échap)" : "Carte plein écran (F)"}>
              <button
                className={`gm-topbar-btn${isFocusMap ? " active" : ""}`}
                onClick={() => setIsFocusMap((prev) => !prev)}
                aria-label={
                  isFocusMap ? "Quitter le mode plein écran" : "Passer en mode plein écran"
                }
                type="button"
              >
                {isFocusMap ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </Tooltip>

            {/* Mini-map toggle — only in focus */}
            {isFocusMap && (
              <Tooltip content={showMiniMap ? "Masquer la mini-carte" : "Afficher la mini-carte"}>
                <button
                  className={`gm-topbar-btn${showMiniMap ? " active" : ""}`}
                  onClick={() => setShowMiniMap((v) => !v)}
                  aria-label={showMiniMap ? "Masquer la mini-carte" : "Afficher la mini-carte"}
                  type="button"
                >
                  <Map size={16} />
                </button>
              </Tooltip>
            )}

            {/* Second menu: invite, logout */}
            {!isFocusMap && (
              <>
                <div className="gm-topbar-sep" />
                <Tooltip content="Inviter un joueur">
                  <button
                    className="gm-topbar-btn"
                    disabled={isBusy}
                    onClick={handleCreateInvite}
                    aria-label="Inviter un joueur"
                    type="button"
                  >
                    <UserPlus size={16} />
                  </button>
                </Tooltip>
                <Tooltip content="Déconnexion">
                  <button
                    className="gm-topbar-btn"
                    onClick={onLogout}
                    aria-label="Se déconnecter"
                    type="button"
                  >
                    <DoorOpen size={16} />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </header>

        {/* ── Carte ──────────────────────────────────────── */}
        <section className="gm-map-v2">
          {(!isMapFloating || isFocusMap) && (
            <CampaignMap {...campaignMapProps} showMiniMap={isFocusMap ? showMiniMap : undefined} />
          )}
          {isMapFloating && !isFocusMap && (
            <div className="map-floating-placeholder">
              <Map size={48} />
              <p>Carte détachée en panneau flottant</p>
            </div>
          )}
        </section>

        {/* ── Dock inférieur ──────────────────────────── */}
        {!isFocusMap && <GmDock />}

        {/* ── Invite link bar (if latestInvite) ─────────── */}
        {latestInvite && !isFocusMap && (
          <div className="gm-invite-bar">
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
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Panneaux dockés (droite) ─────────────────────────── */}
      <Suspense fallback={<PanelFallback />}>
        <aside
          className="gm-panels"
          style={{ display: isPanelsHidden || isFocusMap ? "none" : "" }}
        >
          <GmDockedPanels />
        </aside>
      </Suspense>

      {/* ── Floating panels ──────────────────────────────────── */}
      <div style={{ display: isFocusMap ? "none" : undefined }}>
        <GmFloatingPanels />
      </div>

      {/* ── Panel dock ───────────────────────────────────────── */}
      <div style={{ display: isFocusMap ? "none" : undefined }}>
        <PanelDock panels={fp.panels} onRestore={(id) => fp.minimize(id)} />
      </div>

      {/* ── Toast notifications ──────────────────────────────── */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item${t.type === "error" ? " error" : ""}`}>
            <span>{t.message}</span>
            <button onClick={() => dismissToast(t.id)} type="button">
              <X size={14} />
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
                  void actions.loadCharacters(selectedCampaign.id);
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
              onCharacterUpdated={(updated) =>
                setCharacters((c) => c.map((x) => (x.id === updated.id ? updated : x)))
              }
            />
          );
        })()}
    </div>
  );
}
