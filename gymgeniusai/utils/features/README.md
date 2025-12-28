# Feature Flags System

This system allows you to show/hide features without deleting any code. Perfect for shipping an MVP while keeping all your work.

## Usage

### In Components

```tsx
import { isFeatureEnabled } from '@/utils/features/featureFlags';

function MyComponent() {
  // Only show if feature is enabled
  if (!isFeatureEnabled('cameraPhotoMacros')) {
    return null; // or return a "coming soon" message
  }
  
  return (
    <CameraComponent />
  );
}
```

### In Navigation

```tsx
import { isFeatureEnabled } from '@/utils/features/featureFlags';

const tabs = [
  { name: 'home', title: 'Home' },
  { name: 'workout', title: 'Workout' },
  // Only show community tab if enabled
  ...(isFeatureEnabled('communityChallenges') ? [{ name: 'community', title: 'Community' }] : []),
];
```

### In Screens

```tsx
import { isFeatureEnabled } from '@/utils/features/featureFlags';

function HomeScreen() {
  return (
    <View>
      {/* Always show */}
      <WorkoutButton />
      
      {/* Conditionally show */}
      {isFeatureEnabled('mealPlans') && (
        <MealPlanButton />
      )}
      
      {/* Show placeholder if disabled */}
      {!isFeatureEnabled('cameraPhotoMacros') ? (
        <Text>Coming Soon</Text>
      ) : (
        <CameraButton />
      )}
    </View>
  );
}
```

## Current MVP Status

✅ **Enabled Features (MVP Ready):**
- Authentication & Onboarding
- Workout Logging
- Nutrition Logging  
- Progress Tracking
- Basic Points System
- Basic Workout Plans
- Basic Meal Plans
- Simple AI Features

❌ **Disabled Features (Not MVP):**
- Camera features (placeholders)
- Team/Institution management (incomplete)
- Advanced community features (incomplete)
- Subscription tiers (not integrated)
- IAP/Payments (not integrated)

## To Enable a Feature

1. Complete the feature implementation
2. Update `featureFlags.ts`: Change `false` to `true`
3. Test thoroughly
4. Ship it! 🚀

## To Ship MVP

Just use the current feature flags as-is. Disabled features won't show up, but all your code is preserved for later!



