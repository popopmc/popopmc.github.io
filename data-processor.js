// CSV Parser and Stats Calculator
class StatsProcessor {
    constructor() {
        this.games = [];
        this.playerStats = new Map();
        this.teammateStats = new Map();
    }

    // Parse CSV data
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        this.games = [];
        
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
                this.games.push(game);
            }
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

        this.games.forEach(game => {
            const team1Won = game.team1.score > game.team2.score;
            const team2Won = game.team2.score > game.team1.score;
            
            // Process Team 1
            game.team1.players.forEach(player => {
                this.updatePlayerStats(player, team1Won, team2Won, game.team1.score, game.team2.score);
                this.updateTeammateStats(player, game.team1.players, team1Won, team2Won);
            });
            
            // Process Team 2
            game.team2.players.forEach(player => {
                this.updatePlayerStats(player, team2Won, team1Won, game.team2.score, game.team1.score);
                this.updateTeammateStats(player, game.team2.players, team2Won, team1Won);
            });
        });
    }

    // Update individual player statistics
    updatePlayerStats(player, won, lost, goalsFor, goalsAgainst) {
        if (!this.playerStats.has(player)) {
            this.playerStats.set(player, {
                wins: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                plusMinus: 0
            });
        }
        
        const stats = this.playerStats.get(player);
        if (won) stats.wins++;
        if (lost) stats.losses++;
        stats.goalsFor += goalsFor;
        stats.goalsAgainst += goalsAgainst;
        stats.plusMinus = stats.goalsFor - stats.goalsAgainst;
    }

    // Update teammate combination statistics
    updateTeammateStats(player, teammates, won, lost) {
        teammates.forEach(teammate => {
            if (player === teammate) return;
            
            // Create sorted key for consistent pairing
            const pair = [player, teammate].sort().join(' & ');
            
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
            .map(([name, stats]) => ({
                name,
                wins: stats.wins,
                losses: stats.losses,
                games: stats.wins + stats.losses,
                winRate: stats.wins + stats.losses > 0 
                    ? (stats.wins / (stats.wins + stats.losses) * 100).toFixed(1) 
                    : 0,
                goalsFor: stats.goalsFor,
                goalsAgainst: stats.goalsAgainst,
                plusMinus: stats.plusMinus
            }))
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
}
