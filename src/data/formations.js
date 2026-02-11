/**
 * Preset formations with position slots.
 * Each slot: { role, x, y } where x/y are 0-100 grid positions for display.
 */
export const formations = {
    '4-4-2': {
        name: '4-4-2',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'LV', x: 15, y: 70 },
            { role: 'IV', x: 38, y: 75 },
            { role: 'IV', x: 62, y: 75 },
            { role: 'RV', x: 85, y: 70 },
            { role: 'LM', x: 15, y: 45 },
            { role: 'ZM', x: 38, y: 50 },
            { role: 'ZM', x: 62, y: 50 },
            { role: 'RM', x: 85, y: 45 },
            { role: 'ST', x: 38, y: 18 },
            { role: 'ST', x: 62, y: 18 },
        ],
    },
    '4-3-3': {
        name: '4-3-3',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'LV', x: 15, y: 70 },
            { role: 'IV', x: 38, y: 75 },
            { role: 'IV', x: 62, y: 75 },
            { role: 'RV', x: 85, y: 70 },
            { role: 'ZDM', x: 50, y: 55 },
            { role: 'ZM', x: 30, y: 42 },
            { role: 'ZM', x: 70, y: 42 },
            { role: 'LA', x: 20, y: 18 },
            { role: 'ST', x: 50, y: 15 },
            { role: 'RA', x: 80, y: 18 },
        ],
    },
    '3-5-2': {
        name: '3-5-2',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'IV', x: 30, y: 75 },
            { role: 'IV', x: 50, y: 78 },
            { role: 'IV', x: 70, y: 75 },
            { role: 'LM', x: 10, y: 50 },
            { role: 'ZM', x: 35, y: 48 },
            { role: 'ZDM', x: 50, y: 55 },
            { role: 'ZM', x: 65, y: 48 },
            { role: 'RM', x: 90, y: 50 },
            { role: 'ST', x: 38, y: 18 },
            { role: 'ST', x: 62, y: 18 },
        ],
    },
    '4-5-1': {
        name: '4-5-1',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'LV', x: 15, y: 70 },
            { role: 'IV', x: 38, y: 75 },
            { role: 'IV', x: 62, y: 75 },
            { role: 'RV', x: 85, y: 70 },
            { role: 'LM', x: 15, y: 45 },
            { role: 'ZM', x: 35, y: 48 },
            { role: 'ZOM', x: 50, y: 38 },
            { role: 'ZM', x: 65, y: 48 },
            { role: 'RM', x: 85, y: 45 },
            { role: 'ST', x: 50, y: 15 },
        ],
    },
    '4-2-3-1': {
        name: '4-2-3-1',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'LV', x: 15, y: 70 },
            { role: 'IV', x: 38, y: 75 },
            { role: 'IV', x: 62, y: 75 },
            { role: 'RV', x: 85, y: 70 },
            { role: 'ZDM', x: 38, y: 55 },
            { role: 'ZDM', x: 62, y: 55 },
            { role: 'LA', x: 20, y: 35 },
            { role: 'ZOM', x: 50, y: 38 },
            { role: 'RA', x: 80, y: 35 },
            { role: 'ST', x: 50, y: 15 },
        ],
    },
    '3-4-3': {
        name: '3-4-3',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'IV', x: 30, y: 75 },
            { role: 'IV', x: 50, y: 78 },
            { role: 'IV', x: 70, y: 75 },
            { role: 'LM', x: 15, y: 48 },
            { role: 'ZM', x: 38, y: 52 },
            { role: 'ZM', x: 62, y: 52 },
            { role: 'RM', x: 85, y: 48 },
            { role: 'LA', x: 20, y: 18 },
            { role: 'ST', x: 50, y: 15 },
            { role: 'RA', x: 80, y: 18 },
        ],
    },
    '5-3-2': {
        name: '5-3-2',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'LV', x: 10, y: 65 },
            { role: 'IV', x: 30, y: 75 },
            { role: 'IV', x: 50, y: 78 },
            { role: 'IV', x: 70, y: 75 },
            { role: 'RV', x: 90, y: 65 },
            { role: 'ZM', x: 30, y: 48 },
            { role: 'ZM', x: 50, y: 50 },
            { role: 'ZM', x: 70, y: 48 },
            { role: 'ST', x: 38, y: 18 },
            { role: 'ST', x: 62, y: 18 },
        ],
    },
    '4-1-4-1': {
        name: '4-1-4-1',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'LV', x: 15, y: 70 },
            { role: 'IV', x: 38, y: 75 },
            { role: 'IV', x: 62, y: 75 },
            { role: 'RV', x: 85, y: 70 },
            { role: 'ZDM', x: 50, y: 58 },
            { role: 'LM', x: 15, y: 40 },
            { role: 'ZM', x: 38, y: 42 },
            { role: 'ZM', x: 62, y: 42 },
            { role: 'RM', x: 85, y: 40 },
            { role: 'ST', x: 50, y: 15 },
        ],
    },
    '4-3-2-1': {
        name: '4-3-2-1',
        slots: [
            { role: 'TW', x: 50, y: 90 },
            { role: 'LV', x: 15, y: 70 },
            { role: 'IV', x: 38, y: 75 },
            { role: 'IV', x: 62, y: 75 },
            { role: 'RV', x: 85, y: 70 },
            { role: 'ZM', x: 30, y: 52 },
            { role: 'ZM', x: 50, y: 55 },
            { role: 'ZM', x: 70, y: 52 },
            { role: 'ZOM', x: 35, y: 35 },
            { role: 'ZOM', x: 65, y: 35 },
            { role: 'ST', x: 50, y: 15 },
        ],
    },
};

/**
 * Check if a player's position is compatible with a formation slot role.
 */
export function isPositionCompatible(playerPos, slotRole, secondaryPos = null) {
    // Exact match
    if (playerPos === slotRole) return true;

    // Compatible groups
    const groups = {
        'TW': ['TW'],
        'IV': ['IV'],
        'LV': ['LV', 'LM'],
        'RV': ['RV', 'RM'],
        'ZDM': ['ZDM', 'ZM'],
        'ZM': ['ZM', 'ZDM', 'ZOM'],
        'ZOM': ['ZOM', 'ZM'],
        'LM': ['LM', 'LA', 'LV'],
        'RM': ['RM', 'RA', 'RV'],
        'LA': ['LA', 'LM', 'ST'],
        'RA': ['RA', 'RM', 'ST'],
        'ST': ['ST', 'LA', 'RA', 'ZOM'],
    };

    const compatible = groups[slotRole] || [];
    if (compatible.includes(playerPos)) return true;
    if (secondaryPos && compatible.includes(secondaryPos)) return true;

    return false;
}
