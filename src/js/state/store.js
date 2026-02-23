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
    teamsScrimVsScrimOnly: true,

    profileSelectedMonth: null,
    profileSelectedYear: null,
    synergySelectedMonth: null,
    synergySelectedYear: null,
    matchupsSelectedMonth: null,
    matchupsSelectedYear: null,
    rosterSelectedMonth: null,
    rosterSelectedYear: null,
    teamsSelectedMonth: null,
    teamsSelectedYear: null,

    gameLogCurrentPage: 1,
    gameLogRowsPerPage: 50,
    gameLogFilterPlayer: null,
    gameLogFilterRole: 'any',
    gameLogFilterScrimTeam: null,

    rosterPlayers: [],
    rosterSortColumn: null,
    rosterSortDirection: 'asc',
    rosterTeams: [],
    teamsSortColumn: null,
    teamsSortDirection: 'asc',

    teamsCarouselIndex: 0,
    currentTeamName: '',

    lookupMode: 'against',
    /** When lookup is "against": 'any' | 'striker' | 'gk' */
    lookupAgainstRole: 'any',
    /** When lookup is "against": my role filter 'any' | 'striker' | 'gk' */
    lookupPlayerRole: 'any',

    playerAccolades: new Map(),

    currentPlayerName: '',

    carouselIndex: 0,

    /** Records sub-view: 'home' (category list) | 'activity' | 'winrate' | 'other' */
    recordsView: 'home',
    /** When true, Bonk News shows full log; when false, last 5 only */
    recordsNewsExpanded: false
};
