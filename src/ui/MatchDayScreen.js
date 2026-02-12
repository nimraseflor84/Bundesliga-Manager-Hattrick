import { Screen } from './Screen.js';
import { router } from '../core/Router.js';
import { gameState } from '../core/GameState.js';
import { LeagueManager } from '../engine/LeagueManager.js';
import { audioManager } from '../core/AudioManager.js';

export class MatchDayScreen extends Screen {
    constructor() {
        super();
        this._result = null;
        this._eventIndex = 0;
        this._tickerInterval = null;
        this._currentMinute = 0;
        this._speed = 80; // Default: Normal
        this._substitutions = []; // {minute, outPlayerId, inPlayerId}
        this._maxSubs = 3;
        this._selectedBenchPlayerId = null;
        this._currentLineupIds = []; // Live lineup during match
        this._userMatch = null;
    }

    render() {
        const state = gameState.get();
        if (!state) { router.navigate('#title'); return; }

        if (LeagueManager.isSeasonComplete()) {
            router.navigate('#dashboard');
            return;
        }

        const currentMD = state.currentMatchday;
        const team = gameState.getPlayerTeam();
        if (!team) { router.navigate('#title'); return; }

        const mdFixtures = state.fixtures[currentMD];
        if (!mdFixtures) { router.navigate('#dashboard'); return; }
        const fixture = mdFixtures.find(
            m => m.home === team.id || m.away === team.id
        );
        if (!fixture) { router.navigate('#dashboard'); return; }
        const homeTeam = gameState.getTeam(fixture.home);
        const awayTeam = gameState.getTeam(fixture.away);
        if (!homeTeam || !awayTeam) { router.navigate('#dashboard'); return; }

        this.setContent(`
            <div class="fade-in">
                <div class="dos-window">
                    <div class="dos-window-title">SPIELTAG ${currentMD + 1} - VORSCHAU</div>
                    <div class="dos-window-content text-center p-3">
                        <h2>Dein Spiel</h2>
                        <div class="mt-2" style="font-size: 1.3rem;">
                            <span style="color: var(--text-bright);">${homeTeam.name}</span>
                            <span style="color: var(--text-muted);"> vs </span>
                            <span style="color: var(--text-bright);">${awayTeam.name}</span>
                        </div>
                        <div class="mt-1 text-small text-muted">
                            ${homeTeam.stadiumName} |
                            Kapazitaet: ${homeTeam.stadiumCapacity.toLocaleString('de-DE')}
                        </div>
                        <div class="mt-3">
                            <button class="dos-btn dos-btn-primary" id="btn-simulate"
                                    style="font-size: 1.1rem; padding: 8px 24px;">
                                ANPFIFF! ▶
                            </button>
                        </div>
                    </div>
                </div>

                <div class="dos-window hidden" id="match-live">
                    <div class="dos-window-title">LIVE-TICKER</div>
                    <div class="dos-window-content">
                        <!-- Speed Controls -->
                        <div id="speed-controls" style="display: flex; gap: 6px; margin-bottom: 8px; align-items: center;">
                            <span style="color: var(--text-muted); font-size: 0.6rem; margin-right: 4px;">TEMPO:</span>
                            <button class="dos-btn dos-btn-small" data-speed="200" id="speed-slow">LANGSAM</button>
                            <button class="dos-btn dos-btn-small dos-btn-primary" data-speed="80" id="speed-normal">NORMAL</button>
                            <button class="dos-btn dos-btn-small" data-speed="30" id="speed-fast">SCHNELL</button>
                        </div>

                        <div class="text-center mb-2" id="scoreboard"></div>
                        <div id="ticker" style="height: 180px; overflow-y: auto; padding: 4px;
                             background: #000; border: 1px solid var(--border-dark);"></div>
                    </div>
                </div>

                <!-- Fitness Panel -->
                <div class="dos-window hidden" id="fitness-panel">
                    <div class="dos-window-title">DEINE ELF - FITNESS</div>
                    <div class="dos-window-content" id="fitness-content"></div>
                </div>

                <!-- Substitution Panel -->
                <div class="dos-window hidden" id="sub-panel">
                    <div class="dos-window-title" id="sub-title">AUSWECHSLUNGEN (0/${this._maxSubs})</div>
                    <div class="dos-window-content">
                        <div id="sub-message" style="color: var(--text-cyan); font-size: 0.6rem; margin-bottom: 6px;">
                            Klicke einen Bankspieler, dann einen Aufstellungsspieler zum Wechseln.
                        </div>
                        <div id="sub-lineup" style="margin-bottom: 8px;"></div>
                        <div id="sub-bench"></div>
                    </div>
                </div>

                <div class="dos-window hidden" id="other-results">
                    <div class="dos-window-title">ANDERE ERGEBNISSE</div>
                    <div class="dos-window-content" id="other-results-content"></div>
                </div>

                <div class="hidden" id="post-match-buttons">
                    <div class="flex-center mt-2">
                        <button class="dos-btn" id="btn-to-table">TABELLE</button>
                        <button class="dos-btn dos-btn-primary" id="btn-to-dashboard">WEITER</button>
                    </div>
                </div>
            </div>
        `);

        this._el.querySelector('#btn-simulate').addEventListener('click', () => {
            audioManager.playWhistle('single');
            audioManager.startMatchMusic();
            this._simulateMatchday();
        });
    }

    _simulateMatchday() {
        const result = LeagueManager.simulateMatchday();
        if (!result) return;

        this._result = result;
        this._substitutions = [];
        this._selectedBenchPlayerId = null;
        const state = gameState.get();
        const team = gameState.getPlayerTeam();
        if (!team) return;

        const userMatch = result.matches.find(
            m => m.home === state.playerTeamId || m.away === state.playerTeamId
        );
        if (!userMatch) { this._showPostMatch(result); return; }
        this._userMatch = userMatch;

        const homeTeam = gameState.getTeam(userMatch.home);
        const awayTeam = gameState.getTeam(userMatch.away);
        if (!homeTeam || !awayTeam) { this._showPostMatch(result); return; }

        // Initialize current lineup from the player's team
        const isHome = userMatch.home === state.playerTeamId;
        const playerTeam = isHome ? homeTeam : awayTeam;
        this._currentLineupIds = [...(playerTeam.lineup || [])];

        // Get bench players (team players not in lineup)
        const allPlayers = gameState.getTeamPlayers(state.playerTeamId);
        this._benchPlayerIds = allPlayers
            .filter(p => !this._currentLineupIds.includes(p.id) && !p.injured)
            .map(p => p.id);

        // Hide preview, show live area
        this._el.querySelector('#btn-simulate').closest('.dos-window').classList.add('hidden');
        this._el.querySelector('#match-live').classList.remove('hidden');
        this._el.querySelector('#fitness-panel').classList.remove('hidden');
        this._el.querySelector('#sub-panel').classList.remove('hidden');

        const scoreboard = this._el.querySelector('#scoreboard');
        const ticker = this._el.querySelector('#ticker');

        // Render initial fitness panel
        this._renderFitnessPanel();
        this._renderSubstitutionPanel();

        // Bind speed controls
        this._bindSpeedControls();

        // Start ticker
        const events = userMatch.events;
        this._eventIndex = 0;

        scoreboard.innerHTML = `
            <div style="font-size: 1.4rem; color: var(--text-bright);">
                ${homeTeam.shortName}
                <span id="score-home" style="color: var(--text-green);">0</span>
                :
                <span id="score-away" style="color: var(--text-green);">0</span>
                ${awayTeam.shortName}
            </div>
            <div id="match-minute" style="color: var(--text-yellow); font-size: 0.9rem;">1'</div>
        `;

        ticker.innerHTML = `<div style="color: var(--text-green);">⚽ ANPFIFF! Der Ball rollt!</div>`;

        this._currentMinute = 0;
        this._homeScore = 0;
        this._awayScore = 0;

        const runTicker = () => {
            this._currentMinute += 1;

            if (this._currentMinute > 93) {
                clearInterval(this._tickerInterval);
                this._tickerInterval = null;
                audioManager.playWhistle('final');
                audioManager.stopMusic();

                const minuteEl = this._el.querySelector('#match-minute');
                if (minuteEl) minuteEl.textContent = 'ABPFIFF!';

                ticker.innerHTML += `<div style="color: var(--text-green); margin-top: 4px;">
                    ⚽ ABPFIFF! Endergebnis: ${homeTeam.shortName} ${userMatch.homeGoals}:${userMatch.awayGoals} ${awayTeam.shortName}
                </div>`;
                ticker.scrollTop = ticker.scrollHeight;

                // Apply substitution fitness adjustments
                this._applySubstitutionFitness();

                this._showPostMatch(result);
                return;
            }

            const minuteEl = this._el.querySelector('#match-minute');
            if (minuteEl) minuteEl.textContent = `${this._currentMinute}'`;

            if (this._currentMinute === 46) {
                audioManager.playWhistle('half');
                ticker.innerHTML += `<div style="color: var(--text-cyan); margin-top: 4px;">
                    --- HALBZEIT ---
                </div>`;
            }

            while (this._eventIndex < events.length && events[this._eventIndex].minute <= this._currentMinute) {
                const evt = events[this._eventIndex];
                let eventHtml = '';

                if (evt.type === 'goal') {
                    if (evt.team === 'home') this._homeScore++;
                    else this._awayScore++;

                    const scoreHomeEl = this._el.querySelector('#score-home');
                    const scoreAwayEl = this._el.querySelector('#score-away');
                    if (scoreHomeEl) scoreHomeEl.textContent = this._homeScore;
                    if (scoreAwayEl) scoreAwayEl.textContent = this._awayScore;

                    audioManager.playGoalHorn();
                    audioManager.boostCrowd();

                    const scorerName = evt.playerName || evt.teamName;
                    eventHtml = `<div style="color: var(--text-green); font-weight: bold;">
                        ${evt.minute}' ⚽ TOOOR! ${scorerName} (${evt.teamName}) trifft! (${evt.score})
                    </div>`;
                } else if (evt.type === 'yellow') {
                    audioManager.playYellowCard();
                    const cardPlayer = evt.playerName || evt.teamName;
                    eventHtml = `<div style="color: var(--text-yellow);">
                        ${evt.minute}' 🟨 Gelbe Karte: ${cardPlayer} (${evt.teamName})
                    </div>`;
                } else if (evt.type === 'red') {
                    audioManager.playRedCard();
                    const cardPlayer = evt.playerName || evt.teamName;
                    eventHtml = `<div style="color: var(--text-red);">
                        ${evt.minute}' 🟥 ROTE KARTE! ${cardPlayer} (${evt.teamName})
                    </div>`;
                } else if (evt.type === 'injury') {
                    const injuredPlayer = evt.playerName || 'Spieler';
                    eventHtml = `<div style="color: var(--text-red);">
                        ${evt.minute}' 🏥 Verletzung: ${injuredPlayer} (${evt.teamName})
                    </div>`;
                }

                if (eventHtml) {
                    ticker.innerHTML += eventHtml;
                    ticker.scrollTop = ticker.scrollHeight;
                }

                this._eventIndex++;
            }
        };

        this._tickerInterval = setInterval(runTicker, this._speed);
        // Store runTicker reference so speed changes can use same function
        this._runTicker = runTicker;
    }

    // =========================================================================
    // Speed Controls
    // =========================================================================

    _bindSpeedControls() {
        const buttons = this._el.querySelectorAll('[data-speed]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const newSpeed = parseInt(btn.dataset.speed, 10);
                this._speed = newSpeed;

                // Update button styles
                buttons.forEach(b => b.classList.remove('dos-btn-primary'));
                btn.classList.add('dos-btn-primary');

                // Restart interval with new speed
                if (this._tickerInterval && this._runTicker) {
                    clearInterval(this._tickerInterval);
                    this._tickerInterval = setInterval(this._runTicker, this._speed);
                }
            });
        });
    }

    // =========================================================================
    // Fitness Panel
    // =========================================================================

    _renderFitnessPanel() {
        const content = this._el.querySelector('#fitness-content');
        if (!content) return;

        const players = this._currentLineupIds
            .map(id => gameState.getPlayer(id))
            .filter(Boolean);

        const rows = players.map(p => {
            const fitnessColor = p.fitness >= 75 ? 'var(--text-green)' : p.fitness >= 50 ? 'var(--text-yellow)' : 'var(--text-red)';
            const barWidth = Math.max(0, Math.min(100, p.fitness));
            return `
                <tr>
                    <td style="color: var(--text-bright); font-size: 0.55rem; white-space: nowrap;">${p.shortName}</td>
                    <td style="color: var(--text-cyan); font-size: 0.55rem;">${p.position}</td>
                    <td style="width: 80px;">
                        <div style="background: #222; height: 8px; width: 100%; position: relative;">
                            <div style="background: ${fitnessColor}; height: 100%; width: ${barWidth}%;"></div>
                        </div>
                    </td>
                    <td style="color: ${fitnessColor}; font-size: 0.55rem; text-align: right;">${p.fitness}</td>
                </tr>
            `;
        }).join('');

        content.innerHTML = `
            <table class="dos-table" style="font-size: 0.55rem;">
                <thead>
                    <tr><th>Spieler</th><th>Pos</th><th>Fitness</th><th></th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    // =========================================================================
    // Substitution Panel
    // =========================================================================

    _renderSubstitutionPanel() {
        const subTitle = this._el.querySelector('#sub-title');
        if (subTitle) {
            subTitle.textContent = `AUSWECHSLUNGEN (${this._substitutions.length}/${this._maxSubs})`;
        }

        const subsLeft = this._maxSubs - this._substitutions.length;
        const msgEl = this._el.querySelector('#sub-message');
        if (msgEl) {
            if (subsLeft <= 0) {
                msgEl.textContent = 'Alle Wechsel verbraucht!';
                msgEl.style.color = 'var(--text-muted)';
            } else {
                msgEl.textContent = this._selectedBenchPlayerId
                    ? 'Jetzt klicke den Spieler in der Aufstellung, den du auswechseln willst.'
                    : `Noch ${subsLeft} Wechsel moeglich. Klicke einen Bankspieler.`;
                msgEl.style.color = 'var(--text-cyan)';
            }
        }

        // Render lineup (clickable for substitution out)
        const lineupEl = this._el.querySelector('#sub-lineup');
        if (lineupEl) {
            const lineupPlayers = this._currentLineupIds
                .map(id => gameState.getPlayer(id))
                .filter(Boolean);

            lineupEl.innerHTML = `
                <div style="font-size: 0.55rem; color: var(--text-yellow); margin-bottom: 4px;">AUFSTELLUNG:</div>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                    ${lineupPlayers.map(p => `
                        <button class="dos-btn dos-btn-small sub-lineup-player" data-player-id="${p.id}"
                                style="font-size: 0.5rem; padding: 2px 6px;
                                       ${subsLeft <= 0 ? 'opacity: 0.4; pointer-events: none;' : ''}">
                            ${p.shortName} <span style="color: var(--text-cyan);">${p.position}</span>
                        </button>
                    `).join('')}
                </div>
            `;

            // Bind lineup player clicks (for subbing out)
            if (subsLeft > 0) {
                lineupEl.querySelectorAll('.sub-lineup-player').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (this._selectedBenchPlayerId) {
                            this._performSubstitution(btn.dataset.playerId, this._selectedBenchPlayerId);
                        }
                    });
                });
            }
        }

        // Render bench (clickable for substitution in)
        const benchEl = this._el.querySelector('#sub-bench');
        if (benchEl) {
            const benchPlayers = this._benchPlayerIds
                .map(id => gameState.getPlayer(id))
                .filter(Boolean);

            benchEl.innerHTML = `
                <div style="font-size: 0.55rem; color: var(--text-yellow); margin-bottom: 4px;">BANK:</div>
                ${benchPlayers.length === 0
                    ? '<div style="color: var(--text-muted); font-size: 0.55rem;">Keine Spieler auf der Bank.</div>'
                    : `<div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${benchPlayers.map(p => {
                            const fitnessColor = p.fitness >= 75 ? 'var(--text-green)' : p.fitness >= 50 ? 'var(--text-yellow)' : 'var(--text-red)';
                            const isSelected = this._selectedBenchPlayerId === p.id;
                            return `
                                <button class="dos-btn dos-btn-small sub-bench-player ${isSelected ? 'dos-btn-primary' : ''}"
                                        data-bench-id="${p.id}"
                                        style="font-size: 0.5rem; padding: 2px 6px;
                                               ${subsLeft <= 0 ? 'opacity: 0.4; pointer-events: none;' : ''}">
                                    ${p.shortName}
                                    <span style="color: var(--text-cyan);">${p.position}</span>
                                    <span style="color: ${fitnessColor};">${p.fitness}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>`
                }
            `;

            // Bind bench player clicks
            if (subsLeft > 0) {
                benchEl.querySelectorAll('.sub-bench-player').forEach(btn => {
                    btn.addEventListener('click', () => {
                        this._selectedBenchPlayerId = btn.dataset.benchId;
                        this._renderSubstitutionPanel();
                    });
                });
            }
        }
    }

    _performSubstitution(outPlayerId, inPlayerId) {
        if (this._substitutions.length >= this._maxSubs) return;

        const outPlayer = gameState.getPlayer(outPlayerId);
        const inPlayer = gameState.getPlayer(inPlayerId);
        if (!outPlayer || !inPlayer) return;

        // Update lineup
        const idx = this._currentLineupIds.indexOf(outPlayerId);
        if (idx === -1) return;
        this._currentLineupIds[idx] = inPlayerId;

        // Move out player to bench, remove in player from bench
        this._benchPlayerIds = this._benchPlayerIds.filter(id => id !== inPlayerId);
        this._benchPlayerIds.push(outPlayerId);

        // Record substitution
        this._substitutions.push({
            minute: this._currentMinute,
            outPlayerId: outPlayerId,
            inPlayerId: inPlayerId,
        });

        this._selectedBenchPlayerId = null;

        // Add to ticker
        const ticker = this._el.querySelector('#ticker');
        if (ticker) {
            ticker.innerHTML += `<div style="color: var(--text-cyan);">
                ${this._currentMinute}' 🔄 Wechsel: ${inPlayer.shortName} kommt fuer ${outPlayer.shortName}
            </div>`;
            ticker.scrollTop = ticker.scrollHeight;
        }

        // Refresh panels
        this._renderFitnessPanel();
        this._renderSubstitutionPanel();
    }

    // =========================================================================
    // Substitution Fitness Adjustment
    // =========================================================================

    _applySubstitutionFitness() {
        if (this._substitutions.length === 0) return;

        const state = gameState.get();

        for (const sub of this._substitutions) {
            const outPlayer = gameState.getPlayer(sub.outPlayerId);
            const inPlayer = gameState.getPlayer(sub.inPlayerId);

            if (outPlayer) {
                // Out player played sub.minute / 90 of the match
                // Give back some fitness: they already got full fitness loss from simulateMatchday
                // Proportional recovery for unplayed minutes
                const minutesNotPlayed = 90 - sub.minute;
                const fitnessRecovery = Math.floor((minutesNotPlayed / 90) * (3 + Math.random() * 5));
                outPlayer.fitness = Math.min(100, outPlayer.fitness + fitnessRecovery);
            }

            if (inPlayer) {
                // In player entered at sub.minute, played (90 - sub.minute) / 90 of match
                // They got +5 bench recovery from simulateMatchday, reverse some of that
                const minutesPlayed = 90 - sub.minute;
                const fitnessLoss = Math.floor((minutesPlayed / 90) * (3 + Math.random() * 5));
                inPlayer.fitness = Math.max(40, inPlayer.fitness - fitnessLoss);
            }
        }
    }

    // =========================================================================
    // Post Match
    // =========================================================================

    _showPostMatch(result) {
        const state = gameState.get();

        // Hide match-specific panels
        const fitnessPanel = this._el.querySelector('#fitness-panel');
        const subPanel = this._el.querySelector('#sub-panel');
        if (fitnessPanel) fitnessPanel.classList.add('hidden');
        if (subPanel) subPanel.classList.add('hidden');

        const otherEl = this._el.querySelector('#other-results');
        const otherContent = this._el.querySelector('#other-results-content');
        otherEl.classList.remove('hidden');

        let html = '<div class="match-results">';
        for (const match of result.matches) {
            const homeTeam = gameState.getTeam(match.home);
            const awayTeam = gameState.getTeam(match.away);
            const isUser = match.home === state.playerTeamId || match.away === state.playerTeamId;

            html += `
                <div class="match-result-row ${isUser ? 'user-match' : ''}">
                    <span class="home">${homeTeam.name}</span>
                    <span class="score">${match.homeGoals} : ${match.awayGoals}</span>
                    <span>${awayTeam.name}</span>
                </div>
            `;
        }
        html += '</div>';
        otherContent.innerHTML = html;

        const btns = this._el.querySelector('#post-match-buttons');
        btns.classList.remove('hidden');

        btns.querySelector('#btn-to-table').addEventListener('click', () => {
            router.navigate('#table');
        });

        btns.querySelector('#btn-to-dashboard').addEventListener('click', () => {
            router.navigate('#dashboard');
        });
    }

    unmount() {
        if (this._tickerInterval) {
            clearInterval(this._tickerInterval);
            this._tickerInterval = null;
        }
        audioManager.stopMusic();
        super.unmount();
    }
}
