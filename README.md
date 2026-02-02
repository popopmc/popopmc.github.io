# Game Stats Dashboard

A modern, responsive statistics dashboard website for analyzing game scores, player statistics, and teammate combinations. Ready to deploy on Netlify for free.

## Features

- 📊 **Player Statistics**: Individual win/loss records, win rates, goals for/against, and plus/minus
- 🤝 **Teammate Combinations**: See which player pairs work best together with win rates
- ➕➖ **Plus/Minus Leaders**: Track goal differentials for each player
- 🎨 Modern dark theme with gradient accents
- 📱 Fully responsive design
- ⚡ Fast CSV parsing and real-time calculations
- 🔄 Manual refresh functionality

## Data Format

The website reads from `scoresjan.csv` and `scoresfeb.csv` in the `data/` folder with the following format:
```
timestamp,team1_name1,team1_name2,team1_name3,score1,team2_name1,team2_name2,team2_name3,score2
```

Each row represents a game with:
- Timestamp of the game
- Team 1 players (up to 3) and their score
- Team 2 players (up to 3) and their score

## Statistics Calculated

### Player Stats
- **Wins/Losses**: Total wins and losses for each player
- **Win Rate**: Percentage of games won
- **Goals For**: Total goals scored when player is on the team
- **Goals Against**: Total goals allowed when player is on the team
- **Plus/Minus**: Goal differential (Goals For - Goals Against)

### Teammate Stats
- Shows win/loss records for player pairs
- Minimum 2 games together to appear in stats
- Sorted by win rate

### Plus/Minus
- Goal differential for each player
- Shows which players contribute most to team success
- Includes goals for/against breakdown

## Deployment to Netlify

### ⚠️ Important: Updating Your CSV

When you update `scoresjan.csv` or `scoresfeb.csv`, you need to redeploy for changes to show. See **QUICK_UPDATE.md** for the easiest ways to do this!

**Quick Summary:**
- **Best**: Use Git-based deployment (auto-redeploys when you push)
- **Fast**: Use Netlify CLI (`netlify deploy --prod`)
- **Simple**: Drag & drop folder to Netlify dashboard

### Option 1: Deploy via Netlify UI (Initial Setup)

1. **Create a Netlify account** (if you don't have one)
   - Go to [netlify.com](https://www.netlify.com)
   - Sign up for free

2. **Deploy your site**
   - Log in to Netlify
   - Click "Add new site" → "Deploy manually"
   - Drag and drop your entire project folder (or zip it first)
   - Make sure `scoresjan.csv` and `scoresfeb.csv` are included
   - Your site will be live in seconds!

### Option 2: Deploy via Git (Recommended for Updates)

1. **Push to GitHub/GitLab/Bitbucket**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Netlify**
   - Log in to Netlify
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider
   - Select your repository
   - Netlify will auto-detect settings (no build command needed)
   - Click "Deploy site"

3. **Your site is live!**
   - Netlify will give you a URL like `your-site-name.netlify.app`
   - You can customize the domain name in site settings

4. **Updating CSV is now automatic!**
   - Just update `scoresjan.csv` and/or `scoresfeb.csv` locally
   - Run: `git add data/scoresjan.csv data/scoresfeb.csv && git commit -m "Update scores" && git push`
   - Netlify will automatically redeploy in ~30 seconds! 🎉

### Option 3: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login and deploy**
   ```bash
   netlify login
   netlify deploy --prod
   ```

## File Structure

```
website/
├── index.html           # Main HTML file
├── styles.css          # Styling
├── script.js           # Main JavaScript logic
├── data-processor.js   # CSV parser and stats calculator
├── data/
│   ├── scoresjan.csv # January game data
│   └── scoresfeb.csv # February game data
├── netlify.toml        # Netlify configuration
└── README.md           # This file
```

## Customization

### Update CSV Data

Simply update `scoresjan.csv` and/or `scoresfeb.csv` in the `data/` folder with your updated data. The format should match:
```
timestamp,team1_name1,team1_name2,team1_name3,score1,team2_name1,team2_name2,team2_name3,score2
```

### Change Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #6366f1;    /* Change primary color */
    --secondary-color: #8b5cf6;  /* Change secondary color */
    --background: #0f172a;       /* Change background */
    --success: #10b981;          /* Positive stats color */
    --danger: #ef4444;           /* Negative stats color */
}
```

### Adjust Minimum Games Filter

In `script.js`, you can change the minimum games required to appear in stats:

```javascript
// In displayTeammateStats function
const teammates = statsProcessor.getTeammateStats(2); // Change 2 to your desired minimum
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Free to use and modify for your projects!
