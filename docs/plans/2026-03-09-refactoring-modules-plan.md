# Refactoring Modules ES6 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor 4 monolithic HTML files (~4000 lines) into ES6 modules with shared CSS, web components, and Supabase-driven config.

**Architecture:** Extract inline JS/CSS into modular files (`js/lib/`, `js/components/`, `js/pages/`, `css/`). Config tournoi moves to Supabase JSONB. Web components for header/nav. Each HTML becomes a ~30-line shell.

**Tech Stack:** Vanilla JS (ES6 modules), Custom Elements, Supabase JS v2 (CDN), GitHub Pages (static, zero build)

**Design doc:** `docs/plans/2026-03-09-refactoring-modules-design.md`

---

## Task 1: Supabase Migration — slug + config JSONB

**Files:**
- Create: `migrations/001-add-tournoi-config.sql`

**Step 1: Write the migration SQL**

```sql
-- migrations/001-add-tournoi-config.sql
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE tournois ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Set slugs
UPDATE tournois SET slug = 'cvs' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE tournois SET slug = 'qca' WHERE id = 'a0000000-0000-0000-0000-000000000002';

-- CVS config
UPDATE tournois SET config = '{
  "detail": "Alma · 7 mars 2026 · 2 sets de 25 pts",
  "sheets": {
    "id": "1TGb1tBMg2CB9lGfWd3uqxHAcxBW81zw4gSfdKCWH7A0",
    "gids": {
      "d2_resultats": 927908034,
      "d1_resultats": 290611892,
      "elim_d2_tier1": 258735679,
      "elim_d2_tier2": 1190283882
    },
    "pools": [
      {"name": "Pool E", "ids": [41,42,43,44], "teams": ["Express U14 (MAU)", "Aquilon (QC)", "CVS U13 Jaune (SAG)", "Husky JDN (C-N)"]},
      {"name": "Pool F", "ids": [51,52,53,54], "teams": ["Patriotes (QC)", "Husky JPG (C-N)", "ESSOR U13 Noir (QC)", "Macareux (C-N)"]},
      {"name": "Pool G", "ids": [61,62,63,64], "teams": ["Phoenix Or (LAN)", "SELECT 4 (EDQ)", "Husky JSP (C-N)", "Athéltiques (QC)"]},
      {"name": "Pool H", "ids": [71,72,73,74], "teams": ["SELECT 3 (EDQ)", "CVS U13 Bleu (SAG)", "Noir et Or (C-N)", "Husky PG (C-N)"]},
      {"name": "Pool I", "ids": [81,82,83,84], "teams": ["CVS U13 Blanc (SAG)", "Impulsives (CHAR)", "Montagnards 2 (QC)", "Patriotes 2 (QC)"]}
    ],
    "columns": {"sg": 16, "sp": 17, "pp": 18, "pc": 19, "sgsp": 20, "pppc": 21, "rg": 22},
    "aquilon_name": "Aquilon (QC)",
    "elim_venues": {
      "5": {"nom": "Centre Mario-Tremblay", "url": "https://www.google.com/maps/place/605+Boulevard+Saint-Luc+O,+Alma,+QC"},
      "6": {"nom": "Centre Mario-Tremblay", "url": "https://www.google.com/maps/place/605+Boulevard+Saint-Luc+O,+Alma,+QC"},
      "7": {"nom": "Camille-Lavoie", "url": "https://www.google.com/maps/place/500+Avenue+des+M%C3%A9tiers,+Alma,+QC"},
      "8": {"nom": "Camille-Lavoie", "url": "https://www.google.com/maps/place/500+Avenue+des+M%C3%A9tiers,+Alma,+QC"}
    }
  },
  "rseq": {
    "highlights": ["Jean-de-Brébeuf 1", "Armand-Saint-Onge 1", "Armand Saint-Onge 1", "JDNManikoutai (MED)", "JDN/Manikoutai (MED)", "Odyssée 1"],
    "leagues": [
      {"id": "sag", "name": "Saguenay-Lac-Saint-Jean", "leagueId": "cad4071e-1e26-4c8d-ab45-7f72fd92fa43", "type": "volleyball"},
      {"id": "estqc-est", "name": "Est-du-Québec (Est)", "leagueId": "330427e7-9293-4467-92d5-71bc84505a21", "type": "standings"},
      {"id": "estqc-ouest", "name": "Est-du-Québec (Ouest)", "leagueId": "a7d24a40-66f9-473c-9956-d9dc2a462819", "type": "standings"},
      {"id": "cn-d3", "name": "Côte-Nord (D3)", "leagueId": "533891a0-5f82-4d54-b1fc-3815d1b6bed2", "type": "volleyball"},
      {"id": "cn-d4", "name": "Côte-Nord (D4)", "leagueId": "775bc7f1-352c-4f4e-8339-8f5e65e0598d", "type": "volleyball"}
    ]
  },
  "qca": {
    "sheets_url": "https://docs.google.com/spreadsheets/d/1J4ttjcJRPh2bift-6on67t3qp4Tyx_TxPrjJRF3t_3Q/export?format=csv",
    "columns": {"rang": 0, "equipe": 1, "t3": 4, "t4": 7, "t5": 10, "total": 11}
  },
  "team_map": [
    {"tournoi": "Aquilons", "search": "Jean-de-Brébeuf 1", "regionId": "qca"},
    {"tournoi": "Tigres d\u2019Amé", "search": "Armand-Saint-Onge 1", "regionId": "estqc-ouest"},
    {"tournoi": "Husky JDN", "search": "JDNManikoutai (MED)", "regionId": "cn-d3"},
    {"tournoi": "Husky KS", "search": "JDNManikoutai (KS)", "regionId": "cn-d4"},
    {"tournoi": "Bleu et Or", "search": "Odyssée 1", "regionId": "sag"}
  ]
}'::jsonb WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- QCA config
UPDATE tournois SET config = '{
  "detail": "Saint-Georges · 14 mars 2026 · 2 de 3 sets",
  "sheets": null,
  "rseq": {
    "highlights": ["Jean-de-Brébeuf 1"],
    "leagues": []
  },
  "qca": {
    "sheets_url": "https://docs.google.com/spreadsheets/d/1J4ttjcJRPh2bift-6on67t3qp4Tyx_TxPrjJRF3t_3Q/export?format=csv",
    "columns": {"rang": 0, "equipe": 1, "t3": 4, "t4": 7, "t5": 10, "total": 11}
  },
  "team_map": [
    {"tournoi": "Aquilons", "search": "Jean-de-Brébeuf 1", "regionId": "qca"}
  ]
}'::jsonb WHERE id = 'a0000000-0000-0000-0000-000000000002';
```

**Step 2: Apply migration via Supabase MCP**

Run the SQL using `mcp__supabase__execute_sql`.

**Step 3: Verify migration**

Run: `SELECT id, nom, slug, config->'sheets'->'id' as sheet_id FROM tournois;`
Expected: 2 rows, both with slug set and config populated.

**Step 4: Commit**

```bash
git add migrations/001-add-tournoi-config.sql
git commit -m "feat: add slug and config JSONB to tournois table"
```

---

## Task 2: Create shared CSS

**Files:**
- Create: `css/shared.css`

**Step 1: Extract common CSS variables and base styles**

Extract the `:root` variables, reset, body, header, nav, tournoi-selector, footer, loading/error styles from all 4 HTML files into `css/shared.css`. This is the union of all shared styles.

Source files to read for extraction:
- `index.html:7-848` (CSS block)
- `stats.html:7-300` (CSS block)
- `classement.html:8-96` (CSS block)
- `match.html:7-516` (CSS block)

The shared CSS must include:
- `:root` variables (union of all files, including `--gold` from stats.html)
- `*` reset, `body` base
- `.header` and related (`.header-logo`, `.team-name`, `.team-sub`, `.tournament-info`)
- `.nav` and `.nav a` styles
- `.tournoi-selector` and `.tournoi-btn` styles
- `.content` container
- `.section-title` styling
- `.footer` styling
- New: `.loading`, `.error-banner`, `.empty-state` utility classes

**Step 2: Verify by loading shared.css in browser**

Open `css/shared.css` directly to check for syntax errors (browser dev tools → Sources).

**Step 3: Commit**

```bash
git add css/shared.css
git commit -m "feat: extract shared CSS variables and base styles"
```

---

## Task 3: Create js/lib/supabase.js — Client singleton

**Files:**
- Create: `js/lib/supabase.js`

**Step 1: Write the module**

```js
// js/lib/supabase.js
const SUPABASE_URL = 'https://rtbmpcitrymeqzpjwneh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Ym1wY2l0cnltZXF6cGp3bmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDgyOTEsImV4cCI6MjA4ODQyNDI5MX0.6qvaCDLDiCX4KZLJHK1_JiPHROoCtiiEQjsBJbS4CiU';

let client = null;

export function getClient() {
    if (!client) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return client;
}

export async function fetchRows(table, filters = {}, options = {}) {
    let query = getClient().from(table).select(options.select || '*');
    for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
    }
    if (options.order) query = query.order(options.order, { ascending: options.ascending ?? true });
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export function subscribe(channel, table, callback) {
    return getClient()
        .channel(channel)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();
}

export function removeAllChannels() {
    getClient().removeAllChannels();
}
```

**Step 2: Commit**

```bash
git add js/lib/supabase.js
git commit -m "feat: add Supabase client singleton module"
```

---

## Task 4: Create js/config.js — Tournament config

**Files:**
- Create: `js/config.js`

**Step 1: Write the module**

```js
// js/config.js
import { getClient } from './lib/supabase.js';

let cache = {};

export async function getTournoiConfig(slug) {
    if (cache[slug]) return cache[slug];
    const { data, error } = await getClient()
        .from('tournois').select('*').eq('slug', slug).single();
    if (error) throw error;
    cache[slug] = data;
    return data;
}

export async function listTournois() {
    if (cache._list) return cache._list;
    const { data, error } = await getClient()
        .from('tournois').select('id,nom,slug,equipe,config').order('nom');
    if (error) throw error;
    cache._list = data;
    return data;
}

export function getTournoiActif() {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('tournoi');
    if (p) return p;
    return localStorage.getItem('tournoi') || 'cvs';
}

export function setTournoiActif(slug) {
    localStorage.setItem('tournoi', slug);
    const url = new URL(window.location);
    url.searchParams.set('tournoi', slug);
    history.replaceState(null, '', url);
}
```

**Step 2: Commit**

```bash
git add js/config.js
git commit -m "feat: add tournament config module with Supabase fetch"
```

---

## Task 5: Create js/lib/ui.js — UI helpers

**Files:**
- Create: `js/lib/ui.js`

**Step 1: Write the module**

```js
// js/lib/ui.js
export function showLoading(container) {
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Chargement\u2026</div>';
}

export function showError(container, message, onRetry) {
    container.innerHTML = '<div class="error-banner">' +
        '<div>' + message + '</div>' +
        (onRetry ? '<button class="retry-btn">Réessayer</button>' : '') +
        '</div>';
    if (onRetry) {
        container.querySelector('.retry-btn').addEventListener('click', onRetry);
    }
}

export function showEmpty(container, message) {
    container.innerHTML = '<div class="empty-state">' + message + '</div>';
}
```

**Step 2: Commit**

```bash
git add js/lib/ui.js
git commit -m "feat: add UI helper module (loading, error, empty states)"
```

---

## Task 6: Create js/lib/sheets.js — Google Sheets CSV

**Files:**
- Create: `js/lib/sheets.js`

**Step 1: Write the module**

Extract `parseCSV()` and `fetchSheet()` from `classement.html:209-476`. The classement.html version has the proper CSV parser (character-by-character with quote handling). The index.html version is simpler and less correct — use the classement.html one.

```js
// js/lib/sheets.js
export function parseCSV(text) {
    var lines = [], row = [], field = '', inQuote = false;
    for (var i = 0; i < text.length; i++) {
        var c = text[i];
        if (c === '"') {
            if (inQuote && i + 1 < text.length && text[i + 1] === '"') { field += '"'; i++; }
            else { inQuote = !inQuote; }
        } else if (c === ',' && !inQuote) {
            row.push(field); field = '';
        } else if (c === '\n' && !inQuote) {
            row.push(field); lines.push(row); row = []; field = '';
        } else if (c !== '\r') {
            field += c;
        }
    }
    if (field || row.length) { row.push(field); lines.push(row); }
    return lines;
}

export async function fetchSheet(sheetId, gid) {
    var url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:csv&gid=' + gid;
    var res = await fetch(url);
    if (!res.ok) throw new Error('Sheets fetch failed: ' + res.status);
    var text = await res.text();
    return parseCSV(text);
}

export async function fetchCSV(url) {
    var res = await fetch(url);
    if (!res.ok) throw new Error('CSV fetch failed: ' + res.status);
    return res.text();
}
```

**Step 2: Commit**

```bash
git add js/lib/sheets.js
git commit -m "feat: add Google Sheets CSV fetch/parse module"
```

---

## Task 7: Create js/lib/rseq.js — RSEQ API

**Files:**
- Create: `js/lib/rseq.js`

**Step 1: Write the module**

Extract from `stats.html:460-516` (fetchLeagueDiffusion + buildRegionFromAPI).

```js
// js/lib/rseq.js
var RSEQ_BASE = 'https://diffusion.s1.rseq.ca/api';

export async function fetchLeague(leagueId) {
    var res = await fetch(RSEQ_BASE + '/LeagueApi/GetLeagueDiffusion/?leagueId=' + leagueId);
    if (!res.ok) throw new Error('RSEQ fetch failed: ' + res.status);
    return res.json();
}

export function buildRegion(cfg, data) {
    var region = {
        id: cfg.id,
        name: cfg.name,
        cols: [],
        teams: [],
        info: ''
    };

    var catName = data.CategoryName || '';
    var sexName = data.SexTypeName || '';
    var divName = data.DivisionName || '';
    region.info = [catName, sexName, divName].filter(Boolean).join(' ');
    region.source = { name: 'RSEQ S1', url: 'https://diffusion.s1.rseq.ca/' };

    if (cfg.type === 'volleyball' && data.StandingsVolleyball && data.StandingsVolleyball.length > 0) {
        var showT = [];
        var first = data.StandingsVolleyball[0];
        for (var i = 1; i <= 12; i++) {
            if (first['ShowTournament' + i]) showT.push(i);
        }
        region.cols = ['#', '\u00c9quipe'];
        showT.forEach(function(t) { region.cols.push('T' + t); });
        region.cols.push('Total');

        data.StandingsVolleyball.forEach(function(s) {
            var row = [s.PositionFormatted, s.TeamName];
            showT.forEach(function(t) {
                row.push(s['Tournament' + t + 'Formatted'] || '-');
            });
            row.push(s.TotalPointsFormatted || '-');
            region.teams.push(row);
        });
    } else if (data.Standings && data.Standings.length > 0) {
        region.cols = ['#', '\u00c9quipe', 'MJ', 'SG', 'SP', 'PP', 'PC'];
        data.Standings.forEach(function(s) {
            region.teams.push([
                s.PositionFormatted,
                s.TeamName,
                s.GamesPlayed,
                s.SetWins,
                s.SetLosses,
                s.PointsFor,
                s.PointsAgaints
            ]);
        });
    }
    return region;
}
```

**Step 2: Commit**

```bash
git add js/lib/rseq.js
git commit -m "feat: add RSEQ API module"
```

---

## Task 8: Create js/components/app-header.js — Web Component

**Files:**
- Create: `js/components/app-header.js`

**Step 1: Write the web component**

The component takes a `page` attribute and renders header + nav + tournoi selector. It exposes a `renderSelector(tournois, actif, onSwitch)` method.

Reference the existing header/nav HTML from all 4 files. The component must handle:
- Logo + team name + subtitle (from current page's header)
- Nav with 3 links (Résultats, Classement, Stats) — active state from `page` attr
- Tournament selector (rendered after `renderSelector()` is called)

Important: index.html has a larger header (with `.tournament-info` block) and match.html has a simpler header. The component should be flexible:
- `page="resultats"` → full header with tournament info
- `page="classement"` / `page="stats"` → compact header
- `page="scorekeeper"` → minimal header (match.html style)

Read the header HTML from each file to build the union.

**Step 2: Verify**

Create a minimal test HTML that loads the component and checks it renders correctly.

**Step 3: Commit**

```bash
git add js/components/app-header.js
git commit -m "feat: add app-header web component"
```

---

## Task 9: Create js/components/match-card.js — Web Component

**Files:**
- Create: `js/components/match-card.js`

**Step 1: Write the web component**

Extract the match card rendering logic from `index.html:1133-1207` (`renderMatchs()` function). The component:
- Receives a match object via `.match` property setter
- Receives an adversaires map via `.adversaires` property setter
- Renders the match card HTML (header with time/badge, teams with scores, location with Maps link)

```js
// js/components/match-card.js
class MatchCard extends HTMLElement {
    set data({ match, adversaires }) {
        this._match = match;
        this._adversaires = adversaires || {};
        this.render();
    }

    render() {
        const m = this._match;
        if (!m) return;
        // ... extract renderMatchs() single-card logic from index.html:1146-1207
    }
}
customElements.define('match-card', MatchCard);
```

Copy the exact rendering logic from `index.html` `renderMatchs()`, including:
- Status mapping (win/loss/draw/live/upcoming)
- `scoreCell()` helper
- `advInfoHtml()` / `advStatsHtml()` (from adversaires map)
- Location with Maps link
- Live score display

**Step 2: Commit**

```bash
git add js/components/match-card.js
git commit -m "feat: add match-card web component"
```

---

## Task 10: Migrate stats.html

**Files:**
- Create: `js/pages/stats.js`
- Modify: `stats.html` (reduce to shell)

**Step 1: Create js/pages/stats.js**

Move all JS from `stats.html:302-682` into this module. Refactor to:
- Import `getClient, fetchRows` from `../lib/supabase.js`
- Import `getTournoiActif, getTournoiConfig, setTournoiActif, listTournois` from `../config.js`
- Import `fetchLeague, buildRegion` from `../lib/rseq.js`
- Import `fetchCSV` from `../lib/sheets.js`
- Import `showLoading, showError` from `../lib/ui.js`
- Import `../components/app-header.js`

Replace all hardcoded config with `config.rseq`, `config.qca`, `config.team_map` from `getTournoiConfig()`.

The `STATS_CONFIG` object currently in stats.html maps to `config.rseq.highlights`, `config.rseq.leagues`, `config.team_map`.

Key refactoring:
- `loadTourneyTeams()` → uses `fetchRows('adversaires', { tournoi_id: config.id })`
- `fetchQCAStandings()` → uses `config.qca.sheets_url` and `config.qca.columns`
- `getRSEQLeagues()` → uses `config.rseq.leagues`
- `isHighlighted()` → uses `config.rseq.highlights`
- `switchTournoi()` → uses `setTournoiActif()` + re-runs `init()`
- Add cleanup function to clear regions and intervals on tournoi switch

Follow the page pattern from design doc:
```js
import { getTournoiActif, getTournoiConfig, setTournoiActif, listTournois } from '../config.js';
import '../components/app-header.js';
// ... other imports

const app = document.getElementById('app');
let cleanup = null;

async function init(slug) {
    if (cleanup) cleanup();
    // showLoading, fetch config, fetch data, render, setup cleanup
}

// Setup header
const header = document.querySelector('app-header');
const tournois = await listTournois();
header.renderSelector(tournois, getTournoiActif(), (slug) => {
    setTournoiActif(slug);
    init(slug);
});

init(getTournoiActif());
```

**Step 2: Reduce stats.html to shell**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stats saison — Aquilons</title>
    <link rel="stylesheet" href="css/shared.css">
    <link rel="stylesheet" href="css/stats.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <app-header page="stats"></app-header>
    <main id="app"></main>
    <script type="module" src="js/pages/stats.js"></script>
</body>
</html>
```

Note: Page-specific CSS (region tabs, stat tables, etc.) goes in `css/stats.css`. Extract from current `stats.html:7-300`, keeping only styles NOT already in `shared.css`.

**Step 3: Test in browser**

Open `stats.html` in browser. Verify:
- Header renders with logo, nav (Stats active), tournament selector
- Tournament teams table loads from Supabase
- Regional tabs load from RSEQ API
- QCA tab loads from Google Sheets
- Switching tournament reloads all data
- Rank summary shows correctly

**Step 4: Commit**

```bash
git add js/pages/stats.js css/stats.css stats.html
git commit -m "feat: migrate stats.html to ES6 module"
```

---

## Task 11: Migrate classement.html

**Files:**
- Create: `js/pages/classement.js`
- Create: `css/classement.css`
- Modify: `classement.html` (reduce to shell)

**Step 1: Create js/pages/classement.js**

Move all JS from `classement.html:130-505` into this module. Refactor to:
- Import config, supabase, sheets, ui modules
- Import `../components/app-header.js`
- Replace hardcoded `SHEET_ID`, `GID_D2`, `POOLS_D2`, `AQUILON_NAME` with values from `config.sheets`
- Replace hardcoded column indexes (`SG=16`, etc.) with `config.sheets.columns`

Key functions to migrate (all from classement.html):
- `parsePoolData(rows, pools)` — use `config.sheets.columns` instead of hardcoded `SG=16, SP=17...`
- `parseMatchGrid(rows, pool)` — no changes needed (already takes pool as param)
- `computeCrossRanking(poolData)` — no changes
- `renderPools()`, `renderCrossRanking()`, `renderProjection()` — no changes, just moved
- `fetchAll()` — use `fetchSheet(config.sheets.id, config.sheets.gids.d2_resultats)`
- Guard: if `config.sheets` is null, show `showEmpty(app, 'Classement non disponible pour ce tournoi')`

**Step 2: Extract page-specific CSS to css/classement.css**

Pool cards, pool tables, match list, cross-ranking, projection, bracket links — all from `classement.html:56-96`.

**Step 3: Reduce classement.html to shell**

Same pattern as stats.html shell.

**Step 4: Test in browser**

- Pools render with standings and match results
- Cross-ranking computes correctly
- Projection shows Aquilons seed
- Auto-refresh every 2 minutes
- Switching to QCA shows "Classement non disponible"

**Step 5: Commit**

```bash
git add js/pages/classement.js css/classement.css classement.html
git commit -m "feat: migrate classement.html to ES6 module"
```

---

## Task 12: Migrate index.html (résultats + scorekeeper intégré)

**Files:**
- Create: `js/pages/resultats.js`
- Create: `css/resultats.css`
- Modify: `index.html` (reduce to shell)

This is the largest migration. index.html contains:
1. Match list (spectator view) — ~200 lines JS
2. Live scoreboard widget — ~70 lines JS
3. Integrated scorekeeper — ~300 lines JS
4. Bracket scanner (Day 2 elim detection) — ~150 lines JS
5. Realtime subscription — ~15 lines JS
6. Tournament switching — ~50 lines JS

**Step 1: Create js/pages/resultats.js**

Import all shared modules. Migrate all JS from `index.html:956-1863`.

Key refactoring:
- `loadAdversaires()` → `fetchRows('adversaires', { tournoi_id: config.id })`
- `loadMatchs()` → `fetchRows('matchs', { tournoi_id: config.id }, { order: 'numero' })`
- Match dropdown (for scorekeeper) → built dynamically from `loadMatchs()` result (already done in `buildMatchDropdown()`)
- Bracket scanner → use `config.sheets.id`, `config.sheets.gids.elim_d2_tier1/tier2`, `config.sheets.elim_venues`
- Guard bracket scanner: only run if `config.sheets` is not null
- Realtime: use `subscribe()` from supabase.js, store unsubscribe for cleanup
- Use `<match-card>` component for rendering match list

Scorekeeper state (`sk` object) stays local to this module. The scorekeeper is toggled via `?score` query param or button.

The `switchTournoi()` logic:
- Call `setTournoiActif(slug)`
- Run `cleanup()` (unsubscribe realtime, clear intervals)
- Run `init(slug)` (re-fetch everything)

**Step 2: Extract page-specific CSS to css/resultats.css**

Major sections from `index.html:7-848`:
- `.bilan` styles (W/D/L record)
- `.match-card` styles (card layout, scores, location)
- `.scoreboard-card` (live scoreboard widget)
- `.scorekeeper` / `.sk-*` styles (integrated scorekeeper panel)
- `.match-location`, `.adv-stats`, `.team-info`

**Step 3: Reduce index.html to shell**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Aquilons — Résultats</title>
    <link rel="stylesheet" href="css/shared.css">
    <link rel="stylesheet" href="css/resultats.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <app-header page="resultats"></app-header>
    <main id="app"></main>
    <script type="module" src="js/pages/resultats.js"></script>
</body>
</html>
```

Note: The `<main id="app">` will be populated by `resultats.js` with the bilan, scoreboard, match list, and scorekeeper panel. All the HTML structure currently in index.html body (bilan, matchsContainer, scorekeeper, etc.) will be generated by JS.

**Step 4: Test in browser**

- Matches load and display correctly
- Bilan (W/D/L/Sets) calculates correctly
- Live scoreboard shows current/next match
- Scorekeeper opens via `?score` param
- Scorekeeper syncs to Supabase (add/minus points, set tracking)
- Bracket scanner detects elimination matches (if CVS)
- Realtime updates work (change a match in Supabase, card updates)
- Tournament switch works (CVS ↔ QCA)

**Step 5: Commit**

```bash
git add js/pages/resultats.js css/resultats.css index.html
git commit -m "feat: migrate index.html to ES6 module"
```

---

## Task 13: Migrate match.html (standalone scorekeeper)

**Files:**
- Create: `js/pages/scorekeeper.js`
- Create: `css/scorekeeper.css`
- Modify: `match.html` (reduce to shell)

**Step 1: Create js/pages/scorekeeper.js**

Move all JS from `match.html:601-985`. Refactor to:
- Import shared modules
- **Dynamic match dropdown**: Replace the hardcoded `<option>` list with a fetch from `fetchRows('matchs', { tournoi_id: config.id }, { order: 'numero' })`. Filter out matches with status 'win'/'loss'/'draw'.
- `selectMatch()` → works with dynamically generated options
- All other scorekeeper logic (addPoint, minus, resetSet, checkSetEnd, etc.) stays the same
- `syncToSupabase()` uses imported `getClient()`
- localStorage key scoped to tournament: `'aquilons-match-state-' + slug`

Note: match.html currently uses a simpler 2-set format (index.html's scorekeeper does best-of-3). Keep the standalone scorekeeper as best-of-2 (25 points, same as current match.html logic).

**Step 2: Extract CSS to css/scorekeeper.css**

All match.html-specific styles: scoreboard, minus buttons, controls, set indicators, point log, etc.

**Step 3: Reduce match.html to shell**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Match en cours — Aquilons</title>
    <link rel="stylesheet" href="css/shared.css">
    <link rel="stylesheet" href="css/scorekeeper.css">
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <app-header page="scorekeeper"></app-header>
    <main id="app"></main>
    <script type="module" src="js/pages/scorekeeper.js"></script>
</body>
</html>
```

**Step 4: Test in browser**

- Match dropdown populated from Supabase (no more hardcoded options)
- Select a match → scorekeeper activates
- Point entry works (tap to score)
- Minus button removes last point
- Set transition at 25 pts (2pt gap)
- Match result shows after 2 sets
- Sync to Supabase works
- State persists in localStorage across page reload

**Step 5: Commit**

```bash
git add js/pages/scorekeeper.js css/scorekeeper.css match.html
git commit -m "feat: migrate match.html to ES6 module with dynamic match list"
```

---

## Task 14: Final cleanup and verification

**Files:**
- Modify: `CLAUDE.md` (update architecture section)

**Step 1: Verify all pages work**

Open each page in browser and test:
1. `index.html` — matches, bilan, realtime, scorekeeper via `?score`, bracket scanner
2. `classement.html` — pools, cross-ranking, projection, auto-refresh
3. `stats.html` — tourney teams, regional tabs, rank summary
4. `match.html` — dynamic dropdown, scoring, sync

**Step 2: Verify tournament switching on each page**

On each page, switch CVS ↔ QCA and verify data reloads correctly.

**Step 3: Verify no hardcoded config remains in page modules**

Search for hardcoded values that should come from config:
- Sheet IDs
- RSEQ league IDs
- Tournament UUIDs
- Pool structures
- Column indexes

Run: Grep for the old hardcoded Sheet ID `1TGb1tBMg2CB9lGfWd3uqxHAcxBW81zw4gSfdKCWH7A0` in `js/` directory — should only appear in data returned from Supabase, not hardcoded.

**Step 4: Update CLAUDE.md**

Update the Architecture section to reflect the new file structure:
- List new directories (`js/lib/`, `js/components/`, `js/pages/`, `css/`)
- Note that config is now in Supabase JSONB
- Remove references to inline JS

**Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for modular architecture"
```

---

## File structure after completion

```
aquilons-tournoi-2026/
├── index.html              # ~20 lines (shell)
├── classement.html         # ~20 lines (shell)
├── stats.html              # ~20 lines (shell)
├── match.html              # ~20 lines (shell)
├── css/
│   ├── shared.css          # Variables, reset, header, nav, tournoi-selector, footer
│   ├── resultats.css       # Match cards, bilan, scoreboard, scorekeeper panel
│   ├── classement.css      # Pool cards, tables, cross-ranking, projection
│   ├── stats.css           # Region tabs, stat tables, rank summary
│   └── scorekeeper.css     # Standalone scorekeeper styles
├── js/
│   ├── lib/
│   │   ├── supabase.js     # Client singleton + fetchRows + subscribe
│   │   ├── sheets.js       # parseCSV + fetchSheet + fetchCSV
│   │   ├── rseq.js         # fetchLeague + buildRegion
│   │   └── ui.js           # showLoading + showError + showEmpty
│   ├── components/
│   │   ├── app-header.js   # <app-header> web component
│   │   └── match-card.js   # <match-card> web component
│   ├── config.js           # getTournoiConfig + listTournois + actif helpers
│   └── pages/
│       ├── resultats.js    # index.html logic (matches, scorekeeper, brackets, realtime)
│       ├── classement.js   # classement.html logic (pools, cross-ranking, projection)
│       ├── stats.js        # stats.html logic (tourney teams, RSEQ regions, rank summary)
│       └── scorekeeper.js  # match.html logic (standalone scorekeeper)
├── migrations/
│   └── 001-add-tournoi-config.sql
├── docs/plans/
│   ├── 2026-03-09-refactoring-modules-design.md
│   └── 2026-03-09-refactoring-modules-plan.md
├── supabase-setup.sql
├── logo.jpg
└── CLAUDE.md
```

## Dependencies between tasks

```
Task 1 (Supabase migration) ─── no deps, can start immediately
Task 2 (shared.css)         ─── no deps, can start immediately
Task 3 (supabase.js)        ─── no deps, can start immediately
Task 4 (config.js)          ─── depends on Task 1 (slug column) + Task 3 (getClient)
Task 5 (ui.js)              ─── depends on Task 2 (CSS classes)
Task 6 (sheets.js)          ─── no deps
Task 7 (rseq.js)            ─── no deps
Task 8 (app-header.js)      ─── depends on Task 2 (shared CSS)
Task 9 (match-card.js)      ─── depends on Task 2 (shared CSS)
Task 10 (stats.html)        ─── depends on Tasks 2-8
Task 11 (classement.html)   ─── depends on Tasks 2-6, 8
Task 12 (index.html)        ─── depends on Tasks 2-9
Task 13 (match.html)        ─── depends on Tasks 2-5, 8
Task 14 (cleanup)           ─── depends on Tasks 10-13
```

**Parallelizable waves:**
- Wave 1: Tasks 1, 2, 3, 6, 7 (all independent)
- Wave 2: Tasks 4, 5, 8, 9 (depend on Wave 1)
- Wave 3: Tasks 10, 11, 13 (depend on Wave 2, independent of each other)
- Wave 4: Task 12 (depends on Task 9 match-card)
- Wave 5: Task 14 (final verification)
