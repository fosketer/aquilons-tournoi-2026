// js/pages/scorekeeper.js
import { getTournoiActif, getTournoiConfig } from '../config.js';
import { getClient, fetchRows } from '../lib/supabase.js';
import { showLoading, showError } from '../lib/ui.js';
import '../components/app-header.js';

const app = document.getElementById('app');
const sb = getClient();

// ==========================================
// STATE
// ==========================================

var state = {
    matchNum: null,
    advName: '',
    currentSet: 1,
    aqScore: 0,
    advScore: 0,
    sets: [],
    pointLog: [],
    serviceAq: true,
    matchDone: false
};

var matchDbId = null;
var adversairesMap = {};
var config = null;
var SAVE_KEY = 'aquilons-match-state';

// ==========================================
// PERSISTENCE
// ==========================================

function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function loadState() {
    try {
        var s = localStorage.getItem(SAVE_KEY);
        if (s) {
            state = JSON.parse(s);
            applyState();
            // Restore matchDbId from Supabase
            if (state.matchNum && config) {
                sb.from('matchs').select('id')
                    .eq('tournoi_id', config.id)
                    .eq('numero', parseInt(state.matchNum))
                    .single()
                    .then(function (res) {
                        if (res.data) matchDbId = res.data.id;
                    });
            }
        }
    } catch (e) { /* ignore */ }
}

// ==========================================
// SUPABASE SYNC
// ==========================================

function syncToSupabase() {
    if (!matchDbId) return;
    var updates = {
        aq_score_courant: state.aqScore,
        adv_score_courant: state.advScore,
        set_courant: state.currentSet,
        aq_set1: state.sets.length >= 1 ? state.sets[0].aq : null,
        adv_set1: state.sets.length >= 1 ? state.sets[0].adv : null,
        aq_set2: state.sets.length >= 2 ? state.sets[1].aq : null,
        adv_set2: state.sets.length >= 2 ? state.sets[1].adv : null
    };
    if (state.matchDone) {
        var setsWon = state.sets.filter(function (s) { return s.aq > s.adv; }).length;
        var setsLost = state.sets.filter(function (s) { return s.adv > s.aq; }).length;
        updates.statut = setsWon > setsLost ? 'win' : 'loss';
        updates.set_courant = 0;
    } else {
        updates.statut = 'live';
    }
    sb.from('matchs').update(updates).eq('id', matchDbId).then(function (res) {
        if (res.error) setSyncStatus('Erreur sync: ' + res.error.message, 'error');
    });
}

function setSyncStatus(text, cls) {
    var el = document.getElementById('syncStatus');
    if (el) {
        el.textContent = text;
        el.className = 'sync-status ' + (cls || '');
    }
}

// ==========================================
// UI HELPERS
// ==========================================

function updateAdvInfo(nom) {
    var el = document.getElementById('advInfo');
    if (!el) return;
    var a = adversairesMap[nom];
    if (!a) { el.textContent = ''; return; }
    var parts = [];
    if (a.region_rseq) parts.push(a.region_rseq);
    if (a.rang_regional) parts.push(a.rang_regional + (a.rang_regional === 1 ? 'er' : 'e') + ' r\u00e9gional');
    el.textContent = parts.join(' \u00b7 ');
}

function applyState() {
    if (state.matchNum) {
        var sel = document.getElementById('matchSelect');
        if (sel) sel.value = state.matchNum;
        var advEl = document.getElementById('advName');
        if (advEl) advEl.textContent = state.advName;
        updateAdvInfo(state.advName);
    }
    var scoreAqEl = document.getElementById('scoreAq');
    var scoreAdvEl = document.getElementById('scoreAdv');
    if (scoreAqEl) scoreAqEl.textContent = state.aqScore;
    if (scoreAdvEl) scoreAdvEl.textContent = state.advScore;
    updateSetBubbles();
    renderSetHistory();
    renderPointLog();
    updateService();
    if (state.matchDone) showMatchResult();
    updateDisabledState();
}

function updateSetBubbles() {
    var b1 = document.getElementById('set1Bubble');
    var b2 = document.getElementById('set2Bubble');
    if (!b1 || !b2) return;

    b1.className = 'set-bubble';
    b2.className = 'set-bubble';

    if (state.sets.length === 0) {
        b1.classList.add('active');
    } else if (state.sets.length === 1) {
        var s = state.sets[0];
        b1.classList.add(s.aq > s.adv ? 'won' : 'lost');
        b2.classList.add('active');
    } else if (state.sets.length >= 2) {
        var s1 = state.sets[0];
        var s2 = state.sets[1];
        b1.classList.add(s1.aq > s1.adv ? 'won' : 'lost');
        b2.classList.add(s2.aq > s2.adv ? 'won' : 'lost');
    }
}

function renderSetHistory() {
    var container = document.getElementById('setHistory');
    if (!container) return;
    container.innerHTML = state.sets.map(function (s, i) {
        var won = s.aq > s.adv;
        return '<div class="set-result">' +
            '<span class="set-name">Set ' + (i + 1) + '</span>' +
            '<span class="set-scores ' + (won ? 'won' : 'lost') + '">' + s.aq + ' - ' + s.adv + '</span>' +
            '<span class="set-winner ' + (won ? 'aq' : 'adv') + '">' + (won ? 'Aquilons' : state.advName) + '</span>' +
            '</div>';
    }).join('');
}

function renderPointLog() {
    var inner = document.getElementById('pointLogInner');
    if (!inner) return;
    inner.innerHTML = state.pointLog.map(function (p) {
        return '<div class="point-pip ' + (p === 'aq' ? 'aq' : 'adv') + '">' + (p === 'aq' ? 'A' : 'V') + '</div>';
    }).join('');
    inner.scrollTop = inner.scrollHeight;
}

function toggleLog() {
    var el = document.getElementById('pointLog');
    if (el) el.classList.toggle('show');
}

function updateDisabledState() {
    var disabled = !state.matchNum || state.matchDone;
    var scoreboard = document.getElementById('scoreboard');
    var minusRow = document.getElementById('minusRow');
    var controls = document.getElementById('controls');
    if (scoreboard) scoreboard.className = 'scoreboard' + (disabled ? ' disabled' : '');
    if (minusRow) minusRow.className = 'minus-row' + (disabled ? ' disabled' : '');
    if (controls) controls.className = 'controls' + (disabled ? ' disabled' : '');
}

function showMatchResult() {
    var setsWon = state.sets.filter(function (s) { return s.aq > s.adv; }).length;
    var setsLost = state.sets.filter(function (s) { return s.adv > s.aq; }).length;
    var won = setsWon > setsLost;

    var banner = document.getElementById('matchResult');
    if (!banner) return;
    banner.className = 'match-result-banner show ' + (won ? 'win-banner' : 'loss-banner');

    var s1 = state.sets[0];
    var s2 = state.sets[1];

    banner.innerHTML =
        '<div class="result-text">' + (won ? 'Victoire!' : 'D\u00e9faite') + '</div>' +
        '<div class="result-detail">Set 1: ' + s1.aq + '-' + s1.adv + ' &middot; Set 2: ' + s2.aq + '-' + s2.adv + '</div>';

    updateDisabledState();
}

function updateService() {
    var sAq = document.getElementById('serviceAq');
    var sAdv = document.getElementById('serviceAdv');
    if (sAq) sAq.className = 'service-dot' + (state.serviceAq ? ' active' : '');
    if (sAdv) sAdv.className = 'service-dot' + (!state.serviceAq ? ' active' : '');
}

// ==========================================
// MATCH SELECTION
// ==========================================

function selectMatch() {
    var sel = document.getElementById('matchSelect');
    var opt = sel.options[sel.selectedIndex];
    if (!opt.value) return;

    state = {
        matchNum: opt.value,
        advName: opt.dataset.adv,
        currentSet: 1,
        aqScore: 0,
        advScore: 0,
        sets: [],
        pointLog: [],
        serviceAq: true,
        matchDone: false
    };

    document.getElementById('advName').textContent = state.advName;
    updateAdvInfo(state.advName);
    document.getElementById('scoreAq').textContent = '0';
    document.getElementById('scoreAdv').textContent = '0';
    document.getElementById('setHistory').innerHTML = '';
    document.getElementById('matchResult').className = 'match-result-banner';
    document.getElementById('matchResult').innerHTML = '';
    document.getElementById('pointLogInner').innerHTML = '';
    updateSetBubbles();
    updateService();
    updateDisabledState();
    saveState();

    // Get match UUID from Supabase and set as live
    sb.from('matchs').select('id')
        .eq('tournoi_id', config.id)
        .eq('numero', parseInt(opt.value))
        .single()
        .then(function (res) {
            if (res.data) {
                matchDbId = res.data.id;
                // Delete old points for this match (fresh start)
                sb.from('points').delete().eq('match_id', matchDbId).then(function () {
                    syncToSupabase();
                });
            }
        });
}

// ==========================================
// SCORING
// ==========================================

function addPoint(team) {
    if (!state.matchNum || state.matchDone) return;
    if (state.currentSet > 2) return;

    if (team === 'aq') state.aqScore++;
    else state.advScore++;

    state.pointLog.push(team);

    document.getElementById('scoreAq').textContent = state.aqScore;
    document.getElementById('scoreAdv').textContent = state.advScore;

    state.serviceAq = (team === 'aq');
    updateService();
    renderPointLog();

    // Insert point to Supabase
    if (matchDbId) {
        sb.from('points').insert({
            match_id: matchDbId,
            set_num: state.currentSet,
            equipe: team,
            aq_score: state.aqScore,
            adv_score: state.advScore
        }).then(function () {});
    }

    checkSetEnd();
    saveState();
    syncToSupabase();
}

function checkSetEnd() {
    var aq = state.aqScore;
    var adv = state.advScore;

    if ((aq >= 25 || adv >= 25) && Math.abs(aq - adv) >= 2) {
        state.sets.push({ aq: aq, adv: adv });
        renderSetHistory();
        updateSetBubbles();

        if (state.sets.length >= 2) {
            state.matchDone = true;
            showMatchResult();
            updateDisabledState();
        } else {
            state.currentSet = 2;
            state.aqScore = 0;
            state.advScore = 0;
            state.pointLog = [];
            document.getElementById('scoreAq').textContent = '0';
            document.getElementById('scoreAdv').textContent = '0';
            document.getElementById('pointLogInner').innerHTML = '';
            updateSetBubbles();
        }
    }
}

// ==========================================
// CONTROLS
// ==========================================

function minus(team) {
    if (!state.matchNum || state.matchDone) return;
    if (team === 'aq' && state.aqScore <= 0) return;
    if (team === 'adv' && state.advScore <= 0) return;

    if (team === 'aq') state.aqScore--;
    else state.advScore--;

    // Remove last occurrence of this team from pointLog
    for (var i = state.pointLog.length - 1; i >= 0; i--) {
        if (state.pointLog[i] === team) { state.pointLog.splice(i, 1); break; }
    }

    document.getElementById('scoreAq').textContent = state.aqScore;
    document.getElementById('scoreAdv').textContent = state.advScore;
    renderPointLog();
    saveState();

    // Delete last point for this team from Supabase
    if (matchDbId) {
        sb.from('points').select('id')
            .eq('match_id', matchDbId)
            .eq('equipe', team)
            .order('id', { ascending: false })
            .limit(1)
            .then(function (res) {
                if (res.data && res.data[0]) {
                    sb.from('points').delete().eq('id', res.data[0].id).then(function () {});
                }
            });
        syncToSupabase();
    }
}

function resetSet() {
    if (!state.matchNum || state.matchDone) return;
    if (!confirm('Remettre le set \u00e0 z\u00e9ro?')) return;

    state.aqScore = 0;
    state.advScore = 0;
    state.pointLog = [];
    document.getElementById('scoreAq').textContent = '0';
    document.getElementById('scoreAdv').textContent = '0';
    document.getElementById('pointLogInner').innerHTML = '';
    saveState();

    // Delete points for current set in Supabase
    if (matchDbId) {
        sb.from('points').delete()
            .eq('match_id', matchDbId)
            .eq('set_num', state.currentSet)
            .then(function () {});
        syncToSupabase();
    }
}

function switchService() {
    state.serviceAq = !state.serviceAq;
    updateService();
    saveState();
}

// ==========================================
// PAGE HTML
// ==========================================

function buildPageHTML(matchOptions) {
    return '' +
        // Match selector
        '<div class="match-selector">' +
            '<select id="matchSelect">' +
                '<option value="">-- Choisir un match --</option>' +
                matchOptions +
            '</select>' +
        '</div>' +

        // Sync status
        '<div class="sync-status" id="syncStatus">Supabase: connexion...</div>' +

        // Set indicator
        '<div class="set-indicator">' +
            '<span class="set-label">Sets</span>' +
            '<div class="set-bubble active" id="set1Bubble">1</div>' +
            '<div class="set-bubble" id="set2Bubble">2</div>' +
        '</div>' +

        // Scoreboard
        '<div class="scoreboard" id="scoreboard">' +
            '<div class="score-side aquilon" id="tapAq">' +
                '<div class="score-team-name">Aquilons <span class="service-dot" id="serviceAq"></span></div>' +
                '<div class="score-points" id="scoreAq">0</div>' +
                '<div class="score-tap-hint">+</div>' +
            '</div>' +
            '<div class="score-side adversaire" id="tapAdv">' +
                '<div class="score-team-name"><span id="advName">Adversaire</span> <span class="service-dot" id="serviceAdv"></span></div>' +
                '<div class="adv-info" id="advInfo"></div>' +
                '<div class="score-points" id="scoreAdv">0</div>' +
                '<div class="score-tap-hint">+</div>' +
            '</div>' +
        '</div>' +

        // Minus buttons
        '<div class="minus-row" id="minusRow">' +
            '<button class="minus-btn aq" id="minusAq">&minus;</button>' +
            '<button class="minus-btn adv" id="minusAdv">&minus;</button>' +
        '</div>' +

        // Controls
        '<div class="controls" id="controls">' +
            '<button class="btn" id="btnReset">Reset set</button>' +
            '<button class="btn" id="btnService">Service</button>' +
        '</div>' +

        // Set history
        '<div class="set-history" id="setHistory"></div>' +

        // Match result
        '<div class="match-result-banner" id="matchResult"></div>' +

        // Point log
        '<div class="point-log-toggle">' +
            '<button id="btnToggleLog">Voir le d\u00e9tail des points</button>' +
        '</div>' +
        '<div class="point-log" id="pointLog">' +
            '<div class="point-log-inner" id="pointLogInner"></div>' +
        '</div>' +

        // Footer
        '<div class="footer">Aquilons &middot; Jean de Br\u00e9beuf</div>';
}

// ==========================================
// EVENT WIRING
// ==========================================

function wireEvents() {
    document.getElementById('tapAq').addEventListener('click', function () { addPoint('aq'); });
    document.getElementById('tapAdv').addEventListener('click', function () { addPoint('adv'); });
    document.getElementById('minusAq').addEventListener('click', function () { minus('aq'); });
    document.getElementById('minusAdv').addEventListener('click', function () { minus('adv'); });
    document.getElementById('btnReset').addEventListener('click', function () { resetSet(); });
    document.getElementById('btnService').addEventListener('click', function () { switchService(); });
    document.getElementById('btnToggleLog').addEventListener('click', function () { toggleLog(); });
    document.getElementById('matchSelect').addEventListener('change', function () { selectMatch(); });
}

// ==========================================
// INIT
// ==========================================

async function init() {
    showLoading(app);

    try {
        var slug = getTournoiActif();
        config = await getTournoiConfig(slug);

        // Scope localStorage key per tournament
        SAVE_KEY = 'aquilons-match-state-' + slug;

        // Load adversaires map
        var advData = await fetchRows('adversaires', { tournoi_id: config.id }, { select: 'nom_tournoi,region_rseq,rang_regional' });
        if (advData) {
            advData.forEach(function (a) { adversairesMap[a.nom_tournoi] = a; });
        }

        // Fetch matches dynamically from Supabase (exclude completed)
        var matchs = await fetchRows('matchs', { tournoi_id: config.id }, { order: 'numero' });

        // Build <select> options from matchs
        var matchOptions = matchs.map(function (m) {
            var completed = (m.statut === 'win' || m.statut === 'loss' || m.statut === 'draw');
            if (completed) return '';
            return '<option value="' + m.numero + '" data-adv="' + escapeAttr(m.adversaire) + '">' +
                'Match ' + m.numero + (m.heure ? ' - ' + m.heure : '') + ' vs ' + escapeHTML(m.adversaire) +
                '</option>';
        }).join('');

        // Build page
        app.innerHTML = buildPageHTML(matchOptions);

        // Wire event listeners
        wireEvents();

        // Restore saved state from localStorage
        loadState();
        updateDisabledState();

        // Test Supabase connection
        sb.from('matchs').select('id').limit(1).then(function (res) {
            if (res.error) { setSyncStatus('Supabase: erreur', 'error'); }
            else { setSyncStatus('Supabase: connect\u00e9', 'connected'); }
        });

    } catch (e) {
        showError(app, 'Impossible de charger les donn\u00e9es', function () { init(); });
    }
}

// ==========================================
// HELPERS
// ==========================================

function escapeHTML(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ==========================================
// START
// ==========================================

init();
