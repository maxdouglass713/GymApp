import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius, ComponentStyles } from '@/constants/theme';
import { usePointsStore, FEATURE_CATALOG } from '@/stores/pointsStore';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/components/AuthProvider';
import { router } from 'expo-router';
import { Logo } from '@/components/Logo';
import OnboardingStep from '@/components/OnboardingStep';
import { useWorkoutStore } from '@/stores/workoutStore';
import { MealPlanGenerator } from '@/components/MealPlanGenerator';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { WorkoutPlanGenerator } from '@/components/WorkoutPlanGenerator';
import { useWorkoutPlanStore } from '@/stores/workoutPlanStore';
import { useCommunityStore } from '@/stores/communityStore';
import { QuickActions } from '@/components/home/QuickActions';
import { EditProfileModal } from '@/components/home/modals/EditProfileModal';
import { ProfileMenuModal } from '@/components/home/modals/ProfileMenuModal';
import { FeatureLadderModal } from '@/components/home/modals/FeatureLadderModal';
import { useFeatureHandling } from '@/hooks/useHome/useFeatureHandling';
import { eventBus } from '@/lib/eventBus';

export default function HomeScreen() {
  const { totalPoints, addPoints, isFeatureUnlocked, restoreFromLocalStorage: restorePointsData, loadUserPointsFromFirebase, loadUserFeaturesFromFirebase, spendPoints, unlockFeature } = usePointsStore();
  const { profile, setProfile, clearProfile } = useUserStore();
  const { user, profile: authProfile, signOut } = useAuth();
  const { loadCommunityData } = useCommunityStore();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showFeatureLadder, setShowFeatureLadder] = useState(false);
  const [showMealPlanGenerator, setShowMealPlanGenerator] = useState(false);
  const [isInitialMealPlanGeneration, setIsInitialMealPlanGeneration] = useState(false);
  const [showWorkoutPlanGenerator, setShowWorkoutPlanGenerator] = useState(false);
  const [isInitialWorkoutPlanGeneration, setIsInitialWorkoutPlanGeneration] = useState(false);

  // Load user profile and data when component mounts
  useEffect(() => {
    console.log('🏠 HomeScreen: Component mounted');
    console.log('👤 User:', user?.uid);
    console.log('📋 Profile:', profile);
    console.log('💰 Total Points:', totalPoints);
    
    // Load points and features from Firebase for authenticated users
    if (user?.uid) {
      console.log('🎯 Loading points and features from Firebase for authenticated user');
      
      // Load points first
      loadUserPointsFromFirebase(user.uid).then(() => {
        console.log('✅ Points loaded from Firebase');
      }).catch((error) => {
        console.error('❌ Failed to load points from Firebase, falling back to local storage:', error);
        restorePointsData(); // Fallback to local storage if Firebase fails
      });
      
        // Load feature unlocks
        loadUserFeaturesFromFirebase(user.uid).then(() => {
          console.log('✅ Features loaded from Firebase');
        }).catch((error) => {
          console.error('❌ Failed to load features from Firebase, falling back to local storage:', error);
          // Features will be loaded from local storage via restorePointsData
        });
        
        // Load community data only for personal users
        if (profile?.userType !== 'institution') {
          loadCommunityData().then(() => {
            console.log('✅ Community data loaded');
          }).catch((error) => {
            console.error('❌ Failed to load community data:', error);
          });
        } else {
          console.log('🏫 Institutional user - skipping community data load');
        }

      // Load nutrition data first, then check macro challenges
      console.log('🍎 Loading nutrition data and checking macro challenges...');
      const { loadAllUserMealsFromFirebase, checkAllPendingMacroChallenges } = useNutritionStore.getState();
      
      // First load all meals from Firebase
      loadAllUserMealsFromFirebase(user.uid).then(() => {
        console.log('✅ Nutrition data loaded');
        
        // Then check macro challenges after meals are loaded
        if (checkAllPendingMacroChallenges && typeof checkAllPendingMacroChallenges === 'function') {
          return checkAllPendingMacroChallenges(user.uid);
        } else {
          console.warn('⚠️ checkAllPendingMacroChallenges is not available');
        }
      }).then(() => {
        console.log('✅ Macro challenges checked');
      }).catch((error) => {
        console.error('❌ Failed to load nutrition or check macro challenges:', error);
      });
    } else {
      // For non-authenticated users, load from local storage
      console.log('📱 Loading points from local storage for non-authenticated user');
      restorePointsData();
    }
    
    // Load user profile from Firestore if user is authenticated
    if (user?.uid && !profile) {
      console.log('🔄 Loading user profile from Firestore...');
      const { fetchUserDoc } = useUserStore.getState();
      fetchUserDoc(user.uid).then(() => {
        console.log('✅ User profile loaded from Firestore');
      }).catch((error) => {
        console.error('❌ Failed to load user profile:', error);
      });
    }
  }, [user, profile, authProfile, totalPoints, restorePointsData, loadUserPointsFromFirebase]);

  // Check if user is a coach or player
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
  const isCoachOrPlayer = profile?.userType === 'institution';
  
  // Quick actions configuration - different for coaches vs players
  const quickActions = isCoach ? [
    {
      title: 'Team Overview',
      subtitle: 'View Player Stats',
      icon: '👥',
      onPress: () => {
        router.push('/(tabs)/community');
      },
    },
    {
      title: 'Assign Workout',
      subtitle: 'Send to Players',
      icon: '💪',
      onPress: () => {
        router.push('/(tabs)/workout');
      },
    },
    {
      title: 'Assign Meal Plan',
      subtitle: 'Send to Players',
      icon: '🍎',
      onPress: () => {
        router.push('/(tabs)/nutrition');
      },
    },
  ] : [
    {
      title: 'Log Workout',
      subtitle: '+100 V (Strength)',
      icon: '💪',
      onPress: () => {
        router.push('/(tabs)/workout');
      },
    },
    {
      title: 'Log Meal',
      subtitle: '+30 V (Complete Meal)',
      icon: '🍎',
      onPress: () => {
        router.push('/(tabs)/nutrition');
      },
    },
    {
      title: 'Log Cardio',
      subtitle: '+50 V',
      icon: '🏃',
      onPress: () => {
        handleLogCardio();
      },
    },
  ];

  // Find next unlockable feature
  const nextUnlock = Object.entries(FEATURE_CATALOG)
    .filter(([key]) => !isFeatureUnlocked(key))
    .sort(([, a], [, b]) => a - b)[0];

  const pointsToNext = nextUnlock ? nextUnlock[1] - totalPoints : 0;
  const progressPercentage = nextUnlock ? (totalPoints / nextUnlock[1]) * 100 : 100;

  // Use feature handling hook
  const { handleFeatureClick } = useFeatureHandling({
    totalPoints,
    user,
    isFeatureUnlocked,
    spendPoints: spendPoints as any,
    unlockFeature: unlockFeature as any,
    setShowFeatureLadder,
    setIsInitialMealPlanGeneration,
    setShowMealPlanGenerator,
    setIsInitialWorkoutPlanGeneration,
    setShowWorkoutPlanGenerator,
  });

  const handleLogCardio = React.useCallback(() => {
    if (!user?.uid) {
      Alert.alert('Log Cardio', 'Please log in to track your cardio sessions.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    useWorkoutStore.setState((state) => ({
      ...state,
      selectedDate: today,
    }));

    eventBus.emit('workout:openCardioBuilder');
    router.push('/(tabs)/workout');
  }, [user?.uid]);


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
              router.replace('/auth/signin');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Sync status hidden on home screen */}
      <ScrollView style={ComponentStyles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Logo size="large" showText={false} useImage={true} />
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              Welcome back{(profile?.firstName || authProfile?.displayName || user?.displayName) ? `, ${profile?.firstName || authProfile?.displayName || user?.displayName}` : ''}!
            </Text>
            <Text style={styles.userInfo}>
              {(() => {
                const experience = profile?.exerciseExperience
                  ? profile.exerciseExperience.charAt(0).toUpperCase() +
                    profile.exerciseExperience.slice(1)
                  : null;
                const goals = profile?.goals && profile.goals.length > 0
                  ? profile.goals
                      .map((goal: string) =>
                        goal.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                      )
                  : profile?.primaryGoal
                    ? [
                        profile.primaryGoal
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase()),
                      ]
                    : [];

                if (experience && goals.length > 0) {
                  return `${experience} • ${goals[0]}`;
                }

                if (experience) {
                  return experience;
                }

                if (goals.length > 0) {
                  return goals[0];
                }

                return 'Ready to start your fitness journey';
              })()}
            </Text>
            {profile?.height && profile?.weight && (
              <Text style={styles.userStats}>
                {profile.height.value} {profile.height.unit} • {profile.weight.value} {profile.weight.unit}
                {profile?.birthday && ` • ${Math.floor((new Date().getTime() - new Date(profile.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`}
              </Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.profileIcon}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.profileIconText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Points Progress */}
      <TouchableOpacity 
        style={[ComponentStyles.card, styles.pointsCard, { borderColor: BrandColors.accent }]}
        onPress={() => setShowFeatureLadder(true)}
        activeOpacity={0.8}
        accessible={true}
        accessibilityLabel="Open Feature Ladder"
        accessibilityHint="Tap to view available features and unlock progress"
      >
        <View style={styles.pointsHeader}>
          <Text style={styles.pointsTitle}>KINETIC FLOW Volts</Text>
          <Text style={styles.pointsAmount}>{totalPoints.toLocaleString()} V</Text>
        </View>
        
        {/* Hide next unlock section for coaches and players */}
        {nextUnlock && !isCoachOrPlayer && (
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>
              Next Unlock: {nextUnlock[0].replace('_', ' ').toUpperCase()}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: BrandColors.accent,
                    width: `${Math.min(progressPercentage, 100)}%`
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {pointsToNext > 0 ? `${pointsToNext.toLocaleString()} V to go` : 'Unlocked!'}
            </Text>
          </View>
        )}
        <Text style={styles.tapHint}>Tap to view feature ladder →</Text>
      </TouchableOpacity>


      {/* Quick Actions */}
      <QuickActions actions={quickActions} />

      {/* Today's Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <View style={[ComponentStyles.card, styles.progressCard]}>
          <Text style={styles.progressText}>
            Keep logging workouts and meals to earn more V and unlock advanced features!
          </Text>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />

      {/* Profile Menu Modal */}
      <ProfileMenuModal
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        onEditProfile={() => setShowEditProfile(true)}
        onSignOut={handleSignOut}
      />

      {/* Feature Ladder Modal */}
      <FeatureLadderModal
        visible={showFeatureLadder}
        totalPoints={totalPoints}
        isFeatureUnlocked={isFeatureUnlocked}
        nextUnlock={nextUnlock}
        onClose={() => setShowFeatureLadder(false)}
        onFeatureClick={handleFeatureClick}
        isCoach={isCoach}
      />

      {/* Meal Plan Generator Modal */}
      <Modal
        visible={showMealPlanGenerator}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <MealPlanGenerator 
          isInitialGeneration={isInitialMealPlanGeneration}
          onClose={() => {
            setShowMealPlanGenerator(false);
            setIsInitialMealPlanGeneration(false);
          }}
        />
      </Modal>

      {/* Workout Plan Generator Modal */}
      <Modal
        visible={showWorkoutPlanGenerator}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <WorkoutPlanGenerator 
          isInitialGeneration={isInitialWorkoutPlanGeneration}
          onClose={() => {
            setShowWorkoutPlanGenerator(false);
            setIsInitialWorkoutPlanGeneration(false);
          }}
        />
      </Modal>

    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  welcomeSection: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  profileIconText: {
    fontSize: 20,
  },
  welcomeText: {
    color: BrandColors.text,
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  userInfo: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
  },
  userStats: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.xs,
  },
  pointsCard: {
    marginBottom: Spacing.xl,
    borderWidth: 2,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pointsTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  pointsAmount: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressLabel: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    backgroundColor: BrandColors.gray800,
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  progressText: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
  },
  progressCard: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.md,
  },
  tapHint: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
});