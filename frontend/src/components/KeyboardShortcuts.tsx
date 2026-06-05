import { useEffect, useRef } from "react";

type ShortcutCategory = {
  title: string;
  shortcuts: { keys: string; description: string }[];
};

const SHORTCUTS: ShortcutCategory[] = [
  {
    title: "Tokens",
    shortcuts: [
      {
        keys: "↑ ↓ ← → / W A S D",
        description: "Déplacer le(s) token(s) sélectionné(s) d'une cellule",
      },
      { keys: "Shift + ↑ ↓ ← →", description: "Déplacer de 5 cellules (traversée rapide)" },
      { keys: "Shift + Clic", description: "Ajouter/retirer un token de la sélection multiple" },
      { keys: "Clic-droit", description: "Menu contextuel (dupliquer, supprimer, dégâts…)" },
    ],
  },
  {
    title: "Carte",
    shortcuts: [
      { keys: "Espace", description: "Activer/désactiver le mode déplacement (pan)" },
      { keys: "G", description: "Afficher/masquer la grille" },
      { keys: "F", description: "Carte en plein écran" },
      { keys: "0", description: "Réinitialiser le zoom (100%)" },
      { keys: "Molette", description: "Zoom avant/arrière" },
    ],
  },
  {
    title: "Interface",
    shortcuts: [
      { keys: "Échap", description: "Fermer le menu / panneau actif" },
      { keys: "Ctrl/Cmd + Z", description: "Annuler le dernier déplacement de token" },
      { keys: "?", description: "Afficher ce panneau d'aide" },
    ],
  },
];

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        e.stopImmediatePropagation(); // prevent App.tsx listener from re-opening
        onClose();
      }
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("click", handleClick);
    };
  }, [onClose]);

  // Focus the modal so Escape works immediately
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      className="keyboard-shortcuts-overlay"
      tabIndex={-1}
      role="dialog"
      aria-label="Raccourcis clavier"
      aria-modal="true"
    >
      <div className="keyboard-shortcuts-panel">
        <div className="shortcuts-header">
          <h2>⌨️ Raccourcis clavier</h2>
          <button type="button" onClick={onClose} className="shortcuts-close">
            ✕
          </button>
        </div>

        {SHORTCUTS.map((cat) => (
          <div key={cat.title} className="shortcuts-category">
            <h3>{cat.title}</h3>
            <div className="shortcuts-grid">
              {cat.shortcuts.map((s) => (
                <div key={s.keys} className="shortcut-item">
                  <kbd>{s.keys}</kbd>
                  <span>{s.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="shortcuts-footer">
          Appuie sur <kbd>?</kbd> ou <kbd>Échap</kbd> pour fermer
        </div>
      </div>
    </div>
  );
}
