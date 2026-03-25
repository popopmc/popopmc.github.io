/**
 * Canonical player names: merge CSV typos / alternate spellings so stats and UI stay consistent.
 * Keys are lowercase; values are the preferred display/storage form.
 */
const PLAYER_NICKNAMES = {
    akil: ['akil', 'baka', 'aki'],
    anon: ['anon', 'klanon', 'panon'],
    ash: ['ash'],
    aster: ['aster'],
    baps: ['baps', 'bapsy'],
    danny: ['danny', 'fanny'],
    delta: ['delta'],
    e: ['e'],
    ella: ['ella', 'adinross'],
    ema: ['ema', 'herb'],
    epicjab: ['epicjab', 'jab'],
    eri: ['eri', 'israeri', 'hitleri', 'majineri', 'stinkyeri'],
    gentle: ['gentle', 'gebtle', 'gw', 'greatwhite'],
    hawk: ['hawk', 'pawk', 'hawktuah'],
    jib: ['jib', 'jibby', 'jibscar', 'bigscar', 'didscar'],
    jinsye: ['jinsye', 'bunsye', 'goonsye', 'runsye'],
    kaiferno: ['kaiferno', 'kaif'],
    kami: ['kami', 'kamismile', 'pingprincess'],
    katie: ['katie', 'kat', 'katuwish'],
    lala: ['lala'],
    mai: ['mai', 'lebron'],
    nae: ['nae', 'naenailwhip'],
    neptune: ['neptune', 'goon', 'toon', 'toonwall', 'goonwall', 'nepgoon'],
    pikeman: ['pikeman', 'pike'],
    popop: ['popop', 'popo', 'pops', 'pop'],
    rxob: ['rxob', 'lxob', 'great red', 'greatred', 'rob'],
    saber: ['saber', 'geezerknight'],
    shan: ['shan', '12', 'sandcastle'],
    stella: ['stella'],
    toph: ['toph'],
    wraith: ['wraith', 'weight', 'diddy'],
    bix: ['bix', 'b1x'],
    brendix: ['blackpikeman', 'brendi', 'brendix']
};

const PLAYER_NAME_ALIASES = (() => {
    /** @type {Record<string, string>} */
    const map = {};
    for (const [canonical, aliases] of Object.entries(PLAYER_NICKNAMES)) {
        map[canonical.toLowerCase()] = canonical;
        for (const raw of aliases) {
            const key = (raw || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
            if (!key) continue;
            map[key] = canonical;
        }
    }
    return map;
})();

/**
 * @param {string} name
 * @returns {string}
 */
export function canonicalPlayerName(name) {
    if (!name) return name;
    const trimmed = name.toString().trim();
    const key = trimmed.toLowerCase().replace(/\s+/g, ' ');
    return PLAYER_NAME_ALIASES[key] ?? trimmed;
}
