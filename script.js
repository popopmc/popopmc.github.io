// Stats Dashboard for Game Scores
let statsProcessor = new StatsProcessor();
let currentView = 'players'; // 'players', 'teammates', 'plusminus'

// Show loading state
function showLoading() {
    const container = document.getElementById('statsContainer');
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading statistics...</p>
            </div>
        `;
    }
}

// Load and process CSV data
async function loadData() {
    showLoading();
    
    try {
        // Add cache-busting parameter to force fresh data
        const cacheBuster = '?v=' + new Date().getTime();
        const response = await fetch('scores_processed.csv' + cacheBuster, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('CSV file is empty');
        }
        
        statsProcessor.parseCSV(csvText);
        statsProcessor.calculateStats();
        
        displaySummary();
        displayStats();
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading data:', error);
        const container = document.getElementById('statsContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-primary);">
                    <h2 style="color: var(--danger); margin-bottom: 1rem;">Error Loading Data</h2>
                    <p>Could not load scores_processed.csv. Make sure the file is in the same directory.</p>
                    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">${error.message}</p>
                    <button onclick="loadData()" class="refresh-btn" style="margin-top: 1rem;">🔄 Try Again</button>
                </div>
            `;
        }
    }
}

// Display summary cards
function displaySummary() {
    const container = document.getElementById('summaryCards');
    if (!container) return;
    
    const totalGames = statsProcessor.games.length;
    const players = statsProcessor.getPlayerStats(1);
    const totalPlayers = players.length;
    const totalTeammatePairs = statsProcessor.getTeammateStats(2).length;
    
    // Calculate total goals
    let totalGoals = 0;
    statsProcessor.games.forEach(game => {
        totalGoals += game.team1.score + game.team2.score;
    });
    
    container.innerHTML = `
        <div class="summary-grid">
            <div class="summary-card">
                <div class="summary-icon">🎮</div>
                <div class="summary-content">
                    <h3>Total Games</h3>
                    <p class="summary-value">${totalGames}</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">👥</div>
                <div class="summary-content">
                    <h3>Total Players</h3>
                    <p class="summary-value">${totalPlayers}</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">🤝</div>
                <div class="summary-content">
                    <h3>Teammate Pairs</h3>
                    <p class="summary-value">${totalTeammatePairs}</p>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">⚽</div>
                <div class="summary-content">
                    <h3>Total Goals</h3>
                    <p class="summary-value">${totalGoals}</p>
                </div>
            </div>
        </div>
    `;
}

// Display statistics based on current view
function displayStats() {
    const container = document.getElementById('statsContainer');
    if (!container) return;

    switch (currentView) {
        case 'players':
            displayPlayerStats(container);
            break;
        case 'teammates':
            displayTeammateStats(container);
            break;
        case 'plusminus':
            displayPlusMinusStats(container);
            break;
    }
}

// Display individual player statistics
function displayPlayerStats(container) {
    const players = statsProcessor.getPlayerStats(1);
    const totalGames = statsProcessor.games.length;
    
    container.innerHTML = `
        <div class="stats-header">
            <h2>Player Statistics</h2>
            <p class="subtitle">Total Games: ${totalGames}</p>
        </div>
        <div class="stats-table-container">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Wins</th>
                        <th>Losses</th>
                        <th>Win Rate</th>
                        <th>Games</th>
                        <th>Goals For</th>
                        <th>Goals Against</th>
                        <th>+/-</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map((player, index) => `
                        <tr>
                            <td class="rank">${index + 1}</td>
                            <td class="player-name">${player.name}</td>
                            <td class="stat-value positive">${player.wins}</td>
                            <td class="stat-value negative">${player.losses}</td>
                            <td class="stat-value ${parseFloat(player.winRate) >= 50 ? 'positive' : 'negative'}">
                                ${player.winRate}%
                            </td>
                            <td>${player.games}</td>
                            <td>${player.goalsFor}</td>
                            <td>${player.goalsAgainst}</td>
                            <td class="stat-value ${player.plusMinus >= 0 ? 'positive' : 'negative'}">
                                ${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display teammate combination statistics
function displayTeammateStats(container) {
    const teammates = statsProcessor.getTeammateStats(2); // Minimum 2 games together
    
    container.innerHTML = `
        <div class="stats-header">
            <h2>Teammate Combinations</h2>
            <p class="subtitle">Minimum 2 games played together</p>
        </div>
        <div class="stats-table-container">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Teammates</th>
                        <th>Wins</th>
                        <th>Losses</th>
                        <th>Win Rate</th>
                        <th>Games</th>
                    </tr>
                </thead>
                <tbody>
                    ${teammates.map((team, index) => `
                        <tr>
                            <td class="rank">${index + 1}</td>
                            <td class="player-name">${team.pair}</td>
                            <td class="stat-value positive">${team.wins}</td>
                            <td class="stat-value negative">${team.losses}</td>
                            <td class="stat-value ${parseFloat(team.winRate) >= 50 ? 'positive' : 'negative'}">
                                ${team.winRate}%
                            </td>
                            <td>${team.games}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Display plus/minus statistics
function displayPlusMinusStats(container) {
    const players = statsProcessor.getPlusMinusLeaders(1);
    const totalGames = statsProcessor.games.length;
    
    container.innerHTML = `
        <div class="stats-header">
            <h2>Plus/Minus Leaders</h2>
            <p class="subtitle">Goal differential (Goals For - Goals Against)</p>
        </div>
        <div class="stats-table-container">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>+/-</th>
                        <th>Goals For</th>
                        <th>Goals Against</th>
                        <th>Games</th>
                        <th>Win Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map((player, index) => `
                        <tr>
                            <td class="rank">${index + 1}</td>
                            <td class="player-name">${player.name}</td>
                            <td class="stat-value ${player.plusMinus >= 0 ? 'positive' : 'negative'}">
                                ${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}
                            </td>
                            <td>${player.goalsFor}</td>
                            <td>${player.goalsAgainst}</td>
                            <td>${player.games}</td>
                            <td class="stat-value ${parseFloat(player.winRate) >= 50 ? 'positive' : 'negative'}">
                                ${player.winRate}%
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Switch between views
function switchView(view) {
    currentView = view;
    displayStats();
    
    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
}

// Update last updated time
function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent = timeString;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Add event listeners for view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });
    
    // Refresh button
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
    
    // Set initial active button
    const initialBtn = document.querySelector('[data-view="players"]');
    if (initialBtn) {
        initialBtn.classList.add('active');
    }
    
    updateLastUpdated();
});
