import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import type { SceneToken } from "../api/types";

type InitiativeState = {
  initiatives: Record<string, string>;
  activeTokenId: string;
  round: number;
};

type InitiativePanelProps = {
  sceneId: string;
  sceneTokens: SceneToken[];
};

function getStorageKey(sceneId: string) {
  return `dnd-initiative:${sceneId}`;
}

function readStoredInitiative(sceneId: string): InitiativeState {
  if (!sceneId) {
    return {
      initiatives: {},
      activeTokenId: "",
      round: 1,
    };
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(sceneId));

    if (!rawValue) {
      return {
        initiatives: {},
        activeTokenId: "",
        round: 1,
      };
    }

    return {
      initiatives: {},
      activeTokenId: "",
      round: 1,
      ...(JSON.parse(rawValue) as Partial<InitiativeState>),
    };
  } catch {
    return {
      initiatives: {},
      activeTokenId: "",
      round: 1,
    };
  }
}

function getInitiativeValue(value: string) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : -999;
}

export function InitiativePanel({ sceneId, sceneTokens }: InitiativePanelProps) {
  const [initiativeState, setInitiativeState] = useState<InitiativeState>(() =>
    readStoredInitiative(sceneId),
  );

  useEffect(() => {
    const currentSceneId = sceneId;

    setInitiativeState(readStoredInitiative(currentSceneId));
  }, [sceneId]);

  const orderedTokens = useMemo(() => {
    return [...sceneTokens].sort((left, right) => {
      const leftInitiative = getInitiativeValue(initiativeState.initiatives[left.id] ?? "");
      const rightInitiative = getInitiativeValue(initiativeState.initiatives[right.id] ?? "");

      if (rightInitiative !== leftInitiative) {
        return rightInitiative - leftInitiative;
      }

      return left.name.localeCompare(right.name);
    });
  }, [initiativeState.initiatives, sceneTokens]);

  function persist(nextState: InitiativeState) {
    if (!sceneId) {
      return;
    }

    window.localStorage.setItem(getStorageKey(sceneId), JSON.stringify(nextState));
  }

  function updateState(updater: (current: InitiativeState) => InitiativeState) {
    setInitiativeState((current) => {
      const nextState = updater(current);

      persist(nextState);

      return nextState;
    });
  }

  function handleInitiativeChange(tokenId: string, event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;

    updateState((current) => ({
      ...current,
      initiatives: {
        ...current.initiatives,
        [tokenId]: nextValue,
      },
    }));
  }

  function rollInitiativeForToken(tokenId: string) {
    const roll = Math.floor(Math.random() * 20) + 1;

    updateState((current) => ({
      ...current,
      initiatives: {
        ...current.initiatives,
        [tokenId]: String(roll),
      },
    }));
  }

  function rollInitiativeForAll() {
    updateState((current) => {
      const nextInitiatives = { ...current.initiatives };

      sceneTokens.forEach((token) => {
        nextInitiatives[token.id] = String(Math.floor(Math.random() * 20) + 1);
      });

      return {
        ...current,
        initiatives: nextInitiatives,
        activeTokenId: sceneTokens[0]?.id ?? "",
        round: Math.max(1, current.round),
      };
    });
  }

  function selectActiveToken(tokenId: string) {
    updateState((current) => ({
      ...current,
      activeTokenId: tokenId,
    }));
  }

  function goToNextTurn() {
    if (orderedTokens.length === 0) {
      return;
    }

    updateState((current) => {
      const activeIndex = orderedTokens.findIndex((token) => token.id === current.activeTokenId);
      const nextIndex = activeIndex === -1 ? 0 : (activeIndex + 1) % orderedTokens.length;
      const nextRound = activeIndex !== -1 && nextIndex === 0 ? current.round + 1 : current.round;

      return {
        ...current,
        activeTokenId: orderedTokens[nextIndex]?.id ?? "",
        round: nextRound,
      };
    });
  }

  function resetInitiative() {
    updateState(() => ({
      initiatives: {},
      activeTokenId: "",
      round: 1,
    }));
  }

  return (
    <div className="initiative-panel">
      <header className="initiative-panel-header">
        <span>
          <strong>Round {initiativeState.round}</strong>
          <small>{orderedTokens.length} combattant(s)</small>
        </span>

        <div>
          <button disabled={sceneTokens.length === 0} onClick={rollInitiativeForAll} type="button">
            Tout lancer
          </button>
          <button disabled={orderedTokens.length === 0} onClick={goToNextTurn} type="button">
            Tour suivant
          </button>
        </div>
      </header>

      {sceneTokens.length === 0 ? (
        <p className="muted">Aucun token sur cette scène.</p>
      ) : (
        <div className="initiative-list">
          {orderedTokens.map((token, index) => {
            const isActive = initiativeState.activeTokenId === token.id;

            return (
              <article className={`initiative-row ${isActive ? "active" : ""}`} key={token.id}>
                <button
                  className="initiative-turn-button"
                  onClick={() => selectActiveToken(token.id)}
                  title="Définir comme tour actif"
                  type="button"
                >
                  {isActive ? "▶" : index + 1}
                </button>

                <span>
                  <strong>{token.name}</strong>
                  <small>
                    x {token.x} · y {token.y}
                    {token.is_hidden ? " · caché" : ""}
                  </small>
                </span>

                <input
                  aria-label={`Initiative de ${token.name}`}
                  inputMode="numeric"
                  onChange={(event) => handleInitiativeChange(token.id, event)}
                  placeholder="-"
                  type="number"
                  value={initiativeState.initiatives[token.id] ?? ""}
                />

                <button onClick={() => rollInitiativeForToken(token.id)} title="Lancer 1d20" type="button">
                  d20
                </button>
              </article>
            );
          })}
        </div>
      )}

      <footer className="initiative-panel-footer">
        <button disabled={sceneTokens.length === 0} onClick={resetInitiative} type="button">
          Reset initiative
        </button>
      </footer>
    </div>
  );
}
