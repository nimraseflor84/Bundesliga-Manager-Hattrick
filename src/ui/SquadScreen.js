import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';

export class SquadScreen extends Screen {
    constructor() {
        super();
        this._sortColumn = 'position';
        this._sortAscending = true;
    }

    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const players = gameState.getPlayerTeamPlayers();
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;
        const lineup = team.lineup || [];

        const sortedPlayers = this._sortPlayers([...players], this._sortColumn, this._sortAscending);

        const sortIndicator = (col) => {
            if (this._sortColumn === col) {
                return this._sortAscending ? ' \u25B2' : ' \u25BC';
            }
            return '';
        };

        const playerRows = sortedPlayers.map(p => {
            const isInLineup = lineup.includes(p.id);
            const isInjured = p.injured;

            const rowStyle = isInjured ? 'color: var(--text-red);' : '';
            const lineupMarker = isInLineup
                ? '<span style="color: var(--text-green);">\u25CF</span>'
                : '<span style="color: var(--text-muted);">\u00B7</span>';

            const fitnessColor = this._getStatColor(p.fitness);
            const moraleColor = this._getStatColor(p.morale);

            const salaryFormatted = Math.round(p.salary / 1000) + ' Tsd.';

            return `
                <tr style="${rowStyle}">
                    <td>${lineupMarker}</td>
                    <td>${p.name}${isInjured ? ' <span style="color: var(--text-red);">[V]</span>' : ''}</td>
                    <td>${p.position}${p.secondaryPosition ? '/' + p.secondaryPosition : ''}</td>
                    <td class="num">${p.age}</td>
                    <td class="num" style="color: var(--text-bright);">${p.overall}</td>
                    <td class="num">${p.speed}</td>
                    <td class="num">${p.shooting}</td>
                    <td class="num">${p.passing}</td>
                    <td class="num">${p.defense}</td>
                    <td class="num">${p.goalkeeper}</td>
                    <td class="num" style="color: ${fitnessColor};">${p.fitness}</td>
                    <td class="num" style="color: ${moraleColor};">${p.morale}</td>
                    <td class="num">${p.goals}</td>
                    <td class="num" style="color: var(--text-yellow);">${salaryFormatted}</td>
                </tr>
            `;
        }).join('');

        const totalSalary = players.reduce((sum, p) => sum + p.salary, 0);
        const totalSalaryFormatted = Math.round(totalSalary / 1000) + ' Tsd.';

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('squad')}

                <div class="dos-window">
                    <div class="dos-window-title">KADER - ${team.name.toUpperCase()}</div>
                    <div class="dos-window-content">
                        <div style="overflow-x: auto;">
                            <table class="dos-table">
                                <thead>
                                    <tr>
                                        <th data-sort="lineup" style="cursor: pointer;"></th>
                                        <th data-sort="name" style="cursor: pointer;">Name${sortIndicator('name')}</th>
                                        <th data-sort="position" style="cursor: pointer;">Pos${sortIndicator('position')}</th>
                                        <th data-sort="age" class="num" style="cursor: pointer;">Alter${sortIndicator('age')}</th>
                                        <th data-sort="overall" class="num" style="cursor: pointer;">GES${sortIndicator('overall')}</th>
                                        <th data-sort="speed" class="num" style="cursor: pointer;">SPD${sortIndicator('speed')}</th>
                                        <th data-sort="shooting" class="num" style="cursor: pointer;">SCH${sortIndicator('shooting')}</th>
                                        <th data-sort="passing" class="num" style="cursor: pointer;">PAS${sortIndicator('passing')}</th>
                                        <th data-sort="defense" class="num" style="cursor: pointer;">DEF${sortIndicator('defense')}</th>
                                        <th data-sort="goalkeeper" class="num" style="cursor: pointer;">TW${sortIndicator('goalkeeper')}</th>
                                        <th data-sort="fitness" class="num" style="cursor: pointer;">FIT${sortIndicator('fitness')}</th>
                                        <th data-sort="morale" class="num" style="cursor: pointer;">MOR${sortIndicator('morale')}</th>
                                        <th data-sort="goals" class="num" style="cursor: pointer;">Tore${sortIndicator('goals')}</th>
                                        <th data-sort="salary" class="num" style="cursor: pointer;">Gehalt${sortIndicator('salary')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${playerRows}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td></td>
                                        <td style="color: var(--text-cyan);">${players.length} Spieler</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td class="num" style="color: var(--text-bright);">${players.reduce((s, p) => s + p.goals, 0)}</td>
                                        <td class="num" style="color: var(--text-yellow);">${totalSalaryFormatted}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div class="mt-2 text-small">
                            <span style="color: var(--text-green);">\u25CF</span> In Aufstellung &nbsp;
                            <span style="color: var(--text-red);">[V]</span> Verletzt &nbsp;
                            <span style="color: var(--text-green);">\u2588</span> &gt;75 &nbsp;
                            <span style="color: var(--text-yellow);">\u2588</span> 50-75 &nbsp;
                            <span style="color: var(--text-red);">\u2588</span> &lt;50
                        </div>
                    </div>
                </div>

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();
        this._bindSortHeaders();
    }

    _sortPlayers(players, column, ascending) {
        const team = gameState.getPlayerTeam();
        const lineup = (team && team.lineup) || [];

        const positionOrder = {
            'TW': 1,
            'IV': 2, 'LV': 3, 'RV': 4,
            'ZDM': 5, 'ZM': 6, 'ZOM': 7, 'LM': 8, 'RM': 9,
            'LA': 10, 'RA': 11, 'ST': 12,
        };

        return players.sort((a, b) => {
            let valA, valB;

            switch (column) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'position':
                    valA = positionOrder[a.position] || 99;
                    valB = positionOrder[b.position] || 99;
                    break;
                case 'lineup':
                    valA = lineup.includes(a.id) ? 0 : 1;
                    valB = lineup.includes(b.id) ? 0 : 1;
                    break;
                case 'age':
                    valA = a.age;
                    valB = b.age;
                    break;
                case 'overall':
                    valA = a.overall;
                    valB = b.overall;
                    break;
                case 'speed':
                    valA = a.speed;
                    valB = b.speed;
                    break;
                case 'shooting':
                    valA = a.shooting;
                    valB = b.shooting;
                    break;
                case 'passing':
                    valA = a.passing;
                    valB = b.passing;
                    break;
                case 'defense':
                    valA = a.defense;
                    valB = b.defense;
                    break;
                case 'goalkeeper':
                    valA = a.goalkeeper;
                    valB = b.goalkeeper;
                    break;
                case 'fitness':
                    valA = a.fitness;
                    valB = b.fitness;
                    break;
                case 'morale':
                    valA = a.morale;
                    valB = b.morale;
                    break;
                case 'goals':
                    valA = a.goals;
                    valB = b.goals;
                    break;
                case 'salary':
                    valA = a.salary;
                    valB = b.salary;
                    break;
                default:
                    valA = positionOrder[a.position] || 99;
                    valB = positionOrder[b.position] || 99;
                    break;
            }

            if (valA < valB) return ascending ? -1 : 1;
            if (valA > valB) return ascending ? 1 : -1;
            return 0;
        });
    }

    _getStatColor(value) {
        if (value > 75) return 'var(--text-green)';
        if (value >= 50) return 'var(--text-yellow)';
        return 'var(--text-red)';
    }

    _bindSortHeaders() {
        this._el.querySelectorAll('[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (this._sortColumn === col) {
                    this._sortAscending = !this._sortAscending;
                } else {
                    this._sortColumn = col;
                    this._sortAscending = col === 'name' || col === 'position';
                }
                this.render();
            });
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
