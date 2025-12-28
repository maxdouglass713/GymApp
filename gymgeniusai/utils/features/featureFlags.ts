/**
 * Feature Flags Configuration
 * 
 * Use this to enable/disable features without deleting code.
 * Set to false to hide incomplete features for MVP.
 * Set to true when features are ready to ship.
 */

export const FeatureFlags = {
  // ===== MVP CORE FEATURES (Always enabled) =====
  // These are essential for MVP and should stay true
  auth: true,
  onboarding: true,
  workoutLogging: true,
  nutritionLogging: true,
  progressTracking: true,
  basicPoints: true,
  
  // ===== AI FEATURES (Disabled for v1.0 - Coming Soon) =====
  // Disable all AI for initial release, enable in v1.1+
  workoutPlans: false,             // AI workout plan generation (Coming Soon)
  mealPlans: false,                // AI meal plan generation (Coming Soon)
  basicAI: false,                  // AI exercise suggestions (Coming Soon)
  aiExerciseSuggestions: false,    // AI suggest next exercise (Coming Soon)
  aiMacroEstimation: false,        // AI macro estimation (Coming Soon)
  
  // ===== INCOMPLETE FEATURES (Hide for MVP) =====
  // Set to false to hide incomplete features
  cameraPhotoMacros: false,        // Photo-to-macros (placeholder only)
  barcodeScanner: false,           // Barcode scanning (placeholder only)
  formFeedback: false,             // Form feedback mode (not implemented)
  videoUpload: false,              // Video upload (coming soon)
  teamManagement: false,           // Team/institution management (incomplete)
  shareWorkout: false,             // Share workout feature (coming soon)
  trainerFeatures: false,          // Trainer-specific features (incomplete)
  playerFeatures: false,           // Player-specific features (incomplete)
  institutionSetup: false,         // Institution setup (incomplete)
  teamChat: false,                 // Team chat (coming soon)
  communityChallenges: false,      // Community challenges (partially complete)
  communityLeaderboard: false,     // Leaderboards (partially complete)
  communityFeed: false,            // Community feed (partially complete)
  advancedInsights: false,         // Advanced progress insights (partially complete)
  coachRemoval: false,             // Remove coach feature (TODO)
  addCoach: false,                 // Add coach feature (TODO)
  cardioEditing: false,            // Cardio editing (coming soon)
  mealLibrary: false,              // Favorite meals library (coming soon)
  
  // ===== SUBSCRIPTION/PAYMENT FEATURES =====
  subscriptionTiers: false,        // Pro/Elite tier features
  subscriptionUpgrades: false,     // Subscription upgrade features (coming soon)
  inAppPurchases: false,           // IAP/RevenueCat integration
  gpPurchasing: false,             // Buy GP packs (coming soon)
  
  // ===== EXPERIMENTAL FEATURES =====
  advancedAI: false,               // Advanced AI features
  aiChatCoach: false,              // AI chat coach
  aiGoalRecalibration: false,      // AI goal recalibration
  muscleVolumeTrends: false,       // Muscle volume trends
  fatigueWarnings: false,          // Fatigue warnings
  
} as const;

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof typeof FeatureFlags): boolean => {
  return FeatureFlags[feature] === true;
};

/**
 * Get all disabled features (for debugging)
 */
export const getDisabledFeatures = (): string[] => {
  return Object.entries(FeatureFlags)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature);
};

/**
 * MVP Mode - Enable only core features
 */
export const enableMVPMode = () => {
  // This would set all non-MVP features to false
  // For now, just use the FeatureFlags object
  // MVP Mode: Only core features enabled
};

/**
 * Show "Coming Soon" alert for disabled features
 * Use this when a feature is accessed but not yet enabled
 */
export const showComingSoonAlert = (featureName: string) => {
  const { Alert } = require('react-native');
  Alert.alert(
    'Coming Soon',
    `${featureName} will be available in a future update!`,
    [{ text: 'OK' }]
  );
};

/**
 * Check if feature is enabled, if not show "Coming Soon" alert
 * Returns true if feature is enabled, false if disabled (and shows alert)
 */
export const checkFeatureOrShowComingSoon = (
  feature: keyof typeof FeatureFlags,
  featureName: string
): boolean => {
  if (isFeatureEnabled(feature)) {
    return true;
  }
  showComingSoonAlert(featureName);
  return false;
};



