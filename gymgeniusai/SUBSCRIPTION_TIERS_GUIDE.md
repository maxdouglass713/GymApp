# Subscription Tiers - App Store Submission Guide

## ✅ YES, You Can Keep Subscription Tiers!

**Good news:** You can absolutely keep subscription tiers in your app for App Store submission, even without payment integration.

---

## 📋 What Apple Allows

### ✅ ALLOWED:
- **Show subscription tiers** as informational (Free, Basic, Pro, Elite)
- **Display tier features** and benefits
- **Show pricing** ($9.99/month, etc.) as informational
- **Let users select tiers** during onboarding (for testing/development)
- **Use tiers to control features** (which you already do)
- **Show "Coming Soon"** for subscription purchases

### ❌ NOT ALLOWED:
- **Functional "Subscribe" buttons** that don't work
- **Payment buttons** that fail or do nothing
- **Misleading users** about what they're purchasing

---

## ✅ What You Currently Have (All Good!)

### 1. Subscription Tier Selection (Onboarding)
- **Location**: `components/OnboardingStep.tsx`
- **Status**: ✅ **SAFE** - Users select a tier, but it's just for feature access
- **No payment involved** - Just sets `planTier` in Firestore
- **Apple allows this** - It's informational/selection only

### 2. Tier-Based Feature Access
- **Location**: `stores/subscriptionStore.ts`
- **Status**: ✅ **SAFE** - Tiers control AI feature access
- **How it works**: 
  - Free: No AI access
  - Basic: AI costs Volts (points)
  - Pro: Limited AI per month
  - Elite: Unlimited AI
- **No payment required** - Tiers can be set manually or earned

### 3. Store Screen (GP Packs)
- **Location**: `app/(tabs)/store.tsx`
- **Status**: ✅ **NOW SAFE** - Shows "Coming Soon" when IAP disabled
- **What happens**: Purchase buttons show "Coming Soon" alert
- **Apple allows this** - Clear messaging that purchases aren't available yet

### 4. Buy GP Button
- **Location**: `components/UnlockModal.tsx`
- **Status**: ✅ **SAFE** - Already shows "Coming Soon"
- **What happens**: Shows alert when clicked

---

## 🎯 How to Keep Tiers for Submission

### Option 1: Keep Tiers as Informational (Recommended)
**What to do:**
- ✅ Keep tier selection in onboarding (it's just informational)
- ✅ Keep tier-based feature access (works great!)
- ✅ Show "Coming Soon" for any purchase buttons
- ✅ Make it clear subscriptions are "coming soon" in app description

**App Store Description Example:**
> "Subscription tiers (Pro/Elite) coming soon! Currently, all features are available through our points system."

### Option 2: Hide Purchase Buttons Entirely
**What to do:**
- ✅ Keep tiers and tier selection
- ✅ Hide store screen or purchase buttons
- ✅ Show tiers as "earnable through points" only

**Current Status:** You're using Option 1, which is perfect!

---

## 📝 App Store Connect Notes

When submitting, you can:

1. **In App Description:**
   - Mention subscription tiers are "coming soon"
   - Emphasize that features are currently available through points
   - Be transparent about future subscription plans

2. **In App Review Notes:**
   - Explain that subscription tiers are informational
   - Note that all features are currently free/points-based
   - Mention subscriptions will be added in a future update

3. **In-App Messaging:**
   - Any "Subscribe" or "Upgrade" buttons should show "Coming Soon"
   - Make it clear subscriptions aren't available yet
   - ✅ You've already done this!

---

## ✅ Current Implementation Status

| Feature | Status | App Store Safe? |
|---------|--------|-----------------|
| Tier Selection (Onboarding) | ✅ Working | ✅ YES - Informational only |
| Tier-Based Features | ✅ Working | ✅ YES - No payment required |
| Store Screen (GP Packs) | ✅ Shows "Coming Soon" | ✅ YES - Clear messaging |
| Buy GP Button | ✅ Shows "Coming Soon" | ✅ YES - Clear messaging |
| Subscription Purchase | ❌ Not implemented | ✅ YES - Not shown |

**All Good!** ✅

---

## 🚀 What Happens When You Add Payments Later

1. **Enable IAP feature flag**: `inAppPurchases: true`
2. **Integrate RevenueCat**: Add actual payment processing
3. **Remove "Coming Soon"**: Replace with real purchase flow
4. **Update App Store**: Add subscription products in App Store Connect
5. **Submit update**: Users can then purchase subscriptions

**No code changes needed** - Just enable the feature flag and add payment integration!

---

## 💡 Key Points

✅ **You can keep subscription tiers** - They're informational  
✅ **Tier selection is fine** - No payment involved  
✅ **"Coming Soon" buttons are OK** - Apple allows this  
✅ **Tier-based features work** - No payment required  
✅ **Store screen is safe** - Shows "Coming Soon"  

**You're all set for submission!** 🎉

---

## 📋 Final Checklist

- [x] Subscription tiers shown (informational)
- [x] Tier selection works (no payment)
- [x] Purchase buttons show "Coming Soon"
- [x] Tier-based features work
- [x] No broken payment buttons
- [x] Clear messaging about subscriptions

**Status: READY FOR SUBMISSION** ✅

