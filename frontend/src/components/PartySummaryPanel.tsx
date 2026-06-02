import type { Character } from "../api/types";

type PartySummaryPanelProps = {
  characters: Character[];
  selectedCharacter: Character | undefined;
};

function getAbilityModifier(score: number) {
  return Math.floor((score - 10) / 2);
}

function getPassivePerception(character: Character) {
  return 10 + getAbilityModifier(character.attributes.wis ?? 10);
}

function getHpPercent(character: Character) {
  if (character.hp_max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((character.hp_current / character.hp_max) * 100)));
}

function getHealthLabel(percent: number) {
  if (percent <= 0) {
    return "KO";
  }

  if (percent <= 25) {
    return "Critique";
  }

  if (percent <= 50) {
    return "Blessé";
  }

  return "OK";
}

export function PartySummaryPanel({ characters, selectedCharacter }: PartySummaryPanelProps) {
  if (characters.length === 0) {
    return (
      <div className="party-summary-panel">
        <p className="muted">Aucun personnage dans cette campagne.</p>
      </div>
    );
  }

  const woundedCharacters = characters.filter((character) => character.hp_current < character.hp_max);
  const downCharacters = characters.filter((character) => character.hp_current <= 0);

  return (
    <div className="party-summary-panel">
      <header className="party-summary-overview">
        <span>
          <small>Groupe</small>
          <strong>{characters.length}</strong>
        </span>

        <span>
          <small>Blessés</small>
          <strong>{woundedCharacters.length}</strong>
        </span>

        <span>
          <small>KO</small>
          <strong>{downCharacters.length}</strong>
        </span>
      </header>

      <div className="party-summary-list">
        {characters.map((character) => {
          const hpPercent = getHpPercent(character);
          const healthLabel = getHealthLabel(hpPercent);
          const isSelected = selectedCharacter?.id === character.id;

          return (
            <article
              className={`party-summary-row ${isSelected ? "selected" : ""} ${hpPercent <= 25 ? "danger" : ""}`}
              key={character.id}
            >
              <header>
                <span>
                  <strong>{character.name}</strong>
                  <small>
                    Niv. {character.level} · {character.class_name || "Aventurier"}
                  </small>
                </span>

                <b>{healthLabel}</b>
              </header>

              <div className="party-summary-stats">
                <em title="Points de vie">
                  PV {character.hp_current}/{character.hp_max}
                </em>
                <em title="Classe d’armure">CA {character.armor_class}</em>
                <em title="Vitesse">VIT {character.speed}</em>
                <em title="Perception passive">PP {getPassivePerception(character)}</em>
              </div>

              <div className="party-summary-health" aria-label={`PV ${hpPercent}%`}>
                <i style={{ width: `${hpPercent}%` }} />
              </div>

              {character.notes ? (
                <small className="party-summary-note">{character.notes}</small>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
