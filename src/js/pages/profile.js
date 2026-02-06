/**
 * Player profile page: header, stats, accolades, synergy, matchups, lookup.
 */

import { state } from '../state/store.js';
import { getProfilePicturePath, getPlayerNameWithIcon } from '../utils/profile-pictures.js';
import { populateMonthDropdown } from '../utils/month-selector.js';
import { emptyStateHtml } from '../utils/dom.js';
import { renderDuoRow, renderMostTeamedRow } from '../utils/duo-row.js';

const BADGE_IMAGES = {
    'the yosh most valuable player (mvp)': 'src/assets/badges/pixel_mvp.png',
    'the naenailwhip finals mvp (fmvp)': 'src/assets/badges/pixel_finals_mvp.png',
    'the epic jab golden boot': 'src/assets/badges/pixel_boot.png',
    'the tonyboring golden glove': 'src/assets/badges/pixel_glove.png',
    'the majineri fair play award': 'src/assets/badges/israeri_fairplay.png',
    'the popop rusty boot': 'src/assets/badges/pixel_rustyboot.png',
    'the lebonkjames23 award': 'src/assets/badges/lebronjames.png',
    'the puskas award': 'src/assets/badges/puskaas.png',
    'the puskass award': 'src/assets/badges/puskaas.png',
    'save of the tournament': 'src/assets/badges/save_of_the_tournament.png',
    'the wraith most improved player': 'src/assets/badges/most_improved.png',
    'the tonyboring youthful spirit award': 'src/assets/badges/youthful.jpg',
    'the charlie kirk legacy award': 'src/assets/badges/kirk.png'
};

export function loadPlayerProfile(playerName) {
    state.currentPlayerName = playerName;

    if (state.profilePeriod === 'monthly' && (state.profileSelectedMonth === null || state.profileSelectedYear === null)) {
        const now = new Date();
        state.profileSelectedMonth = now.getMonth();
        state.profileSelectedYear = now.getFullYear();
        populateMonthDropdown('profileMonthSelect', state.profileSelectedMonth, state.profileSelectedYear);
        const profileMonthSelector = document.getElementById('profileMonthSelector');
        if (profileMonthSelector) profileMonthSelector.style.display = 'block';
    }

    document.querySelectorAll('.period-tab[data-section="profile"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === state.profilePeriod);
    });
    const profileMonthSelectorEl = document.getElementById('profileMonthSelector');
    if (profileMonthSelectorEl) profileMonthSelectorEl.style.display = state.profilePeriod === 'monthly' ? 'block' : 'none';

    const isMonthly = state.profilePeriod === 'monthly';
    const selectedMonth = state.profileSelectedMonth;
    const selectedYear = state.profileSelectedYear;
    const player = state.statsProcessor.getPlayerProfile(playerName, isMonthly, selectedMonth, selectedYear);

    if (!player) {
        alert('Player not found');
        if (typeof window.goBackHome === 'function') window.goBackHome();
        return;
    }

    const profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = playerName.toUpperCase();

    const profilePicture = document.getElementById('profilePicture');
    if (profilePicture) {
        const picturePath = getProfilePicturePath(playerName);
        if (picturePath) {
            profilePicture.innerHTML = `<img src="${picturePath}?v=2" alt="${playerName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" onerror="this.parentElement.innerHTML='<div style=\\'color: rgba(255,255,255,0.5); font-size: 0.9rem; text-align: center;\\'>Profile Picture</div>'">`;
        }
    }

    const totalGames = player.wins + player.losses;
    const winPercentage = totalGames > 0 ? (player.wins / totalGames * 100) : 0;
    const lossPercentage = totalGames > 0 ? (player.losses / totalGames * 100) : 0;
    const gamesAsKeeper = player.gamesAsKeeper || 0;
    const gamesAsStriker = player.gamesAsStriker || 0;
    const totalRoleGames = gamesAsKeeper + gamesAsStriker;
    const keeperPercentage = totalRoleGames > 0 ? (gamesAsKeeper / totalRoleGames * 100) : 0;
    const strikerPercentage = totalRoleGames > 0 ? (gamesAsStriker / totalRoleGames * 100) : 0;

    let playerGames = state.statsProcessor.games.filter(game => {
        const team1Has = game.team1.players.some(p => p.toLowerCase() === playerName.toLowerCase());
        const team2Has = game.team2.players.some(p => p.toLowerCase() === playerName.toLowerCase());
        return team1Has || team2Has;
    });
    if (isMonthly && selectedMonth !== null && selectedYear !== null) {
        playerGames = playerGames.filter(game => {
            const gameDate = new Date(game.timestamp);
            return gameDate.getMonth() === selectedMonth && gameDate.getFullYear() === selectedYear;
        });
    }
    playerGames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let longestWinStreak = 0, currentStreak = 0, last10Wins = 0, last10Losses = 0;
    for (let i = 0; i < playerGames.length; i++) {
        const game = playerGames[i];
        const isTeam1 = game.team1.players.some(p => p.toLowerCase() === playerName.toLowerCase());
        const won = isTeam1 ? game.team1.score > game.team2.score : game.team2.score > game.team1.score;
        if (won) {
            currentStreak++;
            longestWinStreak = Math.max(longestWinStreak, currentStreak);
        } else currentStreak = 0;
        if (i >= playerGames.length - 10) {
            if (won) last10Wins++; else last10Losses++;
        }
    }
    const last10Record = `${last10Wins}-${last10Losses}`;
    const last10Games = Math.min(10, playerGames.length);

    const profileStatsGrid = document.getElementById('profileStatsGrid');
    if (profileStatsGrid) {
        profileStatsGrid.innerHTML = `
            <div class="profile-stat-box profile-stat-games">
                <div class="profile-stat-label">Games</div>
                <div class="profile-stat-value">${player.games}</div>
            </div>
            <div class="profile-win-loss-bar">
                <div class="win-loss-bar-container">
                    <div class="win-loss-bar">
                        ${player.wins > 0 ? `<div class="win-section" style="width: ${winPercentage}%"><div class="win-loss-label win-label"><span class="win-loss-icon">+</span><span class="win-loss-percentage">${winPercentage.toFixed(0)}%</span></div><div class="win-loss-count win-count">${player.wins} Won</div></div>` : ''}
                        ${player.losses > 0 ? `<div class="loss-section" style="width: ${lossPercentage}%"><div class="win-loss-label loss-label"><span class="win-loss-icon">-</span><span class="win-loss-percentage">${lossPercentage.toFixed(0)}%</span></div><div class="win-loss-count loss-count">${player.losses} Lost</div></div>` : ''}
                    </div>
                </div>
            </div>
            <div class="profile-stat-box profile-stat-plusminus">
                <div class="profile-stat-label">Plus/Minus</div>
                <div class="profile-stat-value">${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}</div>
            </div>
            <div class="profile-role-bar">
                <div class="role-bar-container">
                    <div class="role-bar">
                        ${gamesAsKeeper > 0 ? `<div class="role-section keeper-section" style="width: ${keeperPercentage}%"><div class="role-label keeper-label"><span class="role-icon">GK</span><span class="role-percentage">${keeperPercentage.toFixed(0)}%</span></div><div class="role-count keeper-count">${gamesAsKeeper} Keeper</div></div>` : ''}
                        ${gamesAsStriker > 0 ? `<div class="role-section striker-section" style="width: ${strikerPercentage}%"><div class="role-label striker-label"><span class="role-icon">ST</span><span class="role-percentage">${strikerPercentage.toFixed(0)}%</span></div><div class="role-count striker-count">${gamesAsStriker} Striker</div></div>` : ''}
                    </div>
                </div>
            </div>
            <div class="profile-stat-box profile-stat-longest-streak">
                <div class="profile-stat-label">Longest Win Streak</div>
                <div class="profile-stat-value">${longestWinStreak}</div>
            </div>
            <div class="profile-stat-box profile-stat-last10">
                <div class="profile-stat-label">Last ${last10Games}</div>
                <div class="profile-stat-value">${last10Record}</div>
            </div>
        `;
    }

    loadPlayerAccolades(playerName);
    loadSynergy(playerName);
}

export function loadPlayerAccolades(playerName) {
    const accoladesSection = document.getElementById('profileAccoladesSection');
    const accoladesList = document.getElementById('accoladesList');
    if (!accoladesSection || !accoladesList) return;

    const normalizedName = playerName.toLowerCase().trim();
    const accolades = state.playerAccolades.get(normalizedName) || [];
    if (accolades.length === 0) {
        accoladesSection.style.display = 'none';
        return;
    }
    accoladesSection.style.display = 'block';

    const accoladeGroups = {};
    accolades.forEach(accolade => {
        const key = accolade.award;
        if (!accoladeGroups[key]) accoladeGroups[key] = [];
        accoladeGroups[key].push(accolade.tournament);
    });

    accoladesList.innerHTML = Object.entries(accoladeGroups).map(([award, tournaments]) => {
        const tournamentText = tournaments.length === 1 ? `T${tournaments[0]}` : `T${tournaments.sort((a, b) => a - b).join(', T')}`;
        const count = tournaments.length > 1 ? `${tournaments.length}x` : '';
        const tooltipText = `${award} - ${tournamentText}`;
        const normalizedAward = award.toLowerCase().trim();
        const badgeImage = BADGE_IMAGES[normalizedAward];
        if (badgeImage) {
            return `<div class="accolade-badge" title="${tooltipText}"><img src="${badgeImage}" alt="${award}" class="badge-image" />${count ? `<span class="badge-count">${count}</span>` : ''}</div>`;
        }
        return `<div class="accolade-badge placeholder-badge" title="${tooltipText}"><div class="badge-placeholder"><span class="badge-placeholder-text">${award}${count ? ` ${count}` : ''}</span></div></div>`;
    }).join('');

    populateOpponentDropdown(playerName);
    state.lookupMode = 'against';
    toggleLookupMode('against');
    const now = new Date();
    if (state.profileSelectedMonth === null || state.profileSelectedYear === null) {
        state.profileSelectedMonth = now.getMonth();
        state.profileSelectedYear = now.getFullYear();
    }
    state.synergySelectedMonth = now.getMonth();
    state.synergySelectedYear = now.getFullYear();
    state.matchupsSelectedMonth = now.getMonth();
    state.matchupsSelectedYear = now.getFullYear();
    populateMonthDropdown('profileMonthSelect', state.profileSelectedMonth, state.profileSelectedYear);
    populateMonthDropdown('synergyMonthSelect', state.synergySelectedMonth, state.synergySelectedYear);
    populateMonthDropdown('matchupsMonthSelect', state.matchupsSelectedMonth, state.matchupsSelectedYear);
    const profileMonthSelector = document.getElementById('profileMonthSelector');
    if (profileMonthSelector && state.profilePeriod === 'monthly') profileMonthSelector.style.display = 'block';
    loadMatchups(playerName);
}

export function populateOpponentDropdown(playerName) {
    const select = document.getElementById('opponentSelect');
    if (!select || !state.statsProcessor) return;
    const allPlayers = state.statsProcessor.getAllPlayerNames()
        .filter(name => name.toLowerCase() !== playerName.toLowerCase())
        .sort();
    select.innerHTML = '<option value="">Select a player...</option>' + allPlayers.map(name => `<option value="${name}">${name}</option>`).join('');
}

export function loadSynergy(playerName) {
    if (!state.statsProcessor) return;
    const isMonthly = state.synergyPeriod === 'monthly';
    const topDuos = state.statsProcessor.getTopDuos(playerName, 1, isMonthly, state.synergySelectedMonth, state.synergySelectedYear);
    const topDuosList = document.getElementById('topDuosList');
    if (topDuosList) {
        topDuosList.innerHTML = topDuos.length === 0 ? emptyStateHtml('No duo data available') : topDuos.map(d => renderDuoRow(d, 'teammate', 24)).join('');
    }
    const bottomDuos = state.statsProcessor.getBottomDuos(playerName, 1, isMonthly, state.synergySelectedMonth, state.synergySelectedYear);
    const bottomDuosList = document.getElementById('bottomDuosList');
    if (bottomDuosList) {
        bottomDuosList.innerHTML = bottomDuos.length === 0 ? emptyStateHtml('No duo data available') : bottomDuos.map(d => renderDuoRow(d, 'teammate', 24)).join('');
    }
    const allDuos = state.statsProcessor.getPlayerDuoStats(playerName, 1, isMonthly, state.synergySelectedMonth, state.synergySelectedYear);
    const mostTeamedList = document.getElementById('mostTeamedList');
    if (mostTeamedList) {
        const sortedDuos = allDuos.sort((a, b) => (b.games !== a.games) ? (b.games - a.games) : (b.winRate - a.winRate));
        mostTeamedList.innerHTML = sortedDuos.length === 0 ? emptyStateHtml('No teammate data available') : sortedDuos.map(d => renderMostTeamedRow(d, 36)).join('');
    }
}

export function loadMatchups(playerName) {
    if (!state.statsProcessor) return;
    const isMonthly = state.matchupsPeriod === 'monthly';
    const topOpponents = state.statsProcessor.getTopOpponents(playerName, 1, isMonthly, state.matchupsSelectedMonth, state.matchupsSelectedYear);
    const topOpponentsList = document.getElementById('topOpponentsList');
    if (topOpponentsList) {
        topOpponentsList.innerHTML = topOpponents.length === 0 ? emptyStateHtml('No matchup data available') : topOpponents.map(opp => renderDuoRow(opp, 'opponent', 24)).join('');
    }
    const bottomOpponents = state.statsProcessor.getBottomOpponents(playerName, 1, isMonthly, state.matchupsSelectedMonth, state.matchupsSelectedYear);
    const bottomOpponentsList = document.getElementById('bottomOpponentsList');
    if (bottomOpponentsList) {
        bottomOpponentsList.innerHTML = bottomOpponents.length === 0 ? emptyStateHtml('No matchup data available') : bottomOpponents.map(opp => renderDuoRow(opp, 'opponent', 24)).join('');
    }
}

export function handleOpponentLookup() {
    const select = document.getElementById('opponentSelect');
    const result = document.getElementById('opponentLookupResult');
    if (!select || !result || !state.currentPlayerName || !state.statsProcessor) return;
    const selectedPlayer = select.value;
    if (!selectedPlayer) {
        alert('Please select a player');
        return;
    }
    const isMonthly = state.matchupsPeriod === 'monthly';
    let stats, title, noGamesMsg;
    if (state.lookupMode === 'with') {
        stats = state.statsProcessor.getDuoWinRate(state.currentPlayerName, selectedPlayer, 1, isMonthly, state.matchupsSelectedMonth, state.matchupsSelectedYear);
        title = `${getPlayerNameWithIcon(state.currentPlayerName.toUpperCase(), 28, false)} & ${getPlayerNameWithIcon(selectedPlayer.toUpperCase(), 28, false)}`;
        noGamesMsg = 'No games played together (minimum 1 game required)';
    } else {
        stats = state.statsProcessor.getOpponentWinRate(state.currentPlayerName, selectedPlayer, 1, isMonthly, state.matchupsSelectedMonth, state.matchupsSelectedYear);
        title = `${getPlayerNameWithIcon(state.currentPlayerName.toUpperCase(), 28, false)} vs ${getPlayerNameWithIcon(selectedPlayer.toUpperCase(), 28, false)}`;
        noGamesMsg = 'No games played against this player (minimum 1 game required)';
    }
    if (!stats) {
        result.classList.remove('hidden');
        result.innerHTML = `<div class="lookup-result-content"><p style="color: var(--text-secondary);">${noGamesMsg}</p></div>`;
        return;
    }
    result.classList.remove('hidden');
    result.innerHTML = `<div class="lookup-result-content"><div class="lookup-result-title">${title}</div><div class="lookup-result-stats"><div class="lookup-stat-box"><div class="lookup-stat-label">Win Rate</div><div class="lookup-stat-value" style="color: ${stats.winRate >= 50 ? '#10b981' : '#ef4444'};">${stats.winRate}%</div></div><div class="lookup-stat-box"><div class="lookup-stat-label">Games</div><div class="lookup-stat-value">${stats.games}</div></div><div class="lookup-stat-box"><div class="lookup-stat-label">Wins</div><div class="lookup-stat-value">${stats.wins}</div></div><div class="lookup-stat-box"><div class="lookup-stat-label">Losses</div><div class="lookup-stat-value">${stats.losses}</div></div></div></div>`;
}

export function switchProfileTab(tabName) {
    const synergySection = document.getElementById('synergySection');
    const matchupsSection = document.getElementById('matchupsSection');
    document.querySelectorAll('.profile-tab').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.querySelector(`.profile-tab[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');
    if (tabName === 'synergy') {
        if (synergySection) synergySection.style.display = 'block';
        if (matchupsSection) matchupsSection.style.display = 'none';
    } else if (tabName === 'matchups') {
        if (synergySection) synergySection.style.display = 'none';
        if (matchupsSection) matchupsSection.style.display = 'block';
    }
}

export function toggleLookupMode(mode) {
    state.lookupMode = mode;
    const withToggle = document.getElementById('withToggle');
    const againstToggle = document.getElementById('againstToggle');
    if (withToggle && againstToggle) {
        if (mode === 'with') {
            withToggle.classList.add('active');
            againstToggle.classList.remove('active');
        } else {
            withToggle.classList.remove('active');
            againstToggle.classList.add('active');
        }
    }
    const result = document.getElementById('opponentLookupResult');
    if (result) {
        result.innerHTML = '';
        result.classList.add('hidden');
    }
}

export function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) lastUpdateEl.textContent = timeString;
}
