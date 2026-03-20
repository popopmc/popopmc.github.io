/**
 * Profile picture path and player-name-with-icon HTML helpers.
 */

import { canonicalPlayerName } from './player-names.js';

export function getProfilePicturePath(playerName) {
    if (!playerName) return null;
    
    const name = canonicalPlayerName(playerName).toLowerCase();
    const basePath = 'src/assets/profile-pictures/';
    
    // Map of player names to their actual file names (handles special cases)
    const nameMappings = {
        'delta': 'delta_cropped.png',
        'epicjab': 'epicjab_cropped.png',
        'stella': 'cropped-stella.png',
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
        'katie': 'cropped-katie.png',
        'lala': 'cropped-lala.png',
        'nae': 'cropped-nae.png',
        'neptune': 'cropped-neptune.png',
        'pikeman': 'cropped-pikeman.png',
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

/** Builds player name + icon HTML; onclick uses window.showPlayerProfile when clickable.
 * @param {boolean} [iconAfterName=false] - If true, render name then icon (icon to the right of name).
 */
export function getPlayerNameWithIcon(playerName, size = 32, clickable = true, iconAfterName = false) {
    if (!playerName) return '';
    const picturePath = getProfilePicturePath(playerName);
    const iconSize = `${size}px`;
    const cacheBuster = picturePath ? '?v=2' : '';
    const iconMargin = iconAfterName ? 'margin-left: 0.5rem; margin-right: 0;' : 'margin-right: 0.5rem; margin-left: 0;';
    const iconHtml = picturePath 
        ? `<img src="${picturePath}${cacheBuster}" alt="${playerName}" class="player-icon" style="width: ${iconSize}; height: ${iconSize}; object-fit: contain; border-radius: 50%; ${iconMargin} vertical-align: middle; display: inline-block;">`
        : '';
    
    const nameClass = clickable ? 'stat-player' : '';
    const onClick = clickable ? `onclick="showPlayerProfile('${playerName.replace(/'/g, "\\'")}')"` : '';
    
    const nameSpan = `<span>${playerName}</span>`;
    return `<span class="player-name-with-icon ${nameClass}" ${onClick}>
        ${iconAfterName ? nameSpan + iconHtml : iconHtml + nameSpan}
    </span>`;
}
