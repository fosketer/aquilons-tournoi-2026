// js/lib/supabase.js
const SUPABASE_URL = 'https://rtbmpcitrymeqzpjwneh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Ym1wY2l0cnltZXF6cGp3bmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDgyOTEsImV4cCI6MjA4ODQyNDI5MX0.6qvaCDLDiCX4KZLJHK1_JiPHROoCtiiEQjsBJbS4CiU';

let client = null;

export function getClient() {
    if (!client) {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return client;
}

export async function fetchRows(table, filters = {}, options = {}) {
    let query = getClient().from(table).select(options.select || '*');
    for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
    }
    if (options.order) query = query.order(options.order, { ascending: options.ascending ?? true });
    if (options.limit) query = query.limit(options.limit);
    if (options.not) {
        for (const [col, op, val] of options.not) {
            query = query.not(col, op, val);
        }
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export function subscribe(channel, table, callback) {
    return getClient()
        .channel(channel)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();
}

export function removeAllChannels() {
    getClient().removeAllChannels();
}
