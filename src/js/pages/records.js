/**
 * Records page: banner, search, hall of fame. Category list on "home"; each category opens a sub-view.
 */

import { state } from '../state/store.js';
import { getPlayerNameWithIcon } from '../utils/profile-pictures.js';
import { emptyStateHtml } from '../utils/dom.js';

function monthYearLabel(month, year) {
    const date = new Date(year, month);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Switch to a records sub-view (e.g. 'activity') or back to 'home'. */
export function showRecordsCategory(category) {
    state.recordsView = category || 'home';
    loadRecordsPage();
    window.scrollTo(0, 0);
}

/** Toggle Records News between last 5 and full log; refreshes the news panel. */
export function toggleRecordsNewsExpanded() {
    state.recordsNewsExpanded = !state.recordsNewsExpanded;
    loadRecordsPage();
}

export function loadRecordsPage() {
    const bannerEl = document.getElementById('recordsBanner');
    const container = document.getElementById('recordsContent');
    if (!container) return;

    if (!state.statsProcessor) {
        if (bannerEl) bannerEl.innerHTML = '';
        container.innerHTML = emptyStateHtml('No data loaded.');
        return;
    }

    const p = state.statsProcessor;
    const gamesFromFeb = p.getGamesFromFebruary();
    const totalGames = gamesFromFeb.length;
    const playerSet = new Set();
    gamesFromFeb.forEach(game => {
        game.team1.players.forEach(pl => playerSet.add(pl));
        game.team2.players.forEach(pl => playerSet.add(pl));
    });
    const totalPlayers = playerSet.size;

    if (bannerEl) {
        bannerEl.innerHTML = `
            <div class="records-banner-inner">
                <div class="records-banner-number">${totalGames.toLocaleString()}</div>
                <div class="records-banner-sub">games played by <strong>${totalPlayers.toLocaleString()}</strong> players</div>
            </div>
        `;
    }

    const view = state.recordsView || 'home';
    const searchForm = document.getElementById('recordsSearchForm');
    if (bannerEl) bannerEl.style.display = view === 'home' ? '' : 'none';
    if (searchForm) searchForm.style.display = view === 'home' ? '' : 'none';

    if (view === 'home') {
        const server = p.getServerStats();
        const hours = Math.floor(server.timePlayedMs / (1000 * 60 * 60));
        container.innerHTML = `
            <div class="records-hof">
                <h2 class="records-welcome-title">Welcome to the Hall of Fame</h2>
                <ul class="records-category-list">
                    <li><a href="#" class="record-category-link" data-category="activity">Activity records</a></li>
                    <li><a href="#" class="record-category-link" data-category="winrate">Winrate records</a></li>
                    <li><a href="#" class="record-category-link" data-category="other">Other records</a></li>
                </ul>
            </div>
            <section class="server-stats">
                <h3 class="server-stats-title">Server stats (since Feb)</h3>
                <div class="server-stats-row"><span class="server-stats-label">Total players</span><span class="server-stats-value">${server.totalPlayers.toLocaleString()}</span></div>
                <div class="server-stats-row"><span class="server-stats-label">Games played</span><span class="server-stats-value">${server.gamesPlayed.toLocaleString()}</span></div>
                <div class="server-stats-row"><span class="server-stats-label">Time played</span><span class="server-stats-value">${hours.toLocaleString()} hours</span></div>
                <div class="server-stats-row"><span class="server-stats-label">Goals scored</span><span class="server-stats-value">${server.goalsScored.toLocaleString()}</span></div>
                <div class="server-stats-row"><span class="server-stats-label">Lobbies hosted</span><span class="server-stats-value">${server.lobbiesHosted.toLocaleString()}</span></div>
            </section>
        `;
        const newsEl = document.getElementById('recordsNews');
        if (newsEl) {
            const limit = state.recordsNewsExpanded ? 999 : 5;
            const events = p.getRecordBreakingEvents(limit);
            const timeAgo = (ts) => {
                const d = new Date(ts);
                const now = new Date();
                const days = Math.floor((now - d) / (24 * 60 * 60 * 1000));
                if (days <= 0) return 'Today';
                if (days === 1) return '1 day ago';
                if (days < 7) return `${days} days ago`;
                if (days < 30) return `${Math.floor(days / 7)} week(s) ago`;
                if (days < 365) return `${Math.floor(days / 30)} month(s) ago`;
                return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            };
            const formatWhen = (ev) => {
                const d = new Date(ev.timestamp);
                const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0 || d.getSeconds() !== 0;
                return hasTime
                    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            };
            const linkLabel = state.recordsNewsExpanded ? 'Show less' : 'View all time log';
            newsEl.innerHTML = `
                <h3 class="records-news-title">Records News</h3>
                <p class="records-news-asof">When someone new took the lead</p>
                <ul class="records-news-list">
                    ${events.length ? events.map(ev => `
                        <li class="records-news-item">
                            <span class="records-news-trophy" aria-hidden="true">🏆</span>
                            <div class="records-news-body">
                                <span class="records-news-headline">${getPlayerNameWithIcon(ev.playerName, 24, true)} broke the record for ${ev.achievement}</span>
                                <span class="records-news-value">${ev.value}</span>
                                <span class="records-news-when">${formatWhen(ev)}</span>
                            </div>
                        </li>
                    `).join('') : '<li class="records-news-item records-news-empty">No record changes yet.</li>'}
                </ul>
                <p class="records-news-footer">
                    <a href="#" class="records-news-view-all" onclick="window.toggleRecordsNewsExpanded && window.toggleRecordsNewsExpanded(); return false;">${linkLabel}</a>
                </p>
            `;
        }
        const layout = container.closest('.records-layout');
        if (layout) layout.classList.remove('records-layout--category');
        return;
    }

    const newsEl = document.getElementById('recordsNews');
    if (newsEl) newsEl.innerHTML = '';
    const layout = container.closest('.records-layout');
    if (layout) layout.classList.add('records-layout--category');

    const renderCard = (name, value, sub = '', index = 0) =>
        `<div class="record-card ${index === 0 ? 'record-card--lead' : ''}" data-index="${index}">
            <div class="record-card-player">${getPlayerNameWithIcon(name, 32, true)}</div>
            <div class="record-card-value">${value}</div>
            ${sub ? `<div class="record-card-sub">${sub}</div>` : ''}
        </div>`;

    /** Layout: 1 (top), then 2, then rows of 3; top 9 only. */
    const section = (title, items, emptyMsg, formatter) => {
        const top = items.slice(0, 9);
        if (!top.length) return `<div class="record-section-cell"><div class="record-section-cell-inner"><section class="record-section"><h3 class="record-section-title">${title}</h3><div class="record-grid">${emptyStateHtml(emptyMsg)}</div></section></div></div>`;
        const lead = formatter(top[0], 0);
        const rest = top.slice(1);
        let rowsHtml = '';
        if (rest.length > 0) {
            const row2 = rest.slice(0, 2).map((item, i) => formatter(item, 1 + i)).join('');
            rowsHtml += `<div class="record-grid-row record-grid-row--2">${row2}</div>`;
        }
        for (let start = 2; start < rest.length; start += 3) {
            const chunk = rest.slice(start, start + 3).map((item, i) => formatter(item, start + 1 + i)).join('');
            rowsHtml += `<div class="record-grid-row record-grid-row--3">${chunk}</div>`;
        }
        return `
        <div class="record-section-cell">
            <div class="record-section-cell-inner">
                <section class="record-section">
                    <h3 class="record-section-title">${title}</h3>
                    <div class="record-grid">
                        <div class="record-grid-lead">${lead}</div>
                        ${rowsHtml}
                    </div>
                </section>
            </div>
        </div>`;
    };

    const mostGamesInMonth = p.getRecordsMostGamesInMonth(10);
    const mostGamesIn24Hours = p.getRecordsMostGamesIn24Hours(10);
    const mostWinsInMonth = p.getRecordsMostWinsInMonth(10);
    const mostLossesInMonth = p.getRecordsMostLossesInMonth(10);
    const winStreaks = p.getRecordWinStreaks(10);
    const losingStreaks = p.getRecordLosingStreaks(10);
    const gkWinRate = p.getRecordWinRateAsKeeper(50);
    const strikerWinRate = p.getRecordWinRateAsStriker(50);

    const backLink = '<p class="records-back-wrap"><a href="#" class="records-back-link">← Back to Records</a></p>';

    if (view === 'activity') {
        container.innerHTML = backLink + `
            <div class="record-category">
                <h3 class="record-category-heading">Activity records</h3>
                ${section('Most games played in a month', mostGamesInMonth, 'No monthly data.', (r, i) => renderCard(r.name, `${r.games} games`, monthYearLabel(r.month, r.year), i))}
                ${section('Most games in 24 hours', mostGamesIn24Hours, 'No data.', (r, i) => renderCard(r.name, `${r.games} games`, r.date ? r.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '', i))}
                ${section('Most games won in a month', mostWinsInMonth, 'No monthly data.', (r, i) => renderCard(r.name, `${r.wins} wins`, monthYearLabel(r.month, r.year), i))}
                ${section('Most games lost in a month', mostLossesInMonth, 'No monthly data.', (r, i) => renderCard(r.name, `${r.losses} losses`, monthYearLabel(r.month, r.year), i))}
            </div>
        `;
        return;
    }

    if (view === 'winrate') {
        container.innerHTML = backLink + `
            <div class="record-category">
                <h3 class="record-category-heading">Winrate records</h3>
                ${section('Highest win rate as GK (min 50 games)', gkWinRate, 'No GK data.', (r, i) => renderCard(r.name, `${r.winRate}%`, `${r.games} games as GK`, i))}
                ${section('Highest win rate as striker (min 50 games)', strikerWinRate, 'No striker data.', (r, i) => renderCard(r.name, `${r.winRate}%`, `${r.games} games as striker`, i))}
            </div>
        `;
        return;
    }

    if (view === 'other') {
        container.innerHTML = backLink + `
            <div class="record-category">
                <h3 class="record-category-heading">Other records</h3>
                ${section('Highest win streak', winStreaks, 'No streak data.', (r, i) => renderCard(r.name, `${r.streak} wins`, '', i))}
                ${section('Highest losing streak', losingStreaks, 'No streak data.', (r, i) => renderCard(r.name, `${r.streak} losses`, '', i))}
            </div>
        `;
    }
}
