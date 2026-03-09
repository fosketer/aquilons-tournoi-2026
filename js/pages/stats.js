// js/pages/stats.js
import { getTournoiActif, getTournoiConfig, setTournoiActif, listTournois } from '../config.js';
import { fetchRows } from '../lib/supabase.js';
import { showLoading, showError } from '../lib/ui.js';
import '../components/app-header.js';

const app = document.getElementById('app');
let cleanup = null;

// ==========================================
// COMPUTE STATS
// ==========================================

function computeStats(matchs) {
    var wins = 0, losses = 0, draws = 0;
    var setsWon = 0, setsLost = 0, setsPlayed = 0;
    var pointsFor = 0, pointsAgainst = 0;
    var completed = [];

    matchs.forEach(function(m) {
        if (m.statut === 'win') wins++;
        else if (m.statut === 'loss') losses++;
        else if (m.statut === 'draw') draws++;

        if (m.statut !== 'win' && m.statut !== 'loss' && m.statut !== 'draw') return;

        var matchSets = [];
        var setData = [
            { aq: m.aq_set1, adv: m.adv_set1 },
            { aq: m.aq_set2, adv: m.adv_set2 },
            { aq: m.aq_set3, adv: m.adv_set3 }
        ];
        var mPtsFor = 0, mPtsAgainst = 0, mSetsW = 0, mSetsL = 0;

        setData.forEach(function(s) {
            if (s.aq == null || s.adv == null) return;
            setsPlayed++;
            pointsFor += s.aq;
            pointsAgainst += s.adv;
            mPtsFor += s.aq;
            mPtsAgainst += s.adv;
            if (s.aq > s.adv) { setsWon++; mSetsW++; }
            else { setsLost++; mSetsL++; }
            matchSets.push(s);
        });

        completed.push({
            match: m,
            sets: matchSets,
            setsWon: mSetsW,
            setsLost: mSetsL,
            pointsFor: mPtsFor,
            pointsAgainst: mPtsAgainst,
            pointDiff: mPtsFor - mPtsAgainst
        });
    });

    return {
        wins: wins, losses: losses, draws: draws,
        setsWon: setsWon, setsLost: setsLost, setsPlayed: setsPlayed,
        pointsFor: pointsFor, pointsAgainst: pointsAgainst,
        pointDiff: pointsFor - pointsAgainst,
        avgPtsFor: setsPlayed ? (pointsFor / setsPlayed).toFixed(1) : '0',
        avgPtsAgainst: setsPlayed ? (pointsAgainst / setsPlayed).toFixed(1) : '0',
        completed: completed,
        totalMatchs: matchs.length,
        playedMatchs: completed.length
    };
}

// ==========================================
// PAGE STRUCTURE
// ==========================================

function buildPageHTML(tournoiNom) {
    return '<div class="content">' +
        '<div class="section-title">Performance' +
            ' <span class="section-sub">' + tournoiNom + '</span>' +
        '</div>' +
        '<div id="perfSection"></div>' +

        '<div class="section-title" style="margin-top:2rem;">Match par match</div>' +
        '<div id="matchResults"></div>' +

        '<div class="section-title" style="margin-top:2rem;">Nos adversaires</div>' +
        '<div id="adversaires"></div>' +

        '<div class="footer">Aquilons \u00b7 Jean de Br\u00e9beuf</div>' +
    '</div>';
}

// ==========================================
// RENDER: PERFORMANCE
// ==========================================

function renderPerformance(stats) {
    var el = document.getElementById('perfSection');

    if (stats.playedMatchs === 0) {
        el.innerHTML = '<div class="st-empty">Aucun match jou\u00e9 pour le moment</div>';
        return;
    }

    var total = stats.wins + stats.losses + stats.draws;
    var winPct = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
    var setsTotal = stats.setsWon + stats.setsLost;
    var setsPct = setsTotal > 0 ? Math.round((stats.setsWon / setsTotal) * 100) : 0;
    var diffSign = stats.pointDiff >= 0 ? '+' : '';
    var diffCls = stats.pointDiff >= 0 ? 'positive' : 'negative';

    var h = '<div class="perf-card">';

    // Big record
    h += '<div class="perf-record">';
    h += '<div class="perf-record-item win"><span class="perf-big">' + stats.wins + '</span><span class="perf-lbl">V</span></div>';
    if (stats.draws > 0) {
        h += '<div class="perf-sep">\u2013</div>';
        h += '<div class="perf-record-item draw"><span class="perf-big">' + stats.draws + '</span><span class="perf-lbl">N</span></div>';
    }
    h += '<div class="perf-sep">\u2013</div>';
    h += '<div class="perf-record-item loss"><span class="perf-big">' + stats.losses + '</span><span class="perf-lbl">D</span></div>';
    h += '</div>';

    // Win % bar
    h += '<div class="perf-bar-row">';
    h += '<div class="perf-bar-header"><span>Matchs gagn\u00e9s</span><span>' + winPct + '%</span></div>';
    h += '<div class="perf-bar"><div class="perf-bar-fill win" style="width:' + winPct + '%"></div></div>';
    h += '</div>';

    // Sets bar
    h += '<div class="perf-bar-row">';
    h += '<div class="perf-bar-header"><span>Sets ' + stats.setsWon + 'G \u2013 ' + stats.setsLost + 'P</span><span>' + setsPct + '%</span></div>';
    h += '<div class="perf-bar"><div class="perf-bar-fill sets" style="width:' + setsPct + '%"></div></div>';
    h += '</div>';

    // Points row
    h += '<div class="perf-pts">';
    h += '<div class="perf-pt"><span class="perf-pt-num">' + stats.pointsFor + '</span><span class="perf-pt-lbl">Pts marqu\u00e9s</span></div>';
    h += '<div class="perf-pt"><span class="perf-pt-num">' + stats.pointsAgainst + '</span><span class="perf-pt-lbl">Pts conc\u00e9d\u00e9s</span></div>';
    h += '<div class="perf-pt"><span class="perf-pt-num ' + diffCls + '">' + diffSign + stats.pointDiff + '</span><span class="perf-pt-lbl">Diff\u00e9rentiel</span></div>';
    h += '</div>';

    // Averages
    h += '<div class="perf-avg">';
    h += '<span>\u00d8 ' + stats.avgPtsFor + ' pts/set marqu\u00e9s</span>';
    h += '<span>\u00d8 ' + stats.avgPtsAgainst + ' pts/set conc\u00e9d\u00e9s</span>';
    h += '</div>';

    h += '</div>';
    el.innerHTML = h;
}

// ==========================================
// RENDER: MATCH RESULTS
// ==========================================

function renderMatchResults(stats, advMap) {
    var el = document.getElementById('matchResults');

    if (stats.completed.length === 0) {
        el.innerHTML = '<div class="st-empty">Aucun r\u00e9sultat disponible</div>';
        return;
    }

    var html = '';
    stats.completed.forEach(function(c) {
        var m = c.match;
        var adv = advMap[m.adversaire] || {};
        var isWin = m.statut === 'win';
        var isDraw = m.statut === 'draw';
        var cls = isWin ? 'win' : (isDraw ? 'draw' : 'loss');
        var txt = isWin ? 'Victoire' : (isDraw ? '\u00c9galit\u00e9' : 'D\u00e9faite');

        html += '<div class="mr-card ' + cls + '">';

        // Header
        html += '<div class="mr-head">';
        html += '<span class="mr-status ' + cls + '">' + txt + '</span>';
        html += '<span class="mr-time">Match ' + m.numero + ' \u00b7 ' + m.heure + '</span>';
        html += '</div>';

        // Opponent
        html += '<div class="mr-opp">';
        html += '<span class="mr-vs">vs</span>';
        html += '<span class="mr-name">' + m.adversaire + '</span>';
        if (adv.rang_regional || adv.region_rseq) {
            html += '<span class="mr-rank">';
            if (adv.rang_regional) html += adv.rang_regional + (adv.rang_regional === 1 ? 'er' : 'e');
            if (adv.region_rseq) html += ' ' + adv.region_rseq;
            html += '</span>';
        }
        html += '</div>';

        // Set scores
        html += '<div class="mr-sets">';
        c.sets.forEach(function(s, i) {
            var won = s.aq > s.adv;
            html += '<div class="mr-set ' + (won ? 'won' : 'lost') + '">';
            html += '<span class="mr-set-lbl">Set ' + (i + 1) + '</span>';
            html += '<span class="mr-set-sc">' + s.aq + '\u2013' + s.adv + '</span>';
            html += '</div>';
        });
        html += '</div>';

        // Point diff bar
        var maxDiff = 30;
        var barPct = Math.min((Math.abs(c.pointDiff) / maxDiff) * 100, 100);
        var sign = c.pointDiff >= 0 ? '+' : '';
        html += '<div class="mr-diff">';
        html += '<span class="mr-diff-num">' + sign + c.pointDiff + ' pts</span>';
        html += '<div class="mr-diff-bar"><div class="mr-diff-fill ' + cls + '" style="width:' + barPct + '%"></div></div>';
        html += '</div>';

        html += '</div>';
    });

    el.innerHTML = html;
}

// ==========================================
// RENDER: ADVERSAIRES
// ==========================================

function renderAdversaires(advMap, matchs) {
    var el = document.getElementById('adversaires');

    // Match result lookup
    var results = {};
    matchs.forEach(function(m) {
        if (m.statut === 'win' || m.statut === 'loss' || m.statut === 'draw') {
            results[m.adversaire] = m;
        }
    });

    // Unique opponents from matchs
    var opponents = [];
    var seen = {};
    matchs.forEach(function(m) {
        if (!m.adversaire || seen[m.adversaire]) return;
        seen[m.adversaire] = true;
        opponents.push(m.adversaire);
    });

    if (opponents.length === 0) {
        el.innerHTML = '<div class="st-empty">Aucun adversaire</div>';
        return;
    }

    // Sort: played first, then by regional rank
    opponents.sort(function(a, b) {
        var ap = results[a] ? 1 : 0;
        var bp = results[b] ? 1 : 0;
        if (ap !== bp) return bp - ap;
        var ar = (advMap[a] || {}).rang_regional || 999;
        var br = (advMap[b] || {}).rang_regional || 999;
        return ar - br;
    });

    var html = '';
    opponents.forEach(function(name) {
        var adv = advMap[name] || {};
        var m = results[name];

        html += '<div class="adv-card">';

        // Name + rank badge
        html += '<div class="adv-top">';
        html += '<div class="adv-info">';
        html += '<span class="adv-name">' + name + '</span>';
        if (adv.nom_officiel || adv.ecole) {
            html += '<span class="adv-school">' + (adv.nom_officiel || adv.ecole) + '</span>';
        }
        html += '</div>';
        if (adv.rang_regional) {
            var topCls = adv.rang_regional <= 2 ? ' top' : '';
            html += '<div class="adv-badge' + topCls + '">' + adv.rang_regional + (adv.rang_regional === 1 ? 'er' : 'e') + '</div>';
        }
        html += '</div>';

        // Region
        if (adv.region_rseq) {
            html += '<div class="adv-region">' + adv.region_rseq + '</div>';
        }

        // RSEQ season stats bar
        if (adv.sets_gagnes != null) {
            var totalS = (adv.sets_gagnes || 0) + (adv.sets_perdus || 0);
            var rate = totalS > 0 ? Math.round((adv.sets_gagnes / totalS) * 100) : 0;
            html += '<div class="adv-rseq">';
            html += '<span class="adv-rseq-txt">Saison RSEQ\u00a0: ' + adv.sets_gagnes + 'G\u2013' + adv.sets_perdus + 'P';
            if (adv.matchs_joues) html += ' (' + adv.matchs_joues + ' matchs)';
            html += '</span>';
            html += '<div class="adv-rseq-bar"><div class="adv-rseq-fill" style="width:' + rate + '%"></div></div>';
            html += '</div>';
        }

        // Our result
        if (m) {
            var isWin = m.statut === 'win';
            var isDraw = m.statut === 'draw';
            var rc = isWin ? 'win' : (isDraw ? 'draw' : 'loss');
            var rt = isWin ? 'Victoire' : (isDraw ? '\u00c9galit\u00e9' : 'D\u00e9faite');
            var sc = [];
            if (m.aq_set1 != null) sc.push(m.aq_set1 + '\u2013' + m.adv_set1);
            if (m.aq_set2 != null) sc.push(m.aq_set2 + '\u2013' + m.adv_set2);
            if (m.aq_set3 != null) sc.push(m.aq_set3 + '\u2013' + m.adv_set3);

            html += '<div class="adv-result ' + rc + '">';
            html += '<span class="adv-res-tag">' + rt + '</span>';
            html += '<span class="adv-res-sc">' + sc.join(' / ') + '</span>';
            html += '</div>';
        } else {
            html += '<div class="adv-result upcoming"><span class="adv-res-tag">\u00c0 venir</span></div>';
        }

        html += '</div>';
    });

    el.innerHTML = html;
}

// ==========================================
// INIT
// ==========================================

async function init(slug) {
    if (cleanup) cleanup();
    showLoading(app);

    try {
        var config = await getTournoiConfig(slug);

        var data = await Promise.all([
            fetchRows('matchs', { tournoi_id: config.id }, { order: 'numero' }),
            fetchRows('adversaires', { tournoi_id: config.id })
        ]);

        var matchs = data[0] || [];
        var advList = data[1] || [];
        var advMap = {};
        advList.forEach(function(a) { advMap[a.nom_tournoi] = a; });

        app.innerHTML = buildPageHTML(config.nom);

        var stats = computeStats(matchs);
        renderPerformance(stats);
        renderMatchResults(stats, advMap);
        renderAdversaires(advMap, matchs);

        cleanup = function() {};
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
