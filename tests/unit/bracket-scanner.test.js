import { describe, it, expect } from 'vitest';
import { scanBracketForAquilon } from '../../js/modules/bracket-scanner.js';

describe('scanBracketForAquilon', () => {
  it('should find Aquilons match in bracket rows', () => {
    const rows = [
      ['', '', '', '', ''],
      ['Match 13', '', '', '', ''],
      ['9h00', '', '', '', ''],
      ['Aquilons', '', '', '', ''],
      ['Tigres', '', '', '', ''],
      ['Terrain 1', '', '', '', ''],
    ];
    const matches = scanBracketForAquilon(rows);
    expect(matches.length).toBe(1);
    expect(matches[0].matchExterne).toBe(13);
    expect(matches[0].adversaire).toBe('Tigres');
  });

  it('should return empty array when no Aquilons match', () => {
    const rows = [
      ['Match 13', '', '', '', ''],
      ['Tigres', '', '', '', ''],
      ['Bleu et Or', '', '', '', ''],
    ];
    expect(scanBracketForAquilon(rows)).toEqual([]);
  });

  it('should handle TBD opponent', () => {
    const rows = [
      ['Match 14', '', '', '', ''],
      ['Aquilons', '', '', '', ''],
    ];
    const matches = scanBracketForAquilon(rows);
    expect(matches[0].adversaire).toBe('TBD');
  });

  it('should detect time and terrain', () => {
    const rows = [
      ['Match 15', '', '', '', ''],
      ['10h30', '', 'Terrain 2', '', ''],
      ['Aquilons', '', '', '', ''],
      ['Express U14', '', '', '', ''],
    ];
    const matches = scanBracketForAquilon(rows);
    expect(matches[0].heure).toBe('10h30');
    expect(matches[0].terrain).toBe('Terrain 2');
  });

  it('should handle empty rows gracefully', () => {
    expect(scanBracketForAquilon([])).toEqual([]);
  });

  it('should be case-insensitive for Aquilons matching', () => {
    const rows = [
      ['Match 13', '', '', '', ''],
      ['AQUILONS', '', '', '', ''],
      ['Tigres', '', '', '', ''],
    ];
    expect(scanBracketForAquilon(rows).length).toBe(1);
  });

  it('should return match properties with correct shape', () => {
    const rows = [
      ['Match 20', '', '', '', ''],
      ['11h00', '', 'Terrain 3', '', ''],
      ['Aquilons', '', '', '', ''],
      ['Husky JDN', '', '', '', ''],
    ];
    const match = scanBracketForAquilon(rows)[0];
    expect(match).toHaveProperty('matchExterne');
    expect(match).toHaveProperty('adversaire');
    expect(match).toHaveProperty('heure');
    expect(match).toHaveProperty('terrain');
  });
});
