import { gameState } from '../core/GameState.js';

/**
 * TrainingEngine - Spielertraining mit verschiedenen Kategorien.
 * Rein logisch, kein DOM.
 */
export class TrainingEngine {
    /**
     * Verfuegbare Trainingsarten.
     */
    static getTrainingTypes() {
        return [
            {
                id: 'speed',
                name: 'Schnelligkeit',
                attribute: 'speed',
                cost: 100000,
                fitnessLoss: 4,
                baseChance: 0.50,
                minGain: 1,
                maxGain: 2,
                icon: '⚡',
            },
            {
                id: 'shooting',
                name: 'Schuss',
                attribute: 'shooting',
                cost: 120000,
                fitnessLoss: 3,
                baseChance: 0.45,
                minGain: 1,
                maxGain: 2,
                icon: '🎯',
            },
            {
                id: 'passing',
                name: 'Passen',
                attribute: 'passing',
                cost: 100000,
                fitnessLoss: 3,
                baseChance: 0.50,
                minGain: 1,
                maxGain: 2,
                icon: '📐',
            },
            {
                id: 'defense',
                name: 'Verteidigung',
                attribute: 'defense',
                cost: 100000,
                fitnessLoss: 4,
                baseChance: 0.45,
                minGain: 1,
                maxGain: 2,
                icon: '🛡',
            },
            {
                id: 'goalkeeper',
                name: 'Torwart',
                attribute: 'goalkeeper',
                cost: 80000,
                fitnessLoss: 3,
                baseChance: 0.50,
                minGain: 1,
                maxGain: 2,
                icon: '🧤',
                positionRestriction: ['TW'],
            },
            {
                id: 'fitness',
                name: 'Fitness',
                attribute: 'fitness',
                cost: 50000,
                fitnessLoss: 0, // Fitness training doesn't cost fitness
                baseChance: 0.80,
                minGain: 5,
                maxGain: 10,
                icon: '💪',
            },
            {
                id: 'morale',
                name: 'Mannschaftstraining',
                attribute: 'morale',
                cost: 200000,
                fitnessLoss: 3,
                baseChance: 0.90,
                minGain: 2,
                maxGain: 5,
                icon: '🤝',
                isTeamTraining: true,
            },
        ];
    }

    /**
     * Berechne die Erfolgschance fuer einen Spieler bei einem bestimmten Training.
     * Juengere Spieler haben hoehere Chance.
     */
    static getSuccessChance(player, trainingType) {
        let chance = trainingType.baseChance;

        // Altersbonus: Unter 23 hoehere Chance, ueber 30 niedrigere
        if (player.age < 21) chance += 0.15;
        else if (player.age < 24) chance += 0.10;
        else if (player.age < 28) chance += 0.00;
        else if (player.age < 31) chance -= 0.05;
        else chance -= 0.15;

        // Je hoeher das Attribut bereits ist, desto schwieriger die Verbesserung
        if (trainingType.attribute !== 'fitness' && trainingType.attribute !== 'morale') {
            const currentValue = player[trainingType.attribute] || 0;
            if (currentValue >= 90) chance -= 0.20;
            else if (currentValue >= 80) chance -= 0.10;
            else if (currentValue >= 70) chance -= 0.05;
        }

        return Math.max(0.10, Math.min(0.95, chance));
    }

    /**
     * Pruefe ob ein Spieler fuer ein bestimmtes Training verfuegbar ist.
     * Gibt { available, reason } zurueck.
     */
    static canTrain(player, trainingType, team) {
        if (player.injured) {
            return { available: false, reason: 'Spieler ist verletzt' };
        }

        if (player.fitness < 20 && trainingType.id !== 'fitness') {
            return { available: false, reason: 'Spieler ist zu muede (Fitness < 20)' };
        }

        if (player._trainedThisMatchday) {
            return { available: false, reason: 'Bereits trainiert an diesem Spieltag' };
        }

        if (trainingType.positionRestriction &&
            !trainingType.positionRestriction.includes(player.position)) {
            return { available: false, reason: `Nur fuer ${trainingType.positionRestriction.join('/')} verfuegbar` };
        }

        if (team.budget < trainingType.cost) {
            return { available: false, reason: 'Nicht genug Budget' };
        }

        // Attribute cap
        if (trainingType.attribute !== 'fitness' && trainingType.attribute !== 'morale') {
            if ((player[trainingType.attribute] || 0) >= 99) {
                return { available: false, reason: 'Attribut bereits auf Maximum (99)' };
            }
        }

        return { available: true, reason: '' };
    }

    /**
     * Fuehre Training durch.
     * Gibt { success, gain, attribute, playerName } zurueck.
     */
    static train(playerId, trainingTypeId) {
        const state = gameState.get();
        const team = gameState.getPlayerTeam();
        if (!team) return { success: false, gain: 0, error: 'Kein Team' };

        const player = gameState.getPlayer(playerId);
        if (!player) return { success: false, gain: 0, error: 'Spieler nicht gefunden' };

        const trainingType = this.getTrainingTypes().find(t => t.id === trainingTypeId);
        if (!trainingType) return { success: false, gain: 0, error: 'Trainingsart ungueltig' };

        const check = this.canTrain(player, trainingType, team);
        if (!check.available) return { success: false, gain: 0, error: check.reason };

        // Kosten abziehen
        team.budget -= trainingType.cost;

        // Fitness-Kosten
        if (trainingType.fitnessLoss > 0) {
            player.fitness = Math.max(10, player.fitness - trainingType.fitnessLoss);
        }

        // Markiere als trainiert fuer diesen Spieltag
        player._trainedThisMatchday = true;

        // Mannschaftstraining: betrifft alle Spieler
        if (trainingType.isTeamTraining) {
            const allPlayers = gameState.getTeamPlayers(team.id);
            const gain = trainingType.minGain + Math.floor(Math.random() * (trainingType.maxGain - trainingType.minGain + 1));
            for (const p of allPlayers) {
                if (!p.injured) {
                    p.morale = Math.min(99, p.morale + gain);
                }
            }
            return {
                success: true,
                gain: gain,
                attribute: 'morale',
                playerName: 'Mannschaft',
                trainingName: trainingType.name,
            };
        }

        // Erfolgswurf
        const chance = this.getSuccessChance(player, trainingType);
        const roll = Math.random();
        const success = roll < chance;

        if (success) {
            const gain = trainingType.minGain + Math.floor(Math.random() * (trainingType.maxGain - trainingType.minGain + 1));

            if (trainingType.attribute === 'fitness') {
                player.fitness = Math.min(100, player.fitness + gain);
            } else {
                const currentVal = player[trainingType.attribute] || 0;
                player[trainingType.attribute] = Math.min(99, currentVal + gain);
                // Update overall rating as average of key attributes
                this._recalcOverall(player);
            }

            return {
                success: true,
                gain: gain,
                attribute: trainingType.attribute,
                playerName: player.shortName,
                trainingName: trainingType.name,
            };
        } else {
            return {
                success: false,
                gain: 0,
                attribute: trainingType.attribute,
                playerName: player.shortName,
                trainingName: trainingType.name,
            };
        }
    }

    /**
     * Recalculate overall rating from key attributes.
     */
    static _recalcOverall(player) {
        const attrs = ['speed', 'shooting', 'passing', 'defense'];
        if (player.position === 'TW') {
            attrs.push('goalkeeper');
        }
        const validAttrs = attrs.filter(a => typeof player[a] === 'number');
        if (validAttrs.length > 0) {
            const avg = validAttrs.reduce((sum, a) => sum + player[a], 0) / validAttrs.length;
            player.overall = Math.round(avg);
        }
    }

    /**
     * Reset trainiert-Status fuer alle Spieler (aufrufen nach jedem Spieltag).
     */
    static resetTrainingFlags() {
        const state = gameState.get();
        for (const p of state.players) {
            delete p._trainedThisMatchday;
        }
    }

    /**
     * Formatiere Kosten als lesbaren String.
     */
    static formatCost(cost) {
        if (cost >= 1000000) {
            return `${(cost / 1000000).toFixed(1)} Mio.`;
        }
        return `${(cost / 1000).toFixed(0)} Tsd.`;
    }
}
