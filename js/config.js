// js/config.js
import { getClient } from './lib/supabase.js';

let cache = {};

export async function getTournoiConfig(slug) {
    if (cache[slug]) return cache[slug];
    const { data, error } = await getClient()
        .from('tournois').select('*').eq('slug', slug).single();
    if (error) throw error;
    cache[slug] = data;
    return data;
}

export async function listTournois() {
    if (cache._list) return cache._list;
    const { data, error } = await getClient()
        .from('tournois').select('id,nom,slug,equipe,config').order('nom');
    if (error) throw error;
    cache._list = data;
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
