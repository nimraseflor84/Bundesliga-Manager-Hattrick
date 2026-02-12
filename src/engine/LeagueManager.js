import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';
import { MatchEngine } from './MatchEngine.js';
import { Calendar } from './Calendar.js';
import { saveManager } from '../core/SaveManager.js';
import { FinanceEngine } from './FinanceEngine.js';
import { TrainingEngine } from './TrainingEngine.js';

export class LeagueManager {
    static initSeason() {
        const state = gameState.get();
        const fixtures = Calendar.generateFixtures(state.teams);
        gameState.update('fixtures', fixtures);
        gameState.update('results', []);
        gameState.update('currentMatchday', 0);
        gameState.update('transferWindow', 'summer');
    }

    /**
     * Auto-set lineups for all teams that don't have one.
     */
    static autoSetLineups() {
        const state = gameState.get();
        for (const team of state.teams) {
            if (!team.lineup || team.lineup.length < 11) {
                this.autoSetLineup(team.id);
            }
        }
    }

    /**
     * Auto-pick best 11 for a team based on overall rating.
     */
    static autoSetLineup(teamId) {
        const team = gameState.getTeam(teamId);
        const players = gameState.getTeamPlayers(teamId)
            .filter(p => !p.injured && p.fitness > 30);

        if (players.length < 11) {
            team.lineup = players.map(p => p.id);
            return;
        }

        // Pick best GK
        const posOrSecondary = (p, positions) =>
            positions.includes(p.position) || (p.secondaryPosition && positions.includes(p.secondaryPosition));

        const gks = players.filter(p => p.position === 'TW').sort((a, b) => b.overall - a.overall);
        const defs = players.filter(p => posOrSecondary(p, ['IV', 'LV', 'RV'])).sort((a, b) => b.overall - a.overall);
        const mids = players.filter(p => posOrSecondary(p, ['ZM', 'ZDM', 'ZOM', 'LM', 'RM'])).sort((a, b) => b.overall - a.overall);
        const atts = players.filter(p => posOrSecondary(p, ['ST', 'LA', 'RA'])).sort((a, b) => b.overall - a.overall);

        const lineup = [];
        if (gks.length > 0) lineup.push(gks[0].id);
        for (const d of defs.slice(0, 4)) {
            if (!lineup.includes(d.id)) lineup.push(d.id);
        }
        for (const m of mids.slice(0, 4)) {
            if (!lineup.includes(m.id)) lineup.push(m.id);
        }
        for (const a of atts.slice(0, 2)) {
            if (!lineup.includes(a.id)) lineup.push(a.id);
        }

        // Fill remaining spots if needed
        if (lineup.length < 11) {
            const remaining = players
                .filter(p => !lineup.includes(p.id))
                .sort((a, b) => b.overall - a.overall);
            while (lineup.length < 11 && remaining.length > 0) {
                lineup.push(remaining.shift().id);
            }
        }

        team.lineup = lineup.slice(0, 11);
    }

    /**
     * Calculate effective team strength based on lineup.
     */
    static getEffectiveStrength(teamId) {
        const team = gameState.getTeam(teamId);
        const lineup = gameState.getLineup(teamId);

        if (lineup.length < 11) return team.strength;

        const avgOverall = lineup.reduce((sum, p) => sum + p.overall, 0) / lineup.length;
        const avgFitness = lineup.reduce((sum, p) => sum + p.fitness, 0) / lineup.length;
        const avgMorale = lineup.reduce((sum, p) => sum + p.morale, 0) / lineup.length;

        // Effective = base overall, modified by fitness and morale
        return Math.round(avgOverall * (avgFitness / 100) * (0.8 + avgMorale / 500));
    }

    static simulateMatchday() {
        const state = gameState.get();
        const mdIndex = state.currentMatchday;

        if (mdIndex >= state.fixtures.length) return null;

        // Verletzungen heilen
        for (const p of state.players) {
            if (p.injured && p.injuryDays > 0) {
                p.injuryDays--;
                if (p.injuryDays <= 0) {
                    p.injured = false;
                    p.injuryDays = 0;
                    p.fitness = Math.max(p.fitness, 60);
                }
            }
        }

        // Auto-set lineups for AI teams
        for (const team of state.teams) {
            if (team.id !== state.playerTeamId) {
                this.autoSetLineup(team.id);
            }
        }

        const fixtures = state.fixtures[mdIndex];
        const matchResults = [];

        for (const fixture of fixtures) {
            const homeTeam = gameState.getTeam(fixture.home);
            const awayTeam = gameState.getTeam(fixture.away);

            // Use effective strength (lineup-based) if available
            const homeStr = this.getEffectiveStrength(fixture.home);
            const awayStr = this.getEffectiveStrength(fixture.away);

            const homeLineup = gameState.getLineup(fixture.home);
            const awayLineup = gameState.getLineup(fixture.away);

            const result = MatchEngine.simulate(
                { ...homeTeam, strength: homeStr },
                { ...awayTeam, strength: awayStr },
                homeLineup,
                awayLineup
            );

            matchResults.push({
                home: fixture.home,
                away: fixture.away,
                homeGoals: result.homeGoals,
                awayGoals: result.awayGoals,
                events: result.events,
            });

            this._updateStandings(homeTeam, awayTeam, result.homeGoals, result.awayGoals);
            this._updatePlayerStats(fixture, result);
        }

        const results = [...state.results, { matchday: mdIndex + 1, matches: matchResults }];
        gameState.update('results', results);
        gameState.update('currentMatchday', mdIndex + 1);

        // Process finances for matchday
        FinanceEngine.processMatchday(mdIndex + 1);

        // Reset training flags for new matchday
        TrainingEngine.resetTrainingFlags();

        // Transfer window logic
        if (mdIndex + 1 === 1) gameState.update('transferWindow', 'summer');
        if (mdIndex + 1 === 5) gameState.update('transferWindow', 'closed');
        if (mdIndex + 1 === 17) gameState.update('transferWindow', 'winter');
        if (mdIndex + 1 === 21) gameState.update('transferWindow', 'closed');

        saveManager.save('auto');
        eventBus.emit('matchday:completed', { matchday: mdIndex + 1, matches: matchResults });

        return { matchday: mdIndex + 1, matches: matchResults };
    }

    static _updateStandings(homeTeam, awayTeam, homeGoals, awayGoals) {
        homeTeam.goalsFor += homeGoals;
        homeTeam.goalsAgainst += awayGoals;
        awayTeam.goalsFor += awayGoals;
        awayTeam.goalsAgainst += homeGoals;

        if (homeGoals > awayGoals) {
            homeTeam.points += 3;
            homeTeam.won += 1;
            awayTeam.lost += 1;
            homeTeam.form.push('W');
            awayTeam.form.push('L');
        } else if (homeGoals < awayGoals) {
            awayTeam.points += 3;
            awayTeam.won += 1;
            homeTeam.lost += 1;
            homeTeam.form.push('L');
            awayTeam.form.push('W');
        } else {
            homeTeam.points += 1;
            awayTeam.points += 1;
            homeTeam.drawn += 1;
            awayTeam.drawn += 1;
            homeTeam.form.push('D');
            awayTeam.form.push('D');
        }

        if (homeTeam.form.length > 5) homeTeam.form = homeTeam.form.slice(-5);
        if (awayTeam.form.length > 5) awayTeam.form = awayTeam.form.slice(-5);
    }

    /**
     * Update player stats after a match (fitness, goals, cards).
     */
    static _updatePlayerStats(fixture, result) {
        const homeLineup = gameState.getLineup(fixture.home);
        const awayLineup = gameState.getLineup(fixture.away);

        // Reduce fitness for all lineup players
        for (const p of [...homeLineup, ...awayLineup]) {
            p.fitness = Math.max(40, p.fitness - (3 + Math.floor(Math.random() * 5)));
        }

        // Recover fitness for bench players
        const state = gameState.get();
        const allTeamPlayers = [
            ...gameState.getTeamPlayers(fixture.home),
            ...gameState.getTeamPlayers(fixture.away),
        ];
        for (const p of allTeamPlayers) {
            const inLineup = homeLineup.find(lp => lp.id === p.id) || awayLineup.find(lp => lp.id === p.id);
            if (!inLineup) {
                p.fitness = Math.min(100, p.fitness + 5);
            }
        }

        // Apply events using player IDs from MatchEngine
        for (const evt of result.events) {
            if (evt.playerId) {
                const player = gameState.getPlayer(evt.playerId);
                if (player) {
                    if (evt.type === 'goal') {
                        player.goals += 1;
                        player.morale = Math.min(99, player.morale + 3);
                    } else if (evt.type === 'yellow') {
                        player.yellowCards += 1;
                    } else if (evt.type === 'red') {
                        player.redCards += 1;
                    } else if (evt.type === 'injury') {
                        player.injured = true;
                        player.injuryDays = 1 + Math.floor(Math.random() * 4);
                    }
                }
            }
        }

        // Morale changes based on result
        const homeWon = result.homeGoals > result.awayGoals;
        const awayWon = result.awayGoals > result.homeGoals;
        for (const p of homeLineup) {
            p.morale = Math.max(30, Math.min(99, p.morale + (homeWon ? 3 : awayWon ? -3 : 0)));
        }
        for (const p of awayLineup) {
            p.morale = Math.max(30, Math.min(99, p.morale + (awayWon ? 3 : homeWon ? -3 : 0)));
        }
    }

    static isSeasonComplete() {
        const state = gameState.get();
        return state.currentMatchday >= state.fixtures.length;
    }

    static getTotalMatchdays() {
        const state = gameState.get();
        return state.fixtures.length;
    }

    static getMatchdayResult(matchday) {
        const state = gameState.get();
        return state.results.find(r => r.matchday === matchday);
    }

    static getUserMatch(matchdayResult) {
        const state = gameState.get();
        if (!matchdayResult) return null;
        return matchdayResult.matches.find(
            m => m.home === state.playerTeamId || m.away === state.playerTeamId
        );
    }
}
