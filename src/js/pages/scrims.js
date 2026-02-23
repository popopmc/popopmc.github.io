/**
 * Scrims page: scrim-vs-scrim head-to-head table.
 */

import { state } from '../state/store.js';
import { emptyStateHtml } from '../utils/dom.js';

export function loadScrimsPage() {
    const container = document.getElementById('scrimsContent');
    if (!container) return;

    if (!state.statsProcessor) {
        container.innerHTML = emptyStateHtml('No data loaded.');
        return;
    }

    const p = state.statsProcessor;
    const { teams, matrix } = p.getScrimHeadToHead();

    const h2hRows = teams.map(rowTeam => `
        <tr>
            <td class="scrims-h2h-team">${rowTeam}</td>
            ${teams.map(colTeam => {
                if (rowTeam === colTeam) return '<td class="scrims-h2h-cell scrims-h2h-empty">—</td>';
                const cell = matrix[rowTeam] && matrix[rowTeam][colTeam];
                const w = cell ? cell.wins : 0;
                const l = cell ? cell.losses : 0;
                const text = (w + l) > 0 ? `${w}-${l}` : '—';
                return `<td class="scrims-h2h-cell">${text}</td>`;
            }).join('')}
        </tr>
    `).join('');

    const h2hHtml = `
        <section class="scrims-section">
            <h2 class="scrims-section-title">Head-to-head (scrim vs scrim only)</h2>
            <p class="scrims-section-note">Row team vs column team: W-L. Does not include games vs random teams.</p>
            <div class="scrims-h2h-table-wrap">
                <table class="scrims-h2h-table">
                    <thead>
                        <tr>
                            <th></th>
                            ${teams.map(t => `<th class="scrims-h2h-header">${t}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${h2hRows}
                    </tbody>
                </table>
            </div>
        </section>
    `;

    container.innerHTML = h2hHtml;
}
