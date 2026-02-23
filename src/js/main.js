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
    showRecordsPage,
    showTeamsPage,
    showScrimsPage,
    showPlayerProfile,
    updateActiveNavLink
} from './pages/navigation.js';
import { showRecordsCategory, toggleRecordsNewsExpanded } from './pages/records.js';
import { loadGameLog } from './pages/game-log.js';
import {
    loadPlayersPage,
    scrollCarousel,
    filterRosterTable,
    sortRosterTable
} from './pages/players.js';
import {
    loadTeamsPage,
    scrollTeamsCarousel,
    sortTeamsTable,
    filterTeamsTable,
    showTeamProfile,
    loadTeamProfile,
    handleTeamLookup
} from './pages/teams.js';
import {
    loadPlayerProfile,
    loadSynergy,
    loadMatchups,
    switchProfileTab,
    toggleLookupMode,
    setLookupAgainstRole,
    setLookupPlayerRole,
    handleOpponentLookup,
    updateLastUpdated
} from './pages/profile.js';
import { populateMonthDropdown } from './utils/month-selector.js';
import { createPlayerAutocomplete } from './utils/player-autocomplete.js';

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

    const roleAnyBtn = document.getElementById('roleAnyBtn');
    const roleStrikerBtn = document.getElementById('roleStrikerBtn');
    const roleGkBtn = document.getElementById('roleGkBtn');
    if (roleAnyBtn) roleAnyBtn.addEventListener('click', () => setLookupAgainstRole('any'));
    if (roleStrikerBtn) roleStrikerBtn.addEventListener('click', () => setLookupAgainstRole('striker'));
    if (roleGkBtn) roleGkBtn.addEventListener('click', () => setLookupAgainstRole('gk'));

    const myRoleAnyBtn = document.getElementById('myRoleAnyBtn');
    const myRoleStrikerBtn = document.getElementById('myRoleStrikerBtn');
    const myRoleGkBtn = document.getElementById('myRoleGkBtn');
    if (myRoleAnyBtn) myRoleAnyBtn.addEventListener('click', () => setLookupPlayerRole('any'));
    if (myRoleStrikerBtn) myRoleStrikerBtn.addEventListener('click', () => setLookupPlayerRole('striker'));
    if (myRoleGkBtn) myRoleGkBtn.addEventListener('click', () => setLookupPlayerRole('gk'));

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
        { selectId: 'rosterMonthSelect', yearKey: 'rosterSelectedYear', monthKey: 'rosterSelectedMonth', onApply: loadPlayersPage },
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

    const teamsCarouselLeft = document.getElementById('teamsCarouselLeftBtn');
    const teamsCarouselRight = document.getElementById('teamsCarouselRightBtn');
    if (teamsCarouselLeft) teamsCarouselLeft.addEventListener('click', () => scrollTeamsCarousel('left'));
    if (teamsCarouselRight) teamsCarouselRight.addEventListener('click', () => scrollTeamsCarousel('right'));

    const navTeamsDropdown = document.getElementById('navTeamsDropdown');
    const navTeamsTrigger = document.getElementById('navTeamsTrigger');
    if (navTeamsDropdown && navTeamsTrigger) {
        navTeamsTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = navTeamsDropdown.classList.toggle('is-open');
            navTeamsTrigger.setAttribute('aria-expanded', isOpen);
        });
        navTeamsDropdown.querySelectorAll('.nav-dropdown-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navTeamsDropdown.classList.remove('is-open');
                navTeamsTrigger.setAttribute('aria-expanded', 'false');
                if (item.dataset.nav === 'scrims') showScrimsPage();
                else showTeamsPage();
            });
        });
    }
    document.addEventListener('click', (e) => {
        if (e.target.closest('.nav-dropdown')) return;
        const d = document.getElementById('navTeamsDropdown');
        if (d) {
            d.classList.remove('is-open');
            const t = document.getElementById('navTeamsTrigger');
            if (t) t.setAttribute('aria-expanded', 'false');
        }
    });

    const playerSearch = document.getElementById('playerSearch');
    if (playerSearch) playerSearch.addEventListener('input', filterRosterTable);

    document.querySelectorAll('.roster-table .sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            if (column) sortRosterTable(column);
        });
    });
    document.querySelectorAll('.teams-roster-table .sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            if (column) sortTeamsTable(column);
        });
    });

    const teamSearch = document.getElementById('teamSearch');
    if (teamSearch) teamSearch.addEventListener('input', filterTeamsTable);

    const teamsScrimOnlyToggle = document.getElementById('teamsScrimOnlyToggle');
    if (teamsScrimOnlyToggle) teamsScrimOnlyToggle.addEventListener('change', () => {
        state.teamsScrimVsScrimOnly = teamsScrimOnlyToggle.checked;
        loadTeamsPage();
    });

    const teamLookupBtn = document.getElementById('teamLookupBtn');
    if (teamLookupBtn) teamLookupBtn.addEventListener('click', handleTeamLookup);

    const recordsSearchForm = document.getElementById('recordsSearchForm');
    const recordsPlayerSearchInput = document.getElementById('recordsPlayerSearch');
    if (recordsSearchForm) {
        recordsSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = recordsPlayerSearchInput || document.getElementById('recordsPlayerSearch');
            const name = input?.value?.trim();
            if (name && typeof window.showPlayerProfile === 'function') window.showPlayerProfile(name);
            if (input) input.value = '';
        });
    }
    if (recordsPlayerSearchInput) {
        createPlayerAutocomplete(recordsPlayerSearchInput, () => (state.statsProcessor?.getPlayerStats(1) || []).map(p => p.name), {
            onSelect(name) {
                if (typeof window.showPlayerProfile === 'function') window.showPlayerProfile(name);
                recordsPlayerSearchInput.value = '';
            }
        });
    }

    const playerSearchInput = document.getElementById('playerSearch');
    if (playerSearchInput) {
        createPlayerAutocomplete(playerSearchInput, () => {
            const roster = state.rosterPlayers || [];
            if (roster.length) return roster.map(p => p.name);
            return (state.statsProcessor?.getPlayerStats(1) || []).map(p => p.name);
        }, {
            onSelect() {
                filterRosterTable();
            }
        });
    }

    const opponentSelectInput = document.getElementById('opponentSelect');
    if (opponentSelectInput) {
        createPlayerAutocomplete(opponentSelectInput, () => {
            const list = (state.statsProcessor?.getPlayerStats(1) || []).map(p => p.name);
            const cur = state.currentPlayerName;
            if (!cur) return list;
            return list.filter(n => n.toLowerCase() !== cur.toLowerCase());
        });
    }
    const teamOpponentSelect = document.getElementById('teamOpponentSelect');
    if (teamOpponentSelect) {
        createPlayerAutocomplete(teamOpponentSelect, () => {
            const list = (state.statsProcessor?.getPlayerStats(1) || []).map(p => p.name);
            const teamName = state.currentTeamName;
            if (!teamName) return list;
            const defs = state.statsProcessor?.constructor.getScrimTeamDefinitions() || [];
            const teamDef = defs.find(t => t.name === teamName);
            const onTeam = new Set((teamDef?.players || []).map(p => p.toLowerCase()));
            return list.filter(n => !onTeam.has(n.toLowerCase()));
        });
    }

    const gameLogFilterBtn = document.getElementById('gameLogFilterBtn');
    const gameLogFilterPanel = document.getElementById('gameLogFilterPanel');
    if (gameLogFilterBtn && gameLogFilterPanel) {
        gameLogFilterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = gameLogFilterPanel.hidden;
            gameLogFilterPanel.hidden = !isOpen;
            gameLogFilterBtn.classList.toggle('active', !isOpen);
        });
        gameLogFilterPanel.addEventListener('click', (e) => e.stopPropagation());
    }
    document.addEventListener('click', () => {
        if (gameLogFilterPanel && !gameLogFilterPanel.hidden) {
            gameLogFilterPanel.hidden = true;
            if (gameLogFilterBtn) gameLogFilterBtn.classList.remove('active');
        }
    });

    const gameLogFilterPlayerInput = document.getElementById('gameLogFilterPlayer');
    if (gameLogFilterPlayerInput) {
        createPlayerAutocomplete(gameLogFilterPlayerInput, () => (state.statsProcessor?.getPlayerStats(1) || []).map(p => p.name), {
            onSelect(name) {
                state.gameLogFilterPlayer = name;
                state.gameLogCurrentPage = 1;
                loadGameLog();
            }
        });
    }
    const gameLogFilterRoleSelect = document.getElementById('gameLogFilterRole');
    if (gameLogFilterRoleSelect) {
        gameLogFilterRoleSelect.addEventListener('change', () => {
            state.gameLogFilterRole = gameLogFilterRoleSelect.value;
            if (gameLogFilterPlayerInput) state.gameLogFilterPlayer = (gameLogFilterPlayerInput.value || '').trim() || null;
            state.gameLogCurrentPage = 1;
            loadGameLog();
        });
    }
    const gameLogFilterScrimTeamSelect = document.getElementById('gameLogFilterScrimTeam');
    if (gameLogFilterScrimTeamSelect) {
        gameLogFilterScrimTeamSelect.addEventListener('change', () => {
            state.gameLogFilterScrimTeam = gameLogFilterScrimTeamSelect.value || null;
            if (gameLogFilterPlayerInput) state.gameLogFilterPlayer = (gameLogFilterPlayerInput.value || '').trim() || null;
            state.gameLogCurrentPage = 1;
            loadGameLog();
        });
    }
    const gameLogFilterClearBtn = document.getElementById('gameLogFilterClear');
    if (gameLogFilterClearBtn) {
        gameLogFilterClearBtn.addEventListener('click', () => {
            state.gameLogFilterPlayer = null;
            state.gameLogFilterRole = 'any';
            state.gameLogFilterScrimTeam = null;
            state.gameLogCurrentPage = 1;
            const pi = document.getElementById('gameLogFilterPlayer');
            if (pi) pi.value = '';
            const rs = document.getElementById('gameLogFilterRole');
            if (rs) rs.value = 'any';
            const ts = document.getElementById('gameLogFilterScrimTeam');
            if (ts) ts.value = '';
            loadGameLog();
            if (gameLogFilterPanel) gameLogFilterPanel.hidden = true;
            if (gameLogFilterBtn) gameLogFilterBtn.classList.remove('active');
        });
    }

    window.showPlayerProfile = showPlayerProfile;
    window.goBackHome = goBackHome;
    window.showPlayersPage = showPlayersPage;
    window.showGameLogPage = showGameLogPage;
    window.showRecordsPage = showRecordsPage;
    window.showTeamsPage = showTeamsPage;
    window.showScrimsPage = showScrimsPage;
    window.showTeamProfile = showTeamProfile;
    window.showRecordsCategory = showRecordsCategory;
    window.toggleRecordsNewsExpanded = toggleRecordsNewsExpanded;

    const recordsContainer = document.getElementById('recordsPage');
    if (recordsContainer) {
        recordsContainer.addEventListener('click', (e) => {
            const categoryLink = e.target.closest('.record-category-link');
            const backLink = e.target.closest('.records-back-link');
            if (categoryLink) {
                e.preventDefault();
                showRecordsCategory(categoryLink.dataset.category);
            } else if (backLink) {
                e.preventDefault();
                showRecordsCategory('home');
            }
        });
    }

    updateActiveNavLink(null);

    updateLastUpdated();
});
