import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { teamsBL1 } from '../data/teams-bl1.js';
import { playersBL1 } from '../data/players-bl1.js';
import { LeagueManager } from '../engine/LeagueManager.js';

export class NewGameScreen extends Screen {
    constructor() {
        super();
        this._selectedTeam = null;
    }

    render() {
        this.setContent(`
            <div class="fade-in">
                <div class="dos-window">
                    <div class="dos-window-title">NEUES SPIEL - TEAMAUSWAHL</div>
                    <div class="dos-window-content">
                        <h2>Waehle dein Team fuer die Saison 2025/26:</h2>
                        <div class="team-grid mt-2" id="team-grid">
                            ${teamsBL1.map(t => `
                                <div class="team-card" data-team="${t.id}">
                                    <div>${t.name}</div>
                                    <div class="team-card-strength">
                                        ${'★'.repeat(Math.round(t.strength / 20))}${'☆'.repeat(5 - Math.round(t.strength / 20))}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="dos-window hidden" id="team-info">
                    <div class="dos-window-title">TEAM-INFO</div>
                    <div class="dos-window-content" id="team-info-content"></div>
                </div>

                <div class="flex-between mt-2">
                    <button class="dos-btn" id="btn-back">ZURUECK</button>
                    <button class="dos-btn dos-btn-primary" id="btn-start" disabled>
                        SPIEL STARTEN
                    </button>
                </div>
            </div>
        `);

        // Team selection
        const grid = this._el.querySelector('#team-grid');
        grid.addEventListener('click', (e) => {
            const card = e.target.closest('.team-card');
            if (!card) return;

            // Deselect all
            grid.querySelectorAll('.team-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            const teamId = card.dataset.team;
            this._selectedTeam = teamsBL1.find(t => t.id === teamId);
            this._showTeamInfo();
            this._el.querySelector('#btn-start').disabled = false;
        });

        // Back
        this._el.querySelector('#btn-back').addEventListener('click', () => {
            router.navigate('#title');
        });

        // Start
        this._el.querySelector('#btn-start').addEventListener('click', () => {
            if (!this._selectedTeam) return;
            this._startGame();
        });
    }

    _showTeamInfo() {
        const t = this._selectedTeam;
        const infoEl = this._el.querySelector('#team-info');
        const contentEl = this._el.querySelector('#team-info-content');

        infoEl.classList.remove('hidden');
        contentEl.innerHTML = `
            <div class="grid-2">
                <div>
                    <span style="color: var(--text-yellow);">Team:</span> ${t.name}<br>
                    <span style="color: var(--text-yellow);">Kuerzel:</span> ${t.shortName}<br>
                    <span style="color: var(--text-yellow);">Staerke:</span> ${t.strength}/99
                </div>
                <div>
                    <span style="color: var(--text-yellow);">Stadion:</span> ${t.stadiumName}<br>
                    <span style="color: var(--text-yellow);">Kapazitaet:</span> ${t.stadiumCapacity.toLocaleString('de-DE')}<br>
                    <span style="color: var(--text-yellow);">Budget:</span> ${(t.budget / 1000000).toFixed(1)} Mio. EUR
                </div>
            </div>
        `;
    }

    _startGame() {
        const state = gameState.createNewGame(this._selectedTeam.id, teamsBL1, playersBL1);
        gameState.init(state);
        LeagueManager.initSeason();
        LeagueManager.autoSetLineups();
        router.navigate('#dashboard');
    }
}
