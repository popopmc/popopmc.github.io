/**
 * Teams page: carousel, roster table, period tabs, search, sort. Team profile: stats, matchups, lookup vs team.
 */

import { state } from '../state/store.js';
import { emptyStateHtml, showOnlyPage } from '../utils/dom.js';
import { getPlayerNameWithIcon } from '../utils/profile-pictures.js';
import { renderDuoRow } from '../utils/duo-row.js';

function updateTeamsCarouselButtons() {
    const carousel = document.getElementById('teamsCarousel');
    if (!carousel) return;
    const leftBtn = document.getElementById('teamsCarouselLeftBtn');
    const rightBtn = document.getElementById('teamsCarouselRightBtn');
    if (leftBtn) {
        leftBtn.disabled = false;
        leftBtn.style.opacity = '1';
    }
    if (rightBtn) {
        rightBtn.disabled = false;
        rightBtn.style.opacity = '1';
    }
}

export function loadTeamsPage() {
    if (!state.statsProcessor) return;

    const p = state.statsProcessor;
    const scrimVsScrimOnly = !!state.teamsScrimVsScrimOnly;
    const allTeams = p.getScrimTeamStats(null, null, scrimVsScrimOnly);

    state.rosterTeams = allTeams;
    loadTeamsCarousel(allTeams);
    loadTeamsTable(state.rosterTeams);
    updateTeamsSortIndicators();
}

function loadTeamsCarousel(teams) {
    const carousel = document.getElementById('teamsCarousel');
    if (!carousel) return;

    carousel.innerHTML = teams.map((team) => `
        <div class="team-card" data-team-name="${team.teamName.replace(/"/g, '&quot;')}">
            <div class="team-card-info">
                <div class="team-card-name">${team.teamName}</div>
                <div class="team-card-stats-bar">
                    <div class="team-stat-item"><span class="stat-label">W</span><span class="stat-number">${team.wins}</span></div>
                    <div class="team-stat-item"><span class="stat-label">L</span><span class="stat-number">${team.losses}</span></div>
                    <div class="team-stat-item"><span class="stat-label">WR</span><span class="stat-number">${team.winRate}%</span></div>
                    <div class="team-stat-item"><span class="stat-label">+/-</span><span class="stat-number">${team.plusMinus >= 0 ? '+' : ''}${team.plusMinus}</span></div>
                </div>
            </div>
        </div>
    `).join('');

    carousel.querySelectorAll('.team-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.getAttribute('data-team-name');
            if (name && typeof window.showTeamProfile === 'function') window.showTeamProfile(name);
        });
    });
    carousel.scrollLeft = 0;
    carousel.addEventListener('scroll', updateTeamsCarouselButtons);
    requestAnimationFrame(() => {
        updateTeamsCarouselButtons();
    });
}

export function scrollTeamsCarousel(direction) {
    const carousel = document.getElementById('teamsCarousel');
    if (!carousel || carousel.children.length === 0) return;
    const firstCard = carousel.querySelector('.team-card');
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth;
    const gap = 24;
    const step = cardWidth + gap;
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    const atStart = carousel.scrollLeft <= 2;
    const atEnd = maxScroll <= 2 || carousel.scrollLeft >= maxScroll - 2;
    if (direction === 'left') {
        if (atStart) {
            carousel.scrollLeft = maxScroll;
        } else {
            carousel.scrollLeft = Math.max(0, carousel.scrollLeft - step);
        }
    } else {
        if (atEnd) {
            carousel.scrollLeft = 0;
        } else {
            carousel.scrollLeft = Math.min(maxScroll, carousel.scrollLeft + step);
        }
    }
    updateTeamsCarouselButtons();
}

function loadTeamsTable(teams) {
    const tbody = document.getElementById('teamsTableBody');
    if (!tbody) return;
    tbody.innerHTML = teams.map(team => `
        <tr data-team-name="${team.teamName.replace(/"/g, '&quot;')}">
            <td class="team-cell team-name-cell">${team.teamName}</td>
            <td>${team.wins}</td>
            <td>${team.losses}</td>
            <td class="${parseFloat(team.winRate) >= 50 ? 'positive' : 'negative'}">${team.winRate}%</td>
            <td class="${team.plusMinus >= 0 ? 'positive' : 'negative'}">${team.plusMinus >= 0 ? '+' : ''}${team.plusMinus}</td>
            <td>${team.games}</td>
        </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.sortable')) return;
            const name = row.getAttribute('data-team-name');
            if (name && typeof window.showTeamProfile === 'function') window.showTeamProfile(name);
        });
    });
}

export function sortTeamsTable(column) {
    if (state.teamsSortColumn === column) {
        state.teamsSortDirection = state.teamsSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.teamsSortColumn = column;
        state.teamsSortDirection = 'asc';
    }
    state.rosterTeams.sort((a, b) => {
        let aVal, bVal;
        switch (column) {
            case 'name': aVal = a.teamName.toLowerCase(); bVal = b.teamName.toLowerCase(); break;
            case 'wins': aVal = a.wins; bVal = b.wins; break;
            case 'losses': aVal = a.losses; bVal = b.losses; break;
            case 'winRate': aVal = parseFloat(a.winRate); bVal = parseFloat(b.winRate); break;
            case 'plusMinus': aVal = a.plusMinus; bVal = b.plusMinus; break;
            case 'games': aVal = a.games; bVal = b.games; break;
            default: return 0;
        }
        if (aVal < bVal) return state.teamsSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return state.teamsSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    loadTeamsTable(state.rosterTeams);
    updateTeamsSortIndicators();
}

function updateTeamsSortIndicators() {
    const table = document.querySelector('.teams-roster-table');
    if (!table) return;
    table.querySelectorAll('.sortable').forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        const column = header.getAttribute('data-sort');
        if (column === state.teamsSortColumn) {
            header.classList.add('sorted');
            if (indicator) indicator.textContent = state.teamsSortDirection === 'asc' ? ' ↑' : ' ↓';
        } else {
            header.classList.remove('sorted');
            if (indicator) indicator.textContent = '';
        }
    });
}

export function filterTeamsTable() {
    const searchInput = document.getElementById('teamSearch');
    const tbody = document.getElementById('teamsTableBody');
    if (!searchInput || !tbody) return;
    const q = searchInput.value.toLowerCase();
    tbody.querySelectorAll('tr').forEach(row => {
        const name = (row.getAttribute('data-team-name') || '').toLowerCase();
        row.style.display = name.includes(q) ? '' : 'none';
    });
}

// --- Team profile ---
export function loadTeamProfile(teamName) {
    state.currentTeamName = teamName;
    const header = document.getElementById('teamProfileHeader');
    const statsEl = document.getElementById('teamProfileStats');
    const resultEl = document.getElementById('teamLookupResult');
    if (!header || !state.statsProcessor) return;

    const p = state.statsProcessor;
    const defs = p.constructor.getScrimTeamDefinitions();
    const teamDef = defs.find(t => t.name === teamName);
    if (!teamDef) return;

    const teamStats = p.getScrimTeamStats(null, null).find(t => t.teamName === teamName);
    const ordered = p.getTeamScrimGamesOrdered(teamName, null, null);
    let longestWinStreak = 0, currentStreak = 0, last10Wins = 0, last10Losses = 0;
    for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].won) {
            currentStreak++;
            longestWinStreak = Math.max(longestWinStreak, currentStreak);
        } else currentStreak = 0;
        if (i >= ordered.length - 10) {
            if (ordered[i].won) last10Wins++; else last10Losses++;
        }
    }
    const last10Record = `${last10Wins}-${last10Losses}`;
    const last10Games = Math.min(10, ordered.length);

    const opponentStats = p.getTeamOpponentStats(teamName, 1, null, null);
    const opponentsSorted = [...opponentStats].sort((a, b) => (b.winRate !== a.winRate) ? (b.winRate - a.winRate) : (b.games - a.games));

    header.innerHTML = `
        <h1 class="team-profile-name">${teamName}</h1>
        <div class="team-profile-roster" aria-label="Roster">
            ${teamDef.players.map(pl => getPlayerNameWithIcon(pl, 44, true)).join(' · ')}
        </div>
    `;

    if (teamStats) {
        statsEl.innerHTML = `
            <div class="profile-stats-grid team-profile-stats-grid">
                <div class="profile-stat-box team-stat-games">
                    <div class="profile-stat-label">Games</div>
                    <div class="profile-stat-value">${teamStats.games}</div>
                </div>
                <div class="profile-stat-box team-stat-winrate">
                    <div class="profile-stat-label">Win Rate</div>
                    <div class="profile-stat-value">${teamStats.winRate}%</div>
                </div>
                <div class="profile-stat-box team-stat-winstreak">
                    <div class="profile-stat-label">Winstreak</div>
                    <div class="profile-stat-value">${longestWinStreak}</div>
                </div>
                <div class="profile-stat-box team-stat-plusminus">
                    <div class="profile-stat-label">+/-</div>
                    <div class="profile-stat-value">${teamStats.plusMinus >= 0 ? '+' : ''}${teamStats.plusMinus}</div>
                </div>
                <div class="profile-stat-box team-stat-wl">
                    <div class="profile-stat-label">W-L</div>
                    <div class="profile-stat-value">${teamStats.wins}-${teamStats.losses}</div>
                </div>
                <div class="profile-stat-box team-stat-last10">
                    <div class="profile-stat-label">Last ${last10Games}</div>
                    <div class="profile-stat-value">${last10Record}</div>
                </div>
            </div>
        `;
    } else {
        statsEl.innerHTML = emptyStateHtml('No stats for this period.');
    }

    const teamOpponentsList = document.getElementById('teamOpponentsList');
    if (teamOpponentsList) teamOpponentsList.innerHTML = opponentsSorted.length === 0 ? emptyStateHtml('No matchup data available') : opponentsSorted.map(opp => renderDuoRow(opp, 'opponent', 24)).join('');

    if (resultEl) { resultEl.innerHTML = ''; resultEl.classList.add('hidden'); }
}

export function showTeamProfile(teamName) {
    if (!document.getElementById('teamProfilePage')) return;
    showOnlyPage('teamProfilePage');
    loadTeamProfile(teamName);
}

export function handleTeamLookup() {
    const input = document.getElementById('teamOpponentSelect');
    const result = document.getElementById('teamLookupResult');
    if (!input || !result || !state.currentTeamName || !state.statsProcessor) return;
    const playerName = (input.value || '').trim();
    if (!playerName) {
        result.classList.remove('hidden');
        result.innerHTML = '<div class="lookup-result-content"><p style="color: var(--text-secondary);">Select a player.</p></div>';
        return;
    }
    const p = state.statsProcessor;
    const stats = p.getTeamVsPlayerWinRate(state.currentTeamName, playerName, 1, null, null);
    result.classList.remove('hidden');
    if (!stats) {
        result.innerHTML = '<div class="lookup-result-content"><p style="color: var(--text-secondary);">No games vs that player in this period.</p></div>';
        return;
    }
    const title = `${state.currentTeamName} vs ${getPlayerNameWithIcon(stats.opponent, 28, false)}`;
    result.innerHTML = `
        <div class="lookup-result-content">
            <div class="lookup-result-title">${title}</div>
            <div class="lookup-result-stats">
                <div class="lookup-stat-box"><div class="lookup-stat-label">Win Rate</div><div class="lookup-stat-value" style="color: ${parseFloat(stats.winRate) >= 50 ? '#10b981' : '#ef4444'};">${stats.winRate}%</div></div>
                <div class="lookup-stat-box"><div class="lookup-stat-label">Games</div><div class="lookup-stat-value">${stats.games}</div></div>
                <div class="lookup-stat-box"><div class="lookup-stat-label">Wins</div><div class="lookup-stat-value">${stats.wins}</div></div>
                <div class="lookup-stat-box"><div class="lookup-stat-label">Losses</div><div class="lookup-stat-value">${stats.losses}</div></div>
            </div>
        </div>
    `;
}
