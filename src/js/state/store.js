/**
 * Shared application state.
 * Single source of truth for processor, period filters, pagination, and UI state.
 */

export const state = {
    statsProcessor: null,

    currentPeriod: 'monthly',
    profilePeriod: 'monthly',
    synergyPeriod: 'alltime',
    matchupsPeriod: 'alltime',
    rosterPeriod: 'alltime',

    profileSelectedMonth: null,
    profileSelectedYear: null,
    synergySelectedMonth: null,
    synergySelectedYear: null,
    matchupsSelectedMonth: null,
    matchupsSelectedYear: null,
    rosterSelectedMonth: null,
    rosterSelectedYear: null,

    gameLogCurrentPage: 1,
    gameLogRowsPerPage: 50,

    rosterPlayers: [],
    rosterSortColumn: null,
    rosterSortDirection: 'asc',

    lookupMode: 'against',

    playerAccolades: new Map(),

    currentPlayerName: '',

    carouselIndex: 0
};
