// js/lib/rseq.js
const RSEQ_BASE = 'https://diffusion.s1.rseq.ca/api';

export async function fetchLeague(leagueId) {
    const res = await fetch(RSEQ_BASE + '/LeagueApi/GetLeagueDiffusion/?leagueId=' + leagueId);
    if (!res.ok) throw new Error('RSEQ fetch failed: ' + res.status);
    return res.json();
}

export function buildRegion(cfg, data) {
    const region = {
        id: cfg.id,
        name: cfg.name,
        cols: [],
        teams: [],
        info: ''
    };

    const catName = data.CategoryName || '';
    const sexName = data.SexTypeName || '';
    const divName = data.DivisionName || '';
    region.info = [catName, sexName, divName].filter(Boolean).join(' ');
    region.source = { name: 'RSEQ S1', url: 'https://diffusion.s1.rseq.ca/' };

    if (cfg.type === 'volleyball' && data.StandingsVolleyball && data.StandingsVolleyball.length > 0) {
        const showT = [];
        const first = data.StandingsVolleyball[0];
        for (let i = 1; i <= 12; i++) {
            if (first['ShowTournament' + i]) showT.push(i);
        }
        region.cols = ['#', '\u00c9quipe'];
        showT.forEach(function(t) { region.cols.push('T' + t); });
        region.cols.push('Total');

        data.StandingsVolleyball.forEach(function(s) {
            const row = [s.PositionFormatted, s.TeamName];
            showT.forEach(function(t) {
                row.push(s['Tournament' + t + 'Formatted'] || '-');
            });
            row.push(s.TotalPointsFormatted || '-');
            region.teams.push(row);
        });
    } else if (data.Standings && data.Standings.length > 0) {
        region.cols = ['#', '\u00c9quipe', 'MJ', 'SG', 'SP', 'PP', 'PC'];
        data.Standings.forEach(function(s) {
            region.teams.push([
                s.PositionFormatted,
                s.TeamName,
                s.GamesPlayed,
                s.SetWins,
                s.SetLosses,
                s.PointsFor,
                s.PointsAgaints
            ]);
        });
    }
    return region;
}
