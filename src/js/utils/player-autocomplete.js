/**
 * Player name autocomplete: dropdown under an input, filled from a list of player names.
 * Use on any search bar that should suggest players (Records, Players, etc.).
 */

const DROPDOWN_CLASS = 'player-autocomplete-dropdown';
const DROPDOWN_ITEM_CLASS = 'player-autocomplete-item';
const DROPDOWN_ACTIVE_CLASS = 'player-autocomplete-item--active';
const MAX_ITEMS = 10;

/**
 * Attach player autocomplete to an input.
 * @param {HTMLInputElement} input - The text input
 * @param {() => string[]} getPlayerNames - Returns current list of player names (e.g. from state)
 * @param {{ onSelect?: (name: string) => void, maxItems?: number }} options - onSelect called when user picks a name; maxItems caps dropdown size
 */
export function createPlayerAutocomplete(input, getPlayerNames, options = {}) {
    const { onSelect, maxItems = MAX_ITEMS } = options;
    let dropdownEl = null;
    let highlightedIndex = -1;
    let currentMatches = [];

    function getRect() {
        const rect = input.getBoundingClientRect();
        return { top: rect.bottom, left: rect.left, width: rect.width };
    }

    function hide() {
        if (dropdownEl && dropdownEl.parentNode) dropdownEl.parentNode.removeChild(dropdownEl);
        dropdownEl = null;
        highlightedIndex = -1;
        currentMatches = [];
    }

    function show(matches) {
        hide();
        if (!matches.length) return;
        currentMatches = matches.slice(0, maxItems);
        const { top, left, width } = getRect();
        dropdownEl = document.createElement('div');
        dropdownEl.className = DROPDOWN_CLASS;
        dropdownEl.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${width}px;`;
        currentMatches.forEach((name, i) => {
            const item = document.createElement('div');
            item.className = DROPDOWN_ITEM_CLASS + (i === 0 ? ` ${DROPDOWN_ACTIVE_CLASS}` : '');
            item.textContent = name;
            item.dataset.index = String(i);
            item.addEventListener('click', () => select(name));
            dropdownEl.appendChild(item);
        });
        document.body.appendChild(dropdownEl);
        highlightedIndex = 0;
    }

    function select(name) {
        input.value = name;
        hide();
        if (typeof onSelect === 'function') onSelect(name);
    }

    function updateHighlight(index) {
        if (!dropdownEl || index < 0 || index >= currentMatches.length) return;
        highlightedIndex = index;
        dropdownEl.querySelectorAll(`.${DROPDOWN_ITEM_CLASS}`).forEach((el, i) => {
            el.classList.toggle(DROPDOWN_ACTIVE_CLASS, i === index);
        });
        const active = dropdownEl.querySelector(`.${DROPDOWN_ITEM_CLASS}.${DROPDOWN_ACTIVE_CLASS}`);
        if (active) active.scrollIntoView({ block: 'nearest' });
    }

    function onInput() {
        const q = (input.value || '').trim().toLowerCase();
        if (!q) {
            hide();
            return;
        }
        const names = getPlayerNames();
        const matches = names.filter(n => n.toLowerCase().includes(q));
        show(matches);
    }

    function onKeydown(e) {
        if (!dropdownEl) return;
        if (e.key === 'Escape') {
            hide();
            e.preventDefault();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            updateHighlight((highlightedIndex + 1) % currentMatches.length);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            updateHighlight(highlightedIndex <= 0 ? currentMatches.length - 1 : highlightedIndex - 1);
            return;
        }
        if (e.key === 'Enter' && currentMatches[highlightedIndex]) {
            e.preventDefault();
            select(currentMatches[highlightedIndex]);
        }
    }

    function onClickOutside(e) {
        if (dropdownEl && !input.contains(e.target) && !dropdownEl.contains(e.target)) hide();
    }

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);
    input.addEventListener('focus', onInput);
    document.addEventListener('click', onClickOutside);

    return { hide, show: onInput };
}
