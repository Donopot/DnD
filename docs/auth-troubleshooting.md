# Authentification - Guide de dépannage

## Objectif

Stabiliser les parcours connexion / inscription du produit DnD SaaS.

## Parcours attendus

### Connexion MJ existant

1. Ouvrir `/`.
2. Onglet Connexion affiché par défaut.
3. Saisir email + mot de passe.
4. Accès au lobby MJ ou à la campagne.

### Inscription MJ

1. Passer sur Inscription.
2. Choisir Maître du Jeu.
3. Renseigner nom affiché, email, mot de passe et confirmation.
4. Le mot de passe doit contenir :
   - 8 caractères minimum ;
   - une minuscule ;
   - une majuscule ;
   - un chiffre.

### Inscription Joueur

1. Passer sur Inscription.
2. Choisir Joueur.
3. Saisir un code d’invitation valide.
4. Créer le compte.
5. Le joueur rejoint automatiquement la campagne associée.

## Après reset de base

Après un reset PostgreSQL, les anciens comptes n’existent plus.

Il faut vider le token local navigateur :

```js
localStorage.removeItem("dnd_access_token");
location.reload();

Puis recréer un compte.

Tests API rapides
EMAIL="test+$(date +%Y%m%d%H%M%S)@dnd-smoke.fr"
PASSWORD="TestPass123!"

curl -sS -X POST http://127.0.0.1:8091/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"display_name\":\"Test MJ\",\"password\":\"$PASSWORD\",\"confirm_password\":\"$PASSWORD\",\"account_type\":\"gm\",\"website\":\"\"}" | jq

curl -sS -X POST http://127.0.0.1:8091/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq
Causes fréquentes
backend arrêté ;
migrations échouées ;
ancien token local après reset DB ;
mot de passe trop faible ;
confirmation différente ;
email déjà utilisé ;
inscription Joueur sans invitation ;
service worker navigateur qui sert un ancien bundle.
Validation serveur
docker compose up -d --build
sh scripts/wait-api.sh
curl -fsS http://127.0.0.1:8091/api/health
sh scripts/smoke-backend.sh

