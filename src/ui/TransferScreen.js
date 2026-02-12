import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';
import { TransferMarket } from '../engine/TransferMarket.js';
import { audioManager } from '../core/AudioManager.js';

export class TransferScreen extends Screen {
    constructor() {
        super();
        this._tab = 'buy'; // 'buy' or 'sell'
        this._posFilter = '';
        this._minOverall = 0;
        this._message = '';
        this._messageType = '';
    }

    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;
        const windowOpen = state.transferWindow !== 'closed';
        const windowLabel = state.transferWindow === 'summer' ? 'SOMMER' :
                           state.transferWindow === 'winter' ? 'WINTER' : 'GESCHLOSSEN';

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('transfers')}

                <div class="dos-window">
                    <div class="dos-window-title">TRANSFERMARKT</div>
                    <div class="dos-window-content">
                        <div class="flex-between">
                            <div>
                                <span style="color: var(--text-yellow);">Transferfenster:</span>
                                <span style="color: ${windowOpen ? 'var(--text-green)' : 'var(--text-red)'};">
                                    ${windowLabel}
                                </span>
                            </div>
                            <div>
                                <span style="color: var(--text-yellow);">Budget:</span>
                                <span style="color: var(--text-green);">${TransferMarket.formatPrice(team.budget)}</span>
                            </div>
                        </div>
                        <div class="flex mt-2">
                            <button class="dos-btn ${this._tab === 'buy' ? 'dos-btn-primary' : ''}" id="tab-buy">KAUFEN</button>
                            <button class="dos-btn ${this._tab === 'sell' ? 'dos-btn-primary' : ''}" id="tab-sell">VERKAUFEN</button>
                        </div>
                    </div>
                </div>

                ${this._message ? `
                    <div class="dos-window">
                        <div class="dos-window-content" style="color: ${this._messageType === 'success' ? 'var(--text-green)' : 'var(--text-red)'};">
                            ${this._message}
                        </div>
                    </div>
                ` : ''}

                ${this._tab === 'buy' ? this._renderBuyTab(state, team, windowOpen) : this._renderSellTab(state, team, windowOpen)}

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();

        this._el.querySelector('#tab-buy').addEventListener('click', () => {
            this._tab = 'buy';
            this._message = '';
            this.render();
        });

        this._el.querySelector('#tab-sell').addEventListener('click', () => {
            this._tab = 'sell';
            this._message = '';
            this.render();
        });

        // Filter bindings
        const posSelect = this._el.querySelector('#filter-pos');
        if (posSelect) {
            posSelect.value = this._posFilter;
            posSelect.addEventListener('change', () => {
                this._posFilter = posSelect.value;
                this.render();
            });
        }

        const minOvr = this._el.querySelector('#filter-ovr');
        if (minOvr) {
            minOvr.value = this._minOverall;
            minOvr.addEventListener('change', () => {
                this._minOverall = parseInt(minOvr.value) || 0;
                this.render();
            });
        }

        // Buy/sell buttons
        this._el.querySelectorAll('[data-buy]').forEach(btn => {
            btn.addEventListener('click', () => {
                const result = TransferMarket.buyPlayer(btn.dataset.buy, state.playerTeamId);
                this._message = result.message;
                this._messageType = result.success ? 'success' : 'error';
                if (result.success) audioManager.playCashRegister();
                else audioManager.playErrorBuzz();
                this.render();
            });
        });

        this._el.querySelectorAll('[data-sell]').forEach(btn => {
            btn.addEventListener('click', () => {
                const result = TransferMarket.sellPlayer(btn.dataset.sell);
                this._message = result.message;
                this._messageType = result.success ? 'success' : 'error';
                if (result.success) audioManager.playCashRegister();
                else audioManager.playErrorBuzz();
                this.render();
            });
        });
    }

    _renderBuyTab(state, team, windowOpen) {
        const filters = {};
        if (this._posFilter) filters.position = this._posFilter;
        if (this._minOverall) filters.minOverall = this._minOverall;

        const available = TransferMarket.getAvailablePlayers(state.playerTeamId, filters).slice(0, 30);
        const positions = ['TW', 'IV', 'LV', 'RV', 'ZDM', 'ZM', 'ZOM', 'LM', 'RM', 'LA', 'RA', 'ST'];

        return `
            <div class="dos-window">
                <div class="dos-window-title">SPIELER KAUFEN</div>
                <div class="dos-window-content">
                    <div class="flex mb-2" style="flex-wrap: wrap; gap: 8px; align-items: center;">
                        <label style="color: var(--text-yellow);">Position:</label>
                        <select id="filter-pos" class="dos-btn dos-btn-small" style="background: var(--btn-face); color: #000;">
                            <option value="">Alle</option>
                            ${positions.map(p => `<option value="${p}">${p}</option>`).join('')}
                        </select>
                        <label style="color: var(--text-yellow);">Min. GES:</label>
                        <select id="filter-ovr" class="dos-btn dos-btn-small" style="background: var(--btn-face); color: #000;">
                            <option value="0">Alle</option>
                            <option value="60">60+</option>
                            <option value="70">70+</option>
                            <option value="75">75+</option>
                            <option value="80">80+</option>
                            <option value="85">85+</option>
                        </select>
                    </div>
                    ${available.length > 0 ? `
                    <table class="dos-table">
                        <thead>
                            <tr>
                                <th>Name</th><th>Pos</th><th>Alter</th>
                                <th class="num">GES</th><th class="num">Preis</th>
                                <th>Team</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${available.map(p => {
                                const price = TransferMarket.estimatePrice(p);
                                const canAfford = team.budget >= price;
                                const sellerTeam = gameState.getTeam(p.teamId);
                                return `
                                    <tr>
                                        <td>${p.shortName}</td>
                                        <td>${p.position}</td>
                                        <td>${p.age}</td>
                                        <td class="num">${p.overall}</td>
                                        <td class="num">${TransferMarket.formatPrice(price)}</td>
                                        <td>${sellerTeam ? sellerTeam.shortName : '<span style="color:var(--text-yellow)">Vereinslos</span>'}</td>
                                        <td>
                                            <button class="dos-btn dos-btn-small ${canAfford && windowOpen ? 'dos-btn-primary' : ''}"
                                                    data-buy="${p.id}"
                                                    ${!canAfford || !windowOpen ? 'disabled' : ''}>
                                                KAUFEN
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    ` : '<div class="text-muted">Keine Spieler gefunden.</div>'}
                </div>
            </div>
        `;
    }

    _renderSellTab(state, team, windowOpen) {
        const players = gameState.getPlayerTeamPlayers()
            .sort((a, b) => b.overall - a.overall);

        return `
            <div class="dos-window">
                <div class="dos-window-title">SPIELER VERKAUFEN</div>
                <div class="dos-window-content">
                    <table class="dos-table">
                        <thead>
                            <tr>
                                <th>Name</th><th>Pos</th><th>Alter</th>
                                <th class="num">GES</th><th class="num">Gehalt/W</th>
                                <th class="num">Verkaufswert</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${players.map(p => {
                                const price = Math.floor(TransferMarket.estimatePrice(p) * 0.85);
                                const inLineup = team.lineup && team.lineup.includes(p.id);
                                return `
                                    <tr class="${inLineup ? 'highlight' : ''}">
                                        <td>${p.shortName}${inLineup ? ' ★' : ''}</td>
                                        <td>${p.position}</td>
                                        <td>${p.age}</td>
                                        <td class="num">${p.overall}</td>
                                        <td class="num">${Math.floor(p.salary / 1000)} Tsd.</td>
                                        <td class="num">${TransferMarket.formatPrice(price)}</td>
                                        <td>
                                            <button class="dos-btn dos-btn-small dos-btn-danger"
                                                    data-sell="${p.id}"
                                                    ${!windowOpen || players.length <= 11 ? 'disabled' : ''}>
                                                VERKAUFEN
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    unmount() {
        this._message = '';
        super.unmount();
    }

    _renderNav(active) {
        const items = [
            { hash: '#dashboard', label: 'BUERO' },
            { hash: '#squad', label: 'KADER' },
            { hash: '#tactics', label: 'AUFSTELLUNG' },
            { hash: '#training', label: 'TRAINING' },
            { hash: '#table', label: 'TABELLE' },
            { hash: '#fixtures', label: 'SPIELPLAN' },
            { hash: '#finances', label: 'FINANZEN' },
            { hash: '#stadium', label: 'STADION' },
            { hash: '#transfers', label: 'TRANSFERS' },
        ];
        return `<nav class="nav-bar">${items.map(item => `
            <button class="nav-btn ${item.hash === '#' + active ? 'active' : ''}" data-nav="${item.hash}">${item.label}</button>
        `).join('')}</nav>`;
    }

    _bindNav() {
        this._el.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', () => router.navigate(btn.dataset.nav));
        });
    }

    _renderStatusBar(state, team, position) {
        return `<div class="status-bar">
            <span>${team.shortName} | Platz ${position}</span>
            <span>Spieltag ${state.currentMatchday}/${LeagueManager.getTotalMatchdays()}</span>
            <span>${state.season}</span>
        </div>`;
    }
}
