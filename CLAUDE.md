# Aquilons - Tournoi CVS 2026

Application web de suivi en temps réel des scores de volleyball pour l'équipe Aquilons de Jean de Brébeuf (Benjamin D2) au Tournoi CVS 2026 à Alma.

## Architecture

Site statique (HTML/CSS/JS) hébergé sur GitHub Pages, connecté à Supabase pour la persistance et le realtime.

- **index.html** — Page spectateurs : résultats, bilan V/D/Sets, scores en direct via Supabase Realtime
- **horaire.html** — Horaire des 7 matchs avec lieux, terrains et liens Google Maps
- **match.html** — Scorekeeper (mobile) : compteur de points tactile qui sync vers Supabase
- **logo.jpg** — Logo officiel des Aquilons
- **supabase-setup.sql** — Schéma SQL de référence (déjà appliqué)

## Supabase

- **Projet :** `rtbmpcitrymeqzpjwneh`
- **URL :** `https://rtbmpcitrymeqzpjwneh.supabase.co`
- **Tables :** `tournois`, `matchs`, `points`
- **Realtime :** activé sur `matchs` et `points`
- **RLS :** lecture publique, écriture publique (anon key)
- **Tournoi ID :** `a0000000-0000-0000-0000-000000000001`

## Hébergement

- **GitHub Pages :** https://fosketer.github.io/aquilons-tournoi-2026/
- **Repo :** https://github.com/fosketer/aquilons-tournoi-2026

## Design

- Couleurs : bleu (#1A56B8) et argent (#A8A9AD) sur fond sombre (#0C1220)
- Fonts : Oswald (titres), Inter (corps)
- Mobile-first, optimisé pour le suivi en gymnase

## Tournoi

- **Dates :** 6-8 mars 2026, Alma
- **Format :** 2 sets de 25 points
- **7 matchs** le 7 mars (9h30 à 19h30)
- **3 lieux :** Centre Mario-Tremblay, École Jean-Gauthier, Camille-Lavoie

## Conventions

- Langue du code/UI : français
- Pas de framework JS, vanilla seulement
- La clé anon Supabase est dans le HTML (publique par design, protégée par RLS)
