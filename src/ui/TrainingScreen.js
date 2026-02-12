import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';
import { TrainingEngine } from '../engine/TrainingEngine.js';
import { audioManager } from '../core/AudioManager.js';

export class TrainingScreen extends Screen {
    constructor() {
        super();
        this._selectedPlayerId = null;
    }

    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;
        const allPlayers = gameState.getPlayerTeamPlayers();

        this._selectedPlayerId = null;

        // Sort by position group then overall
        const posOrder = { 'TW': 0, 'IV': 1, 'LV': 1, 'RV': 1, 'ZDM': 2, 'ZM': 2, 'ZOM': 2, 'LM': 2, 'RM': 2, 'LA': 3, 'RA': 3, 'ST': 3 };
        const sorted = [...allPlayers].sort((a, b) => {
            const pa = posOrder[a.position] !== undefined ? posOrder[a.position] : 9;
            const pb = posOrder[b.position] !== undefined ? posOrder[b.position] : 9;
            if (pa !== pb) return pa - pb;
            return b.overall - a.overall;
        });

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('training')}

                <div class="dos-window">
                    <div class="dos-window-title">TRAINING - ${team.name.toUpperCase()}</div>
                    <div class="dos-window-content">
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                            <span style="color: var(--text-yellow);">
                                Budget: <span style="color: ${team.budget >= 0 ? 'var(--text-green)' : 'var(--text-red)'};" id="budget-display">
                                    ${(team.budget / 1000000).toFixed(1)} Mio. EUR
                                </span>
                            </span>
                            <span style="color: var(--text-muted); font-size: 0.6rem;">
                                Waehle einen Spieler, dann eine Trainingsart.
                            </span>
                        </div>

                        <div class="training-table-scroll">
                        <table class="dos-table training-table-mobile" id="training-players">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Pos</th>
                                    <th class="num">GES</th>
                                    <th class="num col-hide-mobile">SPD</th>
                                    <th class="num col-hide-mobile">SCH</th>
                                    <th class="num col-hide-mobile">PAS</th>
                                    <th class="num col-hide-mobile">DEF</th>
                                    <th class="num col-hide-mobile">TW</th>
                                    <th class="num">FIT</th>
                                    <th class="num">MOR</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sorted.map(p => {
                                    const fitnessColor = p.fitness >= 75 ? 'var(--text-green)' : p.fitness >= 50 ? 'var(--text-yellow)' : 'var(--text-red)';
                                    const moraleColor = p.morale >= 75 ? 'var(--text-green)' : p.morale >= 50 ? 'var(--text-yellow)' : 'var(--text-red)';
                                    const overallColor = p.overall >= 80 ? 'var(--text-green)' : p.overall >= 65 ? 'var(--text-yellow)' : 'var(--text-red)';
                                    let statusText = '';
                                    let statusColor = 'var(--text-muted)';
                                    if (p.injured) { statusText = 'VERLETZT'; statusColor = 'var(--text-red)'; }
                                    else if (p._trainedThisMatchday) { statusText = 'TRAINIERT'; statusColor = 'var(--text-cyan)'; }
                                    return `
                                        <tr data-train-player="${p.id}" style="cursor: pointer;">
                                            <td style="color: var(--text-bright); max-width: 90px; overflow: hidden; text-overflow: ellipsis;">${p.shortName}</td>
                                            <td style="color: var(--text-cyan);">${p.position}</td>
                                            <td class="num" style="color: ${overallColor};">${p.overall}</td>
                                            <td class="num col-hide-mobile">${p.speed || '-'}</td>
                                            <td class="num col-hide-mobile">${p.shooting || '-'}</td>
                                            <td class="num col-hide-mobile">${p.passing || '-'}</td>
                                            <td class="num col-hide-mobile">${p.defense || '-'}</td>
                                            <td class="num col-hide-mobile">${p.goalkeeper || '-'}</td>
                                            <td class="num" style="color: ${fitnessColor};">${p.fitness}</td>
                                            <td class="num" style="color: ${moraleColor};">${p.morale}</td>
                                            <td style="color: ${statusColor}; font-size: 0.5rem;">${statusText}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>

                <!-- Training Options Panel (hidden until player selected) -->
                <div class="dos-window hidden" id="training-options">
                    <div class="dos-window-title" id="training-options-title">TRAINING</div>
                    <div class="dos-window-content" id="training-options-content"></div>
                </div>

                <!-- Training Result Feedback -->
                <div class="hidden" id="training-result" style="padding: 8px; margin-top: 8px; text-align: center;"></div>

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();
        this._bindPlayerSelection();
    }

    _bindPlayerSelection() {
        this._el.querySelectorAll('[data-train-player]').forEach(row => {
            row.addEventListener('click', () => {
                const playerId = row.dataset.trainPlayer;
                this._selectedPlayerId = playerId;

                // Highlight selected row
                this._el.querySelectorAll('[data-train-player]').forEach(r => {
                    r.style.background = '';
                });
                row.style.background = 'var(--bg-highlight)';

                this._showTrainingOptions(playerId);
            });
        });
    }

    _showTrainingOptions(playerId) {
        const player = gameState.getPlayer(playerId);
        if (!player) return;

        const team = gameState.getPlayerTeam();
        const panel = this._el.querySelector('#training-options');
        const title = this._el.querySelector('#training-options-title');
        const content = this._el.querySelector('#training-options-content');

        panel.classList.remove('hidden');
        title.textContent = `TRAINING - ${player.shortName} (${player.position}, ${player.age} Jahre)`;

        const types = TrainingEngine.getTrainingTypes();

        const html = `
            <div class="training-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px;">
                ${types.map(t => {
                    const check = TrainingEngine.canTrain(player, t, team);
                    const chance = TrainingEngine.getSuccessChance(player, t);
                    const chancePercent = Math.round(chance * 100);
                    const chanceColor = chancePercent >= 60 ? 'var(--text-green)' : chancePercent >= 40 ? 'var(--text-yellow)' : 'var(--text-red)';
                    const currentVal = t.attribute === 'fitness' ? player.fitness
                        : t.attribute === 'morale' ? player.morale
                        : (player[t.attribute] || 0);

                    return `
                        <div style="border: 1px solid ${check.available ? 'var(--text-cyan)' : 'var(--text-muted)'};
                                    padding: 8px; background: rgba(0,0,0,0.3);
                                    ${check.available ? 'cursor: pointer;' : 'opacity: 0.5;'}"
                             class="training-card training-card-mobile" data-training="${t.id}" data-available="${check.available}">
                            <div class="card-title" style="font-size: 0.7rem; color: var(--text-bright);">
                                ${t.icon} ${t.name}
                            </div>
                            <div class="card-detail" style="font-size: 0.55rem; color: var(--text-muted); margin-top: 4px;">
                                Aktuell: <span style="color: var(--text-yellow);">${currentVal}</span>
                                ${t.isTeamTraining ? '' : ` | +${t.minGain}-${t.maxGain}`}
                            </div>
                            <div class="card-detail" style="font-size: 0.55rem; color: var(--text-muted);">
                                Chance: <span style="color: ${chanceColor};">${chancePercent}%</span>
                                | Kosten: <span style="color: var(--text-yellow);">${TrainingEngine.formatCost(t.cost)}</span>
                            </div>
                            ${t.fitnessLoss > 0 ? `<div class="card-detail" style="font-size: 0.5rem; color: var(--text-red);">Fitness -${t.fitnessLoss}</div>` : ''}
                            ${!check.available ? `<div class="card-detail" style="font-size: 0.5rem; color: var(--text-red); margin-top: 2px;">${check.reason}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        content.innerHTML = html;

        // Bind training card clicks
        content.querySelectorAll('.training-card[data-available="true"]').forEach(card => {
            card.addEventListener('click', () => {
                this._executeTrain(playerId, card.dataset.training);
            });
        });
    }

    _executeTrain(playerId, trainingTypeId) {
        const result = TrainingEngine.train(playerId, trainingTypeId);

        const resultEl = this._el.querySelector('#training-result');
        resultEl.classList.remove('hidden');

        if (result.success) {
            audioManager.playUpgradeSuccess();
            const attrLabel = this._getAttributeLabel(result.attribute);
            if (result.attribute === 'morale') {
                resultEl.innerHTML = `
                    <div style="color: var(--text-green); border: 2px solid var(--text-green); padding: 8px;">
                        ${result.trainingName}: ${result.playerName} - Moral +${result.gain} fuer alle!
                    </div>
                `;
            } else {
                resultEl.innerHTML = `
                    <div style="color: var(--text-green); border: 2px solid var(--text-green); padding: 8px;">
                        ERFOLG! ${result.playerName}: ${attrLabel} +${result.gain}
                    </div>
                `;
            }
        } else {
            audioManager.playErrorBuzz();
            if (result.error) {
                resultEl.innerHTML = `
                    <div style="color: var(--text-red); border: 2px solid var(--text-red); padding: 8px;">
                        ${result.error}
                    </div>
                `;
            } else {
                resultEl.innerHTML = `
                    <div style="color: var(--text-red); border: 2px solid var(--text-red); padding: 8px;">
                        Training fehlgeschlagen! ${result.playerName} hat sich nicht verbessert.
                    </div>
                `;
            }
        }

        // Refresh the screen after a short delay
        setTimeout(() => {
            this.render();
        }, 1500);
    }

    _getAttributeLabel(attr) {
        const labels = {
            speed: 'Schnelligkeit',
            shooting: 'Schuss',
            passing: 'Passen',
            defense: 'Verteidigung',
            goalkeeper: 'Torwart',
            fitness: 'Fitness',
            morale: 'Moral',
        };
        return labels[attr] || attr;
    }

    // =========================================================================
    // Nav / Status bar
    // =========================================================================

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
