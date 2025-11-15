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
import { eventBus } from '@/lib/eventBus';

type ProfileActionCardProps = {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  footer?: string;
};

const ProfileActionCard = ({ title, description, icon, onPress, footer }: ProfileActionCardProps) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.85}>
    <Text style={[styles.actionIcon, { color: BrandColors.accent }]}>{icon}</Text>
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
  const { profile, setProfile, clearProfile, syncProfileToFirestore } = useUserStore();
  const { user, signOut } = useAuth();
  const { setData, setCurrentStep } = useOnboardingStore();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const { totalPoints } = usePointsStore();
  const { favorites } = useFavoritesStore();
  const { workoutHistory } = useWorkoutStore();

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
      setData(profile);
    }
    setCurrentStep(5);
    setShowGoalEditor(true);
  };

  const handleSaveProfile = async () => {
    try {
      // Get the updated data from onboarding store
      const { data } = useOnboardingStore.getState();
      
      // Save to user store (local storage)
      await setProfile(data);
      
      // Save to Firebase if user is authenticated
      if (user) {
        await syncProfileToFirestore(user.uid, data);
      }
      
      setShowEditProfile(false);
      setShowGoalEditor(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
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
      useNutritionStore.getState().setPersonalizedTargets(macroCalculation.targets);
      
      // Refresh current day nutrition to use new targets
      const { selectedDate, getDailyNutrition } = useNutritionStore.getState();
      const updatedDayNutrition = getDailyNutrition(selectedDate);
      useNutritionStore.setState({ currentDayNutrition: updatedDayNutrition });
      
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
  }) || profile?.customMacroTargets;

  const playsSports = profile?.playsSports === true || profile?.sport || profile?.teamName;

  return (
    <ScrollView style={ComponentStyles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroCard}>
        <View style={[styles.avatar, { backgroundColor: BrandColors.accent + '30' }]}>
          <Text style={[styles.avatarText, { color: BrandColors.accent }]}>{initials}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={[styles.displayName, { color: BrandColors.text }]}>
            {profile?.firstName || user?.displayName || 'Athlete'}
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: BrandColors.accent }]}>{totalPoints}</Text>
              <Text style={[styles.heroStatLabel, { color: BrandColors.textSecondary }]}>Total Points</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: BrandColors.accent }]}>
                {workoutHistory?.length || 0}
              </Text>
              <Text style={[styles.heroStatLabel, { color: BrandColors.textSecondary }]}>Workouts Logged</Text>
            </View>
          </View>
          {lastWorkout && (
            <Text style={[styles.lastWorkoutText, { color: BrandColors.textSecondary }]}>
              Last workout: {lastWorkout.title || 'Workout'} on{' '}
              {new Date(lastWorkout.date || lastWorkout.createdAt || Date.now()).toLocaleDateString()}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.editHeroButton} onPress={handleEditProfile} activeOpacity={0.85}>
          <Text style={[styles.editHeroButtonText, { color: '#000' }]}>✎</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <ProfileActionCard
          title="Update Goals"
          description="Adjust your focus & schedule"
          icon="🎯"
          onPress={handleEditGoals}
          footer={selectedGoalsText ? `Selected: ${selectedGoalsText}` : 'Selected: Not set'}
        />
        <ProfileActionCard
          title="Manage Communities"
          description="Teams & personal groups"
          icon="🤝"
          onPress={() => router.push('/(tabs)/community')}
        />
        <ProfileActionCard
          title="Support"
          description="Get help or share feedback"
          icon="💬"
          onPress={() => Alert.alert('Support', 'Need help? Email support@gymgenius.ai')}
        />
      </View>

      <View style={[ComponentStyles.card, styles.snapshotCard]}>
        <Text style={[styles.cardTitle, { color: BrandColors.text }]}>Training Summary</Text>
        <View style={styles.snapshotRow}>
          <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Primary Goal</Text>
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
          <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Experience</Text>
          <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
            {profile?.exerciseExperience
              ? profile.exerciseExperience.charAt(0).toUpperCase() + profile.exerciseExperience.slice(1)
              : 'Not set'}
          </Text>
        </View>
        <View style={styles.snapshotRow}>
          <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Weekly Schedule</Text>
          <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
            {profile?.weeklySchedule ? `${profile.weeklySchedule} days / week` : 'Not set'}
          </Text>
        </View>
      </View>

      <View style={[ComponentStyles.card, styles.snapshotCard]}>
        <Text style={[styles.cardTitle, { color: BrandColors.text }]}>Health Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricTile label="Height" value={profile?.height?.value ? `${profile.height.value} ${profile.height.unit}` : '—'} />
          <MetricTile label="Weight" value={profile?.weight?.value ? `${profile.weight.value} ${profile.weight.unit}` : '—'} />
          <MetricTile label="Calories" value={macroTargets?.calories ? `${macroTargets.calories} kcal` : '—'} />
          <MetricTile label="Protein" value={macroTargets?.protein ? `${macroTargets.protein} g` : '—'} />
          <MetricTile label="Carbs" value={macroTargets?.carbs ? `${macroTargets.carbs} g` : '—'} />
          <MetricTile label="Fat" value={macroTargets?.fat ? `${macroTargets.fat} g` : '—'} />
        </View>
        <TouchableOpacity
          style={[styles.recalculateButton, { backgroundColor: BrandColors.accent }]}
          onPress={handleRecalculateMacros}
          activeOpacity={0.85}
        >
          <Text style={[styles.recalculateButtonText, { color: '#000' }]}>🧮 Recalculate Nutrition Targets</Text>
        </TouchableOpacity>
      </View>

      {playsSports ? (
        <View style={[ComponentStyles.card, styles.snapshotCard]}>
          <Text style={[styles.cardTitle, { color: BrandColors.text }]}>Sports & Teams</Text>
          <View style={styles.snapshotRow}>
            <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Sport</Text>
            <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
              {profile?.sport || 'Not set'}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Team</Text>
            <Text style={[styles.snapshotValue, { color: BrandColors.text }]}>
              {profile?.teamName || 'Not set'}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <Text style={[styles.snapshotLabel, { color: BrandColors.textSecondary }]}>Plays Sports</Text>
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
          <Text style={[styles.libraryIcon, { color: BrandColors.accent }]}>📚</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.libraryTitle, { color: BrandColors.text }]}>Workout Library</Text>
            <Text style={[styles.librarySubtitle, { color: BrandColors.textSecondary }]}>
              Browse your saved templates or create custom exercises.
            </Text>
          </View>
          <Text style={[styles.libraryChevron, { color: BrandColors.textSecondary }]}>›</Text>
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

            {/* Sex Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Sex</Text>
              <OnboardingStep step={4} />
            </View>

            {/* Goals Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Fitness Goals</Text>
              <OnboardingStep step={6} />
            </View>

            {/* Schedule Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Workout Schedule</Text>
              <OnboardingStep step={8} />
            </View>

            {/* Sports Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Sports</Text>
              <OnboardingStep step={9} />
            </View>

            {/* Sport Selection Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Sport Selection</Text>
              <OnboardingStep step={10} />
            </View>

            {/* Team Name Step */}
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Team Name</Text>
              <OnboardingStep step={12} />
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
              <OnboardingStep step={5} />
            </View>
          </ScrollView>
        </View>
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
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: BrandColors.gray700,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
  lastWorkoutText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.xs,
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
  editHeroButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: BrandColors.gray800,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.gray700,
    gap: Spacing.xs,
  },
  actionIcon: {
    fontSize: Typography.fontSize['2xl'],
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
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
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
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
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
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
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
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  libraryIcon: {
    fontSize: Typography.fontSize['2xl'],
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
  libraryChevron: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily,
  },
  accountCard: {
    gap: Spacing.md,
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
});
