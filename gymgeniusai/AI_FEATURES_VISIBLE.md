# Where to See AI Integration in Expo

## ✅ AI Features Now Visible

### 1. **Meal Plan Generator** (Home Screen → Meal Ideas)
- **Location**: Home tab → Click "Meal Ideas" or unlock feature
- **What you'll see**:
  - ✨ "Generate AI Meal Plan" button (with tier info)
  - Futuristic AI loading animation when generating
  - AI-powered meal plans with personalized recommendations
- **Tier Display**: Shows cost/limit based on your subscription tier

### 2. **Custom Meal Creation** (Nutrition Tab)
- **Location**: Nutrition tab → Add Food → "Create Custom Meal"
- **What you'll see**:
  - Enter meal name and serving size
  - **AI automatically estimates macros** when you click "Next"
  - AI loading indicator appears while estimating
  - Macros pre-filled (you can adjust)
- **Tier Display**: Only works if you have Basic/Pro/Elite tier

### 3. **AI Feature Gates**
- All AI features are wrapped with upgrade prompts
- Free tier users see lock overlay
- Basic tier shows Volt costs
- Pro tier shows remaining usage

## 🎨 Visual Indicators

### AI Loading States
- Animated loading indicators with particles
- Glowing borders and effects
- "AI is thinking..." messages

### Tier Badges
- Button text shows tier status:
  - Basic: "(5,000 V)"
  - Pro: "(Limited)"
  - Elite: "(Unlimited)"
  - Free: "(Upgrade Required)"

## 🚀 To Test in Expo

1. **Open the app in Expo Go**
2. **Navigate to Home tab**
3. **Click "Meal Ideas"** (or unlock it)
4. **Click "Generate AI Meal Plan"**
   - You'll see the AI loading animation
   - Then the generated meal plan

5. **Go to Nutrition tab**
6. **Click "Add Food" → "Create Custom Meal"**
7. **Enter meal name** (e.g., "Grilled Chicken Breast")
8. **Enter serving size** (e.g., "6 oz")
9. **Click "Next"**
   - AI will estimate macros automatically
   - You'll see the loading indicator
   - Macros will be pre-filled

## ⚠️ Important Notes

### Functions Must Be Deployed
The AI features will **fall back to smart generation** until you:
1. Deploy Firebase Functions (see `FIREBASE_FUNCTIONS_SETUP.md`)
2. Set the API key in Functions config

### Subscription Tier
- Default tier is "free" (no AI access)
- To test AI features, update your user document in Firestore:
  ```javascript
  // In Firebase Console → Firestore → users → [your-uid]
  planTier: "basic" // or "pro" or "elite"
  points: 10000 // For Basic tier testing
  ```

### Testing Tiers
You can manually set tiers in Firestore:
- **Basic**: `planTier: "basic"`, `points: 10000`
- **Pro**: `planTier: "pro"`
- **Elite**: `planTier: "elite"`

## 📱 What You'll See

### Before Functions Deploy:
- AI loading animations ✅
- Feature gates ✅
- Tier checking ✅
- **But**: Falls back to smart generation (no real AI)

### After Functions Deploy:
- Real AI meal plans ✅
- Real AI macro estimation ✅
- Tier enforcement ✅
- Usage tracking ✅

## 🎯 Quick Test Checklist

- [ ] Open app in Expo
- [ ] Go to Home → Meal Ideas
- [ ] See "Generate AI Meal Plan" button
- [ ] Click it → See AI loading animation
- [ ] Go to Nutrition → Create Custom Meal
- [ ] Enter name + serving → See AI estimation
- [ ] Check tier display on buttons

All AI UI components are now integrated and visible! 🎉

