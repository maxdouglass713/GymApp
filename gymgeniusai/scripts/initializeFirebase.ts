// Run this script once to initialize your Firebase database with default data
import { featureService } from '../services/firestoreService';

export const initializeFeatureCatalog = async () => {
  console.log('🚀 Initializing Firebase feature catalog...');
  
  const features = [
    {
      featureKey: 'workout_plans_pro',
      name: 'Workout Plans Pro',
      description: 'Adaptive workout plans with periodization and advanced programming',
      pointsRequired: 2800,
      isActive: true,
    },
    {
      featureKey: 'nutrition_planner',
      name: 'Nutrition Planner',
      description: 'Personalized macros, meal planning, and grocery lists',
      pointsRequired: 1200,
      isActive: true,
    },
    {
      featureKey: 'photo_macros',
      name: 'Photo to Macros',
      description: 'AI-powered meal photo analysis for instant macro tracking',
      pointsRequired: 5000,
      isActive: true,
    },
    {
      featureKey: 'ai_coach',
      name: 'AI Chat Coach',
      description: 'Personalized fitness advice, motivation, and workout guidance',
      pointsRequired: 4500,
      isActive: true,
    },
    {
      featureKey: 'community_challenges',
      name: 'Community Challenges',
      description: 'Join challenges, compete with friends, and earn badges',
      pointsRequired: 3000,
      isActive: true,
    },
    {
      featureKey: 'form_feedback',
      name: 'Form Feedback',
      description: 'Camera-based rep counting and real-time form analysis',
      pointsRequired: 6000,
      isActive: true,
    },
    {
      featureKey: 'advanced_progress',
      name: 'Advanced Progress Insights',
      description: 'Muscle volume trends, fatigue analysis, and consistency flags',
      pointsRequired: 2000,
      isActive: true,
    },
  ];

  try {
    for (const feature of features) {
      // Note: You'll need to implement createFeature in featureService
      console.log(`Creating feature: ${feature.name}`);
      // await featureService.createFeature(feature);
    }
    
    console.log('✅ Feature catalog initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing feature catalog:', error);
  }
};

// Uncomment and run this when you're ready to initialize
// initializeFeatureCatalog();

