import { eventBus } from './EventBus.js';

class GameStateManager {
    constructor() {
        this._state = null;
    }

    init(data) {
        this._state = data;
        eventBus.emit('state:init', this._state);
    }

    get() {
        return this._state;
    }

    update(path, value) {
        if (!this._state) return;
        const keys = path.split('.');
        let obj = this._state;
        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
            if (!obj) return;
        }
        obj[keys[keys.length - 1]] = value;
        eventBus.emit('state:changed', { path, value });
        eventBus.emit(`state:${path}`, value);
    }

    /**
     * Create a fresh game state for a new game.
     */
    createNewGame(teamId, teams, allPlayers, managerName) {
        return {
            version: 2,
            season: '2025/26',
            managerName: managerName || 'Manager',
            playerTeamId: teamId,
            currentMatchday: 0,
            transferWindow: 'closed', // 'summer', 'winter', 'closed'
            phase: 'pre-match',
            teams: teams.map(t => ({
                ...t,
                points: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                form: [],
                budget: t.budget || 10000000,
                formation: '4-4-2',
                lineup: [],  // array of player IDs (11)
                stadium: {
                    capacity: t.stadiumCapacity,
                    name: t.stadiumName,
                    roof: t.stadiumCapacity > 40000,
                    floodlights: true,
                    fanShop: t.stadiumCapacity > 30000,
                    parking: Math.floor(t.stadiumCapacity / 10),
                    vipBoxes: Math.floor(t.stadiumCapacity / 500),
                    ticketPrice: 35,
                },
                finances: {
                    income: [],
                    expenses: [],
                    totalIncome: 0,
                    totalExpenses: 0,
                    tvMoney: this._calcTVMoney(t.strength),
                    sponsorIncome: Math.floor(t.budget * 0.3),
                },
            })),
            players: allPlayers.map(p => ({ ...p })),
            fixtures: [],
            results: [],
            league: 1,
            created: Date.now(),
            lastSaved: Date.now(),
        };
    }

    _calcTVMoney(strength) {
        // Stronger teams get more TV money, range 15M-60M per season
        return Math.floor(15000000 + (strength - 60) * 1200000);
    }

    getTeam(teamId) {
        if (!this._state) return null;
        return this._state.teams.find(t => t.id === teamId);
    }

    getPlayerTeam() {
        if (!this._state) return null;
        return this.getTeam(this._state.playerTeamId);
    }

    getStandings() {
        if (!this._state) return [];
        return [...this._state.teams]
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const gdA = a.goalsFor - a.goalsAgainst;
                const gdB = b.goalsFor - b.goalsAgainst;
                if (gdB !== gdA) return gdB - gdA;
                if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
                return a.name.localeCompare(b.name);
            });
    }

    // === Player helpers ===

    getTeamPlayers(teamId) {
        if (!this._state) return [];
        return this._state.players.filter(p => p.teamId === teamId);
    }

    getPlayer(playerId) {
        if (!this._state) return null;
        return this._state.players.find(p => p.id === playerId);
    }

    getPlayerTeamPlayers() {
        if (!this._state) return [];
        return this.getTeamPlayers(this._state.playerTeamId);
    }

    getLineup(teamId) {
        const team = this.getTeam(teamId);
        if (!team || !team.lineup || team.lineup.length === 0) return [];
        return team.lineup.map(id => this.getPlayer(id)).filter(Boolean);
    }

    transferPlayer(playerId, fromTeamId, toTeamId, fee) {
        const player = this.getPlayer(playerId);
        if (!player) return false;

        const toTeam = this.getTeam(toTeamId);
        if (!toTeam) return false;

        // Move player
        player.teamId = toTeamId;
        player.contractUntil = 2028;

        // Financial transaction
        toTeam.budget -= fee;
        if (fromTeamId) {
            const fromTeam = this.getTeam(fromTeamId);
            if (fromTeam) {
                fromTeam.budget += fee;
                if (fromTeam.lineup) {
                    fromTeam.lineup = fromTeam.lineup.filter(id => id !== playerId);
                }
            }
        }

        eventBus.emit('transfer:completed', { playerId, fromTeamId, toTeamId, fee });
        return true;
    }
}

export const gameState = new GameStateManager();
