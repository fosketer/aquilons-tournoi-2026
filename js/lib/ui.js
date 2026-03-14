// js/lib/ui.js
export function showLoading(container) {
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Chargement\u2026</div>';
}

export function showError(container, message, onRetry) {
    container.innerHTML = '<div class="error-banner">' +
        '<div>' + message + '</div>' +
        (onRetry ? '<button class="retry-btn">Réessayer</button>' : '') +
        '</div>';
    if (onRetry) {
        container.querySelector('.retry-btn').addEventListener('click', onRetry);
    }
}

export function showEmpty(container, message) {
    container.innerHTML = '<div class="empty-state">' + message + '</div>';
}

let _escDiv = null;
export function escapeHTML(str) {
    if (!_escDiv) _escDiv = document.createElement('div');
    _escDiv.textContent = str;
    return _escDiv.innerHTML;
}

/**
 * Format adversary region/rank info as inline text.
 * Does NOT escape HTML — caller must wrap in escapeHTML() if used in innerHTML.
 * @param {Object} adv - { region_rseq, rang_regional }
 * @returns {string} e.g., "Saguenay · 1er régional"
 */
export function formatAdversaryInfo(adv) {
    if (!adv) return '';
    const parts = [];
    if (adv.region_rseq) parts.push(adv.region_rseq);
    if (adv.rang_regional) parts.push(adv.rang_regional + (adv.rang_regional === 1 ? 'er' : 'e') + ' r\u00e9gional');
    return parts.join(' \u00b7 ');
}
