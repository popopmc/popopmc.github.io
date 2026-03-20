/**
 * Canonical player names: merge CSV typos / alternate spellings so stats and UI stay consistent.
 * Keys are lowercase; values are the preferred display/storage form.
 */
const PLAYER_NAME_ALIASES = {
    b1x: 'bix'
};

/**
 * @param {string} name
 * @returns {string}
 */
export function canonicalPlayerName(name) {
    if (!name) return name;
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    return PLAYER_NAME_ALIASES[key] ?? trimmed;
}
