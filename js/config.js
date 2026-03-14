// js/config.js
import { getClient } from './lib/supabase.js';
import { TOURNOI_LIST_CACHE_TTL_MS } from './lib/constants.js';

let cache = {};
let listCache = null;
let listCacheTime = 0;

export async function getTournoiConfig(slug) {
    if (cache[slug]) return cache[slug];
    const { data, error } = await getClient()
        .from('tournois').select('*').eq('slug', slug).single();
    if (error) throw error;
    cache[slug] = data;
    return data;
}

export async function listTournois() {
    const now = Date.now();
    if (listCache && now - listCacheTime < TOURNOI_LIST_CACHE_TTL_MS) {
        return listCache;
    }
    const { data, error } = await getClient()
        .from('tournois').select('id,nom,slug,equipe,config').order('nom');
    if (error) throw error;
    listCache = data;
    listCacheTime = now;
    return data;
}

export function getTournoiActif() {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('tournoi');
    if (p) return p;
    return localStorage.getItem('tournoi') || 'cvs';
}

export function setTournoiActif(slug) {
    localStorage.setItem('tournoi', slug);
    const url = new URL(window.location);
    url.searchParams.set('tournoi', slug);
    history.replaceState(null, '', url);
}
