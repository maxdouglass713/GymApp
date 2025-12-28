import React, { useState, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { BrandColors, ComponentStyles, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { useWorkoutStore } from '@/stores/workoutStore';
import { usePointsStore } from '@/stores/pointsStore';
import { useProgressStore } from '@/stores/progressStore';
import { useVideoStore } from '@/stores/videoStore';
import { useAuth } from '@/components/AuthProvider';
import { useUserStore } from '@/stores/userStore';
import { useWeightStore } from '@/stores/weightStore';
import { eventBus } from '@/lib/eventBus';
import { AIProgressInsights } from '@/components/progress/AIProgressInsights';
import { AIGoalRecalibration } from '@/components/progress/AIGoalRecalibration';
import { usePlayerStats } from '@/hooks/useCommunity/usePlayerStats';
import { OverviewTab } from '@/components/community/tabs/OverviewTab';
import { router } from 'expo-router';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { generateProgressInsightsByRole } from '@/services/aiProgressService';
import { isFeatureEnabled, checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

const TAB_OPTIONS = [
  { key: 'history', label: 'History' },
  { key: 'weight', label: 'Weight' },
  { key: 'trends', label: 'Trends' },
];

const TREND_PERIODS = [
  { key: '4W', label: '4W' },
  { key: '12W', label: '12W' },
  { key: '52W', label: '52W' },
];

const TAB_GUIDES: Record<'history' | 'weight' | 'trends', {
  title: string;
  summary: string;
  bullets: string[];
}> = {
  history: {
    title: 'History Overview',
    summary: 'Your recent sessions snapshot. Use it to spot when quality slipped or when you crushed a workout.',
    bullets: [
      'Swipe right on any session to edit sets or jot down what felt off.',
      'Look for gaps between training days; keeping rest intentional builds better sets.',
      'Tap into a session to analyze individual sets and add notes for next time.'
    ],
  },
  weight: {
    title: 'Weight Tracking',
    summary: 'Track your daily weight to monitor progress towards your fitness goals.',
    bullets: [
      'Log your weight every morning for the most accurate tracking.',
      'Monitor your progress towards your weight goal (lose fat or build muscle).',
      'Consistent daily logging helps identify trends and adjust your plan accordingly.'
    ],
  },
  trends: {
    title: 'Trends Breakdown',
    summary: 'Shows where you\'re gaining or slipping so you can dial in quality each week.',
    bullets: [
      'Trend alerts signal meaningful changes—celebrate the green arrows and address the red.',
      'Compare latest vs previous workouts to confirm your ramp-up is manageable.',
      'Use the exercise timeline to plan which movement needs focus on technique or intent.'
    ],
  },
};

export default function ProgressScreen() {
  const { user } = useAuth();
  const { profile } = useUserStore();
  const { workoutHistory } = useWorkoutStore();
  const { dailyWeights, loadWeightsFromFirebase } = useWeightStore();
  const [weightRefreshKey, setWeightRefreshKey] = useState(0);
  const { totalPoints, isFeatureUnlocked, spendPoints, unlockFeature } = usePointsStore();
  const { addVideoAttachment, generateMockAnalysis } = useVideoStore();
  const { tier } = useSubscriptionStore();
  const {
    selectedTab,
    selectedMonth,
    selectedTrendPeriod,
    setSelectedTab,
    setSelectedMonth,
    setSelectedTrendPeriod,
    calculateTrendData,
    calculateInsightsData,
    getStreakData,
    getMuscleGroups,
    calculatePersonalRecords,
  } = useProgressStore();
  
  // Detect trainer vs coach
  const isTrainer = profile?.appUseType === 'gym_trainer' && profile?.institutionRole !== 'player';
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player' && !isTrainer;
  const isCoachOrTrainer = isCoach || isTrainer;
  
  // Load player stats for coaches/trainers
  const { playerStats, loadingOverview } = usePlayerStats(profile?.teamId, 'overview');
  
  // Use appropriate terminology
  const memberLabel = isTrainer ? 'Clients' : 'Players';
  const memberLabelSingular = isTrainer ? 'Client' : 'Player';
  
  const personalRecords = calculatePersonalRecords(workoutHistory);

  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [selectedSet, setSelectedSet] = useState<any>(null);
  const [editableWorkout, setEditableWorkout] = useState<any>(null);
  const [selectedExerciseTrend, setSelectedExerciseTrend] = useState<string | null>(null);
  const [guideTab, setGuideTab] = useState<'history' | 'weight' | 'trends' | null>(null);
  const [showRoleBasedInsights, setShowRoleBasedInsights] = useState(false);
  const [roleBasedInsights, setRoleBasedInsights] = useState<string | null>(null);
  const [isGeneratingRoleInsights, setIsGeneratingRoleInsights] = useState(false);
  const [showExerciseProgressionModal, setShowExerciseProgressionModal] = useState(false);
  const [selectedExerciseForProgression, setSelectedExerciseForProgression] = useState<string | null>(null);

  const trendData = calculateTrendData(workoutHistory, selectedTrendPeriod);
  const insightsData = calculateInsightsData(workoutHistory);
  const streakData = getStreakData(workoutHistory);

  const initials = useMemo(() => {
    const name = profile?.firstName || user?.displayName || user?.email || 'You';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.firstName, user?.displayName, user?.email]);

  // Sort weights by date (newest first) - must be at top level, not in renderWeightTab
  const sortedWeights = useMemo(() => {
    if (!dailyWeights || !Array.isArray(dailyWeights)) {
      return [];
    }
    return [...dailyWeights].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [dailyWeights, weightRefreshKey]);

  const renderProfileSection = () => (
    <View style={[styles.profileSection, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.gray700 }]}>
      <View style={[styles.avatar, { backgroundColor: BrandColors.accent + '30' }]}>
        <Text style={[styles.avatarText, { color: BrandColors.accent }]}>{initials}</Text>
      </View>
      <View style={styles.profileInfo}>
        <Text style={[styles.profileName, { color: BrandColors.text }]}>
          {profile?.firstName || user?.displayName || 'Athlete'}
        </Text>
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={[styles.profileStatValue, { color: BrandColors.accent }]}>{totalPoints}</Text>
            <Text style={[styles.profileStatLabel, { color: BrandColors.textSecondary }]}>Points</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={[styles.profileStatValue, { color: BrandColors.accent }]}>
              {workoutHistory?.length || 0}
            </Text>
            <Text style={[styles.profileStatLabel, { color: BrandColors.textSecondary }]}>Workouts</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={[styles.profileStatValue, { color: BrandColors.accent }]}>{streakData.current}</Text>
            <Text style={[styles.profileStatLabel, { color: BrandColors.textSecondary }]}>Streak</Text>
          </View>
        </View>
      </View>
    </View>
  );


  // Load weights on mount - but only if we don't have any local weights
  useEffect(() => {
    if (user?.uid) {
      const currentWeights = useWeightStore.getState().dailyWeights;
      
      // Only load from Firebase if we don't have any local weights
      if (currentWeights.length === 0) {
        loadWeightsFromFirebase(user.uid).catch((error) => {
          console.error('❌ Error loading weights:', error);
        });
      } else {
      }
    }
  }, [user?.uid, loadWeightsFromFirebase]);

  // Listen for weight logged event - force component to re-render
  useEffect(() => {
    const unsubscribe = eventBus.subscribe('weightLogged', () => {
      // Force a re-render by updating state
      setWeightRefreshKey(prev => prev + 1);
      // Also check store
      const currentWeights = useWeightStore.getState().dailyWeights;
    });
    return () => unsubscribe();
  }, []);

  // Refresh weights when progress tab comes into focus - but don't overwrite if we have local data
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        const currentWeights = useWeightStore.getState().dailyWeights;
        
        // Only load from Firebase if we don't have any local weights
        // This prevents overwriting freshly logged weights
        if (currentWeights.length === 0) {
          loadWeightsFromFirebase(user.uid).then(() => {
            const loadedWeights = useWeightStore.getState().dailyWeights;
          }).catch((error) => {
            console.error('❌ Error loading weights on focus:', error);
          });
        } else {
        }
      }
    }, [user?.uid, loadWeightsFromFirebase])
  );

  const renderGuideLink = (tabKey: 'history' | 'weight' | 'trends') => (
    <TouchableOpacity
      style={[styles.guideLink, { borderColor: BrandColors.textSecondary }]}
      activeOpacity={0.8}
      onPress={() => setGuideTab(tabKey)}
    >
      <Text style={[styles.guideLinkTitle, { color: BrandColors.text }]}>
        Need a quick breakdown?
      </Text>
      <Text style={[styles.guideLinkSubtitle, { color: BrandColors.textSecondary }]}>
        Tap for coaching on this view
      </Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    if (trendData.exerciseProgress.length > 0) {
      setSelectedExerciseTrend((prev) => prev && trendData.exerciseProgress.some(ex => ex.exercise === prev)
        ? prev
        : trendData.exerciseProgress[0].exercise);
    } else {
      setSelectedExerciseTrend(null);
    }
  }, [trendData.exerciseProgress]);

  const handleUnlockInsights = async () => {
    const cost = 2000;
    if (totalPoints >= cost && user?.uid) {
      const success = await spendPoints(cost, 'Unlock Advanced Insights', user.uid);
      if (success) {
        await unlockFeature('advanced_insights', 'gp', user.uid);
        setShowUnlockModal(false);
        Alert.alert('Unlocked!', 'Advanced Insights feature unlocked!');
      }
    } else {
      Alert.alert('Insufficient Points', 'You need more GP to unlock this feature.');
    }
  };

  const handleGenerateRoleBasedInsights = async () => {
    // Check feature flag - show "Coming Soon" if AI is disabled
    const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
    if (!checkFeatureOrShowComingSoon('advancedAI', 'AI Progress Insights')) {
      return;
    }
    // HIDDEN for v1.0 App Store submission - Tier checks removed
    // if (tier !== 'elite') {
    //   Alert.alert(
    //     'Elite Feature',
    //     'AI Progress Insights from your role perspective are only available for Elite tier users. Upgrade to unlock this feature.',
    //     [{ text: 'OK' }]
    //   );
    //   return;
    // }

    setIsGeneratingRoleInsights(true);
    setShowRoleBasedInsights(true);

    try {
      // Determine user role perspective
      let rolePerspective: 'personal' | 'trainer' | 'coach';
      if (isTrainer) {
        rolePerspective = 'trainer';
      } else if (isCoach) {
        rolePerspective = 'coach';
      } else {
        rolePerspective = 'personal';
      }

      const insights = await generateProgressInsightsByRole(
        rolePerspective,
        trendData,
        insightsData,
        trendData.exerciseProgress,
        personalRecords,
        workoutHistory
      );

      setRoleBasedInsights(insights);
    } catch (error: any) {
      console.error('Error generating role-based insights:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to generate insights. Please try again.',
        [{ text: 'OK' }]
      );
      setShowRoleBasedInsights(false);
    } finally {
      setIsGeneratingRoleInsights(false);
    }
  };

  const handleSessionPress = (workout: any) => {
    setSelectedWorkout(workout);
    setShowSessionModal(true);
  };

  const handleAnalyzeWorkout = () => {
    setShowSessionModal(false);
    setShowAnalysisModal(true);
  };

  const handleAnalyzeSet = (exercise: any, set: any) => {
    setSelectedExercise(exercise);
    setSelectedSet(set);
    setShowSessionModal(false);
    setShowVideoModal(true);
  };

  const handleVideoUpload = () => {
    // Check feature flag - show "Coming Soon" if disabled
    if (!checkFeatureOrShowComingSoon('videoUpload', 'Video Upload')) {
      return;
    }
    // TODO: Implement actual video upload when feature is enabled
    // Mock video upload - in real app would use camera/gallery
    Alert.alert('Video Upload', 'Video upload feature coming soon! This would open camera/gallery to record a set.');
    
    // Check if all required objects exist before accessing their properties
    if (!selectedWorkout || !selectedExercise || !selectedSet) {
      Alert.alert('Error', 'Missing workout data. Please try again.');
      setShowVideoModal(false);
      return;
    }
    
    // Mock adding video attachment and analysis
    const videoId = addVideoAttachment({
      workoutId: selectedWorkout.id,
      exerciseId: selectedExercise.id,
      setId: selectedSet.id,
      uri: 'mock-video-uri',
      duration: 30,
    });

    // Generate mock analysis
    const analysis = generateMockAnalysis(selectedExercise.name, selectedSet.reps, selectedSet.weight);
    
    Alert.alert('Analysis Complete!', `Form analysis generated for ${selectedExercise.name}. Check the analysis tab for details.`);
    setShowVideoModal(false);
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {TAB_OPTIONS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            selectedTab === tab.key && { backgroundColor: BrandColors.accent },
          ]}
          onPress={() => {
            setSelectedTab(tab.key as any);
          }}
        >
          <Text style={[
            styles.tabText,
            { color: selectedTab === tab.key ? '#000' : BrandColors.text },
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderHistoryTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {renderGuideLink('history')}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Streak Stats</Text>
        <View style={styles.streakContainer}>
          <View style={[styles.streakCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
            <Text style={[styles.streakNumber, { color: BrandColors.accent }]}>{streakData.current}</Text>
            <Text style={[styles.streakLabel, { color: BrandColors.text }]}>Current Streak</Text>
          </View>
          <View style={[styles.streakCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
            <Text style={[styles.streakNumber, { color: BrandColors.accent }]}>{streakData.longest}</Text>
            <Text style={[styles.streakLabel, { color: BrandColors.text }]}>Longest Streak</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Recent Sessions</Text>
        {workoutHistory.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
            <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
              No workouts logged yet. Start logging workouts to see your progress!
            </Text>
          </View>
        ) : (
          workoutHistory.slice(0, 10).map((workout, index) => {
            const itemKey = `${workout?.id || 'workout'}_${index}`;
            const renderRightActions = () => (
              <View style={styles.swipeActionsRightContainer}>
                <TouchableOpacity
                  style={[styles.editAction, { backgroundColor: BrandColors.surface, borderColor: BrandColors.accent }]}
                  onPress={() => {
                    setSelectedWorkout(workout);
                    setEditableWorkout(JSON.parse(JSON.stringify(workout)));
                    setShowEditModal(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionIcon, { color: BrandColors.accent }]}>✏️</Text>
                </TouchableOpacity>
              </View>
            );
            const renderLeftActions = () => (
              <View style={styles.swipeActionsLeftContainer}>
                <TouchableOpacity
                  style={[styles.deleteAction, { backgroundColor: '#8B0000' }]}
                  onPress={() => {
                    Alert.alert('Delete Workout', 'Are you sure you want to delete this workout?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => useWorkoutStore.getState().deleteWorkoutFromHistory(workout.id) },
                    ]);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.actionIcon, { color: '#FFFFFF' }]}>🗑️</Text>
                </TouchableOpacity>
              </View>
            );
            return (
              <Swipeable
                key={itemKey}
                renderRightActions={renderRightActions}
                renderLeftActions={renderLeftActions}
                friction={2}
                overshootLeft={false}
                overshootRight={false}
              >
                <View
                  style={[styles.sessionCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}
                >
                  <View style={styles.sessionHeader}>
                    <Text style={[styles.sessionTitle, { color: BrandColors.text }]}>{workout?.title || 'Untitled Workout'}</Text>
                    <Text style={[styles.sessionDate, { color: BrandColors.textSecondary }]}>
                      {workout?.date ? new Date(workout.date).toLocaleDateString() : 'Unknown Date'}
                    </Text>
                  </View>
                  <View style={styles.sessionStats}>
                    <Text style={[styles.sessionStat, { color: BrandColors.textSecondary }]}>
                      {workout?.exercises?.length || 0} exercises
                    </Text>
                    <Text style={[styles.sessionStat, { color: BrandColors.textSecondary }]}>
                      {workout?.exercises?.reduce((total, ex) => total + (ex?.sets?.length || 0), 0) || 0} sets
                    </Text>
                  </View>
                </View>
              </Swipeable>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  const renderWeightTab = () => {
    // Get user's weight goal based on primaryGoal
    const primaryGoal = profile?.primaryGoal || 'improve_fitness';
    const isLosingWeight = primaryGoal === 'lose_fat';
    const isGainingWeight = primaryGoal === 'build_muscle';
    
    // Sort weights by date for calculations
    const sortedWeightsForCalc = dailyWeights && Array.isArray(dailyWeights)
      ? [...dailyWeights].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      : [];
    
    // Get starting weight from profile or oldest logged weight
    const profileWeightValue = profile?.weight?.value;
    let startingWeight: number | null = null;
    
    if (profileWeightValue !== undefined && profileWeightValue !== null && profileWeightValue !== '') {
      const parsed = typeof profileWeightValue === 'number' 
        ? profileWeightValue 
        : parseFloat(String(profileWeightValue));
      if (!isNaN(parsed) && parsed > 0) {
        startingWeight = parsed;
      }
    }
    
    // If no profile weight, use oldest logged weight as starting weight
    if (startingWeight === null && sortedWeightsForCalc.length > 0) {
      startingWeight = sortedWeightsForCalc[0].weight;
    }
    
    // Get current weight (most recent)
    const currentWeight = sortedWeightsForCalc.length > 0 
      ? sortedWeightsForCalc[sortedWeightsForCalc.length - 1].weight
      : null;
    
    // Calculate weight change
    const weightChange = startingWeight && currentWeight 
      ? currentWeight - startingWeight 
      : null;
    
    // Calculate progress percentage (assuming goal is 10% change for now)
    const goalWeightChange = startingWeight ? startingWeight * 0.1 : 0;
    const progressPercentage = weightChange && goalWeightChange > 0
      ? Math.min(Math.max((Math.abs(weightChange) / goalWeightChange) * 100, 0), 100)
      : 0;
    
    // Determine if on track
    const isOnTrack = weightChange 
      ? (isLosingWeight && weightChange < 0) || (isGainingWeight && weightChange > 0) || (!isLosingWeight && !isGainingWeight)
      : null;
    
    // Use sortedWeights from top-level useMemo

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {renderGuideLink('weight')}
        
        {/* Weight Progress Summary - Only show if we have weights */}
        {(dailyWeights?.length || 0) > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Weight Progress</Text>
            <View style={[styles.weightProgressCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <View style={styles.weightProgressRow}>
                <View style={styles.weightProgressColumn}>
                  <Text style={[styles.weightProgressLabel, { color: BrandColors.textSecondary }]}>Starting Weight</Text>
                  <Text style={[styles.weightProgressValue, { color: BrandColors.text }]}>
                    {startingWeight !== null ? startingWeight.toFixed(1) : 'N/A'} lbs
                  </Text>
                </View>
                <View style={styles.weightProgressColumn}>
                  <Text style={[styles.weightProgressLabel, { color: BrandColors.textSecondary }]}>Current Weight</Text>
                  <Text style={[styles.weightProgressValue, { color: BrandColors.accent }]}>
                    {currentWeight !== null ? currentWeight.toFixed(1) : 'N/A'} lbs
                  </Text>
                </View>
                <View style={styles.weightProgressColumn}>
                  <Text style={[styles.weightProgressLabel, { color: BrandColors.textSecondary }]}>Change</Text>
                  <Text style={[
                    styles.weightProgressValue,
                    { 
                      color: weightChange !== null && weightChange !== 0
                        ? (isLosingWeight && weightChange < 0) || (isGainingWeight && weightChange > 0)
                          ? BrandColors.accent
                          : '#8B0000'
                        : BrandColors.textSecondary
                    }
                  ]}>
                    {weightChange !== null ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs` : 'N/A'}
                  </Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              {isLosingWeight || isGainingWeight ? (
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarBackground, { backgroundColor: BrandColors.gray800 }]}>
                    <View 
                      style={[
                        styles.progressBarFill,
                        { 
                          width: `${progressPercentage}%`,
                          backgroundColor: isOnTrack ? BrandColors.accent : '#8B0000'
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressBarText, { color: BrandColors.textSecondary }]}>
                    {isOnTrack ? '✅ On Track' : '⚠️ Off Track'} - {progressPercentage.toFixed(0)}% towards goal
                  </Text>
                </View>
              ) : (
                <View style={styles.progressBarContainer}>
                  <Text style={[styles.progressBarText, { color: BrandColors.textSecondary }]}>
                    Track your weight daily to monitor your fitness journey
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Daily Weight Entries - Always show this section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Daily Weight Log</Text>
          {!sortedWeights || sortedWeights.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                No weight entries yet. Log your weight daily to track your progress!
              </Text>
            </View>
          ) : (
            sortedWeights.map((weightEntry, index) => {
              const previousWeight = index < sortedWeights.length - 1 ? sortedWeights[index + 1].weight : null;
              const dayChange = previousWeight ? weightEntry.weight - previousWeight : null;
              
              return (
                <View 
                  key={`weight-${weightEntry.date}-${index}`} 
                  style={[styles.weightEntryCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}
                >
                  <View style={styles.weightEntryHeader}>
                    <View style={styles.weightEntryLeft}>
                      <Text style={[styles.weightEntryDate, { color: BrandColors.text }]}>
                        {new Date(weightEntry.date).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                      <Text style={[styles.weightEntryTime, { color: BrandColors.textSecondary }]}>
                        {new Date(weightEntry.loggedAt).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>
                    <View style={styles.weightEntryRight}>
                      <Text style={[styles.weightEntryValue, { color: BrandColors.accent }]}>
                        {weightEntry.weight.toFixed(1)} lbs
                      </Text>
                      {dayChange !== null && dayChange !== 0 && (
                        <Text style={[
                          styles.weightEntryChange,
                          { 
                            color: dayChange < 0 
                              ? (isLosingWeight ? BrandColors.accent : '#8B0000')
                              : (isGainingWeight ? BrandColors.accent : '#8B0000')
                          }
                        ]}>
                          {dayChange > 0 ? '↑' : '↓'} {Math.abs(dayChange).toFixed(1)} lbs
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  const renderTrendsTab = () => {
    const formatDate = (date?: string) => {
      if (!date) return 'Unknown date';
      const parsed = new Date(date);
      return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleDateString();
    };

    const formatSetLabel = (weight: number | null, reps: number | null) => {
      const safeWeight = weight ?? 0;
      const safeReps = reps ?? 0;
      if (safeWeight > 0 && safeReps > 0) {
        return `${safeWeight} × ${safeReps}`;
      }
      if (safeWeight > 0) {
        return `${safeWeight} lbs`;
      }
      if (safeReps > 0) {
        return `${safeReps} reps`;
      }
      return 'No set data';
    };

    const formatDeltaNumber = (value: number, decimals = 1) => {
      if (!Number.isFinite(value) || Math.abs(value) < 0.01) {
        return '0';
      }
      const isWhole = Math.abs(value % 1) < 0.01;
      const formatted = isWhole ? value.toFixed(0) : value.toFixed(decimals);
      return `${value >= 0 ? '+' : ''}${formatted}`;
    };

    const formatSetCount = (count: number | null | undefined) => {
      const safeCount = count ?? 0;
      return safeCount === 1 ? '1 set' : `${safeCount} sets`;
    };

    const getTopExerciseSummary = (workout: typeof trendData.workoutSummaries[number] | null) => {
      if (!workout || !workout.topExercises || workout.topExercises.length === 0) {
        return 'No top set logged';
      }
      const topExercise = workout.topExercises[0];
      const setLabel = formatSetLabel(topExercise.topWeight, topExercise.topReps);
      return `${topExercise.name}: ${setLabel} • ${formatSetCount(topExercise.setCount)}`;
    };

    const primaryWorkout = trendData.workoutSummaries[0] ?? null;
    const secondaryWorkout = trendData.workoutSummaries[1] ?? null;

    const selectedExerciseData = selectedExerciseTrend
      ? trendData.exerciseProgress.find((item) => item.exercise === selectedExerciseTrend) ?? null
      : trendData.exerciseProgress[0] ?? null;

    const latestHighlights = trendData.exerciseHighlights.slice(0, 3);

    const buildQualityAdvice = () => {
      const tips: string[] = [];

      if (!selectedExerciseData || selectedExerciseData.sessions.length === 0) {
        tips.push('Log repeat sets with weight and rep data so the AI can spot quality trends.');
        tips.push('Keep rest windows consistent (e.g. 2-3 min for strength) to compare sets fairly.');
        tips.push('Use the session notes to record what felt off—future you will thank you.');
        return tips;
      }

      const currentSession = selectedExerciseData.sessions[selectedExerciseData.sessions.length - 1];
      const previousSession = selectedExerciseData.sessions.length > 1
        ? selectedExerciseData.sessions[selectedExerciseData.sessions.length - 2]
        : null;

      if (previousSession) {
        const weightDelta = (currentSession.topWeight ?? 0) - (previousSession.topWeight ?? 0);
        const repsDelta = (currentSession.topReps ?? 0) - (previousSession.topReps ?? 0);

        if (weightDelta > 0 && repsDelta >= 0) {
          tips.push(`Great work—your latest ${selectedExerciseData.exercise} set moved up. Lock that in by slowing the eccentric and pausing the last rep.`);
        } else if (weightDelta < 0 || repsDelta < 0) {
          tips.push(`Your ${selectedExerciseData.exercise} set dipped this week. Film the next session or trim loading by 5% to rebuild crisp reps.`);
        }

        if (Math.abs(repsDelta) >= 2) {
          tips.push('Large rep swings signal inconsistent effort. Set a clear rep target and stop 1 rep short of failure to keep quality steady.');
        }
      } else {
        tips.push(`You just logged your first ${selectedExerciseData.exercise} set—focus on smooth tempo and note how it felt for next week.`);
      }

      if (latestHighlights.some((highlight) => highlight.direction === 'down')) {
        tips.push('Red arrows mean fatigue is creeping in. Prioritize sleep, hydration, or add an extra rest day before heavy work.');
      } else if (latestHighlights.length > 0) {
        tips.push('Green arrows show progressive overload is working. Maintain braced cores and full ranges to keep the quality high.');
      }

      if (tips.length < 3) {
        tips.push('For each top set: brace, control the eccentric, and rate the effort (RPE) so you can fine-tune next week.');
      }

      return tips.slice(0, 3);
    };

    const qualityTips = buildQualityAdvice();

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {renderGuideLink('trends')}
        
        {/* AI Progress Insights */}
        <View style={styles.section}>
          <AIProgressInsights
            trendData={trendData}
            insightsData={insightsData}
            exerciseProgress={trendData.exerciseProgress}
            personalRecords={personalRecords}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Time Period</Text>
          <View style={styles.periodContainer}>
            {TREND_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  styles.periodPill,
                  { backgroundColor: selectedTrendPeriod === period.key ? BrandColors.accent : BrandColors.background, borderColor: BrandColors.textSecondary }
                ]}
                onPress={() => setSelectedTrendPeriod(period.key as any)}
              >
                <Text style={[
                  styles.periodText,
                  { color: selectedTrendPeriod === period.key ? '#000' : BrandColors.text }
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Trend Notifications</Text>
          {latestHighlights.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                Log a few repeat sessions to see improvement alerts.
              </Text>
            </View>
          ) : (
            latestHighlights.map((highlight, index) => {
              const directionEmoji = highlight.direction === 'up' ? '📈' : '📉';
              const changeLabel = highlight.changeType === 'weight'
                ? `${formatDeltaNumber(highlight.weightChange)} lbs`
                : `${formatDeltaNumber(highlight.repsChange, 0)} reps`;
              const currentSet = formatSetLabel(highlight.current.topWeight, highlight.current.topReps);
              const previousSet = formatSetLabel(highlight.previous.topWeight, highlight.previous.topReps);

              return (
                <TouchableOpacity
                  key={`highlight-${index}`}
                  style={[
                    styles.highlightCard,
                    { backgroundColor: BrandColors.background, borderColor: highlight.direction === 'up' ? BrandColors.accent : '#8B0000' }
                  ]}
                  onPress={() => {
                    setSelectedExerciseForProgression(highlight.exercise);
                    setShowExerciseProgressionModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.highlightHeader}>
                    <Text style={[styles.highlightEmoji, { color: BrandColors.text }]}>{directionEmoji}</Text>
                    <Text style={[styles.highlightTitle, { color: BrandColors.text }]}>{highlight.exercise}</Text>
                    <View style={[
                      styles.highlightBadge,
                      { backgroundColor: highlight.direction === 'up' ? BrandColors.accent : '#8B0000' }
                    ]}>
                      <Text style={[styles.highlightBadgeText, { color: highlight.direction === 'up' ? '#000' : '#FFF' }]}>
                        {changeLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.highlightBody, { color: BrandColors.text }]}>
                    {`Now: ${currentSet}`}
                  </Text>
                  <Text style={[styles.highlightSubtext, { color: BrandColors.textSecondary }]}>
                    {`Prev: ${previousSet} on ${formatDate(highlight.previous.date)}`}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Workout Snapshot</Text>
          {!primaryWorkout ? (
            <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                Complete workouts during this period to unlock comparisons.
              </Text>
            </View>
          ) : (
            <View style={[styles.snapshotCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <View style={styles.snapshotRow}>
                <View style={styles.snapshotColumn}>
                  <Text style={[styles.snapshotHeading, { color: BrandColors.textSecondary }]}>Latest</Text>
                  <Text style={[styles.snapshotTitle, { color: BrandColors.text }]} numberOfLines={2}>
                    {primaryWorkout.title || 'Untitled Workout'}
                  </Text>
                  <Text style={[styles.snapshotSubtitle, { color: BrandColors.textSecondary }]}>
                    {formatDate(primaryWorkout.date)}
                  </Text>
                  <Text style={[styles.snapshotStat, { color: BrandColors.text }]} numberOfLines={2}>
                    {getTopExerciseSummary(primaryWorkout)}
                  </Text>
                  <Text style={[styles.snapshotMeta, { color: BrandColors.textSecondary }]}>
                    {`${primaryWorkout.exerciseCount} exercises • ${primaryWorkout.setCount} sets`}
                  </Text>
                </View>
                {secondaryWorkout ? (
                  <>
                    <View style={[styles.snapshotDivider, { backgroundColor: BrandColors.gray800 }]} />
                    <View style={styles.snapshotColumn}>
                      <Text style={[styles.snapshotHeading, { color: BrandColors.textSecondary }]}>Previous</Text>
                      <Text style={[styles.snapshotTitle, { color: BrandColors.text }]} numberOfLines={2}>
                        {secondaryWorkout.title || 'Untitled Workout'}
                      </Text>
                      <Text style={[styles.snapshotSubtitle, { color: BrandColors.textSecondary }]}>
                        {formatDate(secondaryWorkout.date)}
                      </Text>
                      <Text style={[styles.snapshotStat, { color: BrandColors.text }]} numberOfLines={2}>
                        {getTopExerciseSummary(secondaryWorkout)}
                      </Text>
                      <Text style={[styles.snapshotMeta, { color: BrandColors.textSecondary }]}>
                        {`${secondaryWorkout.exerciseCount} exercises • ${secondaryWorkout.setCount} sets`}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
              {secondaryWorkout ? (
                <View style={styles.snapshotDeltaRow}>
                  <Text style={[
                    styles.snapshotDelta,
                    { color: primaryWorkout.exerciseCount - secondaryWorkout.exerciseCount >= 0 ? BrandColors.accent : '#8B0000' }
                  ]}>
                    {`Exercises: ${formatDeltaNumber(primaryWorkout.exerciseCount - secondaryWorkout.exerciseCount, 0)}`}
                  </Text>
                  <Text style={[
                    styles.snapshotDelta,
                    { color: primaryWorkout.setCount - secondaryWorkout.setCount >= 0 ? BrandColors.accent : '#8B0000' }
                  ]}>
                    {`Sets: ${formatDeltaNumber(primaryWorkout.setCount - secondaryWorkout.setCount, 0)} sets`}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Exercise Timeline</Text>
          {trendData.exerciseProgress.length === 0 || !selectedExerciseData ? (
            <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                Repeat an exercise to start tracking its trend.
              </Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseSelectorRow}>
                {trendData.exerciseProgress.slice(0, 6).map((item, idx) => {
                  const isSelected = selectedExerciseData.exercise === item.exercise;
                  return (
                    <TouchableOpacity
                      key={`exercise-chip-${idx}`}
                      style={[
                        styles.exerciseChip,
                        {
                          backgroundColor: isSelected ? BrandColors.accent : BrandColors.background,
                          borderColor: isSelected ? BrandColors.accent : BrandColors.textSecondary,
                        }
                      ]}
                      onPress={() => setSelectedExerciseTrend(item.exercise)}
                    >
                      <Text style={[
                        styles.exerciseChipText,
                        { color: isSelected ? '#000' : BrandColors.text }
                      ]}>
                        {item.exercise}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={[styles.timelineCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
                {selectedExerciseData.sessions.slice(-3).reverse().map((session, timelineIndex, arr) => {
                  const previousSession = arr[timelineIndex + 1];
                  const weightDelta = previousSession ? (session.topWeight ?? 0) - (previousSession.topWeight ?? 0) : 0;
                  const repsDelta = previousSession ? (session.topReps ?? 0) - (previousSession.topReps ?? 0) : 0;
                  return (
                    <View key={`timeline-row-${timelineIndex}`} style={styles.timelineRow}>
                      <View style={styles.timelineLeft}>
                        <Text style={[styles.timelineDate, { color: BrandColors.textSecondary }]}>
                          {formatDate(session.date)}
                        </Text>
                        <Text style={[styles.timelineWorkoutTitle, { color: BrandColors.text }]}>
                          {session.workoutTitle || 'Untitled Workout'}
                        </Text>
                      </View>
                      <View style={styles.timelineRight}>
                        <Text style={[styles.timelineSet, { color: BrandColors.text }]}>
                          {formatSetLabel(session.topWeight, session.topReps)}
                        </Text>
                        <Text style={[styles.timelineVolume, { color: BrandColors.textSecondary }]}>
                          {formatSetCount(session.setCount)}
                        </Text>
                        {previousSession ? (
                          <Text
                            style={[
                              styles.timelineDelta,
                              { color: weightDelta >= 0 || repsDelta >= 0 ? BrandColors.accent : '#8B0000' }
                            ]}
                          >
                            {weightDelta !== 0 || repsDelta !== 0
                              ? `${formatDeltaNumber(weightDelta)} lbs • ${formatDeltaNumber(repsDelta, 0)} reps`
                              : 'No change'}
                          </Text>
                        ) : (
                          <Text style={[styles.timelineDelta, { color: BrandColors.textSecondary }]}>
                            First logged set
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Quality Coaching</Text>
          <View style={[styles.qualityCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
            {qualityTips.map((tip, index) => (
              <Text key={`quality-tip-${index}`} style={[styles.qualityTip, { color: BrandColors.text }]}>
                • {tip}
              </Text>
            ))}
          </View>
        </View>

      </ScrollView>
    );
  };


  const renderSessionModal = () => (
    <Modal visible={showSessionModal} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: BrandColors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
            {selectedWorkout?.title}
          </Text>
          <TouchableOpacity onPress={() => setShowSessionModal(false)}>
            <Text style={[styles.closeButton, { color: BrandColors.accent }]}>Close</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionDate, { color: BrandColors.textSecondary }]}>
              {selectedWorkout && new Date(selectedWorkout.date).toLocaleDateString()}
            </Text>
            <Text style={[styles.sessionStatsText, { color: BrandColors.textSecondary }]}>
              {selectedWorkout?.exercises?.length || 0} exercises • {selectedWorkout?.exercises?.reduce((total: number, ex: any) => total + (ex?.sets?.length || 0), 0) || 0} sets
            </Text>
          </View>

          {selectedWorkout?.exercises?.map((exercise: any, index: number) => (
            <View key={`progress-exercise-${exercise?.id || 'ex-' + index}-${index}-${selectedWorkout?.id || 'workout'}`} style={[styles.exerciseCard, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.exerciseName, { color: BrandColors.text }]}>{exercise?.name || 'Unknown Exercise'}</Text>
              
              {exercise?.type === 'cardio' ? (
                <View style={styles.cardioDetails}>
                  <Text style={[styles.cardioDetail, { color: BrandColors.textSecondary }]}>
                    Duration: {exercise?.duration || 0} minutes
                  </Text>
                  {exercise?.speed && (
                    <Text style={[styles.cardioDetail, { color: BrandColors.textSecondary }]}>
                      Speed: {exercise.speed} {exercise?.name === 'Running' || exercise?.name === 'Walking' ? 'mph' : 'rpm'}
                    </Text>
                  )}
                  {exercise?.distance && (
                    <Text style={[styles.cardioDetail, { color: BrandColors.textSecondary }]}>
                      Distance: {exercise.distance} {exercise?.name === 'Running' || exercise?.name === 'Walking' ? 'miles' : 'km'}
                    </Text>
                  )}
                  <Text style={[styles.cardioDetail, { color: BrandColors.textSecondary }]}>
                    Intensity: {exercise?.intensity || 'moderate'}
                  </Text>
                </View>
              ) : (
                <View style={styles.setsContainer}>
                  {exercise?.sets?.map((set: any, setIndex: number) => (
                    <View key={`set-${set?.id || 'set-' + setIndex}-${setIndex}-${exercise?.id || 'ex'}`} style={styles.setRow}>
                      <Text style={[styles.setNumber, { color: BrandColors.textSecondary }]}>
                        Set {setIndex + 1}
                      </Text>
                      <Text style={[styles.setDetails, { color: BrandColors.text }]}>
                        {set?.weight || 0} × {set?.reps || 0}
                      </Text>
                      <TouchableOpacity
                        style={[styles.analyzeButton, { backgroundColor: BrandColors.accent }]}
                        onPress={() => handleAnalyzeSet(exercise, set)}
                      >
                        <Text style={[styles.analyzeButtonText, { color: '#000' }]}>📹</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.analyzeWorkoutButton]}
            onPress={handleAnalyzeWorkout}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>
              Analyze Workout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ComponentStyles.button.secondary, styles.analyzeWorkoutButton]}
            onPress={() => {
              setEditableWorkout(JSON.parse(JSON.stringify(selectedWorkout)));
              setShowSessionModal(false);
              setShowEditModal(true);
            }}
          >
            <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.text }]}>Edit Workout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderAnalysisModal = () => (
    <Modal visible={showAnalysisModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>Workout Analysis</Text>
          <Text style={[styles.modalText, { color: BrandColors.textSecondary }]}>
            Advanced workout analysis including volume trends, intensity patterns, and recovery recommendations.
          </Text>
          
          <View style={styles.analysisFeatures}>
            <Text style={[styles.featureItem, { color: BrandColors.text }]}>📊 Volume Analysis</Text>
            <Text style={[styles.featureItem, { color: BrandColors.text }]}>💪 Intensity Tracking</Text>
            <Text style={[styles.featureItem, { color: BrandColors.text }]}>🔄 Recovery Insights</Text>
            <Text style={[styles.featureItem, { color: BrandColors.text }]}>📈 Progress Trends</Text>
          </View>
          
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.modalButton]}
            onPress={() => {
              if (!checkFeatureOrShowComingSoon('advancedInsights', 'Video Analysis')) {
                setShowAnalysisModal(false);
                return;
              }
              // TODO: Implement video analysis when feature is enabled
              setShowAnalysisModal(false);
            }}
          >
            {/* Hidden for v1.0 - Coming Soon text removed */}
            {/* <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Coming Soon</Text> */}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderVideoModal = () => (
    <Modal visible={showVideoModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>Video Analysis</Text>
          <Text style={[styles.modalText, { color: BrandColors.textSecondary }]}>
            Upload a video of your {selectedExercise?.name || 'exercise'} set to get AI-powered form analysis.
          </Text>
          
          <View style={styles.videoOptions}>
            <TouchableOpacity
              style={[styles.videoOption, { backgroundColor: BrandColors.accent }]}
              onPress={handleVideoUpload}
            >
              <Text style={[styles.videoOptionText, { color: '#000' }]}>📹 Record Video</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.videoOption, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.textSecondary }]}
              onPress={() => {
                if (!checkFeatureOrShowComingSoon('videoUpload', 'Gallery Upload')) {
                  return;
                }
                // TODO: Implement gallery upload when feature is enabled
                Alert.alert('Gallery Upload', 'Gallery upload feature coming soon!');
              }}
            >
              <Text style={[styles.videoOptionText, { color: BrandColors.text }]}>📁 Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[ComponentStyles.button.secondary, styles.modalButton]}
            onPress={() => setShowVideoModal(false)}
          >
            <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderGuideModal = () => {
    if (!guideTab) return null;
    const content = TAB_GUIDES[guideTab];
    return (
      <Modal visible animationType="fade" transparent onRequestClose={() => setGuideTab(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.guideModalContent, { backgroundColor: BrandColors.background }]}>
            <Text style={[styles.guideModalTitle, { color: BrandColors.text }]}>{content.title}</Text>
            <Text style={[styles.guideModalSummary, { color: BrandColors.textSecondary }]}>
              {content.summary}
            </Text>
            <View style={styles.guideModalBullets}>
              {content.bullets.map((line, index) => (
                <Text key={`${guideTab}-bullet-${index}`} style={[styles.guideModalBullet, { color: BrandColors.text }]}>
                  • {line}
                </Text>
              ))}
            </View>
            <TouchableOpacity
              style={[ComponentStyles.button.primary, styles.guideModalButton]}
              onPress={() => setGuideTab(null)}
            >
              <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderExerciseProgressionModal = () => {
    if (!selectedExerciseForProgression) return null;
    
    const exerciseData = trendData.exerciseProgress.find(
      (item) => item.exercise === selectedExerciseForProgression
    );
    
    if (!exerciseData || exerciseData.sessions.length === 0) {
      return (
        <Modal
          visible={showExerciseProgressionModal}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setShowExerciseProgressionModal(false);
            setSelectedExerciseForProgression(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.guideModalContent, { backgroundColor: BrandColors.background }]}>
              <Text style={[styles.guideModalTitle, { color: BrandColors.text }]}>
                {selectedExerciseForProgression}
              </Text>
              <Text style={[styles.guideModalSummary, { color: BrandColors.textSecondary }]}>
                No progression data available for this exercise yet.
              </Text>
              <TouchableOpacity
                style={[ComponentStyles.button.primary, styles.guideModalButton]}
                onPress={() => {
                  setShowExerciseProgressionModal(false);
                  setSelectedExerciseForProgression(null);
                }}
              >
                <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    }

    const formatDate = (date?: string) => {
      if (!date) return 'Unknown date';
      const parsed = new Date(date);
      return Number.isNaN(parsed.getTime()) ? 'Unknown date' : parsed.toLocaleDateString();
    };

    const formatSetLabel = (weight: number | null, reps: number | null) => {
      const safeWeight = weight ?? 0;
      const safeReps = reps ?? 0;
      if (safeWeight > 0 && safeReps > 0) {
        return `${safeWeight} × ${safeReps}`;
      }
      if (safeWeight > 0) {
        return `${safeWeight} lbs`;
      }
      if (safeReps > 0) {
        return `${safeReps} reps`;
      }
      return 'No set data';
    };

    const formatDeltaNumber = (value: number, decimals = 1) => {
      if (!Number.isFinite(value) || Math.abs(value) < 0.01) {
        return '0';
      }
      const isWhole = Math.abs(value % 1) < 0.01;
      const formatted = isWhole ? value.toFixed(0) : value.toFixed(decimals);
      return `${value >= 0 ? '+' : ''}${formatted}`;
    };

    return (
      <Modal
        visible={showExerciseProgressionModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowExerciseProgressionModal(false);
          setSelectedExerciseForProgression(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              setShowExerciseProgressionModal(false);
              setSelectedExerciseForProgression(null);
            }}
          >
            <Pressable
              style={[styles.progressionModalContent, { backgroundColor: BrandColors.background }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
                  {selectedExerciseForProgression} Progression
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowExerciseProgressionModal(false);
                    setSelectedExerciseForProgression(null);
                  }}
                  style={styles.progressionCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <IconSymbol name="xmark" size={20} color={BrandColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.progressionScrollView} showsVerticalScrollIndicator={true}>
                <Text style={[styles.progressionSubtitle, { color: BrandColors.textSecondary }]}>
                  Your heaviest set progression over time
                </Text>

                {exerciseData.sessions.map((session, index) => {
                  const previousSession = index > 0 ? exerciseData.sessions[index - 1] : null;
                  const weightDelta = previousSession
                    ? (session.topWeight ?? 0) - (previousSession.topWeight ?? 0)
                    : 0;
                  const repsDelta = previousSession
                    ? (session.topReps ?? 0) - (previousSession.topReps ?? 0)
                    : 0;

                  return (
                    <View
                      key={`progression-${session.workoutId}-${index}`}
                      style={[
                        styles.progressionRow,
                        { backgroundColor: BrandColors.gray800, borderColor: BrandColors.gray700 }
                      ]}
                    >
                      <View style={styles.progressionLeft}>
                        <Text style={[styles.progressionDate, { color: BrandColors.textSecondary }]}>
                          {formatDate(session.date)}
                        </Text>
                        <Text style={[styles.progressionWorkoutTitle, { color: BrandColors.text }]}>
                          {session.workoutTitle || 'Untitled Workout'}
                        </Text>
                      </View>
                      <View style={styles.progressionRight}>
                        <Text style={[styles.progressionSet, { color: BrandColors.accent }]}>
                          {formatSetLabel(session.topWeight, session.topReps)}
                        </Text>
                        {previousSession && (weightDelta !== 0 || repsDelta !== 0) ? (
                          <Text
                            style={[
                              styles.progressionDelta,
                              {
                                color:
                                  weightDelta >= 0 || repsDelta >= 0 ? BrandColors.accent : '#8B0000'
                              }
                            ]}
                          >
                            {weightDelta !== 0 && `${formatDeltaNumber(weightDelta)} lbs`}
                            {weightDelta !== 0 && repsDelta !== 0 && ' • '}
                            {repsDelta !== 0 && `${formatDeltaNumber(repsDelta, 0)} reps`}
                          </Text>
                        ) : (
                          <Text style={[styles.progressionDelta, { color: BrandColors.textSecondary }]}>
                            First logged
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    );
  };

  const updateEditableSetField = (exerciseId: string, setId: string, field: 'reps' | 'weight', value: string) => {
    setEditableWorkout((prev: any) => ({
      ...prev,
      exercises: prev.exercises.map((ex: any) => ex.id === exerciseId ? {
        ...ex,
        sets: ex.sets.map((s: any) => s.id === setId ? { ...s, [field]: value === '' ? null : Number(value) } : s)
      } : ex)
    }));
  };

  const addEditableSet = (exerciseId: string) => {
    setEditableWorkout((prev: any) => ({
      ...prev,
      exercises: prev.exercises.map((ex: any) => ex.id === exerciseId ? {
        ...ex,
        sets: [...ex.sets, { id: Date.now().toString(), reps: null, weight: null, style: 'normal' }]
      } : ex)
    }));
  };

  const addEditableExercise = () => {
    setEditableWorkout((prev: any) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          id: Date.now().toString(),
          name: 'New Exercise',
          sets: [{ id: (Date.now()+1).toString(), reps: null, weight: null, style: 'normal' }],
          type: 'strength',
        },
      ],
    }));
  };

  const renderEditModal = () => (
    <Modal visible={showEditModal} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: BrandColors.background }]}> 
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
            Edit: {editableWorkout?.title}
          </Text>
          <TouchableOpacity onPress={() => setShowEditModal(false)}>
            <Text style={[styles.closeButton, { color: BrandColors.accent }]}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {editableWorkout?.exercises?.map((exercise: any) => (
            <View key={`edit-ex-${exercise.id}`} style={[styles.exerciseCard, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.textSecondary }]}> 
              <Text style={[styles.exerciseName, { color: BrandColors.text }]}>{exercise.name}</Text>
              {exercise.type === 'cardio' ? (
                <View>
                  {/* Hidden for v1.0 - Cardio editing coming soon */}
                  <Text style={[styles.cardioDetail, { color: BrandColors.textSecondary }]}>
                    Cardio exercises are view-only in this version
                  </Text>
                  {/* <TouchableOpacity
                    style={[ComponentStyles.button.secondary, { marginTop: 8 }]}
                    onPress={() => checkFeatureOrShowComingSoon('cardioEditing', 'Cardio Editing')}
                  >
                    <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.accent }]}>
                      Coming Soon
                    </Text>
                  </TouchableOpacity> */}
                </View>
              ) : (
                <View style={styles.setsContainer}>
                  {exercise.sets.map((s: any, idx: number) => (
                    <View key={`edit-set-${s.id}`} style={styles.setRow}>
                      <Text style={[styles.setNumber, { color: BrandColors.textSecondary }]}>Set {idx+1}</Text>
                      <TextInput
                        style={[styles.input, { color: BrandColors.text, borderColor: BrandColors.gray800 }]}
                        placeholder="Weight"
                        keyboardType="numeric"
                        value={s.weight === null ? '' : String(s.weight)}
                        onChangeText={(t) => updateEditableSetField(exercise.id, s.id, 'weight', t)}
                        placeholderTextColor={BrandColors.textSecondary}
                      />
                      <Text style={[styles.xSymbol, { color: BrandColors.textSecondary }]}>×</Text>
                      <TextInput
                        style={[styles.input, { color: BrandColors.text, borderColor: BrandColors.gray800 }]}
                        placeholder="Reps"
                        keyboardType="numeric"
                        value={s.reps === null ? '' : String(s.reps)}
                        onChangeText={(t) => updateEditableSetField(exercise.id, s.id, 'reps', t)}
                        placeholderTextColor={BrandColors.textSecondary}
                      />
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[ComponentStyles.button.secondary, styles.addSetButton]}
                    onPress={() => addEditableSet(exercise.id)}
                  >
                    <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.text }]}>+ Add Set</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[ComponentStyles.button.secondary, styles.addExerciseButton]}
            onPress={addEditableExercise}
          >
            <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.text }]}>+ Add Exercise</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.saveButton]}
            onPress={async () => {
              if (!editableWorkout) return;
              await useWorkoutStore.getState().updateWorkoutInHistory({
                ...editableWorkout,
                createdAt: editableWorkout.createdAt ? new Date(editableWorkout.createdAt) : new Date(),
                completedAt: editableWorkout.completedAt ? new Date(editableWorkout.completedAt) : new Date(),
              });
              setShowEditModal(false);
            }}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Save Changes</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderUnlockModal = () => (
    <Modal visible={showUnlockModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
            Advanced Insights is locked
          </Text>
          <Text style={[styles.modalText, { color: BrandColors.textSecondary }]}>
            Cost: 2,000 GP{'\n'}You have: {totalPoints.toLocaleString()} GP
          </Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: BrandColors.textSecondary }]}
              onPress={() => setShowUnlockModal(false)}
            >
              <Text style={[styles.modalButtonText, { color: BrandColors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.unlockButton,
                { backgroundColor: totalPoints >= 2000 ? BrandColors.accent : BrandColors.textSecondary }
              ]}
              onPress={handleUnlockInsights}
              disabled={totalPoints < 2000}
            >
              <Text style={[styles.modalButtonText, { color: totalPoints >= 2000 ? '#000' : BrandColors.text }]}>
                Unlock with Points
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'history': return renderHistoryTab();
      case 'weight': return renderWeightTab();
      case 'trends': return renderTrendsTab();
      default: return renderHistoryTab();
    }
  };

  // For coaches/trainers, show team/client progress instead of personal progress
  if (isCoachOrTrainer && profile?.teamId) {
    return (
      <View style={[styles.container, styles.coachContainer, { backgroundColor: BrandColors.background }]}>
        {/* Elite Tier - Role-Based AI Insights Button for Coaches/Trainers - HIDDEN for v1.0 */}
        {false && tier === 'elite' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
            <TouchableOpacity
              style={[styles.roleInsightsButton, {
                backgroundColor: BrandColors.accent + '15',
                borderColor: BrandColors.accent,
              }]}
              onPress={handleGenerateRoleBasedInsights}
              activeOpacity={0.7}
              disabled={isGeneratingRoleInsights}
            >
              <IconSymbol name="sparkles" size={20} color={BrandColors.accent} />
              <View style={styles.roleInsightsButtonContent}>
                <Text style={[styles.roleInsightsButtonTitle, { color: BrandColors.text }]}>
                  {isTrainer ? 'Generate Trainer/Client Insights' : 'Generate Coach/Player Insights'}
                </Text>
                <Text style={[styles.roleInsightsButtonSubtitle, { color: BrandColors.textSecondary }]}>
                  AI-powered analysis from {isTrainer ? 'a trainer' : 'a coach'} perspective
                </Text>
              </View>
              {isGeneratingRoleInsights ? (
                <ActivityIndicator size="small" color={BrandColors.accent} />
              ) : (
                <IconSymbol name="chevron.right" size={20} color={BrandColors.accent} />
              )}
            </TouchableOpacity>

            {/* Display Role-Based Insights */}
            {showRoleBasedInsights && roleBasedInsights && (
              <View style={[styles.roleInsightsContainer, {
                backgroundColor: BrandColors.surface,
                borderColor: BrandColors.accent,
                marginTop: Spacing.md,
              }]}>
                <View style={styles.roleInsightsHeader}>
                  <View style={[styles.roleInsightsIconContainer, {
                    backgroundColor: BrandColors.accent + '20',
                  }]}>
                    <IconSymbol name="sparkles" size={18} color={BrandColors.accent} />
                  </View>
                  <Text style={[styles.roleInsightsTitle, { color: BrandColors.text }]}>
                    {isTrainer ? 'Trainer/Client Insights' : 'Coach/Player Insights'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowRoleBasedInsights(false);
                      setRoleBasedInsights(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark" size={18} color={BrandColors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.roleInsightsContent}>
                  <Text style={[styles.roleInsightsText, { color: BrandColors.text }]}>
                    {roleBasedInsights}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}
        
        <OverviewTab
          playerStats={playerStats}
          loadingOverview={loadingOverview}
          title={isTrainer ? 'Client Progress' : 'Team Progress'}
          memberLabel={memberLabel}
          emptyTitle={isTrainer ? `No clients yet` : `No players yet`}
          emptyDescription={
            isTrainer
              ? `Clients will appear here once they join your training program.`
              : `Players will appear here once they join your team.`
          }
          onSelectPlayer={(player) => {
            // Navigate to team management to view individual player progress
            router.push('/community/team-management');
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: BrandColors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderProfileSection()}
        
        {/* AI Goal Recalibration */}
        {profile && ((profile.goals && profile.goals.length > 0) || profile.primaryGoal) && workoutHistory && workoutHistory.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: Spacing.md }}>
            <AIGoalRecalibration
              userGoals={profile.goals && profile.goals.length > 0 
                ? profile.goals 
                : profile.primaryGoal 
                  ? [profile.primaryGoal] 
                  : []}
              personalRecords={personalRecords}
              trendData={trendData}
              weightHistory={sortedWeights.map(w => ({ date: w.date, weight: w.weight }))}
            />
          </View>
        )}
        
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>
      
      {renderUnlockModal()}
      {renderSessionModal()}
      {renderAnalysisModal()}
      {renderVideoModal()}
      {renderEditModal()}
      {renderGuideModal()}
      {renderExerciseProgressionModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coachContainer: {
    paddingTop: 100,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 64,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  consistencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  consistencyScore: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  consistencyLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  consistencyTip: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: BrandColors.gray800,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  guideLink: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  guideLinkTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  guideLinkSubtitle: {
    fontSize: 12,
  },
  highlightCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  highlightEmoji: {
    fontSize: 20,
  },
  highlightTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  highlightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  highlightBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  highlightBody: {
    fontSize: 12,
    fontWeight: '500',
  },
  highlightSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  streakContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  streakCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sessionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    // subtle glow edge
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sessionDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  sessionStat: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  prCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  prHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prExercise: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  prDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  prStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  prStat: {
    alignItems: 'center',
  },
  prStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  prStatLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sendToWorkoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendToWorkoutText: {
    fontSize: 14,
    fontWeight: '600',
  },
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  snapshotCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: 16,
  },
  snapshotColumn: {
    flex: 1,
    gap: 4,
  },
  snapshotHeading: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  snapshotTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  snapshotSubtitle: {
    fontSize: 12,
  },
  snapshotStat: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  snapshotMeta: {
    fontSize: 12,
  },
  snapshotDivider: {
    width: 1,
    borderRadius: 4,
    alignSelf: 'stretch',
  },
  snapshotDeltaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  snapshotDelta: {
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseSelectorRow: {
    marginBottom: 12,
  },
  exerciseChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  exerciseChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timelineCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  timelineLeft: {
    flex: 1.2,
  },
  timelineRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  timelineWorkoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  timelineSet: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineVolume: {
    fontSize: 12,
    marginTop: 4,
  },
  timelineDelta: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  qualityCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  qualityTip: {
    fontSize: 14,
    lineHeight: 20,
  },
  chartCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  volumeSummaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  volumeSummaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  volumeSummaryCount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  volumeSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  volumeInsightList: {
    marginTop: 16,
    gap: 12,
  },
  volumeInsightCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  volumeInsightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  volumeInsightTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  volumeInsightPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  volumeInsightBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Swipe actions
  swipeActionsRightContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  swipeActionsLeftContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  editAction: {
    width: 64,
    height: '85%',
    marginVertical: 6,
    marginRight: 6,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    width: 64,
    height: '85%',
    marginVertical: 6,
    marginLeft: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  lockedCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  lockedIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  lockedCost: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  unlockButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weakPointCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  weakPointMuscleGroup: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  weakPointPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  fatigueCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  fatigueStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fatigueRecommendation: {
    fontSize: 14,
    lineHeight: 20,
  },
  recoveryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  recoveryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },
  guideModalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    gap: 16,
  },
  guideModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  guideModalSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  guideModalBullets: {
    gap: 8,
  },
  guideModalBullet: {
    fontSize: 14,
    lineHeight: 20,
  },
  guideModalButton: {
    marginTop: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // New styles for session modals
  modalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  sessionInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  sessionStatsText: {
    fontSize: 14,
    marginTop: 4,
  },
  // Edit workout modal styles
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    minWidth: 60,
    textAlign: 'center',
  },
  xSymbol: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Typography.fontFamily,
    marginHorizontal: 8,
  },
  addSetButton: {
    marginTop: 12,
  },
  addExerciseButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  saveButton: {
    marginTop: 16,
  },
  exerciseCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardioDetails: {
    gap: 4,
  },
  cardioDetail: {
    fontSize: 14,
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: BrandColors.background,
    borderRadius: 8,
  },
  setNumber: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
  },
  setDetails: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  analyzeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    fontSize: 16,
  },
  analyzeWorkoutButton: {
    margin: 20,
  },
  analysisFeatures: {
    marginVertical: 20,
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    paddingVertical: 4,
  },
  videoOptions: {
    marginVertical: 20,
    gap: 12,
  },
  videoOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  videoOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  exerciseTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  exerciseTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  roleInsightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  roleInsightsButtonContent: {
    flex: 1,
  },
  roleInsightsButtonTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs / 2,
  },
  roleInsightsButtonSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  roleInsightsContainer: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    padding: Spacing.md,
    marginTop: Spacing.md,
    maxHeight: 400,
  },
  roleInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roleInsightsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInsightsTitle: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  roleInsightsContent: {
    maxHeight: 300,
  },
  roleInsightsText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 22,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 24,
  },
  profileStat: {
    alignItems: 'flex-start',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  weightProgressCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  weightProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weightProgressColumn: {
    flex: 1,
    alignItems: 'center',
  },
  weightProgressLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  weightProgressValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  weightEntryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  weightEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightEntryLeft: {
    flex: 1,
  },
  weightEntryRight: {
    alignItems: 'flex-end',
  },
  weightEntryDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  weightEntryTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  weightEntryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  weightEntryChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressionModalContent: {
    borderRadius: 16,
    padding: 0,
    width: '85%',
    maxWidth: 380,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  progressionCloseButton: {
    padding: 4,
  },
  progressionScrollView: {
    maxHeight: 500,
    padding: 16,
  },
  progressionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  progressionLeft: {
    flex: 1.2,
  },
  progressionRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  progressionDate: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  progressionWorkoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  progressionSet: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressionDelta: {
    fontSize: 12,
    fontWeight: '600',
  },
});

