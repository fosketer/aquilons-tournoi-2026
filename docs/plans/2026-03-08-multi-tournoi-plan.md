# Multi-Tournoi Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a tournament selector (CVS Alma / Régional QCA) that switches all data across pages without reload.

**Architecture:** Add a `TOURNOIS` config object and a `getTournoiActif()` function. A pill-style toggle under the nav persists selection to `localStorage` and `?tournoi=` query param. All Supabase queries already filter by `tournoi_id` — we make that variable dynamic. Realtime subscriptions are re-established on switch.

**Tech Stack:** Vanilla JS, Supabase JS v2, HTML/CSS (no frameworks)

**Important:** stats.html currently uses a DIFFERENT Supabase project (`lmbjnbnnaogpoefiywgq`). It must be switched to the same project as index.html (`rtbmpcitrymeqzpjwneh`) for multi-tournament to work consistently.

---

### Task 1: Create tournament in Supabase

**Step 1: Insert new tournament row**

Run SQL via Supabase MCP:
```sql
INSERT INTO tournois (id, nom, equipe, lieu, date_debut, date_fin, actif)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Régional RSEQ QCA 2026',
  'Aquilons',
  'TBD',
  '2026-03-14',
  '2026-03-14',
  true
);
```

**Step 2: Verify insertion**
```sql
SELECT * FROM tournois;
```
Expected: 2 rows (CVS + QCA)

---

### Task 2: Fix stats.html Supabase project mismatch

stats.html currently points to a different Supabase project. Fix it to use the same one as index.html.

**Files:**
- Modify: `stats.html:267-270`

**Step 1: Update Supabase credentials in stats.html**

Replace lines 267-270:
```js
var SUPABASE_URL = 'https://lmbjnbnnaogpoefiywgq.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYmpuYm5uYW9ncG9lZml5d2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMTAyNDEsImV4cCI6MjA1Njg4NjI0MX0.KlJHjKLsLpMHb3MjfC2xzVqMwvaFjYhbKVjR2mUXGQA';
```
With:
```js
var SUPABASE_URL = 'https://rtbmpcitrymeqzpjwneh.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Ym1wY2l0cnltZXF6cGp3bmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDgyOTEsImV4cCI6MjA4ODQyNDI5MX0.6qvaCDLDiCX4KZLJHK1_JiPHROoCtiiEQjsBJbS4CiU';
```

**Step 2: Verify the adversaires table exists in rtbmpcitrymeqzpjwneh**

Run SQL via MCP:
```sql
SELECT count(*) FROM adversaires WHERE tournoi_id = 'a0000000-0000-0000-0000-000000000001';
```

**Step 3: Commit**
```
fix: align stats.html to same Supabase project as index.html
```

---

### Task 3: Add tournament selector UI + logic to index.html

**Files:**
- Modify: `index.html`

**Step 1: Add TOURNOIS config and selector logic after SUPABASE INIT (line 924)**

Replace:
```js
var TOURNOI_ID = 'a0000000-0000-0000-0000-000000000001';
```
With:
```js
var TOURNOIS = {
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

function getTournoiActif() {
    var params = new URLSearchParams(window.location.search);
    var p = params.get('tournoi');
    if (p && TOURNOIS[p]) return p;
    var stored = localStorage.getItem('tournoi');
    if (stored && TOURNOIS[stored]) return stored;
    return 'cvs';
}

var tournoiActif = getTournoiActif();
var TOURNOI_ID = TOURNOIS[tournoiActif].id;
localStorage.setItem('tournoi', tournoiActif);
```

**Step 2: Add tournament selector HTML**

After the `<div class="nav">...</div>` block (after line 833), add:
```html
<div class="tournoi-selector" id="tournoiSelector">
    <button class="tournoi-btn" data-tournoi="cvs" onclick="switchTournoi('cvs')">CVS Alma</button>
    <button class="tournoi-btn" data-tournoi="qca" onclick="switchTournoi('qca')">Régional QCA</button>
</div>
```

**Step 3: Add CSS for the selector**

After the `.nav a.active` rule (~line 133), add:
```css
.tournoi-selector {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: var(--bg-light);
    border-bottom: 1px solid rgba(26,86,184,0.2);
}

.tournoi-btn {
    font-family: 'Oswald', sans-serif;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.4rem 1.2rem;
    border-radius: 20px;
    border: 1px solid rgba(26,86,184,0.3);
    background: transparent;
    color: var(--silver-dark);
    cursor: pointer;
    transition: all 0.2s;
}

.tournoi-btn:hover {
    color: var(--silver-light);
    border-color: rgba(26,86,184,0.5);
}

.tournoi-btn.active {
    background: var(--blue);
    color: var(--white);
    border-color: var(--blue);
}
```

**Step 4: Add switchTournoi function and realtime re-subscription**

Add in the JS section (before the INIT block at line 1718):
```js
function switchTournoi(slug) {
    if (slug === tournoiActif) return;
    tournoiActif = slug;
    TOURNOI_ID = TOURNOIS[slug].id;
    localStorage.setItem('tournoi', slug);

    // Update URL without reload
    var url = new URL(window.location);
    url.searchParams.set('tournoi', slug);
    history.replaceState(null, '', url);

    // Update selector UI
    updateTournoiUI();

    // Re-subscribe realtime
    sb.removeAllChannels();
    sb.channel('matchs-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matchs' }, function() { loadMatchs(); })
        .subscribe();

    // Reload data
    adversairesMap = {};
    loadAdversaires().then(function() {
        loadMatchs().then(function() { skLoad(); });
    });
}

function updateTournoiUI() {
    // Selector buttons
    document.querySelectorAll('.tournoi-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tournoi === tournoiActif);
    });

    // Header tournament info
    var t = TOURNOIS[tournoiActif];
    document.querySelector('.tourney-name').textContent = t.nom;

    // Nav: hide/show classement link
    var classementLink = document.querySelector('.nav a[href="classement.html"]');
    if (classementLink) {
        classementLink.style.display = (tournoiActif === 'cvs') ? '' : 'none';
    }

    // Footer
    document.querySelector('.footer').innerHTML = 'Aquilons &middot; Jean de Br&eacute;beuf &middot; ' + t.nom;
}
```

**Step 5: Update INIT block**

Replace the init block (lines 1718-1734):
```js
var urlParams = new URLSearchParams(window.location.search);
var bracketScanStarted = false;
if (urlParams.has('score')) {
    document.getElementById('scorekeeper').classList.add('show');
    bracketScanStarted = true;
}

// Set initial tournament UI
updateTournoiUI();

loadAdversaires().then(function() {
    loadMatchs().then(function() { skLoad(); });
    if (bracketScanStarted && tournoiActif === 'cvs') {
        scanBrackets();
        setInterval(scanBrackets, 120000);
    }
});
```

Note: bracket scanning only runs for CVS (it's CVS-specific Google Sheets data).

**Step 6: Commit**
```
feat: add tournament selector to index.html (CVS/QCA toggle)
```

---

### Task 4: Add tournament selector to stats.html

**Files:**
- Modify: `stats.html`

**Step 1: Add TOURNOIS config (after line 269)**

Replace:
```js
var TOURNOI_ID = 'a0000000-0000-0000-0000-000000000001';
```
With same `TOURNOIS` object + `getTournoiActif()` + variable setup as in Task 3.

**Step 2: Add selector HTML after nav (line 203)**

Same HTML as Task 3.

**Step 3: Add CSS for selector**

Same CSS as Task 3 (after `.nav a.active` rule).

**Step 4: Add per-tournament config for stats**

After the TOURNOIS config, add:
```js
var STATS_CONFIG = {
    cvs: {
        sectionTitle: 'Équipes du tournoi CVS',
        highlights: [
            'Jean-de-Brébeuf 1',
            'Armand-Saint-Onge 1', 'Armand Saint-Onge 1',
            'JDNManikoutai (MED)', 'JDN/Manikoutai (MED)',
            'Odyssée 1'
        ],
        leagues: [
            { id: 'sag', name: 'Saguenay-Lac-Saint-Jean', leagueId: 'cad4071e-1e26-4c8d-ab45-7f72fd92fa43', type: 'volleyball' },
            { id: 'estqc-est', name: 'Est-du-Québec (Est)', leagueId: '330427e7-9293-4467-92d5-71bc84505a21', type: 'standings' },
            { id: 'estqc-ouest', name: 'Est-du-Québec (Ouest)', leagueId: 'a7d24a40-66f9-473c-9956-d9dc2a462819', type: 'standings' },
            { id: 'cn-d3', name: 'Côte-Nord (D3)', leagueId: '533891a0-5f82-4d54-b1fc-3815d1b6bed2', type: 'volleyball' },
            { id: 'cn-d4', name: 'Côte-Nord (D4)', leagueId: '775bc7f1-352c-4f4e-8339-8f5e65e0598d', type: 'volleyball' }
        ],
        teamMap: [
            { tournoi: 'Aquilons', search: 'Jean-de-Brébeuf 1', regionId: 'qca' },
            { tournoi: 'Tigres d\u2019Amé', search: 'Armand-Saint-Onge 1', regionId: 'estqc-ouest' },
            { tournoi: 'Husky JDN', search: 'JDNManikoutai (MED)', regionId: 'cn-d3' },
            { tournoi: 'Husky KS', search: 'JDNManikoutai (KS)', regionId: 'cn-d4' },
            { tournoi: 'Bleu et Or', search: 'Odyssée 1', regionId: 'sag' }
        ],
        showAllRegions: true
    },
    qca: {
        sectionTitle: 'Équipes du Régional QCA',
        highlights: ['Jean-de-Brébeuf 1'],
        leagues: [],
        teamMap: [
            { tournoi: 'Aquilons', search: 'Jean-de-Brébeuf 1', regionId: 'qca' }
        ],
        showAllRegions: false
    }
};
```

**Step 5: Refactor data loading to use config**

Replace hardcoded `TOURNEY_HIGHLIGHTS` (line 309-314) with:
```js
function isHighlighted(teamName) {
    var highlights = STATS_CONFIG[tournoiActif].highlights;
    var name = teamName.toLowerCase();
    for (var i = 0; i < highlights.length; i++) {
        if (name.indexOf(highlights[i].toLowerCase()) !== -1) return true;
    }
    return false;
}
```

Replace hardcoded `RSEQ_LEAGUES` (lines 325-356) — now read from config:
```js
function getRSEQLeagues() {
    return STATS_CONFIG[tournoiActif].leagues;
}
```

Replace hardcoded `TOURNEY_TEAM_MAP` (lines 536-542):
```js
function getTourneyTeamMap() {
    return STATS_CONFIG[tournoiActif].teamMap;
}
```

Update `loadRegions()` to use `getRSEQLeagues()` instead of `RSEQ_LEAGUES`.

Update `buildRankSummary()` to use `getTourneyTeamMap()` instead of `TOURNEY_TEAM_MAP`.

**Step 6: Add switchTournoi and updateTournoiUI**

```js
function switchTournoi(slug) {
    if (slug === tournoiActif) return;
    tournoiActif = slug;
    TOURNOI_ID = TOURNOIS[slug].id;
    localStorage.setItem('tournoi', slug);

    var url = new URL(window.location);
    url.searchParams.set('tournoi', slug);
    history.replaceState(null, '', url);

    updateTournoiUI();

    // Reload all data
    regions = [];
    loadTourneyTeams();
    loadRegions();
}

function updateTournoiUI() {
    document.querySelectorAll('.tournoi-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tournoi === tournoiActif);
    });

    // Section title
    document.querySelector('.section-title').innerHTML =
        '&Eacute;quipes du ' + TOURNOIS[tournoiActif].nom +
        ' <span class="section-sub">Saison RSEQ 2025-2026</span>';

    // Nav: hide classement
    var classementLink = document.querySelector('.nav a[href="classement.html"]');
    if (classementLink) {
        classementLink.style.display = (tournoiActif === 'cvs') ? '' : 'none';
    }
}
```

**Step 7: Update INIT (line 580-581)**

```js
updateTournoiUI();
loadTourneyTeams();
loadRegions();
```

**Step 8: Commit**
```
feat: add tournament selector to stats.html with per-tournament config
```

---

### Task 5: Add tournament selector to classement.html

**Files:**
- Modify: `classement.html`

**Step 1: Add same TOURNOIS config + getTournoiActif() + selector HTML + CSS**

**Step 2: Add guard for non-CVS tournaments**

At the top of the script, after tournament init:
```js
if (tournoiActif !== 'cvs') {
    document.getElementById('content').innerHTML =
        '<div style="text-align:center;padding:3rem;color:var(--gray);">Classement non disponible pour ce tournoi</div>';
}
```

**Step 3: Hide classement nav link when not CVS**

Same `updateTournoiUI()` pattern.

**Step 4: Commit**
```
feat: add tournament selector to classement.html with QCA guard
```

---

### Task 6: Test end-to-end

**Step 1: Open index.html in browser**
- Verify CVS shows current data
- Click "Régional QCA" — should show empty matches (none inserted yet)
- Click back to "CVS Alma" — data returns
- Verify `?tournoi=qca` in URL works

**Step 2: Navigate between pages**
- Switch to QCA on index.html
- Go to stats.html — should stay on QCA (localStorage)
- Verify classement link is hidden in nav
- Go to classement.html directly — should show "non disponible"

**Step 3: Test scorekeeper**
- On index.html with CVS selected, open scorekeeper
- Switch to QCA — scorekeeper dropdown should reload with QCA matches (empty)

**Step 4: Commit final adjustments if needed**

---

### Task 7: Update CLAUDE.md and memory

**Files:**
- Modify: `CLAUDE.md` — add QCA tournament ID, note multi-tournament support
- Modify: `MEMORY.md` — update with new architecture

**Step 1: Update CLAUDE.md**

Add under Supabase section:
```
- **Tournoi CVS ID :** `a0000000-0000-0000-0000-000000000001`
- **Tournoi QCA ID :** `a0000000-0000-0000-0000-000000000002`
- **Sélecteur :** toggle UI sous la nav, persisté localStorage + query param `?tournoi=`
```

**Step 2: Commit**
```
docs: update CLAUDE.md for multi-tournament support
```
