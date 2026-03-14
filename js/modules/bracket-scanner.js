// js/modules/bracket-scanner.js

export function scanBracketForAquilon(rows) {
    const matches = [];

    // Step 1: Find all "Match N" cells
    const matchCells = [];
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            const val = rows[r][c].trim();
            const mm = val.match(/^Match (\d+)$/);
            if (mm) {
                matchCells.push({ row: r, col: c, num: parseInt(mm[1]) });
            }
        }
    }

    // Step 2: For each match, find the two teams, time, and terrain
    matchCells.forEach(function(mc) {
        let team1 = null, team2 = null, time = null, terrain = null;

        // Scan nearby rows and columns for time, terrain
        for (let r = Math.max(0, mc.row - 6); r <= Math.min(rows.length - 1, mc.row + 6); r++) {
            for (let c = Math.max(0, mc.col - 3); c <= Math.min((rows[r] || []).length - 1, mc.col + 3); c++) {
                const v = (rows[r][c] || '').trim();
                if (!v) continue;
                if (!time && /^\d{1,2}h\d{2}$/.test(v)) { time = v; continue; }
                if (!terrain && /^Terrain \d+$/.test(v)) { terrain = v; continue; }
            }
        }

        // Find teams
        let teamCandidates = [];
        for (let r2 = Math.max(0, mc.row - 4); r2 <= Math.min(rows.length - 1, mc.row + 4); r2++) {
            for (let c2 = Math.max(0, mc.col - 3); c2 <= Math.min((rows[r2] || []).length - 1, mc.col + 3); c2++) {
                const v2 = (rows[r2][c2] || '').trim();
                if (!v2) continue;
                if (/^(Match|Terrain|GM|PM|\d{1,2}h\d{2}|Tournoi|Benjamin|Alma|Huiti|Quart|Demi|Finale|6-7)/.test(v2)) continue;
                if (/[a-zA-Z\u00C0-\u017F]/.test(v2) && v2.length > 1) {
                    teamCandidates.push({ row: r2, col: c2, name: v2 });
                }
            }
        }

        // Remove duplicates and sort by distance
        const seen = {};
        teamCandidates = teamCandidates.filter(function(t) {
            if (seen[t.name]) return false;
            seen[t.name] = true;
            return true;
        }).sort(function(a, b) {
            return Math.abs(a.row - mc.row) - Math.abs(b.row - mc.row);
        });

        if (teamCandidates.length >= 2) { team1 = teamCandidates[0].name; team2 = teamCandidates[1].name; }
        else if (teamCandidates.length === 1) { team1 = teamCandidates[0].name; }

        let hasAquilon = false;
        let opponent = null;
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
