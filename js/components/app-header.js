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
        const page = this.getAttribute('page') || 'resultats';

        // Scorekeeper never shows a selector
        if (page === 'scorekeeper') return;

        const container = this.querySelector('.tournoi-selector');
        if (!container) return;

        // Build buttons
        container.innerHTML = tournois.map(function (t) {
            var cls = t.slug === actif ? 'tournoi-btn active' : 'tournoi-btn';
            return '<button class="' + cls + '" data-tournoi="' + t.slug + '">' +
                escapeHTML(t.nom) + '</button>';
        }).join('');

        // Attach click handlers
        var self = this;
        container.querySelectorAll('.tournoi-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var slug = btn.dataset.tournoi;
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
        if (page === 'scorekeeper') {
            return this._buildScorekeeperHeader();
        }
        return this._buildFullHeader(page);
    }

    _buildFullHeader(page) {
        var headerContent = '' +
            '<div class="header">' +
                '<img src="logo.jpg" alt="Aquilons" class="header-logo">' +
                '<div class="team-name">Aquilons</div>' +
                '<div class="team-sub">Jean de Br\u00e9beuf \u00b7 Benjamin D2</div>' +
                (page === 'resultats' ? this._buildTournamentInfo() : '') +
            '</div>';

        var navContent = '' +
            '<div class="nav">' +
                '<a href="index.html"' + (page === 'resultats' ? ' class="active"' : '') + '>R\u00e9sultats</a>' +
                '<a href="classement.html"' + (page === 'classement' ? ' class="active"' : '') + '>Classement</a>' +
                '<a href="stats.html"' + (page === 'stats' ? ' class="active"' : '') + '>Stats</a>' +
            '</div>';

        var selectorContainer = '<div class="tournoi-selector"></div>';

        return headerContent + navContent + selectorContainer;
    }

    _buildTournamentInfo() {
        return '' +
            '<div class="tournament-info">' +
                '<div class="tourney-name"></div>' +
                '<div class="tourney-detail"></div>' +
            '</div>';
    }

    _buildScorekeeperHeader() {
        return '' +
            '<div class="header" style="padding:1rem;">' +
                '<img src="logo.jpg" alt="Aquilons" class="header-logo" ' +
                    'style="width:50px;vertical-align:middle;margin-right:0.5rem">' +
                '<span class="header-title" style="font-family:\'Oswald\',sans-serif;' +
                    'font-size:1.2rem;font-weight:700;text-transform:uppercase;' +
                    'letter-spacing:0.1em;color:var(--silver-light);display:inline;' +
                    'vertical-align:middle">Match en cours</span>' +
            '</div>' +
            '<div class="nav">' +
                '<a href="index.html">R\u00e9sultats</a>' +
                '<a href="match.html" class="active">Match</a>' +
            '</div>';
    }

    /**
     * Update the .tourney-name and .tourney-detail elements when tournament changes.
     */
    _updateTourneyInfo(tournois, actif) {
        var t = tournois.find(function (item) { return item.slug === actif; });
        if (!t) return;

        var nameEl = this.querySelector('.tourney-name');
        if (nameEl) nameEl.textContent = t.nom;

        var detailEl = this.querySelector('.tourney-detail');
        if (detailEl) detailEl.textContent = (t.config && t.config.detail) || '';
    }

    /**
     * Hide the Classement nav link when the active tournament is not 'cvs'.
     */
    _updateClassementLink(actif) {
        var link = this.querySelector('.nav a[href="classement.html"]');
        if (link) {
            link.style.display = (actif === 'cvs') ? '' : 'none';
        }
    }
}

customElements.define('app-header', AppHeader);
