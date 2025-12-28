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
    // AI Features
    'ai_meal_plans': 'AI Meal Plans',
    'ai_macro_estimation': 'AI Macro Estimation',
    'ai_photo_detection': 'AI Photo Detection',
    'ai_workout_plans': 'AI Workout Plans',
    'ai_exercise_suggestions': 'AI Exercise Suggestions',
    'ai_progress_insights': 'AI Progress Insights',
    'ai_goal_recalibration': 'AI Goal Recalibration',
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
    // AI Features
    'ai_meal_plans': 'AI Meal Plans',
    'ai_macro_estimation': 'AI Macro Estimation',
    'ai_photo_detection': 'AI Photo Detection',
    'ai_workout_plans': 'AI Workout Plans',
    'ai_exercise_suggestions': 'AI Exercise Suggestions',
    'ai_progress_insights': 'AI Progress Insights',
    'ai_goal_recalibration': 'AI Goal Recalibration',
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
    // AI Features
    'ai_meal_plans': 'Generate personalized meal plans tailored to your goals, dietary preferences, and macros. (Pro/Elite tier required)',
    'ai_macro_estimation': 'Get instant macro estimates for custom meals just by entering the name and serving size. (Pro/Elite tier required)',
    'ai_photo_detection': 'Snap a photo of your meal and let AI detect the food and estimate macros automatically. (Pro/Elite tier required)',
    'ai_workout_plans': 'Create custom workout programs based on your goals, experience, and available equipment. (Pro/Elite tier required)',
    'ai_exercise_suggestions': 'Get smart exercise recommendations as you build your workout for optimal muscle targeting. (Pro/Elite tier required)',
    'ai_progress_insights': 'Get personalized analysis of your training trends, volume spikes, and weak points. (Pro/Elite tier required)',
    'ai_goal_recalibration': 'Analyze your progress and get realistic timelines, PR predictions, and goal adjustments. (Pro/Elite tier required)',
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
    // AI Features
    'ai_meal_plans': 'AI-powered personalized meal plans with perfect macro balance. (Pro/Elite tier required)',
    'ai_macro_estimation': 'Instant macro estimates for custom meals. (Pro/Elite tier required)',
    'ai_photo_detection': 'Photo-based food detection and macro estimation. (Pro/Elite tier required)',
    'ai_workout_plans': 'Custom workout programs tailored to your goals. (Pro/Elite tier required)',
    'ai_exercise_suggestions': 'Smart exercise recommendations during workout building. (Pro/Elite tier required)',
    'ai_progress_insights': 'AI-powered analysis of training trends and weak points. (Pro/Elite tier required)',
    'ai_goal_recalibration': 'Realistic timelines, PR predictions, and goal adjustments. (Pro/Elite tier required)',
  };
  return descriptions[key] || 'Unlock this feature to enhance your fitness journey.';
};

