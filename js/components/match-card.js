// js/components/match-card.js
// <match-card> web component — renders a single match card for the results page
// Usage:
//   const card = document.createElement('match-card');
//   card.data = { match: matchObject, adversaires: adversairesMap };

import { escapeHTML } from '../lib/ui.js';

function _scoreCell(aqScore, advScore) {
    if (aqScore == null) return { aq: '-', adv: '-', aqCls: '', advCls: '' };
    var won = aqScore > advScore;
    return { aq: aqScore, adv: advScore, aqCls: won ? 'won' : 'lost', advCls: won ? 'lost' : 'won' };
}

function _advInfoHtml(nom, adversaires) {
    var a = adversaires[nom];
    if (!a) return '';
    var parts = [];
    if (a.region_rseq) parts.push(escapeHTML(a.region_rseq));
    if (a.rang_regional) parts.push(escapeHTML(String(a.rang_regional)) + (a.rang_regional === 1 ? 'er' : 'e') + ' r\u00e9gional');
    return parts.length ? '<span class="team-info"> \u2014 ' + parts.join(' \u00b7 ') + '</span>' : '';
}

function _advStatsHtml(nom, adversaires) {
    var a = adversaires[nom];
    if (!a) return '';
    var hasStats = a.sets_gagnes != null && a.sets_perdus != null;
    if (!hasStats && !a.nom_officiel && !a.ecole) return '';
    var html = '<div class="adv-stats">';
    if (a.nom_officiel) html += '<div class="adv-school">' + escapeHTML(a.nom_officiel) + (a.ecole ? ' <span class="adv-ecole">(' + escapeHTML(a.ecole) + ')</span>' : '') + '</div>';
    else if (a.ecole) html += '<div class="adv-school">' + escapeHTML(a.ecole) + '</div>';
    if (hasStats) {
        html += '<div class="adv-stat-row">';
        html += '<span class="adv-stat">Sets: <b>' + a.sets_gagnes + 'G-' + a.sets_perdus + 'P</b></span>';
        if (a.points_pour != null) html += '<span class="adv-stat">Pts: <b>' + a.points_pour + '-' + a.points_contre + '</b></span>';
        if (a.matchs_joues != null) html += '<span class="adv-stat">MJ: <b>' + a.matchs_joues + '</b></span>';
        html += '</div>';
    }
    html += '</div>';
    return html;
}

const _statusMap = {
    win:  { cls: 'win',  badge: 'badge-win',  text: 'Victoire' },
    loss: { cls: 'loss', badge: 'badge-loss', text: 'D\u00e9faite' },
    draw: { cls: 'draw', badge: 'badge-draw', text: '\u00c9galit\u00e9' },
    live: { cls: 'live', badge: 'badge-live', text: '\u25CF En cours' }
};
const _defaultStatus = { cls: 'upcoming', badge: 'badge-upcoming', text: '\u00c0 venir' };

class MatchCard extends HTMLElement {

    set data(val) {
        this._data = val;
        this._render();
    }

    get data() {
        return this._data;
    }

    _render() {
        if (!this._data) return;
        var m = this._data.match;
        var adversaires = this._data.adversaires || {};

        var st = _statusMap[m.statut] || _defaultStatus;
        var s1 = _scoreCell(m.aq_set1, m.adv_set1);
        var s2 = _scoreCell(m.aq_set2, m.adv_set2);
        var s3 = _scoreCell(m.aq_set3, m.adv_set3);

        var safeAdversaire = escapeHTML(m.adversaire || '');
        var safeHeure = escapeHTML(m.heure || '');
        var safeLieuNom = escapeHTML(m.lieu_nom || '');
        var safeTerrain = escapeHTML(m.terrain || '');
        var safeLieuAdresse = escapeHTML(m.lieu_adresse || '');

        // For live match, show current score as extra column
        var liveCol = '';
        var liveColAdv = '';
        if (m.statut === 'live' && m.set_courant > 0) {
            liveCol = '<span class="set-score live-score">' + m.aq_score_courant + '</span>';
            liveColAdv = '<span class="set-score live-score">' + m.adv_score_courant + '</span>';
        }

        var liveInfo = '';
        if (m.statut === 'live' && m.set_courant > 0) {
            liveInfo = '<div class="match-live-score">Set ' + m.set_courant + ' en cours</div>';
        }

        var mapsLink = '';
        if (m.lieu_maps_url && /^https:\/\//.test(m.lieu_maps_url)) {
            mapsLink = '<a href="' + escapeHTML(m.lieu_maps_url) + '" target="_blank" class="loc-map">Ouvrir dans Maps</a>';
        }

        this.innerHTML =
            '<div class="match-card ' + st.cls + '">' +
                '<div class="match-header">' +
                    '<span class="match-time">' + safeHeure + '</span>' +
                    '<span class="match-badge ' + st.badge + '">' + st.text + '</span>' +
                '</div>' +
                '<div class="match-body"><div class="match-teams">' +
                    '<div class="team-row">' +
                        '<span class="team-label is-aquilon">Aquilons</span>' +
                        '<div class="set-scores">' +
                            '<span class="set-score ' + s1.aqCls + '">' + s1.aq + '</span>' +
                            '<span class="set-score ' + s2.aqCls + '">' + s2.aq + '</span>' +
                            (s3.aq !== '-' ? '<span class="set-score ' + s3.aqCls + '">' + s3.aq + '</span>' : '') +
                            liveCol +
                        '</div>' +
                    '</div>' +
                    '<div class="team-row">' +
                        '<span class="team-label">' + safeAdversaire + _advInfoHtml(m.adversaire, adversaires) + '</span>' +
                        _advStatsHtml(m.adversaire, adversaires) +
                        '<div class="set-scores">' +
                            '<span class="set-score ' + s1.advCls + '">' + s1.adv + '</span>' +
                            '<span class="set-score ' + s2.advCls + '">' + s2.adv + '</span>' +
                            (s3.adv !== '-' ? '<span class="set-score ' + s3.advCls + '">' + s3.adv + '</span>' : '') +
                            liveColAdv +
                        '</div>' +
                    '</div>' +
                '</div></div>' +
                liveInfo +
                '<div class="match-location">' +
                    '<span class="pin">&#128205;</span>' +
                    '<div class="loc-info">' +
                        '<div class="loc-venue">' + safeLieuNom + ' &mdash; ' + safeTerrain + '</div>' +
                        '<div class="loc-addr">' + safeLieuAdresse + '</div>' +
                        mapsLink +
                    '</div>' +
                '</div>' +
            '</div>';
    }
}

customElements.define('match-card', MatchCard);
