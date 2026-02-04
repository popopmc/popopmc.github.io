// Stats Dashboard for Game Scores
// Initialize stats processor (will be set up after DOM loads)
let statsProcessor = null;
let currentPeriod = 'monthly'; // 'monthly' or 'alltime'
let profilePeriod = 'monthly'; // 'monthly' or 'alltime' for profile banner
let synergyPeriod = 'alltime'; // 'monthly' or 'alltime' for synergy section
let matchupsPeriod = 'alltime'; // 'monthly' or 'alltime' for matchups section
let rosterPeriod = 'alltime'; // 'monthly' or 'alltime' for roster section
let profileSelectedMonth = null;
let profileSelectedYear = null;
let synergySelectedMonth = null;
let synergySelectedYear = null;
let matchupsSelectedMonth = null;
let matchupsSelectedYear = null;
let rosterSelectedMonth = null;
let rosterSelectedYear = null;

// Game log pagination
let gameLogCurrentPage = 1;
let gameLogRowsPerPage = 50;

// Roster table sorting state
let rosterPlayers = []; // Store current player data
let rosterSortColumn = null; // Current sort column
let rosterSortDirection = 'asc'; // 'asc' or 'desc'

// Matchups lookup mode
let lookupMode = 'against'; // 'with' or 'against'

// Tournament accolades data
let playerAccolades = new Map(); // Map of player name -> array of accolades

// Profile picture functions are imported from profile-pictures.js
// No need to redefine them here

// Load tournament accolades
async function loadAccolades() {
    try {
        const cacheBuster = '?v=' + new Date().getTime();
        const response = await fetch('data/tourney_accolades.csv' + cacheBuster, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!response.ok) {
            console.warn('Could not load tourney_accolades.csv');
            return;
        }
        
        const csvText = await response.text();
        if (!csvText || csvText.trim().length === 0) {
            console.warn('tourney_accolades.csv is empty');
            return;
        }
        
        // Parse CSV
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return;
        
        // First line is headers (award names in first column, tournament names in other columns)
        const headers = lines[0].split(',');
        const tournamentNames = headers.slice(1); // Skip first empty column
        
        // Clear existing accolades
        playerAccolades.clear();
        
        // Process each award row
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const awardName = values[0].trim();
            
            if (!awardName) continue;
            
            // Process each tournament column
            for (let j = 1; j < values.length && j - 1 < tournamentNames.length; j++) {
                const playerName = values[j].trim();
                if (playerName) {
                    // Normalize player name (lowercase for consistency)
                    const normalizedName = playerName.toLowerCase();
                    
                    if (!playerAccolades.has(normalizedName)) {
                        playerAccolades.set(normalizedName, []);
                    }
                    
                    // Add accolade with tournament info
                    const tournamentNum = j; // Tournament number (1-indexed)
                    playerAccolades.get(normalizedName).push({
                        award: awardName,
                        tournament: tournamentNum
                    });
                }
            }
        }
        
        console.log('Loaded tournament accolades for', playerAccolades.size, 'players');
    } catch (error) {
        console.error('Error loading accolades:', error);
    }
}

// Show loading state
function showLoading() {
    const container = document.getElementById('statsGrid');
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
        const fetchOptions = {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        };
        
        // Load both CSV files
        const [responseJan, responseFeb] = await Promise.all([
            fetch('data/scoresjan.csv' + cacheBuster, fetchOptions),
            fetch('data/scoresfeb.csv' + cacheBuster, fetchOptions)
        ]);
        
        if (!responseJan.ok) {
            throw new Error(`HTTP error loading scoresjan.csv! status: ${responseJan.status}`);
        }
        
        if (!responseFeb.ok) {
            throw new Error(`HTTP error loading scoresfeb.csv! status: ${responseFeb.status}`);
        }
        
        const csvTextJan = await responseJan.text();
        const csvTextFeb = await responseFeb.text();
        
        if (!csvTextJan || csvTextJan.trim().length === 0) {
            throw new Error('scoresjan.csv file is empty');
        }
        
        if (!csvTextFeb || csvTextFeb.trim().length === 0) {
            throw new Error('scoresfeb.csv file is empty');
        }
        
        // Parse both CSV files (first one clears games array, second one appends)
        statsProcessor.parseCSV(csvTextJan, false);
        statsProcessor.parseCSV(csvTextFeb, true);
        statsProcessor.calculateStats();
        
        // Load tournament accolades
        await loadAccolades();
        
        displayStats();
        updateDateDisplay();
        updateMoreStats();
        updateLastUpdated();
    } catch (error) {
        console.error('Error loading data:', error);
        const container = document.getElementById('statsGrid');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-primary);">
                    <h2 style="color: #ef4444; margin-bottom: 1rem;">Error Loading Data</h2>
                    <p>Could not load data files (scoresjan.csv and scoresfeb.csv). Make sure the files exist.</p>
                    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">${error.message}</p>
                    <button onclick="loadData()" class="refresh-btn" style="margin-top: 1rem;">🔄 Try Again</button>
                </div>
            `;
        }
    }
}

// Update date display
function updateDateDisplay() {
    const dateEl = document.getElementById('dateDisplay');
    if (dateEl) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { 
            month: '2-digit', 
            day: '2-digit', 
            year: 'numeric' 
        });
        dateEl.textContent = dateStr;
    }
}

// Display statistics in NBA stats format
function displayStats() {
    const container = document.getElementById('statsGrid');
    if (!container) return;

    const isMonthly = currentPeriod === 'monthly';
    const minGames = isMonthly ? 10 : 50; // 10 games for monthly, 50 for all-time
    
    // Get leaders for each category
    const winRateLeaders = statsProcessor.getLeadersByCategory('winrate', isMonthly, minGames);
    const winsLeaders = statsProcessor.getLeadersByCategory('wins', isMonthly, minGames);
    const lossesLeaders = statsProcessor.getLeadersByCategory('losses', isMonthly, minGames);
    const plusMinusLeaders = statsProcessor.getLeadersByCategory('plusminus', isMonthly, minGames);

    container.innerHTML = `
        <div class="stat-category">
            <h3 class="stat-category-title">Win Rate</h3>
            <ul class="stat-list">
                ${winRateLeaders.map((player, index) => `
                    <li class="stat-item">
                        <span>
                            <span class="stat-rank">${index + 1}.</span>
                            ${getPlayerNameWithIcon(player.name, 36, true)}
                        </span>
                        <span class="stat-value">${player.winRate}%</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div class="stat-category">
            <h3 class="stat-category-title">SUPERTEAM MERCHANTS</h3>
            <ul class="stat-list">
                ${winsLeaders.map((player, index) => `
                    <li class="stat-item">
                        <span>
                            <span class="stat-rank">${index + 1}.</span>
                            ${getPlayerNameWithIcon(player.name, 36, true)}
                        </span>
                        <span class="stat-value">${player.wins}</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div class="stat-category">
            <h3 class="stat-category-title">MENTALITY MONSTERS</h3>
            <ul class="stat-list">
                ${lossesLeaders.map((player, index) => `
                    <li class="stat-item">
                        <span>
                            <span class="stat-rank">${index + 1}.</span>
                            ${getPlayerNameWithIcon(player.name, 36, true)}
                        </span>
                        <span class="stat-value">${player.losses}</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div class="stat-category">
            <h3 class="stat-category-title">Plus/Minus</h3>
            <ul class="stat-list">
                ${plusMinusLeaders.map((player, index) => `
                    <li class="stat-item">
                        <span>
                            <span class="stat-rank">${index + 1}.</span>
                            ${getPlayerNameWithIcon(player.name, 36, true)}
                        </span>
                        <span class="stat-value">${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

// Update more stats sidebar
function updateMoreStats() {
    const container = document.getElementById('moreStats');
    if (!container) return;

    const isMonthly = currentPeriod === 'monthly';
    const minGames = isMonthly ? 10 : 50; // 10 games for monthly, 50 for all-time
    const stats = isMonthly ? statsProcessor.getMonthlyPlayerStats(minGames) : statsProcessor.getPlayerStats(minGames);
    
    // Get top players by total games
    const topPlayers = [...stats]
        .sort((a, b) => b.games - a.games)
        .slice(0, 10);

    container.innerHTML = `
        <div class="more-stat-item">
            <div class="more-stat-label">TOTAL GAMES</div>
            ${topPlayers.map(player => `
                <div class="more-stat-item">
                    <div class="more-stat-value">${player.name} - ${player.games}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// Switch between monthly and all-time
function switchPeriod(period) {
    currentPeriod = period;
    displayStats();
    updateMoreStats();
    
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-period="${period}"]`).classList.add('active');
}

// Show player profile page
function showPlayerProfile(playerName) {
    const homePage = document.getElementById('homePage');
    const playersPage = document.getElementById('playersPage');
    const gameLogPage = document.getElementById('gameLogPage');
    const profilePage = document.getElementById('playerProfilePage');
    
    if (!profilePage) return;
    
    // Hide all other pages, show profile page
    if (homePage) homePage.style.display = 'none';
    if (playersPage) playersPage.style.display = 'none';
    if (gameLogPage) gameLogPage.style.display = 'none';
    profilePage.style.display = 'block';
    
    // Clear active nav link (profile is not in nav)
    updateActiveNavLink(null);
    
    // Load player data
    loadPlayerProfile(playerName);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Store current player name for lookup
let currentPlayerName = '';

// Update active nav link
function updateActiveNavLink(activeLink) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Go back to home page
function goBackHome() {
    const homePage = document.getElementById('homePage');
    const profilePage = document.getElementById('playerProfilePage');
    const playersPage = document.getElementById('playersPage');
    const gameLogPage = document.getElementById('gameLogPage');
    
    if (!homePage) return;
    
    homePage.style.display = 'grid';
    if (profilePage) profilePage.style.display = 'none';
    if (playersPage) playersPage.style.display = 'none';
    if (gameLogPage) gameLogPage.style.display = 'none';
    
    // Clear lookup result
    const lookupResult = document.getElementById('lookupResult');
    if (lookupResult) {
        lookupResult.classList.add('hidden');
        lookupResult.innerHTML = '';
    }
    
    // Update active nav link
    const homeLink = document.querySelector('.nav-link[onclick*="goBackHome"]');
    updateActiveNavLink(homeLink);
    
    currentPlayerName = '';
}

// Show players page
function showPlayersPage() {
    const homePage = document.getElementById('homePage');
    const profilePage = document.getElementById('playerProfilePage');
    const gameLogPage = document.getElementById('gameLogPage');
    const playersPage = document.getElementById('playersPage');
    
    if (!homePage || !playersPage) return;
    
    homePage.style.display = 'none';
    if (profilePage) profilePage.style.display = 'none';
    if (gameLogPage) gameLogPage.style.display = 'none';
    playersPage.style.display = 'block';
    
    // Populate month dropdown if monthly is selected
    if (rosterPeriod === 'monthly') {
        if (rosterSelectedMonth === null || rosterSelectedYear === null) {
            const now = new Date();
            rosterSelectedMonth = now.getMonth();
            rosterSelectedYear = now.getFullYear();
        }
        populateMonthDropdown('rosterMonthSelect', rosterSelectedMonth, rosterSelectedYear);
    }
    
    // Load players data
    loadPlayersPage();
    
    // Update active nav link
    const playersLink = document.querySelector('.nav-link[onclick*="showPlayersPage"]');
    updateActiveNavLink(playersLink);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Show game log page
function showGameLogPage() {
    const homePage = document.getElementById('homePage');
    const playersPage = document.getElementById('playersPage');
    const profilePage = document.getElementById('playerProfilePage');
    const gameLogPage = document.getElementById('gameLogPage');
    
    if (!gameLogPage) return;
    
    // Hide all other pages, show game log page
    if (homePage) homePage.style.display = 'none';
    if (playersPage) playersPage.style.display = 'none';
    if (profilePage) profilePage.style.display = 'none';
    gameLogPage.style.display = 'block';
    
    // Reset to first page when opening game log
    gameLogCurrentPage = 1;
    
    // Load game log data
    loadGameLog();
    
    // Update active nav link
    const gameLogLink = document.querySelector('.nav-link[onclick*="showGameLogPage"]');
    updateActiveNavLink(gameLogLink);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Load game log
function loadGameLog() {
    const gameLogContent = document.getElementById('gameLogContent');
    if (!gameLogContent) return;
    
    const allGames = statsProcessor.getAllGames();
    
    if (allGames.length === 0) {
        gameLogContent.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No games found</p>';
        return;
    }
    
    // Sort games by timestamp (newest first)
    const sortedGames = [...allGames].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Calculate pagination
    const totalPages = Math.ceil(sortedGames.length / gameLogRowsPerPage);
    const startIndex = (gameLogCurrentPage - 1) * gameLogRowsPerPage;
    const endIndex = startIndex + gameLogRowsPerPage;
    const gamesForPage = sortedGames.slice(startIndex, endIndex);
    
    // Group games by date for display
    const gamesByDate = {};
    gamesForPage.forEach(game => {
        const date = new Date(game.timestamp);
        const dateKey = date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        
        if (!gamesByDate[dateKey]) {
            gamesByDate[dateKey] = [];
        }
        gamesByDate[dateKey].push(game);
    });
    
    // Generate HTML for each date group
    const gamesHtml = Object.keys(gamesByDate).map(dateKey => {
        const dateGames = gamesByDate[dateKey];
        return `
            <div class="game-log-date-section">
                <h2 class="game-log-date-header">${dateKey}</h2>
                <table class="game-log-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Keeper</th>
                            <th>Striker</th>
                            <th>Striker</th>
                            <th>Score</th>
                            <th>Score</th>
                            <th>Keeper</th>
                            <th>Striker</th>
                            <th>Striker</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dateGames.map(game => {
                            const gameDate = new Date(game.timestamp);
                            const timeStr = gameDate.toLocaleTimeString(undefined, { 
                                hour: '2-digit', 
                                minute: '2-digit'
                            });
                            const team1Won = game.team1.score > game.team2.score;
                            const team2Won = game.team2.score > game.team1.score;
                            
                            const team1Score = game.team1.score;
                            const team2Score = game.team2.score;
                            const team1ScoreClass = team1Score > team2Score ? 'score-higher' : team1Score < team2Score ? 'score-lower' : 'score-tie';
                            const team2ScoreClass = team2Score > team1Score ? 'score-higher' : team2Score < team1Score ? 'score-lower' : 'score-tie';
                            
                            // First player is keeper, others are strikers
                            // Ensure we have exactly 3 players per team
                            const team1Players = game.team1.players || [];
                            const team2Players = game.team2.players || [];
                            
                            const team1Keeper = team1Players[0] || '';
                            const team1Striker1 = team1Players[1] || '';
                            const team1Striker2 = team1Players[2] || '';
                            const team2Keeper = team2Players[0] || '';
                            const team2Striker1 = team2Players[1] || '';
                            const team2Striker2 = team2Players[2] || '';
                            
                            return `
                                <tr>
                                    <td class="game-time">${timeStr}</td>
                                    <td class="game-player">${team1Keeper ? getPlayerNameWithIcon(team1Keeper, 20, true) : '&nbsp;'}</td>
                                    <td class="game-player">${team1Striker1 ? getPlayerNameWithIcon(team1Striker1, 20, true) : '&nbsp;'}</td>
                                    <td class="game-player">${team1Striker2 ? getPlayerNameWithIcon(team1Striker2, 20, true) : '&nbsp;'}</td>
                                    <td class="game-score ${team1ScoreClass}">${team1Score}</td>
                                    <td class="game-score ${team2ScoreClass}">${team2Score}</td>
                                    <td class="game-player">${team2Keeper ? getPlayerNameWithIcon(team2Keeper, 20, true) : '&nbsp;'}</td>
                                    <td class="game-player">${team2Striker1 ? getPlayerNameWithIcon(team2Striker1, 20, true) : '&nbsp;'}</td>
                                    <td class="game-player">${team2Striker2 ? getPlayerNameWithIcon(team2Striker2, 20, true) : '&nbsp;'}</td>
                                    <td class="game-result">
                                        ${team1Won ? `<span class="result-win">Team 1 Wins</span>` : 
                                          team2Won ? `<span class="result-win">Team 2 Wins</span>` : 
                                          '<span class="result-tie">Tie</span>'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');
    
    // Generate pagination controls
    const paginationHtml = `
        <div class="game-log-pagination">
            <div class="pagination-info">
                Showing ${startIndex + 1}-${Math.min(endIndex, sortedGames.length)} of ${sortedGames.length} games
            </div>
            <div class="pagination-controls">
                <button class="pagination-btn" id="gameLogPrevBtn" ${gameLogCurrentPage === 1 ? 'disabled' : ''}>
                    ← Previous
                </button>
                <div class="pagination-pages">
                    ${Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                            // Show first page, last page, current page, and pages around current
                            return page === 1 || 
                                   page === totalPages || 
                                   (page >= gameLogCurrentPage - 2 && page <= gameLogCurrentPage + 2);
                        })
                        .map((page, index, array) => {
                            // Add ellipsis if there's a gap
                            const prevPage = array[index - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;
                            return `
                                ${showEllipsis ? '<span class="pagination-ellipsis">...</span>' : ''}
                                <button class="pagination-page-btn ${page === gameLogCurrentPage ? 'active' : ''}" 
                                        data-page="${page}">
                                    ${page}
                                </button>
                            `;
                        }).join('')}
                </div>
                <button class="pagination-btn" id="gameLogNextBtn" ${gameLogCurrentPage === totalPages ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        </div>
    `;
    
    gameLogContent.innerHTML = gamesHtml + paginationHtml;
    
    // Add event listeners for pagination
    const prevBtn = document.getElementById('gameLogPrevBtn');
    const nextBtn = document.getElementById('gameLogNextBtn');
    const pageBtns = document.querySelectorAll('.pagination-page-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (gameLogCurrentPage > 1) {
                gameLogCurrentPage--;
                loadGameLog();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (gameLogCurrentPage < totalPages) {
                gameLogCurrentPage++;
                loadGameLog();
            }
        });
    }
    
    pageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page !== gameLogCurrentPage) {
                gameLogCurrentPage = page;
                loadGameLog();
            }
        });
    });
}

// Load players page data
function loadPlayersPage() {
    let allPlayers;
    
    // Get players based on selected period
    if (rosterPeriod === 'monthly' && rosterSelectedMonth !== null && rosterSelectedYear !== null) {
        allPlayers = statsProcessor.getMonthlyPlayerStats(1).filter(player => {
            // Filter by selected month/year
            const playerGames = statsProcessor.games.filter(game => {
                const gameDate = new Date(game.timestamp);
                const gameMonth = gameDate.getMonth();
                const gameYear = gameDate.getFullYear();
                return gameMonth === rosterSelectedMonth && gameYear === rosterSelectedYear;
            });
            
            // Check if player played in this month
            return playerGames.some(game => 
                game.team1.players.includes(player.name) || 
                game.team2.players.includes(player.name)
            );
        });
        
        // Recalculate stats for the selected month
        allPlayers = allPlayers.map(player => {
            const playerGames = statsProcessor.games.filter(game => {
                const gameDate = new Date(game.timestamp);
                const gameMonth = gameDate.getMonth();
                const gameYear = gameDate.getFullYear();
                if (gameMonth !== rosterSelectedMonth || gameYear !== rosterSelectedYear) return false;
                
                return game.team1.players.includes(player.name) || game.team2.players.includes(player.name);
            });
            
            let wins = 0, losses = 0, ties = 0, goalsFor = 0, goalsAgainst = 0;
            
            playerGames.forEach(game => {
                const isTeam1 = game.team1.players.includes(player.name);
                const isTeam2 = game.team2.players.includes(player.name);
                
                if (isTeam1) {
                    goalsFor += game.team1.score;
                    goalsAgainst += game.team2.score;
                    if (game.team1.score > game.team2.score) wins++;
                    else if (game.team1.score < game.team2.score) losses++;
                    else ties++;
                } else if (isTeam2) {
                    goalsFor += game.team2.score;
                    goalsAgainst += game.team1.score;
                    if (game.team2.score > game.team1.score) wins++;
                    else if (game.team2.score < game.team1.score) losses++;
                    else ties++;
                }
            });
            
            const totalGames = wins + losses + ties;
            const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : 0;
            
            return {
                name: player.name,
                wins,
                losses,
                ties,
                games: totalGames,
                winRate: parseFloat(winRate),
                goalsFor,
                goalsAgainst,
                plusMinus: goalsFor - goalsAgainst
            };
        });
    } else {
        allPlayers = statsProcessor.getPlayerStats(1);
    }
    
    // Sort by games played (most active first)
    allPlayers.sort((a, b) => b.games - a.games);
    
    // Store players for sorting
    rosterPlayers = [...allPlayers];
    
    // Reset sorting state
    rosterSortColumn = 'games'; // Default sort by games
    rosterSortDirection = 'desc';
    
    // Reset carousel
    carouselIndex = 0;
    
    // Load carousel (always use all-time stats for carousel)
    const allTimePlayers = statsProcessor.getPlayerStats(1).sort((a, b) => b.games - a.games);
    loadPlayersCarousel(allTimePlayers);
    
    // Load roster table
    loadRosterTable(rosterPlayers);
    
    // Update sort indicators
    updateSortIndicators();
}

// Load players carousel
let carouselIndex = 0;
function loadPlayersCarousel(players) {
    const carousel = document.getElementById('playersCarousel');
    if (!carousel) return;
    
    carousel.innerHTML = players.map((player, index) => {
        const picturePath = getProfilePicturePath(player.name);
        // Use a static version number for cache-busting
        const cacheBuster = picturePath ? '?v=2' : '';
        const imageHtml = picturePath 
            ? `<img src="${picturePath}${cacheBuster}" alt="${player.name}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';">`
            : '';
        
        return `
        <div class="player-card" data-player-name="${player.name.replace(/"/g, '&quot;')}">
            <div class="player-card-image">
                ${imageHtml}
            </div>
            <div class="player-card-info">
                <div class="player-card-name">${player.name.toUpperCase()}</div>
                <div class="player-card-stats-bar">
                    <div class="player-stat-item">
                        <span class="stat-label">WINS</span>
                        <span class="stat-number">${player.wins}</span>
                    </div>
                    <div class="player-stat-item">
                        <span class="stat-label">LOSSES</span>
                        <span class="stat-number">${player.losses}</span>
                    </div>
                    <div class="player-stat-item">
                        <span class="stat-label">WIN RATE</span>
                        <span class="stat-number">${player.winRate}%</span>
                    </div>
                    <div class="player-stat-item">
                        <span class="stat-label">+/-</span>
                        <span class="stat-number">${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}</span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    // Add click event listeners to all player cards
    carousel.querySelectorAll('.player-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const playerName = card.getAttribute('data-player-name');
            if (playerName) {
                showPlayerProfile(playerName);
            }
        });
    });
    
    // Wait for DOM to update, then calculate position
    setTimeout(() => {
        updateCarouselPosition();
    }, 100);
}

// Update carousel position
function updateCarouselPosition() {
    const carousel = document.getElementById('playersCarousel');
    if (!carousel) return;
    
    // Calculate card width including gap
    const firstCard = carousel.querySelector('.player-card');
    if (!firstCard) return;
    
    const cardWidth = firstCard.offsetWidth;
    const gap = 24; // 1.5rem = 24px
    const totalCardWidth = cardWidth + gap;
    const offset = -carouselIndex * totalCardWidth;
    
    carousel.style.transform = `translateX(${offset}px)`;
    
    // Update button states
    const leftBtn = document.getElementById('carouselLeftBtn');
    const rightBtn = document.getElementById('carouselRightBtn');
    const totalCards = carousel.children.length;
    const cardsPerView = Math.floor((carousel.parentElement.offsetWidth - 120) / totalCardWidth); // Account for button space
    
    if (leftBtn) {
        leftBtn.disabled = carouselIndex === 0;
        leftBtn.style.opacity = carouselIndex === 0 ? '0.5' : '1';
        leftBtn.style.cursor = carouselIndex === 0 ? 'not-allowed' : 'pointer';
    }
    if (rightBtn) {
        const maxIndex = Math.max(0, totalCards - cardsPerView);
        rightBtn.disabled = carouselIndex >= maxIndex;
        rightBtn.style.opacity = carouselIndex >= maxIndex ? '0.5' : '1';
        rightBtn.style.cursor = carouselIndex >= maxIndex ? 'not-allowed' : 'pointer';
    }
}

// Carousel navigation
function scrollCarousel(direction) {
    const carousel = document.getElementById('playersCarousel');
    if (!carousel || carousel.children.length === 0) return;
    
    const totalCards = carousel.children.length;
    const firstCard = carousel.querySelector('.player-card');
    if (!firstCard) return;
    
    const cardWidth = firstCard.offsetWidth;
    const gap = 24;
    const containerWidth = carousel.parentElement.offsetWidth - 120; // Account for buttons
    const cardsPerView = Math.floor(containerWidth / (cardWidth + gap));
    const maxIndex = Math.max(0, totalCards - cardsPerView);
    
    if (direction === 'left') {
        if (carouselIndex > 0) {
            carouselIndex--;
            updateCarouselPosition();
        }
    } else {
        if (carouselIndex < maxIndex) {
            carouselIndex++;
            updateCarouselPosition();
        }
    }
}

// Load roster table
function loadRosterTable(players) {
    const tbody = document.getElementById('rosterTableBody');
    if (!tbody) return;
    
    // Use data attributes for click handling to avoid issues with special characters
    tbody.innerHTML = players.map(player => `
        <tr data-player-name="${player.name.replace(/"/g, '&quot;')}">
            <td class="player-cell">
                ${getPlayerNameWithIcon(player.name, 32, true)}
            </td>
            <td>${player.wins}</td>
            <td>${player.losses}</td>
            <td class="${parseFloat(player.winRate) >= 50 ? 'positive' : 'negative'}">${player.winRate}%</td>
            <td class="${player.plusMinus >= 0 ? 'positive' : 'negative'}">${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}</td>
            <td>${player.games}</td>
        </tr>
    `).join('');
    
    // Add click event listeners to rows
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', (e) => {
            // Don't navigate if clicking on a sortable header
            if (e.target.closest('.sortable')) return;
            
            const playerName = row.getAttribute('data-player-name');
            if (playerName) {
                showPlayerProfile(playerName);
            }
        });
    });
}

// Sort roster table
function sortRosterTable(column) {
    // Toggle direction if clicking the same column
    if (rosterSortColumn === column) {
        rosterSortDirection = rosterSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        rosterSortColumn = column;
        rosterSortDirection = 'asc';
    }
    
    // Sort the players array
    rosterPlayers.sort((a, b) => {
        let aVal, bVal;
        
        switch(column) {
            case 'name':
                aVal = a.name.toLowerCase();
                bVal = b.name.toLowerCase();
                break;
            case 'wins':
                aVal = a.wins;
                bVal = b.wins;
                break;
            case 'losses':
                aVal = a.losses;
                bVal = b.losses;
                break;
            case 'winRate':
                aVal = parseFloat(a.winRate);
                bVal = parseFloat(b.winRate);
                break;
            case 'plusMinus':
                aVal = a.plusMinus;
                bVal = b.plusMinus;
                break;
            case 'games':
                aVal = a.games;
                bVal = b.games;
                break;
            default:
                return 0;
        }
        
        // Compare values
        if (aVal < bVal) return rosterSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return rosterSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Update table display
    loadRosterTable(rosterPlayers);
    
    // Update sort indicators
    updateSortIndicators();
}

// Update sort indicators in table headers
function updateSortIndicators() {
    const headers = document.querySelectorAll('.roster-table .sortable');
    headers.forEach(header => {
        const indicator = header.querySelector('.sort-indicator');
        const column = header.getAttribute('data-sort');
        
        if (column === rosterSortColumn) {
            header.classList.add('sorted');
            if (indicator) {
                indicator.textContent = rosterSortDirection === 'asc' ? ' ↑' : ' ↓';
            }
        } else {
            header.classList.remove('sorted');
            if (indicator) {
                indicator.textContent = '';
            }
        }
    });
}

// Filter roster table
function filterRosterTable() {
    const searchInput = document.getElementById('playerSearch');
    const tbody = document.getElementById('rosterTableBody');
    
    if (!searchInput || !tbody) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const playerNameSpan = row.querySelector('.player-name-with-icon span:last-child');
        const playerName = playerNameSpan?.textContent.toLowerCase() || '';
        if (playerName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Load player profile data
function loadPlayerProfile(playerName) {
    currentPlayerName = playerName; // Store for lookup
    
    // Ensure monthly has valid month/year so we don't fall back to all-time stats
    if (profilePeriod === 'monthly' && (profileSelectedMonth === null || profileSelectedYear === null)) {
        const now = new Date();
        profileSelectedMonth = now.getMonth();
        profileSelectedYear = now.getFullYear();
        populateMonthDropdown('profileMonthSelect', profileSelectedMonth, profileSelectedYear);
        const profileMonthSelector = document.getElementById('profileMonthSelector');
        if (profileMonthSelector) profileMonthSelector.style.display = 'block';
    }
    
    // Sync profile period tabs so the active tab matches profilePeriod
    document.querySelectorAll('.period-tab[data-section="profile"]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === profilePeriod);
    });
    const profileMonthSelectorEl = document.getElementById('profileMonthSelector');
    if (profileMonthSelectorEl) profileMonthSelectorEl.style.display = profilePeriod === 'monthly' ? 'block' : 'none';
    
    // Get profile period settings
    const isMonthly = profilePeriod === 'monthly';
    const selectedMonth = profileSelectedMonth;
    const selectedYear = profileSelectedYear;
    
    const player = statsProcessor.getPlayerProfile(playerName, isMonthly, selectedMonth, selectedYear);
    if (!player) {
        alert('Player not found');
        goBackHome();
        return;
    }
    
    // Set player name
    const profileName = document.getElementById('profileName');
    if (profileName) {
        profileName.textContent = playerName.toUpperCase();
    }
    
    // Set profile picture
    const profilePicture = document.getElementById('profilePicture');
    if (profilePicture) {
        const picturePath = getProfilePicturePath(playerName);
        if (picturePath) {
            // Use a static version number for cache-busting
            const cacheBuster = '?v=2';
            profilePicture.innerHTML = `<img src="${picturePath}${cacheBuster}" alt="${playerName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" onerror="this.parentElement.innerHTML='<div style=\\'color: rgba(255, 255, 255, 0.5); font-size: 0.9rem; text-align: center;\\'>Profile Picture</div>'">`;
        }
    }
    
    // Calculate win/loss bar stats
    const totalGames = player.wins + player.losses;
    const winPercentage = totalGames > 0 ? (player.wins / totalGames * 100) : 0;
    const lossPercentage = totalGames > 0 ? (player.losses / totalGames * 100) : 0;
    
    // Calculate role bar stats
    const gamesAsKeeper = player.gamesAsKeeper || 0;
    const gamesAsStriker = player.gamesAsStriker || 0;
    const totalRoleGames = gamesAsKeeper + gamesAsStriker;
    const keeperPercentage = totalRoleGames > 0 ? (gamesAsKeeper / totalRoleGames * 100) : 0;
    const strikerPercentage = totalRoleGames > 0 ? (gamesAsStriker / totalRoleGames * 100) : 0;
    
    // Calculate longest win streak and last 10 games
    let playerGames = statsProcessor.games.filter(game => {
        const team1HasPlayer = game.team1.players.some(p => p.toLowerCase() === playerName.toLowerCase());
        const team2HasPlayer = game.team2.players.some(p => p.toLowerCase() === playerName.toLowerCase());
        return team1HasPlayer || team2HasPlayer;
    });
    
    // Filter by month if monthly period is selected
    if (isMonthly && selectedMonth !== null && selectedYear !== null) {
        playerGames = playerGames.filter(game => {
            const gameDate = new Date(game.timestamp);
            return gameDate.getMonth() === selectedMonth && gameDate.getFullYear() === selectedYear;
        });
    }
    
    playerGames.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    let longestWinStreak = 0;
    let currentStreak = 0;
    let last10Wins = 0;
    let last10Losses = 0;
    
    for (let i = 0; i < playerGames.length; i++) {
        const game = playerGames[i];
        const isTeam1 = game.team1.players.some(p => p.toLowerCase() === playerName.toLowerCase());
        const won = isTeam1 ? game.team1.score > game.team2.score : game.team2.score > game.team1.score;
        
        if (won) {
            currentStreak++;
            longestWinStreak = Math.max(longestWinStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
        
        // Last 10 games
        if (i >= playerGames.length - 10) {
            if (won) last10Wins++;
            else last10Losses++;
        }
    }
    
    const last10Record = `${last10Wins}-${last10Losses}`;
    const last10Games = Math.min(10, playerGames.length);
    
    // Set player stats grid with new layout
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
                        ${player.wins > 0 ? `
                            <div class="win-section" style="width: ${winPercentage}%">
                                <div class="win-loss-label win-label">
                                    <span class="win-loss-icon">+</span>
                                    <span class="win-loss-percentage">${winPercentage.toFixed(0)}%</span>
                                </div>
                                <div class="win-loss-count win-count">${player.wins} Won</div>
                            </div>
                        ` : ''}
                        ${player.losses > 0 ? `
                            <div class="loss-section" style="width: ${lossPercentage}%">
                                <div class="win-loss-label loss-label">
                                    <span class="win-loss-icon">-</span>
                                    <span class="win-loss-percentage">${lossPercentage.toFixed(0)}%</span>
                                </div>
                                <div class="win-loss-count loss-count">${player.losses} Lost</div>
                            </div>
                        ` : ''}
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
                        ${gamesAsKeeper > 0 ? `
                            <div class="role-section keeper-section" style="width: ${keeperPercentage}%">
                                <div class="role-label keeper-label">
                                    <span class="role-icon">GK</span>
                                    <span class="role-percentage">${keeperPercentage.toFixed(0)}%</span>
                                </div>
                                <div class="role-count keeper-count">${gamesAsKeeper} Keeper</div>
                            </div>
                        ` : ''}
                        ${gamesAsStriker > 0 ? `
                            <div class="role-section striker-section" style="width: ${strikerPercentage}%">
                                <div class="role-label striker-label">
                                    <span class="role-icon">ST</span>
                                    <span class="role-percentage">${strikerPercentage.toFixed(0)}%</span>
                                </div>
                                <div class="role-count striker-count">${gamesAsStriker} Striker</div>
                            </div>
                        ` : ''}
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
    
    // Load and display accolades
    loadPlayerAccolades(playerName);
    
    // Load synergy data
    loadSynergy(playerName);
}

// Load and display player accolades
function loadPlayerAccolades(playerName) {
    const accoladesSection = document.getElementById('profileAccoladesSection');
    const accoladesList = document.getElementById('accoladesList');
    
    if (!accoladesSection || !accoladesList) return;
    
    // Normalize player name for lookup
    const normalizedName = playerName.toLowerCase().trim();
    const accolades = playerAccolades.get(normalizedName) || [];
    
    if (accolades.length === 0) {
        accoladesSection.style.display = 'none';
        return;
    }
    
    // Show section
    accoladesSection.style.display = 'block';
    
    // Group accolades by award (in case player won same award multiple times)
    const accoladeGroups = {};
    accolades.forEach(accolade => {
        const key = accolade.award;
        if (!accoladeGroups[key]) {
            accoladeGroups[key] = [];
        }
        accoladeGroups[key].push(accolade.tournament);
    });
    
    // Map award names to badge image paths (normalized to lowercase for matching)
    const badgeImages = {
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
    
    // Display accolades as badges with hover tooltips
    accoladesList.innerHTML = Object.entries(accoladeGroups)
        .map(([award, tournaments]) => {
            const tournamentText = tournaments.length === 1 
                ? `T${tournaments[0]}` 
                : `T${tournaments.sort((a, b) => a - b).join(', T')}`;
            const count = tournaments.length > 1 ? `${tournaments.length}x` : '';
            const tooltipText = `${award} - ${tournamentText}`;
            
            // Check if we have an image for this award (normalize for matching)
            const normalizedAward = award.toLowerCase().trim();
            const badgeImage = badgeImages[normalizedAward];
            
            if (badgeImage) {
                // Use actual badge image
                return `
                    <div class="accolade-badge" title="${tooltipText}">
                        <img src="${badgeImage}" alt="${award}" class="badge-image" />
                        ${count ? `<span class="badge-count">${count}</span>` : ''}
                    </div>
                `;
            } else {
                // Use placeholder for awards without images
                return `
                    <div class="accolade-badge placeholder-badge" title="${tooltipText}">
                        <div class="badge-placeholder">
                            <span class="badge-placeholder-text">${award}${count ? ` ${count}` : ''}</span>
                        </div>
                    </div>
                `;
            }
        })
        .join('');
    
    // Populate opponent dropdown (used for both with/against lookup)
    populateOpponentDropdown(playerName);
    
    // Initialize lookup mode to 'against' (default)
    lookupMode = 'against';
    toggleLookupMode('against');
    
    // Set default month to current month
    const now = new Date();
    if (profileSelectedMonth === null || profileSelectedYear === null) {
        profileSelectedMonth = now.getMonth();
        profileSelectedYear = now.getFullYear();
    }
    synergySelectedMonth = now.getMonth();
    synergySelectedYear = now.getFullYear();
    matchupsSelectedMonth = now.getMonth();
    matchupsSelectedYear = now.getFullYear();
    
    // Populate month dropdowns
    populateMonthDropdown('profileMonthSelect', profileSelectedMonth, profileSelectedYear);
    populateMonthDropdown('synergyMonthSelect', synergySelectedMonth, synergySelectedYear);
    populateMonthDropdown('matchupsMonthSelect', matchupsSelectedMonth, matchupsSelectedYear);
    
    // Show profile month selector if monthly is selected
    const profileMonthSelector = document.getElementById('profileMonthSelector');
    if (profileMonthSelector && profilePeriod === 'monthly') {
        profileMonthSelector.style.display = 'block';
    }
    
    // Load matchup data
    loadMatchups(playerName);
}

// Populate teammate dropdown
// Populate opponent dropdown
function populateOpponentDropdown(playerName) {
    const select = document.getElementById('opponentSelect');
    if (!select) return;
    
    // Get all players except the current one
    const allPlayers = statsProcessor.getAllPlayerNames()
        .filter(name => name.toLowerCase() !== playerName.toLowerCase())
        .sort();
    
    select.innerHTML = '<option value="">Select a player...</option>' +
        allPlayers.map(name => `<option value="${name}">${name}</option>`).join('');
}

// Get available months from game data
function getAvailableMonths() {
    const monthMap = new Map();
    statsProcessor.games.forEach(game => {
        const gameDate = new Date(game.timestamp);
        const year = gameDate.getFullYear();
        const month = gameDate.getMonth();
        const monthKey = `${year}-${month}`;
        
        if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, {
                year: year,
                month: month,
                label: gameDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            });
        }
    });
    return Array.from(monthMap.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
}

// Populate month dropdown
function populateMonthDropdown(selectId, currentMonth, currentYear) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const months = getAvailableMonths();
    select.innerHTML = months.map(m => 
        `<option value="${m.year}-${m.month}" ${m.year === currentYear && m.month === currentMonth ? 'selected' : ''}>${m.label}</option>`
    ).join('');
}

// Load synergy data
function loadSynergy(playerName) {
    const isMonthly = synergyPeriod === 'monthly';
    
    // Load top 5 duos
    const topDuos = statsProcessor.getTopDuos(playerName, 1, isMonthly, synergySelectedMonth, synergySelectedYear);
    const topDuosList = document.getElementById('topDuosList');
    if (topDuosList) {
        if (topDuos.length === 0) {
            topDuosList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No duo data available</p>';
        } else {
            topDuosList.innerHTML = topDuos.map(duo => `
                <div class="duo-item">
                    <div class="duo-teammate">${getPlayerNameWithIcon(duo.teammate, 24, true)}</div>
                    <div class="duo-stats">
                        <div class="duo-stat">
                            <div class="duo-stat-label">Games</div>
                            <div class="duo-stat-value">${duo.games}</div>
                        </div>
                        <div class="duo-stat">
                            <div class="duo-stat-label">Wins</div>
                            <div class="duo-stat-value">${duo.wins}</div>
                        </div>
                        <div class="duo-stat">
                            <div class="duo-stat-label">Losses</div>
                            <div class="duo-stat-value">${duo.losses}</div>
                        </div>
                        <div class="duo-winrate ${duo.winRate >= 50 ? 'positive' : 'negative'}">
                            ${duo.winRate}%
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // Load bottom 5 duos
    const bottomDuos = statsProcessor.getBottomDuos(playerName, 1, isMonthly, synergySelectedMonth, synergySelectedYear);
    const bottomDuosList = document.getElementById('bottomDuosList');
    if (bottomDuosList) {
        if (bottomDuos.length === 0) {
            bottomDuosList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No duo data available</p>';
        } else {
            bottomDuosList.innerHTML = bottomDuos.map(duo => `
                <div class="duo-item">
                    <div class="duo-teammate">${getPlayerNameWithIcon(duo.teammate, 24, true)}</div>
                    <div class="duo-stats">
                        <div class="duo-stat">
                            <div class="duo-stat-label">Games</div>
                            <div class="duo-stat-value">${duo.games}</div>
                        </div>
                        <div class="duo-stat">
                            <div class="duo-stat-label">Wins</div>
                            <div class="duo-stat-value">${duo.wins}</div>
                        </div>
                        <div class="duo-stat">
                            <div class="duo-stat-label">Losses</div>
                            <div class="duo-stat-value">${duo.losses}</div>
                        </div>
                        <div class="duo-winrate ${duo.winRate >= 50 ? 'positive' : 'negative'}">
                            ${duo.winRate}%
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // Load most teamed with list (sorted by games played)
    const allDuos = statsProcessor.getPlayerDuoStats(playerName, 1, isMonthly, synergySelectedMonth, synergySelectedYear);
    const mostTeamedList = document.getElementById('mostTeamedList');
    if (mostTeamedList) {
        if (allDuos.length === 0) {
            mostTeamedList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No teammate data available</p>';
        } else {
            // Sort by games played (descending), then by win rate
            const sortedDuos = allDuos.sort((a, b) => {
                if (b.games !== a.games) {
                    return b.games - a.games;
                }
                return b.winRate - a.winRate;
            });
            
            mostTeamedList.innerHTML = sortedDuos.map(duo => `
                <div class="most-teamed-item">
                    <div class="most-teamed-player">
                        ${getPlayerNameWithIcon(duo.teammate, 36, true)}
                    </div>
                    <div class="most-teamed-stats">
                        <div class="most-teamed-games">${duo.games} G</div>
                        <div class="most-teamed-winrate ${duo.winRate >= 50 ? 'positive' : 'negative'}">
                            ${duo.winRate}%
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Load matchup data
function loadMatchups(playerName) {
    const isMonthly = matchupsPeriod === 'monthly';
    
    // Load top 5 opponents
    const topOpponents = statsProcessor.getTopOpponents(playerName, 1, isMonthly, matchupsSelectedMonth, matchupsSelectedYear);
    const topOpponentsList = document.getElementById('topOpponentsList');
    if (topOpponentsList) {
        if (topOpponents.length === 0) {
            topOpponentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No matchup data available</p>';
        } else {
            topOpponentsList.innerHTML = topOpponents.map(opponent => `
                <div class="duo-item">
                    <div class="duo-teammate">${getPlayerNameWithIcon(opponent.opponent, 24, true)}</div>
                    <div class="duo-stats">
                        <div class="duo-stat">
                            <div class="duo-stat-label">Games</div>
                            <div class="duo-stat-value">${opponent.games}</div>
                        </div>
                        <div class="duo-stat">
                            <div class="duo-stat-label">Wins</div>
                            <div class="duo-stat-value">${opponent.wins}</div>
                        </div>
                        <div class="duo-stat">
                            <div class="duo-stat-label">Losses</div>
                            <div class="duo-stat-value">${opponent.losses}</div>
                        </div>
                        <div class="duo-winrate ${opponent.winRate >= 50 ? 'positive' : 'negative'}">
                            ${opponent.winRate}%
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
    
    // Load bottom 5 opponents
    const bottomOpponents = statsProcessor.getBottomOpponents(playerName, 1, isMonthly, matchupsSelectedMonth, matchupsSelectedYear);
    const bottomOpponentsList = document.getElementById('bottomOpponentsList');
    if (bottomOpponentsList) {
        if (bottomOpponents.length === 0) {
            bottomOpponentsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No matchup data available</p>';
        } else {
            bottomOpponentsList.innerHTML = bottomOpponents.map(opponent => `
                <div class="duo-item">
                    <div class="duo-teammate">${getPlayerNameWithIcon(opponent.opponent, 24, true)}</div>
                    <div class="duo-stats">
                        <div class="duo-stat">
                            <div class="duo-stat-label">Games</div>
                            <div class="duo-stat-value">${opponent.games}</div>
                        </div>
                        <div class="duo-stat">
                            <div class="duo-stat-label">Wins</div>
                            <div class="duo-stat-value">${opponent.wins}</div>
                        </div>
                        <div class="duo-stat">
                            <div class="duo-stat-label">Losses</div>
                            <div class="duo-stat-value">${opponent.losses}</div>
                        </div>
                        <div class="duo-winrate ${opponent.winRate >= 50 ? 'positive' : 'negative'}">
                            ${opponent.winRate}%
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }
}

// Handle opponent lookup button click
function handleOpponentLookup() {
    const select = document.getElementById('opponentSelect');
    const result = document.getElementById('opponentLookupResult');
    
    if (!select || !result || !currentPlayerName) return;
    
    const selectedPlayer = select.value;
    
    if (!selectedPlayer) {
        alert('Please select a player');
        return;
    }
    
    const isMonthly = matchupsPeriod === 'monthly';
    let stats;
    let title;
    let noGamesMsg;
    
    if (lookupMode === 'with') {
        // Lookup win rate WITH player (as teammate)
        stats = statsProcessor.getDuoWinRate(currentPlayerName, selectedPlayer, 1, isMonthly, matchupsSelectedMonth, matchupsSelectedYear);
        title = `${getPlayerNameWithIcon(currentPlayerName.toUpperCase(), 28, false)} & ${getPlayerNameWithIcon(selectedPlayer.toUpperCase(), 28, false)}`;
        noGamesMsg = 'No games played together (minimum 1 game required)';
    } else {
        // Lookup win rate AGAINST player (as opponent)
        stats = statsProcessor.getOpponentWinRate(currentPlayerName, selectedPlayer, 1, isMonthly, matchupsSelectedMonth, matchupsSelectedYear);
        title = `${getPlayerNameWithIcon(currentPlayerName.toUpperCase(), 28, false)} vs ${getPlayerNameWithIcon(selectedPlayer.toUpperCase(), 28, false)}`;
        noGamesMsg = 'No games played against this player (minimum 1 game required)';
    }
    
    if (!stats) {
        result.classList.remove('hidden');
        result.innerHTML = `
            <div class="lookup-result-content">
                <p style="color: var(--text-secondary);">${noGamesMsg}</p>
            </div>
        `;
        return;
    }
    
    result.classList.remove('hidden');
    result.innerHTML = `
        <div class="lookup-result-content">
            <div class="lookup-result-title">${title}</div>
            <div class="lookup-result-stats">
                <div class="lookup-stat-box">
                    <div class="lookup-stat-label">Win Rate</div>
                    <div class="lookup-stat-value" style="color: ${stats.winRate >= 50 ? '#10b981' : '#ef4444'};">${stats.winRate}%</div>
                </div>
                <div class="lookup-stat-box">
                    <div class="lookup-stat-label">Games</div>
                    <div class="lookup-stat-value">${stats.games}</div>
                </div>
                <div class="lookup-stat-box">
                    <div class="lookup-stat-label">Wins</div>
                    <div class="lookup-stat-value">${stats.wins}</div>
                </div>
                <div class="lookup-stat-box">
                    <div class="lookup-stat-label">Losses</div>
                    <div class="lookup-stat-value">${stats.losses}</div>
                </div>
            </div>
        </div>
    `;
}

// Switch between tabs
function switchProfileTab(tabName) {
    const synergySection = document.getElementById('synergySection');
    const matchupsSection = document.getElementById('matchupsSection');
    
    // Update tab buttons
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Show/hide sections
    if (tabName === 'synergy') {
        if (synergySection) synergySection.style.display = 'block';
        if (matchupsSection) matchupsSection.style.display = 'none';
    } else if (tabName === 'matchups') {
        if (synergySection) synergySection.style.display = 'none';
        if (matchupsSection) matchupsSection.style.display = 'block';
    }
}

// Toggle lookup mode (with/against)
function toggleLookupMode(mode) {
    lookupMode = mode;
    
    // Update toggle button states
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
    
    // Clear the result when switching modes
    const result = document.getElementById('opponentLookupResult');
    if (result) {
        result.innerHTML = '';
        result.classList.add('hidden');
    }
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
    // Initialize stats processor
    if (!statsProcessor) {
        statsProcessor = new StatsProcessor();
    }
    
    loadData();
    
    // Add event listeners for tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchPeriod(btn.dataset.period);
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
    
    // Toggle buttons for lookup mode
    const withToggle = document.getElementById('withToggle');
    const againstToggle = document.getElementById('againstToggle');
    if (withToggle) {
        withToggle.addEventListener('click', () => toggleLookupMode('with'));
    }
    if (againstToggle) {
        againstToggle.addEventListener('click', () => toggleLookupMode('against'));
    }
    
    // Opponent lookup button
    const opponentLookupBtn = document.getElementById('opponentLookupBtn');
    if (opponentLookupBtn) {
        opponentLookupBtn.addEventListener('click', handleOpponentLookup);
    }
    
    // Profile tab buttons
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            switchProfileTab(btn.dataset.tab);
        });
    });
    
    // Period tab buttons (for synergy and matchups)
    document.querySelectorAll('.period-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            const period = btn.dataset.period;
            
            // Update active state
            document.querySelectorAll(`[data-section="${section}"]`).forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            
            // Show/hide month selector
            const monthSelector = document.getElementById(`${section}MonthSelector`);
            if (monthSelector) {
                monthSelector.style.display = period === 'monthly' ? 'block' : 'none';
            }
            
            // Update period and reload data
            if (section === 'profile') {
                profilePeriod = period;
                // Populate month dropdown if switching to monthly
                if (period === 'monthly') {
                    // Set default to current month if not set
                    if (profileSelectedMonth === null || profileSelectedYear === null) {
                        const now = new Date();
                        profileSelectedMonth = now.getMonth();
                        profileSelectedYear = now.getFullYear();
                    }
                    populateMonthDropdown('profileMonthSelect', profileSelectedMonth, profileSelectedYear);
                }
                if (currentPlayerName) {
                    loadPlayerProfile(currentPlayerName);
                }
            } else if (section === 'synergy') {
                synergyPeriod = period;
                if (currentPlayerName) {
                    loadSynergy(currentPlayerName);
                }
            } else if (section === 'matchups') {
                matchupsPeriod = period;
                if (currentPlayerName) {
                    loadMatchups(currentPlayerName);
                }
            } else if (section === 'roster') {
                rosterPeriod = period;
                // Populate month dropdown if switching to monthly
                if (period === 'monthly') {
                    populateMonthDropdown('rosterMonthSelect', rosterSelectedMonth, rosterSelectedYear);
                    // Set default to current month if not set
                    if (rosterSelectedMonth === null || rosterSelectedYear === null) {
                        const now = new Date();
                        rosterSelectedMonth = now.getMonth();
                        rosterSelectedYear = now.getFullYear();
                        populateMonthDropdown('rosterMonthSelect', rosterSelectedMonth, rosterSelectedYear);
                    }
                }
                loadPlayersPage();
            }
        });
    });
    
    // Month selector dropdowns
    const profileMonthSelect = document.getElementById('profileMonthSelect');
    if (profileMonthSelect) {
        profileMonthSelect.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            profileSelectedYear = year;
            profileSelectedMonth = month;
            if (currentPlayerName) {
                loadPlayerProfile(currentPlayerName);
            }
        });
    }
    
    const synergyMonthSelect = document.getElementById('synergyMonthSelect');
    if (synergyMonthSelect) {
        synergyMonthSelect.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            synergySelectedYear = year;
            synergySelectedMonth = month;
            if (currentPlayerName) {
                loadSynergy(currentPlayerName);
            }
        });
    }
    
    const matchupsMonthSelect = document.getElementById('matchupsMonthSelect');
    if (matchupsMonthSelect) {
        matchupsMonthSelect.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            matchupsSelectedYear = year;
            matchupsSelectedMonth = month;
            if (currentPlayerName) {
                loadMatchups(currentPlayerName);
            }
        });
    }
    
    const rosterMonthSelect = document.getElementById('rosterMonthSelect');
    if (rosterMonthSelect) {
        rosterMonthSelect.addEventListener('change', (e) => {
            const [year, month] = e.target.value.split('-').map(Number);
            rosterSelectedYear = year;
            rosterSelectedMonth = month;
            loadPlayersPage();
        });
    }
    
    // Carousel navigation buttons
    const carouselLeftBtn = document.getElementById('carouselLeftBtn');
    const carouselRightBtn = document.getElementById('carouselRightBtn');
    if (carouselLeftBtn) {
        carouselLeftBtn.addEventListener('click', () => scrollCarousel('left'));
    }
    if (carouselRightBtn) {
        carouselRightBtn.addEventListener('click', () => scrollCarousel('right'));
    }
    
    // Player search
    const playerSearch = document.getElementById('playerSearch');
    if (playerSearch) {
        playerSearch.addEventListener('input', filterRosterTable);
    }
    
    // Sortable table headers
    document.querySelectorAll('.roster-table .sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-sort');
            if (column) {
                sortRosterTable(column);
            }
        });
    });
    
    // Make functions global for onclick handlers
    window.showPlayerProfile = showPlayerProfile;
    window.goBackHome = goBackHome;
    window.showPlayersPage = showPlayersPage;
    window.showGameLogPage = showGameLogPage;
    
    // Set initial active nav link (home page is default)
    const homeLink = document.querySelector('.nav-link[onclick*="goBackHome"]');
    if (homeLink) {
        updateActiveNavLink(homeLink);
    }
    
    updateLastUpdated();
});
