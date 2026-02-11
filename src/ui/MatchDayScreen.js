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

        // Get upcoming fixture
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
                        <div class="text-center mb-2" id="scoreboard"></div>
                        <div id="ticker" style="height: 200px; overflow-y: auto; padding: 4px;
                             background: #000; border: 1px solid var(--border-dark);"></div>
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
            audioManager.startMatchAtmosphere();
            this._simulateMatchday();
        });
    }

    _simulateMatchday() {
        const result = LeagueManager.simulateMatchday();
        if (!result) return;

        this._result = result;
        const state = gameState.get();
        const team = gameState.getPlayerTeam();
        if (!team) return;

        // Find user match
        const userMatch = result.matches.find(
            m => m.home === state.playerTeamId || m.away === state.playerTeamId
        );
        if (!userMatch) { this._showPostMatch(result); return; }
        const homeTeam = gameState.getTeam(userMatch.home);
        const awayTeam = gameState.getTeam(userMatch.away);
        if (!homeTeam || !awayTeam) { this._showPostMatch(result); return; }

        // Hide preview button, show live area
        this._el.querySelector('#btn-simulate').closest('.dos-window').classList.add('hidden');
        this._el.querySelector('#match-live').classList.remove('hidden');

        const scoreboard = this._el.querySelector('#scoreboard');
        const ticker = this._el.querySelector('#ticker');

        // Start ticker animation
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

        // Add kickoff message
        ticker.innerHTML = `<div style="color: var(--text-green);">⚽ ANPFIFF! Der Ball rollt!</div>`;

        let currentMinute = 0;
        let homeScore = 0;
        let awayScore = 0;

        this._tickerInterval = setInterval(() => {
            currentMinute += 1;

            if (currentMinute > 93) {
                // Match over
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

                this._showPostMatch(result);
                return;
            }

            // Update minute display
            const minuteEl = this._el.querySelector('#match-minute');
            if (minuteEl) minuteEl.textContent = `${currentMinute}'`;

            // Show halftime
            if (currentMinute === 46) {
                audioManager.playWhistle('half');
                ticker.innerHTML += `<div style="color: var(--text-cyan); margin-top: 4px;">
                    --- HALBZEIT ---
                </div>`;
            }

            // Check for events at this minute
            while (this._eventIndex < events.length && events[this._eventIndex].minute <= currentMinute) {
                const evt = events[this._eventIndex];
                let eventHtml = '';

                if (evt.type === 'goal') {
                    if (evt.team === 'home') homeScore++;
                    else awayScore++;

                    const scoreHomeEl = this._el.querySelector('#score-home');
                    const scoreAwayEl = this._el.querySelector('#score-away');
                    if (scoreHomeEl) scoreHomeEl.textContent = homeScore;
                    if (scoreAwayEl) scoreAwayEl.textContent = awayScore;

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
        }, 80); // Fast simulation: ~7 seconds total
    }

    _showPostMatch(result) {
        const state = gameState.get();

        // Show other results
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

        // Show post-match buttons
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
