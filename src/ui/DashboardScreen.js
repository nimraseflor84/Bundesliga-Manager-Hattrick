import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';

export class DashboardScreen extends Screen {
    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;
        const seasonComplete = LeagueManager.isSeasonComplete();
        const totalMD = LeagueManager.getTotalMatchdays();
        const currentMD = state.currentMatchday;

        // Next fixture
        let nextFixtureHtml = '';
        if (!seasonComplete && state.fixtures[currentMD]) {
            const nextMatch = state.fixtures[currentMD].find(
                m => m.home === team.id || m.away === team.id
            );
            if (nextMatch) {
                const opponent = gameState.getTeam(
                    nextMatch.home === team.id ? nextMatch.away : nextMatch.home
                );
                const homeAway = nextMatch.home === team.id ? 'HEIM' : 'AUSWAERTS';
                nextFixtureHtml = `
                    <span style="color: var(--text-cyan);">${homeAway}</span> vs
                    <span style="color: var(--text-bright);">${opponent.name}</span>
                    <span style="color: var(--text-muted);">(Staerke: ${opponent.strength})</span>
                `;
            }
        }

        // Last result
        let lastResultHtml = 'Noch kein Spiel';
        if (currentMD > 0) {
            const lastMD = LeagueManager.getMatchdayResult(currentMD);
            const userMatch = LeagueManager.getUserMatch(lastMD);
            if (userMatch) {
                const homeTeam = gameState.getTeam(userMatch.home);
                const awayTeam = gameState.getTeam(userMatch.away);
                const isHome = userMatch.home === team.id;
                const won = isHome
                    ? userMatch.homeGoals > userMatch.awayGoals
                    : userMatch.awayGoals > userMatch.homeGoals;
                const draw = userMatch.homeGoals === userMatch.awayGoals;
                const resultColor = won ? 'var(--text-green)' : draw ? 'var(--text-yellow)' : 'var(--text-red)';
                lastResultHtml = `
                    <span style="color: ${resultColor};">
                        ${homeTeam.shortName} ${userMatch.homeGoals}:${userMatch.awayGoals} ${awayTeam.shortName}
                    </span>
                `;
            }
        }

        // Top 5 standings
        const top5 = standings.slice(0, 5);

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('dashboard')}

                <div class="dos-window">
                    <div class="dos-window-title">BUERO - ${team.name.toUpperCase()}</div>
                    <div class="dos-window-content">
                        <h1>Willkommen, ${state.managerName || 'Manager'}!</h1>
                        <div style="color: var(--text-primary);">
                            Saison ${state.season} | Spieltag ${currentMD}/${totalMD} |
                            Tabellenplatz: <span style="color: var(--text-yellow);">${position}.</span>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="dos-window">
                        <div class="dos-window-title">NAECHSTES SPIEL</div>
                        <div class="dos-window-content">
                            ${seasonComplete
                                ? '<span style="color: var(--text-yellow);">SAISON BEENDET!</span>'
                                : `<div>Spieltag ${currentMD + 1}</div>${nextFixtureHtml}`
                            }
                        </div>
                    </div>

                    <div class="dos-window">
                        <div class="dos-window-title">LETZTES ERGEBNIS</div>
                        <div class="dos-window-content">
                            ${lastResultHtml}
                        </div>
                    </div>

                    <div class="dos-window">
                        <div class="dos-window-title">TABELLE (TOP 5)</div>
                        <div class="dos-window-content">
                            <table class="dos-table">
                                <thead>
                                    <tr>
                                        <th>#</th><th>Team</th><th class="num">P</th>
                                        <th class="num">S</th><th class="num">U</th>
                                        <th class="num">N</th><th class="num">Pkt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${top5.map((t, i) => `
                                        <tr class="${t.id === team.id ? 'highlight' : ''}">
                                            <td>${i + 1}</td>
                                            <td>${t.shortName}</td>
                                            <td class="num">${t.won + t.drawn + t.lost}</td>
                                            <td class="num">${t.won}</td>
                                            <td class="num">${t.drawn}</td>
                                            <td class="num">${t.lost}</td>
                                            <td class="num">${t.points}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="dos-window">
                        <div class="dos-window-title">FINANZEN & KADER</div>
                        <div class="dos-window-content">
                            <span style="color: var(--text-yellow);">Budget:</span>
                            <span style="color: ${team.budget >= 0 ? 'var(--text-green)' : 'var(--text-red)'};">
                                ${(team.budget / 1000000).toFixed(1)} Mio. EUR
                            </span><br>
                            <span style="color: var(--text-yellow);">Kaderstärke:</span>
                            ${gameState.getTeamPlayers(team.id).length} Spieler<br>
                            <span style="color: var(--text-yellow);">Aufstellung:</span>
                            ${team.lineup && team.lineup.length === 11
                                ? '<span style="color: var(--text-green);">Komplett</span>'
                                : `<span style="color: var(--text-red);">${(team.lineup || []).length}/11</span>`
                            }<br>
                            <span style="color: var(--text-yellow);">Transferfenster:</span>
                            ${state.transferWindow !== 'closed'
                                ? `<span style="color: var(--text-green);">${state.transferWindow === 'summer' ? 'SOMMER' : 'WINTER'} OFFEN</span>`
                                : '<span style="color: var(--text-muted);">Geschlossen</span>'
                            }
                        </div>
                    </div>
                </div>

                <div class="flex-center mt-2">
                    ${seasonComplete
                        ? `<button class="dos-btn dos-btn-primary" id="btn-season-end"
                                style="font-size: 1.1rem; padding: 8px 24px;">
                            SAISONENDE
                          </button>`
                        : `<button class="dos-btn dos-btn-primary" id="btn-next-matchday"
                                style="font-size: 1.1rem; padding: 8px 24px;">
                            NAECHSTER SPIELTAG ▶
                          </button>`
                    }
                </div>

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();

        if (!seasonComplete) {
            this._el.querySelector('#btn-next-matchday').addEventListener('click', () => {
                router.navigate('#matchday');
            });
        } else {
            this._el.querySelector('#btn-season-end').addEventListener('click', () => {
                this._showSeasonSummary();
            });
        }
    }

    _showSeasonSummary() {
        const standings = gameState.getStandings();
        const team = gameState.getPlayerTeam();
        if (!team) return;
        const position = standings.findIndex(t => t.id === team.id) + 1;
        const champion = standings[0];

        let message = '';
        if (position === 1) {
            message = 'HERZLICHEN GLUECKWUNSCH! DU BIST DEUTSCHER MEISTER!';
        } else if (position <= 4) {
            message = `Platz ${position} - Champions League Qualifikation!`;
        } else if (position <= 6) {
            message = `Platz ${position} - Europa League Qualifikation.`;
        } else if (position >= 16) {
            message = `Platz ${position} - ABSTIEG! Das war nichts...`;
        } else {
            message = `Platz ${position} - Solide Saison.`;
        }

        this.setContent(`
            <div class="fade-in" style="padding: 20px;">
                <div class="dos-window">
                    <div class="dos-window-title">SAISONENDE 2025/26</div>
                    <div class="dos-window-content text-center p-3">
                        <h1>${message}</h1>
                        <div class="mt-3">
                            <span style="color: var(--text-yellow); font-family: var(--font-heading); font-size: 0.6rem;">
                                DEUTSCHER MEISTER: ${champion.name}
                            </span>
                        </div>
                        <div class="mt-3">
                            <h2>Abschlusstabelle</h2>
                            <table class="dos-table mt-2">
                                <thead>
                                    <tr>
                                        <th>#</th><th>Team</th><th class="num">Sp</th>
                                        <th class="num">S</th><th class="num">U</th>
                                        <th class="num">N</th><th class="num">Tore</th>
                                        <th class="num">Diff</th><th class="num">Pkt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${standings.map((t, i) => {
                                        let cls = '';
                                        if (t.id === team.id) cls = 'highlight';
                                        else if (i >= 15) cls = 'relegation';
                                        else if (i === 14) cls = 'relegation-playoff';
                                        return `
                                        <tr class="${cls}">
                                            <td>${i + 1}</td>
                                            <td>${t.name}</td>
                                            <td class="num">${t.won + t.drawn + t.lost}</td>
                                            <td class="num">${t.won}</td>
                                            <td class="num">${t.drawn}</td>
                                            <td class="num">${t.lost}</td>
                                            <td class="num">${t.goalsFor}:${t.goalsAgainst}</td>
                                            <td class="num">${t.goalsFor - t.goalsAgainst > 0 ? '+' : ''}${t.goalsFor - t.goalsAgainst}</td>
                                            <td class="num">${t.points}</td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="mt-3">
                            <button class="dos-btn dos-btn-primary" id="btn-new-season"
                                    style="font-size: 1.1rem; padding: 8px 24px;">
                                NEUES SPIEL
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        this._el.querySelector('#btn-new-season').addEventListener('click', () => {
            router.navigate('#title');
        });
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
