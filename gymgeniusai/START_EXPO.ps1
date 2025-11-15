# Quick start script for Expo
# Double-click this file to start Expo in the correct directory

# Navigate to the correct directory
Set-Location "C:\Users\maxdo\OneDrive\Desktop\Gym Genius AI App\gymgeniusai"

# Verify we're in the right place
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan
if (Test-Path "package.json") {
    Write-Host "✅ package.json found! Starting Expo..." -ForegroundColor Green
    Write-Host ""
    # Start Expo
    npx expo start --tunnel
} else {
    Write-Host "❌ ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Make sure you're in the gymgeniusai folder" -ForegroundColor Yellow
    pause
}


