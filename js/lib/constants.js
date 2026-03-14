// js/lib/constants.js
// Named constants replacing magic numbers across the codebase.

// Polling intervals (milliseconds)
export const BRACKET_SCAN_INTERVAL_MS = 120000; // 2 minutes
export const SHEETS_REFRESH_INTERVAL_MS = 120000; // 2 minutes
export const TOURNOI_LIST_CACHE_TTL_MS = 300000; // 5 minutes
export const SHEETS_CACHE_TTL_MS = 300000; // 5 minutes

// Bracket thresholds
export const FIRST_ELIMINATION_MATCH = 13;

// Stats display
export const MAX_POINT_DIFF_BAR = 30;
export const TOTAL_POOL_MATCHES = 6; // 4 teams = 6 possible matches
