// tests/unit/sheets.test.js
import { describe, it, expect } from 'vitest';
import { parseCSV } from '../../js/lib/sheets.js';

describe('parseCSV', () => {
    it('1. parses a simple CSV into a 2D string array', () => {
        const result = parseCSV('a,b,c\n1,2,3');
        expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    });

    it('2. strips surrounding quotes from quoted fields', () => {
        const result = parseCSV('"hello","world"\n"foo","bar"');
        expect(result).toEqual([['hello', 'world'], ['foo', 'bar']]);
    });

    it('3. converts escaped double-quotes ("") into a single quote character', () => {
        const result = parseCSV('"say ""hello""",plain');
        expect(result).toEqual([['say "hello"', 'plain']]);
    });

    it('4. preserves empty fields in the middle of a row', () => {
        const result = parseCSV('a,,c\n1,,3');
        expect(result).toEqual([['a', '', 'c'], ['1', '', '3']]);
    });

    it('5. returns an empty array for empty input', () => {
        const result = parseCSV('');
        expect(result).toEqual([]);
    });

    it('6. handles a single-column CSV', () => {
        const result = parseCSV('alpha\nbeta\ngamma');
        expect(result).toEqual([['alpha'], ['beta'], ['gamma']]);
    });

    it('7. handles French accents (Brébeuf)', () => {
        const result = parseCSV('École,Équipe\nJean-de-Brébeuf,Aquilons');
        expect(result).toEqual([['École', 'Équipe'], ['Jean-de-Brébeuf', 'Aquilons']]);
    });

    it('8. ignores \\r so Windows line endings (\\r\\n) work correctly', () => {
        const result = parseCSV('a,b\r\n1,2\r\n3,4');
        expect(result).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
    });

    it('9. preserves commas inside quoted fields', () => {
        const result = parseCSV('"Alma, Québec",score\n"1,000",42');
        expect(result).toEqual([['Alma, Québec', 'score'], ['1,000', '42']]);
    });

    it('10. preserves newlines inside quoted fields', () => {
        const result = parseCSV('"line1\nline2",after');
        expect(result).toEqual([['line1\nline2', 'after']]);
    });

    it('11. handles a trailing newline without adding an extra empty row', () => {
        const result = parseCSV('a,b\n1,2\n');
        expect(result).toEqual([['a', 'b'], ['1', '2']]);
    });

    it('12. preserves row order', () => {
        const result = parseCSV('first\nsecond\nthird\nfourth');
        expect(result[0]).toEqual(['first']);
        expect(result[1]).toEqual(['second']);
        expect(result[2]).toEqual(['third']);
        expect(result[3]).toEqual(['fourth']);
    });

    it('13. handles URLs in fields', () => {
        const result = parseCSV('name,url\nAquilons,https://example.com/path?foo=bar');
        expect(result).toEqual([['name', 'url'], ['Aquilons', 'https://example.com/path?foo=bar']]);
    });
});
