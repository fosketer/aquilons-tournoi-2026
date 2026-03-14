// js/modules/match-renderer.js
// Match list rendering helpers — extracted from resultats.js.

/**
 * Compute win/loss/draw/sets bilan from match list.
 * @param {Array} matchs
 * @returns {{ wins: number, losses: number, draws: number, setsW: number, setsL: number }}
 */
export function computeBilan(matchs) {
    let wins = 0, losses = 0, draws = 0, setsW = 0, setsL = 0;
    matchs.forEach(function(m) {
        if (m.statut === 'win') wins++;
        if (m.statut === 'loss') losses++;
        if (m.statut === 'draw') draws++;
        if (m.aq_set1 != null && m.adv_set1 != null) { m.aq_set1 > m.adv_set1 ? setsW++ : setsL++; }
        if (m.aq_set2 != null && m.adv_set2 != null) { m.aq_set2 > m.adv_set2 ? setsW++ : setsL++; }
        if (m.aq_set3 != null && m.adv_set3 != null) { m.aq_set3 > m.adv_set3 ? setsW++ : setsL++; }
    });
    return { wins, losses, draws, setsW, setsL };
}

/**
 * Format set info text for scoreboard display.
 * @param {Object} match
 * @returns {string}
 */
export function formatSetInfo(match) {
    if (match.statut === 'live' && match.set_courant > 0) {
        return 'Set ' + match.set_courant + ' en cours';
    }
    let info = match.heure || '';
    if (match.match_externe) {
        info += ' \u00b7 M' + match.match_externe;
    }
    return info;
}
