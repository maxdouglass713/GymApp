# "Coming Soon" Features Implementation

All incomplete features now show a "Coming Soon" alert when accessed, using feature flags. **No code has been deleted** - everything is preserved for future implementation.

## How It Works

When a user tries to access an incomplete feature:
1. The feature flag is checked
2. If disabled, a "Coming Soon" alert is shown
3. If enabled, the feature works normally
4. All code remains intact - just wrapped in feature flag checks

## Features with "Coming Soon" Handlers

### ✅ Video Upload (`videoUpload: false`)
- **Location**: `app/(tabs)/progress.tsx`
- **Handler**: `handleVideoUpload()`
- **What happens**: Shows "Coming Soon" alert when video upload is attempted
- **To enable**: Set `videoUpload: true` in `featureFlags.ts` and implement the feature

### ✅ Cardio Editing (`cardioEditing: false`)
- **Location**: `app/(tabs)/progress.tsx`
- **Handler**: Cardio exercise editing in workout edit modal
- **What happens**: Shows "Coming Soon" button when editing cardio exercises
- **To enable**: Set `cardioEditing: true` in `featureFlags.ts` and implement editing

### ✅ Buy GP Packs (`gpPurchasing: false`)
- **Location**: `components/UnlockModal.tsx`
- **Handler**: `handleBuyGP()`
- **What happens**: Shows "Coming Soon" alert when Buy GP button is pressed
- **To enable**: Set `gpPurchasing: true` in `featureFlags.ts` and integrate IAP/RevenueCat

### ✅ Team Management (`teamManagement: false`)
- **Location**: `app/community/team-management.tsx`
- **Handlers**: 
  - Coach removal (`coachRemoval: false`)
  - Add coach (`addCoach: false`)
  - Team info editing
- **What happens**: Shows "Coming Soon" alerts when these features are accessed
- **To enable**: Set respective flags to `true` and implement functionality

### ✅ Team Chat (`teamChat: false`)
- **Location**: `app/community/team-dashboard.tsx`
- **Handler**: Tap on "Team chat feature coming soon!" text
- **What happens**: Shows "Coming Soon" alert
- **To enable**: Set `teamChat: true` in `featureFlags.ts` and implement chat

### ✅ Meal Library (`mealLibrary: false`)
- **Location**: `app/nutrition/library.tsx`
- **Handler**: Tap on "Coming soon!" text
- **What happens**: Shows "Coming Soon" alert
- **To enable**: Set `mealLibrary: true` in `featureFlags.ts` and implement favorites

### ✅ Video Analysis (`advancedInsights: false`)
- **Location**: `app/(tabs)/progress.tsx`
- **Handler**: "Coming Soon" button in video analysis modal
- **What happens**: Shows "Coming Soon" alert
- **To enable**: Set `advancedInsights: true` in `featureFlags.ts` and implement analysis

### ✅ Camera Photo-to-Macros (`cameraPhotoMacros: false`)
- **Location**: `app/(tabs)/nutrition.tsx`
- **Handler**: `handleSnapTrack()` and event listener
- **What happens**: Feature is hidden/disabled (no alert, just doesn't work)
- **To enable**: Set `cameraPhotoMacros: true` in `featureFlags.ts` and implement camera

### ✅ Barcode Scanner (`barcodeScanner: false`)
- **Location**: `components/navigation/CustomTabBar.tsx`
- **Handler**: Barcode action in quick actions
- **What happens**: Feature is hidden/disabled (no alert, just doesn't work)
- **To enable**: Set `barcodeScanner: true` in `featureFlags.ts` and implement scanner

## Helper Functions

### `checkFeatureOrShowComingSoon(feature, featureName)`
- Checks if feature is enabled
- If disabled, shows "Coming Soon" alert automatically
- Returns `true` if enabled, `false` if disabled
- **Usage**: `if (!checkFeatureOrShowComingSoon('videoUpload', 'Video Upload')) return;`

### `showComingSoonAlert(featureName)`
- Shows a standardized "Coming Soon" alert
- **Usage**: `showComingSoonAlert('Video Upload')`

## How to Enable a Feature

1. **Open** `gymgeniusai/utils/features/featureFlags.ts`
2. **Find** the feature flag (e.g., `videoUpload: false`)
3. **Change** to `videoUpload: true`
4. **Remove** the `checkFeatureOrShowComingSoon()` check (or keep it if you want the alert to still show)
5. **Implement** the actual feature functionality
6. **Test** thoroughly
7. **Ship it!** 🚀

## Example: Enabling Video Upload

```typescript
// 1. In featureFlags.ts
videoUpload: true,  // Changed from false

// 2. In progress.tsx - remove or update the check
const handleVideoUpload = () => {
  // Remove this line:
  // if (!checkFeatureOrShowComingSoon('videoUpload', 'Video Upload')) return;
  
  // Add actual implementation:
  // ... your video upload code here
};
```

## Benefits

✅ **No code deleted** - Everything is preserved  
✅ **Easy to enable** - Just flip a flag and implement  
✅ **User-friendly** - Users see "Coming Soon" instead of broken features  
✅ **App Store ready** - Incomplete features won't confuse users  
✅ **Future-proof** - Easy to add features incrementally  

## Notes

- All "Coming Soon" handlers use the same pattern for consistency
- Feature flags are centralized in one file
- When a feature is enabled, just remove the check and implement
- The alert messages are user-friendly and professional

