/**
 * Data loading: CSV scores, accolades, and post-load UI updates.
 */

import { state } from '../state/store.js';
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
                    const normalizedName = playerName.toLowerCase();
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

        state.statsProcessor.parseCSV(csvTextJan, false);
        state.statsProcessor.parseCSV(csvTextFeb, true);
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
                    <p>Could not load data files (scoresjan.csv and scoresfeb.csv). Make sure the files exist.</p>
                    <p style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">${error.message}</p>
                    <button id="retryLoadBtn" style="margin-top: 1rem;">Try Again</button>
                </div>
            `;
            const retryBtn = document.getElementById('retryLoadBtn');
            if (retryBtn) retryBtn.addEventListener('click', () => loadData(onSuccess));
        }
    }
}
