// tests/unit/scorekeeper-engine.test.js
// Unit tests for the scorekeeper state machine.

import { describe, it, expect, beforeEach } from 'vitest';
import { createEngine } from '../../js/lib/scorekeeper-engine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Play n points for `team` one at a time and return the last result. */
function addPoints(engine, team, n) {
    let last;
    for (let i = 0; i < n; i++) last = engine.addPoint(team);
    return last;
}

/** Drive engine to a finished set without ending the match (aq wins set 1 25-0). */
function winSetForAq(engine) {
    return addPoints(engine, 'aq', 25);
}

// ---------------------------------------------------------------------------
// 1. Point addition
// ---------------------------------------------------------------------------

describe('Point addition', () => {
    let engine;
    beforeEach(() => { engine = createEngine(); });

    it('increments aqScore when aq scores', () => {
        const result = engine.addPoint('aq');
        expect(result.aqScore).toBe(1);
        expect(result.advScore).toBe(0);
    });

    it('increments advScore when adv scores', () => {
        const result = engine.addPoint('adv');
        expect(result.aqScore).toBe(0);
        expect(result.advScore).toBe(1);
    });

    it('accumulates mixed points correctly', () => {
        engine.addPoint('aq');
        engine.addPoint('adv');
        engine.addPoint('aq');
        const result = engine.addPoint('adv');
        expect(result.aqScore).toBe(2);
        expect(result.advScore).toBe(2);
    });

    it('returns null when match is already done', () => {
        // Win 2 sets for aq (best-of-3)
        addPoints(engine, 'aq', 25); // set 1
        addPoints(engine, 'aq', 25); // set 2 → match done
        const result = engine.addPoint('aq');
        expect(result).toBeNull();
    });

    it('records the team in result', () => {
        expect(engine.addPoint('aq').team).toBe('aq');
        expect(engine.addPoint('adv').team).toBe('adv');
    });

    it('records set number in result', () => {
        const result = engine.addPoint('aq');
        expect(result.set).toBe(1);
    });

    it('records a set1 start timestamp on first point', () => {
        engine.addPoint('aq');
        const ts = engine.getState().setTimestamps['set1_debut'];
        expect(ts).not.toBeNull();
        expect(typeof ts).toBe('string');
    });

    it('does not overwrite the start timestamp on subsequent points', () => {
        engine.addPoint('aq');
        const ts1 = engine.getState().setTimestamps['set1_debut'];
        engine.addPoint('aq');
        const ts2 = engine.getState().setTimestamps['set1_debut'];
        expect(ts1).toBe(ts2);
    });

    it('appends to pointLog', () => {
        engine.addPoint('aq');
        engine.addPoint('adv');
        expect(engine.getState().pointLog).toEqual(['aq', 'adv']);
    });
});

// ---------------------------------------------------------------------------
// 2. Set completion
// ---------------------------------------------------------------------------

describe('Set completion', () => {
    let engine;
    beforeEach(() => { engine = createEngine(); });

    it('ends set at 25-0', () => {
        const result = addPoints(engine, 'aq', 25);
        expect(result.setEnded).toBe(true);
    });

    it('ends set at 25-23', () => {
        addPoints(engine, 'aq', 20);
        addPoints(engine, 'adv', 23);
        const result = addPoints(engine, 'aq', 5); // 25-23
        expect(result.setEnded).toBe(true);
        expect(result.aqScore).toBe(25);
        expect(result.advScore).toBe(23);
    });

    it('does NOT end set at 25-24 (minLead=2)', () => {
        addPoints(engine, 'aq', 24);
        addPoints(engine, 'adv', 24);
        const result = engine.addPoint('aq'); // 25-24
        expect(result.setEnded).toBe(false);
    });

    it('ends set at 26-24 (deuce resolved)', () => {
        addPoints(engine, 'aq', 24);
        addPoints(engine, 'adv', 24);
        engine.addPoint('aq'); // 25-24
        const result = engine.addPoint('aq'); // 26-24
        expect(result.setEnded).toBe(true);
    });

    it('handles extended deuce (e.g. 28-26)', () => {
        addPoints(engine, 'aq', 24);
        addPoints(engine, 'adv', 24);
        // bounce 3 times
        engine.addPoint('aq'); engine.addPoint('adv'); // 25-25
        engine.addPoint('aq'); engine.addPoint('adv'); // 26-26
        engine.addPoint('aq'); engine.addPoint('adv'); // 27-27
        const result = engine.addPoint('aq'); engine.addPoint('aq'); // not yet / 28-27
        const final = engine.addPoint('aq'); // would be 29-27 — recheck
        // re-create a clean scenario
        const e2 = createEngine();
        addPoints(e2, 'aq', 24);
        addPoints(e2, 'adv', 24);
        e2.addPoint('aq'); e2.addPoint('adv'); // 25-25
        e2.addPoint('aq'); e2.addPoint('adv'); // 26-26
        e2.addPoint('aq'); e2.addPoint('adv'); // 27-27
        e2.addPoint('aq'); // 28-27
        const r = e2.addPoint('aq'); // 29-27
        expect(r.setEnded).toBe(true);
        expect(r.aqScore).toBe(29);
        expect(r.advScore).toBe(27);
    });

    it('records set end timestamp when set ends', () => {
        addPoints(engine, 'aq', 25);
        const ts = engine.getState().setTimestamps['set1_fin'];
        expect(ts).not.toBeNull();
    });

    it('resets scores to 0 after set ends (no match end)', () => {
        addPoints(engine, 'aq', 25); // set 1 ends
        const state = engine.getState();
        expect(state.aqScore).toBe(0);
        expect(state.advScore).toBe(0);
    });

    it('advances currentSet after set ends', () => {
        addPoints(engine, 'aq', 25);
        expect(engine.getState().currentSet).toBe(2);
    });

    it('clears pointLog when set ends (and match continues)', () => {
        addPoints(engine, 'aq', 25);
        expect(engine.getState().pointLog).toEqual([]);
    });

    it('pushes completed set scores into sets array', () => {
        addPoints(engine, 'aq', 25);
        const sets = engine.getState().sets;
        expect(sets.length).toBe(1);
        expect(sets[0]).toEqual({ aq: 25, adv: 0 });
    });
});

// ---------------------------------------------------------------------------
// 3. Match completion
// ---------------------------------------------------------------------------

describe('Match completion', () => {
    let engine;
    beforeEach(() => { engine = createEngine(); });

    it('ends match at 2-0 sets (aq wins both)', () => {
        addPoints(engine, 'aq', 25); // set 1
        const result = addPoints(engine, 'aq', 25); // set 2
        expect(result.matchEnded).toBe(true);
        expect(engine.getState().matchDone).toBe(true);
    });

    it('continues match at 1-1 sets', () => {
        addPoints(engine, 'aq', 25);  // set 1 aq
        const result = addPoints(engine, 'adv', 25); // set 2 adv
        expect(result.matchEnded).toBe(false);
        expect(engine.getState().matchDone).toBe(false);
        expect(engine.getState().currentSet).toBe(3);
    });

    it('ends match at 2-1 sets (aq wins deciding set)', () => {
        addPoints(engine, 'aq', 25);   // set 1 aq
        addPoints(engine, 'adv', 25);  // set 2 adv
        const result = addPoints(engine, 'aq', 15); // set 3 tiebreak aq
        expect(result.matchEnded).toBe(true);
    });

    it('ends match at 2-1 sets (adv wins deciding set)', () => {
        addPoints(engine, 'aq', 25);
        addPoints(engine, 'adv', 25);
        const result = addPoints(engine, 'adv', 15);
        expect(result.matchEnded).toBe(true);
    });

    it('tiebreak set (set 3) uses 15 points as target', () => {
        addPoints(engine, 'aq', 25);
        addPoints(engine, 'adv', 25);
        expect(engine.getTargetPoints()).toBe(15);
    });

    it('setEnded and matchEnded are both true on final point', () => {
        addPoints(engine, 'aq', 25);
        const result = addPoints(engine, 'aq', 25);
        expect(result.setEnded).toBe(true);
        expect(result.matchEnded).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 4. Undo
// ---------------------------------------------------------------------------

describe('Undo', () => {
    let engine;
    beforeEach(() => { engine = createEngine(); });

    it('decrements aqScore on undoPoint("aq")', () => {
        engine.addPoint('aq');
        engine.addPoint('aq');
        engine.undoPoint('aq');
        expect(engine.getState().aqScore).toBe(1);
    });

    it('decrements advScore on undoPoint("adv")', () => {
        engine.addPoint('adv');
        engine.undoPoint('adv');
        expect(engine.getState().advScore).toBe(0);
    });

    it('returns false when score is already 0', () => {
        expect(engine.undoPoint('aq')).toBe(false);
        expect(engine.undoPoint('adv')).toBe(false);
    });

    it('returns false when match is done', () => {
        addPoints(engine, 'aq', 25);
        addPoints(engine, 'aq', 25);
        expect(engine.undoPoint('aq')).toBe(false);
    });

    it('removes the last occurrence from pointLog', () => {
        engine.addPoint('aq');
        engine.addPoint('adv');
        engine.addPoint('aq');
        engine.undoPoint('aq');
        expect(engine.getState().pointLog).toEqual(['aq', 'adv']);
    });

    it('returns true on successful undo', () => {
        engine.addPoint('aq');
        expect(engine.undoPoint('aq')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 5. Reset
// ---------------------------------------------------------------------------

describe('Reset', () => {
    let engine;
    beforeEach(() => { engine = createEngine(); });

    it('resetSet zeroes current set scores', () => {
        engine.addPoint('aq');
        engine.addPoint('adv');
        engine.resetSet();
        const s = engine.getState();
        expect(s.aqScore).toBe(0);
        expect(s.advScore).toBe(0);
    });

    it('resetSet clears pointLog', () => {
        engine.addPoint('aq');
        engine.resetSet();
        expect(engine.getState().pointLog).toEqual([]);
    });

    it('resetSet clears set timestamps', () => {
        engine.addPoint('aq');
        engine.resetSet();
        const ts = engine.getState().setTimestamps;
        expect(ts['set1_debut']).toBeNull();
        expect(ts['set1_fin']).toBeNull();
    });

    it('resetSet returns false when match is done', () => {
        addPoints(engine, 'aq', 25);
        addPoints(engine, 'aq', 25);
        expect(engine.resetSet()).toBe(false);
    });

    it('resetSet returns true when match is not done', () => {
        engine.addPoint('aq');
        expect(engine.resetSet()).toBe(true);
    });

    it('reset() returns engine to initial state', () => {
        addPoints(engine, 'aq', 25);
        addPoints(engine, 'adv', 10);
        engine.reset();
        const s = engine.getState();
        expect(s.currentSet).toBe(1);
        expect(s.aqScore).toBe(0);
        expect(s.advScore).toBe(0);
        expect(s.sets).toEqual([]);
        expect(s.matchDone).toBe(false);
    });

    it('reset() allows new points after a finished match', () => {
        addPoints(engine, 'aq', 25);
        addPoints(engine, 'aq', 25);
        engine.reset();
        const result = engine.addPoint('aq');
        expect(result).not.toBeNull();
        expect(result.aqScore).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// 6. State serialization
// ---------------------------------------------------------------------------

describe('State serialization', () => {
    let engine;
    beforeEach(() => { engine = createEngine(); });

    it('getState returns a snapshot with expected keys', () => {
        const s = engine.getState();
        expect(s).toHaveProperty('currentSet');
        expect(s).toHaveProperty('aqScore');
        expect(s).toHaveProperty('advScore');
        expect(s).toHaveProperty('sets');
        expect(s).toHaveProperty('pointLog');
        expect(s).toHaveProperty('matchDone');
        expect(s).toHaveProperty('setTimestamps');
    });

    it('loadState restores a mid-game snapshot (round-trip)', () => {
        engine.addPoint('aq');
        engine.addPoint('adv');
        const saved = engine.getState();

        const engine2 = createEngine();
        engine2.loadState(saved);
        const restored = engine2.getState();

        expect(restored.aqScore).toBe(saved.aqScore);
        expect(restored.advScore).toBe(saved.advScore);
        expect(restored.currentSet).toBe(saved.currentSet);
        expect(restored.pointLog).toEqual(saved.pointLog);
    });

    it('loadState handles null gracefully (no-op)', () => {
        const before = engine.getState();
        engine.loadState(null);
        const after = engine.getState();
        expect(after.currentSet).toBe(before.currentSet);
        expect(after.aqScore).toBe(before.aqScore);
    });

    it('getState returns a copy — mutations do not affect engine', () => {
        engine.addPoint('aq');
        const s = engine.getState();
        s.aqScore = 999;
        expect(engine.getState().aqScore).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// 7. Rules / helpers
// ---------------------------------------------------------------------------

describe('Rules and helpers', () => {
    let engine;
    beforeEach(() => { engine = createEngine(); });

    it('getRules returns correct default rules', () => {
        const rules = engine.getRules();
        expect(rules.setsToWin).toBe(2);
        expect(rules.pointsPerSet).toEqual([25, 25, 15]);
        expect(rules.minLead).toBe(2);
    });

    it('getRules returns a copy (mutations do not affect engine)', () => {
        const rules = engine.getRules();
        rules.setsToWin = 99;
        expect(engine.getRules().setsToWin).toBe(2);
    });

    it('getMaxSets returns 3 for default best-of-3', () => {
        expect(engine.getMaxSets()).toBe(3);
    });

    it('getTargetPoints returns 25 for set 1', () => {
        expect(engine.getTargetPoints()).toBe(25);
    });

    it('getTargetPoints returns 15 for set 3 (tiebreak)', () => {
        addPoints(engine, 'aq', 25);
        addPoints(engine, 'adv', 25);
        expect(engine.getTargetPoints()).toBe(15);
    });

    it('setDuration returns empty string if timestamps missing', () => {
        expect(engine.setDuration(1)).toBe('');
    });

    it('setDuration returns "m:ss" format for completed set', () => {
        // We cannot control Date.now() so we verify the format pattern
        addPoints(engine, 'aq', 25); // set 1 ends → timestamps recorded
        const dur = engine.setDuration(1);
        // Should match digit(s):digit{2}
        expect(dur).toMatch(/^\d+:\d{2}$/);
    });
});

// ---------------------------------------------------------------------------
// 8. Custom rules
// ---------------------------------------------------------------------------

describe('Custom rules', () => {
    it('respects custom setsToWin=1 (single-set match)', () => {
        const engine = createEngine({ setsToWin: 1, pointsPerSet: [21], minLead: 2 });
        expect(engine.getMaxSets()).toBe(1);
        expect(engine.getTargetPoints()).toBe(21);
        const result = addPoints(engine, 'aq', 21);
        expect(result.matchEnded).toBe(true);
    });

    it('respects custom pointsPerSet', () => {
        const engine = createEngine({ setsToWin: 2, pointsPerSet: [21, 21, 15], minLead: 2 });
        expect(engine.getTargetPoints()).toBe(21);
        const result = addPoints(engine, 'aq', 21);
        expect(result.setEnded).toBe(true);
    });

    it('respects minLead=1 (no deuce required)', () => {
        const engine = createEngine({ setsToWin: 2, pointsPerSet: [25, 25, 15], minLead: 1 });
        addPoints(engine, 'aq', 24);
        addPoints(engine, 'adv', 24);
        const result = engine.addPoint('aq'); // 25-24, lead=1 → enough
        expect(result.setEnded).toBe(true);
    });

    it('creates engine with no rules argument (uses all defaults)', () => {
        const engine = createEngine();
        const rules = engine.getRules();
        expect(rules.setsToWin).toBe(2);
        expect(rules.minLead).toBe(2);
    });
});
