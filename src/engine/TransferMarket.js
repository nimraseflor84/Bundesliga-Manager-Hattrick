import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';

export class TransferMarket {
    /**
     * Get all players available on the transfer market.
     * Excludes the requesting team's players.
     */
    static getAvailablePlayers(excludeTeamId, filters = {}) {
        const state = gameState.get();
        let players = state.players.filter(p => p.teamId !== excludeTeamId);

        if (filters.position) {
            players = players.filter(p => p.position === filters.position);
        }
        if (filters.minOverall) {
            players = players.filter(p => p.overall >= filters.minOverall);
        }
        if (filters.maxOverall) {
            players = players.filter(p => p.overall <= filters.maxOverall);
        }
        if (filters.maxPrice) {
            players = players.filter(p => this.estimatePrice(p) <= filters.maxPrice);
        }
        if (filters.maxAge) {
            players = players.filter(p => p.age <= filters.maxAge);
        }

        return players.sort((a, b) => b.overall - a.overall);
    }

    /**
     * Estimate transfer price for a player.
     * Free agents (teamId === null) cost only a signing bonus.
     */
    static estimatePrice(player) {
        let base = player.marketValue;

        // Age factor: peak value at 25-29
        if (player.age < 22) base *= 1.2; // Young talent premium
        else if (player.age <= 29) base *= 1.0;
        else if (player.age <= 32) base *= 0.7;
        else base *= 0.4;

        // Performance factor
        const performanceBonus = player.goals * 200000 + player.assists * 100000;
        base += performanceBonus;

        // Contract factor: lower price if contract ending soon
        const yearsLeft = player.contractUntil - 2025;
        if (yearsLeft <= 1) base *= 0.5;
        else if (yearsLeft <= 2) base *= 0.75;

        // Free agents: only signing bonus (20% of value)
        if (!player.teamId) {
            base *= 0.2;
        }

        return Math.max(100000, Math.round(base));
    }

    /**
     * Attempt to buy a player.
     * Returns { success, message }
     */
    static buyPlayer(playerId, buyerTeamId) {
        const state = gameState.get();

        // Check transfer window
        if (state.transferWindow === 'closed') {
            return { success: false, message: 'Transferfenster geschlossen!' };
        }

        const player = gameState.getPlayer(playerId);
        if (!player) return { success: false, message: 'Spieler nicht gefunden.' };

        const sellerTeamId = player.teamId;
        if (sellerTeamId === buyerTeamId) {
            return { success: false, message: 'Spieler gehoert bereits zu deinem Team!' };
        }

        const buyerTeam = gameState.getTeam(buyerTeamId);
        const price = this.estimatePrice(player);

        if (buyerTeam.budget < price) {
            return { success: false, message: `Nicht genug Budget! Kosten: ${this.formatPrice(price)}` };
        }

        // Check squad size limit (max 25)
        const currentSquad = gameState.getTeamPlayers(buyerTeamId);
        if (currentSquad.length >= 25) {
            return { success: false, message: 'Kader voll! (Max. 25 Spieler)' };
        }

        // Free agents: higher acceptance chance
        const isFreeAgent = !sellerTeamId;
        if (!isFreeAgent) {
            // Negotiate: ~80% chance of acceptance, higher for big offers
            const acceptChance = 0.6 + (buyerTeam.budget / price) * 0.1;
            if (Math.random() > Math.min(0.95, acceptChance)) {
                return { success: false, message: `${player.shortName} lehnt ab. Versuche es spaeter erneut.` };
            }
        }

        // Execute transfer
        gameState.transferPlayer(playerId, sellerTeamId, buyerTeamId, price);

        const verb = isFreeAgent ? 'ablösefrei verpflichtet' : `fuer ${this.formatPrice(price)} verpflichtet`;
        return {
            success: true,
            message: `${player.name} wurde ${verb}! (Handgeld: ${this.formatPrice(price)})`,
            price,
        };
    }

    /**
     * Sell a player from the user's team.
     */
    static sellPlayer(playerId) {
        const state = gameState.get();

        if (state.transferWindow === 'closed') {
            return { success: false, message: 'Transferfenster geschlossen!' };
        }

        const player = gameState.getPlayer(playerId);
        if (!player) return { success: false, message: 'Spieler nicht gefunden.' };

        if (player.teamId !== state.playerTeamId) {
            return { success: false, message: 'Spieler gehoert nicht zu deinem Team!' };
        }

        // Min squad size
        const currentSquad = gameState.getTeamPlayers(state.playerTeamId);
        if (currentSquad.length <= 11) {
            return { success: false, message: 'Kader zu klein! (Min. 11 Spieler)' };
        }

        const price = Math.floor(this.estimatePrice(player) * 0.85); // Sell at 85% of value

        // Find a buyer (random AI team that can afford it)
        const buyers = state.teams.filter(t =>
            t.id !== state.playerTeamId && t.budget >= price
        );

        if (buyers.length === 0) {
            return { success: false, message: 'Kein Verein interessiert sich.' };
        }

        const buyer = buyers[Math.floor(Math.random() * buyers.length)];
        gameState.transferPlayer(playerId, state.playerTeamId, buyer.id, price);

        return {
            success: true,
            message: `${player.name} an ${buyer.name} fuer ${this.formatPrice(price)} verkauft!`,
            price,
        };
    }

    static formatPrice(price) {
        if (price >= 1000000) return `${(price / 1000000).toFixed(1)} Mio. EUR`;
        if (price >= 1000) return `${(price / 1000).toFixed(0)} Tsd. EUR`;
        return `${price} EUR`;
    }
}
