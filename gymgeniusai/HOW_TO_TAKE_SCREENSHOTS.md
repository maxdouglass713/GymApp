# How to Take Screenshots for App Store 🎯

## 🎯 BEST OPTION: Use Expo Go on Your iPhone

### Step 1: Start the Development Server

**Option A: Use your startup script**
- Double-click `START_EXPO.bat` file

**Option B: Run manually**
```bash
cd gymgeniusai
npx expo start
```

### Step 2: Connect Your iPhone

1. Make sure your iPhone and computer are on the **same WiFi network**
2. Open the **Expo Go** app on your iPhone (download from App Store if you don't have it)
3. Scan the QR code that appears in your terminal
   - Or type the URL manually if scanning doesn't work
4. The app should load on your iPhone!

### Step 3: Take Screenshots

1. Navigate to the screens you want to screenshot:
   - Home screen / Dashboard
   - Workout logging screen
   - Nutrition logging screen
   - Progress tracking screen

2. On iPhone, take a screenshot:
   - **iPhone X or later**: Press Side Button + Volume Up
   - **iPhone 8 or earlier**: Press Home Button + Power Button

3. Screenshots will be saved to your Photos app

### Step 4: Transfer Screenshots

- **Option A**: AirDrop to your Mac/PC (if available)
- **Option B**: Email them to yourself
- **Option C**: Use iCloud Photos sync
- **Option D**: Connect iPhone to computer and import photos

---

## 🔧 ALTERNATIVE OPTION: Use Development Build

If you built a development build earlier, you can install it directly on your iPhone:

1. Go to your Expo dashboard: https://expo.dev/accounts/maxduggy713/projects/kinetic-flow-ai/builds
2. Find your development build
3. Download and install via TestFlight or direct install link
4. Open the app on your iPhone
5. Take screenshots as needed

---

## 📱 SCREENSHOT REQUIREMENTS

### Required Sizes:
- **iPhone 6.7" Display** (iPhone 14 Pro Max, 15 Pro Max)
  - Size: 1290 x 2796 pixels
  - Need: 3-10 screenshots

- **iPhone 6.5" Display** (iPhone XS Max, 11 Pro Max)
  - Size: 1242 x 2688 pixels
  - Need: 3-10 screenshots

- **iPhone 5.5" Display** (iPhone 8 Plus)
  - Size: 1242 x 2208 pixels
  - Need: 3-10 screenshots

**Note**: Apple automatically scales screenshots from larger devices to smaller ones if needed, but it's best to have at least the 6.7" size.

---

## 📸 WHAT TO SCREENSHOT

### Must-Have Screenshots:
1. ✅ **Home screen / Dashboard** (First screenshot - most important!)
2. ✅ **Workout logging screen** (Show adding exercises, sets, reps)
3. ✅ **Nutrition logging screen** (Show meal entry)
4. ✅ **Progress tracking screen** (Show history, PRs, streaks)
5. ✅ **Profile or achievements screen** (Optional but nice)

### ❌ DON'T Screenshot:
- Features that show "Coming Soon" alerts
- Camera/barcode features (not working yet)
- Team management (incomplete)
- Any feature that doesn't fully work

---

## 🎨 TIPS FOR GREAT SCREENSHOTS

1. **Use Real Data**: Fill the app with realistic data (workouts, meals) before taking screenshots
2. **Clean UI**: Make sure no error messages or placeholder text is visible
3. **First Screenshot Matters**: This is the featured image - make it count!
4. **Consistent Theme**: All screenshots should look cohesive
5. **Show Value**: Highlight your best features

---

## 🚀 QUICK START COMMAND

Just run:
```bash
npx expo start
```

Then scan the QR code with Expo Go app on your iPhone!

---

## ❓ TROUBLESHOOTING

### "Can't connect to server"
- Make sure iPhone and computer are on same WiFi
- Try using `--tunnel` flag: `npx expo start --tunnel`

### "Expo Go not loading app"
- Make sure Expo Go app is up to date
- Try clearing Expo Go cache and restarting

### "Screenshots are wrong size"
- Screenshots from iPhone 14 Pro Max / 15 Pro Max will be correct size (1290 x 2796)
- Apple can resize them automatically when you upload

---

**Ready to go! Start Expo and take those screenshots! 📸**

