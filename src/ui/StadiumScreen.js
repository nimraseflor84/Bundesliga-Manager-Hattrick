import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';
import { FinanceEngine } from '../engine/FinanceEngine.js';
import { audioManager } from '../core/AudioManager.js';

export class StadiumScreen extends Screen {
    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;
        const stadium = team.stadium;
        const upgrades = FinanceEngine.getUpgradeCosts(team);
        const attendance = FinanceEngine.calcAttendance(team);
        const fillRate = Math.round((attendance / stadium.capacity) * 100);

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('stadium')}

                <div class="dos-window">
                    <div class="dos-window-title">STADION - ${stadium.name.toUpperCase()}</div>
                    <div class="dos-window-content">
                        <div class="grid-2">
                            <div>
                                <h2>Stadioninfo</h2>
                                <table class="dos-table">
                                    <tbody>
                                        <tr><td style="color: var(--text-yellow);">Name</td><td>${stadium.name}</td></tr>
                                        <tr><td style="color: var(--text-yellow);">Kapazitaet</td><td>${stadium.capacity.toLocaleString('de-DE')}</td></tr>
                                        <tr><td style="color: var(--text-yellow);">Zuschauerschnitt</td><td>${attendance.toLocaleString('de-DE')} (${fillRate}%)</td></tr>
                                        <tr><td style="color: var(--text-yellow);">Dach</td><td>${stadium.roof ? '<span style="color:var(--text-green);">JA</span>' : '<span style="color:var(--text-red);">NEIN</span>'}</td></tr>
                                        <tr><td style="color: var(--text-yellow);">Flutlicht</td><td>${stadium.floodlights ? '<span style="color:var(--text-green);">JA</span>' : '<span style="color:var(--text-red);">NEIN</span>'}</td></tr>
                                        <tr><td style="color: var(--text-yellow);">Fanshop</td><td>${stadium.fanShop ? '<span style="color:var(--text-green);">JA</span>' : '<span style="color:var(--text-red);">NEIN</span>'}</td></tr>
                                        <tr><td style="color: var(--text-yellow);">Parkplaetze</td><td>${stadium.parking.toLocaleString('de-DE')}</td></tr>
                                        <tr><td style="color: var(--text-yellow);">VIP-Logen</td><td>${stadium.vipBoxes}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <h2>Ticketpreise</h2>
                                <div class="mb-2">
                                    <span style="color: var(--text-yellow);">Aktuell:</span>
                                    <span style="color: var(--text-bright); font-size: 1.2rem;">${stadium.ticketPrice} EUR</span>
                                </div>
                                <div class="flex" style="flex-wrap: wrap;">
                                    ${[20, 25, 30, 35, 40, 50, 60, 75].map(price => `
                                        <button class="dos-btn dos-btn-small ${price === stadium.ticketPrice ? 'dos-btn-primary' : ''}"
                                                data-price="${price}">
                                            ${price} EUR
                                        </button>
                                    `).join('')}
                                </div>
                                <div class="mt-2 text-small text-muted">
                                    Hoehere Preise = mehr Einnahmen, aber weniger Zuschauer
                                </div>

                                <h2 class="mt-3">Stadion-Visualisierung</h2>
                                <div style="border: 2px solid var(--border-light); padding: 8px; text-align: center; background: #001a00;">
                                    <pre style="color: var(--text-green); font-size: 0.75rem; line-height: 1.2;">
  ╔══════════════════════════╗
  ║ ${stadium.roof ? '▓▓▓▓▓▓  DACH  ▓▓▓▓▓▓' : '░░░░░░░░░░░░░░░░░░░░░░░░'}║
  ║┌────────────────────────┐║
  ║│ ${String(stadium.capacity).padStart(6, ' ')} Plaetze          │║
  ║│    ┌──────────────┐    │║
  ║│    │  ⚽ SPIELFELD │    │║
  ║│    └──────────────┘    │║
  ║│  ${stadium.fanShop ? '🏪 Shop' : '       '}    ${stadium.floodlights ? '💡 Licht' : '        '}  │║
  ║└────────────────────────┘║
  ║  🅿 ${String(stadium.parking).padStart(5, ' ')}   VIP: ${String(stadium.vipBoxes).padStart(3, ' ')}    ║
  ╚══════════════════════════╝</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="dos-window">
                    <div class="dos-window-title">STADIONAUSBAU</div>
                    <div class="dos-window-content">
                        <div class="mb-2">
                            <span style="color: var(--text-yellow);">Verfuegbares Budget:</span>
                            <span style="color: var(--text-green);">${this._fmt(team.budget)}</span>
                        </div>
                        <table class="dos-table">
                            <thead>
                                <tr><th>Ausbau</th><th>Aktuell</th><th class="num">Kosten</th><th></th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Kapazitaet (+1.000)</td>
                                    <td>${stadium.capacity.toLocaleString('de-DE')}</td>
                                    <td class="num">${this._fmt(upgrades.capacity.cost)}</td>
                                    <td><button class="dos-btn dos-btn-small" data-upgrade="capacity"
                                        ${team.budget < upgrades.capacity.cost ? 'disabled' : ''}>AUSBAUEN</button></td>
                                </tr>
                                ${!stadium.roof ? `
                                <tr>
                                    <td>Dach installieren</td>
                                    <td>NEIN</td>
                                    <td class="num">${this._fmt(upgrades.roof.cost)}</td>
                                    <td><button class="dos-btn dos-btn-small" data-upgrade="roof"
                                        ${team.budget < upgrades.roof.cost ? 'disabled' : ''}>BAUEN</button></td>
                                </tr>` : ''}
                                ${!stadium.fanShop ? `
                                <tr>
                                    <td>Fanshop bauen</td>
                                    <td>NEIN</td>
                                    <td class="num">${this._fmt(upgrades.fanShop.cost)}</td>
                                    <td><button class="dos-btn dos-btn-small" data-upgrade="fanShop"
                                        ${team.budget < upgrades.fanShop.cost ? 'disabled' : ''}>BAUEN</button></td>
                                </tr>` : ''}
                                <tr>
                                    <td>Parkplaetze (+500)</td>
                                    <td>${stadium.parking.toLocaleString('de-DE')}</td>
                                    <td class="num">${this._fmt(upgrades.parking.cost)}</td>
                                    <td><button class="dos-btn dos-btn-small" data-upgrade="parking"
                                        ${team.budget < upgrades.parking.cost ? 'disabled' : ''}>AUSBAUEN</button></td>
                                </tr>
                                <tr>
                                    <td>VIP-Logen (+10)</td>
                                    <td>${stadium.vipBoxes}</td>
                                    <td class="num">${this._fmt(upgrades.vipBoxes.cost)}</td>
                                    <td><button class="dos-btn dos-btn-small" data-upgrade="vipBoxes"
                                        ${team.budget < upgrades.vipBoxes.cost ? 'disabled' : ''}>AUSBAUEN</button></td>
                                </tr>
                            </tbody>
                        </table>
                        <div id="upgrade-msg" class="mt-2" style="color: var(--text-green);"></div>
                    </div>
                </div>

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();

        // Ticket price buttons
        this._el.querySelectorAll('[data-price]').forEach(btn => {
            btn.addEventListener('click', () => {
                team.stadium.ticketPrice = parseInt(btn.dataset.price);
                this.render();
            });
        });

        // Upgrade buttons
        this._el.querySelectorAll('[data-upgrade]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.upgrade;
                const success = FinanceEngine.upgradeStadium(state.playerTeamId, type);
                const msgEl = this._el.querySelector('#upgrade-msg');
                if (success) {
                    audioManager.playUpgradeSuccess();
                    msgEl.style.color = 'var(--text-green)';
                    msgEl.textContent = 'Ausbau erfolgreich!';
                    setTimeout(() => this.render(), 800);
                } else {
                    audioManager.playErrorBuzz();
                    msgEl.style.color = 'var(--text-red)';
                    msgEl.textContent = 'Nicht genug Budget!';
                }
            });
        });
    }

    _fmt(amount) {
        if (Math.abs(amount) >= 1000000) return `${(amount / 1000000).toFixed(1)} Mio.`;
        if (Math.abs(amount) >= 1000) return `${(amount / 1000).toFixed(0)} Tsd.`;
        return `${amount} EUR`;
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
