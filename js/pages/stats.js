// js/pages/stats.js
import { getTournoiActif, getTournoiConfig, setTournoiActif, listTournois } from '../config.js';
import { fetchRows } from '../lib/supabase.js';
import { fetchLeague, buildRegion } from '../lib/rseq.js';
import { fetchCSV } from '../lib/sheets.js';
import { showLoading, showError } from '../lib/ui.js';
import '../components/app-header.js';

const app = document.getElementById('app');
let cleanup = null;

// ==========================================
// HELPERS
// ==========================================

function isHighlighted(teamName, highlights) {
    var name = teamName.toLowerCase();
    for (var i = 0; i < highlights.length; i++) {
        if (name.indexOf(highlights[i].toLowerCase()) !== -1) return true;
    }
    return false;
}

// ==========================================
// TOURNAMENT TEAMS TABLE
// ==========================================

function renderTourneyTeams(data, tourneyBody) {
    var i = 0;
    tourneyBody.innerHTML = data.filter(function(a) { return a.nom_tournoi !== 'Aquilons'; }).map(function(a) {
        i++;
        var isAq = false;
        var rankCls = a.rang_regional === 1 ? 'rank-1' : '';
        var rankTxt = a.rang_regional ? a.rang_regional + (a.rang_regional === 1 ? 'er' : 'e') : '<span class="stat-na">-</span>';
        var sg = a.sets_gagnes != null ? a.sets_gagnes : '<span class="stat-na">-</span>';
        var sp = a.sets_perdus != null ? a.sets_perdus : '<span class="stat-na">-</span>';
        var pp = a.points_pour != null ? a.points_pour : '<span class="stat-na">-</span>';
        var pc = a.points_contre != null ? a.points_contre : '<span class="stat-na">-</span>';
        var school = a.nom_officiel || a.ecole || '';
        return '<tr' + (isAq ? ' class="is-aquilon"' : '') + '>' +
            '<td class="num">' + i + '</td>' +
            '<td><span class="team-cell-name">' + a.nom_tournoi + '</span>' +
                (school ? '<span class="team-cell-school">' + school + '</span>' : '') +
            '</td>' +
            '<td class="team-cell-region">' + (a.region_rseq || '<span class="stat-na">-</span>') + '</td>' +
            '<td class="stat ' + rankCls + '">' + rankTxt + '</td>' +
            '<td class="stat">' + sg + '</td>' +
            '<td class="stat">' + sp + '</td>' +
            '<td class="stat">' + pp + '</td>' +
            '<td class="stat">' + pc + '</td>' +
            '</tr>';
    }).join('');
}

// ==========================================
// QCA STANDINGS (Google Sheets CSV)
// ==========================================

function fetchQCAStandings(qcaConfig) {
    var url = qcaConfig.sheets_url;
    var cols = qcaConfig.columns;
    return fetchCSV(url)
        .then(function(csv) {
            var lines = csv.split('\n');
            var region = {
                id: 'qca',
                name: 'QCA (Qu\u00e9bec-Chaudi\u00e8re-Appalaches)',
                info: 'Benjamin F\u00e9minin \u2014 Classement g\u00e9n\u00e9ral',
                cols: ['Rang', '\u00c9quipe', 'T3', 'T4', 'T5', 'Total'],
                teams: []
            };
            // Data starts at line index from config (default 6)
            var startLine = (cols && cols.start_line != null) ? cols.start_line : 6;
            var colRang = (cols && cols.rang != null) ? cols.rang : 0;
            var colEquipe = (cols && cols.equipe != null) ? cols.equipe : 1;
            var colT3 = (cols && cols.t3 != null) ? cols.t3 : 4;
            var colT4 = (cols && cols.t4 != null) ? cols.t4 : 7;
            var colT5 = (cols && cols.t5 != null) ? cols.t5 : 10;
            var colTotal = (cols && cols.total != null) ? cols.total : 11;

            for (var i = startLine; i < lines.length; i++) {
                var c = lines[i].split(',');
                var rang = (c[colRang] || '').trim();
                var equipe = (c[colEquipe] || '').trim();
                if (!rang || !equipe) continue;
                var t3 = (c[colT3] || '').trim() || '-';
                var t4 = (c[colT4] || '').trim() || '-';
                var t5 = (c[colT5] || '').trim() || '-';
                var total = (c[colTotal] || '').trim() || '-';
                region.teams.push([rang, equipe, t3, t4, t5, total]);
            }
            region.source = { name: 'RSEQ-QCA', url: 'https://rseqqca.com/volleyball/secondaire/horaire' };
            return region;
        });
}

// ==========================================
// REGIONAL STANDINGS (RSEQ API)
// ==========================================

function renderRegions(regions, highlights) {
    var tabsEl = document.getElementById('regionTabs');
    var sectionsEl = document.getElementById('regionSections');
    var tabsHtml = '';
    var sectHtml = '';

    regions.forEach(function(r, idx) {
        tabsHtml += '<div class="region-tab' + (idx === 0 ? ' active' : '') + '" data-region="' + r.id + '">' + r.name + '</div>';

        sectHtml += '<div class="region-section' + (idx === 0 ? ' show' : '') + '" id="region-' + r.id + '">';
        sectHtml += '<div class="region-card">';
        sectHtml += '<div class="region-header"><span class="region-name">' + r.name + '</span><span class="region-info">' + r.info + '</span></div>';

        if (r.teams.length === 0) {
            sectHtml += '<div class="no-data">Aucune donn\u00e9e disponible</div>';
        } else {
            sectHtml += '<table class="region-table"><thead><tr>';
            r.cols.forEach(function(c) { sectHtml += '<th>' + c + '</th>'; });
            sectHtml += '</tr></thead><tbody>';

            r.teams.forEach(function(t) {
                var isHl = isHighlighted(t[1], highlights);
                sectHtml += '<tr' + (isHl ? ' class="highlight"' : '') + '>';
                t.forEach(function(val) {
                    if (val === null) val = '-';
                    sectHtml += '<td>' + val + '</td>';
                });
                sectHtml += '</tr>';
            });
            sectHtml += '</tbody></table>';
        }

        sectHtml += '</div>';
        if (r.source) {
            sectHtml += '<div class="region-source">Source\u00a0: <a href="' + r.source.url + '" target="_blank">' + r.source.name + '</a></div>';
        }
        sectHtml += '</div>';
    });

    tabsEl.innerHTML = tabsHtml;
    sectionsEl.innerHTML = sectHtml;

    // Wire up tab clicks
    tabsEl.querySelectorAll('.region-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            showRegion(tab.dataset.region, regions);
        });
    });
}

function showRegion(id, regions) {
    document.querySelectorAll('.region-section').forEach(function(el) { el.classList.remove('show'); });
    document.querySelectorAll('.region-tab').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById('region-' + id).classList.add('show');
    var tabs = document.querySelectorAll('.region-tab');
    for (var i = 0; i < tabs.length; i++) {
        var r = regions[i];
        if (r && r.id === id) tabs[i].classList.add('active');
    }
}

// ==========================================
// RANK SUMMARY
// ==========================================

function buildRankSummary(regions, teamMap) {
    var body = document.getElementById('rankBody');
    var rows = '';
    teamMap.forEach(function(tm) {
        var found = null;
        var total = 0;
        var regionName = '';
        for (var ri = 0; ri < regions.length; ri++) {
            var r = regions[ri];
            if (r.id !== tm.regionId) continue;
            regionName = r.name;
            total = r.teams.length;
            for (var ti = 0; ti < r.teams.length; ti++) {
                var team = r.teams[ti];
                if (team[1].toLowerCase().indexOf(tm.search.toLowerCase()) !== -1) {
                    found = { rang: team[0], name: team[1] };
                    break;
                }
            }
            break;
        }
        var isAq = tm.tournoi === 'Aquilons';
        rows += '<tr' + (isAq ? ' class="is-aquilon"' : '') + '>';
        rows += '<td><span class="team-cell-name">' + tm.tournoi + '</span></td>';
        rows += '<td style="font-size:0.65rem;color:var(--gray)">' + (found ? found.name : '-') + '</td>';
        rows += '<td class="team-cell-region">' + (regionName || '-') + '</td>';
        rows += '<td class="stat team-cell-rank">' + (found ? found.rang : '-') + '</td>';
        rows += '<td class="stat" style="color:var(--gray)">' + (total || '-') + '</td>';
        rows += '</tr>';
    });
    body.innerHTML = rows || '<tr><td colspan="5" class="no-data">Aucune donn\u00e9e</td></tr>';
}

// ==========================================
// PAGE STRUCTURE
// ==========================================

function buildPageHTML(sectionTitle) {
    return '<div class="content">' +
        '<div class="section-title">' +
            sectionTitle +
            ' <span class="section-sub">Saison RSEQ 2025-2026</span>' +
        '</div>' +
        '<div style="overflow-x:auto;">' +
        '<table class="tourney-table" id="tourneyTable">' +
            '<thead>' +
                '<tr>' +
                    '<th class="num">#</th>' +
                    '<th>\u00c9quipe</th>' +
                    '<th>R\u00e9gion</th>' +
                    '<th class="stat">Rang</th>' +
                    '<th class="stat">SG</th>' +
                    '<th class="stat">SP</th>' +
                    '<th class="stat">PP</th>' +
                    '<th class="stat">PC</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody id="tourneyBody"></tbody>' +
        '</table>' +
        '</div>' +
        '<div class="section-title" style="margin-top:2rem;">' +
            'Rang r\u00e9gional' +
            ' <span class="section-sub">Classement des \u00e9quipes du tournoi dans leur r\u00e9gion</span>' +
        '</div>' +
        '<div style="overflow-x:auto;">' +
        '<table class="tourney-table" id="rankTable">' +
            '<thead>' +
                '<tr>' +
                    '<th>\u00c9quipe tournoi</th>' +
                    '<th>\u00c9quipe RSEQ</th>' +
                    '<th>R\u00e9gion</th>' +
                    '<th class="stat">Rang</th>' +
                    '<th class="stat">/ Total</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody id="rankBody">' +
                '<tr><td colspan="5" class="no-data">Chargement...</td></tr>' +
            '</tbody>' +
        '</table>' +
        '</div>' +
        '<div class="section-title" style="margin-top:2rem;">' +
            'Classements r\u00e9gionaux complets' +
            ' <span class="section-sub">Toutes les \u00e9quipes par r\u00e9gion</span>' +
        '</div>' +
        '<div class="region-tabs" id="regionTabs"></div>' +
        '<div id="regionSections"></div>' +
        '<div class="footer">Aquilons \u00b7 Jean de Br\u00e9beuf</div>' +
    '</div>';
}

// ==========================================
// INIT
// ==========================================

async function init(slug) {
    if (cleanup) cleanup();
    showLoading(app);

    try {
        var config = await getTournoiConfig(slug);
        var rseqCfg = (config.config && config.config.rseq) || {};
        var qcaCfg = (config.config && config.config.qca) || null;
        var teamMap = (config.config && config.config.team_map) || [];
        var highlights = rseqCfg.highlights || [];
        var leagues = rseqCfg.leagues || [];

        // Generate section title from config.nom
        var sectionTitle = '\u00c9quipes du ' + config.nom;

        // Build page structure
        app.innerHTML = buildPageHTML(sectionTitle);

        var regions = [];

        // Load tourney teams from Supabase
        var teamsData = await fetchRows('adversaires', { tournoi_id: config.id }, { order: 'nom_tournoi' });
        if (teamsData) {
            renderTourneyTeams(teamsData, document.getElementById('tourneyBody'));
        }

        // Fetch QCA from Google Sheets + RSEQ leagues in parallel
        var qcaPromise = qcaCfg
            ? fetchQCAStandings(qcaCfg).catch(function() { return null; })
            : Promise.resolve(null);

        var rseqPromises = leagues.map(function(cfg) {
            return fetchLeague(cfg.leagueId).then(function(data) {
                return { cfg: cfg, data: data };
            }).catch(function() { return null; });
        });

        var allResults = await Promise.all([qcaPromise].concat(rseqPromises));

        // QCA first
        if (allResults[0] && allResults[0].teams.length > 0) {
            regions.push(allResults[0]);
        }

        // RSEQ leagues
        for (var i = 1; i < allResults.length; i++) {
            if (allResults[i]) {
                var region = buildRegion(allResults[i].cfg, allResults[i].data);
                if (region.teams.length > 0) {
                    regions.push(region);
                }
            }
        }

        renderRegions(regions, highlights);
        buildRankSummary(regions, teamMap);

        cleanup = function() { regions = []; };
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
