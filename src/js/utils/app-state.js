// Application State Management

// Global state
const AppState = {
    statsProcessor: null,
    currentPeriod: 'monthly', // 'monthly' or 'alltime'
    synergyPeriod: 'alltime',
    matchupsPeriod: 'alltime',
    synergySelectedMonth: null,
    synergySelectedYear: null,
    matchupsSelectedMonth: null,
    matchupsSelectedYear: null,
    rosterPlayers: [],
    rosterSortColumn: null,
    rosterSortDirection: 'asc',
    lookupMode: 'against',
    currentPlayerName: ''
};

// Initialize stats processor
AppState.init = function() {
    this.statsProcessor = new StatsProcessor();
};
