// js/components/app-header.js
// <app-header> web component — header, nav, and tournament selector
// Usage: <app-header page="resultats"></app-header>

import { escapeHTML } from '../lib/ui.js';

class AppHeader extends HTMLElement {

    connectedCallback() {
        const page = this.getAttribute('page') || 'resultats';
        this.innerHTML = this._buildHTML(page);
    }

    /**
     * Populate the tournament selector buttons and wire up switching.
     * @param {Array<{slug:string, nom:string, config?:object}>} tournois
     * @param {string} actif - active slug
     * @param {function(string):void} onSwitch - callback when user clicks a different tournament
     */
    renderSelector(tournois, actif, onSwitch) {
        const container = this.querySelector('.tournoi-selector');
        if (!container) return;

        // Build buttons
        container.innerHTML = tournois.map(function (t) {
            const cls = t.slug === actif ? 'tournoi-btn active' : 'tournoi-btn';
            return '<button class="' + cls + '" data-tournoi="' + t.slug + '">' +
                escapeHTML(t.nom) + '</button>';
        }).join('');

        // Attach click handlers
        const self = this;
        container.querySelectorAll('.tournoi-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const slug = btn.dataset.tournoi;
                if (slug === actif) return;
                actif = slug;

                // Update button active states
                container.querySelectorAll('.tournoi-btn').forEach(function (b) {
                    b.classList.toggle('active', b.dataset.tournoi === actif);
                });

                // Update tournament info in header (resultats page)
                self._updateTourneyInfo(tournois, actif);

                // Hide/show Classement link based on tournament
                self._updateClassementLink(actif);

                onSwitch(slug);
            });
        });

        // Apply initial state
        this._updateTourneyInfo(tournois, actif);
        this._updateClassementLink(actif);
    }

    // ——— Private helpers ———

    _buildHTML(page) {
        return this._buildFullHeader(page);
    }

    _buildFullHeader(page) {
        const headerContent = '' +
            '<div class="header">' +
                '<img src="logo.jpg" alt="Aquilons" class="header-logo">' +
                '<div class="team-name">Aquilons</div>' +
                '<div class="team-sub">Jean de Br\u00e9beuf \u00b7 Benjamin D2</div>' +
                (page === 'resultats' ? this._buildTournamentInfo() : '') +
            '</div>';

        const navContent = '' +
            '<div class="nav">' +
                '<a href="index.html"' + (page === 'resultats' ? ' class="active"' : '') + '>R\u00e9sultats</a>' +
                '<a href="classement.html"' + (page === 'classement' ? ' class="active"' : '') + '>Classement</a>' +
                '<a href="stats.html"' + (page === 'stats' ? ' class="active"' : '') + '>Stats</a>' +
            '</div>';

        const selectorContainer = '<div class="tournoi-selector"></div>';

        return headerContent + navContent + selectorContainer;
    }

    _buildTournamentInfo() {
        return '' +
            '<div class="tournament-info">' +
                '<div class="tourney-name"></div>' +
                '<div class="tourney-detail"></div>' +
            '</div>';
    }

    /**
     * Update the .tourney-name and .tourney-detail elements when tournament changes.
     */
    _updateTourneyInfo(tournois, actif) {
        const t = tournois.find(function (item) { return item.slug === actif; });
        if (!t) return;

        const nameEl = this.querySelector('.tourney-name');
        if (nameEl) nameEl.textContent = t.nom;

        const detailEl = this.querySelector('.tourney-detail');
        if (detailEl) detailEl.textContent = (t.config && t.config.detail) || '';
    }

    /**
     * Hide the Classement nav link when the active tournament is not 'cvs'.
     */
    _updateClassementLink(actif) {
        const link = this.querySelector('.nav a[href="classement.html"]');
        if (link) {
            link.style.display = (actif === 'cvs') ? '' : 'none';
        }
    }
}

customElements.define('app-header', AppHeader);
