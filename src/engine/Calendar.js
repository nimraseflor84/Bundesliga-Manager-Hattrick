/**
 * Generates a round-robin schedule for the Bundesliga.
 * 18 teams → 34 matchdays (17 Hinrunde + 17 Rückrunde).
 * Uses a circle method to ensure fair scheduling.
 */
export class Calendar {
    /**
     * Generate full season fixtures.
     * @param {Array} teams - Array of team objects with id property
     * @returns {Array} fixtures - Array of matchday arrays
     */
    static generateFixtures(teams) {
        const n = teams.length; // 18
        const teamIds = teams.map(t => t.id);
        const rounds = [];

        // Circle method for round-robin
        const fixed = teamIds[0];
        const rotating = teamIds.slice(1);

        for (let round = 0; round < n - 1; round++) {
            const matches = [];
            // Fixed team vs first in rotating array
            if (round % 2 === 0) {
                matches.push({ home: fixed, away: rotating[0] });
            } else {
                matches.push({ home: rotating[0], away: fixed });
            }

            // Pair remaining teams
            for (let i = 1; i <= (n - 2) / 2; i++) {
                const home = rotating[i];
                const away = rotating[n - 1 - i];
                if (i % 2 === round % 2) {
                    matches.push({ home, away });
                } else {
                    matches.push({ home: away, away: home });
                }
            }

            rounds.push(matches);

            // Rotate: move last to front
            rotating.unshift(rotating.pop());
        }

        // Rückrunde: swap home/away
        const returnRounds = rounds.map(matchday =>
            matchday.map(m => ({ home: m.away, away: m.home }))
        );

        return [...rounds, ...returnRounds];
    }

    /**
     * Get fixtures for a specific matchday (0-indexed).
     */
    static getMatchday(fixtures, matchdayIndex) {
        return fixtures[matchdayIndex] || [];
    }

    /**
     * Get all fixtures involving a specific team.
     */
    static getTeamFixtures(fixtures, teamId) {
        const result = [];
        for (let i = 0; i < fixtures.length; i++) {
            const match = fixtures[i].find(
                m => m.home === teamId || m.away === teamId
            );
            if (match) {
                result.push({ matchday: i + 1, ...match });
            }
        }
        return result;
    }
}
