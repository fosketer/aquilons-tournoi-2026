// js/pages/resultats.js
import { getTournoiActif, getTournoiConfig, setTournoiActif, listTournois } from '../config.js';
import { getClient, fetchRows, subscribe, removeAllChannels } from '../lib/supabase.js';
import { createEngine } from '../lib/scorekeeper-engine.js';
import { fetchSheet } from '../lib/sheets.js';
import { showLoading, showError, escapeHTML, formatAdversaryInfo } from '../lib/ui.js';
import { polling } from '../lib/polling.js';
import { BRACKET_SCAN_INTERVAL_MS, MATCH_POLL_INTERVAL_MS } from '../lib/constants.js';
import { scanBracketForAquilon } from '../modules/bracket-scanner.js';
import { computeBilan, formatSetInfo } from '../modules/match-renderer.js';
import '../components/app-header.js';
import '../components/match-card.js';

const app = document.getElementById('app');
let cleanup = null;

// ==========================================
// PAGE HTML STRUCTURE
// ==========================================

function buildPageHTML(maxSets) {
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
                    (function() { let h=''; for(let i=1;i<=maxSets;i++) h+='<div class="sk-set-bubble'+(i===1?' active':'')+'" id="skBub'+i+'">'+i+'</div>'; return h; })() +
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

let adversairesMap = {};

async function loadAdversaires(config) {
    const data = await fetchRows('adversaires', { tournoi_id: config.id }, {
        select: 'nom_tournoi,region_rseq,rang_regional,nom_officiel,ecole,sets_gagnes,sets_perdus,points_pour,points_contre,matchs_joues'
    });
    adversairesMap = {};
    if (data) data.forEach(function(a) { adversairesMap[a.nom_tournoi] = a; });
}

function advInfoText(nom) {
    return formatAdversaryInfo(adversairesMap[nom]);
}

// ==========================================
// MATCH LIST (spectator view)
// ==========================================

async function loadMatchs(config) {
    const data = await fetchRows('matchs', { tournoi_id: config.id }, { order: 'numero' });
    if (!data) return;
    renderMatchs(data);
    updateBilan(data);
    buildMatchDropdown(data);
}

function renderScoreboard(matchs) {
    const container = document.getElementById('scoreboard');
    const live = matchs.find(function(m) { return m.statut === 'live'; });
    const next = !live ? matchs.find(function(m) { return m.statut === 'upcoming'; }) : null;
    const target = live || next;

    if (!target) {
        container.innerHTML = '';
        return;
    }

    const isLive = !!live;
    const aqScore = isLive ? (target.aq_score_courant || 0) : 0;
    const advScore = isLive ? (target.adv_score_courant || 0) : 0;
    const setInfo = formatSetInfo(target);

    let setsHtml = '';
    const setData = [
        { label: 'S1', aq: target.aq_set1, adv: target.adv_set1 },
        { label: 'S2', aq: target.aq_set2, adv: target.adv_set2 },
        { label: 'S3', aq: target.aq_set3, adv: target.adv_set3 }
    ];
    const hasSetData = setData.some(function(s) { return s.aq != null; });
    if (hasSetData) {
        setsHtml = '<div class="sb-sets-summary">';
        setData.forEach(function(s) {
            if (s.aq != null) {
                const w = s.aq > s.adv;
                setsHtml += '<span class="sb-set-chip ' + (w ? 'won' : 'lost') + '">' + s.label + ': ' + s.aq + '-' + s.adv + '</span>';
            }
        });
        setsHtml += '</div>';
    }

    let venueHtml = '';
    if (!isLive && target.lieu_nom) {
        venueHtml = '<div class="sb-match-time"><span class="venue">' + escapeHTML(target.lieu_nom || '') + ' \u2014 ' + escapeHTML(target.terrain || '') + '</span></div>';
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
                    '<div class="sb-team-name adv">' + escapeHTML(target.adversaire || '') + '</div>' +
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
    const container = document.getElementById('matchsContainer');
    let elimSepShown = false;

    container.innerHTML = '';
    matchs.forEach(function(m) {
        if (!elimSepShown && m.match_externe) {
            elimSepShown = true;
            const sep = document.createElement('div');
            sep.className = 'section-title';
            sep.style.margin = '1.5rem 0 1rem';
            sep.textContent = '\u00c9liminatoires';
            container.appendChild(sep);
        }
        const card = document.createElement('match-card');
        card.data = { match: m, adversaires: adversairesMap };
        container.appendChild(card);
    });

    renderScoreboard(matchs);

    const updateEl = document.getElementById('lastUpdate');
    const liveMatch = matchs.find(function(m) { return m.statut === 'live'; });
    const played = matchs.filter(function(m) { return m.statut === 'win' || m.statut === 'loss'; }).length;
    if (liveMatch) {
        updateEl.textContent = 'En cours : vs ' + liveMatch.adversaire + ' (Set ' + liveMatch.set_courant + ' : ' + liveMatch.aq_score_courant + '-' + liveMatch.adv_score_courant + ')';
    } else if (played > 0) {
        updateEl.textContent = played + '/' + matchs.length + ' matchs jou\u00e9s';
    } else {
        const nextMatch = matchs.find(function(m) { return m.statut === 'upcoming'; });
        if (nextMatch) {
            updateEl.textContent = 'Prochain match : ' + nextMatch.heure + ' vs ' + nextMatch.adversaire;
        } else {
            updateEl.textContent = 'Tous les matchs sont termin\u00e9s';
        }
    }
}

function updateBilan(matchs) {
    const { wins, losses, draws, setsW, setsL } = computeBilan(matchs);
    document.getElementById('bilanWins').textContent = wins;
    document.getElementById('bilanDraws').textContent = draws;
    document.getElementById('bilanLosses').textContent = losses;
    document.getElementById('bilanSetsW').textContent = setsW;
    document.getElementById('bilanSetsL').textContent = setsL;
}

// ==========================================
// SCOREKEEPER STATE
// ==========================================

let engine = null;
let skSession = { matchNum: null, advName: '' };
let matchDbId = null;
let SK_KEY = 'aquilons-sk-cvs';
let currentConfig = null;

function skSave() {
    try {
        localStorage.setItem(SK_KEY, JSON.stringify({
            matchNum: skSession.matchNum,
            advName: skSession.advName,
            engine: engine ? engine.getState() : null
        }));
    } catch(e) { console.error('[skSave] Failed to save scorekeeper state:', e); }
}

async function skLoad() {
    try {
        const s = localStorage.getItem(SK_KEY);
        if (!s) return;
        const saved = JSON.parse(s);
        skSession.matchNum = saved.matchNum;
        skSession.advName = saved.advName;
        if (saved.engine && engine) engine.loadState(saved.engine);

        if (skSession.matchNum) {
            document.getElementById('skMatchSelect').value = skSession.matchNum;
            document.getElementById('skAdvName').textContent = skSession.advName;
            document.getElementById('skAdvInfo').textContent = advInfoText(skSession.advName);
            document.getElementById('skPanel').classList.add('show');
            skApplyUI();
            const res = await getClient().from('matchs').select('id')
                .eq('tournoi_id', currentConfig.id)
                .eq('numero', parseInt(skSession.matchNum))
                .single();
            if (res.data) matchDbId = res.data.id;
        }
    } catch(e) { console.error('[skLoad] Failed to restore scorekeeper state:', e); }
}

// ==========================================
// SCOREKEEPER UI
// ==========================================

function skApplyUI() {
    const st = engine.getState();
    document.getElementById('skScoreAq').textContent = st.aqScore;
    document.getElementById('skScoreAdv').textContent = st.advScore;
    skUpdateBubbles(st);
    skRenderSetHistory(st);
    if (st.matchDone) skShowResult(st);
    skUpdateDisabled();
}

function skUpdateBubbles(st) {
    const max = engine.getMaxSets();
    for (let i = 0; i < max; i++) {
        const b = document.getElementById('skBub' + (i + 1));
        if (!b) continue;
        b.className = 'sk-set-bubble';
        if (i < st.sets.length) {
            b.classList.add(st.sets[i].aq > st.sets[i].adv ? 'won' : 'lost');
        } else if (i === st.sets.length && !st.matchDone) {
            b.classList.add('active');
        }
    }
}

function skRenderSetHistory(st) {
    document.getElementById('skSetHistory').innerHTML = st.sets.map(function(s, i) {
        const won = s.aq > s.adv;
        const dur = engine.setDuration(i + 1);
        const durHtml = dur ? ' <span style="font-size:0.6rem;color:var(--gray);font-weight:400">(' + dur + ')</span>' : '';
        return '<div class="sk-set-result">' +
            '<span class="sn">Set ' + (i + 1) + '</span>' +
            '<span class="ss ' + (won ? 'won' : 'lost') + '">' + s.aq + ' - ' + s.adv + durHtml + '</span>' +
            '<span class="sw ' + (won ? 'aq' : 'adv') + '">' + (won ? 'Aquilons' : escapeHTML(skSession.advName)) + '</span>' +
        '</div>';
    }).join('');
}

function skUpdateDisabled() {
    const st = engine.getState();
    const disabled = !skSession.matchNum || st.matchDone;
    document.getElementById('skScoreboard').className = 'sk-scoreboard' + (disabled ? ' disabled' : '');
    document.getElementById('skMinusRow').className = 'sk-minus-row' + (disabled ? ' disabled' : '');
    document.getElementById('skControls').className = 'sk-controls' + (disabled ? ' disabled' : '');
}

function skSetSync(text, cls) {
    const el = document.getElementById('skSync');
    el.textContent = text;
    el.className = 'sk-sync ' + (cls || '');
}

// ==========================================
// SCOREKEEPER SYNC
// ==========================================

function skSync() {
    if (!matchDbId || !engine) return;
    const sb = getClient();
    const st = engine.getState();
    const ts = st.setTimestamps;
    const updates = {
        aq_score_courant: st.aqScore,
        adv_score_courant: st.advScore,
        set_courant: st.currentSet,
        aq_set1: st.sets.length >= 1 ? st.sets[0].aq : null,
        adv_set1: st.sets.length >= 1 ? st.sets[0].adv : null,
        aq_set2: st.sets.length >= 2 ? st.sets[1].aq : null,
        adv_set2: st.sets.length >= 2 ? st.sets[1].adv : null,
        aq_set3: st.sets.length >= 3 ? st.sets[2].aq : null,
        adv_set3: st.sets.length >= 3 ? st.sets[2].adv : null,
        set1_debut: ts.set1_debut || null,
        set1_fin: ts.set1_fin || null,
        set2_debut: ts.set2_debut || null,
        set2_fin: ts.set2_fin || null,
        set3_debut: ts.set3_debut || null,
        set3_fin: ts.set3_fin || null
    };
    if (st.matchDone) {
        const setsWon = st.sets.filter(function(s) { return s.aq > s.adv; }).length;
        const setsLost = st.sets.length - setsWon;
        updates.statut = setsWon > setsLost ? 'win' : setsWon < setsLost ? 'loss' : 'draw';
        updates.set_courant = 0;
    } else {
        updates.statut = 'live';
    }
    sb.from('matchs').update(updates).eq('id', matchDbId)
        .then(function(res) {
            if (res.error) skSetSync('Erreur sync', 'error');
            else skSetSync('Sync OK', 'connected');
        })
        .catch(function(error) {
            console.error('[skSync] Update failed:', error);
            skSetSync('Erreur sync', 'error');
        });
}

// ==========================================
// SCOREKEEPER ACTIONS
// ==========================================

async function skSelectMatch() {
    const sel = document.getElementById('skMatchSelect');
    const opt = sel.options[sel.selectedIndex];
    if (!opt.value) {
        document.getElementById('skPanel').classList.remove('show');
        return;
    }

    skSession.matchNum = opt.value;
    skSession.advName = opt.dataset.adv;
    engine.reset();

    document.getElementById('skAdvName').textContent = skSession.advName;
    document.getElementById('skAdvInfo').textContent = advInfoText(skSession.advName);
    document.getElementById('skScoreAq').textContent = '0';
    document.getElementById('skScoreAdv').textContent = '0';
    document.getElementById('skSetHistory').innerHTML = '';
    document.getElementById('skResult').className = 'sk-result-banner';
    document.getElementById('skResult').innerHTML = '';
    document.getElementById('skPanel').classList.add('show');
    skUpdateBubbles(engine.getState());
    skUpdateDisabled();
    skSave();

    try {
        const sbClient = getClient();
        const res = await sbClient.from('matchs').select('id')
            .eq('tournoi_id', currentConfig.id)
            .eq('numero', parseInt(opt.value))
            .single();
        if (res.data) {
            matchDbId = res.data.id;
            await sbClient.from('points').delete().eq('match_id', matchDbId);
            skSync();
        }
    } catch (error) {
        console.error('[skSelectMatch] Failed:', error);
    }
}

function skPoint(team) {
    if (!skSession.matchNum) return;
    const result = engine.addPoint(team);
    if (!result) return;

    const st = engine.getState();
    document.getElementById('skScoreAq').textContent = st.aqScore;
    document.getElementById('skScoreAdv').textContent = st.advScore;

    // Insert point to Supabase (use scores from result, before potential set reset)
    if (matchDbId) {
        getClient().from('points').insert({
            match_id: matchDbId,
            set_num: result.set,
            equipe: team,
            aq_score: result.aqScore,
            adv_score: result.advScore
        }).then(null, function(error) { console.error('[skPoint] Insert failed:', error); });
    }

    if (result.setEnded) {
        skRenderSetHistory(st);
        skUpdateBubbles(st);
        if (result.matchEnded) {
            skShowResult(st);
            skUpdateDisabled();
        }
    }

    skSave();
    skSync();
}

function skShowResult(st) {
    const setsWon = st.sets.filter(function(s) { return s.aq > s.adv; }).length;
    const won = setsWon > st.sets.length - setsWon;
    const banner = document.getElementById('skResult');
    banner.className = 'sk-result-banner show ' + (won ? 'win-banner' : 'loss-banner');
    const details = st.sets.map(function(s, i) {
        const dur = engine.setDuration(i + 1);
        return 'Set ' + (i + 1) + ': ' + s.aq + '-' + s.adv + (dur ? ' (' + dur + ')' : '');
    }).join(' \u00b7 ');
    banner.innerHTML =
        '<div class="rt">' + (won ? 'Victoire!' : 'D\u00e9faite') + '</div>' +
        '<div class="rd">' + details + '</div>';
}

async function skMinus(team) {
    if (!skSession.matchNum) return;
    if (!engine.undoPoint(team)) return;

    const st = engine.getState();
    document.getElementById('skScoreAq').textContent = st.aqScore;
    document.getElementById('skScoreAdv').textContent = st.advScore;
    skSave();

    if (matchDbId) {
        try {
            const sbClient = getClient();
            const res = await sbClient.from('points').select('id')
                .eq('match_id', matchDbId)
                .eq('equipe', team)
                .order('id', { ascending: false })
                .limit(1);
            if (res.data && res.data[0]) {
                await sbClient.from('points').delete().eq('id', res.data[0].id);
            }
        } catch (error) {
            console.error('[skMinus] Delete failed:', error);
        }
        skSync();
    }
}

function skResetSet() {
    if (!skSession.matchNum) return;
    if (!confirm('Remettre le set \u00e0 z\u00e9ro?')) return;
    const setNum = engine.getState().currentSet;
    engine.resetSet();
    document.getElementById('skScoreAq').textContent = '0';
    document.getElementById('skScoreAdv').textContent = '0';
    skSave();

    if (matchDbId) {
        const sbClient = getClient();
        sbClient.from('points').delete().eq('match_id', matchDbId).eq('set_num', setNum)
            .then(null, function(error) { console.error('[skResetSet] Delete failed:', error); });
        skSync();
    }
}

// ==========================================
// DYNAMIC MATCH DROPDOWN
// ==========================================

function buildMatchDropdown(matchs) {
    const sel = document.getElementById('skMatchSelect');
    const current = sel.value;
    sel.innerHTML = '<option value="">-- Marquer un match --</option>';
    matchs.forEach(function(m) {
        if (m.statut === 'win' || m.statut === 'loss' || m.statut === 'draw') return;
        const opt = document.createElement('option');
        opt.value = m.numero;
        opt.dataset.adv = m.adversaire;
        opt.dataset.time = m.heure;
        let label = 'Match ' + m.numero + ' - ' + m.heure + ' vs ' + m.adversaire;
        if (m.match_externe) label += ' (M' + m.match_externe + ')';
        opt.textContent = label;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

// ==========================================
// BRACKET SCANNER (Day 2 elimination matches)
// ==========================================

async function scanBrackets(config, cfg) {
    const sheetId = cfg.sheets.id;
    const elimSheets = [];
    const elimGids = cfg.sheets.gids;
    if (elimGids.elim_d2_tier1) elimSheets.push({ gid: elimGids.elim_d2_tier1, tier: 'Tier 1' });
    if (elimGids.elim_d2_tier2) elimSheets.push({ gid: elimGids.elim_d2_tier2, tier: 'Tier 2' });

    const elimVenues = cfg.sheets.elim_venues || {};
    let allFound = [];

    for (let i = 0; i < elimSheets.length; i++) {
        const sheet = elimSheets[i];
        try {
            const rows = await fetchSheet(sheetId, sheet.gid);
            const found = scanBracketForAquilon(rows);
            found.forEach(function(f) { f.tier = sheet.tier; });
            allFound = allFound.concat(found);
        } catch(e) {
            console.error('Bracket scan error for ' + sheet.tier, e);
        }
    }

    if (allFound.length === 0) return;

    const sbClient = getClient();

    // Check existing matches
    const existing = await sbClient.from('matchs').select('match_externe,numero')
        .eq('tournoi_id', config.id)
        .not('match_externe', 'is', null);
    const existingNums = {};
    if (existing.data) existing.data.forEach(function(m) { existingNums[m.match_externe] = m.numero; });

    // Get max numero
    const allMatchs = await sbClient.from('matchs').select('numero').eq('tournoi_id', config.id).order('numero', { ascending: false }).limit(1);
    let nextNum = (allMatchs.data && allMatchs.data[0]) ? allMatchs.data[0].numero + 1 : 8;

    for (let j = 0; j < allFound.length; j++) {
        const m = allFound[j];
        if (existingNums[m.matchExterne]) {
            await sbClient.from('matchs').update({ adversaire: m.adversaire, heure: m.heure, terrain: m.terrain })
                .eq('tournoi_id', config.id)
                .eq('match_externe', m.matchExterne);
        } else {
            const terrainNum = (m.terrain.match(/\d+/) || [''])[0];
            const venue = elimVenues[terrainNum] || { nom: 'TBD', url: '' };
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

let bracketScanStarted = false;

function toggleScorekeeper() {
    const skEl = document.getElementById('scorekeeper');
    const isShown = skEl.classList.toggle('show');
    if (isShown && !bracketScanStarted && currentConfig) {
        const cfg = (currentConfig.config || {});
        if (cfg.sheets) {
            bracketScanStarted = true;
            scanBrackets(currentConfig, cfg);
            polling.schedule('bracket-scan', function() { scanBrackets(currentConfig, cfg); }, BRACKET_SCAN_INTERVAL_MS);
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
        const config = await getTournoiConfig(slug);
        currentConfig = config;
        const cfg = config.config || {};
        SK_KEY = 'aquilons-sk-' + slug;

        // Create scorekeeper engine with tournament rules
        engine = createEngine(cfg.scorekeeper || {});

        // Build page structure
        app.innerHTML = buildPageHTML(engine.getMaxSets());

        // Update footer
        document.getElementById('pageFooter').innerHTML = 'Aquilons \u00b7 Jean de Br\u00e9beuf \u00b7 ' + escapeHTML(config.nom || '');

        // Wire event handlers
        document.getElementById('skMatchSelect').addEventListener('change', skSelectMatch);
        document.getElementById('skSideAq').addEventListener('click', function() { skPoint('aq'); });
        document.getElementById('skSideAdv').addEventListener('click', function() { skPoint('adv'); });
        document.getElementById('skMinusAq').addEventListener('click', function() { skMinus('aq'); });
        document.getElementById('skMinusAdv').addEventListener('click', function() { skMinus('adv'); });
        document.getElementById('skResetBtn').addEventListener('click', skResetSet);

        // Check ?score parameter
        const urlParams = new URLSearchParams(window.location.search);
        bracketScanStarted = false;
        if (urlParams.has('score')) {
            document.getElementById('scorekeeper').classList.add('show');
            bracketScanStarted = true;
        }

        // Load data
        await loadAdversaires(config);
        await loadMatchs(config);
        await skLoad();

        // Start bracket scanner if scorekeeper is visible and tournament has sheets
        if (bracketScanStarted && cfg.sheets) {
            scanBrackets(config, cfg);
            polling.schedule('bracket-scan', function() { scanBrackets(config, cfg); }, BRACKET_SCAN_INTERVAL_MS);
        }

        // Realtime subscription
        subscribe('matchs-realtime', 'matchs', function() { loadMatchs(config); });

        // Polling fallback — catches cases where realtime silently drops
        polling.schedule('match-poll', function() { loadMatchs(config); }, MATCH_POLL_INTERVAL_MS);

        // Visibility handler — refresh data when phone wakes up
        function onVisibilityChange() {
            if (!document.hidden) {
                loadMatchs(config);
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange);

        // Cleanup function
        cleanup = function() {
            removeAllChannels();
            polling.cancelAll();
            document.removeEventListener('visibilitychange', onVisibilityChange);
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

const header = document.querySelector('app-header');
const tournois = await listTournois();

header.renderSelector(tournois, getTournoiActif(), function(slug) {
    setTournoiActif(slug);
    init(slug);
});

init(getTournoiActif());
