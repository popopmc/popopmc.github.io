/**
 * Shared DOM helpers: empty-state message HTML, page visibility.
 */

const EMPTY_STATE_STYLE = 'text-align: center; color: var(--text-secondary); padding: 2rem;';

/**
 * Returns HTML for a consistent empty-state message (no data, no games, etc.).
 * @param {string} message
 * @returns {string}
 */
export function emptyStateHtml(message) {
    return `<p style="${EMPTY_STATE_STYLE}">${message}</p>`;
}

const PAGE_IDS = ['homePage', 'playersPage', 'gameLogPage', 'playerProfilePage'];

/**
 * Returns the four main page container elements (may be null).
 * @returns {{ homePage: Element|null, playersPage: Element|null, gameLogPage: Element|null, profilePage: Element|null }}
 */
export function getPageElements() {
    return {
        homePage: document.getElementById('homePage'),
        playersPage: document.getElementById('playersPage'),
        gameLogPage: document.getElementById('gameLogPage'),
        profilePage: document.getElementById('playerProfilePage')
    };
}

/**
 * Hides all main pages and shows only the one with the given id.
 * @param {string} visibleId - One of 'homePage' | 'playersPage' | 'gameLogPage' | 'playerProfilePage'
 * @param {'grid'|'block'} homeDisplay - display value for home (home uses grid, others use block)
 */
export function showOnlyPage(visibleId, homeDisplay = 'grid') {
    const pages = getPageElements();
    const entries = [
        [pages.homePage, visibleId === 'homePage' ? homeDisplay : 'none'],
        [pages.playersPage, visibleId === 'playersPage' ? 'block' : 'none'],
        [pages.gameLogPage, visibleId === 'gameLogPage' ? 'block' : 'none'],
        [pages.profilePage, visibleId === 'playerProfilePage' ? 'block' : 'none']
    ];
    entries.forEach(([el, display]) => {
        if (el) el.style.display = display;
    });
}
