import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getFeatureDisplayName, getFeatureDescriptionShort } from '@/utils/features/featureHelpers';

interface UseFeatureHandlingProps {
  totalPoints: number;
  user: { uid: string } | null;
  isFeatureUnlocked: (key: string) => boolean;
  spendPoints: (points: number, reason: string, uid: string) => Promise<boolean>;
  unlockFeature: (key: string, via: 'gp' | 'purchase' | 'premium', uid: string) => Promise<void>;
  setShowFeatureLadder: (show: boolean) => void;
  setIsInitialMealPlanGeneration: (value: boolean) => void;
  setShowMealPlanGenerator: (show: boolean) => void;
  setIsInitialWorkoutPlanGeneration: (value: boolean) => void;
  setShowWorkoutPlanGenerator: (show: boolean) => void;
}

export const useFeatureHandling = ({
  totalPoints,
  user,
  isFeatureUnlocked,
  spendPoints,
  unlockFeature,
  setShowFeatureLadder,
  setIsInitialMealPlanGeneration,
  setShowMealPlanGenerator,
  setIsInitialWorkoutPlanGeneration,
  setShowWorkoutPlanGenerator,
}: UseFeatureHandlingProps) => {
  const handleFeatureClick = async (featureKey: string, points: number) => {
    const featureName = getFeatureDisplayName(featureKey);
    const description = getFeatureDescriptionShort(featureKey);
    const isUnlocked = isFeatureUnlocked(featureKey);
    const canUnlock = totalPoints >= points;

    // Special handling for nutrition_meal_ideas - simplified approach
    if (featureKey === 'nutrition_meal_ideas') {
      // Always allow access to history, regardless of points
      const options = [
        {
          text: 'View History',
          onPress: () => {
            setShowFeatureLadder(false);
            setIsInitialMealPlanGeneration(false);
            setShowMealPlanGenerator(true);
          },
        },
      ];
      
      // Only show generate option if they have enough points
      if (totalPoints >= points) {
        options.push({
          text: `Generate New Meals (${points.toLocaleString()} V)`,
          onPress: async () => {
            try {
              if (!user?.uid) {
                Alert.alert('Error', 'You must be logged in to generate meals.');
                return;
              }
              
              // Deduct points for generation
              await spendPoints(points, 'generate_meal_plan', user.uid);
              
              // Close feature ladder immediately
              setShowFeatureLadder(false);
              
              // Open meal plan generator with new generation
              setTimeout(() => {
                setIsInitialMealPlanGeneration(true);
                setShowMealPlanGenerator(true);
              }, 100);
            } catch (error) {
              console.error('Error generating meals:', error);
              Alert.alert('Error', 'Failed to generate meals. Please try again.');
            }
          },
        });
      } else {
        // Add option to show insufficient points info
        options.push({
          text: `Generate New Meals (Need ${(points - totalPoints).toLocaleString()} more V)`,
          onPress: () => {
            Alert.alert(
              'Insufficient Points',
              `You need ${points.toLocaleString()} V to generate new meals.\n\nYour Balance: ${totalPoints.toLocaleString()} V\n\nEarn more points by logging workouts and meals!`,
              [{ text: 'OK' }]
            );
          },
        });
      }
      
      options.push({ text: 'Cancel', style: 'cancel' } as any);
      
      Alert.alert(
        'Custom Meal Ideas',
        'What would you like to do?',
        options
      );
      return;
    }

    // Special handling for workout_ideas - similar to meal ideas
    if (featureKey === 'workout_ideas') {
      // Always allow access to history, regardless of points
      const options = [
        {
          text: 'View History',
          onPress: () => {
            setShowFeatureLadder(false);
            setIsInitialWorkoutPlanGeneration(false);
            setShowWorkoutPlanGenerator(true);
          },
        },
      ];
      
      // Only show generate option if they have enough points
      if (totalPoints >= points) {
        options.push({
          text: `Generate New Workouts (${points.toLocaleString()} V)`,
          onPress: async () => {
            try {
              if (!user?.uid) {
                Alert.alert('Error', 'You must be logged in to generate workouts.');
                return;
              }
              
              // Deduct points for generation
              await spendPoints(points, 'generate_workout_plan', user.uid);
              
              // Close feature ladder immediately
              setShowFeatureLadder(false);
              
              // Open workout plan generator with new generation
              setTimeout(() => {
                setIsInitialWorkoutPlanGeneration(true);
                setShowWorkoutPlanGenerator(true);
              }, 100);
            } catch (error) {
              console.error('Error generating workouts:', error);
              Alert.alert('Error', 'Failed to generate workouts. Please try again.');
            }
          },
        });
      } else {
        // Add option to show insufficient points info
        options.push({
          text: `Generate New Workouts (Need ${(points - totalPoints).toLocaleString()} more V)`,
          onPress: () => {
            Alert.alert(
              'Insufficient Points',
              `You need ${points.toLocaleString()} V to generate new workouts.\n\nYour Balance: ${totalPoints.toLocaleString()} V\n\nEarn more points by logging workouts and meals!`,
              [{ text: 'OK' }]
            );
          },
        });
      }
      
      options.push({ text: 'Cancel', style: 'cancel' } as any);
      
      Alert.alert(
        'Custom Workout Ideas',
        'What would you like to do?',
        options
      );
      return;
    }

    // Special handling for community_challenges
    if (featureKey === 'community_challenges') {
      if (isUnlocked) {
        // Already unlocked - navigate directly to Community tab
        setShowFeatureLadder(false);
        router.push('/(tabs)/community');
        return;
      }
      
      // Not unlocked yet - show unlock option
      Alert.alert(
        featureName,
        `${description}\n\nCost: ${points.toLocaleString()} V\n\n${canUnlock ? 'You can unlock this feature!' : `You need ${(points - totalPoints).toLocaleString()} more V`}`,
        [
          {
            text: 'Close',
            style: 'cancel',
          },
          ...(canUnlock ? [{
            text: 'Unlock',
            onPress: async () => {
              try {
                if (!user?.uid) {
                  Alert.alert('Error', 'You must be logged in to unlock features.');
                  return;
                }
                await unlockFeature(featureKey, 'gp', user.uid);
                
                // Close feature ladder and navigate to Community tab
                setShowFeatureLadder(false);
                
                Alert.alert(
                  'Community Challenges Unlocked! 🎉',
                  'Join challenges and compete with other users!',
                  [
                    {
                      text: 'View Challenges',
                      onPress: () => {
                        setTimeout(() => {
                          router.push('/(tabs)/community');
                        }, 100);
                      }
                    }
                  ]
                );
              } catch (error) {
                Alert.alert('Error', 'Failed to unlock feature. Please try again.');
              }
            },
          }] : []),
        ]
      );
      return;
    }

    // Default behavior for other features
    Alert.alert(
      featureName,
      `${description}\n\nCost: ${points.toLocaleString()} V\nStatus: ${isUnlocked ? '✓ Unlocked' : '🔒 Locked'}\n\n${canUnlock && !isUnlocked ? 'You can unlock this feature!' : !canUnlock ? `You need ${(points - totalPoints).toLocaleString()} more V` : ''}`,
      [
        {
          text: 'Close',
          style: 'cancel',
        },
        ...(canUnlock && !isUnlocked ? [{
          text: 'Unlock',
          onPress: async () => {
            try {
              if (!user?.uid) {
                Alert.alert('Error', 'You must be logged in to unlock features.');
                return;
              }
              await unlockFeature(featureKey, 'gp', user.uid);
              Alert.alert('Success', `${featureName} unlocked!`);
            } catch (error) {
              Alert.alert('Error', 'Failed to unlock feature. Please try again.');
            }
          },
        }] : []),
      ]
    );
  };

  return { handleFeatureClick };
};

