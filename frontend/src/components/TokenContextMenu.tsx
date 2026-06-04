import {
  Crosshair,
  Copy,
  Eye,
  EyeOff,
  Heart,
  Layers,
  Layers3,
  Minus,
  Plus,
  Swords,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SceneToken } from "../api/types";

export type TokenContextAction =
  | "center"
  | "duplicate"
  | "delete"
  | "hide"
  | "reveal"
  | "lock"
  | "unlock"
  | "add-combat"
  | "front"
  | "back"
  | "damage"
  | "heal";

type Props = {
  token: SceneToken;
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: TokenContextAction, token: SceneToken, value?: number) => void;
};

export function TokenContextMenu({ token, x, y, onClose, onAction }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showDamage, setShowDamage] = useState(false);
  const [damageValue, setDamageValue] = useState(0);

  // Close on click outside or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    // Delay to prevent the right-click event from closing it immediately
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClick);
      document.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const doAction = useCallback(
    (action: TokenContextAction, value?: number) => {
      onAction(action, token, value);
      onClose();
    },
    [onAction, token, onClose],
  );

  const hpMax = (token.metadata?.hp_max as number) ?? 0;
  const hasHP = hpMax > 0;

  // Constrain menu to viewport bounds
  const menuStyle: React.CSSProperties = { left: x, top: y };
  // Clamp will be handled by CSS overflow from the parent map viewport

  return (
    <div className="token-context-menu" ref={ref} style={menuStyle}>
      {/* Token name */}
      <div className="token-context-header">
        <span
          className="token-context-swatch"
          style={{ background: token.color }}
        />
        <strong>{token.name}</strong>
      </div>

      <div className="token-context-divider" />

      {/* Quick actions */}
      <button type="button" onClick={() => doAction("center")}>
        <Crosshair size={13} /> Centrer
      </button>
      <button type="button" onClick={() => doAction("duplicate")}>
        <Copy size={13} /> Dupliquer <kbd>⌘D</kbd>
      </button>

      <div className="token-context-divider" />

      <button type="button" onClick={() => doAction(token.is_hidden ? "reveal" : "hide")}>
        {token.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
        {token.is_hidden ? "Révéler" : "Masquer"} <kbd>⌘H</kbd>
      </button>
      <button type="button" onClick={() => doAction("add-combat")}>
        <Swords size={13} /> Ajouter au combat
      </button>

      <div className="token-context-divider" />

      <button type="button" onClick={() => doAction("front")}>
        <Layers3 size={13} /> Premier plan <kbd>]</kbd>
      </button>
      <button type="button" onClick={() => doAction("back")}>
        <Layers size={13} /> Arrière-plan <kbd>[</kbd>
      </button>

      {/* Health / Damage */}
      {hasHP && (
        <>
          <div className="token-context-divider" />
          {!showDamage ? (
            <button type="button" onClick={() => setShowDamage(true)}>
              <Heart size={13} /> Appliquer dégâts / soins
            </button>
          ) : (
            <div className="token-context-damage">
              <div className="damage-row">
                <button
                  type="button"
                  onClick={() => setDamageValue((v) => Math.max(0, v - 5))}
                >
                  <Minus size={12} />
                </button>
                <span className="damage-value">{damageValue > 0 ? `-${damageValue}` : `+${-damageValue}`}</span>
                <button
                  type="button"
                  onClick={() => setDamageValue((v) => v + 5)}
                >
                  <Plus size={12} />
                </button>
              </div>
              <div className="damage-presets">
                {[5, 10, 15, 25].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="damage-preset"
                    onClick={() => setDamageValue(n)}
                  >
                    -{n}
                  </button>
                ))}
                {[-5, -10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="damage-preset heal"
                    onClick={() => setDamageValue(n)}
                  >
                    +{-n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="damage-apply"
                disabled={damageValue === 0}
                onClick={() => doAction(damageValue >= 0 ? "damage" : "heal", Math.abs(damageValue))}
              >
                Appliquer
              </button>
            </div>
          )}
        </>
      )}

      <div className="token-context-divider" />

      <button
        type="button"
        className="token-context-danger"
        onClick={() => doAction("delete")}
      >
        <Trash2 size={13} /> Supprimer
      </button>
    </div>
  );
}
