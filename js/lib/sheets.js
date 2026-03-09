// js/lib/sheets.js

export function parseCSV(text) {
    var lines = [], row = [], field = '', inQuote = false;
    for (var i = 0; i < text.length; i++) {
        var c = text[i];
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

export async function fetchSheet(sheetId, gid) {
    var url = 'https://docs.google.com/spreadsheets/d/' + sheetId + '/gviz/tq?tqx=out:csv&gid=' + gid;
    var res = await fetch(url);
    if (!res.ok) throw new Error('Sheets fetch failed: ' + res.status);
    var text = await res.text();
    return parseCSV(text);
}

export async function fetchCSV(url) {
    var res = await fetch(url);
    if (!res.ok) throw new Error('CSV fetch failed: ' + res.status);
    return res.text();
}
