# Aquilons - Tournoi CVS 2026

Application web de suivi en temps réel des scores de volleyball pour l'équipe Aquilons de Jean-de-Brébeuf (Benjamin Féminin) au Tournoi CVS 2026 à Alma.

## Architecture

Site statique (HTML/CSS/JS) hébergé sur GitHub Pages, connecté à Supabase pour la persistance et le realtime.

- **index.html** — Page résultats : scores en direct (Supabase Realtime), bilan V/D/Sets, scorekeeper intégré via `?score`, adresses et liens Maps
- **classement.html** — Classement des poules du tournoi (fetch Google Sheets CSV)
- **stats.html** — Stats de saison RSEQ : tableau des adversaires (Supabase) + classements régionaux live (API RSEQ S1) + QCA hardcodé
- **match.html** — Scorekeeper standalone (fallback, non lié dans la nav)
- **supabase-setup.sql** — Schéma SQL de référence (déjà appliqué)

## Supabase

- **URL :** `https://rtbmpcitrymeqzpjwneh.supabase.co`
- **Tables :** `tournois`, `matchs`, `adversaires`, `points`
- **Realtime :** activé sur `matchs` et `points`
- **RLS :** lecture publique, écriture publique (anon key)
- **Tournoi CVS ID :** `a0000000-0000-0000-0000-000000000001`
- **Tournoi QCA ID :** `a0000000-0000-0000-0000-000000000002`
- **Sélecteur :** toggle UI sous la nav, persisté localStorage + query param `?tournoi=`

### Table `matchs`
Colonnes clés : `numero`, `heure`, `adversaire`, `terrain`, `lieu_nom`, `lieu_adresse`, `lieu_maps_url`, `aq_set1`, `adv_set1`, `aq_set2`, `adv_set2`, `aq_score_courant`, `adv_score_courant`, `set_courant`, `statut`, `set1_debut`, `set1_fin`, `set2_debut`, `set2_fin`, `match_externe`

### Table `adversaires`
Colonnes clés : `nom_tournoi`, `nom_officiel`, `ecole`, `region_rseq`, `division`, `rang_regional`, `matchs_joues`, `sets_gagnes`, `sets_perdus`, `points_pour`, `points_contre`

## Hébergement

- **GitHub Pages :** https://fosketer.github.io/aquilons-tournoi-2026/
- **Repo :** https://github.com/fosketer/aquilons-tournoi-2026
- **Scorekeeper :** https://fosketer.github.io/aquilons-tournoi-2026/?score

## Design

- Couleurs : bleu (#1A56B8) et argent (#A8A9AD) sur fond sombre (#0C1220)
- Fonts : Oswald (titres), Inter (corps)
- Mobile-first, optimisé pour le suivi en gymnase

## Tournoi

- **Type :** Benjamin Féminin (tournoi civil hors-concours)
- **Organisateur :** Club de Volleyball Saguenay (CVS)
- **Dates :** 6-8 mars 2026, Alma
- **Format :** 2 sets de 25 points (pool le 7 mars, éliminations le 8 mars)
- **7 matchs** le 7 mars (9h30 à 19h30)
- **3 lieux :** Centre Mario-Tremblay, École Jean-Gauthier, Camille-Lavoie
- **Éliminations (8 mars)** : détectées automatiquement depuis Google Sheets brackets

## Google Sheets (tournoi)

- **Sheet ID :** `1TGb1tBMg2CB9lGfWd3uqxHAcxBW81zw4gSfdKCWH7A0`
- D2 Résultats : gid=927908034
- D1 Résultats : gid=290611892
- Élim D2 Tier 1 : gid=258735679
- Élim D2 Tier 2 : gid=1190283882

## Équipes adversaires

| Équipe | Région | Rang | École/Club |
|---|---|---|---|
| Aquilons | QCA | 3e section | Jean-de-Brébeuf |
| Tigres d'Amé | Est-du-Québec | 1er | Armand Saint-Onge (Amqui) |
| Husky JDN | Côte-Nord | 1er BF | JDN/Manikoutai (MED) |
| Husky KS | Côte-Nord | 3e Cadettes | JDN/Manikoutai (KS) |
| Bleu et Or | Saguenay | - | Club civil (Jonquière) |
| Express U14 | - | - | Club civil |
| Les Condors | - | - | Club civil |

## API RSEQ (diffusion.s1.rseq.ca)

- **API publique** (pas d'auth), utilisée par stats.html pour les classements régionaux live
- **Base :** `https://diffusion.s1.rseq.ca/api`
- **Endpoint principal :** `LeagueApi/GetLeagueDiffusion/?leagueId=X` — retourne classements, équipes, matchs
- **SchoolYear 2025-2026 :** `69056db0-aac8-49b0-8fc9-4091573205ea`
- **Sport Volleyball :** ID `16`
- **Régions :** 0=Abitibi, 1=Cantons, 2=Côte-Nord, 3=Est-du-Qc, 12=QCA, 13=Saguenay
- **Données :** `StandingsVolleyball` (points/tournoi) ou `Standings` (MJ/SG/SP/PP/PC)
- QCA et Cantons-de-l'Est n'ont pas de volleyball sur S1 → données hardcodées

## Conventions

- Langue du code/UI : français
- Pas de framework JS, vanilla seulement
- La clé anon Supabase est dans le HTML (publique par design, protégée par RLS)
- Navigation : 3 pages (Résultats, Classement, Stats)
