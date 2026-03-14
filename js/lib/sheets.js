// js/lib/sheets.js
import { SHEETS_CACHE_TTL_MS } from './constants.js';

export function parseCSV(text) {
    let lines = [], row = [], field = '', inQuote = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (inQuote && i + 1 < text.length && text[i + 1] === '"') { field += '"'; i++; }
            else { inQuote = !inQuote; }
        } else if (c === ',' && !inQuote) {
            row.push(field); field = '';
        } else if (c === '\n' && !inQuote) {
            row.push(field); lines.push(row); row = []; field = '';
        } else if (c !== '\r') {
            field += c;
        }
    }
    if (field || row.length) { row.push(field); lines.push(row); }
    return lines;
}

const sheetCache = new Map();

function hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash &= hash;
    }
    return hash.toString(36);
}

export async function fetchSheet(sheetId, gid) {
    const cacheKey = `${sheetId}_${gid}`;
    const cached = sheetCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < SHEETS_CACHE_TTL_MS) {
        return cached.data;
    }

    const url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:csv&gid=' + gid;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Sheets fetch failed: ' + res.status);
    const text = await res.text();
    const data = parseCSV(text);

    sheetCache.set(cacheKey, { data, hash: hashContent(text), timestamp: Date.now() });
    return data;
}

export function clearSheetsCache() {
    sheetCache.clear();
}

export async function fetchCSV(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('CSV fetch failed: ' + res.status);
    return res.text();
}
