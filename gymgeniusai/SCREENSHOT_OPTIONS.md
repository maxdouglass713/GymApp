# Screenshot Options - "No Useable Data" Fix 🔧

The "no useable data" error happens because your app uses `expo-dev-client`, which means it needs a **development build**, not Expo Go.

## ✅ OPTION 1: Use Your Development Build (BEST for Screenshots)

If you already built a development build earlier, install it on your iPhone:

1. **Go to Expo Dashboard:**
   - https://expo.dev/accounts/maxduggy713/projects/kinetic-flow-ai/builds

2. **Find your development build:**
   - Look for a build with profile: `development`
   - Should have `.ipa` file for iOS

3. **Install it:**
   - If it's in TestFlight: Install via TestFlight app
   - If direct download: Install via the link provided

4. **Take Screenshots:**
   - Open the app on your iPhone
   - Navigate to screens you need
   - Take screenshots (Side Button + Volume Up)

---

## ✅ OPTION 2: Use Web Version for Screenshots

You can take screenshots from the web version:

```bash
npx expo start --web
```

Then:
1. Open the URL in your browser
2. Take screenshots (though they won't look like iPhone screenshots)
3. Note: This won't be perfect for App Store, but works in a pinch

---

## ✅ OPTION 3: Build a New Development Build for Screenshots

If you need to build a development build just for screenshots:

```bash
eas build --profile development --platform ios
```

Then install it via TestFlight or download link.

---

## ✅ OPTION 4: Use iOS Simulator (If You Have Mac)

If you have access to a Mac:
```bash
npx expo start --ios
```

Then use the iOS Simulator to take screenshots.

---

## 🎯 RECOMMENDATION

**Best Option**: Use the development build you already created (if available). Check your Expo dashboard for existing builds.

**Quick Option**: Build a new development build if you don't have one. This takes ~15-20 minutes but gives you the real app experience.

---

## 📸 Screenshot Tips

Once you have the app running:
- Take screenshots of: Home, Workout Logging, Nutrition, Progress
- Make sure screenshots show real data (not empty states)
- First screenshot should be your best/most impressive screen

