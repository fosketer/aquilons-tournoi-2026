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

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;

const activeSubscriptions = new Map();

export function subscribe(channelName, table, callback) {
    // Clean up any existing subscription with this name
    unsubscribe(channelName);

    let reconnectDelay = RECONNECT_DELAY_MS;
    let reconnectTimer = null;
    let removed = false;

    function connect() {
        if (removed) return;
        const ch = getClient()
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
            .subscribe(function(status, err) {
                if (removed) return;
                if (status === 'SUBSCRIBED') {
                    reconnectDelay = RECONNECT_DELAY_MS;
                    console.log('[realtime] ' + channelName + ' connected');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                    console.warn('[realtime] ' + channelName + ' ' + status + (err ? ': ' + err : '') + ', reconnecting in ' + reconnectDelay + 'ms');
                    scheduleReconnect();
                }
            });
        activeSubscriptions.set(channelName, { channel: ch, remove: cleanup });
    }

    function scheduleReconnect() {
        if (removed || reconnectTimer) return;
        reconnectTimer = setTimeout(function() {
            reconnectTimer = null;
            if (removed) return;
            try { getClient().removeChannel(activeSubscriptions.get(channelName)?.channel); } catch(e) { console.debug('[realtime] cleanup:', e); }
            connect();
        }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
    }

    function cleanup() {
        removed = true;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    }

    connect();
}

export function unsubscribe(channelName) {
    const sub = activeSubscriptions.get(channelName);
    if (sub) {
        sub.remove();
        try { getClient().removeChannel(sub.channel); } catch(e) { console.debug('[realtime] cleanup:', e); }
        activeSubscriptions.delete(channelName);
    }
}

export function removeAllChannels() {
    for (const [, sub] of activeSubscriptions) {
        sub.remove();
    }
    activeSubscriptions.clear();
    getClient().removeAllChannels();
}
