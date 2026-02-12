import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';

export class FixturesScreen extends Screen {
    constructor() {
        super();
        this._viewMatchday = null;
    }

    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;

        // Default to current matchday (show last played or next)
        if (this._viewMatchday === null) {
            this._viewMatchday = Math.max(1, state.currentMatchday);
        }

        const totalMD = LeagueManager.getTotalMatchdays();
        const mdIndex = this._viewMatchday - 1;
        const fixtures = state.fixtures[mdIndex] || [];
        const result = LeagueManager.getMatchdayResult(this._viewMatchday);
        const isPlayed = !!result;

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('fixtures')}

                <div class="dos-window">
                    <div class="dos-window-title">SPIELPLAN</div>
                    <div class="dos-window-content">
                        <div class="flex-between mb-2">
                            <button class="dos-btn dos-btn-small" id="btn-prev"
                                    ${this._viewMatchday <= 1 ? 'disabled' : ''}>
                                ◄ ZURUECK
                            </button>
                            <span style="color: var(--text-yellow); font-family: var(--font-heading); font-size: 0.6rem;">
                                SPIELTAG ${this._viewMatchday} / ${totalMD}
                                ${isPlayed ? ' (gespielt)' : ''}
                            </span>
                            <button class="dos-btn dos-btn-small" id="btn-next"
                                    ${this._viewMatchday >= totalMD ? 'disabled' : ''}>
                                WEITER ►
                            </button>
                        </div>

                        <div class="match-results">
                            ${fixtures.map((fix, i) => {
                                const homeTeam = gameState.getTeam(fix.home);
                                const awayTeam = gameState.getTeam(fix.away);
                                const isUser = fix.home === state.playerTeamId || fix.away === state.playerTeamId;
                                const matchResult = isPlayed ? result.matches[i] : null;

                                return `
                                    <div class="match-result-row ${isUser ? 'user-match' : ''}">
                                        <span class="home">${homeTeam.name}</span>
                                        <span class="score">
                                            ${matchResult
                                                ? `${matchResult.homeGoals} : ${matchResult.awayGoals}`
                                                : '-  :  -'
                                            }
                                        </span>
                                        <span>${awayTeam.name}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>

                <div class="dos-window">
                    <div class="dos-window-title">DEINE SPIELE</div>
                    <div class="dos-window-content">
                        ${this._renderTeamSchedule(state, team)}
                    </div>
                </div>

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();

        this._el.querySelector('#btn-prev').addEventListener('click', () => {
            if (this._viewMatchday > 1) {
                this._viewMatchday--;
                this.render();
            }
        });

        this._el.querySelector('#btn-next').addEventListener('click', () => {
            if (this._viewMatchday < totalMD) {
                this._viewMatchday++;
                this.render();
            }
        });
    }

    _renderTeamSchedule(state, team) {
        // Show next 5 and last 5 fixtures
        const all = [];
        for (let i = 0; i < state.fixtures.length; i++) {
            const fix = state.fixtures[i].find(
                m => m.home === team.id || m.away === team.id
            );
            if (fix) {
                const opponent = gameState.getTeam(
                    fix.home === team.id ? fix.away : fix.home
                );
                const isHome = fix.home === team.id;
                const result = LeagueManager.getMatchdayResult(i + 1);
                let scoreStr = '-:-';
                let resultClass = '';
                if (result) {
                    const mr = result.matches.find(
                        m => m.home === team.id || m.away === team.id
                    );
                    if (mr) {
                        scoreStr = `${mr.homeGoals}:${mr.awayGoals}`;
                        const userGoals = isHome ? mr.homeGoals : mr.awayGoals;
                        const oppGoals = isHome ? mr.awayGoals : mr.homeGoals;
                        if (userGoals > oppGoals) resultClass = 'text-success';
                        else if (userGoals < oppGoals) resultClass = 'text-danger';
                        else resultClass = 'text-warning';
                    }
                }

                all.push({
                    md: i + 1,
                    opponent: opponent.shortName,
                    isHome,
                    scoreStr,
                    resultClass,
                    played: !!result,
                });
            }
        }

        // Focus around current matchday
        const current = state.currentMatchday;
        const start = Math.max(0, current - 3);
        const end = Math.min(all.length, current + 5);
        const visible = all.slice(start, end);

        return `
            <table class="dos-table">
                <thead>
                    <tr>
                        <th>Tag</th><th>H/A</th><th>Gegner</th><th class="num">Ergebnis</th>
                    </tr>
                </thead>
                <tbody>
                    ${visible.map(f => `
                        <tr class="${f.md === current + 1 ? 'highlight' : ''}">
                            <td>${f.md}</td>
                            <td>${f.isHome ? 'H' : 'A'}</td>
                            <td>${f.opponent}</td>
                            <td class="num ${f.resultClass}">${f.scoreStr}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    unmount() {
        this._viewMatchday = null;
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
