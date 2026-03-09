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
