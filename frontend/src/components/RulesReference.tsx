import { BookOpen, Search } from "lucide-react";
import { useMemo, useState } from "react";

const RULES = {
  conditions: {
    title: "Conditions",
    content: `**À terre** : Désavantage aux attaques. Les attaquants à 5ft ont avantage, attaques à distance désavantage.
**Aveuglé** : Échec auto jets basés sur la vue. Désavantage attaques. Avantage aux attaquants.
**Charmé** : Ne peut attaquer le charmeur. Avantage du charmeur en interactions sociales.
**Empoisonné** : Désavantage aux jets d'attaque et de caractéristique.
**Étourdi** : Ni action ni réaction. Désavantage DEX. Avantage aux attaquants.
**Inconscient** : À terre, échec auto DEX/STR. Attaques à 5ft = critiques.
**Neutralisé** : Pas d'actions ni réactions.
**Paralysé** : Neutralisé + échec auto DEX/STR + critiques à 5ft.
**Terrifié** : Désavantage jets + ne peut s'approcher de la source.
**Agrippé** : Vitesse = 0. Libération test Athlétisme/Acrobaties.
**Restreint** : Vitesse = 0. Désavantage attaques + DEX. Avantage attaquants.
**Fatigué** : 6 niveaux (1: désavantage capacités → 6: mort).`,
  },
  combatActions: {
    title: "Actions en combat",
    content: `**Attaquer** : Une attaque. Extra Attack niv. 5+.
**Lancer un sort** : 1 sort à 1 action. Pas 2 sorts niv. 1+/tour.
**Foncer (Dash)** : Vitesse ×2 ce tour.
**Esquiver (Dodge)** : Désavantage aux attaquants, avantage DEX.
**Se cacher (Hide)** : Discrétion vs Perception passive.
**Aider (Help)** : Avantage au prochain jet d'un allié.
**Se désengager (Disengage)** : Pas d'attaque d'opportunité.
**Prêt (Ready)** : Prépare action + réaction.
**Utiliser un objet** : Potion, objet interactif.
**Chercher (Search)** : Perception ou Investigation.`,
  },
  deathSaves: {
    title: "PV 0 & Jets de mort",
    content: `**PV = 0** : Inconscient. Jets de mort au début de chaque tour.
**d20** : 1 = 2 échecs. 20 = regagne 1 PV. 2-9 = 1 échec. 10-19 = 1 succès.
**3 succès** = stable (0 PV, inconscient, reprend 1 PV en 1d4 heures).
**3 échecs** = mort.
**PV = -max** = mort instantanée.
**Dégâts subis à 0 PV** = 1 échec automatique (2 si critique).`,
  },
  rest: {
    title: "Repos",
    content: `**Repos court (1h)** : Dépenser dés de vie → PV. Récupération capacités.
**Repos long (8h)** : PV max + ½ dés de vie restaurés. 1 seul / 24h.`,
  },
  advantageDisadvantage: {
    title: "Avantage / Désavantage",
    content: `**Avantage** : 2d20, garder le + haut (~+3.3).
**Désavantage** : 2d20, garder le + bas (~-3.3).
Ne se cumulent pas. 1 avantage annule tout désavantage.`,
  },
  cover: {
    title: "Couverture",
    content: `**½ couverture** : +2 CA et DEX.
**¾ couverture** : +5 CA et DEX.
**Totale** : Non ciblable directement.`,
  },
  xpTable: {
    title: "Niveaux & XP",
    content: `Niv. 1: 0 XP (+2) | Niv. 2: 300 (+2) | Niv. 3: 900 (+2) | Niv. 4: 2700 (+2)
Niv. 5: 6500 (+3) | Niv. 6: 14000 (+3) | Niv. 7: 23000 (+3) | Niv. 8: 34000 (+3)
Niv. 9: 48000 (+4) | Niv. 10: 64000 (+4) | Niv. 11: 85000 (+4) | Niv. 12: 100000 (+4)
Niv. 13: 120000 (+5) | Niv. 14: 140000 (+5) | Niv. 15: 165000 (+5) | Niv. 16: 195000 (+5)
Niv. 17: 225000 (+6) | Niv. 18: 265000 (+6) | Niv. 19: 305000 (+6) | Niv. 20: 355000 (+6)`,
  },
  difficulty: {
    title: "Difficulté (DD)",
    content: `Très facile: 5 | Facile: 10 | Moyen: 15 | Difficile: 20 | Très difficile: 25 | Presque impossible: 30`,
  },
  skills: {
    title: "Compétences",
    content: `**FOR** : Athlétisme
**DEX** : Acrobaties, Discrétion, Escamotage
**INT** : Arcanes, Histoire, Investigation, Nature, Religion
**SAG** : Dressage, Médecine, Perception, Perspicacité, Survie
**CHA** : Intimidation, Persuasion, Représentation, Tromperie`,
  },
  savingThrows: {
    title: "Sauvegardes par classe",
    content: `Barbare: FOR/CON | Barde: DEX/CHA | Clerc: SAG/CHA | Druide: INT/SAG
Ensorceleur: CON/CHA | Guerrier: FOR/CON | Magicien: INT/SAG
Moine: FOR/DEX | Occultiste: SAG/CHA | Paladin: SAG/CHA
Rôdeur: FOR/DEX | Roublard: DEX/INT
DD = 8 + bonus maîtrise + mod. caractéristique`,
  },
  opportunityAttack: {
    title: "Attaques d'opportunité",
    content: `Quand une créature quitte ta portée (5ft). Consomme la réaction. Une seule attaque de mêlée. Se désengager annule.`,
  },
  vision: {
    title: "Visibilité & lumière",
    content: `Lumière vive : normale. Lumière faible : désavantage Perception.
Obscurité : considéré comme aveuglé. Vision dans le noir : obscurité = lumière faible (gris).`,
  },
};

type SectionKey = keyof typeof RULES;

export function RulesReference() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<SectionKey>>(new Set());

  const filtered = useMemo(() => {
    if (!query.trim()) return RULES;
    const q = query.toLowerCase();
    const result: Partial<typeof RULES> = {};
    for (const [key, section] of Object.entries(RULES)) {
      if (section.title.toLowerCase().includes(q) || section.content.toLowerCase().includes(q)) {
        result[key as SectionKey] = section;
      }
    }
    return result;
  }, [query]);

  function toggle(section: SectionKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  const entries = Object.entries(filtered) as [SectionKey, (typeof RULES)[SectionKey]][];

  return (
    <div className="rules-reference">
      <div className="rules-search">
        <Search size={14} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher règle, condition..."
          className="rules-search-input"
        />
      </div>

      {entries.length === 0 ? (
        <p className="muted" style={{ textAlign: "center", padding: "1rem" }}>
          Aucune règle trouvée pour « {query} »
        </p>
      ) : (
        <div className="rules-list">
          {entries.map(([key, section]) => (
            <div key={key} className="rules-section">
              <button
                className={`rules-section-header ${expanded.has(key) ? "expanded" : ""}`}
                onClick={() => toggle(key)}
                type="button"
              >
                <BookOpen size={13} />
                <span>{section.title}</span>
                <span className="rules-chevron">{expanded.has(key) ? "▾" : "▸"}</span>
              </button>
              {expanded.has(key) && (
                <div className="rules-section-body">
                  {section.content.split("\n").map((line, i) => {
                    const boldLine = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
                    return (
                      <p
                        key={i}
                        className="rules-line"
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: static D&D rules text with bold tags only
                        dangerouslySetInnerHTML={{ __html: boldLine }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="muted rules-footer">
        SRD D&D 5e — Référence abrégée. Règles complètes : D&D Basic Rules (Wizards of the Coast).
      </p>
    </div>
  );
}
