/**
 * Navigation: page switching (home, players, game log, profile) and active nav link.
 */

import { state } from '../state/store.js';
import { loadGameLog } from './game-log.js';
import { loadPlayersPage } from './players.js';
import { loadRecordsPage } from './records.js';
import { loadTeamsPage } from './teams.js';
import { loadScrimsPage } from './scrims.js';
import { loadPlayerProfile } from './profile.js';
import { populateMonthDropdown } from '../utils/month-selector.js';
import { showOnlyPage } from '../utils/dom.js';

export function updateActiveNavLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    if (activeLink) activeLink.classList.add('active');
}

function clearLookupResult() {
    const lookupResult = document.getElementById('opponentLookupResult');
    if (lookupResult) {
        lookupResult.classList.add('hidden');
        lookupResult.innerHTML = '';
    }
}

export function goBackHome() {
    const pages = document.getElementById('homePage');
    if (!pages) return;
    showOnlyPage('homePage', 'grid');
    clearLookupResult();
    updateActiveNavLink(null);
    state.currentPlayerName = '';
}

export function showPlayersPage() {
    if (!document.getElementById('homePage') || !document.getElementById('playersPage')) return;
    showOnlyPage('playersPage');
    if (state.rosterPeriod === 'monthly') {
        if (state.rosterSelectedMonth === null || state.rosterSelectedYear === null) {
            const now = new Date();
            state.rosterSelectedMonth = now.getMonth();
            state.rosterSelectedYear = now.getFullYear();
        }
        populateMonthDropdown('rosterMonthSelect', state.rosterSelectedMonth, state.rosterSelectedYear);
    }
    loadPlayersPage();
    updateActiveNavLink(document.querySelector('.nav-link[onclick*="showPlayersPage"]'));
    window.scrollTo(0, 0);
}

export function showGameLogPage() {
    if (!document.getElementById('gameLogPage')) return;
    showOnlyPage('gameLogPage');
    state.gameLogCurrentPage = 1;
    loadGameLog();
    updateActiveNavLink(document.querySelector('.nav-link[onclick*="showGameLogPage"]'));
    window.scrollTo(0, 0);
}

export function showRecordsPage() {
    if (!document.getElementById('recordsPage')) return;
    state.recordsView = 'home';
    state.recordsNewsExpanded = false;
    showOnlyPage('recordsPage');
    loadRecordsPage();
    updateActiveNavLink(document.querySelector('.nav-link[onclick*="showRecordsPage"]'));
    window.scrollTo(0, 0);
}

export function showTeamsPage() {
    if (!document.getElementById('teamsPage')) return;
    showOnlyPage('teamsPage');
    const toggle = document.getElementById('teamsScrimOnlyToggle');
    if (toggle) toggle.checked = !!state.teamsScrimVsScrimOnly;
    loadTeamsPage();
    updateActiveNavLink(document.getElementById('navTeamsTrigger'));
    window.scrollTo(0, 0);
}

export function showScrimsPage() {
    if (!document.getElementById('scrimsPage')) return;
    showOnlyPage('scrimsPage');
    loadScrimsPage();
    updateActiveNavLink(document.getElementById('navTeamsTrigger'));
    window.scrollTo(0, 0);
}

export function showPlayerProfile(playerName) {
    if (!document.getElementById('playerProfilePage')) return;
    showOnlyPage('playerProfilePage');
    updateActiveNavLink(null);
    loadPlayerProfile(playerName);
    window.scrollTo(0, 0);
}
