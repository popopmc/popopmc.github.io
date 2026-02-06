/**
 * Month dropdown helpers: get available months from games, populate a <select>.
 */

import { state } from '../state/store.js';

export function getAvailableMonths() {
    if (!state.statsProcessor || !state.statsProcessor.games) return [];
    const monthMap = new Map();
    state.statsProcessor.games.forEach(game => {
        const gameDate = new Date(game.timestamp);
        const year = gameDate.getFullYear();
        const month = gameDate.getMonth();
        const monthKey = `${year}-${month}`;
        if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, {
                year,
                month,
                label: gameDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            });
        }
    });
    return Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
}

export function populateMonthDropdown(selectId, currentMonth, currentYear) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const months = getAvailableMonths();
    select.innerHTML = months.map(m =>
        `<option value="${m.year}-${m.month}" ${m.year === currentYear && m.month === currentMonth ? 'selected' : ''}>${m.label}</option>`
    ).join('');
}
