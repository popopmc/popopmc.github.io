# Bonk League Pub Stats

## File Structure

```
website/
├── index.html                 # Main HTML entry point
├── data/                      # Game data files
│   ├── scoresjan.csv         # January game scores
│   └── scoresfeb.csv         # February game scores
├── src/
│   ├── css/                   # Stylesheets
│   │   ├── main.css          # Main stylesheet
│   │   ├── components/       # Component-specific styles
│   │   └── pages/            # Page-specific styles
│   ├── js/                    # JavaScript files
│   │   ├── main.js           # Main application logic
│   │   ├── data/
│   │   │   └── processor.js  # CSV data processing
│   │   ├── utils/
│   │   │   ├── app-state.js  # Application state management
│   │   │   └── profile-pictures.js  # Profile picture utilities
│   │   └── pages/            # Page-specific scripts
│   └── assets/
│       └── profile-pictures/ # Player profile pictures (PNG files)
└── README.md                  # This file
```

## Color Palette

The website uses the following color scheme:

- **Pink**: `#f7cfd8`
- **Cream**: `#f4f8d3`
- **Mint**: `#a6d6d6`
- **Purple**: `#8e7dbe`
