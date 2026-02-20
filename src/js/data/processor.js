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

    // Get monthly player stats (current month only; from calculateStats cache)
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

    // Get player stats for an arbitrary month/year (computed from this.games)
    getPlayerStatsForMonth(month, year, minGames = 1) {
        const map = new Map();
        const gamesInMonth = this.games.filter(game => {
            const d = new Date(game.timestamp);
            return d.getMonth() === month && d.getFullYear() === year;
        });
        gamesInMonth.forEach(game => {
            const team1Won = game.team1.score > game.team2.score;
            const team2Won = game.team2.score > game.team1.score;
            const ensure = (name) => {
                if (!map.has(name)) {
                    map.set(name, { wins: 0, losses: 0, ties: 0, goalsFor: 0, goalsAgainst: 0, plusMinus: 0 });
                }
                return map.get(name);
            };
            game.team1.players.forEach(player => {
                const s = ensure(player);
                if (team1Won) s.wins++;
                else if (team2Won) s.losses++;
                else s.ties++;
                s.goalsFor += game.team1.score;
                s.goalsAgainst += game.team2.score;
            });
            game.team2.players.forEach(player => {
                const s = ensure(player);
                if (team2Won) s.wins++;
                else if (team1Won) s.losses++;
                else s.ties++;
                s.goalsFor += game.team2.score;
                s.goalsAgainst += game.team1.score;
            });
        });
        return Array.from(map.entries())
            .map(([name, stats]) => {
                const totalGames = stats.wins + stats.losses + stats.ties;
                return {
                    name,
                    wins: stats.wins,
                    losses: stats.losses,
                    ties: stats.ties,
                    games: totalGames,
                    winRate: totalGames > 0 ? (stats.wins / totalGames * 100).toFixed(1) : 0,
                    goalsFor: stats.goalsFor,
                    goalsAgainst: stats.goalsAgainst,
                    plusMinus: stats.goalsFor - stats.goalsAgainst
                };
            })
            .filter(p => p.games >= minGames)
            .sort((a, b) => b.games - a.games);
    }

    /** Same as getPlayerStatsForMonth but from a provided games array (used for records with Feb+ filter). */
    _getPlayerStatsForMonthFromGames(month, year, minGames = 1, gamesArray) {
        const map = new Map();
        const gamesInMonth = gamesArray.filter(game => {
            const d = new Date(game.timestamp);
            return d.getMonth() === month && d.getFullYear() === year;
        });
        gamesInMonth.forEach(game => {
            const team1Won = game.team1.score > game.team2.score;
            const team2Won = game.team2.score > game.team1.score;
            const ensure = (name) => {
                if (!map.has(name)) {
                    map.set(name, { wins: 0, losses: 0, ties: 0, goalsFor: 0, goalsAgainst: 0, plusMinus: 0 });
                }
                return map.get(name);
            };
            game.team1.players.forEach(player => {
                const s = ensure(player);
                if (team1Won) s.wins++;
                else if (team2Won) s.losses++;
                else s.ties++;
                s.goalsFor += game.team1.score;
                s.goalsAgainst += game.team2.score;
            });
            game.team2.players.forEach(player => {
                const s = ensure(player);
                if (team2Won) s.wins++;
                else if (team1Won) s.losses++;
                else s.ties++;
                s.goalsFor += game.team2.score;
                s.goalsAgainst += game.team1.score;
            });
        });
        return Array.from(map.entries())
            .map(([name, stats]) => {
                const totalGames = stats.wins + stats.losses + stats.ties;
                return {
                    name,
                    wins: stats.wins,
                    losses: stats.losses,
                    ties: stats.ties,
                    games: totalGames,
                    winRate: totalGames > 0 ? (stats.wins / totalGames * 100).toFixed(1) : 0,
                    goalsFor: stats.goalsFor,
                    goalsAgainst: stats.goalsAgainst,
                    plusMinus: stats.goalsFor - stats.goalsAgainst
                };
            })
            .filter(p => p.games >= minGames)
            .sort((a, b) => b.games - a.games);
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

    // --- Records page helpers (count from February onwards only) ---

    /** Games from February onwards (month >= 1). Records page uses this. */
    getGamesFromFebruary() {
        return this.games.filter(game => new Date(game.timestamp).getMonth() >= 1);
    }

    /** All (month, year) that have at least one game, February onwards only. */
    getMonthsWithGames() {
        const gamesFromFeb = this.getGamesFromFebruary();
        const seen = new Set();
        gamesFromFeb.forEach(game => {
            const d = new Date(game.timestamp);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!seen.has(key)) seen.add(key);
        });
        return Array.from(seen).map(key => {
            const [y, m] = key.split('-').map(Number);
            return { month: m, year: y };
        }).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    }

    /** Most games in a single month (leaderboard), Feb onwards. Returns [{ name, games, month, year }, ...] */
    getRecordsMostGamesInMonth(topN = 10) {
        const entries = [];
        const gamesFromFeb = this.getGamesFromFebruary();
        this.getMonthsWithGames().forEach(({ month, year }) => {
            const stats = this._getPlayerStatsForMonthFromGames(month, year, 1, gamesFromFeb);
            stats.forEach(p => entries.push({ name: p.name, games: p.games, month, year }));
        });
        return entries.sort((a, b) => b.games - a.games).slice(0, topN);
    }

    /** Most wins in a single month (Feb onwards). */
    getRecordsMostWinsInMonth(topN = 10) {
        const entries = [];
        const gamesFromFeb = this.getGamesFromFebruary();
        this.getMonthsWithGames().forEach(({ month, year }) => {
            const stats = this._getPlayerStatsForMonthFromGames(month, year, 1, gamesFromFeb);
            stats.forEach(p => entries.push({ name: p.name, wins: p.wins, month, year }));
        });
        return entries.sort((a, b) => b.wins - a.wins).slice(0, topN);
    }

    /** Most losses in a single month (Feb onwards). */
    getRecordsMostLossesInMonth(topN = 10) {
        const entries = [];
        const gamesFromFeb = this.getGamesFromFebruary();
        this.getMonthsWithGames().forEach(({ month, year }) => {
            const stats = this._getPlayerStatsForMonthFromGames(month, year, 1, gamesFromFeb);
            stats.forEach(p => entries.push({ name: p.name, losses: p.losses, month, year }));
        });
        return entries.sort((a, b) => b.losses - a.losses).slice(0, topN);
    }

    /** Most games played in any 24-hour window (Feb onwards). Returns [{ name, games, date }, ...] where date is the end of that window. */
    getRecordsMostGamesIn24Hours(topN = 10) {
        const MS_24H = 24 * 60 * 60 * 1000;
        const gamesFromFeb = [...this.getGamesFromFebruary()].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const playerTimestamps = new Map(); // name -> number[]
        gamesFromFeb.forEach(game => {
            const t = new Date(game.timestamp).getTime();
            const players = new Set([...game.team1.players, ...game.team2.players]);
            players.forEach(name => {
                if (!playerTimestamps.has(name)) playerTimestamps.set(name, []);
                playerTimestamps.get(name).push(t);
            });
        });
        const maxIn24h = [];
        playerTimestamps.forEach((times, name) => {
            times.sort((a, b) => a - b);
            let best = 0;
            let bestEnd = null;
            for (let i = 0; i < times.length; i++) {
                const end = times[i];
                const start = end - MS_24H;
                let count = 0;
                for (let j = i; j >= 0 && times[j] > start; j--) count++;
                if (count > best) {
                    best = count;
                    bestEnd = end;
                }
            }
            if (best > 0 && bestEnd !== null) {
                maxIn24h.push({ name, games: best, date: new Date(bestEnd) });
            }
        });
        return maxIn24h.sort((a, b) => b.games - a.games).slice(0, topN);
    }

    /** Highest win streak (consecutive wins), Feb onwards. Returns [{ name, streak, date }, ...]. */
    getRecordWinStreaks(topN = 10) {
        const sorted = [...this.getGamesFromFebruary()].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const maxStreak = new Map();
        const maxStreakDate = new Map();
        const currentStreak = new Map();
        const playerWon = (game, name) => {
            const t1 = game.team1.players.some(p => p.toLowerCase() === name.toLowerCase());
            const won = t1 ? game.team1.score > game.team2.score : game.team2.score > game.team1.score;
            return won;
        };
        sorted.forEach(game => {
            const ts = game.timestamp;
            const allPlayers = [...new Set([...game.team1.players, ...game.team2.players])];
            allPlayers.forEach(name => {
                const won = playerWon(game, name);
                const cur = currentStreak.get(name) || 0;
                const max = maxStreak.get(name) || 0;
                if (won) {
                    const next = cur + 1;
                    currentStreak.set(name, next);
                    const newMax = Math.max(max, next);
                    maxStreak.set(name, newMax);
                    if (next > max) maxStreakDate.set(name, new Date(ts));
                } else {
                    currentStreak.set(name, 0);
                    maxStreak.set(name, Math.max(max, cur));
                }
            });
        });
        maxStreak.forEach((streak, name) => {
            const cur = currentStreak.get(name) || 0;
            maxStreak.set(name, Math.max(streak, cur));
        });
        return Array.from(maxStreak.entries())
            .map(([name, streak]) => ({ name, streak, date: maxStreakDate.get(name) || null }))
            .sort((a, b) => b.streak - a.streak)
            .slice(0, topN);
    }

    /** Highest losing streak (consecutive losses), Feb onwards. Returns [{ name, streak, date }, ...]. */
    getRecordLosingStreaks(topN = 10) {
        const sorted = [...this.getGamesFromFebruary()].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const maxStreak = new Map();
        const maxStreakDate = new Map();
        const currentStreak = new Map();
        const playerLost = (game, name) => {
            const t1 = game.team1.players.some(p => p.toLowerCase() === name.toLowerCase());
            const lost = t1 ? game.team1.score < game.team2.score : game.team2.score < game.team1.score;
            return lost;
        };
        sorted.forEach(game => {
            const ts = game.timestamp;
            const allPlayers = [...new Set([...game.team1.players, ...game.team2.players])];
            allPlayers.forEach(name => {
                const lost = playerLost(game, name);
                const cur = currentStreak.get(name) || 0;
                const max = maxStreak.get(name) || 0;
                if (lost) {
                    const next = cur + 1;
                    currentStreak.set(name, next);
                    const newMax = Math.max(max, next);
                    maxStreak.set(name, newMax);
                    if (next > max) maxStreakDate.set(name, new Date(ts));
                } else {
                    currentStreak.set(name, 0);
                    maxStreak.set(name, Math.max(max, cur));
                }
            });
        });
        maxStreak.forEach((streak, name) => {
            const cur = currentStreak.get(name) || 0;
            maxStreak.set(name, Math.max(streak, cur));
        });
        return Array.from(maxStreak.entries())
            .map(([name, streak]) => ({ name, streak, date: maxStreakDate.get(name) || null }))
            .sort((a, b) => b.streak - a.streak)
            .slice(0, topN);
    }

    /** Win rate as keeper (min games as keeper), Feb onwards. Returns [{ name, games, wins, winRate }, ...]. */
    getRecordWinRateAsKeeper(minGames = 5) {
        const map = new Map(); // name -> { wins, losses }
        this.getGamesFromFebruary().forEach(game => {
            const team1Won = game.team1.score > game.team2.score;
            const team2Won = game.team2.score > game.team1.score;
            [game.team1.players, game.team2.players].forEach((players, teamIndex) => {
                const won = teamIndex === 0 ? team1Won : team2Won;
                const keeper = players[0];
                if (!keeper) return;
                if (!map.has(keeper)) map.set(keeper, { wins: 0, losses: 0 });
                const s = map.get(keeper);
                if (won) s.wins++; else s.losses++;
            });
        });
        return Array.from(map.entries())
            .map(([name, s]) => {
                const games = s.wins + s.losses;
                return {
                    name,
                    games,
                    wins: s.wins,
                    winRate: games >= minGames ? (s.wins / games * 100).toFixed(1) : null
                };
            })
            .filter(p => p.games >= minGames && p.winRate !== null)
            .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
            .slice(0, 10);
    }

    /** Win rate as striker (min games as striker), Feb onwards. */
    getRecordWinRateAsStriker(minGames = 5) {
        const map = new Map();
        this.getGamesFromFebruary().forEach(game => {
            const team1Won = game.team1.score > game.team2.score;
            const team2Won = game.team2.score > game.team1.score;
            [game.team1.players, game.team2.players].forEach((players, teamIndex) => {
                const won = teamIndex === 0 ? team1Won : team2Won;
                const strikers = players.slice(1).filter(Boolean);
                strikers.forEach(striker => {
                    if (!map.has(striker)) map.set(striker, { wins: 0, losses: 0 });
                    const s = map.get(striker);
                    if (won) s.wins++; else s.losses++;
                });
            });
        });
        return Array.from(map.entries())
            .map(([name, s]) => {
                const games = s.wins + s.losses;
                return {
                    name,
                    games,
                    wins: s.wins,
                    winRate: games >= minGames ? (s.wins / games * 100).toFixed(1) : null
                };
            })
            .filter(p => p.games >= minGames && p.winRate !== null)
            .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
            .slice(0, 10);
    }

    /**
     * Events when someone new took the lead (record broken). Process games in order and detect leader changes.
     * Returns [{ playerName, achievement, value, timestamp }, ...] newest first.
     */
    getRecordBreakingEvents(limit = 25) {
        const games = [...this.getGamesFromFebruary()].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const events = [];
        const monthly = new Map();
        const prevLeader = new Map();
        const getMonthKey = (ts) => {
            const d = new Date(ts);
            return `${d.getFullYear()}-${d.getMonth()}`;
        };
        const ensureMonth = (key) => {
            if (!monthly.has(key)) {
                monthly.set(key, { games: new Map(), wins: new Map(), losses: new Map() });
            }
            return monthly.get(key);
        };
        const getLeader = (map, label, fmt) => {
            let best = null;
            map.forEach((val, name) => {
                if (best === null || val > best.value) best = { name, value: val };
            });
            return best ? { name: best.name, value: best.value, label, valueFmt: fmt(best.value) } : null;
        };
        let prevStreakBest = 0;
        let prevStreakHolder = null;
        const currentStreak = new Map();
        const maxStreak = new Map();
        let prevLosingStreakBest = 0;
        let prevLosingStreakHolder = null;
        const currentLosingStreak = new Map();
        const maxLosingStreak = new Map();
        const MS_24H = 24 * 60 * 60 * 1000;
        const playerTimestamps = new Map();
        let prevBest24h = 0;
        let prevBest24hHolder = null;
        const playerWon = (game, name) => {
            const t1 = game.team1.players.some(p => p.toLowerCase() === name.toLowerCase());
            return t1 ? game.team1.score > game.team2.score : game.team2.score > game.team1.score;
        };
        const maxGamesIn24h = (times) => {
            if (times.length === 0) return 0;
            const sorted = [...times].sort((a, b) => a - b);
            let best = 0;
            for (let i = 0; i < sorted.length; i++) {
                const end = sorted[i];
                const start = end - MS_24H;
                let count = 0;
                for (let j = i; j >= 0 && sorted[j] > start; j--) count++;
                best = Math.max(best, count);
            }
            return best;
        };

        games.forEach(game => {
            const ts = game.timestamp;
            const monthKey = getMonthKey(ts);
            const d = new Date(ts);
            const month = d.getMonth();
            const year = d.getFullYear();
            const team1Won = game.team1.score > game.team2.score;
            const team2Won = game.team2.score > game.team1.score;
            const m = ensureMonth(monthKey);

            const addGame = (player, won) => {
                if (!player) return;
                m.games.set(player, (m.games.get(player) || 0) + 1);
                m.wins.set(player, (m.wins.get(player) || 0) + (won ? 1 : 0));
                m.losses.set(player, (m.losses.get(player) || 0) + (won ? 0 : 1));
            };
            game.team1.players.forEach(p => addGame(p, team1Won));
            game.team2.players.forEach(p => addGame(p, team2Won));

            ['games', 'wins', 'losses'].forEach((cat, i) => {
                const labels = ['Most games played in a month', 'Most games won in a month', 'Most games lost in a month'];
                const fmt = (v) => (cat === 'games' ? `${v} games` : cat === 'wins' ? `${v} wins` : `${v} losses`);
                const leader = getLeader(m[cat], labels[i], fmt);
                const key = `${monthKey}-${cat}`;
                const prev = prevLeader.get(key);
                if (leader && (!prev || prev.name !== leader.name)) {
                    events.push({
                        playerName: leader.name,
                        achievement: leader.label,
                        value: leader.valueFmt,
                        timestamp: ts,
                        month,
                        year
                    });
                    prevLeader.set(key, leader);
                }
            });

            const allPlayers = [...new Set([...game.team1.players, ...game.team2.players])];
            const t = new Date(ts).getTime();
            allPlayers.forEach(name => {
                if (!playerTimestamps.has(name)) playerTimestamps.set(name, []);
                playerTimestamps.get(name).push(t);
            });
            allPlayers.forEach(name => {
                const won = playerWon(game, name);
                const cur = currentStreak.get(name) || 0;
                if (won) {
                    const next = cur + 1;
                    currentStreak.set(name, next);
                    const max = maxStreak.get(name) || 0;
                    const newMax = Math.max(max, next);
                    maxStreak.set(name, newMax);
                    if (newMax > prevStreakBest && prevStreakHolder !== name) {
                        events.push({
                            playerName: name,
                            achievement: 'Highest win streak',
                            value: `${newMax} wins`,
                            timestamp: ts
                        });
                        prevStreakBest = newMax;
                        prevStreakHolder = name;
                    } else if (newMax > prevStreakBest) {
                        prevStreakBest = newMax;
                    }
                    currentLosingStreak.set(name, 0);
                } else {
                    const curL = currentLosingStreak.get(name) || 0;
                    const nextL = curL + 1;
                    currentLosingStreak.set(name, nextL);
                    const maxL = maxLosingStreak.get(name) || 0;
                    const newMaxL = Math.max(maxL, nextL);
                    maxLosingStreak.set(name, newMaxL);
                    if (newMaxL > prevLosingStreakBest && prevLosingStreakHolder !== name) {
                        events.push({
                            playerName: name,
                            achievement: 'Highest losing streak',
                            value: `${newMaxL} losses`,
                            timestamp: ts
                        });
                        prevLosingStreakBest = newMaxL;
                        prevLosingStreakHolder = name;
                    } else if (newMaxL > prevLosingStreakBest) {
                        prevLosingStreakBest = newMaxL;
                    }
                    currentStreak.set(name, 0);
                }
            });
            let best24h = 0;
            let best24hName = null;
            allPlayers.forEach(name => {
                const times = playerTimestamps.get(name) || [];
                const n = maxGamesIn24h(times);
                if (n > best24h) {
                    best24h = n;
                    best24hName = name;
                }
            });
            if (best24hName && best24h > prevBest24h && prevBest24hHolder !== best24hName) {
                events.push({
                    playerName: best24hName,
                    achievement: 'Most games in 24 hours',
                    value: `${best24h} games`,
                    timestamp: ts
                });
                prevBest24h = best24h;
                prevBest24hHolder = best24hName;
            } else if (best24hName && best24h > prevBest24h) {
                prevBest24h = best24h;
            }
        });

        return events
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }

    /**
     * Server stats since February: total players, games played, time played (from lobby first-to-last), goals scored, lobbies hosted.
     * Lobby = games where gap between consecutive games is ≤ 1 hour; > 1 hour starts a new lobby.
     * Time played = sum per lobby of (last game timestamp - first game timestamp).
     */
    getServerStats() {
        const games = [...this.getGamesFromFebruary()].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const ONE_HOUR_MS = 60 * 60 * 1000;
        let lobbiesHosted = 1;
        let timePlayedMs = 0;
        let lobbyFirstTs = games.length ? new Date(games[0].timestamp).getTime() : 0;
        for (let i = 1; i < games.length; i++) {
            const prevTs = new Date(games[i - 1].timestamp).getTime();
            const currTs = new Date(games[i].timestamp).getTime();
            if (currTs - prevTs > ONE_HOUR_MS) {
                timePlayedMs += prevTs - lobbyFirstTs;
                lobbyFirstTs = currTs;
                lobbiesHosted++;
            }
        }
        if (games.length > 0) {
            const lastTs = new Date(games[games.length - 1].timestamp).getTime();
            timePlayedMs += lastTs - lobbyFirstTs;
        }
        const playerSet = new Set();
        let goalsScored = 0;
        games.forEach(g => {
            g.team1.players.forEach(p => playerSet.add(p));
            g.team2.players.forEach(p => playerSet.add(p));
            goalsScored += (g.team1.score || 0) + (g.team2.score || 0);
        });
        return {
            totalPlayers: playerSet.size,
            gamesPlayed: games.length,
            timePlayedMs,
            goalsScored,
            lobbiesHosted
        };
    }
}

export { StatsProcessor };
