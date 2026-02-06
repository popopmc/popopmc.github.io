/**
 * main.js - Game Stats Dashboard entry point.
 * Loads modules, initializes state, binds events, exposes globals for HTML onclick.
 */

import { StatsProcessor } from './data/processor.js';
import { state } from './state/store.js';
import { loadData } from './data/loaders.js';
import { switchPeriod } from './pages/home.js';
import {
    goBackHome,
    showPlayersPage,
    showGameLogPage,
    showPlayerProfile,
    updateActiveNavLink
} from './pages/navigation.js';
import { loadGameLog } from './pages/game-log.js';
import {
    loadPlayersPage,
    scrollCarousel,
    filterRosterTable,
    sortRosterTable
} from './pages/players.js';
import {
    loadPlayerProfile,
    loadSynergy,
    loadMatchups,
    switchProfileTab,
    toggleLookupMode,
    handleOpponentLookup,
    updateLastUpdated
} from './pages/profile.js';
import { populateMonthDropdown } from './utils/month-selector.js';

document.addEventListener('DOMContentLoaded', () => {
    if (!state.statsProcessor) {
        state.statsProcessor = new StatsProcessor();
    }

    loadData(() => updateLastUpdated());

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchPeriod(btn.dataset.period));
    });

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '⏳ Loading...';
            loadData().finally(() => {
                refreshBtn.disabled = false;
                refreshBtn.textContent = '🔄 Refresh Stats';
            });
        });
    }

    const withToggle = document.getElementById('withToggle');
    const againstToggle = document.getElementById('againstToggle');
    if (withToggle) withToggle.addEventListener('click', () => toggleLookupMode('with'));
    if (againstToggle) againstToggle.addEventListener('click', () => toggleLookupMode('against'));

    const opponentLookupBtn = document.getElementById('opponentLookupBtn');
    if (opponentLookupBtn) opponentLookupBtn.addEventListener('click', handleOpponentLookup);

    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.addEventListener('click', () => switchProfileTab(btn.dataset.tab));
    });

    document.querySelectorAll('.period-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            const period = btn.dataset.period;
            document.querySelectorAll(`[data-section="${section}"]`).forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const monthSelector = document.getElementById(`${section}MonthSelector`);
            if (monthSelector) monthSelector.style.display = period === 'monthly' ? 'block' : 'none';

            if (section === 'profile') {
                state.profilePeriod = period;
                if (period === 'monthly') {
                    if (state.profileSelectedMonth === null || state.profileSelectedYear === null) {
                        const now = new Date();
                        state.profileSelectedMonth = now.getMonth();
                        state.profileSelectedYear = now.getFullYear();
                    }
                    populateMonthDropdown('profileMonthSelect', state.profileSelectedMonth, state.profileSelectedYear);
                }
                if (state.currentPlayerName) loadPlayerProfile(state.currentPlayerName);
            } else if (section === 'synergy') {
                state.synergyPeriod = period;
                if (state.currentPlayerName) loadSynergy(state.currentPlayerName);
            } else if (section === 'matchups') {
                state.matchupsPeriod = period;
                if (state.currentPlayerName) loadMatchups(state.currentPlayerName);
            } else if (section === 'roster') {
                state.rosterPeriod = period;
                if (period === 'monthly') {
                    populateMonthDropdown('rosterMonthSelect', state.rosterSelectedMonth, state.rosterSelectedYear);
                    if (state.rosterSelectedMonth === null || state.rosterSelectedYear === null) {
                        const now = new Date();
                        state.rosterSelectedMonth = now.getMonth();
                        state.rosterSelectedYear = now.getFullYear();
                        populateMonthDropdown('rosterMonthSelect', state.rosterSelectedMonth, state.rosterSelectedYear);
                    }
                }
                loadPlayersPage();
            }
        });
    });

    const monthSelectConfig = [
        { selectId: 'profileMonthSelect', yearKey: 'profileSelectedYear', monthKey: 'profileSelectedMonth', onApply: () => state.currentPlayerName && loadPlayerProfile(state.currentPlayerName) },
        { selectId: 'synergyMonthSelect', yearKey: 'synergySelectedYear', monthKey: 'synergySelectedMonth', onApply: () => state.currentPlayerName && loadSynergy(state.currentPlayerName) },
        { selectId: 'matchupsMonthSelect', yearKey: 'matchupsSelectedYear', monthKey: 'matchupsSelectedMonth', onApply: () => state.currentPlayerName && loadMatchups(state.currentPlayerName) },
        { selectId: 'rosterMonthSelect', yearKey: 'rosterSelectedYear', monthKey: 'rosterSelectedMonth', onApply: loadPlayersPage }
    ];
    monthSelectConfig.forEach(({ selectId, yearKey, monthKey, onApply }) => {
        const el = document.getElementById(selectId);
        if (el) el.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            state[yearKey] = year;
            state[monthKey] = month;
            onApply();
        });
    });

    const carouselLeftBtn = document.getElementById('carouselLeftBtn');
    const carouselRightBtn = document.getElementById('carouselRightBtn');
    if (carouselLeftBtn) carouselLeftBtn.addEventListener('click', () => scrollCarousel('left'));
    if (carouselRightBtn) carouselRightBtn.addEventListener('click', () => scrollCarousel('right'));

    const playerSearch = document.getElementById('playerSearch');
    if (playerSearch) playerSearch.addEventListener('input', filterRosterTable);

    document.querySelectorAll('.roster-table .sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            if (column) sortRosterTable(column);
        });
    });

    window.showPlayerProfile = showPlayerProfile;
    window.goBackHome = goBackHome;
    window.showPlayersPage = showPlayersPage;
    window.showGameLogPage = showGameLogPage;

    const homeLink = document.querySelector('.nav-link[onclick*="goBackHome"]');
    if (homeLink) updateActiveNavLink(homeLink);

    updateLastUpdated();
});
