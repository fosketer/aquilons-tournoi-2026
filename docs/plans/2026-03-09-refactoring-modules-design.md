# Design : Redécoupage en modules ES6

**Date :** 2026-03-09
**Statut :** Approuvé
**Objectif :** Refactorer l'app monolithique (4 fichiers HTML inline) en modules ES6 natifs, config-driven depuis Supabase, pour améliorer la lisibilité, la maintenabilité et l'extensibilité.

## Décisions clés

- **Zéro build step** — ES6 modules natifs (`<script type="module">`), push = deploy
- **Config dans Supabase** — Champ `config JSONB` sur la table `tournois` (sheets, RSEQ, pools, team mappings)
- **Web Components natifs** — `<app-header>`, `<match-card>`, sans Shadow DOM
- **Scorekeeper dynamique** — Liste des matchs fetchée depuis Supabase (plus de hardcoding)
- **Migration incrémentale** — Page par page, chaque commit = app fonctionnelle

## Structure de fichiers

```
aquilons-tournoi-2026/
├── index.html              # Résultats (coquille ~30 lignes)
├── classement.html         # Classement (coquille ~30 lignes)
├── stats.html              # Stats (coquille ~30 lignes)
├── match.html              # Scorekeeper (coquille ~30 lignes)
├── css/
│   └── shared.css          # Variables, reset, typo, grille, cartes, badges
├── js/
│   ├── lib/
│   │   ├── supabase.js     # Client singleton + helpers (fetchRows, subscribe)
│   │   ├── sheets.js       # fetchSheet(sheetId, gid) + parseCSV(text)
│   │   ├── rseq.js         # fetchLeague(leagueId), buildRegion(config, data)
│   │   └── ui.js           # showLoading, showError, showEmpty
│   ├── components/
│   │   ├── app-header.js   # <app-header> : logo, titre, nav, sélecteur tournoi
│   │   └── match-card.js   # <match-card> : carte de match réutilisable
│   ├── config.js           # getTournoiConfig(slug), getTournoiActif(), setTournoiActif()
│   └── pages/
│       ├── resultats.js    # Logique index.html
│       ├── scorekeeper.js  # Logique match.html
│       ├── classement.js   # Logique classement.html
│       └── stats.js        # Logique stats.html
├── supabase-setup.sql
├── logo.jpg
└── CLAUDE.md
```

## Schéma Supabase : config tournoi

Migration :
```sql
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
UPDATE tournois SET slug = 'cvs' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE tournois SET slug = 'qca' WHERE id = 'a0000000-0000-0000-0000-000000000002';
```

Structure du JSONB `config` :
```jsonc
{
  "sheets": {
    "id": "1TGb1tBMg2CB9lGfWd3uqxHAcxBW81zw4gSfdKCWH7A0",
    "gids": {
      "d2_resultats": 927908034,
      "d1_resultats": 290611892,
      "elim_d2_tier1": 258735679,
      "elim_d2_tier2": 1190283882
    },
    "pools": [
      {
        "name": "Pool E",
        "team_ids": [41, 42, 43, 44],
        "columns": { "sg": 16, "sp": 17, "pp": 18, "pc": 19, "rang": 22 }
      }
    ],
    "aquilon_name": "Aquilon (QC)"
  },
  "rseq": {
    "leagues": [
      { "id": "cad4071e-...", "name": "Saguenay", "region_id": "saguenay", "format": "volleyball" },
      { "id": "330427e7-...", "name": "Est-du-QC (Est)", "region_id": "estqc-est", "format": "standings" }
    ]
  },
  "qca": {
    "sheets_url": "https://docs.google.com/spreadsheets/d/1J4t.../export?format=csv",
    "columns": { "rang": 0, "equipe": 1, "t3": 4, "t4": 7, "t5": 10, "total": 11 }
  },
  "team_map": [
    { "tournoi": "Tigres d'Amé", "search": "Armand-Saint-Onge 1", "region_id": "estqc-ouest" },
    { "tournoi": "Husky JDN", "search": "Manikoutai 1", "region_id": "cotenord-d3" }
  ]
}
```

Tournoi QCA : `sheets: null`, `rseq: null`, `qca` rempli. Le code s'adapte selon ce qui est présent.

## Web Components

### `<app-header page="resultats">`
- Logo, titre, navigation (3 liens avec état actif)
- Sélecteur de tournoi injecté dynamiquement via `renderSelector(tournois, actif, onSwitch)`
- Pas de Shadow DOM — utilise le CSS global

### `<match-card>`
- Reçoit un objet match via propriété JS (`el.match = data`)
- Affiche : numéro, heure, adversaire, score formaté, lieu, statut (upcoming/live/win/loss)
- Réutilisé par resultats.js

## Modules lib

### `js/lib/supabase.js`
- Client singleton (`getClient()`)
- `fetchRows(table, filters)` — query helper
- `subscribe(table, callback)` — retourne une fonction `unsubscribe()`
- Seul endroit avec les credentials Supabase

### `js/config.js`
- `getTournoiConfig(slug)` — fetch + cache depuis table `tournois`
- `getTournoiActif()` — résout depuis URL param > localStorage > default 'cvs'
- `setTournoiActif(slug)` — persiste dans localStorage + URL

### `js/lib/sheets.js`
- `fetchSheet(sheetId, gid)` — fetch CSV depuis Google Sheets
- `parseCSV(text)` — parser CSV centralisé (existant, déplacé ici)

### `js/lib/rseq.js`
- `fetchLeague(leagueId)` — appel API RSEQ S1
- `buildRegion(leagueConfig, apiData)` — transforme la réponse API en structure de région

### `js/lib/ui.js`
- `showLoading(container)` — spinner pendant le fetch
- `showError(container, message)` — bannière d'erreur avec retry
- `showEmpty(container, message)` — état vide (ex: pas de classement pour ce tournoi)

## Pattern commun des pages

```js
import { getTournoiActif, getTournoiConfig, setTournoiActif } from '../config.js';
import '../components/app-header.js';

const app = document.getElementById('app');
let cleanup = null;

async function init(slug) {
  if (cleanup) cleanup();
  const config = await getTournoiConfig(slug);
  // fetch data, render, subscribe
  // cleanup = () => { unsubscribe(); clearInterval(); }
}

document.querySelector('app-header').renderSelector(
  await fetchTournois(),
  getTournoiActif(),
  (slug) => { setTournoiActif(slug); init(slug); }
);

init(getTournoiActif());
```

## Gestion d'erreurs

| Situation | Comportement |
|---|---|
| Supabase fetch échoue | `showError(app, '...')` + bouton retry |
| Google Sheets échoue | Erreur dans la zone classement, reste de la page fonctionne |
| RSEQ API échoue pour 1 ligue | Autres ligues s'affichent, onglet en erreur montre un message |
| Realtime se déconnecte | Bandeau discret "Connexion perdue" |
| Config tournoi introuvable | Fallback sur tournoi par défaut |
| `config.sheets` est `null` | "Pas de classement disponible" (pas une erreur) |
| Scorekeeper sans réseau | Continue en localStorage, sync au retour |

## Stratégie de migration

Chaque étape laisse l'app fonctionnelle (chaque commit = deployable).

### Étape 1 — Fondations
- `css/shared.css` (variables CSS + styles communs)
- `js/lib/supabase.js` (client singleton)
- `js/config.js` (gestion tournoi)
- Migration Supabase : `slug` + `config JSONB` sur `tournois`

### Étape 2 — Composants
- `js/components/app-header.js`
- `js/components/match-card.js`
- `js/lib/ui.js`

### Étape 3 — Migration page par page
1. **stats.html** — la plus isolée, valide le pattern
2. **classement.html** — teste le flux Sheets config-driven
3. **index.html** — la plus grosse, logique similaire à stats
4. **match.html** — la plus sensible (outil de terrain), migrée en dernier

### Étape 4 — Nettoyage
- Extraire `js/lib/sheets.js` et `js/lib/rseq.js`
- Supprimer tout hardcoding restant
- Vérifier que la config Supabase pilote tout
