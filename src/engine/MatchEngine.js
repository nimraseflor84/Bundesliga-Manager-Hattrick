/**
 * Poisson-based match simulation.
 * Home advantage ~1.6 goals, Away ~1.2 goals average.
 * Team strength modifies expected goals.
 */
export class MatchEngine {
    /**
     * Simulate a single match.
     * @param {Object} homeTeam - team object with strength
     * @param {Object} awayTeam - team object with strength
     * @param {Array} homeLineup - player objects for home team lineup
     * @param {Array} awayLineup - player objects for away team lineup
     * @returns {Object} result { homeGoals, awayGoals, events }
     */
    static simulate(homeTeam, awayTeam, homeLineup = [], awayLineup = []) {
        // Base expected goals
        const avgHome = 1.6;
        const avgAway = 1.2;

        // Strength modifier: difference scaled to factor
        // Strength range ~60-95. Neutral at 75.
        const homeFactor = homeTeam.strength / 75;
        const awayFactor = awayTeam.strength / 75;

        const homeExpected = avgHome * homeFactor * (75 / awayTeam.strength);
        const awayExpected = avgAway * awayFactor * (75 / homeTeam.strength);

        // Clamp expected goals
        const homeLambda = Math.max(0.3, Math.min(4.5, homeExpected));
        const awayLambda = Math.max(0.3, Math.min(4.5, awayExpected));

        const homeGoals = this._poisson(homeLambda);
        const awayGoals = this._poisson(awayLambda);

        // Generate events
        const events = this._generateEvents(homeTeam, awayTeam, homeGoals, awayGoals, homeLineup, awayLineup);

        return { homeGoals, awayGoals, events };
    }

    /**
     * Generate a Poisson-distributed random number.
     */
    static _poisson(lambda) {
        let L = Math.exp(-lambda);
        let k = 0;
        let p = 1;
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        return k - 1;
    }

    /**
     * Pick a random player from a lineup, optionally filtered by positions.
     */
    static _pickPlayer(lineup, positions = null) {
        if (!lineup || lineup.length === 0) return null;
        const candidates = positions
            ? lineup.filter(p => positions.includes(p.position))
            : lineup;
        const pool = candidates.length > 0 ? candidates : lineup;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    /**
     * Generate minute-by-minute events for a match.
     */
    static _generateEvents(homeTeam, awayTeam, homeGoals, awayGoals, homeLineup, awayLineup) {
        const events = [];
        const scorerPositions = ['ST', 'LA', 'RA', 'ZOM', 'ZM', 'LM', 'RM'];

        // Distribute goals across minutes
        const goalMinutes = [];
        for (let i = 0; i < homeGoals; i++) {
            const scorer = this._pickPlayer(homeLineup, scorerPositions);
            goalMinutes.push({
                minute: this._randomMinute(),
                team: 'home',
                teamId: homeTeam.id,
                teamName: homeTeam.shortName,
                type: 'goal',
                playerId: scorer ? scorer.id : null,
                playerName: scorer ? scorer.shortName : null,
            });
        }
        for (let i = 0; i < awayGoals; i++) {
            const scorer = this._pickPlayer(awayLineup, scorerPositions);
            goalMinutes.push({
                minute: this._randomMinute(),
                team: 'away',
                teamId: awayTeam.id,
                teamName: awayTeam.shortName,
                type: 'goal',
                playerId: scorer ? scorer.id : null,
                playerName: scorer ? scorer.shortName : null,
            });
        }

        // Sort by minute
        goalMinutes.sort((a, b) => a.minute - b.minute);

        // Add running score
        let h = 0, a = 0;
        for (const event of goalMinutes) {
            if (event.team === 'home') h++;
            else a++;
            event.score = `${h}:${a}`;
            events.push(event);
        }

        // Add yellow cards (random, 2-6 per match)
        const numCards = 2 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numCards; i++) {
            const isHome = Math.random() < 0.5;
            const lineup = isHome ? homeLineup : awayLineup;
            const player = this._pickPlayer(lineup);
            events.push({
                minute: this._randomMinute(),
                team: isHome ? 'home' : 'away',
                teamId: isHome ? homeTeam.id : awayTeam.id,
                teamName: isHome ? homeTeam.shortName : awayTeam.shortName,
                type: 'yellow',
                playerId: player ? player.id : null,
                playerName: player ? player.shortName : null,
            });
        }

        // Rare red card (~5% chance)
        if (Math.random() < 0.05) {
            const isHome = Math.random() < 0.5;
            const lineup = isHome ? homeLineup : awayLineup;
            const player = this._pickPlayer(lineup);
            events.push({
                minute: this._randomMinute(),
                team: isHome ? 'home' : 'away',
                teamId: isHome ? homeTeam.id : awayTeam.id,
                teamName: isHome ? homeTeam.shortName : awayTeam.shortName,
                type: 'red',
                playerId: player ? player.id : null,
                playerName: player ? player.shortName : null,
            });
        }

        // Injuries (~3% per player)
        for (const p of [...homeLineup, ...awayLineup]) {
            if (Math.random() < 0.03) {
                const isHome = homeLineup.includes(p);
                const team = isHome ? homeTeam : awayTeam;
                events.push({
                    minute: this._randomMinute(),
                    team: isHome ? 'home' : 'away',
                    teamId: team.id,
                    teamName: team.shortName,
                    type: 'injury',
                    playerId: p.id,
                    playerName: p.shortName,
                });
            }
        }

        // Sort all events by minute
        events.sort((a, b) => a.minute - b.minute);

        return events;
    }

    /**
     * Random match minute (1-90, weighted toward middle of halves).
     */
    static _randomMinute() {
        // Slight bias toward mid-half action
        const half = Math.random() < 0.5 ? 0 : 45;
        const minute = half + 1 + Math.floor(Math.random() * 45);
        // Add injury time occasionally
        if (minute === 45 || minute === 90) {
            return minute + Math.floor(Math.random() * 4);
        }
        return Math.min(minute, 93);
    }
}
