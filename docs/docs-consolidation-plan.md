# Plan de consolidation de la documentation

## Objectif

Réduire le nombre de documents actifs dans `docs/` et clarifier les sources de vérité.

## Problème actuel

La documentation mélange :

- roadmaps produit ;
- roadmaps techniques ;
- notes de phases anciennes ;
- plans de PR ;
- audits ;
- documentation UI ;
- documentation backend ;
- documentation de déploiement.

Certains documents sont devenus obsolètes ou redondants.

## Structure cible

À terme, les documents actifs devraient être réduits à :

```txt
docs/
  README.md
  product-roadmap.md
  architecture.md
  frontend-ui.md
  vtt-map-fog.md
  backend-api.md
  security-auth.md
  deployment-ops.md
  srd-content.md
  archive/
Fusion proposée
product-roadmap.md

Fusionner :

roadmap.md
project-roadmap.md
product-development.md
gm-roadmap.md
architecture.md

Fusionner :

backend-roadmap.md
frontend-redesign.md
css-modules.md
developer-toolchain.md
frontend-ui.md

Fusionner :

frontend-panels.md
frontend-improvement-plan.md
gm-interface-action-plan.md
gm-panel-stabilization.md
gm-panel-test-matrix.md
vtt-map-fog.md

Fusionner :

plan-refonte-map.md
pr-fog-of-war-stabilization.md
anciennes phases map archivées
backend-api.md

Fusionner :

backend-roadmap.md
backend-smoke-tests.md
anciennes phases backend archivées
security-auth.md

Fusionner :

auth-security-audit.md
auth-troubleshooting.md
anciennes passes auth archivées
deployment-ops.md

Fusionner :

deployment.md
developer-toolchain.md
agent-coordination.md
srd-content.md

Renommer ou conserver :

SRD.md
Étape actuelle

Cette PR ne fusionne pas encore tout.

Elle fait une première passe saine :

créer docs/README.md ;
créer ce plan de consolidation ;
déplacer les anciennes notes de phase dans docs/archive/ ;
conserver les documents actifs encore utilisés.
Étapes suivantes
Créer product-roadmap.md.
Créer frontend-ui.md.
Créer vtt-map-fog.md.
Créer backend-api.md.
Créer security-auth.md.
Créer deployment-ops.md.
Remplacer les anciens documents actifs par des liens vers les nouveaux.
Archiver les documents devenus redondants.
