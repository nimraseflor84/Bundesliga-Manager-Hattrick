import { gameState } from './GameState.js';

const SAVE_KEY = 'bmh_savegame';
const SAVE_SLOTS_KEY = 'bmh_save_slots';

class SaveManagerClass {
    save(slot = 'auto') {
        const state = gameState.get();
        if (!state) return false;

        state.lastSaved = Date.now();
        const json = JSON.stringify(state);

        try {
            localStorage.setItem(`${SAVE_KEY}_${slot}`, json);
            this._updateSlotList(slot);
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    }

    load(slot = 'auto') {
        try {
            const json = localStorage.getItem(`${SAVE_KEY}_${slot}`);
            if (!json) return null;
            return JSON.parse(json);
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    }

    hasSave(slot = 'auto') {
        return localStorage.getItem(`${SAVE_KEY}_${slot}`) !== null;
    }

    deleteSave(slot = 'auto') {
        localStorage.removeItem(`${SAVE_KEY}_${slot}`);
    }

    getSlots() {
        try {
            const json = localStorage.getItem(SAVE_SLOTS_KEY);
            return json ? JSON.parse(json) : [];
        } catch {
            return [];
        }
    }

    _updateSlotList(slot) {
        const slots = this.getSlots();
        if (!slots.includes(slot)) {
            slots.push(slot);
            localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
        }
    }
}

export const saveManager = new SaveManagerClass();
