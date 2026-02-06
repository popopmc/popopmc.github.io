/**
 * Players page: carousel, roster table, sort, search.
 */

import { state } from '../state/store.js';
import { getProfilePicturePath, getPlayerNameWithIcon } from '../utils/profile-pictures.js';
import { populateMonthDropdown } from '../utils/month-selector.js';

function updateCarouselPosition() {
    const carousel = document.getElementById('playersCarousel');
    if (!carousel) return;
    const firstCard = carousel.querySelector('.player-card');
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth;
    const gap = 24;
    const totalCardWidth = cardWidth + gap;
    carousel.style.transform = `translateX(${-state.carouselIndex * totalCardWidth}px)`;
    const leftBtn = document.getElementById('carouselLeftBtn');
    const rightBtn = document.getElementById('carouselRightBtn');
    const totalCards = carousel.children.length;
    const cardsPerView = Math.floor((carousel.parentElement.offsetWidth - 120) / totalCardWidth);
    if (leftBtn) {
        leftBtn.disabled = state.carouselIndex === 0;
        leftBtn.style.opacity = state.carouselIndex === 0 ? '0.5' : '1';
        leftBtn.style.cursor = state.carouselIndex === 0 ? 'not-allowed' : 'pointer';
    }
    if (rightBtn) {
        const maxIndex = Math.max(0, totalCards - cardsPerView);
        rightBtn.disabled = state.carouselIndex >= maxIndex;
        rightBtn.style.opacity = state.carouselIndex >= maxIndex ? '0.5' : '1';
        rightBtn.style.cursor = state.carouselIndex >= maxIndex ? 'not-allowed' : 'pointer';
    }
}

export function loadPlayersPage() {
    if (!state.statsProcessor) return;

    let allPlayers;
    if (state.rosterPeriod === 'monthly' && state.rosterSelectedMonth !== null && state.rosterSelectedYear !== null) {
        allPlayers = state.statsProcessor.getPlayerStatsForMonth(state.rosterSelectedMonth, state.rosterSelectedYear, 1);
    } else {
        allPlayers = state.statsProcessor.getPlayerStats(1).sort((a, b) => b.games - a.games);
    }

    state.rosterPlayers = allPlayers;
    state.carouselIndex = 0;
    loadPlayersCarousel(allPlayers);
    loadRosterTable(state.rosterPlayers);
    updateSortIndicators();
}

export function loadPlayersCarousel(players) {
    const carousel = document.getElementById('playersCarousel');
    if (!carousel) return;

    carousel.innerHTML = players.map((player) => {
        const picturePath = getProfilePicturePath(player.name);
        const cacheBuster = picturePath ? '?v=2' : '';
        const imageHtml = picturePath
            ? `<img src="${picturePath}${cacheBuster}" alt="${player.name}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';">`
            : '';
        return `
        <div class="player-card" data-player-name="${player.name.replace(/"/g, '&quot;')}">
            <div class="player-card-image">${imageHtml}</div>
            <div class="player-card-info">
                <div class="player-card-name">${player.name.toUpperCase()}</div>
                <div class="player-card-stats-bar">
                    <div class="player-stat-item"><span class="stat-label">WINS</span><span class="stat-number">${player.wins}</span></div>
                    <div class="player-stat-item"><span class="stat-label">LOSSES</span><span class="stat-number">${player.losses}</span></div>
                    <div class="player-stat-item"><span class="stat-label">WIN RATE</span><span class="stat-number">${player.winRate}%</span></div>
                    <div class="player-stat-item"><span class="stat-label">+/-</span><span class="stat-number">${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}</span></div>
                </div>
            </div>
        </div>
        `;
    }).join('');

    carousel.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', () => {
            const playerName = card.getAttribute('data-player-name');
            if (playerName && typeof window.showPlayerProfile === 'function') {
                window.showPlayerProfile(playerName);
            }
        });
    });

    setTimeout(updateCarouselPosition, 100);
}

export function scrollCarousel(direction) {
    const carousel = document.getElementById('playersCarousel');
    if (!carousel || carousel.children.length === 0) return;
    const firstCard = carousel.querySelector('.player-card');
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth;
    const gap = 24;
    const containerWidth = carousel.parentElement.offsetWidth - 120;
    const cardsPerView = Math.floor(containerWidth / (cardWidth + gap));
    const maxIndex = Math.max(0, carousel.children.length - cardsPerView);
    if (direction === 'left' && state.carouselIndex > 0) {
        state.carouselIndex--;
        updateCarouselPosition();
    } else if (direction === 'right' && state.carouselIndex < maxIndex) {
        state.carouselIndex++;
        updateCarouselPosition();
    }
}

export function loadRosterTable(players) {
    const tbody = document.getElementById('rosterTableBody');
    if (!tbody) return;
    tbody.innerHTML = players.map(player => `
        <tr data-player-name="${player.name.replace(/"/g, '&quot;')}">
            <td class="player-cell">${getPlayerNameWithIcon(player.name, 32, true)}</td>
            <td>${player.wins}</td>
            <td>${player.losses}</td>
            <td class="${parseFloat(player.winRate) >= 50 ? 'positive' : 'negative'}">${player.winRate}%</td>
            <td class="${player.plusMinus >= 0 ? 'positive' : 'negative'}">${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}</td>
            <td>${player.games}</td>
        </tr>
    `).join('');
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('.sortable')) return;
            const playerName = row.getAttribute('data-player-name');
            if (playerName && typeof window.showPlayerProfile === 'function') {
                window.showPlayerProfile(playerName);
            }
        });
    });
}

export function sortRosterTable(column) {
    if (state.rosterSortColumn === column) {
        state.rosterSortDirection = state.rosterSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.rosterSortColumn = column;
        state.rosterSortDirection = 'asc';
    }
    state.rosterPlayers.sort((a, b) => {
        let aVal, bVal;
        switch (column) {
            case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
            case 'wins': aVal = a.wins; bVal = b.wins; break;
            case 'losses': aVal = a.losses; bVal = b.losses; break;
            case 'winRate': aVal = parseFloat(a.winRate); bVal = parseFloat(b.winRate); break;
            case 'plusMinus': aVal = a.plusMinus; bVal = b.plusMinus; break;
            case 'games': aVal = a.games; bVal = b.games; break;
            default: return 0;
        }
        if (aVal < bVal) return state.rosterSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return state.rosterSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    loadRosterTable(state.rosterPlayers);
    updateSortIndicators();
}

export function updateSortIndicators() {
    document.querySelectorAll('.roster-table .sortable').forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        const column = header.getAttribute('data-sort');
        if (column === state.rosterSortColumn) {
            header.classList.add('sorted');
            if (indicator) indicator.textContent = state.rosterSortDirection === 'asc' ? ' ↑' : ' ↓';
        } else {
            header.classList.remove('sorted');
            if (indicator) indicator.textContent = '';
        }
    });
}

export function filterRosterTable() {
    const searchInput = document.getElementById('playerSearch');
    const tbody = document.getElementById('rosterTableBody');
    if (!searchInput || !tbody) return;
    const searchTerm = searchInput.value.toLowerCase();
    tbody.querySelectorAll('tr').forEach(row => {
        const playerNameSpan = row.querySelector('.player-name-with-icon span:last-child');
        const playerName = playerNameSpan?.textContent.toLowerCase() || '';
        row.style.display = playerName.includes(searchTerm) ? '' : 'none';
    });
}
