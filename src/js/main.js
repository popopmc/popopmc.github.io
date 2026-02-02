// Stats Dashboard for Game Scores
// Initialize stats processor (will be set up after DOM loads)
let statsProcessor = null;
let currentPeriod = 'monthly'; // 'monthly' or 'alltime'
let synergyPeriod = 'alltime'; // 'monthly' or 'alltime' for synergy section
let matchupsPeriod = 'alltime'; // 'monthly' or 'alltime' for matchups section
let synergySelectedMonth = null;
let synergySelectedYear = null;
let matchupsSelectedMonth = null;
let matchupsSelectedYear = null;

// Roster table sorting state
let rosterPlayers = []; // Store current player data
let rosterSortColumn = null; // Current sort column
let rosterSortDirection = 'asc'; // 'asc' or 'desc'

// Matchups lookup mode
let lookupMode = 'against'; // 'with' or 'against'

// Get profile picture path for a player
function getProfilePicturePath(playerName) {
    if (!playerName) return null;
    
    const name = playerName.toLowerCase().trim();
    const basePath = 'src/assets/profile-pictures/';
    
    // Map of player names to their actual file names (handles special cases)
    const nameMappings = {
        'delta': 'delta_cropped.png',
        'epicjab': 'epicjab_cropped.png',
        'stella': 'cropped_stella.png',
        'kami': 'cropped-kami.png',
        'mai': 'mai.png',
        'vv': 'vv.png',
        'baps': 'cropped-baps.png',
        'anon': 'cropped-anon.png',
        'ash': 'cropped-ash.png',
        'aster': 'cropped-aster.png',
        'bix': 'cropped-bix.png',
        'danny': 'cropped-danny.png',
        'e': 'cropped-e.png',
        'ella': 'cropped-ella.png',
        'ema': 'cropped-ema.png',
        'eri': 'cropped-eri.png',
        'gentle': 'cropped-gentle.png',
        'hawk': 'cropped-hawk.png',
        'jib': 'cropped-jib.png',
        'jinsye': 'cropped-jinsye.png',
        'kaif': 'cropped-kaif.png',
        'lala': 'cropped-lala.png',
        'nae': 'cropped-nae.png',
        'neptune': 'cropped-neptune.png',
        'pike': 'cropped-pike.png',
        'popop': 'cropped-popop.png',
        'rob': 'cropped-rob.png',
        'saber': 'cropped-saber.png',
        'shan': 'cropped-shan.png',
        'toph': 'cropped-toph.png',
        'wraith': 'cropped-wraith.png',
        'akil': 'cropped-akil.png'
    };
    
    // Check if we have a direct mapping
    if (nameMappings[name]) {
        return basePath + nameMappings[name];
    }
    
    // Try common patterns as fallback (most common pattern first)
    // The browser's onerror handler will show placeholder if file doesn't exist
    return basePath + `cropped-${name}.png`;
}

// Get player name with icon HTML
function getPlayerNameWithIcon(playerName, size = 24, clickable = true) {
    if (!playerName) return '';
    
    const picturePath = getProfilePicturePath(playerName);
    const iconSize = `${size}px`;
    const iconHtml = picturePath 
        ? `<img src="${picturePath}" alt="${playerName}" class="player-icon" style="width: ${iconSize}; height: ${iconSize}; object-fit: contain; border-radius: 50%; margin-right: 0.5rem; vertical-align: middle;" onerror="this.style.display='none';">`
        : '';
    
    const nameClass = clickable ? 'stat-player' : '';
    const onClick = clickable ? `onclick="showPlayerProfile('${playerName.replace(/'/g, "\\'")}')"` : '';
    
    return `<span class="player-name-with-icon ${nameClass}" ${onClick}>
        ${iconHtml}
        <span>${playerName}</span>
    </span>`;
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
                            ${getPlayerNameWithIcon(player.name, 28, true)}
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
                            ${getPlayerNameWithIcon(player.name, 28, true)}
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
                            ${getPlayerNameWithIcon(player.name, 28, true)}
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
                            ${getPlayerNameWithIcon(player.name, 28, true)}
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
    
    // Load player data
    loadPlayerProfile(playerName);
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Store current player name for lookup
let currentPlayerName = '';

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
    
    // Load players data
    loadPlayersPage();
    
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
    
    // Load game log data
    loadGameLog();
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Load game log
function loadGameLog() {
    const gameLogContent = document.getElementById('gameLogContent');
    if (!gameLogContent) return;
    
    const games = statsProcessor.getAllGames();
    
    if (games.length === 0) {
        gameLogContent.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-secondary);">No games found</p>';
        return;
    }
    
    // Group games by date
    const gamesByDate = {};
    games.forEach(game => {
        // Parse UTC timestamp and convert to user's local timezone
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
    const html = Object.keys(gamesByDate).map(dateKey => {
        const dateGames = gamesByDate[dateKey];
        return `
            <div class="game-log-date-section">
                <h2 class="game-log-date-header">${dateKey}</h2>
                <table class="game-log-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Team 1</th>
                            <th>Score</th>
                            <th>Score</th>
                            <th>Team 2</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dateGames.map(game => {
                            // Parse UTC timestamp and convert to user's local timezone
                            const gameDate = new Date(game.timestamp);
                            const timeStr = gameDate.toLocaleTimeString(undefined, { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                timeZoneName: 'short'
                            });
                            const team1Won = game.team1.score > game.team2.score;
                            const team2Won = game.team2.score > game.team1.score;
                            
                            const team1Score = game.team1.score;
                            const team2Score = game.team2.score;
                            const team1ScoreClass = team1Score > team2Score ? 'score-higher' : team1Score < team2Score ? 'score-lower' : 'score-tie';
                            const team2ScoreClass = team2Score > team1Score ? 'score-higher' : team2Score < team1Score ? 'score-lower' : 'score-tie';
                            
                            return `
                                <tr>
                                    <td class="game-time">${timeStr}</td>
                                    <td class="game-team">
                                        ${game.team1.players.map(p => getPlayerNameWithIcon(p, 24, true)).join(', ')}
                                    </td>
                                    <td class="game-score ${team1ScoreClass}">${team1Score}</td>
                                    <td class="game-score ${team2ScoreClass}">${team2Score}</td>
                                    <td class="game-team">
                                        ${game.team2.players.map(p => getPlayerNameWithIcon(p, 24, true)).join(', ')}
                                    </td>
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
    
    gameLogContent.innerHTML = html;
}

// Load players page data
function loadPlayersPage() {
    const allPlayers = statsProcessor.getPlayerStats(1).sort((a, b) => {
        // Sort by games played (most active first)
        return b.games - a.games;
    });
    
    // Store players for sorting
    rosterPlayers = [...allPlayers];
    
    // Reset sorting state
    rosterSortColumn = 'games'; // Default sort by games
    rosterSortDirection = 'desc';
    
    // Reset carousel
    carouselIndex = 0;
    
    // Load carousel
    loadPlayersCarousel(allPlayers);
    
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
        const imageHtml = picturePath 
            ? `<img src="${picturePath}" alt="${player.name}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';">`
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
                ${getPlayerNameWithIcon(player.name, 20, true)}
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
    
    const player = statsProcessor.getPlayerProfile(playerName);
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
            profilePicture.innerHTML = `<img src="${picturePath}" alt="${playerName}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" onerror="this.parentElement.innerHTML='<div style=\\'color: rgba(255, 255, 255, 0.5); font-size: 0.9rem; text-align: center;\\'>Profile Picture</div>'">`;
        }
    }
    
    // Set player stats
    const profileStatsGrid = document.getElementById('profileStatsGrid');
    if (profileStatsGrid) {
        profileStatsGrid.innerHTML = `
            <div class="profile-stat-box">
                <div class="profile-stat-label">Wins</div>
                <div class="profile-stat-value">${player.wins}</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-label">Losses</div>
                <div class="profile-stat-value">${player.losses}</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-label">Win Rate</div>
                <div class="profile-stat-value">${typeof player.winRate === 'number' ? player.winRate.toFixed(1) : player.winRate}%</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-label">Games</div>
                <div class="profile-stat-value">${player.games}</div>
            </div>
            <div class="profile-stat-box">
                <div class="profile-stat-label">Plus/Minus</div>
                <div class="profile-stat-value">${player.plusMinus > 0 ? '+' : ''}${player.plusMinus}</div>
            </div>
        `;
    }
    
    // Load synergy data
    loadSynergy(playerName);
    
    // Populate opponent dropdown (used for both with/against lookup)
    populateOpponentDropdown(playerName);
    
    // Initialize lookup mode to 'against' (default)
    lookupMode = 'against';
    toggleLookupMode('against');
    
    // Set default month to current month
    const now = new Date();
    synergySelectedMonth = now.getMonth();
    synergySelectedYear = now.getFullYear();
    matchupsSelectedMonth = now.getMonth();
    matchupsSelectedYear = now.getFullYear();
    
    // Populate month dropdowns
    populateMonthDropdown('synergyMonthSelect', synergySelectedMonth, synergySelectedYear);
    populateMonthDropdown('matchupsMonthSelect', matchupsSelectedMonth, matchupsSelectedYear);
    
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
                        ${getPlayerNameWithIcon(duo.teammate, 28, true)}
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
    
    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', goBackHome);
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
            if (section === 'synergy') {
                synergyPeriod = period;
                if (currentPlayerName) {
                    loadSynergy(currentPlayerName);
                }
            } else if (section === 'matchups') {
                matchupsPeriod = period;
                if (currentPlayerName) {
                    loadMatchups(currentPlayerName);
                }
            }
        });
    });
    
    // Month selector dropdowns
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
    
    updateLastUpdated();
});
