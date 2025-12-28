# Next Build Steps - Testing Your Fixes

## 🎯 Recommended Approach

**Build a PREVIEW build first** (easier to test), then build PRODUCTION when ready.

---

## Step 1: Build Preview Build (For Testing)

This build is easier to install and test than development build:

```bash
cd gymgeniusai
eas build --profile preview --platform ios
```

### Why Preview Build?
- ✅ Easier to install (direct download link)
- ✅ No TestFlight setup needed
- ✅ Faster to build
- ✅ Perfect for testing fixes

### After Build Completes:
1. You'll get a download link
2. Install on your iPhone via the link
3. Test all the fixes we made

---

## Step 2: Test All Fixes

Once installed, test these specific fixes:

### ✅ Fix #1: Subscription Restrictions
- [ ] Complete onboarding as personal user
- [ ] Try to select Pro/Elite tier → Should show "Coming Soon" or be locked
- [ ] Verify only Basic tier is available

### ✅ Fix #2: Team/Institution Block
- [ ] During onboarding, try to select "Team & Institution" or "Gym / Personal Trainer"
- [ ] Should show "Coming Soon" alert and block selection

### ✅ Fix #3: Workout Tab Crash
- [ ] Navigate to workout tab multiple times
- [ ] Load existing workouts
- [ ] Create and save new workouts
- [ ] Verify no crashes occur

### ✅ Fix #4: Fitness Goals Save
- [ ] Go to Profile tab
- [ ] Click "Update Goals"
- [ ] Change your fitness goals
- [ ] Click "Save"
- [ ] Should save successfully without "Failed to save" error

### ✅ Fix #5: AI Macro Estimation
- [ ] Go to Nutrition tab
- [ ] Try to add custom meal
- [ ] Try to use AI macro estimation → Should show "Coming Soon" (feature disabled)
- [ ] If you're Basic tier, should show upgrade message if feature was enabled

---

## Step 3: Build Production Build (When Ready)

Once you've confirmed all fixes work in the preview build:

```bash
cd gymgeniusai
eas build --profile production --platform ios
```

### Then Submit to App Store Connect:

```bash
eas submit --platform ios --latest
```

Or manually upload the IPA file through App Store Connect.

---

## 📝 Quick Command Reference

### Build Commands:
```bash
# Preview build (for testing)
eas build --profile preview --platform ios

# Production build (for App Store)
eas build --profile production --platform ios

# Submit to App Store (after production build)
eas submit --platform ios --latest
```

### Check Build Status:
- Visit: https://expo.dev/accounts/[your-account]/projects/kinetic-flow-ai/builds
- Or run: `eas build:list`

---

## ⚠️ Important Notes

1. **Version Number**: Currently at `1.0.0` (build `1`)
   - Production builds auto-increment build number
   - Preview builds don't increment

2. **Testing Time**: Plan for 30-60 minutes of thorough testing

3. **If Bugs Found**: 
   - Fix the code
   - Build another preview build
   - Test again
   - Only build production when everything works

4. **Submission**: Don't submit to App Store until all fixes are tested and working

---

## 🚀 Ready to Build?

Start with the preview build:

```bash
cd gymgeniusai
eas build --profile preview --platform ios
```

Then test everything before building production!

---

## 📋 Testing Checklist

Print this out or keep it open while testing:

- [ ] Onboarding completes successfully (personal user, Basic tier)
- [ ] Cannot upgrade subscription tier (locked with "Coming Soon")
- [ ] Cannot select team/institution options
- [ ] Workout tab loads without crashing
- [ ] Fitness goals save successfully
- [ ] AI macro estimation shows "Coming Soon" or proper tier restrictions
- [ ] No console errors or crashes
- [ ] App feels stable and responsive
