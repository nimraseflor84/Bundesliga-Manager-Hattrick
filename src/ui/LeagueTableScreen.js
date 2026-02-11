import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';

export class LeagueTableScreen extends Screen {
    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('table')}

                <div class="dos-window">
                    <div class="dos-window-title">BUNDESLIGA TABELLE - SPIELTAG ${state.currentMatchday}</div>
                    <div class="dos-window-content">
                        <table class="dos-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Team</th>
                                    <th class="num">Sp</th>
                                    <th class="num">S</th>
                                    <th class="num">U</th>
                                    <th class="num">N</th>
                                    <th class="num">Tore</th>
                                    <th class="num">Diff</th>
                                    <th class="num">Pkt</th>
                                    <th>Form</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${standings.map((t, i) => {
                                    let rowClass = '';
                                    if (t.id === team.id) rowClass = 'highlight';
                                    else if (i >= 16) rowClass = 'relegation';
                                    else if (i === 15) rowClass = 'relegation-playoff';

                                    const gd = t.goalsFor - t.goalsAgainst;
                                    const gdStr = gd > 0 ? `+${gd}` : `${gd}`;
                                    const played = t.won + t.drawn + t.lost;

                                    const form = (t.form || []).map(f => {
                                        if (f === 'W') return '<span style="color: var(--text-green);">S</span>';
                                        if (f === 'D') return '<span style="color: var(--text-yellow);">U</span>';
                                        return '<span style="color: var(--text-red);">N</span>';
                                    }).join(' ');

                                    return `
                                        <tr class="${rowClass}">
                                            <td>${i + 1}</td>
                                            <td>${t.name}</td>
                                            <td class="num">${played}</td>
                                            <td class="num">${t.won}</td>
                                            <td class="num">${t.drawn}</td>
                                            <td class="num">${t.lost}</td>
                                            <td class="num">${t.goalsFor}:${t.goalsAgainst}</td>
                                            <td class="num">${gdStr}</td>
                                            <td class="num" style="color: var(--text-bright);">${t.points}</td>
                                            <td>${form}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        <div class="mt-2 text-small">
                            <span style="color: var(--text-green);">■</span> Champions League &nbsp;
                            <span style="color: var(--text-cyan);">■</span> Europa League &nbsp;
                            <span style="color: var(--text-yellow);">■</span> Relegation &nbsp;
                            <span style="color: var(--text-red);">■</span> Abstieg
                        </div>
                    </div>
                </div>

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();
    }

    _renderNav(active) {
        const items = [
            { hash: '#dashboard', label: 'BUERO' },
            { hash: '#squad', label: 'KADER' },
            { hash: '#tactics', label: 'AUFSTELLUNG' },
            { hash: '#table', label: 'TABELLE' },
            { hash: '#fixtures', label: 'SPIELPLAN' },
            { hash: '#finances', label: 'FINANZEN' },
            { hash: '#stadium', label: 'STADION' },
            { hash: '#transfers', label: 'TRANSFERS' },
        ];
        return `
            <nav class="nav-bar">
                ${items.map(item => `
                    <button class="nav-btn ${item.hash === '#' + active ? 'active' : ''}"
                            data-nav="${item.hash}">
                        ${item.label}
                    </button>
                `).join('')}
            </nav>
        `;
    }

    _bindNav() {
        this._el.querySelectorAll('[data-nav]').forEach(btn => {
            btn.addEventListener('click', () => {
                router.navigate(btn.dataset.nav);
            });
        });
    }

    _renderStatusBar(state, team, position) {
        return `
            <div class="status-bar">
                <span>${team.shortName} | Platz ${position}</span>
                <span>Spieltag ${state.currentMatchday}/${LeagueManager.getTotalMatchdays()}</span>
                <span>${state.season}</span>
            </div>
        `;
    }
}
