// CSV Parser and Stats Calculator
class StatsProcessor {
    constructor() {
        this.games = [];
        this.playerStats = new Map();
        this.teammateStats = new Map();
        this.monthlyStats = new Map();
        this.monthlyTeammateStats = new Map();
        this.opponentStats = new Map(); // For tracking win rates against opponents
        this.monthlyOpponentStats = new Map(); // For monthly opponent stats
        this.seenGames = new Set(); // Track seen games across all CSV files to prevent duplicates
    }

    // Parse CSV data
    parseCSV(csvText, append = false) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        // Clear games array and seen games set unless appending
        if (!append) {
            this.games = [];
            this.seenGames.clear();
        }
        
        let duplicatesFound = 0;
        
        // Start from line 1 (skip header)
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length < 9) continue;
            
            const game = {
                timestamp: values[0] || '',
                team1: {
                    players: [values[1], values[2], values[3]]
                        .filter(p => p && p.trim() !== '')
                        .map(p => p.trim()),
                    score: parseInt(values[4]) || 0
                },
                team2: {
                    players: [values[5], values[6], values[7]]
                        .filter(p => p && p.trim() !== '')
                        .map(p => p.trim()),
                    score: parseInt(values[8]) || 0
                }
            };
            
            // Only add games with valid scores and at least one player per team
            if (game.team1.players.length > 0 && game.team2.players.length > 0 && 
                (game.team1.score >= 0 && game.team2.score >= 0)) {
                
                // Create unique key for duplicate detection
                // Sort players for consistent duplicate detection (same game with different player order)
                const team1Key = [...game.team1.players].sort().join(',');
                const team2Key = [...game.team2.players].sort().join(',');
                
                // Create keys for both possible team orders (team1 vs team2 and team2 vs team1)
                // This catches duplicates where the same game was recorded with teams swapped
                const gameKey1 = `${game.timestamp}|${team1Key}|${game.team1.score}|${team2Key}|${game.team2.score}`;
                const gameKey2 = `${game.timestamp}|${team2Key}|${game.team2.score}|${team1Key}|${game.team1.score}`;
                
                // Check if we've seen this exact game before (same timestamp, teams, and scores)
                // Only skip if it's an exact duplicate (prevents counting same game twice)
                if (!this.seenGames.has(gameKey1) && !this.seenGames.has(gameKey2)) {
                    this.seenGames.add(gameKey1);
                    this.seenGames.add(gameKey2);
                    this.games.push(game);
                } else {
                    // Duplicate found - log it for debugging
                    duplicatesFound++;
                    console.log(`Duplicate game skipped: ${game.timestamp} - ${team1Key} (${game.team1.score}) vs ${team2Key} (${game.team2.score})`);
                }
            }
        }
        
        if (duplicatesFound > 0) {
            console.log(`Total duplicates found and skipped: ${duplicatesFound}`);
        }
    }

    // Parse CSV line handling quoted values
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    // Calculate all statistics
    calculateStats() {
        this.playerStats.clear();
        this.teammateStats.clear();
        this.monthlyStats = new Map();
        this.monthlyTeammateStats = new Map();
        this.opponentStats.clear();
        this.monthlyOpponentStats = new Map();

        this.games.forEach(game => {
            const team1Won = game.team1.score > game.team2.score;
            const team2Won = game.team2.score > game.team1.score;
            
            // Get game date for monthly filtering
            const gameDate = new Date(game.timestamp);
            const currentDate = new Date();
            const isThisMonth = gameDate.getMonth() === currentDate.getMonth() && 
                              gameDate.getFullYear() === currentDate.getFullYear();
            
            // Process Team 1
            game.team1.players.forEach((player, index) => {
                const isKeeper = index === 0; // First player is keeper
                this.updatePlayerStats(player, team1Won, team2Won, game.team1.score, game.team2.score, isKeeper);
                if (isThisMonth) {
                    this.updateMonthlyStats(player, team1Won, team2Won, game.team1.score, game.team2.score);
                }
                this.updateTeammateStats(player, game.team1.players, team1Won, team2Won);
                if (isThisMonth) {
                    this.updateMonthlyTeammateStats(player, game.team1.players, team1Won, team2Won);
                }
                // Update opponent stats
                game.team2.players.forEach(opponent => {
                    this.updateOpponentStats(player, opponent, team1Won, team2Won, this.opponentStats);
                    if (isThisMonth) {
                        this.updateOpponentStats(player, opponent, team1Won, team2Won, this.monthlyOpponentStats);
                    }
                });
            });
            
            // Process Team 2
            game.team2.players.forEach((player, index) => {
                const isKeeper = index === 0; // First player is keeper
                this.updatePlayerStats(player, team2Won, team1Won, game.team2.score, game.team1.score, isKeeper);
                if (isThisMonth) {
                    this.updateMonthlyStats(player, team2Won, team1Won, game.team2.score, game.team1.score);
                }
                this.updateTeammateStats(player, game.team2.players, team2Won, team1Won);
                if (isThisMonth) {
                    this.updateMonthlyTeammateStats(player, game.team2.players, team2Won, team1Won);
                }
                // Update opponent stats
                game.team1.players.forEach(opponent => {
                    this.updateOpponentStats(player, opponent, team2Won, team1Won, this.opponentStats);
                    if (isThisMonth) {
                        this.updateOpponentStats(player, opponent, team2Won, team1Won, this.monthlyOpponentStats);
                    }
                });
            });
        });
    }

    // Update monthly teammate stats
    updateMonthlyTeammateStats(player, teammates, won, lost) {
        teammates.forEach(teammate => {
            if (player === teammate) return;
            
            const pair = [player, teammate].sort().join(' & ');
            
            // Only count this game once per pair - use the alphabetically first player as the "owner"
            // This prevents double-counting when both players in a pair process the same game
            const [player1, player2] = [player, teammate].sort();
            if (player !== player1) return; // Only process if this player is alphabetically first
            
            if (!this.monthlyTeammateStats.has(pair)) {
                this.monthlyTeammateStats.set(pair, {
                    wins: 0,
                    losses: 0,
                    games: 0
                });
            }
            
            const stats = this.monthlyTeammateStats.get(pair);
            stats.games++;
            if (won) stats.wins++;
            if (lost) stats.losses++;
        });
    }

    // Update opponent statistics (win rate against specific players)
    updateOpponentStats(player, opponent, won, lost, statsMap) {
        const key = `${player.toLowerCase()}|${opponent.toLowerCase()}`;
        
        if (!statsMap.has(key)) {
            statsMap.set(key, {
                player: player,
                opponent: opponent,
                wins: 0,
                losses: 0,
                games: 0
            });
        }
        
        const stats = statsMap.get(key);
        stats.games++;
        if (won) stats.wins++;
        if (lost) stats.losses++;
    }

    // Update monthly statistics
    updateMonthlyStats(player, won, lost, goalsFor, goalsAgainst) {
        if (!this.monthlyStats.has(player)) {
            this.monthlyStats.set(player, {
                wins: 0,
                losses: 0,
                ties: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                plusMinus: 0
            });
        }
        
        const stats = this.monthlyStats.get(player);
        if (won) {
            stats.wins++;
        } else if (lost) {
            stats.losses++;
        } else {
            // Tie game
            stats.ties++;
        }
        stats.goalsFor += goalsFor;
        stats.goalsAgainst += goalsAgainst;
        stats.plusMinus = stats.goalsFor - stats.goalsAgainst;
    }

    // Update individual player statistics
    updatePlayerStats(player, won, lost, goalsFor, goalsAgainst, isKeeper = false) {
        if (!this.playerStats.has(player)) {
            this.playerStats.set(player, {
                wins: 0,
                losses: 0,
                ties: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                plusMinus: 0,
                gamesAsKeeper: 0,
                gamesAsStriker: 0
            });
        }
        
        const stats = this.playerStats.get(player);
        if (won) {
            stats.wins++;
        } else if (lost) {
            stats.losses++;
        } else {
            // Tie game (neither won nor lost)
            stats.ties++;
        }
        stats.goalsFor += goalsFor;
        stats.goalsAgainst += goalsAgainst;
        stats.plusMinus = stats.goalsFor - stats.goalsAgainst;
        
        // Track role (keeper vs striker)
        if (isKeeper) {
            stats.gamesAsKeeper++;
        } else {
            stats.gamesAsStriker++;
        }
    }

    // Update teammate combination statistics
    updateTeammateStats(player, teammates, won, lost) {
        teammates.forEach(teammate => {
            if (player === teammate) return;
            
            // Create sorted key for consistent pairing
            const pair = [player, teammate].sort().join(' & ');
            
            // Only count this game once per pair - use the alphabetically first player as the "owner"
            // This prevents double-counting when both players in a pair process the same game
            const [player1, player2] = [player, teammate].sort();
            if (player !== player1) return; // Only process if this player is alphabetically first
            
            if (!this.teammateStats.has(pair)) {
                this.teammateStats.set(pair, {
                    wins: 0,
                    losses: 0,
                    games: 0
                });
            }
            
            const stats = this.teammateStats.get(pair);
            stats.games++;
            if (won) stats.wins++;
            if (lost) stats.losses++;
        });
    }

    // Get player stats sorted by win rate (minimum games filter)
    getPlayerStats(minGames = 1) {
        const players = Array.from(this.playerStats.entries())
            .map(([name, stats]) => {
                const totalGames = stats.wins + stats.losses + (stats.ties || 0);
                return {
                    name,
                    wins: stats.wins,
                    losses: stats.losses,
                    ties: stats.ties || 0,
                    games: totalGames,
                    winRate: totalGames > 0 
                        ? (stats.wins / totalGames * 100).toFixed(1) 
                        : 0,
                    goalsFor: stats.goalsFor,
                    goalsAgainst: stats.goalsAgainst,
                    plusMinus: stats.plusMinus
                };
            })
            .filter(p => p.games >= minGames)
            .sort((a, b) => {
                // Sort by win rate, then by games played
                if (parseFloat(b.winRate) !== parseFloat(a.winRate)) {
                    return parseFloat(b.winRate) - parseFloat(a.winRate);
                }
                return b.games - a.games;
            });
        
        return players;
    }

    // Get teammate stats sorted by win rate
    getTeammateStats(minGames = 1) {
        const teammates = Array.from(this.teammateStats.entries())
            .map(([pair, stats]) => ({
                pair,
                wins: stats.wins,
                losses: stats.losses,
                games: stats.games,
                winRate: stats.games > 0 
                    ? (stats.wins / stats.games * 100).toFixed(1) 
                    : 0
            }))
            .filter(t => t.games >= minGames)
            .sort((a, b) => {
                if (parseFloat(b.winRate) !== parseFloat(a.winRate)) {
                    return parseFloat(b.winRate) - parseFloat(a.winRate);
                }
                return b.games - a.games;
            });
        
        return teammates;
    }

    // Get plus/minus leaders
    getPlusMinusLeaders(minGames = 1) {
        return this.getPlayerStats(minGames)
            .sort((a, b) => b.plusMinus - a.plusMinus);
    }

    // Get monthly player stats
    getMonthlyPlayerStats(minGames = 1) {
        const players = Array.from(this.monthlyStats.entries())
            .map(([name, stats]) => {
                const totalGames = stats.wins + stats.losses + (stats.ties || 0);
                return {
                    name,
                    wins: stats.wins,
                    losses: stats.losses,
                    ties: stats.ties || 0,
                    games: totalGames,
                    winRate: totalGames > 0 
                        ? (stats.wins / totalGames * 100).toFixed(1) 
                        : 0,
                    goalsFor: stats.goalsFor,
                    goalsAgainst: stats.goalsAgainst,
                    plusMinus: stats.plusMinus
                };
            })
            .filter(p => p.games >= minGames);
        
        return players;
    }

    // Get leaders by category
    getLeadersByCategory(category, isMonthly = false, minGames = 1) {
        const stats = isMonthly ? this.getMonthlyPlayerStats(minGames) : this.getPlayerStats(minGames);
        
        let sorted = [];
        switch(category) {
            case 'winrate':
                sorted = [...stats].sort((a, b) => {
                    if (parseFloat(b.winRate) !== parseFloat(a.winRate)) {
                        return parseFloat(b.winRate) - parseFloat(a.winRate);
                    }
                    return b.games - a.games;
                });
                break;
            case 'wins':
                sorted = [...stats].sort((a, b) => b.wins - a.wins);
                break;
            case 'losses':
                sorted = [...stats].sort((a, b) => b.losses - a.losses);
                break;
            case 'plusminus':
                sorted = [...stats].sort((a, b) => b.plusMinus - a.plusMinus);
                break;
        }
        
        return sorted.slice(0, 5); // Top 5
    }

    // Get player-specific stats
    getPlayerProfile(playerName, isMonthly = false, selectedMonth = null, selectedYear = null) {
        // Get player stats directly from the map without filtering by minimum games
        const playerNameLower = playerName.toLowerCase();
        
        if (isMonthly && selectedMonth !== null && selectedYear !== null) {
            // Get monthly stats by filtering games
            const playerGames = this.games.filter(game => {
                const gameDate = new Date(game.timestamp);
                const gameMonth = gameDate.getMonth();
                const gameYear = gameDate.getFullYear();
                
                if (gameMonth !== selectedMonth || gameYear !== selectedYear) {
                    return false;
                }
                
                const team1HasPlayer = game.team1.players.some(p => p.toLowerCase() === playerNameLower);
                const team2HasPlayer = game.team2.players.some(p => p.toLowerCase() === playerNameLower);
                return team1HasPlayer || team2HasPlayer;
            });
            
            // Calculate stats from filtered games
            let wins = 0;
            let losses = 0;
            let goalsFor = 0;
            let goalsAgainst = 0;
            let gamesAsKeeper = 0;
            let gamesAsStriker = 0;
            
            playerGames.forEach(game => {
                const isTeam1 = game.team1.players.some(p => p.toLowerCase() === playerNameLower);
                const playerTeam = isTeam1 ? game.team1 : game.team2;
                const opponentTeam = isTeam1 ? game.team2 : game.team1;
                
                if (playerTeam.score > opponentTeam.score) {
                    wins++;
                } else if (playerTeam.score < opponentTeam.score) {
                    losses++;
                }
                
                goalsFor += playerTeam.score;
                goalsAgainst += opponentTeam.score;
                
                // Determine role (first player is keeper)
                const playerIndex = playerTeam.players.findIndex(p => p.toLowerCase() === playerNameLower);
                if (playerIndex === 0) {
                    gamesAsKeeper++;
                } else {
                    gamesAsStriker++;
                }
            });
            
            const totalGames = wins + losses;
            return {
                name: playerName,
                wins,
                losses,
                ties: 0,
                games: totalGames,
                winRate: totalGames > 0 
                    ? parseFloat((wins / totalGames * 100).toFixed(1))
                    : 0,
                goalsFor,
                goalsAgainst,
                plusMinus: goalsFor - goalsAgainst,
                gamesAsKeeper,
                gamesAsStriker
            };
        } else {
            // Get all-time stats
            for (const [name, stats] of this.playerStats.entries()) {
                if (name.toLowerCase() === playerNameLower) {
                    const totalGames = stats.wins + stats.losses + (stats.ties || 0);
                    return {
                        name,
                        wins: stats.wins,
                        losses: stats.losses,
                        ties: stats.ties || 0,
                        games: totalGames,
                        winRate: totalGames > 0 
                            ? parseFloat((stats.wins / totalGames * 100).toFixed(1))
                            : 0,
                        goalsFor: stats.goalsFor,
                        goalsAgainst: stats.goalsAgainst,
                        plusMinus: stats.plusMinus,
                        gamesAsKeeper: stats.gamesAsKeeper || 0,
                        gamesAsStriker: stats.gamesAsStriker || 0
                    };
                }
            }
        }
        return null;
    }

    // Get duo stats for a specific player
    getPlayerDuoStats(playerName, minGames = 1, isMonthly = false, selectedMonth = null, selectedYear = null) {
        const duos = [];
        let statsMap = this.teammateStats;
        
        if (isMonthly) {
            // Filter games by selected month/year
            const filteredStats = new Map();
            this.games.forEach(game => {
                const gameDate = new Date(game.timestamp);
                const gameMonth = gameDate.getMonth();
                const gameYear = gameDate.getFullYear();
                
                if (selectedMonth !== null && selectedYear !== null) {
                    if (gameMonth === selectedMonth && gameYear === selectedYear) {
                        // Process this game for teammate stats
                        const team1Won = game.team1.score > game.team2.score;
                        const team2Won = game.team2.score > game.team1.score;
                        
                        // Process Team 1 - only count each pair once
                        for (let i = 0; i < game.team1.players.length; i++) {
                            for (let j = i + 1; j < game.team1.players.length; j++) {
                                const player = game.team1.players[i];
                                const teammate = game.team1.players[j];
                                const pair = [player, teammate].sort().join(' & ');
                                
                                if (!filteredStats.has(pair)) {
                                    filteredStats.set(pair, { wins: 0, losses: 0, games: 0 });
                                }
                                const stats = filteredStats.get(pair);
                                stats.games++;
                                if (team1Won) stats.wins++;
                                if (team2Won) stats.losses++;
                            }
                        }
                        
                        // Process Team 2 - only count each pair once
                        for (let i = 0; i < game.team2.players.length; i++) {
                            for (let j = i + 1; j < game.team2.players.length; j++) {
                                const player = game.team2.players[i];
                                const teammate = game.team2.players[j];
                                const pair = [player, teammate].sort().join(' & ');
                                
                                if (!filteredStats.has(pair)) {
                                    filteredStats.set(pair, { wins: 0, losses: 0, games: 0 });
                                }
                                const stats = filteredStats.get(pair);
                                stats.games++;
                                if (team2Won) stats.wins++;
                                if (team1Won) stats.losses++;
                            }
                        }
                    }
                }
            });
            statsMap = filteredStats;
        }
        
        // Find all teammate pairs involving this player
        statsMap.forEach((stats, pair) => {
            const players = pair.split(' & ');
            if (players[0].toLowerCase() === playerName.toLowerCase() || 
                players[1].toLowerCase() === playerName.toLowerCase()) {
                const teammate = players[0].toLowerCase() === playerName.toLowerCase() 
                    ? players[1] 
                    : players[0];
                
                if (stats.games >= minGames) {
                    const winRate = stats.games > 0 
                        ? (stats.wins / stats.games * 100).toFixed(1) 
                        : 0;
                    
                    duos.push({
                        teammate,
                        wins: stats.wins,
                        losses: stats.losses,
                        games: stats.games,
                        winRate: parseFloat(winRate)
                    });
                }
            }
        });
        
        return duos;
    }

    // Get top 5 duos for a player
    getTopDuos(playerName, minGames = 1, isMonthly = false, selectedMonth = null, selectedYear = null) {
        const duos = this.getPlayerDuoStats(playerName, minGames, isMonthly, selectedMonth, selectedYear);
        return duos
            .sort((a, b) => {
                if (b.winRate !== a.winRate) {
                    return b.winRate - a.winRate;
                }
                return b.games - a.games;
            })
            .slice(0, 5);
    }

    // Get bottom 5 duos for a player
    getBottomDuos(playerName, minGames = 1, isMonthly = false, selectedMonth = null, selectedYear = null) {
        const duos = this.getPlayerDuoStats(playerName, minGames, isMonthly, selectedMonth, selectedYear);
        return duos
            .sort((a, b) => {
                if (a.winRate !== b.winRate) {
                    return a.winRate - b.winRate;
                }
                return b.games - a.games;
            })
            .slice(0, 5);
    }

    // Get winrate with specific teammate
    getDuoWinRate(player1, player2, minGames = 1, isMonthly = false, selectedMonth = null, selectedYear = null) {
        if (isMonthly && selectedMonth !== null && selectedYear !== null) {
            // Calculate on the fly for selected month
            const duos = this.getPlayerDuoStats(player1, minGames, isMonthly, selectedMonth, selectedYear);
            const duo = duos.find(d => d.teammate.toLowerCase() === player2.toLowerCase());
            if (!duo) return null;
            return {
                teammate: duo.teammate,
                wins: duo.wins,
                losses: duo.losses,
                games: duo.games,
                winRate: duo.winRate.toFixed(1)
            };
        }
        
        const pair = [player1, player2].sort().join(' & ');
        const statsMap = isMonthly ? this.monthlyTeammateStats : this.teammateStats;
        const stats = statsMap.get(pair);
        
        if (!stats || stats.games < minGames) {
            return null;
        }
        
        // Return the other player as teammate
        const pairPlayers = pair.split(' & ');
        const teammate = pairPlayers[0].toLowerCase() === player1.toLowerCase() ? pairPlayers[1] : pairPlayers[0];
        
        return {
            teammate: teammate,
            wins: stats.wins,
            losses: stats.losses,
            games: stats.games,
            winRate: (stats.wins / stats.games * 100).toFixed(1)
        };
    }

    // Get all player names
    getAllPlayerNames() {
        return Array.from(this.playerStats.keys()).sort();
    }

    // Get opponent stats for a specific player
    getOpponentStats(playerName, minGames = 1, isMonthly = false, selectedMonth = null, selectedYear = null) {
        const opponents = [];
        const playerLower = playerName.toLowerCase();
        let statsMap = isMonthly ? this.monthlyOpponentStats : this.opponentStats;
        
        // If monthly filtering with specific month/year, calculate on the fly
        if (isMonthly && selectedMonth !== null && selectedYear !== null) {
            const filteredStats = new Map();
            this.games.forEach(game => {
                const gameDate = new Date(game.timestamp);
                const gameMonth = gameDate.getMonth();
                const gameYear = gameDate.getFullYear();
                
                if (gameMonth === selectedMonth && gameYear === selectedYear) {
                    const team1Won = game.team1.score > game.team2.score;
                    const team2Won = game.team2.score > game.team1.score;
                    
                    // Process Team 1 players vs Team 2 players
                    game.team1.players.forEach(player => {
                        game.team2.players.forEach(opponent => {
                            const key = `${player.toLowerCase()}|${opponent.toLowerCase()}`;
                            if (!filteredStats.has(key)) {
                                filteredStats.set(key, {
                                    player: player,
                                    opponent: opponent,
                                    wins: 0,
                                    losses: 0,
                                    games: 0
                                });
                            }
                            const stats = filteredStats.get(key);
                            stats.games++;
                            if (team1Won) stats.wins++;
                            if (team2Won) stats.losses++;
                        });
                    });
                    
                    // Process Team 2 players vs Team 1 players
                    game.team2.players.forEach(player => {
                        game.team1.players.forEach(opponent => {
                            const key = `${player.toLowerCase()}|${opponent.toLowerCase()}`;
                            if (!filteredStats.has(key)) {
                                filteredStats.set(key, {
                                    player: player,
                                    opponent: opponent,
                                    wins: 0,
                                    losses: 0,
                                    games: 0
                                });
                            }
                            const stats = filteredStats.get(key);
                            stats.games++;
                            if (team2Won) stats.wins++;
                            if (team1Won) stats.losses++;
                        });
                    });
                }
            });
            statsMap = filteredStats;
        }
        
        statsMap.forEach((stats, key) => {
            if (stats.player.toLowerCase() === playerLower && stats.games >= minGames) {
                const winRate = stats.games > 0 
                    ? (stats.wins / stats.games * 100).toFixed(1) 
                    : 0;
                
                opponents.push({
                    opponent: stats.opponent,
                    wins: stats.wins,
                    losses: stats.losses,
                    games: stats.games,
                    winRate: parseFloat(winRate)
                });
            }
        });
        
        return opponents;
    }

    // Get top 5 opponents (best win rate against)
    getTopOpponents(playerName, minGames = 1, isMonthly = false, selectedMonth = null, selectedYear = null) {
        const opponents = this.getOpponentStats(playerName, minGames, isMonthly, selectedMonth, selectedYear);
        return opponents
            .sort((a, b) => {
                if (b.winRate !== a.winRate) {
                    return b.winRate - a.winRate;
                }
                return b.games - a.games;
            })
            .slice(0, 5);
    }

    // Get bottom 5 opponents (worst win rate against)
    getBottomOpponents(playerName, minGames = 1, isMonthly = false, selectedMonth = null, selectedYear = null) {
        const opponents = this.getOpponentStats(playerName, minGames, isMonthly, selectedMonth, selectedYear);
        return opponents
            .sort((a, b) => {
                if (a.winRate !== b.winRate) {
                    return a.winRate - b.winRate;
                }
                return b.games - a.games;
            })
            .slice(0, 5);
    }

    // Get win rate against specific opponent
    getOpponentWinRate(playerName, opponentName, minGames = 1, isMonthly = false, selectedMonth = null, selectedYear = null) {
        if (isMonthly && selectedMonth !== null && selectedYear !== null) {
            // Calculate on the fly for selected month
            const opponents = this.getOpponentStats(playerName, minGames, isMonthly, selectedMonth, selectedYear);
            const opponent = opponents.find(o => o.opponent.toLowerCase() === opponentName.toLowerCase());
            if (!opponent) return null;
            return {
                opponent: opponent.opponent,
                wins: opponent.wins,
                losses: opponent.losses,
                games: opponent.games,
                winRate: opponent.winRate.toFixed(1)
            };
        }
        
        const key = `${playerName.toLowerCase()}|${opponentName.toLowerCase()}`;
        const statsMap = isMonthly ? this.monthlyOpponentStats : this.opponentStats;
        const stats = statsMap.get(key);
        
        if (!stats || stats.games < minGames) {
            return null;
        }
        
        return {
            opponent: stats.opponent,
            wins: stats.wins,
            losses: stats.losses,
            games: stats.games,
            winRate: (stats.wins / stats.games * 100).toFixed(1)
        };
    }

    // Get all games sorted by date (newest first)
    getAllGames() {
        return [...this.games].sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return dateB - dateA; // Newest first
        });
    }
}
