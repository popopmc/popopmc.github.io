# Bonk League Pub Stats

## File Structure

```
website/
├── index.html                 # Main HTML entry point
├── data/                      # Game data files
│   ├── scores_processed.csv
│   ├── scoresjan.csv         # January game scores
│   ├── scoresfeb.csv         # February game scores
│   └── tourney_accolades.csv
├── src/
│   ├── css/
│   │   ├── main.css          # Entry: foundation → components → pages → state
│   │   ├── foundation/       # Base + layout (SMACSS)
│   │   │   ├── base.css      # Reset, :root variables, body
│   │   │   └── layout.css    # Page structure, nav, sections
│   │   ├── components/       # Reusable UI (card, roster, footer, links)
│   │   │   ├── player-card.css   # Card + carousel
│   │   │   ├── roster.css        # Roster table, period tabs, search
│   │   │   ├── footer.css        # Site footer
│   │   │   └── stat-player.css   # Clickable player names
│   │   ├── pages/            # One file per screen
│   │   │   ├── home.css      # Home: stats grid, tabs, sidebar
│   │   │   ├── game-log.css  # Game Log: table, pagination
│   │   │   └── profile.css   # Player profile: header, stats, synergy, lookup
│   │   └── state/
│   │       └── responsive.css   # Media queries
│   ├── js/
│   │   ├── main.js           # Entry (ES module): init, event binding, window globals for onclick
│   │   ├── state/
│   │   │   └── store.js      # Shared state (processor, periods, pagination, etc.)
│   │   ├── data/
│   │   │   ├── processor.js  # StatsProcessor class (CSV parse, stats)
│   │   │   └── loaders.js    # loadData, loadAccolades, showLoading
│   │   ├── utils/
│   │   │   ├── profile-pictures.js  # getProfilePicturePath, getPlayerNameWithIcon
│   │   │   └── month-selector.js    # getAvailableMonths, populateMonthDropdown
│   │   └── pages/
│   │       ├── home.js       # Home: displayStats, switchPeriod, updateMoreStats
│   │       ├── navigation.js # goBackHome, showPlayersPage, showGameLogPage, showPlayerProfile
│   │       ├── game-log.js   # loadGameLog (table, pagination)
│   │       ├── players.js    # Carousel, roster table, sort, search
│   │       └── profile.js    # Profile, accolades, synergy, matchups, lookup
│   └── assets/
│       ├── background/       # Page backgrounds
│       ├── badges/           # Award/accolade images
│       └── profile-pictures/  # Player avatars
└── README.md
```

## Color Palette

The website uses the following color scheme:

- **Pink**: `#FFDBBB`
- **Cream**: `#f4f8d3`
- **Mint**: `#a6d6d6`
- **Purple**: `#8e7dbe`