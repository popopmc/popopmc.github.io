/**
 * Data loading: CSV scores, accolades, and post-load UI updates.
 */

import { state } from '../state/store.js';
import { canonicalPlayerName } from '../utils/player-names.js';
import { displayStats, updateDateDisplay, updateMoreStats } from '../pages/home.js';

export function showLoading() {
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

export async function loadAccolades() {
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

        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return;

        const headers = lines[0].split(',');
        state.playerAccolades.clear();

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const awardName = values[0].trim();
            if (!awardName) continue;

            for (let j = 1; j < values.length; j++) {
                const playerName = values[j].trim();
                if (playerName) {
                    const normalizedName = canonicalPlayerName(playerName).toLowerCase();
                    if (!state.playerAccolades.has(normalizedName)) {
                        state.playerAccolades.set(normalizedName, []);
                    }
                    state.playerAccolades.get(normalizedName).push({
                        award: awardName,
                        tournament: j
                    });
                }
            }
        }

        console.log('Loaded tournament accolades for', state.playerAccolades.size, 'players');
    } catch (error) {
        console.error('Error loading accolades:', error);
    }
}

export async function loadData(onSuccess) {
    showLoading();

    try {
        const cacheBuster = '?v=' + new Date().getTime();
        const fetchOptions = {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        };

        const scoreFiles = [
            'scoresjan.csv',
            'scoresfeb.csv',
            'scoresmarch.csv',
            'scoresapril.csv',
            'scoresmay.csv',
            'scoresjune.csv',
            'scoresjuly.csv',
            'scoresaugust.csv',
            'scoresseptember.csv'
        ];
        const requiredFiles = new Set(['scoresjan.csv', 'scoresfeb.csv']);
        const responses = await Promise.all(
            scoreFiles.map((name) => fetch('data/' + name + cacheBuster, fetchOptions))
        );

        const loadedCounts = [];
        let appended = false;
        for (let i = 0; i < scoreFiles.length; i++) {
            const name = scoreFiles[i];
            const response = responses[i];
            if (!response.ok) {
                if (requiredFiles.has(name)) {
                    throw new Error(`HTTP error loading ${name}! status: ${response.status}`);
                }
                console.warn(name + ' not found or error (status ' + response.status + '). Skipping.');
                continue;
            }
            const csvText = await response.text();
            if (!csvText || csvText.trim().length === 0) {
                if (requiredFiles.has(name)) {
                    throw new Error(name + ' file is empty');
                }
                continue;
            }
            const before = state.statsProcessor.games.length;
            state.statsProcessor.parseCSV(csvText, appended);
            appended = true;
            loadedCounts.push(name.replace('scores', '').replace('.csv', '') + ' +' + (state.statsProcessor.games.length - before));
        }
        console.log('Scores loaded: ' + loadedCounts.join(', ') + ' → ' + state.statsProcessor.games.length + ' total games');
        if (state.statsProcessor.games.length > 0) {
            const sorted = [...state.statsProcessor.games].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const latest = sorted[sorted.length - 1]?.timestamp;
            if (latest) console.log('Latest game date: ' + latest.slice(0, 10));
        }

        state.statsProcessor.calculateStats();

        await loadAccolades();

        displayStats();
        updateDateDisplay();
        updateMoreStats();
        if (typeof onSuccess === 'function') onSuccess();
    } catch (error) {
        console.error('Error loading data:', error);
        const container = document.getElementById('statsGrid');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-primary);">
                    <h2 style="color: #ef4444; margin-bottom: 1rem;">Error Loading Data</h2>
                    <p>Could not load the monthly score files (January through September). Make sure the files exist.</p>
                    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">${error.message}</p>
                    <button id="retryLoadBtn" style="margin-top: 1rem;">Try Again</button>
                </div>
            `;
            const retryBtn = document.getElementById('retryLoadBtn');
            if (retryBtn) retryBtn.addEventListener('click', () => loadData(onSuccess));
        }
    }
}
