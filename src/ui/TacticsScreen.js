import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { formations, isPositionCompatible } from '../data/formations.js';
import { LeagueManager } from '../engine/LeagueManager.js';

export class TacticsScreen extends Screen {
    constructor() {
        super();
        this._selectedBenchPlayerId = null;
    }

    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }
        const standings = gameState.getStandings();
        const position = standings.findIndex(t => t.id === team.id) + 1;
        const allPlayers = gameState.getPlayerTeamPlayers();
        const formation = formations[team.formation] || formations['4-4-2'];
        const lineupIds = team.lineup || [];
        const lineupPlayers = lineupIds.map(id => gameState.getPlayer(id)).filter(Boolean);
        const benchPlayers = allPlayers.filter(p => !lineupIds.includes(p.id));
        const effectiveStrength = LeagueManager.getEffectiveStrength(team.id);

        this._selectedBenchPlayerId = null;

        this.setContent(`
            <div class="fade-in">
                ${this._renderNav('tactics')}

                <div class="dos-window">
                    <div class="dos-window-title">AUFSTELLUNG - ${team.name.toUpperCase()}</div>
                    <div class="dos-window-content">
                        ${this._renderFormationSelector(team.formation)}

                        <div style="margin-top: 12px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                            <button class="dos-btn dos-btn-primary" id="btn-auto-lineup">AUTO-AUFSTELLUNG</button>
                            <span style="color: var(--text-yellow);">
                                Effektive Staerke:
                                <span style="color: var(--text-bright);" id="effective-strength">${effectiveStrength}</span>
                            </span>
                            <span style="color: var(--text-muted);">
                                (${lineupPlayers.length}/11 Spieler aufgestellt)
                            </span>
                        </div>

                        ${this._renderFormationPitch(formation, lineupIds)}
                    </div>
                </div>

                <div class="dos-window" id="bench-window">
                    <div class="dos-window-title">VERFUEGBARE SPIELER (${benchPlayers.length})</div>
                    <div class="dos-window-content">
                        <div id="assignment-message" class="hidden" style="margin-bottom: 8px; padding: 6px; color: var(--text-cyan); border: 1px solid var(--text-cyan);">
                        </div>
                        ${this._renderBenchTable(benchPlayers)}
                    </div>
                </div>

                ${this._renderStatusBar(state, team, position)}
            </div>
        `);

        this._bindNav();
        this._bindFormationSelector(team);
        this._bindAutoLineup(team);
        this._bindPitchSlots(team, formation);
        this._bindBenchPlayers(team, formation, benchPlayers);
    }

    // =========================================================================
    // Rendering helpers
    // =========================================================================

    _renderFormationSelector(currentFormation) {
        const formationKeys = Object.keys(formations);
        return `
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${formationKeys.map(key => `
                    <button class="dos-btn dos-btn-small ${key === currentFormation ? 'dos-btn-primary' : ''}"
                            data-formation="${key}">
                        ${key}
                    </button>
                `).join('')}
            </div>
        `;
    }

    _renderFormationPitch(formation, lineupIds) {
        const slots = formation.slots;

        // Build positioned slot elements inside a pitch container
        const slotElements = slots.map((slot, index) => {
            const player = index < lineupIds.length ? gameState.getPlayer(lineupIds[index]) : null;
            const playerName = player ? player.shortName : 'LEER';
            const playerRating = player ? player.overall : '--';
            const nameColor = player ? 'var(--text-bright)' : 'var(--text-muted)';
            const ratingColor = player
                ? (player.overall >= 80 ? 'var(--text-green)' : player.overall >= 65 ? 'var(--text-yellow)' : 'var(--text-red)')
                : 'var(--text-muted)';
            const slotBorder = player ? 'var(--text-green)' : 'var(--border-color, var(--text-muted))';

            return `
                <div class="pitch-slot"
                     data-slot-index="${index}"
                     style="
                        position: absolute;
                        left: ${slot.x}%;
                        top: ${slot.y}%;
                        transform: translate(-50%, -50%);
                        text-align: center;
                        cursor: pointer;
                        padding: 4px 6px;
                        min-width: 80px;
                        border: 1px solid ${slotBorder};
                        background: rgba(0, 0, 0, 0.7);
                     ">
                    <div style="color: var(--text-cyan); font-size: 0.55rem;">${slot.role}</div>
                    <div style="color: ${nameColor}; font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;">${playerName}</div>
                    <div style="color: ${ratingColor}; font-size: 0.55rem;">${playerRating}</div>
                </div>
            `;
        }).join('');

        return `
            <div id="pitch-container" style="
                position: relative;
                width: 100%;
                max-width: 520px;
                height: 400px;
                margin: 12px auto 0 auto;
                background: linear-gradient(to bottom, #1a3a1a, #0d2a0d);
                border: 2px solid var(--text-green);
                overflow: hidden;
            ">
                <!-- Pitch markings -->
                <div style="
                    position: absolute;
                    left: 50%; top: 50%;
                    transform: translate(-50%, -50%);
                    width: 80px; height: 80px;
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 50%;
                "></div>
                <div style="
                    position: absolute;
                    left: 0; right: 0; top: 50%;
                    height: 1px;
                    background: rgba(255,255,255,0.15);
                "></div>
                <div style="
                    position: absolute;
                    left: 25%; right: 25%; top: 0;
                    height: 12%;
                    border: 1px solid rgba(255,255,255,0.15);
                    border-top: none;
                "></div>
                <div style="
                    position: absolute;
                    left: 25%; right: 25%; bottom: 0;
                    height: 12%;
                    border: 1px solid rgba(255,255,255,0.15);
                    border-bottom: none;
                "></div>
                ${slotElements}
            </div>
        `;
    }

    _renderBenchTable(benchPlayers) {
        if (benchPlayers.length === 0) {
            return `<div style="color: var(--text-muted); padding: 8px;">Alle Spieler sind aufgestellt.</div>`;
        }

        // Sort bench: by position group then by overall descending
        const posOrder = { 'TW': 0, 'IV': 1, 'LV': 1, 'RV': 1, 'ZDM': 2, 'ZM': 2, 'ZOM': 2, 'LM': 2, 'RM': 2, 'LA': 3, 'RA': 3, 'ST': 3 };
        const sorted = [...benchPlayers].sort((a, b) => {
            const pa = posOrder[a.position] !== undefined ? posOrder[a.position] : 9;
            const pb = posOrder[b.position] !== undefined ? posOrder[b.position] : 9;
            if (pa !== pb) return pa - pb;
            return b.overall - a.overall;
        });

        return `
            <table class="dos-table" id="bench-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Pos</th>
                        <th class="num">GES</th>
                        <th class="num">FIT</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(p => {
                        const fitnessColor = p.fitness >= 80 ? 'var(--text-green)' : p.fitness >= 50 ? 'var(--text-yellow)' : 'var(--text-red)';
                        const overallColor = p.overall >= 80 ? 'var(--text-green)' : p.overall >= 65 ? 'var(--text-yellow)' : 'var(--text-red)';
                        const statusText = p.injured ? 'VERLETZT' : p.fitness < 30 ? 'MUEDE' : '';
                        const statusColor = p.injured ? 'var(--text-red)' : 'var(--text-yellow)';
                        return `
                            <tr data-bench-player="${p.id}" style="cursor: pointer;">
                                <td style="color: var(--text-bright);">${p.shortName}</td>
                                <td style="color: var(--text-cyan);">${p.position}${p.secondaryPosition ? '/' + p.secondaryPosition : ''}</td>
                                <td class="num" style="color: ${overallColor};">${p.overall}</td>
                                <td class="num" style="color: ${fitnessColor};">${p.fitness}</td>
                                <td style="color: ${statusColor}; font-size: 0.5rem;">${statusText}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // =========================================================================
    // Event binding
    // =========================================================================

    _bindFormationSelector(team) {
        this._el.querySelectorAll('[data-formation]').forEach(btn => {
            btn.addEventListener('click', () => {
                const newFormation = btn.dataset.formation;
                if (newFormation !== team.formation) {
                    team.formation = newFormation;
                    // Clear lineup when formation changes - players must be reassigned
                    team.lineup = [];
                    this.render();
                }
            });
        });
    }

    _bindAutoLineup(team) {
        const btn = this._el.querySelector('#btn-auto-lineup');
        if (btn) {
            btn.addEventListener('click', () => {
                LeagueManager.autoSetLineup(team.id);
                this.render();
            });
        }
    }

    _bindPitchSlots(team, formation) {
        this._el.querySelectorAll('.pitch-slot').forEach(slotEl => {
            slotEl.addEventListener('click', () => {
                const slotIndex = parseInt(slotEl.dataset.slotIndex, 10);
                const lineupIds = team.lineup || [];

                // If we have a bench player selected, try to assign them to this slot
                if (this._selectedBenchPlayerId !== null) {
                    const player = gameState.getPlayer(this._selectedBenchPlayerId);
                    const slotRole = formation.slots[slotIndex].role;

                    if (player && isPositionCompatible(player.position, slotRole, player.secondaryPosition)) {
                        // Remove any existing player in this slot
                        const newLineup = [...lineupIds];
                        while (newLineup.length <= slotIndex) {
                            newLineup.push(null);
                        }
                        // If someone was in this slot, they go back to bench
                        newLineup[slotIndex] = this._selectedBenchPlayerId;

                        // Remove nulls from end, compact lineup
                        team.lineup = this._compactLineup(newLineup);
                        this._selectedBenchPlayerId = null;
                        this.render();
                    } else {
                        // Show incompatible message
                        const msgEl = this._el.querySelector('#assignment-message');
                        if (msgEl) {
                            msgEl.classList.remove('hidden');
                            const posLabel = player ? (player.secondaryPosition ? player.position + '/' + player.secondaryPosition : player.position) : '?';
                            msgEl.textContent = `${player ? player.shortName : 'Spieler'} (${posLabel}) passt nicht auf Position ${slotRole}!`;
                            msgEl.style.color = 'var(--text-red)';
                            msgEl.style.borderColor = 'var(--text-red)';
                        }
                    }
                    return;
                }

                // No bench player selected: clicking an occupied slot removes that player
                if (slotIndex < lineupIds.length && lineupIds[slotIndex] !== null) {
                    const newLineup = [...lineupIds];
                    newLineup[slotIndex] = null;
                    team.lineup = this._compactLineup(newLineup);
                    this.render();
                }
            });
        });
    }

    _bindBenchPlayers(team, formation, benchPlayers) {
        this._el.querySelectorAll('[data-bench-player]').forEach(row => {
            row.addEventListener('click', () => {
                const playerId = row.dataset.benchPlayer;
                const player = gameState.getPlayer(playerId);
                if (!player) return;

                this._selectedBenchPlayerId = playerId;

                // Highlight the selected bench row
                this._el.querySelectorAll('[data-bench-player]').forEach(r => {
                    r.style.background = '';
                });
                row.style.background = 'var(--text-cyan)';
                row.style.color = 'var(--bg-primary, #000)';

                // Show assignment message
                const msgEl = this._el.querySelector('#assignment-message');
                if (msgEl) {
                    msgEl.classList.remove('hidden');
                    msgEl.style.color = 'var(--text-cyan)';
                    msgEl.style.borderColor = 'var(--text-cyan)';
                    const benchPosLabel = player.secondaryPosition ? player.position + '/' + player.secondaryPosition : player.position;
                    msgEl.textContent = `${player.shortName} (${benchPosLabel}) ausgewaehlt. Klicke auf eine kompatible Position im Spielfeld.`;
                }

                // Highlight compatible slots on the pitch
                const slots = formation.slots;
                this._el.querySelectorAll('.pitch-slot').forEach(slotEl => {
                    const slotIndex = parseInt(slotEl.dataset.slotIndex, 10);
                    const slotRole = slots[slotIndex].role;
                    if (isPositionCompatible(player.position, slotRole, player.secondaryPosition)) {
                        slotEl.style.borderColor = 'var(--text-cyan)';
                        slotEl.style.borderWidth = '2px';
                        slotEl.style.boxShadow = '0 0 6px var(--text-cyan)';
                    } else {
                        slotEl.style.borderColor = 'var(--text-muted)';
                        slotEl.style.borderWidth = '1px';
                        slotEl.style.boxShadow = 'none';
                        slotEl.style.opacity = '0.4';
                    }
                });
            });
        });
    }

    // =========================================================================
    // Utilities
    // =========================================================================

    /**
     * Remove null entries from lineup, preserving assigned slot mapping.
     * Returns a new array with nulls removed but slot order maintained
     * by rebuilding from a sparse to dense array.
     */
    _compactLineup(lineupArr) {
        // We keep the sparse approach: the lineup array maps index -> player ID
        // But we need to handle the mapping carefully.
        // The lineup is simply an ordered array of player IDs for the formation slots.
        // Nulls represent empty slots.
        // We keep nulls so slot indices stay aligned with formation slot indices.
        // Trim trailing nulls only.
        const result = [...lineupArr];
        while (result.length > 0 && result[result.length - 1] === null) {
            result.pop();
        }
        return result;
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
