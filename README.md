# Aquilons — Suivi de tournoi volleyball

Application web de suivi en temps réel des scores de volleyball pour l'équipe **Aquilons** de Jean-de-Brébeuf (Benjamin Féminin).

**Site :** https://fosketer.github.io/aquilons-tournoi-2026/

## Fonctionnalités

### Résultats en direct (`index.html`)
- Scores mis à jour en temps réel via Supabase Realtime
- Cartes de match avec sets, scores live, statut (à venir / en cours / terminé)
- Bilan victoires/défaites et ratio de sets
- Adresses des lieux avec liens Google Maps
- Scorekeeper intégré accessible via `?score` — permet de marquer les points en direct depuis le gymnase
- Scanner de brackets d'élimination (Google Sheets)

### Classement des poules (`classement.html`)
- Classement en temps réel importé depuis Google Sheets (CSV)
- Structure de poules configurable par tournoi
- Rafraîchissement automatique toutes les 2 minutes
- Disponible uniquement pour les tournois avec données Sheets

### Statistiques de saison (`stats.html`)
- Tableau des équipes adversaires (données Supabase)
- Classements régionaux RSEQ en direct (API S1)
- Classement QCA via Google Sheets
- Rang régional comparatif des équipes du tournoi

### Scorekeeper standalone (`match.html`)
- Interface tactile pour marquer les points pendant un match
- Format best-of-2 (25 points, écart de 2)
- Sauvegarde locale (localStorage) et synchronisation Supabase
- Sélection de match dynamique depuis la base de données

## Architecture

Site statique (HTML/CSS/JS natif) hébergé sur **GitHub Pages**, sans bundler ni framework.

```
aquilons-tournoi-2026/
├── index.html              # Résultats (shell HTML)
├── classement.html         # Classement (shell HTML)
├── stats.html              # Stats (shell HTML)
├── match.html              # Scorekeeper (shell HTML)
├── css/
│   ├── shared.css          # Variables, reset, header, nav, composants communs
│   ├── resultats.css       # Styles spécifiques résultats
│   ├── classement.css      # Styles spécifiques classement
│   ├── stats.css           # Styles spécifiques stats
│   └── scorekeeper.css     # Styles spécifiques scorekeeper
├── js/
│   ├── config.js           # Config tournoi (fetch Supabase, cache, sélecteur actif)
│   ├── lib/
│   │   ├── supabase.js     # Client Supabase singleton, helpers fetch/subscribe
│   │   ├── sheets.js       # Fetch et parsing CSV Google Sheets
│   │   ├── rseq.js         # API RSEQ S1 (classements régionaux)
│   │   └── ui.js           # Helpers UI (loading, erreur, escapeHTML)
│   ├── components/
│   │   ├── app-header.js   # <app-header> — en-tête, navigation, sélecteur de tournoi
│   │   └── match-card.js   # <match-card> — carte de match avec scores
│   └── pages/
│       ├── resultats.js    # Logique page résultats + realtime + brackets
│       ├── classement.js   # Logique page classement (pools Google Sheets)
│       ├── stats.js        # Logique page stats (RSEQ + QCA + adversaires)
│       └── scorekeeper.js  # Logique scorekeeper (points, sets, sync)
└── migrations/
    └── 001-add-tournoi-config.sql  # Migration Supabase (slug + config JSONB)
```

## Stack technique

| Composant | Technologie |
|---|---|
| Frontend | HTML / CSS / JS vanilla (ES6 modules) |
| Base de données | Supabase (PostgreSQL) |
| Temps réel | Supabase Realtime (postgres_changes) |
| Classements | Google Sheets (export CSV) |
| Stats régionales | API RSEQ S1 (`diffusion.s1.rseq.ca`) |
| Hébergement | GitHub Pages |
| Web Components | Custom Elements (`<app-header>`, `<match-card>`) |

## Configuration multi-tournoi

L'application supporte plusieurs tournois via un sélecteur dans l'en-tête. Toute la configuration est stockée dans la colonne `config` (JSONB) de la table `tournois` dans Supabase :

- **Sheets** — IDs Google Sheets, GIDs des onglets, structure des poules
- **RSEQ** — IDs de ligues pour les classements régionaux, équipes à mettre en évidence
- **QCA** — URL du CSV, index des colonnes
- **Team map** — correspondance entre noms de tournoi et noms RSEQ pour le rang comparatif

Ajouter un nouveau tournoi = insérer une ligne dans `tournois` avec le bon `config` JSONB. Aucun changement de code requis.

## Base de données Supabase

### Tables principales

- **`tournois`** — Liste des tournois (`id`, `nom`, `slug`, `config`)
- **`matchs`** — Matchs avec scores par set, statut, lieu, horaire
- **`adversaires`** — Équipes adversaires avec stats (région, rang, sets, points)
- **`points`** — Historique point par point pour le scorekeeper

### Realtime

Les tables `matchs` et `points` ont le Realtime activé. La page résultats s'abonne aux changements et met à jour l'affichage instantanément.

### Sécurité

- RLS activé : lecture publique, écriture publique (clé anon)
- La clé anon est dans le HTML (par design — protégée par les policies RLS)

## Développement

Aucune installation requise. Ouvrir les fichiers HTML directement ou servir avec :

```bash
python3 -m http.server 8000
```

Le push sur `main` déploie automatiquement via GitHub Pages.

## Design

- **Couleurs** : bleu Aquilons (`#1A56B8`), argent (`#A8A9AD`), fond sombre (`#0C1220`)
- **Fonts** : Oswald (titres), Inter (corps)
- **Mobile-first** : optimisé pour consultation sur téléphone en gymnase
