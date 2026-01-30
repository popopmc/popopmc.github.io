@echo off
echo Deploying to Netlify...
echo.
echo Make sure you have Netlify CLI installed: npm install -g netlify-cli
echo.
netlify deploy --prod
pause
