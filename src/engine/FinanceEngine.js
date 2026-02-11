import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';

export class FinanceEngine {
    /**
     * Process finances after each matchday.
     */
    static processMatchday(matchday) {
        const state = gameState.get();

        for (const team of state.teams) {
            const isHome = state.fixtures[matchday - 1]?.some(f => f.home === team.id);

            if (isHome) {
                // Home match: ticket income
                const attendance = this.calcAttendance(team);
                const ticketIncome = attendance * team.stadium.ticketPrice;
                const fanShopIncome = team.stadium.fanShop ? Math.floor(attendance * 2.5) : 0;
                const vipIncome = team.stadium.vipBoxes * 500;

                this._addIncome(team, 'Tickets', ticketIncome, matchday);
                if (fanShopIncome > 0) this._addIncome(team, 'Fanshop', fanShopIncome, matchday);
                if (vipIncome > 0) this._addIncome(team, 'VIP-Logen', vipIncome, matchday);
            }

            // Weekly salary expenses (every matchday ≈ 1 week)
            const players = gameState.getTeamPlayers(team.id);
            const totalSalary = players.reduce((sum, p) => sum + p.salary, 0);
            this._addExpense(team, 'Gehaelter', totalSalary, matchday);

            // TV money distributed per matchday (total / 34)
            const tvPerMD = Math.floor(team.finances.tvMoney / 34);
            this._addIncome(team, 'TV-Gelder', tvPerMD, matchday);

            // Sponsor income per matchday
            const sponsorPerMD = Math.floor(team.finances.sponsorIncome / 34);
            this._addIncome(team, 'Sponsor', sponsorPerMD, matchday);

            // Stadium maintenance
            const maintenance = Math.floor(team.stadium.capacity * 0.5);
            this._addExpense(team, 'Stadion', maintenance, matchday);
        }
    }

    /**
     * Calculate attendance based on stadium, team form, ticket price.
     */
    static calcAttendance(team) {
        const baseFill = 0.75; // 75% base attendance
        const formBonus = (team.form.filter(f => f === 'W').length / 5) * 0.15;
        const priceEffect = Math.max(0.5, 1 - (team.stadium.ticketPrice - 30) / 100);
        const roofBonus = team.stadium.roof ? 0.05 : 0;

        const fillRate = Math.min(1.0, baseFill + formBonus + roofBonus) * priceEffect;
        return Math.floor(team.stadium.capacity * fillRate);
    }

    static _addIncome(team, category, amount, matchday) {
        team.budget += amount;
        team.finances.totalIncome += amount;
        team.finances.income.push({ category, amount, matchday });
    }

    static _addExpense(team, category, amount, matchday) {
        team.budget -= amount;
        team.finances.totalExpenses += amount;
        team.finances.expenses.push({ category, amount, matchday });
    }

    /**
     * Get financial summary for a team.
     */
    static getSummary(teamId) {
        const team = gameState.getTeam(teamId);
        if (!team) return null;

        const incomeByCategory = {};
        for (const entry of team.finances.income) {
            incomeByCategory[entry.category] = (incomeByCategory[entry.category] || 0) + entry.amount;
        }

        const expensesByCategory = {};
        for (const entry of team.finances.expenses) {
            expensesByCategory[entry.category] = (expensesByCategory[entry.category] || 0) + entry.amount;
        }

        return {
            budget: team.budget,
            totalIncome: team.finances.totalIncome,
            totalExpenses: team.finances.totalExpenses,
            balance: team.finances.totalIncome - team.finances.totalExpenses,
            incomeByCategory,
            expensesByCategory,
        };
    }

    /**
     * Stadium upgrade costs.
     */
    static getUpgradeCosts(team) {
        return {
            capacity: {
                cost: 5000 * 1000, // 5M per 1000 seats
                unitSize: 1000,
                label: '+1.000 Plaetze',
            },
            roof: {
                cost: team.stadium.capacity * 200,
                available: !team.stadium.roof,
                label: 'Dach installieren',
            },
            fanShop: {
                cost: 2000000,
                available: !team.stadium.fanShop,
                label: 'Fanshop bauen',
            },
            parking: {
                cost: 500000,
                unitSize: 500,
                label: '+500 Parkplaetze',
            },
            vipBoxes: {
                cost: 1000000,
                unitSize: 10,
                label: '+10 VIP-Logen',
            },
        };
    }

    /**
     * Perform a stadium upgrade.
     */
    static upgradeStadium(teamId, upgradeType) {
        const team = gameState.getTeam(teamId);
        if (!team) return false;

        const costs = this.getUpgradeCosts(team);
        const upgrade = costs[upgradeType];
        if (!upgrade) return false;

        if (team.budget < upgrade.cost) return false;

        team.budget -= upgrade.cost;
        this._addExpense(team, 'Stadionausbau', upgrade.cost, gameState.get().currentMatchday);

        switch (upgradeType) {
            case 'capacity':
                team.stadium.capacity += upgrade.unitSize;
                break;
            case 'roof':
                team.stadium.roof = true;
                break;
            case 'fanShop':
                team.stadium.fanShop = true;
                break;
            case 'parking':
                team.stadium.parking += upgrade.unitSize;
                break;
            case 'vipBoxes':
                team.stadium.vipBoxes += upgrade.unitSize;
                break;
        }

        eventBus.emit('stadium:upgraded', { teamId, upgradeType });
        return true;
    }
}
