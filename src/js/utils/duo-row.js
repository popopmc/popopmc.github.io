/**
 * Shared HTML for duo/opponent list rows (synergy and matchups).
 * Single template for Games/Wins/Losses/WinRate row.
 */

import { getPlayerNameWithIcon } from './profile-pictures.js';

/**
 * Renders one duo or opponent row (same structure: name + games, wins, losses, winRate).
 * @param {{ teammate?: string, opponent?: string, games: number, wins: number, losses: number, winRate: number }} item
 * @param {'teammate'|'opponent'} nameKey - key for display name (duo uses .teammate, matchup uses .opponent)
 * @param {number} [iconSize=24]
 * @returns {string}
 */
export function renderDuoRow(item, nameKey = 'teammate', iconSize = 24) {
    const name = item[nameKey] || '';
    const winRateClass = item.winRate >= 50 ? 'positive' : 'negative';
    return `<div class="duo-item">
        <div class="duo-teammate">${getPlayerNameWithIcon(name, iconSize, true)}</div>
        <div class="duo-stats">
            <div class="duo-stat"><div class="duo-stat-label">Games</div><div class="duo-stat-value">${item.games}</div></div>
            <div class="duo-stat"><div class="duo-stat-label">Wins</div><div class="duo-stat-value">${item.wins}</div></div>
            <div class="duo-stat"><div class="duo-stat-label">Losses</div><div class="duo-stat-value">${item.losses}</div></div>
            <div class="duo-winrate ${winRateClass}">${item.winRate}%</div>
        </div>
    </div>`;
}

/**
 * Renders "most teamed" row (different layout: player + games G + winRate).
 * @param {{ teammate: string, games: number, winRate: number }} item
 * @param {number} [iconSize=36]
 * @returns {string}
 */
export function renderMostTeamedRow(item, iconSize = 36) {
    const winRateClass = item.winRate >= 50 ? 'positive' : 'negative';
    return `<div class="most-teamed-item">
        <div class="most-teamed-player">${getPlayerNameWithIcon(item.teammate, iconSize, true)}</div>
        <div class="most-teamed-stats">
            <div class="most-teamed-games">${item.games} G</div>
            <div class="most-teamed-winrate ${winRateClass}">${item.winRate}%</div>
        </div>
    </div>`;
}
