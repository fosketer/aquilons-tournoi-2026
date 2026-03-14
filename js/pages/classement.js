// js/pages/classement.js
import { getTournoiActif, getTournoiConfig, setTournoiActif, listTournois } from '../config.js';
import { fetchSheet } from '../lib/sheets.js';
import { showLoading, showError, showEmpty, escapeHTML } from '../lib/ui.js';
import { polling } from '../lib/polling.js';
import { SHEETS_REFRESH_INTERVAL_MS } from '../lib/constants.js';
import '../components/app-header.js';

const app = document.getElementById('app');
let cleanup = null;

// ==========================================
// HELPERS
// ==========================================

function shortName(name) {
    return name.replace(/\s*\([^)]*\)/, '');
}

// ==========================================
// DATA PARSING
// ==========================================

function parsePoolData(rows, pools, columns) {
    const SG = columns.sg;
    const SP = columns.sp;
    const PP = columns.pp;
    const PC = columns.pc;
    const SGSP = columns.sgsp;
    const PPPC = columns.pppc;
    const RG = columns.rg;

    const data = {};
    pools.forEach(function(pool) {
        data[pool.name] = [];
        pool.teams.forEach(function(team, idx) {
            const teamId = pool.ids[idx];
            for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                if (row[1] && row[1].trim() === String(teamId)) {
                    const v = function(c) { return row[c] ? row[c].trim() : null; };
                    data[pool.name].push({
                        id: teamId, name: team,
                        sg: v(SG), sp: v(SP), pp: v(PP), pc: v(PC),
                        sgsp: v(SGSP), pppc: v(PPPC), rg: v(RG) || null
                    });
                    break;
                }
            }
            if (!data[pool.name].find(function(e) { return e.name === team; })) {
                data[pool.name].push({ id: teamId, name: team, sg:null, sp:null, pp:null, pc:null, sgsp:null, pppc:null, rg:null });
            }
        });
        // Sort: by RG if available, else by SG desc then PP desc
        data[pool.name].sort(function(a, b) {
            if (a.rg && b.rg) return parseInt(a.rg) - parseInt(b.rg);
            const sgA = parseInt(a.sg) || 0, sgB = parseInt(b.sg) || 0;
            if (sgA !== sgB) return sgB - sgA;
            const ppa = parseInt(a.pp) || 0, ppb = parseInt(b.pp) || 0;
            return ppb - ppa;
        });
    });
    return data;
}

function parseMatchGrid(rows, pool) {
    const matches = [];
    // Find header row with all 4 team IDs
    let colOf = {};
    for (let r = 0; r < rows.length; r++) {
        let found = 0; const tmpCols = {};
        for (let c = 0; c < rows[r].length; c++) {
            const v = (rows[r][c] || '').trim();
            for (let t = 0; t < pool.ids.length; t++) {
                if (v === String(pool.ids[t])) { tmpCols[pool.ids[t]] = c; found++; }
            }
        }
        if (found >= 4) { colOf = tmpCols; break; }
    }
    if (!Object.keys(colOf).length) return matches;

    // Find team data rows (first occurrence only)
    const teamRows = {};
    for (let r2 = 0; r2 < rows.length; r2++) {
        if (rows[r2][1]) {
            const tid = parseInt(rows[r2][1].trim());
            if (pool.ids.indexOf(tid) >= 0 && !teamRows[tid]) {
                teamRows[tid] = [rows[r2], rows[r2 + 1] || []];
            }
        }
    }

    // Extract match scores for each pair (upper triangle)
    for (let i = 0; i < pool.ids.length; i++) {
        for (let j = i + 1; j < pool.ids.length; j++) {
            const idA = pool.ids[i], idB = pool.ids[j];
            if (!teamRows[idA]) continue;
            const r1 = teamRows[idA][0], r2a = teamRows[idA][1];
            const col = colOf[idB];
            const s1a = parseInt((r1[col] || '').trim());
            const s1b = parseInt((r1[col + 1] || '').trim());
            const s2a = parseInt((r2a[col] || '').trim());
            const s2b = parseInt((r2a[col + 1] || '').trim());
            if (!isNaN(s1a) && !isNaN(s1b)) {
                let setsA = 0, setsB = 0;
                if (s1a > s1b) setsA++; else setsB++;
                if (!isNaN(s2a) && !isNaN(s2b)) { if (s2a > s2b) setsA++; else setsB++; }
                matches.push({
                    teamA: pool.teams[i], teamB: pool.teams[j],
                    setsA: setsA, setsB: setsB,
                    scores: !isNaN(s2a) ? s1a+'-'+s1b + ', ' + s2a+'-'+s2b : s1a+'-'+s1b
                });
            }
        }
    }
    return matches;
}

function computeCrossRanking(poolData) {
    const seconds = [];
    for (const pName in poolData) {
        const teams = poolData[pName];
        if (teams.length >= 2) {
            const t = teams[1]; // 2nd place (already sorted)
            seconds.push({
                name: t.name, pool: pName,
                sg: parseInt(t.sg) || 0, sp: parseInt(t.sp) || 0,
                pp: parseInt(t.pp) || 0, pc: parseInt(t.pc) || 0,
                pppc: parseFloat((t.pppc || '0').replace(',', '.')) || 0
            });
        }
    }
    seconds.sort(function(a, b) {
        const ra = a.sp > 0 ? a.sg / a.sp : (a.sg > 0 ? 999 : 0);
        const rb = b.sp > 0 ? b.sg / b.sp : (b.sg > 0 ? 999 : 0);
        if (ra !== rb) return rb - ra;
        return b.pppc - a.pppc;
    });
    return seconds;
}

// ==========================================
// RENDERING
// ==========================================

function renderPools(pools, data, allMatches, containerId, aquilonName) {
    const container = document.getElementById(containerId);
    container.innerHTML = pools.map(function(pool) {
        const teams = data[pool.name] || pool.teams.map(function(t, i) {
            return { id: pool.ids[i], name: t, sg:null, sp:null, pp:null, pc:null, sgsp:null, pppc:null, rg:null };
        });
        const hasData = teams.some(function(t) { return t.sg !== null; });
        const matches = allMatches[pool.name] || [];
        const totalPossible = 6; // 4 teams = 6 matches
        const status = hasData ? matches.length + '/' + totalPossible + ' matchs' : 'En attente';

        const rows = teams.map(function(t) {
            const isAq = t.name === aquilonName;
            const cls = isAq ? ' class="highlight"' : '';
            if (!hasData) {
                return '<tr' + cls + '><td>' + escapeHTML(shortName(t.name)) + '</td><td class="no-data" colspan="5">\u2014</td></tr>';
            }
            return '<tr' + cls + '>' +
                '<td>' + escapeHTML(shortName(t.name)) + '</td>' +
                '<td>' + (t.sg || '-') + '</td>' +
                '<td>' + (t.sp || '-') + '</td>' +
                '<td>' + (t.pp || '-') + '</td>' +
                '<td>' + (t.pc || '-') + '</td>' +
                '<td class="ratio">' + (t.pppc || '-') + '</td>' +
                '<td class="rg-cell">' + (t.rg || '-') + '</td>' +
                '</tr>';
        }).join('');

        const thExtra = hasData ?
            '<th>SG</th><th>SP</th><th>PP</th><th>PC</th><th>PP/PC</th><th class="rg">Rg</th>' :
            '<th colspan="5"></th>';

        let matchHtml = '';
        if (matches.length > 0) {
            matchHtml = '<div class="match-list"><div class="match-list-title">R\u00e9sultats des matchs</div>';
            matches.forEach(function(m) {
                const isAqA = m.teamA === aquilonName;
                const isAqB = m.teamB === aquilonName;
                const clsA = isAqA ? ' aq' : '';
                const clsB = isAqB ? ' aq' : '';
                matchHtml += '<div class="ml-row">' +
                    '<span class="ml-team right' + clsA + '">' + escapeHTML(shortName(m.teamA)) + '</span>' +
                    '<span class="ml-sets"><span class="' + (m.setsA > m.setsB ? 'w' : m.setsA < m.setsB ? 'l' : '') + '">' + m.setsA + '</span>-<span class="' + (m.setsB > m.setsA ? 'w' : m.setsB < m.setsA ? 'l' : '') + '">' + m.setsB + '</span></span>' +
                    '<span class="ml-team' + clsB + '">' + escapeHTML(shortName(m.teamB)) + '</span>' +
                    '<span class="ml-detail">(' + m.scores + ')</span>' +
                    '</div>';
            });
            matchHtml += '</div>';
        }

        return '<div class="pool-card">' +
            '<div class="pool-header"><span class="pool-name">' + escapeHTML(pool.name) + '</span><span class="pool-status">' + status + '</span></div>' +
            '<table class="pool-table"><thead><tr><th>\u00c9quipe</th>' + thExtra + '</tr></thead><tbody>' + rows + '</tbody></table>' +
            matchHtml + '</div>';
    }).join('');
}

function renderCrossRanking(seconds, aquilonName) {
    const container = document.getElementById('crossRanking');
    if (!seconds.length) { container.innerHTML = ''; return; }

    const labels = ['M2e', '2eM2e', '3eM2e', '4eM2e', '5eM2e'];
    const rows = seconds.map(function(t, i) {
        const isAq = t.name === aquilonName;
        const cls = isAq ? ' class="highlight"' : '';
        const ratio = t.sp > 0 ? (t.sg / t.sp).toFixed(2) : (t.sg > 0 ? '\u221e' : '0');
        return '<tr' + cls + '>' +
            '<td class="rg-cell">' + (labels[i] || (i+1)) + '</td>' +
            '<td>' + escapeHTML(shortName(t.name)) + '</td>' +
            '<td class="ratio">' + t.pool.replace('Pool ', '') + '</td>' +
            '<td>' + t.sg + '</td><td>' + t.sp + '</td>' +
            '<td class="ratio">' + ratio + '</td>' +
            '<td class="ratio">' + t.pppc.toFixed(2) + '</td></tr>';
    }).join('');

    container.innerHTML = '<div class="pool-card">' +
        '<table class="pool-table"><thead><tr>' +
        '<th class="rg">Seed</th><th>\u00c9quipe</th><th>Pool</th><th>SG</th><th>SP</th><th>SG/SP</th><th>PP/PC</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function renderProjection(poolData, seconds, aquilonName) {
    const container = document.getElementById('projection');
    // Find Aquilons
    let aqPool = null, aqRank = -1;
    for (const pName in poolData) {
        const teams = poolData[pName];
        for (let i = 0; i < teams.length; i++) {
            if (teams[i].name === aquilonName) { aqPool = pName; aqRank = i + 1; break; }
        }
        if (aqPool) break;
    }
    if (!aqPool) { container.innerHTML = ''; return; }

    let seedLabel = '';
    if (aqRank === 1) {
        seedLabel = '1er ' + aqPool.replace('Pool ', '') + ' \u2192 Tier 1 (bye en quart de finale)';
    } else if (aqRank === 2) {
        let crossIdx = -1;
        for (let i = 0; i < seconds.length; i++) {
            if (seconds[i].name === aquilonName) { crossIdx = i; break; }
        }
        const labels = ['M2e', '2eM2e', '3eM2e', '4eM2e', '5eM2e'];
        seedLabel = (crossIdx >= 0 ? labels[crossIdx] : '?') + ' \u2192 Tier 1';
        if (crossIdx >= 0) seedLabel += ' (huiti\u00e8me de finale)';
    } else if (aqRank === 3) {
        seedLabel = '3e ' + aqPool.replace('Pool ', '') + ' \u2192 Tier 2 probable';
    } else {
        seedLabel = '4e ' + aqPool.replace('Pool ', '') + ' \u2192 Tier 2';
    }

    container.innerHTML = '<div class="proj-card">' +
        '<div class="proj-title">Projection Aquilons</div>' +
        '<div class="proj-line"><span class="hl">' + aqRank + (aqRank===1?'er':'e') + '</span> en ' + escapeHTML(aqPool) + '</div>' +
        '<div class="proj-line">' + seedLabel + '</div>' +
        '<div class="proj-line detail" style="margin-top:0.3rem;color:var(--gray);font-size:0.7rem">Mise \u00e0 jour auto toutes les 2 min</div>' +
        '</div>';
}

// ==========================================
// PAGE STRUCTURE
// ==========================================

function buildPageHTML(cfg) {
    const sheetId = cfg.sheets.id;
    const gidTier1 = cfg.sheets.gids.elim_d2_tier1;
    const gidTier2 = cfg.sheets.gids.elim_d2_tier2;
    const tier1Url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/htmlview#gid=' + gidTier1;
    const tier2Url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/htmlview#gid=' + gidTier2;

    return '<div class="content">' +
        '<button class="refresh-btn" id="refreshBtn">Rafra\u00eechir les donn\u00e9es</button>' +
        '<div class="last-refresh" id="lastRefresh"></div>' +
        '<div id="projection"></div>' +
        '<div class="section-title">Pools \u2014 Benjamin BF D2</div>' +
        '<div id="poolsD2"></div>' +
        '<div class="section-title">Classement crois\u00e9 des 2es</div>' +
        '<div id="crossRanking"></div>' +
        '<div class="section-title">\u00c9liminatoires \u2014 8 mars</div>' +
        '<a class="bracket-link" href="' + tier1Url + '" target="_blank">Tableau Tier 1</a>' +
        '<a class="bracket-link" href="' + tier2Url + '" target="_blank" style="margin-top:0.5rem">Tableau Tier 2</a>' +
        '<div class="footer">' +
            'Aquilons \u00b7 Jean de Br\u00e9beuf \u00b7 Tournoi CVS 2026<br>' +
            'Donn\u00e9es\u00a0: <a href="https://docs.google.com/spreadsheets/d/' + sheetId + '/htmlview" target="_blank" style="color:var(--gray)">Google Sheets officiel</a>' +
        '</div>' +
    '</div>';
}

// ==========================================
// INIT
// ==========================================

async function init(slug) {
    if (cleanup) cleanup();
    cleanup = null;
    showLoading(app);

    try {
        const config = await getTournoiConfig(slug);
        const cfg = config.config || {};

        // Guard: if no sheets config, show empty state
        if (!cfg.sheets) {
            showEmpty(app, 'Classement non disponible pour ce tournoi.');
            return;
        }

        const sheetId = cfg.sheets.id;
        const gidD2 = cfg.sheets.gids.d2_resultats;
        const poolsDef = cfg.sheets.pools;
        const aquilonName = cfg.sheets.aquilon_name;
        const columns = cfg.sheets.columns;

        // Build page structure
        app.innerHTML = buildPageHTML(cfg);

        // Wire refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', fetchAll);

        // Render empty pools initially
        renderPools(poolsDef, {}, {}, 'poolsD2', aquilonName);

        async function fetchAll() {
            document.getElementById('lastRefresh').textContent = 'Chargement...';
            try {
                const d2Rows = await fetchSheet(sheetId, gidD2);
                let poolData = {};
                let allMatches = {};

                if (d2Rows) {
                    poolData = parsePoolData(d2Rows, poolsDef, columns);
                    poolsDef.forEach(function(pool) {
                        allMatches[pool.name] = parseMatchGrid(d2Rows, pool);
                    });
                }

                renderPools(poolsDef, poolData, allMatches, 'poolsD2', aquilonName);

                const seconds = computeCrossRanking(poolData);
                renderCrossRanking(seconds, aquilonName);
                renderProjection(poolData, seconds, aquilonName);

                const now = new Date();
                document.getElementById('lastRefresh').textContent =
                    'Derni\u00e8re mise \u00e0 jour\u00a0: ' + now.getHours() + 'h' + String(now.getMinutes()).padStart(2, '0');
            } catch (e) {
                console.error('fetchAll error', e);
                document.getElementById('lastRefresh').textContent = 'Erreur de chargement';
            }
        }

        // Initial fetch
        await fetchAll();

        // Auto-refresh every 2 minutes
        polling.schedule('sheets-refresh', fetchAll, SHEETS_REFRESH_INTERVAL_MS);
        cleanup = function() { polling.cancel('sheets-refresh'); };

    } catch (e) {
        showError(app, 'Impossible de charger les donn\u00e9es', function() { init(slug); });
    }
}

// ==========================================
// HEADER SETUP & START
// ==========================================

const header = document.querySelector('app-header');
const tournois = await listTournois();

header.renderSelector(tournois, getTournoiActif(), function(slug) {
    setTournoiActif(slug);
    init(slug);
});

init(getTournoiActif());
