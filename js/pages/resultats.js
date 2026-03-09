// js/pages/resultats.js
import { getTournoiActif, getTournoiConfig, setTournoiActif, listTournois } from '../config.js';
import { getClient, fetchRows, subscribe, removeAllChannels } from '../lib/supabase.js';
import { parseCSV, fetchSheet } from '../lib/sheets.js';
import { showLoading, showError } from '../lib/ui.js';
import '../components/app-header.js';
import '../components/match-card.js';

var app = document.getElementById('app');
var cleanup = null;

// ==========================================
// PAGE HTML STRUCTURE
// ==========================================

function buildPageHTML() {
    return '' +
        '<!-- BILAN -->' +
        '<div class="bilan">' +
            '<div class="bilan-item">' +
                '<div class="bilan-number wins" id="bilanWins">-</div>' +
                '<div class="bilan-label">Victoires</div>' +
            '</div>' +
            '<div class="bilan-separator"></div>' +
            '<div class="bilan-item">' +
                '<div class="bilan-number" id="bilanDraws" style="color:#FFC107">-</div>' +
                '<div class="bilan-label">\u00c9galit\u00e9s</div>' +
            '</div>' +
            '<div class="bilan-separator"></div>' +
            '<div class="bilan-item">' +
                '<div class="bilan-number losses" id="bilanLosses">-</div>' +
                '<div class="bilan-label">D\u00e9faites</div>' +
            '</div>' +
            '<div class="bilan-separator"></div>' +
            '<div class="bilan-item">' +
                '<div class="bilan-number sets-w" id="bilanSetsW">-</div>' +
                '<div class="bilan-label">Sets gagn\u00e9s</div>' +
            '</div>' +
            '<div class="bilan-separator"></div>' +
            '<div class="bilan-item">' +
                '<div class="bilan-number sets-l" id="bilanSetsL">-</div>' +
                '<div class="bilan-label">Sets perdus</div>' +
            '</div>' +
        '</div>' +

        '<!-- SCOREBOARD -->' +
        '<div class="scoreboard" id="scoreboard"></div>' +

        '<!-- SCOREKEEPER -->' +
        '<div class="scorekeeper" id="scorekeeper">' +
            '<div class="sk-match-select">' +
                '<select id="skMatchSelect">' +
                    '<option value="">-- Marquer un match --</option>' +
                '</select>' +
            '</div>' +
            '<div class="sk-panel" id="skPanel">' +
                '<div class="sk-set-indicator">' +
                    '<span class="sk-set-label">Sets</span>' +
                    '<div class="sk-set-bubble active" id="skBub1">1</div>' +
                    '<div class="sk-set-bubble" id="skBub2">2</div>' +
                    '<div class="sk-set-bubble" id="skBub3">3</div>' +
                '</div>' +
                '<div class="sk-scoreboard" id="skScoreboard">' +
                    '<div class="sk-side aq" id="skSideAq">' +
                        '<div class="sk-team-name">Aquilons</div>' +
                        '<div class="sk-points" id="skScoreAq">0</div>' +
                        '<div class="sk-tap-hint">+</div>' +
                    '</div>' +
                    '<div class="sk-side adv" id="skSideAdv">' +
                        '<div class="sk-team-name" id="skAdvName">Adversaire</div>' +
                        '<div class="sk-adv-info" id="skAdvInfo"></div>' +
                        '<div class="sk-points" id="skScoreAdv">0</div>' +
                        '<div class="sk-tap-hint">+</div>' +
                    '</div>' +
                '</div>' +
                '<div class="sk-minus-row" id="skMinusRow">' +
                    '<button class="sk-minus aq" id="skMinusAq">\u2212</button>' +
                    '<button class="sk-minus adv" id="skMinusAdv">\u2212</button>' +
                '</div>' +
                '<div class="sk-controls" id="skControls">' +
                    '<button class="sk-btn" id="skResetBtn">Reset set</button>' +
                '</div>' +
                '<div class="sk-set-history" id="skSetHistory"></div>' +
                '<div class="sk-result-banner" id="skResult"></div>' +
                '<div class="sk-sync" id="skSync"></div>' +
            '</div>' +
        '</div>' +

        '<!-- MATCHS -->' +
        '<div class="matches">' +
            '<div class="section-title">Matchs du jour</div>' +
            '<div class="last-update" id="lastUpdate">Chargement...</div>' +
            '<div id="matchsContainer"></div>' +
        '</div>' +

        '<div class="footer" id="pageFooter">' +
            'Aquilons \u00b7 Jean de Br\u00e9beuf' +
        '</div>';
}

// ==========================================
// ADVERSAIRES
// ==========================================

var adversairesMap = {};

async function loadAdversaires(config) {
    var data = await fetchRows('adversaires', { tournoi_id: config.id }, {
        select: 'nom_tournoi,region_rseq,rang_regional,nom_officiel,ecole,sets_gagnes,sets_perdus,points_pour,points_contre,matchs_joues'
    });
    adversairesMap = {};
    if (data) data.forEach(function(a) { adversairesMap[a.nom_tournoi] = a; });
}

function advInfoText(nom) {
    var a = adversairesMap[nom];
    if (!a) return '';
    var parts = [];
    if (a.region_rseq) parts.push(a.region_rseq);
    if (a.rang_regional) parts.push(a.rang_regional + (a.rang_regional === 1 ? 'er' : 'e') + ' r\u00e9gional');
    return parts.join(' \u00b7 ');
}

// ==========================================
// MATCH LIST (spectator view)
// ==========================================

async function loadMatchs(config) {
    var data = await fetchRows('matchs', { tournoi_id: config.id }, { order: 'numero' });
    if (!data) return;
    renderMatchs(data);
    updateBilan(data);
    buildMatchDropdown(data);
}

function renderScoreboard(matchs) {
    var container = document.getElementById('scoreboard');
    var live = matchs.find(function(m) { return m.statut === 'live'; });
    var next = !live ? matchs.find(function(m) { return m.statut === 'upcoming'; }) : null;
    var target = live || next;

    if (!target) {
        container.innerHTML = '';
        return;
    }

    var isLive = !!live;
    var aqScore = isLive ? (target.aq_score_courant || 0) : 0;
    var advScore = isLive ? (target.adv_score_courant || 0) : 0;
    var setInfo = '';

    if (isLive && target.set_courant > 0) {
        setInfo = 'Set ' + target.set_courant + ' en cours';
    } else if (!isLive) {
        setInfo = target.heure + (target.match_externe ? ' \u00b7 M' + target.match_externe : '');
    }

    var setsHtml = '';
    var setData = [
        { label: 'S1', aq: target.aq_set1, adv: target.adv_set1 },
        { label: 'S2', aq: target.aq_set2, adv: target.adv_set2 },
        { label: 'S3', aq: target.aq_set3, adv: target.adv_set3 }
    ];
    var hasSetData = setData.some(function(s) { return s.aq != null; });
    if (hasSetData) {
        setsHtml = '<div class="sb-sets-summary">';
        setData.forEach(function(s) {
            if (s.aq != null) {
                var w = s.aq > s.adv;
                setsHtml += '<span class="sb-set-chip ' + (w ? 'won' : 'lost') + '">' + s.label + ': ' + s.aq + '-' + s.adv + '</span>';
            }
        });
        setsHtml += '</div>';
    }

    var venueHtml = '';
    if (!isLive && target.lieu_nom) {
        venueHtml = '<div class="sb-match-time"><span class="venue">' + target.lieu_nom + ' \u2014 ' + target.terrain + '</span></div>';
    }

    container.innerHTML =
        '<div class="scoreboard-card ' + (isLive ? 'is-live' : 'is-upcoming') + '">' +
            '<div class="sb-status ' + (isLive ? 'live' : 'upcoming') + '">' +
                (isLive ? '\u25CF En cours' : 'Prochain match') +
            '</div>' +
            '<div class="sb-teams">' +
                '<div class="sb-team">' +
                    '<div class="sb-team-name aq">Aquilons</div>' +
                    '<div class="sb-score aq">' + aqScore + '</div>' +
                '</div>' +
                '<div class="sb-vs">-</div>' +
                '<div class="sb-team">' +
                    '<div class="sb-team-name adv">' + target.adversaire + '</div>' +
                    '<div class="sb-score adv">' + advScore + '</div>' +
                '</div>' +
            '</div>' +
            '<div class="sb-set-info">' + setInfo + '</div>' +
            setsHtml +
            venueHtml +
            '<button class="sk-toggle-btn" id="skToggleBtn">Scorekeeper</button>' +
        '</div>';

    // Wire toggle button
    document.getElementById('skToggleBtn').addEventListener('click', function() {
        toggleScorekeeper();
    });
}

function renderMatchs(matchs) {
    var container = document.getElementById('matchsContainer');
    var elimSepShown = false;

    container.innerHTML = '';
    matchs.forEach(function(m) {
        if (!elimSepShown && m.match_externe) {
            elimSepShown = true;
            var sep = document.createElement('div');
            sep.className = 'section-title';
            sep.style.margin = '1.5rem 0 1rem';
            sep.textContent = '\u00c9liminatoires';
            container.appendChild(sep);
        }
        var card = document.createElement('match-card');
        card.data = { match: m, adversaires: adversairesMap };
        container.appendChild(card);
    });

    renderScoreboard(matchs);

    var updateEl = document.getElementById('lastUpdate');
    var liveMatch = matchs.find(function(m) { return m.statut === 'live'; });
    var played = matchs.filter(function(m) { return m.statut === 'win' || m.statut === 'loss'; }).length;
    if (liveMatch) {
        updateEl.textContent = 'En cours : vs ' + liveMatch.adversaire + ' (Set ' + liveMatch.set_courant + ' : ' + liveMatch.aq_score_courant + '-' + liveMatch.adv_score_courant + ')';
    } else if (played > 0) {
        updateEl.textContent = played + '/' + matchs.length + ' matchs jou\u00e9s';
    } else {
        var nextMatch = matchs.find(function(m) { return m.statut === 'upcoming'; });
        if (nextMatch) {
            updateEl.textContent = 'Prochain match : ' + nextMatch.heure + ' vs ' + nextMatch.adversaire;
        } else {
            updateEl.textContent = 'Tous les matchs sont termin\u00e9s';
        }
    }
}

function updateBilan(matchs) {
    var wins = 0, losses = 0, draws = 0, setsW = 0, setsL = 0;
    matchs.forEach(function(m) {
        if (m.statut === 'win') wins++;
        if (m.statut === 'loss') losses++;
        if (m.statut === 'draw') draws++;
        if (m.aq_set1 != null && m.adv_set1 != null) { m.aq_set1 > m.adv_set1 ? setsW++ : setsL++; }
        if (m.aq_set2 != null && m.adv_set2 != null) { m.aq_set2 > m.adv_set2 ? setsW++ : setsL++; }
        if (m.aq_set3 != null && m.adv_set3 != null) { m.aq_set3 > m.adv_set3 ? setsW++ : setsL++; }
    });
    document.getElementById('bilanWins').textContent = wins;
    document.getElementById('bilanDraws').textContent = draws;
    document.getElementById('bilanLosses').textContent = losses;
    document.getElementById('bilanSetsW').textContent = setsW;
    document.getElementById('bilanSetsL').textContent = setsL;
}

// ==========================================
// SCOREKEEPER STATE
// ==========================================

var sk = {
    matchNum: null,
    advName: '',
    currentSet: 1,
    aqScore: 0,
    advScore: 0,
    sets: [],
    pointLog: [],
    matchDone: false,
    setTimestamps: { set1_debut: null, set1_fin: null, set2_debut: null, set2_fin: null, set3_debut: null, set3_fin: null }
};

var matchDbId = null;
var SK_KEY = 'aquilons-sk-cvs';
var currentConfig = null;

function skSave() {
    try { localStorage.setItem(SK_KEY, JSON.stringify(sk)); } catch(e) {}
}

function skLoad() {
    try {
        var s = localStorage.getItem(SK_KEY);
        if (s) {
            sk = JSON.parse(s);
            if (sk.matchNum) {
                document.getElementById('skMatchSelect').value = sk.matchNum;
                document.getElementById('skAdvName').textContent = sk.advName;
                document.getElementById('skAdvInfo').textContent = advInfoText(sk.advName);
                document.getElementById('skPanel').classList.add('show');
                skApplyUI();
                getClient().from('matchs').select('id')
                    .eq('tournoi_id', currentConfig.id)
                    .eq('numero', parseInt(sk.matchNum))
                    .single()
                    .then(function(res) { if (res.data) matchDbId = res.data.id; });
            }
        }
    } catch(e) {}
}

// ==========================================
// SCOREKEEPER UI
// ==========================================

function skApplyUI() {
    document.getElementById('skScoreAq').textContent = sk.aqScore;
    document.getElementById('skScoreAdv').textContent = sk.advScore;
    skUpdateBubbles();
    skRenderSetHistory();
    if (sk.matchDone) skShowResult();
    skUpdateDisabled();
}

function skUpdateBubbles() {
    var bubbles = [document.getElementById('skBub1'), document.getElementById('skBub2'), document.getElementById('skBub3')];
    bubbles.forEach(function(b, i) {
        b.className = 'sk-set-bubble';
        if (i < sk.sets.length) {
            b.classList.add(sk.sets[i].aq > sk.sets[i].adv ? 'won' : 'lost');
        } else if (i === sk.sets.length && !sk.matchDone) {
            b.classList.add('active');
        }
    });
}

function setDuration(setNum) {
    var ts = sk.setTimestamps || {};
    var debut = ts['set' + setNum + '_debut'];
    var fin = ts['set' + setNum + '_fin'];
    if (!debut || !fin) return '';
    var ms = new Date(fin) - new Date(debut);
    var mins = Math.floor(ms / 60000);
    var secs = Math.floor((ms % 60000) / 1000);
    return mins + ':' + String(secs).padStart(2, '0');
}

function skRenderSetHistory() {
    document.getElementById('skSetHistory').innerHTML = sk.sets.map(function(s, i) {
        var won = s.aq > s.adv;
        var dur = setDuration(i + 1);
        var durHtml = dur ? ' <span style="font-size:0.6rem;color:var(--gray);font-weight:400">(' + dur + ')</span>' : '';
        return '<div class="sk-set-result">' +
            '<span class="sn">Set ' + (i + 1) + '</span>' +
            '<span class="ss ' + (won ? 'won' : 'lost') + '">' + s.aq + ' - ' + s.adv + durHtml + '</span>' +
            '<span class="sw ' + (won ? 'aq' : 'adv') + '">' + (won ? 'Aquilons' : sk.advName) + '</span>' +
        '</div>';
    }).join('');
}

function skUpdateDisabled() {
    var disabled = !sk.matchNum || sk.matchDone;
    document.getElementById('skScoreboard').className = 'sk-scoreboard' + (disabled ? ' disabled' : '');
    document.getElementById('skMinusRow').className = 'sk-minus-row' + (disabled ? ' disabled' : '');
    document.getElementById('skControls').className = 'sk-controls' + (disabled ? ' disabled' : '');
}

function skSetSync(text, cls) {
    var el = document.getElementById('skSync');
    el.textContent = text;
    el.className = 'sk-sync ' + (cls || '');
}

// ==========================================
// SCOREKEEPER SYNC
// ==========================================

function skSync() {
    if (!matchDbId) return;
    var sb = getClient();
    var ts = sk.setTimestamps || {};
    var updates = {
        aq_score_courant: sk.aqScore,
        adv_score_courant: sk.advScore,
        set_courant: sk.currentSet,
        aq_set1: sk.sets.length >= 1 ? sk.sets[0].aq : null,
        adv_set1: sk.sets.length >= 1 ? sk.sets[0].adv : null,
        aq_set2: sk.sets.length >= 2 ? sk.sets[1].aq : null,
        adv_set2: sk.sets.length >= 2 ? sk.sets[1].adv : null,
        aq_set3: sk.sets.length >= 3 ? sk.sets[2].aq : null,
        adv_set3: sk.sets.length >= 3 ? sk.sets[2].adv : null,
        set1_debut: ts.set1_debut || null,
        set1_fin: ts.set1_fin || null,
        set2_debut: ts.set2_debut || null,
        set2_fin: ts.set2_fin || null,
        set3_debut: ts.set3_debut || null,
        set3_fin: ts.set3_fin || null
    };
    if (sk.matchDone) {
        var setsWon = sk.sets.filter(function(s) { return s.aq > s.adv; }).length;
        var setsLost = sk.sets.length - setsWon;
        updates.statut = setsWon > setsLost ? 'win' : setsWon < setsLost ? 'loss' : 'draw';
        updates.set_courant = 0;
    } else {
        updates.statut = 'live';
    }
    sb.from('matchs').update(updates).eq('id', matchDbId).then(function(res) {
        if (res.error) skSetSync('Erreur sync', 'error');
        else skSetSync('Sync OK', 'connected');
    });
}

// ==========================================
// SCOREKEEPER ACTIONS
// ==========================================

function skSelectMatch() {
    var sel = document.getElementById('skMatchSelect');
    var opt = sel.options[sel.selectedIndex];
    if (!opt.value) {
        document.getElementById('skPanel').classList.remove('show');
        return;
    }

    sk = {
        matchNum: opt.value,
        advName: opt.dataset.adv,
        currentSet: 1,
        aqScore: 0,
        advScore: 0,
        sets: [],
        pointLog: [],
        matchDone: false,
        setTimestamps: { set1_debut: null, set1_fin: null, set2_debut: null, set2_fin: null, set3_debut: null, set3_fin: null }
    };

    document.getElementById('skAdvName').textContent = sk.advName;
    document.getElementById('skAdvInfo').textContent = advInfoText(sk.advName);
    document.getElementById('skScoreAq').textContent = '0';
    document.getElementById('skScoreAdv').textContent = '0';
    document.getElementById('skSetHistory').innerHTML = '';
    document.getElementById('skResult').className = 'sk-result-banner';
    document.getElementById('skResult').innerHTML = '';
    document.getElementById('skPanel').classList.add('show');
    skUpdateBubbles();
    skUpdateDisabled();
    skSave();

    var sbClient = getClient();
    sbClient.from('matchs').select('id')
        .eq('tournoi_id', currentConfig.id)
        .eq('numero', parseInt(opt.value))
        .single()
        .then(function(res) {
            if (res.data) {
                matchDbId = res.data.id;
                sbClient.from('points').delete().eq('match_id', matchDbId).then(function() { skSync(); });
            }
        });
}

function skPoint(team) {
    if (!sk.matchNum || sk.matchDone) return;
    if (sk.currentSet > 3) return;

    // Record set start on first point
    var tsKey = 'set' + sk.currentSet + '_debut';
    if (!sk.setTimestamps[tsKey]) {
        sk.setTimestamps[tsKey] = new Date().toISOString();
    }

    if (team === 'aq') sk.aqScore++;
    else sk.advScore++;
    sk.pointLog.push(team);

    document.getElementById('skScoreAq').textContent = sk.aqScore;
    document.getElementById('skScoreAdv').textContent = sk.advScore;

    if (matchDbId) {
        getClient().from('points').insert({
            match_id: matchDbId,
            set_num: sk.currentSet,
            equipe: team,
            aq_score: sk.aqScore,
            adv_score: sk.advScore
        }).then(function() {});
    }

    skCheckSetEnd();
    skSave();
    skSync();
}

function skCheckSetEnd() {
    var aq = sk.aqScore, adv = sk.advScore;
    var target = sk.currentSet === 3 ? 15 : 25;
    if ((aq >= target || adv >= target) && Math.abs(aq - adv) >= 2) {
        // Record set end time
        sk.setTimestamps['set' + sk.currentSet + '_fin'] = new Date().toISOString();
        sk.sets.push({ aq: aq, adv: adv });
        skRenderSetHistory();
        skUpdateBubbles();

        var setsWonAq = sk.sets.filter(function(s) { return s.aq > s.adv; }).length;
        var setsWonAdv = sk.sets.length - setsWonAq;

        if (setsWonAq >= 2 || setsWonAdv >= 2) {
            sk.matchDone = true;
            skShowResult();
            skUpdateDisabled();
        } else {
            sk.currentSet = sk.sets.length + 1;
            sk.aqScore = 0;
            sk.advScore = 0;
            sk.pointLog = [];
            document.getElementById('skScoreAq').textContent = '0';
            document.getElementById('skScoreAdv').textContent = '0';
            skUpdateBubbles();
        }
    }
}

function skShowResult() {
    var setsWon = sk.sets.filter(function(s) { return s.aq > s.adv; }).length;
    var won = setsWon > sk.sets.length - setsWon;
    var banner = document.getElementById('skResult');
    banner.className = 'sk-result-banner show ' + (won ? 'win-banner' : 'loss-banner');
    var details = sk.sets.map(function(s, i) {
        var dur = setDuration(i + 1);
        return 'Set ' + (i + 1) + ': ' + s.aq + '-' + s.adv + (dur ? ' (' + dur + ')' : '');
    }).join(' \u00b7 ');
    banner.innerHTML =
        '<div class="rt">' + (won ? 'Victoire!' : 'D\u00e9faite') + '</div>' +
        '<div class="rd">' + details + '</div>';
}

function skMinus(team) {
    if (!sk.matchNum || sk.matchDone) return;
    if (team === 'aq' && sk.aqScore <= 0) return;
    if (team === 'adv' && sk.advScore <= 0) return;

    if (team === 'aq') sk.aqScore--;
    else sk.advScore--;

    // Remove last occurrence of this team from pointLog
    for (var i = sk.pointLog.length - 1; i >= 0; i--) {
        if (sk.pointLog[i] === team) { sk.pointLog.splice(i, 1); break; }
    }

    document.getElementById('skScoreAq').textContent = sk.aqScore;
    document.getElementById('skScoreAdv').textContent = sk.advScore;
    skSave();

    if (matchDbId) {
        var sbClient = getClient();
        sbClient.from('points').select('id')
            .eq('match_id', matchDbId)
            .eq('equipe', team)
            .order('id', { ascending: false })
            .limit(1)
            .then(function(res) {
                if (res.data && res.data[0]) sbClient.from('points').delete().eq('id', res.data[0].id).then(function() {});
            });
        skSync();
    }
}

function skResetSet() {
    if (!sk.matchNum || sk.matchDone) return;
    if (!confirm('Remettre le set \u00e0 z\u00e9ro?')) return;
    sk.aqScore = 0;
    sk.advScore = 0;
    sk.pointLog = [];
    sk.setTimestamps['set' + sk.currentSet + '_debut'] = null;
    sk.setTimestamps['set' + sk.currentSet + '_fin'] = null;
    document.getElementById('skScoreAq').textContent = '0';
    document.getElementById('skScoreAdv').textContent = '0';
    skSave();

    if (matchDbId) {
        var sbClient = getClient();
        sbClient.from('points').delete().eq('match_id', matchDbId).eq('set_num', sk.currentSet).then(function() {});
        skSync();
    }
}

// ==========================================
// DYNAMIC MATCH DROPDOWN
// ==========================================

function buildMatchDropdown(matchs) {
    var sel = document.getElementById('skMatchSelect');
    var current = sel.value;
    sel.innerHTML = '<option value="">-- Marquer un match --</option>';
    matchs.forEach(function(m) {
        if (m.statut === 'win' || m.statut === 'loss' || m.statut === 'draw') return;
        var opt = document.createElement('option');
        opt.value = m.numero;
        opt.dataset.adv = m.adversaire;
        opt.dataset.time = m.heure;
        var label = 'Match ' + m.numero + ' - ' + m.heure + ' vs ' + m.adversaire;
        if (m.match_externe) label += ' (M' + m.match_externe + ')';
        opt.textContent = label;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

// ==========================================
// BRACKET SCANNER (Day 2 elimination matches)
// ==========================================

function scanBracketForAquilon(rows) {
    var matches = [];

    // Step 1: Find all "Match N" cells
    var matchCells = [];
    for (var r = 0; r < rows.length; r++) {
        for (var c = 0; c < rows[r].length; c++) {
            var val = rows[r][c].trim();
            var mm = val.match(/^Match (\d+)$/);
            if (mm) {
                matchCells.push({ row: r, col: c, num: parseInt(mm[1]) });
            }
        }
    }

    // Step 2: For each match, find the two teams, time, and terrain
    matchCells.forEach(function(mc) {
        var team1 = null, team2 = null, time = null, terrain = null;

        // Scan nearby rows and columns for time, terrain
        for (var r = Math.max(0, mc.row - 6); r <= Math.min(rows.length - 1, mc.row + 6); r++) {
            for (var c = Math.max(0, mc.col - 3); c <= Math.min((rows[r] || []).length - 1, mc.col + 3); c++) {
                var v = (rows[r][c] || '').trim();
                if (!v) continue;
                if (!time && /^\d{1,2}h\d{2}$/.test(v)) { time = v; continue; }
                if (!terrain && /^Terrain \d+$/.test(v)) { terrain = v; continue; }
            }
        }

        // Find teams
        var teamCandidates = [];
        for (var r2 = Math.max(0, mc.row - 4); r2 <= Math.min(rows.length - 1, mc.row + 4); r2++) {
            for (var c2 = Math.max(0, mc.col - 3); c2 <= Math.min((rows[r2] || []).length - 1, mc.col + 3); c2++) {
                var v2 = (rows[r2][c2] || '').trim();
                if (!v2) continue;
                if (/^(Match|Terrain|GM|PM|\d{1,2}h\d{2}|Tournoi|Benjamin|Alma|Huiti|Quart|Demi|Finale|6-7)/.test(v2)) continue;
                if (/[a-zA-Z\u00C0-\u017F]/.test(v2) && v2.length > 1) {
                    teamCandidates.push({ row: r2, col: c2, name: v2 });
                }
            }
        }

        // Remove duplicates and sort by distance
        var seen = {};
        teamCandidates = teamCandidates.filter(function(t) {
            if (seen[t.name]) return false;
            seen[t.name] = true;
            return true;
        }).sort(function(a, b) {
            return Math.abs(a.row - mc.row) - Math.abs(b.row - mc.row);
        });

        if (teamCandidates.length >= 2) { team1 = teamCandidates[0].name; team2 = teamCandidates[1].name; }
        else if (teamCandidates.length === 1) { team1 = teamCandidates[0].name; }

        var hasAquilon = false;
        var opponent = null;
        [team1, team2].forEach(function(t) {
            if (t && /aquilon/i.test(t)) { hasAquilon = true; }
        });

        if (hasAquilon) {
            if (team1 && !/aquilon/i.test(team1)) opponent = team1;
            else if (team2 && !/aquilon/i.test(team2)) opponent = team2;
            matches.push({
                matchExterne: mc.num,
                adversaire: opponent || 'TBD',
                heure: time || '',
                terrain: terrain || ''
            });
        }
    });

    return matches;
}

async function scanBrackets(config, cfg) {
    var sheetId = cfg.sheets.id;
    var elimSheets = [];
    var elimGids = cfg.sheets.gids;
    if (elimGids.elim_d2_tier1) elimSheets.push({ gid: elimGids.elim_d2_tier1, tier: 'Tier 1' });
    if (elimGids.elim_d2_tier2) elimSheets.push({ gid: elimGids.elim_d2_tier2, tier: 'Tier 2' });

    var elimVenues = cfg.sheets.elim_venues || {};
    var allFound = [];

    for (var i = 0; i < elimSheets.length; i++) {
        var sheet = elimSheets[i];
        try {
            var rows = await fetchSheet(sheetId, sheet.gid);
            var found = scanBracketForAquilon(rows);
            found.forEach(function(f) { f.tier = sheet.tier; });
            allFound = allFound.concat(found);
        } catch(e) {
            console.error('Bracket scan error for ' + sheet.tier, e);
        }
    }

    if (allFound.length === 0) return;

    var sbClient = getClient();

    // Check existing matches
    var existing = await sbClient.from('matchs').select('match_externe,numero')
        .eq('tournoi_id', config.id)
        .not('match_externe', 'is', null);
    var existingNums = {};
    if (existing.data) existing.data.forEach(function(m) { existingNums[m.match_externe] = m.numero; });

    // Get max numero
    var allMatchs = await sbClient.from('matchs').select('numero').eq('tournoi_id', config.id).order('numero', { ascending: false }).limit(1);
    var nextNum = (allMatchs.data && allMatchs.data[0]) ? allMatchs.data[0].numero + 1 : 8;

    for (var j = 0; j < allFound.length; j++) {
        var m = allFound[j];
        if (existingNums[m.matchExterne]) {
            await sbClient.from('matchs').update({ adversaire: m.adversaire, heure: m.heure, terrain: m.terrain })
                .eq('tournoi_id', config.id)
                .eq('match_externe', m.matchExterne);
        } else {
            var terrainNum = (m.terrain.match(/\d+/) || [''])[0];
            var venue = elimVenues[terrainNum] || { nom: 'TBD', url: '' };
            await sbClient.from('matchs').insert({
                tournoi_id: config.id,
                numero: nextNum++,
                heure: m.heure,
                adversaire: m.adversaire,
                terrain: m.terrain,
                lieu_nom: venue.nom,
                lieu_maps_url: venue.url,
                statut: 'upcoming',
                match_externe: m.matchExterne
            });
        }
    }

    // Reload matches
    loadMatchs(config);
}

// ==========================================
// SCOREKEEPER TOGGLE
// ==========================================

var bracketScanStarted = false;
var bracketInterval = null;

function toggleScorekeeper() {
    var skEl = document.getElementById('scorekeeper');
    var isShown = skEl.classList.toggle('show');
    if (isShown && !bracketScanStarted && currentConfig) {
        var cfg = (currentConfig.config || {});
        if (cfg.sheets) {
            bracketScanStarted = true;
            scanBrackets(currentConfig, cfg);
            bracketInterval = setInterval(function() { scanBrackets(currentConfig, cfg); }, 120000);
        }
    }
}

// ==========================================
// INIT
// ==========================================

async function init(slug) {
    if (cleanup) cleanup();
    cleanup = null;

    showLoading(app);

    try {
        var config = await getTournoiConfig(slug);
        currentConfig = config;
        var cfg = config.config || {};
        SK_KEY = 'aquilons-sk-' + slug;

        // Build page structure
        app.innerHTML = buildPageHTML();

        // Update footer
        document.getElementById('pageFooter').innerHTML = 'Aquilons \u00b7 Jean de Br\u00e9beuf \u00b7 ' + config.nom;

        // Wire event handlers
        document.getElementById('skMatchSelect').addEventListener('change', skSelectMatch);
        document.getElementById('skSideAq').addEventListener('click', function() { skPoint('aq'); });
        document.getElementById('skSideAdv').addEventListener('click', function() { skPoint('adv'); });
        document.getElementById('skMinusAq').addEventListener('click', function() { skMinus('aq'); });
        document.getElementById('skMinusAdv').addEventListener('click', function() { skMinus('adv'); });
        document.getElementById('skResetBtn').addEventListener('click', skResetSet);

        // Check ?score parameter
        var urlParams = new URLSearchParams(window.location.search);
        bracketScanStarted = false;
        bracketInterval = null;
        if (urlParams.has('score')) {
            document.getElementById('scorekeeper').classList.add('show');
            bracketScanStarted = true;
        }

        // Load data
        await loadAdversaires(config);
        await loadMatchs(config);
        skLoad();

        // Start bracket scanner if scorekeeper is visible and tournament has sheets
        if (bracketScanStarted && cfg.sheets) {
            scanBrackets(config, cfg);
            bracketInterval = setInterval(function() { scanBrackets(config, cfg); }, 120000);
        }

        // Realtime subscription
        subscribe('matchs-realtime', 'matchs', function() { loadMatchs(config); });

        // Cleanup function
        cleanup = function() {
            removeAllChannels();
            if (bracketInterval) clearInterval(bracketInterval);
            bracketInterval = null;
            bracketScanStarted = false;
            adversairesMap = {};
            matchDbId = null;
        };

    } catch (e) {
        showError(app, 'Impossible de charger les donn\u00e9es', function() { init(slug); });
    }
}

// ==========================================
// HEADER SETUP & START
// ==========================================

var header = document.querySelector('app-header');
var tournois = await listTournois();

header.renderSelector(tournois, getTournoiActif(), function(slug) {
    setTournoiActif(slug);
    init(slug);
});

init(getTournoiActif());
