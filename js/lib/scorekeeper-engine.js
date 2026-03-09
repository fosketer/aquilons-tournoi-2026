// js/lib/scorekeeper-engine.js
// Pure state machine for volleyball scoring — zero DOM, zero network.
//
// Usage:
//   import { createEngine } from './scorekeeper-engine.js';
//   var engine = createEngine({ setsToWin: 2, pointsPerSet: [25, 25, 15], minLead: 2 });
//   var result = engine.addPoint('aq');

var DEFAULTS = {
    setsToWin: 2,
    pointsPerSet: [25, 25, 15],
    minLead: 2
};

export function createEngine(rules) {
    var r = {
        setsToWin: (rules && rules.setsToWin) || DEFAULTS.setsToWin,
        pointsPerSet: (rules && rules.pointsPerSet) || DEFAULTS.pointsPerSet,
        minLead: (rules && rules.minLead != null) ? rules.minLead : DEFAULTS.minLead
    };

    var maxSets = r.setsToWin * 2 - 1;
    var state = freshState();

    function freshState() {
        var ts = {};
        for (var i = 1; i <= maxSets; i++) {
            ts['set' + i + '_debut'] = null;
            ts['set' + i + '_fin'] = null;
        }
        return {
            currentSet: 1,
            aqScore: 0,
            advScore: 0,
            sets: [],
            pointLog: [],
            matchDone: false,
            setTimestamps: ts
        };
    }

    function targetPoints() {
        var idx = state.currentSet - 1;
        if (idx < r.pointsPerSet.length) return r.pointsPerSet[idx];
        return r.pointsPerSet[r.pointsPerSet.length - 1];
    }

    function isSetOver() {
        var aq = state.aqScore, adv = state.advScore;
        var target = targetPoints();
        return (aq >= target || adv >= target) && Math.abs(aq - adv) >= r.minLead;
    }

    function snapshot() {
        return {
            currentSet: state.currentSet,
            aqScore: state.aqScore,
            advScore: state.advScore,
            sets: state.sets.slice(),
            pointLog: state.pointLog.slice(),
            matchDone: state.matchDone,
            setTimestamps: Object.assign({}, state.setTimestamps)
        };
    }

    return {
        /**
         * Add a point for 'aq' or 'adv'.
         * Returns { team, set, aqScore, advScore, setEnded, matchEnded } or null if invalid.
         * Scores in the result reflect the moment of the point (before any set reset).
         */
        addPoint: function(team) {
            if (state.matchDone || state.currentSet > maxSets) return null;

            // Record set start on first point of the set
            var tsKey = 'set' + state.currentSet + '_debut';
            if (!state.setTimestamps[tsKey]) {
                state.setTimestamps[tsKey] = new Date().toISOString();
            }

            if (team === 'aq') state.aqScore++;
            else state.advScore++;
            state.pointLog.push(team);

            var result = {
                team: team,
                set: state.currentSet,
                aqScore: state.aqScore,
                advScore: state.advScore,
                setEnded: false,
                matchEnded: false
            };

            if (isSetOver()) {
                state.setTimestamps['set' + state.currentSet + '_fin'] = new Date().toISOString();
                state.sets.push({ aq: state.aqScore, adv: state.advScore });
                result.setEnded = true;

                var wonAq = state.sets.filter(function(s) { return s.aq > s.adv; }).length;
                var wonAdv = state.sets.length - wonAq;

                if (wonAq >= r.setsToWin || wonAdv >= r.setsToWin) {
                    state.matchDone = true;
                    result.matchEnded = true;
                } else {
                    state.currentSet = state.sets.length + 1;
                    state.aqScore = 0;
                    state.advScore = 0;
                    state.pointLog = [];
                }
            }

            return result;
        },

        /**
         * Undo the last point for 'aq' or 'adv'.
         * Returns true if successful.
         */
        undoPoint: function(team) {
            if (state.matchDone) return false;
            if (team === 'aq' && state.aqScore <= 0) return false;
            if (team === 'adv' && state.advScore <= 0) return false;

            if (team === 'aq') state.aqScore--;
            else state.advScore--;

            for (var i = state.pointLog.length - 1; i >= 0; i--) {
                if (state.pointLog[i] === team) {
                    state.pointLog.splice(i, 1);
                    break;
                }
            }
            return true;
        },

        /**
         * Reset the current set scores to zero.
         * Returns true if successful.
         */
        resetSet: function() {
            if (state.matchDone) return false;
            var n = state.currentSet;
            state.aqScore = 0;
            state.advScore = 0;
            state.pointLog = [];
            state.setTimestamps['set' + n + '_debut'] = null;
            state.setTimestamps['set' + n + '_fin'] = null;
            return true;
        },

        /** Reset all state for a new match. */
        reset: function() {
            state = freshState();
        },

        /** Restore state from a previously saved snapshot. */
        loadState: function(saved) {
            if (!saved) return;
            state.currentSet = saved.currentSet || 1;
            state.aqScore = saved.aqScore || 0;
            state.advScore = saved.advScore || 0;
            state.sets = (saved.sets || []).slice();
            state.pointLog = (saved.pointLog || []).slice();
            state.matchDone = saved.matchDone || false;
            if (saved.setTimestamps) {
                Object.keys(saved.setTimestamps).forEach(function(k) {
                    if (k in state.setTimestamps) state.setTimestamps[k] = saved.setTimestamps[k];
                });
            }
        },

        /** Return a snapshot of the current state (safe to serialize). */
        getState: snapshot,

        /** Points needed to win the current set. */
        getTargetPoints: targetPoints,

        /** Format duration of a completed set as "m:ss". */
        setDuration: function(setNum) {
            var debut = state.setTimestamps['set' + setNum + '_debut'];
            var fin = state.setTimestamps['set' + setNum + '_fin'];
            if (!debut || !fin) return '';
            var ms = new Date(fin) - new Date(debut);
            var mins = Math.floor(ms / 60000);
            var secs = Math.floor((ms % 60000) / 1000);
            return mins + ':' + String(secs).padStart(2, '0');
        },

        /** Return a copy of the active rules. */
        getRules: function() {
            return { setsToWin: r.setsToWin, pointsPerSet: r.pointsPerSet.slice(), minLead: r.minLead };
        },

        /** Maximum number of sets in a match (e.g. 3 for best-of-3). */
        getMaxSets: function() { return maxSets; }
    };
}
