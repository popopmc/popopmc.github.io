/**
 * Home page: stats grid, tabs, sidebar, period switching.
 */

import { state } from '../state/store.js';
import { getPlayerNameWithIcon } from '../utils/profile-pictures.js';

export function updateDateDisplay() {
    const dateEl = document.getElementById('dateDisplay');
    if (dateEl) {
        const now = new Date();
        dateEl.textContent = now.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
    }
}

export function displayStats() {
    const container = document.getElementById('statsGrid');
    if (!container || !state.statsProcessor) return;

    const isMonthly = state.currentPeriod === 'monthly';
    const minGames = isMonthly ? 10 : 50;

    const winRateLeaders = state.statsProcessor.getLeadersByCategory('winrate', isMonthly, minGames);
    const winsLeaders = state.statsProcessor.getLeadersByCategory('wins', isMonthly, minGames);
    const lossesLeaders = state.statsProcessor.getLeadersByCategory('losses', isMonthly, minGames);
    const plusMinusLeaders = state.statsProcessor.getLeadersByCategory('plusminus', isMonthly, minGames);

    container.innerHTML = `
        <div class="stat-category">
            <h3 class="stat-category-title">Win Rate</h3>
            <ul class="stat-list">
                ${winRateLeaders.map((player, index) => `
                    <li class="stat-item">
                        <span>
                            <span class="stat-rank">${index + 1}.</span>
                            ${getPlayerNameWithIcon(player.name, 36, true)}
                        </span>
                        <span class="stat-value">${player.winRate}%</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="stat-category">
            <h3 class="stat-category-title">SUPERTEAM MERCHANTS</h3>
            <ul class="stat-list">
                ${winsLeaders.map((player, index) => `
                    <li class="stat-item">
                        <span>
                            <span class="stat-rank">${index + 1}.</span>
                            ${getPlayerNameWithIcon(player.name, 36, true)}
                        </span>
                        <span class="stat-value">${player.wins}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="stat-category">
            <h3 class="stat-category-title">MENTALITY MONSTERS</h3>
            <ul class="stat-list">
                ${lossesLeaders.map((player, index) => `
                    <li class="stat-item">
                        <span>
                            <span class="stat-rank">${index + 1}.</span>
                            ${getPlayerNameWithIcon(player.name, 36, true)}
                        </span>
                        <span class="stat-value">${player.losses}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="stat-category">
            <h3 class="stat-category-title">Plus/Minus</h3>
            <ul class="stat-list">
                ${plusMinusLeaders.map((player, index) => `
                    <li class="stat-item">
                        <span>
                            <span class="stat-rank">${index + 1}.</span>
                            ${getPlayerNameWithIcon(player.name, 36, true)}
                        </span>
                        <span class="stat-value">${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

export function updateMoreStats() {
    const container = document.getElementById('moreStats');
    if (!container || !state.statsProcessor) return;

    const isMonthly = state.currentPeriod === 'monthly';
    const raw = isMonthly
        ? state.statsProcessor.getMonthlyPlayerStats(1)
        : state.statsProcessor.getPlayerStats(1);
    const stats = [...raw].sort((a, b) => b.games - a.games).slice(0, 15);

    container.innerHTML = stats.map((player) => {
        const escapedName = player.name.replace(/'/g, "\\'");
        return `<div class="more-stat-item">
            <span class="more-stat-player" onclick="showPlayerProfile('${escapedName}')">${player.name}</span>
            <span class="more-stat-games">${player.games}</span>
        </div>`;
    }).join('');
}

export function switchPeriod(period) {
    state.currentPeriod = period;
    displayStats();
    updateMoreStats();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const active = document.querySelector(`.tab-btn[data-period="${period}"]`);
    if (active) active.classList.add('active');
}
