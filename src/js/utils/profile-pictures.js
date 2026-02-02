// Profile Picture Utilities

// Get profile picture path for a player
function getProfilePicturePath(playerName) {
    if (!playerName) return null;
    
    const name = playerName.toLowerCase().trim();
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
function getPlayerNameWithIcon(playerName, size = 32, clickable = true) {
    if (!playerName) return '';
    
    const picturePath = getProfilePicturePath(playerName);
    const iconSize = `${size}px`;
    // Use a static version number for cache-busting (update this when images change)
    const cacheBuster = picturePath ? '?v=2' : '';
    const iconHtml = picturePath 
        ? `<img src="${picturePath}${cacheBuster}" alt="${playerName}" class="player-icon" style="width: ${iconSize}; height: ${iconSize}; object-fit: contain; border-radius: 50%; margin-right: 0.5rem; vertical-align: middle; display: inline-block;">`
        : '';
    
    const nameClass = clickable ? 'stat-player' : '';
    const onClick = clickable ? `onclick="showPlayerProfile('${playerName.replace(/'/g, "\\'")}')"` : '';
    
    return `<span class="player-name-with-icon ${nameClass}" ${onClick}>
        ${iconHtml}
        <span>${playerName}</span>
    </span>`;
}
