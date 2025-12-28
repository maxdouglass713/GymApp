# Screenshot-Safe UI Guide for App Store Submission

## Problem
Apple reviewers will tap buttons visible in screenshots. If they show "Coming Soon", the app may be rejected.

## Solution
**Hide all non-functional buttons/elements from screenshots for v1.0**

---

## Elements to Hide for Screenshots

### ✅ **HOME SCREEN**
1. **AIFeatureButton components** (2 buttons)
   - Location: `app/(tabs)/index.tsx` lines ~656-678
   - Action: Hide completely or remove for v1.0

### ✅ **WORKOUT SCREEN**
1. **"Share with Community" button**
   - Location: `app/(tabs)/workout.tsx` line ~2560-2572
   - Action: Hide for non-coach users or remove entirely

### ✅ **PROGRESS SCREEN**
1. **Video upload buttons** ("Coming Soon" visible in UI)
   - Location: `app/(tabs)/progress.tsx` lines ~1149, ~1180
   - Action: Hide video attachment buttons
2. **"Coming Soon" text for cardio editing**
   - Location: `app/(tabs)/progress.tsx` line ~1281, ~1287
   - Action: Hide cardio editing UI elements

### ✅ **STORE SCREEN**
1. **Buy GP purchase buttons**
   - Location: `app/(tabs)/store.tsx` lines ~116-142
   - Action: Hide purchase buttons, keep only "Watch Ad" section

---

## Recommended Screenshot Strategy

### **Take Screenshots Of:**
1. ✅ **Home Screen** - Dashboard with workout/nutrition stats
2. ✅ **Workout Screen** - Exercise logging interface
3. ✅ **Nutrition Screen** - Meal logging interface
4. ✅ **Progress Screen** - History/weight tracking (without video buttons)
5. ✅ **Profile Screen** - Settings and user info

### **Avoid Taking Screenshots Of:**
- ❌ Home screen with AI buttons visible
- ❌ Store screen with purchase buttons
- ❌ Progress screen with "Coming Soon" text
- ❌ Any screen showing disabled features

---

## Quick Fix Options

### **Option 1: Hide Elements (Recommended)**
Use feature flags to conditionally render elements. Elements won't appear at all.

### **Option 2: Remove Temporarily**
Comment out or remove UI elements for v1.0, restore in v1.1.

### **Option 3: Replace with Working Features**
Show different buttons that actually work (e.g., replace AI buttons with direct navigation to working features).

---

## After Screenshots

Once screenshots are taken and uploaded to App Store Connect:
- You can restore these elements if needed for future builds
- The screenshots will already be locked in

---

## Implementation Priority

**HIGH PRIORITY** (Hide before taking screenshots):
1. AI Feature Buttons on Home Screen
2. Purchase buttons on Store Screen
3. "Coming Soon" text on Progress Screen

**MEDIUM PRIORITY**:
4. Share button on Workout Screen (only if visible to all users)
5. Video upload buttons on Progress Screen


