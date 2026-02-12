import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';
import { FinanceEngine } from '../engine/FinanceEngine.js';

export class FinancesScreen extends Screen {
    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;
        const summary = FinanceEngine.getSummary(state.playerTeamId);
        const players = gameState.getPlayerTeamPlayers();
        const weeklySalary = players.reduce((s, p) => s + p.salary, 0);

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('finances')}

                <div class="dos-window">
                    <div class="dos-window-title">FINANZEN - ${team.name.toUpperCase()}</div>
                    <div class="dos-window-content">
                        <div class="grid-2">
                            <div>
                                <h2>Kontostand</h2>
                                <div style="font-size: 1.4rem; color: ${team.budget >= 0 ? 'var(--text-green)' : 'var(--text-red)'};">
                                    ${this._fmt(team.budget)}
                                </div>
                            </div>
                            <div>
                                <h2>Bilanz</h2>
                                <div style="color: ${summary.balance >= 0 ? 'var(--text-green)' : 'var(--text-red)'};">
                                    ${summary.balance >= 0 ? '+' : ''}${this._fmt(summary.balance)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid-2">
                    <div class="dos-window">
                        <div class="dos-window-title">EINNAHMEN</div>
                        <div class="dos-window-content">
                            <table class="dos-table">
                                <thead>
                                    <tr><th>Kategorie</th><th class="num">Betrag</th></tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(summary.incomeByCategory).map(([cat, amount]) => `
                                        <tr>
                                            <td>${cat}</td>
                                            <td class="num text-success">${this._fmt(amount)}</td>
                                        </tr>
                                    `).join('') || '<tr><td colspan="2">Noch keine Einnahmen</td></tr>'}
                                    <tr style="border-top: 2px solid var(--border-light);">
                                        <td style="color: var(--text-bright);">GESAMT</td>
                                        <td class="num text-success" style="color: var(--text-bright);">${this._fmt(summary.totalIncome)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="dos-window">
                        <div class="dos-window-title">AUSGABEN</div>
                        <div class="dos-window-content">
                            <table class="dos-table">
                                <thead>
                                    <tr><th>Kategorie</th><th class="num">Betrag</th></tr>
                                </thead>
                                <tbody>
                                    ${Object.entries(summary.expensesByCategory).map(([cat, amount]) => `
                                        <tr>
                                            <td>${cat}</td>
                                            <td class="num text-danger">${this._fmt(amount)}</td>
                                        </tr>
                                    `).join('') || '<tr><td colspan="2">Noch keine Ausgaben</td></tr>'}
                                    <tr style="border-top: 2px solid var(--border-light);">
                                        <td style="color: var(--text-bright);">GESAMT</td>
                                        <td class="num text-danger" style="color: var(--text-bright);">${this._fmt(summary.totalExpenses)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="dos-window">
                    <div class="dos-window-title">LAUFENDE KOSTEN</div>
                    <div class="dos-window-content">
                        <table class="dos-table">
                            <thead>
                                <tr><th>Posten</th><th class="num">Pro Woche</th><th class="num">Pro Saison (est.)</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Spielergehaelter</td>
                                    <td class="num">${this._fmt(weeklySalary)}</td>
                                    <td class="num">${this._fmt(weeklySalary * 34)}</td>
                                </tr>
                                <tr>
                                    <td>Stadionunterhalt</td>
                                    <td class="num">${this._fmt(Math.floor(team.stadium.capacity * 0.5))}</td>
                                    <td class="num">${this._fmt(Math.floor(team.stadium.capacity * 0.5 * 34))}</td>
                                </tr>
                                <tr>
                                    <td>TV-Gelder (Einnahme)</td>
                                    <td class="num text-success">+${this._fmt(Math.floor(team.finances.tvMoney / 34))}</td>
                                    <td class="num text-success">+${this._fmt(team.finances.tvMoney)}</td>
                                </tr>
                                <tr>
                                    <td>Sponsoren (Einnahme)</td>
                                    <td class="num text-success">+${this._fmt(Math.floor(team.finances.sponsorIncome / 34))}</td>
                                    <td class="num text-success">+${this._fmt(team.finances.sponsorIncome)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();
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
