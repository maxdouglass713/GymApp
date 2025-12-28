import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius, ComponentStyles } from '@/constants/theme';
import { useUserStore } from '@/stores/userStore';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useAuth } from '@/components/AuthProvider';
import { router } from 'expo-router';
import OnboardingStep from '@/components/OnboardingStep';
import { calculatePersonalizedMacros } from '@/utils/macroCalculator';
import { useNutritionStore } from '@/stores/nutritionStore';
import { userService } from '@/services/firestoreService';
import { usePointsStore } from '@/stores/pointsStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { eventBus } from '@/lib/eventBus';
import ProgressScreen from './progress';
import StoreScreen from './store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AIGoalRecalibration } from '@/components/progress/AIGoalRecalibration';
import { useProgressStore } from '@/stores/progressStore';
import { useWeightStore } from '@/stores/weightStore';
import { authService } from '@/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ProfileActionCardProps = {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  footer?: string;
};

const ProfileActionCard = ({ title, description, icon, onPress, footer }: ProfileActionCardProps) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.actionIconContainer}>
      <IconSymbol name={icon as any} size={24} color={BrandColors.accent} />
    </View>
    <Text style={[styles.actionTitle, { color: BrandColors.text }]}>{title}</Text>
    <Text style={[styles.actionDescription, { color: BrandColors.textSecondary }]}>{description}</Text>
    {footer ? (
      <Text style={[styles.actionFooter, { color: BrandColors.textSecondary }]}>{footer}</Text>
    ) : null}
  </TouchableOpacity>
);

type MetricTileProps = { label: string; value: string };

const MetricTile = ({ label, value }: MetricTileProps) => (
  <View style={[styles.metricTile, { borderColor: BrandColors.textSecondary + '25' }]}>
    <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>{label}</Text>
    <Text style={[styles.metricValue, { color: BrandColors.text }]}>{value}</Text>
  </View>
);

export default function ProfileScreen() {
  const { profile, setProfile, clearProfile, syncProfileToFirestore, userDoc } = useUserStore();
  const { user, signOut } = useAuth();
  const { setData, setCurrentStep } = useOnboardingStore();
  const insets = useSafeAreaInsets();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const { totalPoints } = usePointsStore();
  const { favorites } = useFavoritesStore();
  const { workoutHistory } = useWorkoutStore();
  const { tier, getRemainingUsage } = useSubscriptionStore();
  const { dailyWeights } = useWeightStore();
  const { calculateTrendData, calculatePersonalRecords } = useProgressStore();

  const selectedGoalsText = useMemo(() => {
    if (profile?.goals && profile.goals.length > 0) {
      return profile.goals
        .map((goal: string) =>
          goal
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
        )
        .join(', ');
    }

    if (profile?.primaryGoal) {
      return profile.primaryGoal
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
    }

    return undefined;
  }, [profile?.goals, profile?.primaryGoal]);

  const handleEditProfile = () => {
    // Load user's current profile data into onboarding store for editing
    if (profile) {
      setData(profile);
    }
    setShowEditProfile(true);
  };

  const handleEditGoals = () => {
    if (profile) {
      // Ensure goals array is properly initialized from profile
      // Use the existing goals array if it exists and has items, otherwise initialize from primaryGoal
      const goalsArray = profile.goals && Array.isArray(profile.goals) && profile.goals.length > 0 
        ? profile.goals 
        : profile.primaryGoal 
          ? [profile.primaryGoal] 
          : [];
      
      const profileData = {
        ...profile,
        goals: goalsArray,
      };
      
      console.log('🎯 Loading goals for editing:', {
        profileGoals: profile.goals,
        primaryGoal: profile.primaryGoal,
        initializedGoals: goalsArray,
      });
      
      setData(profileData);
    }
    setCurrentStep(6); // Step 6 is Goals (was incorrectly set to 5 which is Experience)
    setShowGoalEditor(true);
  };

  const handleSaveProfile = async () => {
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save your profile.');
        return;
      }

      // Get the updated data from onboarding store
      const { data } = useOnboardingStore.getState();
      
      // Merge with existing profile to ensure all fields are present
      const profileToSave = {
        ...profile,
        ...data,
        // Ensure required fields are present
        firstName: data.firstName || profile?.firstName || '',
        height: data.height?.value ? data.height : profile?.height || { value: '', unit: 'ft/in' },
        weight: data.weight?.value ? data.weight : profile?.weight || { value: '', unit: 'lb' },
      };
      
      console.log('💾 Saving profile:', {
        hasFirstName: !!profileToSave.firstName,
        hasHeight: !!profileToSave.height?.value,
        hasWeight: !!profileToSave.weight?.value,
        goals: profileToSave.goals,
        goalsCount: profileToSave.goals?.length || 0,
      });
      
      // Check if goals have changed
      const currentGoals = Array.isArray(profile?.goals) ? [...profile.goals].sort() : [];
      const newGoals = Array.isArray(profileToSave.goals) ? [...profileToSave.goals].sort() : [];
      const goalsChanged = JSON.stringify(currentGoals) !== JSON.stringify(newGoals);
      
      // Save to user store (local storage)
      await setProfile(profileToSave);
      
      // Save to Firebase if user is authenticated
      if (user && syncProfileToFirestore && typeof syncProfileToFirestore === 'function') {
        console.log('🔥 Syncing profile to Firestore...');
        try {
          await syncProfileToFirestore(user.uid, profileToSave);
          console.log('✅ Profile synced to Firestore successfully');
        } catch (syncError: any) {
          console.error('❌ Error syncing to Firestore:', syncError);
          // Continue even if Firestore sync fails - local save already succeeded
        }
      } else if (user && !syncProfileToFirestore) {
        console.warn('⚠️ syncProfileToFirestore is not available, skipping Firestore sync');
      }
      
      // Auto-recalculate macros if goals changed and user has required data
      if (goalsChanged && user && profileToSave.height?.value && profileToSave.weight?.value) {
        try {
          console.log('🧮 Auto-recalculating macro targets due to goals change...');
          
          // Use the updated profile data for calculation
          const macroCalculation = calculatePersonalizedMacros(profileToSave);
          
          // Save to Firebase
          await userService.updateUser(user.uid, {
            customMacroTargets: {
              calories: macroCalculation.targets.calories,
              protein: macroCalculation.targets.protein,
              carbs: macroCalculation.targets.carbs,
              fat: macroCalculation.targets.fat,
              bmr: macroCalculation.breakdown.bmr,
              tdee: macroCalculation.breakdown.tdee,
              activityMultiplier: macroCalculation.breakdown.activityMultiplier,
              calculatedAt: macroCalculation.lastCalculated,
              basedOnWeight: macroCalculation.basedOn.weight,
              basedOnGoal: macroCalculation.basedOn.goal,
            },
          });
          
          // Update nutrition store with new targets
          const nutritionStore = useNutritionStore.getState();
          if (nutritionStore && typeof nutritionStore.setPersonalizedTargets === 'function') {
            nutritionStore.setPersonalizedTargets(macroCalculation.targets);
          }
          
          // Refresh current day nutrition to use new targets
          if (nutritionStore && typeof nutritionStore.getDailyNutrition === 'function' && nutritionStore.selectedDate) {
            try {
              const selectedDate = nutritionStore.selectedDate;
              const getDailyNutrition = nutritionStore.getDailyNutrition;
              // Ensure selectedDate is a valid Date object
              const dateToUse = selectedDate instanceof Date ? selectedDate : new Date();
              const updatedDayNutrition = getDailyNutrition(dateToUse);
              if (updatedDayNutrition) {
                useNutritionStore.setState({ currentDayNutrition: updatedDayNutrition });
              }
            } catch (refreshError) {
              console.error('❌ Error refreshing daily nutrition:', refreshError);
              // Don't block profile save if refresh fails
            }
          }
          
          console.log('✅ Macros auto-recalculated and saved');
        } catch (macroError) {
          console.error('❌ Error auto-recalculating macros:', macroError);
          // Don't block profile save if macro recalculation fails
        }
      }
      
      setShowEditProfile(false);
      setShowGoalEditor(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('❌ Error saving profile:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error stack:', error?.stack);
      
      const errorMessage = error?.message || 'Unknown error occurred';
      Alert.alert('Error', `Failed to save profile: ${errorMessage}`);
    }
  };

  const handleRecalculateMacros = async () => {
    if (!profile || !user) return;
    
    try {
      console.log('🧮 Recalculating personalized macro targets...');
      
      // Check if user has required data
      if (!profile.height?.value || !profile.weight?.value) {
        Alert.alert('Incomplete Profile', 'Please update your height and weight to calculate personalized macros.');
        return;
      }
      
      // Calculate new macros
      const macroCalculation = calculatePersonalizedMacros(profile);
      
      // Save to Firebase
      await userService.updateUser(user.uid, {
        customMacroTargets: {
          calories: macroCalculation.targets.calories,
          protein: macroCalculation.targets.protein,
          carbs: macroCalculation.targets.carbs,
          fat: macroCalculation.targets.fat,
          bmr: macroCalculation.breakdown.bmr,
          tdee: macroCalculation.breakdown.tdee,
          activityMultiplier: macroCalculation.breakdown.activityMultiplier,
          calculatedAt: macroCalculation.lastCalculated,
          basedOnWeight: macroCalculation.basedOn.weight,
          basedOnGoal: macroCalculation.basedOn.goal,
        },
      });
      
      // Update nutrition store with new targets
      const nutritionStore = useNutritionStore.getState();
      if (nutritionStore && typeof nutritionStore.setPersonalizedTargets === 'function') {
        nutritionStore.setPersonalizedTargets(macroCalculation.targets);
      }
      
      // Refresh current day nutrition to use new targets
      if (nutritionStore && typeof nutritionStore.getDailyNutrition === 'function' && nutritionStore.selectedDate) {
        try {
          const selectedDate = nutritionStore.selectedDate;
          const getDailyNutrition = nutritionStore.getDailyNutrition;
          // Ensure selectedDate is a valid Date object
          const dateToUse = selectedDate instanceof Date ? selectedDate : new Date();
          const updatedDayNutrition = getDailyNutrition(dateToUse);
          if (updatedDayNutrition) {
            useNutritionStore.setState({ currentDayNutrition: updatedDayNutrition });
          }
        } catch (refreshError) {
          console.error('❌ Error refreshing daily nutrition:', refreshError);
          // Don't block macro recalculation if refresh fails
        }
      }
      
      Alert.alert(
        'Macros Updated!', 
        `Your daily targets have been recalculated:\n\nCalories: ${macroCalculation.targets.calories}\nProtein: ${macroCalculation.targets.protein}g\nCarbs: ${macroCalculation.targets.carbs}g\nFat: ${macroCalculation.targets.fat}g`
      );
      
      console.log('✅ Macros recalculated and saved to Firebase');
    } catch (error) {
      console.error('❌ Error recalculating macros:', error);
      Alert.alert('Error', 'Failed to recalculate macro targets. Please try again.');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              clearProfile();
              // Keep onboarding status intact so returning users skip onboarding
              router.replace('/auth/signin');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.\n\nThis will permanently delete:\n• Your email and password\n• All workouts, meals, and cardio logs\n• All points earned\n• All saved data and preferences',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              // Show loading state
              Alert.alert('Deleting Account', 'Please wait while we delete your account and all data...');
              
              // Delete account and all data
              await authService.deleteAccount();
              
              // Clear all local storage
              try {
                await AsyncStorage.clear();
              } catch (storageError) {
                console.warn('⚠️ Error clearing AsyncStorage:', storageError);
              }
              
              // Clear all stores
              clearProfile();
              
              // Navigate to sign in
              router.replace('/auth/signin');
              
              Alert.alert(
                'Account Deleted',
                'Your account and all associated data have been permanently deleted.'
              );
            } catch (error: any) {
              console.error('❌ Error deleting account:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to delete account. Please try again or contact support if the issue persists.'
              );
            }
          },
        },
      ]
    );
  };

  const initials = useMemo(() => {
    const name = profile?.firstName || user?.displayName || user?.email || 'You';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.firstName, user?.displayName, user?.email]);

  const lastWorkout = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) {
      return null;
    }
    return [...workoutHistory].sort((a, b) => {
      const aDate = new Date(a.completedAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.completedAt || b.createdAt || 0).getTime();
      return bDate - aDate;
    })[0];
  }, [workoutHistory]);

  const macroTargets = useNutritionStore((state) => {
    if (state.getTargets) {
      return state.getTargets();
    }
    return state.personalizedTargets;
  }) || userDoc?.customMacroTargets;

  const playsSports = profile?.playsSports === true || profile?.sport || profile?.teamName;

  return (
    <ScrollView style={ComponentStyles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroCard}>
        <View style={[styles.avatar, { backgroundColor: BrandColors.accent + '20', borderColor: BrandColors.accent + '60' }]}>
          <Text style={[styles.avatarText, { color: BrandColors.accent }]}>{initials}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={[styles.displayName, { color: BrandColors.text }]}>
            {profile?.firstName || user?.displayName || 'Athlete'}
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <IconSymbol name="bolt.fill" size={18} color={BrandColors.accent} />
              <Text style={[styles.heroStatValue, { color: BrandColors.accent }]}>{totalPoints}</Text>
              <Text style={[styles.heroStatLabel, { color: BrandColors.textSecondary }]}>Volts</Text>
            </View>
            <View style={styles.heroStat}>
              <IconSymbol name="figure.strengthtraining.traditional" size={18} color={BrandColors.accent} />
              <Text style={[styles.heroStatValue, { color: BrandColors.accent }]}>
                {workoutHistory?.length || 0}
              </Text>
              <Text style={[styles.heroStatLabel, { color: BrandColors.textSecondary }]}>Workouts</Text>
            </View>
          </View>
          {/* Subscription Tier Badge - HIDDEN for v1.0 App Store submission */}
          {/* <View style={[styles.tierBadge, { 
            backgroundColor: tier === 'elite' ? BrandColors.accent + '20' : 
                            tier === 'pro' ? BrandColors.info + '20' : 
                            tier === 'basic' ? BrandColors.success + '20' : 
                            BrandColors.gray800,
            borderColor: tier === 'elite' ? BrandColors.accent : 
                        tier === 'pro' ? BrandColors.info : 
                        tier === 'basic' ? BrandColors.success : 
                        BrandColors.gray700,
          }]}>
            <IconSymbol 
              name={tier === 'elite' ? 'sparkles' : tier === 'pro' ? 'star.fill' : tier === 'basic' ? 'bolt.fill' : 'lock.fill'} 
              size={14} 
              color={tier === 'elite' ? BrandColors.accent : tier === 'pro' ? BrandColors.info : tier === 'basic' ? BrandColors.success : BrandColors.textSecondary} 
            />
            <Text style={[styles.tierBadgeText, { 
              color: tier === 'elite' ? BrandColors.accent : 
                     tier === 'pro' ? BrandColors.info : 
                     tier === 'basic' ? BrandColors.success : 
                     BrandColors.textSecondary 
            }]}>
              {tier === 'elite' ? 'Elite' : tier === 'pro' ? 'Pro' : tier === 'basic' ? 'Basic' : 'Free'} Tier
            </Text>
            {tier === 'pro' && (
              <Text style={[styles.tierBadgeSubtext, { color: BrandColors.textSecondary }]}>
                {getRemainingUsage('mealPlan')} meal plans left
              </Text>
            )}
          </View> */}
          {lastWorkout && (
            <View style={styles.lastWorkoutContainer}>
              <IconSymbol name="flame.fill" size={14} color={BrandColors.accent} />
              <Text style={[styles.lastWorkoutText, { color: BrandColors.textSecondary }]}>
                Last workout: {lastWorkout.title || 'Workout'} on{' '}
                {new Date(lastWorkout.date || lastWorkout.createdAt || Date.now()).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.editHeroButton} onPress={handleEditProfile} activeOpacity={0.85}>
          <IconSymbol name="pencil" size={18} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <ProfileActionCard
          title="Update Goals"
          description="Adjust your focus & schedule"
          icon="target"
          onPress={handleEditGoals}
          footer={selectedGoalsText ? `Selected: ${selectedGoalsText}` : 'Selected: Not set'}
        />
        <ProfileActionCard
          title="Progress"
          description="Track your fitness journey"
          icon="chart.line.uptrend.xyaxis"
          onPress={() => setShowProgress(true)}
        />
        <ProfileActionCard
          title="Rewards"
          description="Redeem your points for upgrades & perks"
          icon="cart.fill"
          onPress={() => setShowStore(true)}
        />
      </View>
      
      {/* AI Goal Recalibration - Placed outside actionRow to avoid layout conflicts */}
      {selectedGoalsText && workoutHistory && workoutHistory.length > 0 && (
        <View style={{ marginTop: Spacing.md }}>
          <AIGoalRecalibration
            userGoals={profile?.goals && profile.goals.length > 0 
              ? profile.goals 
              : profile?.primaryGoal 
                ? [profile.primaryGoal] 
                : []}
            personalRecords={calculatePersonalRecords(workoutHistory)}
            trendData={calculateTrendData(workoutHistory, '4W')}
            weightHistory={dailyWeights?.map(w => ({ date: w.date, weight: w.weight }))}
          />
        </View>
      )}

      <View style={[ComponentStyles.card, styles.snapshotCard]}>
        <View style={styles.cardTitleRow}>
          <IconSymbol name="figure.strengthtraining.traditional" size={20} color={BrandColors.accent} />
          <Text style={[styles.cardTitle, { color: BrandColors.text }]}>Training Summary</Text>
        </View>
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotLabelContainer}>
            <IconSymbol name="target" size={14} color={BrandColors.textSecondary} />
            <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Primary Goal</Text>
          </View>
          <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
            {profile?.goals && profile.goals.length > 0
              ? profile.goals
                  .map((goal: string) =>
                    goal
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())
                  )
                  .join(', ')
              : profile?.primaryGoal
                ? profile.primaryGoal.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                : 'Not set'}
          </Text>
        </View>
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotLabelContainer}>
            <IconSymbol name="star.fill" size={14} color={BrandColors.textSecondary} />
            <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Experience</Text>
          </View>
          <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
            {profile?.exerciseExperience
              ? profile.exerciseExperience.charAt(0).toUpperCase() + profile.exerciseExperience.slice(1)
              : 'Not set'}
          </Text>
        </View>
        <View style={styles.snapshotRow}>
          <View style={styles.snapshotLabelContainer}>
            <IconSymbol name="calendar" size={14} color={BrandColors.textSecondary} />
            <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Weekly Schedule</Text>
          </View>
          <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
            {profile?.weeklySchedule ? `${profile.weeklySchedule} days / week` : 'Not set'}
          </Text>
        </View>
      </View>

      <View style={[ComponentStyles.card, styles.snapshotCard]}>
        <View style={styles.cardTitleRow}>
          <IconSymbol name="chart.bar.fill" size={20} color={BrandColors.accent} />
          <Text style={[styles.cardTitle, { color: BrandColors.text }]}>Health Metrics</Text>
        </View>
        <View style={styles.metricsGrid}>
          <MetricTile label="Height" value={profile?.height?.value ? `${profile.height.value} ${profile.height.unit}` : '—'} />
          <MetricTile label="Weight" value={profile?.weight?.value ? `${profile.weight.value} ${profile.weight.unit}` : '—'} />
          <MetricTile label="Calories" value={macroTargets?.calories ? `${macroTargets.calories} kcal` : '—'} />
          <MetricTile label="Protein" value={macroTargets?.protein ? `${macroTargets.protein} g` : '—'} />
          <MetricTile label="Carbs" value={macroTargets?.carbs ? `${macroTargets.carbs} g` : '—'} />
          <MetricTile label="Fat" value={macroTargets?.fat ? `${macroTargets.fat} g` : '—'} />
        </View>
      </View>

      {playsSports ? (
        <View style={[ComponentStyles.card, styles.snapshotCard]}>
          <View style={styles.cardTitleRow}>
            <IconSymbol name="sportscourt.fill" size={20} color={BrandColors.accent} />
            <Text style={[styles.cardTitle, { color: BrandColors.text }]}>Sports & Teams</Text>
          </View>
          <View style={styles.snapshotRow}>
            <View style={styles.snapshotLabelContainer}>
              <IconSymbol name="figure.run" size={14} color={BrandColors.textSecondary} />
              <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Sport</Text>
            </View>
            <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
              {profile?.sport || 'Not set'}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <View style={styles.snapshotLabelContainer}>
              <IconSymbol name="person.3.fill" size={14} color={BrandColors.textSecondary} />
              <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Team</Text>
            </View>
            <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
              {profile?.teamName || 'Not set'}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <View style={styles.snapshotLabelContainer}>
              <IconSymbol name="checkmark.circle.fill" size={14} color={BrandColors.textSecondary} />
              <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Plays Sports</Text>
            </View>
            <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
              {profile?.playsSports ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        activeOpacity={0.9}
        style={[ComponentStyles.card, styles.libraryCard]}
        onPress={() => router.push('/workout/library')}
      >
        <View style={styles.libraryHeader}>
          <IconSymbol name="books.vertical.fill" size={24} color={BrandColors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.libraryTitle, { color: BrandColors.text }]}>Library</Text>
            <Text style={[styles.librarySubtitle, { color: BrandColors.textSecondary }]}>
              Browse your saved workouts and meals, or create custom exercises.
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color={BrandColors.textSecondary} />
        </View>
      </TouchableOpacity>

      <View style={[ComponentStyles.card, styles.accountCard]}>
        <Text style={[styles.accountTitle, { color: BrandColors.text }]}>Account</Text>
        {user && (
          <View style={styles.accountInfo}>
            <Text style={[styles.accountEmail, { color: BrandColors.textSecondary }]}>{user.email}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={[styles.signOutButtonText, { color: '#fff' }]}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount} activeOpacity={0.85}>
          <Text style={[styles.deleteAccountButtonText, { color: '#fff' }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowEditProfile(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile Settings</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Height Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Height</Text>
              <OnboardingStep step={2} />
            </View>

            {/* Weight Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Weight</Text>
              <OnboardingStep step={3} />
            </View>

            {/* Schedule Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Workout Schedule</Text>
              <OnboardingStep step={8} />
            </View>

            {/* Injury Limitations Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Injury Limitations</Text>
              <OnboardingStep step={9} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Goals Editor Modal */}
      <Modal
        visible={showGoalEditor}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowGoalEditor(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Update Fitness Goals</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Fitness Goals</Text>
              <OnboardingStep step={6} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Progress Modal */}
      <Modal
        visible={showProgress}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowProgress(false)}
      >
        <ProgressScreen />
        <TouchableOpacity
          style={[
            styles.modalBackButtonSmall,
            {
              backgroundColor: BrandColors.accent,
              top: Math.max(insets.top + 8, 16),
            }
          ]}
          onPress={() => setShowProgress(false)}
          activeOpacity={0.8}
        >
          <IconSymbol name="chevron.left" size={16} color="#000" />
        </TouchableOpacity>
      </Modal>

      {/* Store Modal */}
      <Modal
        visible={showStore}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowStore(false)}
      >
        <StoreScreen hideAdAndRestore={true} />
        <TouchableOpacity
          style={[
            styles.modalBackButtonSmall,
            {
              backgroundColor: BrandColors.accent,
              top: Math.max(insets.top + 8, 16),
            }
          ]}
          onPress={() => setShowStore(false)}
          activeOpacity={0.8}
        >
          <IconSymbol name="chevron.left" size={16} color="#000" />
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  heroCard: {
    backgroundColor: BrandColors.gray800,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: BrandColors.accent + '40',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    position: 'relative',
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  avatarText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  heroInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  heroStat: {
    alignItems: 'flex-start',
    gap: 4,
  },
  actionIconContainer: {
    marginBottom: Spacing.xs,
  },
  heroStatValue: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  heroStatLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
  },
  lastWorkoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  lastWorkoutText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  tierBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  tierBadgeSubtext: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginLeft: Spacing.xs,
  },
  editHeroButton: {
    backgroundColor: BrandColors.accent,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: BrandColors.gray800,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.accent + '30',
    gap: Spacing.xs,
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  actionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  actionDescription: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 16,
    fontFamily: Typography.fontFamily,
  },
  actionFooter: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.xs,
  },
  snapshotCard: {
    gap: Spacing.sm,
    borderColor: BrandColors.accent + '30',
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  snapshotLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  snapshotLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
  },
  snapshotValue: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.medium,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metricTile: {
    width: '30%',
    minWidth: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.accent + '30',
    padding: Spacing.sm,
    backgroundColor: BrandColors.gray800,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: 4,
    fontFamily: Typography.fontFamily,
  },
  metricValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  recalculateButton: {
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  recalculateButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  workoutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: BrandColors.accent + '15',
  },
  viewAllButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  favoriteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderColor: BrandColors.gray700,
  },
  favoriteInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  favoriteName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  favoriteMeta: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  favoriteUseButton: {
    backgroundColor: BrandColors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  favoriteUseButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  libraryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderColor: BrandColors.accent + '30',
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  libraryTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  librarySubtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  accountCard: {
    gap: Spacing.md,
    borderColor: BrandColors.accent + '30',
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  accountTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  accountInfo: {
    marginBottom: Spacing.sm,
  },
  accountEmail: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  deleteAccountButton: {
    backgroundColor: '#991b1b',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  deleteAccountButtonText: {
    color: '#fff',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  emptyCard: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  setupButton: {
    backgroundColor: BrandColors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  setupButtonText: {
    color: '#ffffff',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  modalTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  saveButton: {
    backgroundColor: BrandColors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  editSection: {
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  sectionTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.md,
  },
  modalBackButton: {
    position: 'absolute',
    left: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalBackButtonSmall: {
    position: 'absolute',
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalBackButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
});
