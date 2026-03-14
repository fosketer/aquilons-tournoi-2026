import { describe, it, expect } from 'vitest';
import { computeBilan, formatSetInfo } from '../../js/modules/match-renderer.js';

describe('computeBilan', () => {
  it('should count wins, losses, draws', () => {
    const matchs = [
      { statut: 'win', aq_set1: 25, adv_set1: 20, aq_set2: 25, adv_set2: 15, aq_set3: null, adv_set3: null },
      { statut: 'loss', aq_set1: 20, adv_set1: 25, aq_set2: 15, adv_set2: 25, aq_set3: null, adv_set3: null },
      { statut: 'draw', aq_set1: 25, adv_set1: 20, aq_set2: 20, adv_set2: 25, aq_set3: null, adv_set3: null },
    ];
    const result = computeBilan(matchs);
    expect(result.wins).toBe(1);
    expect(result.losses).toBe(1);
    expect(result.draws).toBe(1);
  });

  it('should count sets won and lost', () => {
    const matchs = [
      { statut: 'win', aq_set1: 25, adv_set1: 20, aq_set2: 25, adv_set2: 15, aq_set3: null, adv_set3: null },
      { statut: 'loss', aq_set1: 20, adv_set1: 25, aq_set2: 15, adv_set2: 25, aq_set3: null, adv_set3: null },
    ];
    const result = computeBilan(matchs);
    expect(result.setsW).toBe(2);
    expect(result.setsL).toBe(2);
  });

  it('should handle set 3', () => {
    const matchs = [
      { statut: 'win', aq_set1: 25, adv_set1: 20, aq_set2: 20, adv_set2: 25, aq_set3: 15, adv_set3: 10 },
    ];
    const result = computeBilan(matchs);
    expect(result.setsW).toBe(2);
    expect(result.setsL).toBe(1);
  });

  it('should handle empty match list', () => {
    const result = computeBilan([]);
    expect(result.wins).toBe(0);
    expect(result.setsW).toBe(0);
  });

  it('should skip upcoming matches for sets count', () => {
    const matchs = [
      { statut: 'upcoming', aq_set1: null, adv_set1: null, aq_set2: null, adv_set2: null, aq_set3: null, adv_set3: null },
    ];
    const result = computeBilan(matchs);
    expect(result.setsW).toBe(0);
    expect(result.setsL).toBe(0);
  });
});

describe('formatSetInfo', () => {
  it('should format live set info', () => {
    const match = { statut: 'live', set_courant: 2, heure: '10h00', match_externe: null };
    expect(formatSetInfo(match)).toBe('Set 2 en cours');
  });

  it('should format upcoming match time', () => {
    const match = { statut: 'upcoming', heure: '10h30', match_externe: null };
    expect(formatSetInfo(match)).toBe('10h30');
  });

  it('should include match_externe for elimination', () => {
    const match = { statut: 'upcoming', heure: '14h00', match_externe: 13 };
    expect(formatSetInfo(match)).toBe('14h00 \u00b7 M13');
  });
});
