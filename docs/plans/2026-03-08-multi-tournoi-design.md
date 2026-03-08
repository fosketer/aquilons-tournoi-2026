# Design : Support multi-tournoi (CVS + Régional QCA)

Date : 2026-03-08

## Contexte

L'équipe Aquilons (Jean-de-Brébeuf) participe au Régional RSEQ QCA la semaine prochaine. On veut réutiliser les pages résultats et stats existantes, avec les deux tournois accessibles en parallèle.

## Approche retenue

**Filtre global par tournoi_id** — un toggle UI en haut de chaque page switch entre les tournois. Toutes les requêtes Supabase filtrent déjà par `tournoi_id`, on rend la variable dynamique.

## Sélecteur de tournoi (UI)

- Bandeau compact sous la navbar, deux boutons pill/tab : `[ CVS Alma 2026 ] [ Régional QCA ]`
- Actif = bleu (#1A56B8), inactif = gris transparent
- Au clic : change `localStorage('tournoi')` + recharge les données sans reload de page
- Query param `?tournoi=cvs` ou `?tournoi=qca` pour liens partageables
- Priorité au chargement : query param > localStorage > tournoi le plus proche en date
- Mobile-first : boutons côte à côte, pleine largeur

## Config JS

```js
const TOURNOIS = {
  cvs: {
    id: 'a0000000-0000-0000-0000-000000000001',
    nom: 'CVS Alma 2026',
    slug: 'cvs',
    equipe: 'Aquilons',
    ecole: 'Jean-de-Brébeuf'
  },
  qca: {
    id: 'a0000000-0000-0000-0000-000000000002',
    nom: 'Régional QCA 2026',
    slug: 'qca',
    equipe: 'Aquilons',
    ecole: 'Jean-de-Brébeuf'
  }
};
```

## Page résultats (index.html)

- `TOURNOI_ID` devient dynamique (lit depuis sélecteur actif)
- `loadMatchs()` + `loadAdversaires()` rappelés au switch
- Realtime : désabonnement ancien channel, abonnement nouveau
- Venues : utiliser `lieu_adresse` / `lieu_maps_url` depuis la table matchs (le fallback hardcodé reste pour CVS)
- Titre/scoreboard affiche le nom du tournoi actif
- Scorekeeper : aucun changement de logique

## Page stats (stats.html)

- Tableau adversaires filtré par `tournoi_id`
- Classements régionaux conditionnels :
  - CVS : 5 régions (Saguenay, Est-du-QC, Côte-Nord) + QCA Google Sheets
  - QCA : seulement section QCA (Google Sheets)
- `TOURNEY_TEAM_MAP` et `TOURNEY_HIGHLIGHTS` par tournoi

## Page classement (classement.html)

- Aucune modification
- Masquée dans la nav quand le tournoi QCA est actif
- Accès direct affiche "Non disponible" ou redirige

## Navigation

- CVS : 3 liens (Résultats, Classement, Stats)
- QCA : 2 liens (Résultats, Stats)
- Lien Classement masqué dynamiquement selon tournoi actif

## Supabase

- Nouveau tournoi dans table `tournois` (UUID: `a0000000-0000-0000-0000-000000000002`)
- Nouveaux matchs et adversaires avec le bon `tournoi_id`
- Données remplies quand disponibles (adversaires, heures, lieux)

## Hors scope

- Pas de duplication de pages
- Pas de config.js externe (over-engineering pour 2 tournois)
- classement.html inchangé
