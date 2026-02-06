/**
 * Game log page: table, pagination, game rows.
 */

import { state } from '../state/store.js';
import { getPlayerNameWithIcon } from '../utils/profile-pictures.js';
import { emptyStateHtml } from '../utils/dom.js';

export function loadGameLog() {
    const gameLogContent = document.getElementById('gameLogContent');
    if (!gameLogContent || !state.statsProcessor) return;

    const allGames = state.statsProcessor.getAllGames();

    if (allGames.length === 0) {
        gameLogContent.innerHTML = emptyStateHtml('No games found');
        return;
    }

    const sortedGames = [...allGames].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const totalPages = Math.ceil(sortedGames.length / state.gameLogRowsPerPage);
    const startIndex = (state.gameLogCurrentPage - 1) * state.gameLogRowsPerPage;
    const endIndex = startIndex + state.gameLogRowsPerPage;
    const gamesForPage = sortedGames.slice(startIndex, endIndex);

    const gamesByDate = {};
    gamesForPage.forEach(game => {
        const date = new Date(game.timestamp);
        const dateKey = date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        if (!gamesByDate[dateKey]) gamesByDate[dateKey] = [];
        gamesByDate[dateKey].push(game);
    });

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
                            const timeStr = gameDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                            const team1Won = game.team1.score > game.team2.score;
                            const team2Won = game.team2.score > game.team1.score;
                            const team1Score = game.team1.score;
                            const team2Score = game.team2.score;
                            const team1ScoreClass = team1Score > team2Score ? 'score-higher' : team1Score < team2Score ? 'score-lower' : 'score-tie';
                            const team2ScoreClass = team2Score > team1Score ? 'score-higher' : team2Score < team1Score ? 'score-lower' : 'score-tie';
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
                                        ${team1Won ? '<span class="result-win">Team 1 Wins</span>' : team2Won ? '<span class="result-win">Team 2 Wins</span>' : '<span class="result-tie">Tie</span>'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }).join('');

    const paginationHtml = `
        <div class="game-log-pagination">
            <div class="pagination-info">
                Showing ${startIndex + 1}-${Math.min(endIndex, sortedGames.length)} of ${sortedGames.length} games
            </div>
            <div class="pagination-controls">
                <button class="pagination-btn" id="gameLogPrevBtn" ${state.gameLogCurrentPage === 1 ? 'disabled' : ''}>← Previous</button>
                <div class="pagination-pages">
                    ${Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || (page >= state.gameLogCurrentPage - 2 && page <= state.gameLogCurrentPage + 2))
                        .map((page, index, array) => {
                            const prevPage = array[index - 1];
                            const showEllipsis = prevPage && page - prevPage > 1;
                            return `
                                ${showEllipsis ? '<span class="pagination-ellipsis">...</span>' : ''}
                                <button class="pagination-page-btn ${page === state.gameLogCurrentPage ? 'active' : ''}" data-page="${page}">${page}</button>
                            `;
                        }).join('')}
                </div>
                <button class="pagination-btn" id="gameLogNextBtn" ${state.gameLogCurrentPage === totalPages ? 'disabled' : ''}>Next →</button>
            </div>
        </div>
    `;

    gameLogContent.innerHTML = gamesHtml + paginationHtml;

    const prevBtn = document.getElementById('gameLogPrevBtn');
    const nextBtn = document.getElementById('gameLogNextBtn');
    const pageBtns = document.querySelectorAll('.pagination-page-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (state.gameLogCurrentPage > 1) {
                state.gameLogCurrentPage--;
                loadGameLog();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (state.gameLogCurrentPage < totalPages) {
                state.gameLogCurrentPage++;
                loadGameLog();
            }
        });
    }
    pageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page, 10);
            if (page !== state.gameLogCurrentPage) {
                state.gameLogCurrentPage = page;
                loadGameLog();
            }
        });
    });
}
