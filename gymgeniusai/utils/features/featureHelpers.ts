/**
 * Feature name and description mappings
 */

export const getFeatureName = (key: string): string => {
  const featureNames: Record<string, string> = {
    'nutrition_meal_ideas': 'Nutrition Meal Ideas',
    'workout_ideas': 'Workout Ideas',
    'advanced_insights': 'Advanced AI Insights',
    'community_challenges': 'Community Challenges',
    'ai_coach': 'AI Coach',
  };
  return featureNames[key] || key.replace('_', ' ').toUpperCase();
};

export const getFeatureDisplayName = (key: string): string => {
  const featureNames: Record<string, string> = {
    'nutrition_meal_ideas': 'Custom Meal Ideas',
    'workout_ideas': 'Workout Ideas',
    'advanced_insights': 'Advanced AI Insights',
    'community_challenges': 'Community Challenges',
    'ai_coach': 'AI Coach',
  };
  return featureNames[key] || key.replace('_', ' ').toUpperCase();
};

export const getFeatureDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    'nutrition_meal_ideas': 'Get personalized meal ideas and recipes tailored to your fitness goals. Includes macro breakdowns and grocery lists.',
    'workout_ideas': 'Access a library of workout routines and exercise variations. Get fresh ideas to keep your training exciting and effective.',
    'advanced_insights': 'Deep dive into your fitness data with AI-powered analysis. Track muscle volume trends, identify weak points, and get personalized recommendations.',
    'community_challenges': 'Join fitness challenges, compete on leaderboards, and connect with other users. Share your progress and stay motivated together.',
    'ai_coach': 'Get personalized fitness advice from our AI coach. Ask questions about workouts, nutrition, and get expert guidance anytime.',
  };
  return descriptions[key] || 'Unlock this feature to enhance your fitness journey.';
};

export const getFeatureDescriptionShort = (key: string): string => {
  const descriptions: Record<string, string> = {
    'nutrition_meal_ideas': 'Get AI-generated personalized meal plans with 4 complete meals (breakfast, lunch, dinner, snack). Includes macro breakdowns and ingredients.',
    'workout_ideas': 'Access a library of workout routines and exercise variations. Get fresh ideas to keep your training exciting and effective.',
    'advanced_insights': 'Deep dive into your fitness data with AI-powered analysis. Track muscle volume trends, identify weak points, and get personalized recommendations.',
    'community_challenges': 'Join fitness challenges, compete on leaderboards, and connect with other users. Share your progress and stay motivated together.',
    'ai_coach': 'Get personalized fitness advice from our AI coach. Ask questions about workouts, nutrition, and get expert guidance anytime.',
  };
  return descriptions[key] || 'Unlock this feature to enhance your fitness journey.';
};

