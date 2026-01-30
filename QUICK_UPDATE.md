# Quick Update Guide

## Problem
When you update `scores_processed.csv`, you need to redeploy to Netlify for changes to show on the live site.

## Solutions (Choose One)

### ✅ Option 1: Git-Based Auto-Deploy (BEST - Recommended)

**Set up once, then just push updates:**

1. **Create a GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
   
2. **Create repo on GitHub and push:**
   - Go to github.com and create a new repository
   - Then run:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

3. **Connect to Netlify:**
   - Go to netlify.com → Add new site → Import from Git
   - Connect GitHub → Select your repo
   - Deploy settings: Leave everything default (no build command needed)
   - Click "Deploy site"

4. **Now when you update CSV:**
   ```bash
   git add scores_processed.csv
   git commit -m "Update scores"
   git push
   ```
   Netlify will **automatically redeploy** in ~30 seconds! 🎉

---

### Option 2: Quick Manual Redeploy (Fast but Manual)

**Use Netlify CLI for quick redeployments:**

1. **Install Netlify CLI (one time):**
   ```bash
   npm install -g netlify-cli
   netlify login
   ```

2. **Link your site (one time):**
   ```bash
   netlify link
   ```
   (Follow prompts to connect to your Netlify site)

3. **When you update CSV, just run:**
   ```bash
   netlify deploy --prod
   ```
   Or double-click `deploy.bat` (Windows)

---

### Option 3: Netlify Drop (Manual but Simple)

1. **Update your CSV file**
2. **Go to netlify.com → Your site → Deploys**
3. **Drag and drop your entire folder** (or just the updated CSV)
4. **Wait ~30 seconds for redeploy**

---

## Which Should You Use?

- **Git-based (Option 1)**: Best for frequent updates. Set up once, then just `git push` whenever you update CSV.
- **CLI (Option 2)**: Good if you want quick control but don't want to use Git.
- **Manual Drop (Option 3)**: Simplest but requires manual upload each time.

**Recommendation: Use Option 1 (Git)** - It's the most efficient for regular updates!
