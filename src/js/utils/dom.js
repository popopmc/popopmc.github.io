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

const PAGE_IDS = ['homePage', 'playersPage', 'gameLogPage', 'recordsPage', 'teamsPage', 'scrimsPage', 'playerProfilePage', 'teamProfilePage'];

/**
 * Returns the main page container elements (may be null).
 */
export function getPageElements() {
    return {
        homePage: document.getElementById('homePage'),
        playersPage: document.getElementById('playersPage'),
        gameLogPage: document.getElementById('gameLogPage'),
        recordsPage: document.getElementById('recordsPage'),
        teamsPage: document.getElementById('teamsPage'),
        scrimsPage: document.getElementById('scrimsPage'),
        profilePage: document.getElementById('playerProfilePage'),
        teamProfilePage: document.getElementById('teamProfilePage')
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
        [pages.recordsPage, visibleId === 'recordsPage' ? 'block' : 'none'],
        [pages.teamsPage, visibleId === 'teamsPage' ? 'block' : 'none'],
        [pages.scrimsPage, visibleId === 'scrimsPage' ? 'block' : 'none'],
        [pages.profilePage, visibleId === 'playerProfilePage' ? 'block' : 'none'],
        [pages.teamProfilePage, visibleId === 'teamProfilePage' ? 'block' : 'none']
    ];
    entries.forEach(([el, display]) => {
        if (el) el.style.display = display;
    });
}
