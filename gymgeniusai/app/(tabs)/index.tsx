import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { loadWorkoutPlansFromStorage } from '@/stores/workoutPlanStore';
import { useCommunityStore } from '@/stores/communityStore';
import { QuickActions } from '@/components/home/QuickActions';
import { EditProfileModal } from '@/components/home/modals/EditProfileModal';
import { ProfileMenuModal } from '@/components/home/modals/ProfileMenuModal';
import { FeatureLadderModal } from '@/components/home/modals/FeatureLadderModal';
import { LightningBoltProgress } from '@/components/home/LightningBoltProgress';
import { useFeatureHandling } from '@/hooks/useHome/useFeatureHandling';
import { eventBus } from '@/lib/eventBus';
import { workoutSharingService, SharedWorkout } from '@/services/workoutSharingService';
import { mealPlanSharingService, SharedMealPlan } from '@/services/mealPlanSharingService';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { WeightLogModal } from '@/components/workout/modals/WeightLogModal';
import { useWeightStore } from '@/stores/weightStore';
import { AIFeatureButton } from '@/components/ai/AIFeatureButton';
import { AIInfoModal } from '@/components/home/modals/AIInfoModal';

export default function HomeScreen() {
  const { totalPoints, addPoints, isFeatureUnlocked, restoreFromLocalStorage: restorePointsData, loadUserPointsFromFirebase, loadUserFeaturesFromFirebase, spendPoints, unlockFeature } = usePointsStore();
  const { profile, setProfile, clearProfile } = useUserStore();
  const { user, profile: authProfile, signOut } = useAuth();
  const { loadCommunityData } = useCommunityStore();
  const { workoutHistory, loadWorkoutsFromFirebase } = useWorkoutStore();
  const { getDailyNutrition, loadAllUserMealsFromFirebase } = useNutritionStore();
  const { loadWeightsFromFirebase } = useWeightStore();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showWeightLogModal, setShowWeightLogModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showFeatureLadder, setShowFeatureLadder] = useState(false);
  const [showAIInfoModal, setShowAIInfoModal] = useState(false);
  const [aiInfoModalTab, setAiInfoModalTab] = useState<'features' | 'plans'>('features');
  const [showMealPlanGenerator, setShowMealPlanGenerator] = useState(false);
  const [isInitialMealPlanGeneration, setIsInitialMealPlanGeneration] = useState(false);
  const [showWorkoutPlanGenerator, setShowWorkoutPlanGenerator] = useState(false);
  const [isInitialWorkoutPlanGeneration, setIsInitialWorkoutPlanGeneration] = useState(false);
  const [todaysWorkouts, setTodaysWorkouts] = useState<any[]>([]);
  const [todaysAssignedWorkouts, setTodaysAssignedWorkouts] = useState<SharedWorkout[]>([]);
  const [todaysMeals, setTodaysMeals] = useState<any>(null);
  const [todaysAssignedMealPlans, setTodaysAssignedMealPlans] = useState<SharedMealPlan[]>([]);

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
      
      // Load weights from Firebase
      loadWeightsFromFirebase(user.uid).catch((error) => {
        console.error('❌ Error loading weights:', error);
      });
      
      // Load workout plans from local storage
      loadWorkoutPlansFromStorage().catch((error) => {
        console.error('❌ Error loading workout plans from storage:', error);
      });
    } else {
      // For non-authenticated users, load from local storage
      console.log('📱 Loading points from local storage for non-authenticated user');
      restorePointsData();
      
      // Load workout plans from local storage
      loadWorkoutPlansFromStorage().catch((error) => {
        console.error('❌ Error loading workout plans from storage:', error);
      });
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

  // Check if user is a coach, trainer, or player
  const isTrainer = profile?.appUseType === 'gym_trainer' && profile?.institutionRole !== 'player';
  const isTrainerClient = profile?.appUseType === 'gym_trainer' && profile?.institutionRole === 'player';
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player' && !isTrainer;
  const isCoachOrTrainer = isCoach || isTrainer;
  const isCoachOrPlayer = profile?.userType === 'institution';

  // Helper function to get today's date key
  const getLocalDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load today's workouts and meals for personal users
  const loadTodaysWorkouts = React.useCallback(async () => {
    if (!user?.uid || isCoachOrPlayer || isTrainer) return;

    try {
      // Load workouts from Firebase first
      await loadWorkoutsFromFirebase(user.uid);
      
      // Load meals from Firebase
      await loadAllUserMealsFromFirebase(user.uid);
      
      // Get today's date key
      const today = new Date();
      const todayKey = getLocalDateKey(today);
      
      // Get current workout history from store
      const currentHistory = useWorkoutStore.getState().workoutHistory;
      
      // Filter workout history for today's completed workouts
      const todaysCompleted = currentHistory.filter(workout => {
        return workout.date === todayKey && workout.status === 'completed';
      });
      
      setTodaysWorkouts(todaysCompleted);
      
      // Get today's meals
      const todaysNutrition = getDailyNutrition(today);
      if (todaysNutrition && todaysNutrition.foods && todaysNutrition.foods.length > 0) {
        setTodaysMeals(todaysNutrition);
      } else {
        setTodaysMeals(null);
      }
    } catch (error) {
      console.error('❌ Error loading today\'s workouts:', error);
    }
  }, [user?.uid, isCoachOrPlayer, loadWorkoutsFromFirebase, loadAllUserMealsFromFirebase, getDailyNutrition]);

  useEffect(() => {
    loadTodaysWorkouts();
  }, [loadTodaysWorkouts]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTodaysWorkouts();
    }, [loadTodaysWorkouts])
  );

  // Load today's assigned workouts and meal plans for coaches and trainers
  const loadTodaysAssignedWorkouts = React.useCallback(async () => {
    if (!user?.uid || !isCoachOrTrainer || !profile?.teamId) return;

    try {
      // Get today's date
      const today = new Date();
      const todayKey = getLocalDateKey(today);
      
      // Get all coach workout assignments
      const assignments = await workoutSharingService.getCoachAssignments(user.uid, profile.teamId);
      
      // Filter for workouts assigned for today
      const todaysAssignments = assignments.filter(assignment => {
        if (assignment.assignedDate) {
          // assignedDate is stored as ISO string, convert to date key
          const assignedDateStr = assignment.assignedDate;
          // Handle both ISO string and date key formats
          let assignedDateKey: string;
          if (assignedDateStr.includes('T')) {
            // ISO string format
            assignedDateKey = assignedDateStr.split('T')[0];
          } else {
            // Already in date key format
            assignedDateKey = assignedDateStr;
          }
          return assignedDateKey === todayKey;
        }
        // If no assignedDate, check the workoutData date
        if (assignment.workoutData?.date) {
          return assignment.workoutData.date === todayKey;
        }
        return false;
      });
      
      setTodaysAssignedWorkouts(todaysAssignments);
      
      // Get all coach meal plan assignments
      const mealPlanAssignments = await mealPlanSharingService.getCoachMealPlanAssignments(user.uid, profile.teamId);
      
      // Filter for meal plans assigned for today
      const todaysMealPlans = mealPlanAssignments.filter(mealPlan => {
        if (mealPlan.date) {
          return mealPlan.date === todayKey;
        }
        return false;
      });
      
      setTodaysAssignedMealPlans(todaysMealPlans);
    } catch (error) {
      console.error('❌ Error loading today\'s assigned workouts:', error);
    }
  }, [user?.uid, isCoachOrTrainer, profile?.teamId]);

  useEffect(() => {
    loadTodaysAssignedWorkouts();
  }, [loadTodaysAssignedWorkouts]);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTodaysAssignedWorkouts();
    }, [loadTodaysAssignedWorkouts])
  );

  // Listen for weight log event
  useEffect(() => {
    const unsubscribe = eventBus.subscribe('openWeightLog', () => {
      setShowWeightLogModal(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Listen for weight logged event to refresh profile
  useEffect(() => {
    const unsubscribe = eventBus.subscribe('weightLogged', () => {
      // Refresh user document to get updated weight
      if (user?.uid) {
        const { fetchUserDoc } = useUserStore.getState();
        fetchUserDoc(user.uid).catch((error) => {
          console.error('❌ Error refreshing profile after weight log:', error);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);
  
  // Listen for openAIPlans event to open AI Info Modal with Plans tab
  useEffect(() => {
    const unsubscribe = eventBus.subscribe('openAIPlans', () => {
      setAiInfoModalTab('plans');
      setShowAIInfoModal(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);
  
  // Quick actions configuration - different for coaches, trainers, and players
  const quickActions = isTrainer ? [
    {
      title: 'Client Overview',
      subtitle: 'View Client Stats',
      icon: '👥',
      onPress: () => {
        router.push('/(tabs)/community');
      },
    },
    {
      title: 'Assign Workout',
      subtitle: 'Send to Clients',
      icon: '💪',
      onPress: () => {
        router.push('/(tabs)/workout');
      },
    },
    {
      title: 'Assign Meal Plan',
      subtitle: 'Send to Clients',
      icon: '🍎',
      onPress: () => {
        router.push('/(tabs)/nutrition');
      },
    },
  ] : isCoach ? [
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
      subtitle: '+100 V',
      icon: '💪',
      onPress: () => {
        router.push('/(tabs)/workout');
      },
    },
    {
      title: 'Log Meal',
      subtitle: '+30 V',
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
          <View style={styles.logoContainer}>
            <Logo size="large" showText={false} useImage={true} />
          </View>
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeText}>
                Welcome back{(profile?.firstName || authProfile?.displayName || user?.displayName) ? `, ${profile?.firstName || authProfile?.displayName || user?.displayName}` : ''}!
              </Text>
            </View>
            {(isTrainer || isCoach) && (
              <View style={styles.badgeContainer}>
                {isTrainer && (
                  <View style={styles.coachBadge}>
                    <IconSymbol name="figure.strengthtraining.traditional" size={14} color={BrandColors.accent} />
                    <Text style={styles.coachBadgeText}>Trainer</Text>
                  </View>
                )}
                {isCoach && (
                  <View style={styles.coachBadge}>
                    <IconSymbol name="person.badge.shield.checkmark.fill" size={14} color={BrandColors.accent} />
                    <Text style={styles.coachBadgeText}>Coach</Text>
                  </View>
                )}
              </View>
            )}
            <Text style={styles.userInfo}>
              {isTrainer ? (
                profile?.institutionName || 'Personal Trainer'
              ) : isCoach ? (
                profile?.institutionName || 'Team Coach'
              ) : (
                (() => {
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
                })()
              )}
            </Text>
            {!isCoach && profile?.height && profile?.weight && (
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

      {/* Lightning Bolt Progress Card / Team Stats Card / Client Stats Card and Quick Actions */}
      <View style={styles.topActionsRow}>
        {isTrainer ? (
          <View style={styles.teamStatsCardContainer}>
            <TouchableOpacity
              style={[ComponentStyles.card, styles.teamStatsCard, { borderColor: BrandColors.accent }]}
              onPress={() => router.push('/(tabs)/community')}
              activeOpacity={0.8}
            >
              <View style={styles.teamStatsHeader}>
                <IconSymbol name="figure.strengthtraining.traditional" size={24} color={BrandColors.accent} />
                <Text style={styles.teamStatsTitle}>Client Stats</Text>
              </View>
              <View style={styles.teamStatsContent}>
                <View style={styles.teamStatItem}>
                  <Text style={styles.teamStatNumber}>
                    {(() => {
                      // Calculate total assigned clients across all assignments
                      const allClients = new Set<string>();
                      todaysAssignedWorkouts.forEach(w => {
                        w.assignedPlayers?.forEach(p => allClients.add(p));
                      });
                      todaysAssignedMealPlans.forEach(m => {
                        m.assignedPlayers?.forEach(p => allClients.add(p));
                      });
                      return allClients.size || 0;
                    })()}
                  </Text>
                  <Text style={styles.teamStatLabel}>Active Clients</Text>
                </View>
                <View style={styles.teamStatDivider} />
                <View style={styles.teamStatItem}>
                  <Text style={styles.teamStatNumber}>
                    {todaysAssignedWorkouts.length + todaysAssignedMealPlans.length}
                  </Text>
                  <Text style={styles.teamStatLabel}>Today's Assignments</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : isCoach ? (
          <View style={styles.teamStatsCardContainer}>
            <TouchableOpacity
              style={[ComponentStyles.card, styles.teamStatsCard, { borderColor: BrandColors.accent }]}
              onPress={() => router.push('/(tabs)/community')}
              activeOpacity={0.8}
            >
              <View style={styles.teamStatsHeader}>
                <IconSymbol name="sportscourt.fill" size={24} color={BrandColors.accent} />
                <Text style={styles.teamStatsTitle}>Team Stats</Text>
              </View>
              <View style={styles.teamStatsContent}>
                <View style={styles.teamStatItem}>
                  <Text style={styles.teamStatNumber}>
                    {(() => {
                      // Calculate total assigned players across all assignments
                      const allPlayers = new Set<string>();
                      todaysAssignedWorkouts.forEach(w => {
                        w.assignedPlayers?.forEach(p => allPlayers.add(p));
                      });
                      todaysAssignedMealPlans.forEach(m => {
                        m.assignedPlayers?.forEach(p => allPlayers.add(p));
                      });
                      return allPlayers.size || 0;
                    })()}
                  </Text>
                  <Text style={styles.teamStatLabel}>Active Players</Text>
                </View>
                <View style={styles.teamStatDivider} />
                <View style={styles.teamStatItem}>
                  <Text style={styles.teamStatNumber}>
                    {todaysAssignedWorkouts.length + todaysAssignedMealPlans.length}
                  </Text>
                  <Text style={styles.teamStatLabel}>Today's Assignments</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ) : !isCoachOrPlayer ? (
          <View style={styles.voltsCardContainer}>
            {/* HIDDEN for v1.0 App Store submission - Volts card is non-clickable */}
            <View
              style={[ComponentStyles.card, styles.voltsCard, { borderColor: BrandColors.accent }]}
              // onPress={() => setShowFeatureLadder(true)} // Disabled for v1.0 submission
              // activeOpacity={0.8} // Disabled for v1.0 submission
              // accessible={true} // Disabled for v1.0 submission
              // accessibilityLabel="Open Feature Ladder" // Disabled for v1.0 submission
              // accessibilityHint="Tap to view available features and unlock progress" // Disabled for v1.0 submission
            >
              <Text style={styles.voltsCardTitle}>KINETIC FLOW Volts</Text>
              <View style={styles.voltsCardContent}>
                <LightningBoltProgress progress={nextUnlock ? progressPercentage : 100} size={60} />
                <Text style={styles.voltsAmount}>{totalPoints.toLocaleString()} V</Text>
              </View>
            </View>
            {/* Original TouchableOpacity code preserved above - uncomment to re-enable */}
            {/* <TouchableOpacity
              style={[ComponentStyles.card, styles.voltsCard, { borderColor: BrandColors.accent }]}
              onPress={() => setShowFeatureLadder(true)}
              activeOpacity={0.8}
              accessible={true}
              accessibilityLabel="Open Feature Ladder"
              accessibilityHint="Tap to view available features and unlock progress"
            >
              <Text style={styles.voltsCardTitle}>KINETIC FLOW Volts</Text>
              <View style={styles.voltsCardContent}>
                <LightningBoltProgress progress={nextUnlock ? progressPercentage : 100} size={60} />
                <Text style={styles.voltsAmount}>{totalPoints.toLocaleString()} V</Text>
              </View>
            </TouchableOpacity> */}
          </View>
        ) : null}
        <View style={styles.quickActionsContainer}>
          <QuickActions 
            actions={quickActions} 
            containerStyle={styles.quickActionsOverride}
          />
        </View>
      </View>

      {/* AI Features Section - HIDDEN for v1.0 to avoid "Coming Soon" in screenshots */}
      {false && (!isCoachOrTrainer || isTrainer) && (
        <View style={styles.aiFeaturesSection}>
          <Text style={styles.sectionTitle}>✨ AI Features</Text>
          <AIFeatureButton
            feature="mealPlan"
            title="AI Meal Plans"
            description={isTrainer ? "Generate meal plans for your clients with AI" : "Generate personalized meal plans with AI"}
            icon="fork.knife"
            onPress={() => {
              setShowMealPlanGenerator(true);
              setIsInitialMealPlanGeneration(false);
            }}
            size="medium"
          />
          <AIFeatureButton
            feature="workoutPlan"
            title="AI Workout Plans"
            description={isTrainer ? "Create custom workout plans for your clients with AI" : "Get custom workout plans generated by AI"}
            icon="dumbbell.fill"
            onPress={() => {
              setShowWorkoutPlanGenerator(true);
              setIsInitialWorkoutPlanGeneration(false);
            }}
            size="medium"
          />
        </View>
      )}

      {/* Community Button - HIDDEN for v1.0 to avoid "Coming Soon" in screenshots */}
      {false && (
      <View style={styles.communitySection}>
        <TouchableOpacity
          style={[ComponentStyles.card, styles.communityButton, { borderColor: BrandColors.accent }]}
          onPress={() => router.push('/(tabs)/community')}
          activeOpacity={0.8}
        >
          <Text style={styles.communityIcon}>👥</Text>
          <View style={styles.communityContent}>
            <Text style={styles.communityTitle}>Community</Text>
            <Text style={styles.communitySubtitle}>
              {isTrainer ? 'Manage your clients' : isCoach ? 'Manage your team' : 'Connect with others'}
            </Text>
          </View>
          <Text style={styles.communityArrow}>→</Text>
        </TouchableOpacity>
      </View>
      )}

      {/* Today's Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        {isTrainer ? (
          // Trainer view: Show assigned workouts and meal plans for clients
          <View style={[ComponentStyles.card, styles.progressCard, styles.coachProgressCard]}>
            {(todaysAssignedWorkouts.length > 0 || todaysAssignedMealPlans.length > 0) ? (
              <View>
                {todaysAssignedWorkouts.length > 0 && (
                  <View style={styles.progressCategory}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryIconContainer}>
                        <IconSymbol name="dumbbell.fill" size={20} color={BrandColors.accent} />
                      </View>
                      <Text style={styles.categoryTitle}>Workouts Assigned</Text>
                    </View>
                    {todaysAssignedWorkouts.map((assignment, index) => (
                      <TouchableOpacity
                        key={assignment.id || index}
                        style={[styles.progressItem, styles.coachProgressItem]}
                        onPress={() => router.push('/(tabs)/workout')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.progressItemContent}>
                          <Text style={styles.progressItemTitle} numberOfLines={1}>
                            {assignment.workoutName || 'Assigned Workout'}
                          </Text>
                          <View style={styles.progressItemMeta}>
                            <View style={styles.playerCountBadge}>
                              <IconSymbol name="person.2.fill" size={12} color={BrandColors.accent} />
                              <Text style={styles.playerCountText}>
                                {assignment.assignedPlayers?.length || 0} client{(assignment.assignedPlayers?.length || 0) !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <IconSymbol name="chevron.right" size={18} color={BrandColors.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {todaysAssignedMealPlans.length > 0 && (
                  <View style={styles.progressCategory}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryIconContainer}>
                        <IconSymbol name="fork.knife" size={20} color={BrandColors.accent} />
                      </View>
                      <Text style={styles.categoryTitle}>Meal Plans Assigned</Text>
                    </View>
                    {todaysAssignedMealPlans.map((mealPlan, index) => (
                      <TouchableOpacity
                        key={mealPlan.id || index}
                        style={[styles.progressItem, styles.coachProgressItem]}
                        onPress={() => router.push('/(tabs)/nutrition')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.progressItemContent}>
                          <Text style={styles.progressItemTitle} numberOfLines={1}>
                            {mealPlan.mealPlanName || 'Meal Plan'}
                          </Text>
                          <View style={styles.progressItemMeta}>
                            <View style={styles.playerCountBadge}>
                              <IconSymbol name="person.2.fill" size={12} color={BrandColors.accent} />
                              <Text style={styles.playerCountText}>
                                {mealPlan.assignedPlayers?.length || 0} client{(mealPlan.assignedPlayers?.length || 0) !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <IconSymbol name="chevron.right" size={18} color={BrandColors.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyCoachState}>
                <IconSymbol name="tray" size={48} color={BrandColors.textSecondary} />
                <Text style={styles.emptyCoachTitle}>No Assignments Today</Text>
                <Text style={styles.emptyCoachText}>
                  Assign workouts or meal plans to your clients to track their progress.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCoachButton}
                  onPress={() => router.push('/(tabs)/workout')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyCoachButtonText}>Assign Workout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : isCoach ? (
          // Coach view: Show assigned workouts and meal plans
          <View style={[ComponentStyles.card, styles.progressCard, styles.coachProgressCard]}>
            {(todaysAssignedWorkouts.length > 0 || todaysAssignedMealPlans.length > 0) ? (
              <View>
                {todaysAssignedWorkouts.length > 0 && (
                  <View style={styles.progressCategory}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryIconContainer}>
                        <IconSymbol name="dumbbell.fill" size={20} color={BrandColors.accent} />
                      </View>
                      <Text style={styles.categoryTitle}>Workouts Assigned</Text>
                    </View>
                    {todaysAssignedWorkouts.map((assignment, index) => (
                      <TouchableOpacity
                        key={assignment.id || index}
                        style={[styles.progressItem, styles.coachProgressItem]}
                        onPress={() => router.push('/(tabs)/workout')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.progressItemContent}>
                          <Text style={styles.progressItemTitle} numberOfLines={1}>
                            {assignment.workoutName || 'Assigned Workout'}
                          </Text>
                          <View style={styles.progressItemMeta}>
                            <View style={styles.playerCountBadge}>
                              <IconSymbol name="person.2.fill" size={12} color={BrandColors.accent} />
                              <Text style={styles.playerCountText}>
                                {assignment.assignedPlayers?.length || 0} player{(assignment.assignedPlayers?.length || 0) !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <IconSymbol name="chevron.right" size={18} color={BrandColors.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {todaysAssignedMealPlans.length > 0 && (
                  <View style={styles.progressCategory}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryIconContainer}>
                        <IconSymbol name="fork.knife" size={20} color={BrandColors.accent} />
                      </View>
                      <Text style={styles.categoryTitle}>Meal Plans Assigned</Text>
                    </View>
                    {todaysAssignedMealPlans.map((mealPlan, index) => (
                      <TouchableOpacity
                        key={mealPlan.id || index}
                        style={[styles.progressItem, styles.coachProgressItem]}
                        onPress={() => router.push('/(tabs)/nutrition')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.progressItemContent}>
                          <Text style={styles.progressItemTitle} numberOfLines={1}>
                            {mealPlan.mealPlanName || 'Meal Plan'}
                          </Text>
                          <View style={styles.progressItemMeta}>
                            <View style={styles.playerCountBadge}>
                              <IconSymbol name="person.2.fill" size={12} color={BrandColors.accent} />
                              <Text style={styles.playerCountText}>
                                {mealPlan.assignedPlayers?.length || 0} player{(mealPlan.assignedPlayers?.length || 0) !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <IconSymbol name="chevron.right" size={18} color={BrandColors.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyCoachState}>
                <IconSymbol name="tray" size={48} color={BrandColors.textSecondary} />
                <Text style={styles.emptyCoachTitle}>No Assignments Today</Text>
                <Text style={styles.emptyCoachText}>
                  Assign workouts or meal plans to your players to track their progress.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCoachButton}
                  onPress={() => router.push('/(tabs)/workout')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyCoachButtonText}>Assign Workout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // Personal user view: Show completed workouts and meals
          <View style={[ComponentStyles.card, styles.progressCard]}>
            {(todaysWorkouts.length > 0 || todaysMeals) ? (
              <View>
                {todaysWorkouts.length > 0 && (
                  <View style={styles.progressCategory}>
                    <View style={styles.categoryHeader}>
                      <IconSymbol name="dumbbell.fill" size={20} color={BrandColors.accent} />
                      <Text style={styles.categoryTitle}>Workouts</Text>
                    </View>
                    {todaysWorkouts.map((workout, index) => (
                      <TouchableOpacity
                        key={`workout-${workout.id || 'workout-' + index}-idx-${index}-date-${workout.date || 'no-date'}`}
                        style={styles.progressItem}
                        onPress={() => router.push('/(tabs)/workout')}
                        activeOpacity={0.7}
                      >
                        <View style={styles.progressItemContent}>
                          <Text style={styles.progressItemTitle} numberOfLines={1}>
                            {workout.title || 'Workout'}
                          </Text>
                          <Text style={styles.progressItemSubtitle}>
                            {workout.exercises?.length || 0} exercise{(workout.exercises?.length || 0) !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Text style={styles.progressArrow}>→</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {todaysMeals && todaysMeals.foods && todaysMeals.foods.length > 0 && (
                  <View style={styles.progressCategory}>
                    <View style={styles.categoryHeader}>
                      <IconSymbol name="fork.knife" size={20} color={BrandColors.accent} />
                      <Text style={styles.categoryTitle}>Meals</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.progressItem}
                      onPress={() => router.push('/(tabs)/nutrition')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.progressItemContent}>
                        <Text style={styles.progressItemTitle}>
                          {todaysMeals.foods.length} food item{todaysMeals.foods.length !== 1 ? 's' : ''} logged
                        </Text>
                        <Text style={styles.progressItemSubtitle}>
                          {Math.round(todaysMeals.totalMacros?.calories || 0)} cal • {Math.round(todaysMeals.totalMacros?.protein || 0)}g protein
                        </Text>
                      </View>
                      <Text style={styles.progressArrow}>→</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.progressText}>
                Keep logging workouts and meals to earn more V and unlock advanced features!
              </Text>
            )}
          </View>
        )}
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

      {/* AI Features Showcase Modal */}
      <FeatureLadderModal
        visible={showFeatureLadder}
        onClose={() => setShowFeatureLadder(false)}
        onViewPlans={() => {
          setShowFeatureLadder(false);
          setAiInfoModalTab('plans');
          setShowAIInfoModal(true);
        }}
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

      {/* Weight Log Modal */}
      <WeightLogModal
        visible={showWeightLogModal}
        onClose={() => setShowWeightLogModal(false)}
        onWeightLogged={() => {
          // Reload weights after logging
          if (user?.uid) {
            loadWeightsFromFirebase(user.uid).catch((error) => {
              console.error('❌ Error reloading weights:', error);
            });
          }
        }}
      />

      {/* AI Info Modal */}
      <AIInfoModal
        visible={showAIInfoModal}
        onClose={() => {
          setShowAIInfoModal(false);
          setAiInfoModalTab('features'); // Reset to features tab when closing
        }}
        initialTab={aiInfoModalTab}
      />

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
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  topActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'stretch',
  },
  voltsCardContainer: {
    alignItems: 'flex-start',
    flex: 0,
  },
  teamStatsCardContainer: {
    alignItems: 'flex-start',
    flex: 0,
  },
  teamStatsCard: {
    padding: Spacing.md,
    borderWidth: 2,
    alignItems: 'flex-start',
    minWidth: 180,
    justifyContent: 'center',
    minHeight: 110,
    backgroundColor: BrandColors.gray800,
  },
  teamStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  teamStatsTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  teamStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
  },
  teamStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  teamStatNumber: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: 2,
  },
  teamStatLabel: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },
  teamStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: BrandColors.textSecondary + '30',
  },
  quickActionsContainer: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  quickActionsOverride: {
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  voltsCard: {
    padding: Spacing.sm,
    borderWidth: 2,
    alignItems: 'flex-start',
    minWidth: 180,
    justifyContent: 'center',
    minHeight: 110,
  },
  voltsCardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    color: BrandColors.text,
    marginBottom: Spacing.sm,
  },
  voltsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  voltsAmount: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    color: BrandColors.accent,
  },
  welcomeSection: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  welcomeHeader: {
    marginBottom: Spacing.xs,
  },
  badgeContainer: {
    marginBottom: Spacing.xs,
    alignSelf: 'flex-start',
  },
  coachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.accent + '40',
  },
  coachBadgeText: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
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
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  lightningBoltContainer: {
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressLabel: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
    textAlign: 'center',
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
    padding: Spacing.lg,
  },
  coachProgressCard: {
    backgroundColor: BrandColors.gray800,
    borderWidth: 1,
    borderColor: BrandColors.accent + '20',
    shadowColor: BrandColors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  coachProgressItem: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.accent + '20',
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.accent + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  playerCountText: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  emptyCoachState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyCoachTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  emptyCoachText: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  emptyCoachButton: {
    backgroundColor: BrandColors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  emptyCoachButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  communitySection: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  communityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 2,
  },
  communityIcon: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  communityContent: {
    flex: 1,
  },
  communityTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  communitySubtitle: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  communityArrow: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily,
    marginLeft: Spacing.sm,
  },
  aiFeaturesSection: {
    marginBottom: Spacing.xl,
    paddingHorizontal: 20,
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
  progressCategory: {
    marginBottom: Spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  categoryTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: BrandColors.gray800,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: BrandColors.gray700,
  },
  progressItemContent: {
    flex: 1,
  },
  progressItemTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs / 2,
  },
  progressItemSubtitle: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  progressArrow: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily,
    marginLeft: Spacing.sm,
  },
});