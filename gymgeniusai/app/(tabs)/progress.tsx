import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { useWorkoutStore } from '@/stores/workoutStore';
import { usePointsStore } from '@/stores/pointsStore';
import { useProgressStore } from '@/stores/progressStore';
import { useVideoStore } from '@/stores/videoStore';
import { useAuth } from '@/components/AuthProvider';

const TAB_OPTIONS = [
  { key: 'history', label: 'History' },
  { key: 'prs', label: 'PRs' },
  { key: 'trends', label: 'Trends' },
  { key: 'insights', label: 'Insights' },
];

const PR_FILTERS = [
  { key: 'All', label: 'All', muscleGroups: [] },
  { key: 'Legs', label: 'Legs', muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  { key: 'Chest', label: 'Chest', muscleGroups: ['Chest'] },
  { key: 'Back', label: 'Back', muscleGroups: ['Back'] },
  { key: 'Shoulders', label: 'Shoulders', muscleGroups: ['Shoulders'] },
  { key: 'Biceps', label: 'Biceps', muscleGroups: ['Biceps'] },
  { key: 'Triceps', label: 'Triceps', muscleGroups: ['Triceps'] },
  { key: 'Core', label: 'Core', muscleGroups: ['Core'] },
];

const TREND_PERIODS = [
  { key: '4W', label: '4W' },
  { key: '12W', label: '12W' },
  { key: '52W', label: '52W' },
];

const TAB_GUIDES: Record<'history' | 'prs' | 'trends' | 'insights', {
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
  prs: {
    title: 'Personal Records',
    summary: 'Highlights your strongest sets per movement. Perfect for planning the next push.',
    bullets: [
      'Use PRs to set your warm-up and ramp weights for an upcoming session.',
      'If a PR is old, schedule a dedicated top set to retest and refresh it.',
      'Send a PR to a workout once that feature unlocks to pre-load a goal set.'
    ],
  },
  trends: {
    title: 'Trends Breakdown',
    summary: 'Shows where you’re gaining or slipping so you can dial in quality each week.',
    bullets: [
      'Trend alerts signal meaningful changes—celebrate the green arrows and address the red.',
      'Compare latest vs previous workouts to confirm your ramp-up is manageable.',
      'Use the exercise timeline to plan which movement needs focus on technique or intent.'
    ],
  },
  insights: {
    title: 'Insights Deep Dive',
    summary: 'Combines muscle group exposure with fatigue cues to guide smarter programming.',
    bullets: [
      'Volume insights call out the lowest-exposed areas—slot them earlier in the week when you’re fresh.',
      'Under “Weak Points”, bring the flagged muscle into your primary day once or add back-off sets.',
      'Fatigue warnings hint when recovery is lagging; adjust sleep, nutrition, or pull a set before form slips.'
    ],
  },
};

export default function ProgressScreen() {
  const { user } = useAuth();
  const { workoutHistory } = useWorkoutStore();
  const { totalPoints, isFeatureUnlocked, spendPoints, unlockFeature } = usePointsStore();
  const { addVideoAttachment, generateMockAnalysis } = useVideoStore();
  const {
    selectedTab,
    selectedMonth,
    selectedTrendPeriod,
    selectedPRFilter,
    setSelectedTab,
    setSelectedMonth,
    setSelectedTrendPeriod,
    setSelectedPRFilter,
    calculatePersonalRecords,
    calculateTrendData,
    calculateInsightsData,
    getStreakData,
    getMuscleGroups,
  } = useProgressStore();

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
  const [guideTab, setGuideTab] = useState<'history' | 'prs' | 'trends' | 'insights' | null>(null);

  const personalRecords = calculatePersonalRecords(workoutHistory);
  const trendData = calculateTrendData(workoutHistory, selectedTrendPeriod);
  const insightsData = calculateInsightsData(workoutHistory);
  const streakData = getStreakData(workoutHistory);

  // Filter PRs based on selected filter
  const currentPRFilter = PR_FILTERS.find(filter => filter.key === selectedPRFilter);

  const filteredPRs = !currentPRFilter || currentPRFilter.key === 'All'
    ? personalRecords
    : personalRecords.filter((pr) => {
        const exerciseMuscles = getMuscleGroups(pr.exercise);
        return exerciseMuscles.some((muscle) => currentPRFilter.muscleGroups.includes(muscle));
      });

  const filteredWorkouts = !currentPRFilter || currentPRFilter.key === 'All'
    ? workoutHistory
    : workoutHistory.filter((workout) =>
        workout.exercises?.some((exercise: any) => {
          const exerciseMuscles = getMuscleGroups(exercise.name);
          return exerciseMuscles.some((muscle) => currentPRFilter.muscleGroups.includes(muscle));
        })
      );

  const renderGuideLink = (tabKey: 'history' | 'prs' | 'trends' | 'insights') => (
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

  const handleInsightsAccess = () => {
    if (!isFeatureUnlocked('advanced_insights')) {
      setShowUnlockModal(true);
    }
  };

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
            tab.key === 'insights' && !isFeatureUnlocked('advanced_insights') && { opacity: 0.6 }
          ]}
          onPress={() => {
            if (tab.key === 'insights') {
              handleInsightsAccess();
            } else {
              setSelectedTab(tab.key as any);
            }
          }}
        >
          <Text style={[
            styles.tabText,
            { color: selectedTab === tab.key ? '#000' : BrandColors.text },
            tab.key === 'insights' && !isFeatureUnlocked('advanced_insights') && { color: BrandColors.textSecondary }
          ]}>
            {tab.label}
            {tab.key === 'insights' && !isFeatureUnlocked('advanced_insights') && ' 🔒'}
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

  const renderPRsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {renderGuideLink('prs')}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Filter by Body Part</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {PR_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterPill,
                { backgroundColor: selectedPRFilter === filter.key ? BrandColors.accent : BrandColors.background, borderColor: BrandColors.textSecondary }
              ]}
              onPress={() => setSelectedPRFilter(filter.key)}
            >
              <Text style={[
                styles.filterText,
                { color: selectedPRFilter === filter.key ? '#000' : BrandColors.text }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Personal Records</Text>
        {filteredPRs.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
            <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
              No personal records yet. Complete some workouts to see your PRs!
            </Text>
          </View>
        ) : (
          filteredPRs.map((pr) => (
            <View key={pr.id} style={[styles.prCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <View style={styles.prHeader}>
                <Text style={[styles.prExercise, { color: BrandColors.text }]}>{pr.exercise}</Text>
                <Text style={[styles.prDate, { color: BrandColors.textSecondary }]}>
                  {new Date(pr.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.prStats}>
                <View style={styles.prStat}>
                  <Text style={[styles.prStatValue, { color: BrandColors.accent }]}>
                    {pr.weight}×{pr.reps}
                  </Text>
                  <Text style={[styles.prStatLabel, { color: BrandColors.textSecondary }]}>Best Set</Text>
                </View>
                <View style={styles.prStat}>
                  <Text style={[styles.prStatValue, { color: BrandColors.accent }]}>
                    {pr.estimated1RM}
                  </Text>
                  <Text style={[styles.prStatLabel, { color: BrandColors.textSecondary }]}>Est. 1RM</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.sendToWorkoutButton, { backgroundColor: BrandColors.accent }]}
                onPress={() => Alert.alert('Coming Soon', 'Send to Workout feature coming soon!')}
              >
                <Text style={[styles.sendToWorkoutText, { color: '#000' }]}>Send to Workout</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Workouts</Text>
        {filteredWorkouts.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
            <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>No workouts logged yet for this focus.</Text>
          </View>
        ) : (
          filteredWorkouts
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((workout) => (
              <View
                key={workout.id}
                style={[styles.sessionCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}
              >
                <View style={styles.sessionHeader}>
                  <Text style={[styles.sessionTitle, { color: BrandColors.text }]}>{workout.title || 'Untitled Workout'}</Text>
                  <Text style={[styles.sessionDate, { color: BrandColors.textSecondary }]}>
                    {workout.date ? new Date(workout.date).toLocaleDateString() : 'Unknown Date'}
                  </Text>
                </View>
                <Text style={[styles.sessionStat, { color: BrandColors.textSecondary }]}>Targeted Exercises:</Text>
                <View style={styles.exerciseTagRow}>
                  {workout.exercises
                    ?.filter((exercise: any) => {
                      if (!currentPRFilter || currentPRFilter.key === 'All') {
                        return true;
                      }
                      const exerciseMuscles = getMuscleGroups(exercise.name);
                      return exerciseMuscles.some((muscle) => currentPRFilter.muscleGroups.includes(muscle));
                    })
                    .slice(0, 4)
                    .map((exercise: any, index: number) => (
                      <View key={`${workout.id}-${exercise.id || index}`} style={[styles.exerciseTag, { borderColor: BrandColors.accent }]}>
                        <Text style={[styles.exerciseTagText, { color: BrandColors.accent }]}>{exercise.name}</Text>
                      </View>
                    ))}
                </View>
              </View>
            ))
        )}
      </View>
    </ScrollView>
  );

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
                <View
                  key={`highlight-${index}`}
                  style={[
                    styles.highlightCard,
                    { backgroundColor: BrandColors.background, borderColor: highlight.direction === 'up' ? BrandColors.accent : '#8B0000' }
                  ]}
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
                </View>
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

  const renderInsightsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {renderGuideLink('insights')}
      {(() => {
        const volumeGroups = trendData.volumeByMuscleGroup
          .slice()
          .sort((a, b) => a.percentage - b.percentage);
        const lowVolume = volumeGroups.filter(group => group.percentage < 80);
        const balancedVolume = volumeGroups.filter(group => group.percentage >= 80 && group.percentage <= 120);
        const highVolume = volumeGroups.filter(group => group.percentage > 120);
        const focusGroups = lowVolume.slice(0, 3);

        const getVolumeSuggestion = (group: typeof volumeGroups[number]) => {
          if (group.percentage < 80) {
            return `Add 1-2 sets for ${group.muscleGroup} this week.`;
          }
          if (group.percentage > 120) {
            return `Consider trimming a set to aid recovery.`;
          }
          return `Solid balance—keep this pace.`;
        };

        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Volume Insights</Text>
            {volumeGroups.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
                <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                  Complete a few strength sessions to unlock volume recommendations.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.volumeSummaryRow}>
                  <View style={[
                    styles.volumeSummaryCard,
                    { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }
                  ]}>
                    <Text style={[styles.volumeSummaryCount, { color: BrandColors.accent }]}>{lowVolume.length}</Text>
                    <Text style={[styles.volumeSummaryLabel, { color: BrandColors.textSecondary }]}>Under Target</Text>
                  </View>
                  <View style={[
                    styles.volumeSummaryCard,
                    { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }
                  ]}>
                    <Text style={[styles.volumeSummaryCount, { color: BrandColors.text }]}>{balancedVolume.length}</Text>
                    <Text style={[styles.volumeSummaryLabel, { color: BrandColors.textSecondary }]}>On Track</Text>
                  </View>
                  <View style={[
                    styles.volumeSummaryCard,
                    { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }
                  ]}>
                    <Text style={[styles.volumeSummaryCount, { color: '#FF8C00' }]}>{highVolume.length}</Text>
                    <Text style={[styles.volumeSummaryLabel, { color: BrandColors.textSecondary }]}>High Volume</Text>
                  </View>
                </View>

                {focusGroups.length > 0 ? (
                  <View style={styles.volumeInsightList}>
                    {focusGroups.map((group, index) => (
                      <View
                        key={`focus-${index}`}
                        style={[
                          styles.volumeInsightCard,
                          { backgroundColor: BrandColors.background, borderColor: BrandColors.accent }
                        ]}
                      >
                        <View style={styles.volumeInsightHeader}>
                          <Text style={[styles.volumeInsightTitle, { color: BrandColors.text }]}>{group.muscleGroup}</Text>
                          <Text style={[styles.volumeInsightPercent, { color: BrandColors.accent }]}>
                            {group.percentage.toFixed(0)}%
                          </Text>
                        </View>
                        <Text style={[styles.volumeInsightBody, { color: BrandColors.textSecondary }]}>
                          {getVolumeSuggestion(group)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
                    <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                      All muscle groups are meeting targets—keep up the balance!
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        );
      })()}

      {!isFeatureUnlocked('advanced_insights') ? (
        <View style={[styles.lockedCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
          <Text style={[styles.lockedIcon, { color: BrandColors.textSecondary }]}>🔒</Text>
          <Text style={[styles.lockedTitle, { color: BrandColors.text }]}>Advanced Insights</Text>
          <Text style={[styles.lockedText, { color: BrandColors.textSecondary }]}>
            Unlock advanced analytics including weak-point analysis, fatigue monitoring, and recovery insights.
          </Text>
          <Text style={[styles.lockedCost, { color: BrandColors.accent }]}>Cost: 2,000 GP</Text>
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: BrandColors.accent }]}
            onPress={handleUnlockInsights}
          >
            <Text style={[styles.unlockButtonText, { color: '#000' }]}>Unlock with Points</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Weak Points</Text>
            {insightsData.weakPoints.filter(wp => wp.isWeakPoint).length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
                <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                  No weak points detected! All muscle groups are getting adequate volume.
                </Text>
              </View>
            ) : (
              insightsData.weakPoints
                .filter(wp => wp.isWeakPoint)
                .map((weakPoint, index) => (
                  <View key={`weak-point-${weakPoint.muscleGroup}-${index}`} style={[styles.weakPointCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.accent }]}>
                    <Text style={[styles.weakPointMuscleGroup, { color: BrandColors.text }]}>
                      {weakPoint.muscleGroup}
                    </Text>
                    <Text style={[styles.weakPointPercentage, { color: BrandColors.accent }]}>
                      {weakPoint.percentage.toFixed(0)}% of target
                    </Text>
                  </View>
                ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Fatigue Monitoring</Text>
            <View style={[styles.fatigueCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.fatigueStatus, { color: insightsData.fatigueWarning.hasSpike ? BrandColors.accent : BrandColors.text }]}>
                {insightsData.fatigueWarning.hasSpike ? '⚠️ Volume Spike Detected' : '✅ Volume Balanced'}
              </Text>
              <Text style={[styles.fatigueRecommendation, { color: BrandColors.textSecondary }]}>
                {insightsData.fatigueWarning.recommendation}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Recovery Hint</Text>
            <View style={[styles.recoveryCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.recoveryText, { color: BrandColors.text }]}>
                {insightsData.recoveryHint}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

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
            <Text style={[styles.sessionStats, { color: BrandColors.textSecondary }]}>
              {selectedWorkout?.exercises?.length || 0} exercises • {selectedWorkout?.exercises?.reduce((total: number, ex: any) => total + (ex?.sets?.length || 0), 0) || 0} sets
            </Text>
          </View>

          {selectedWorkout?.exercises?.map((exercise: any, index: number) => (
            <View key={`progress-exercise-${exercise?.id || index}-${selectedWorkout?.id}`} style={[styles.exerciseCard, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.textSecondary }]}>
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
                  {exercise?.sets?.map((set: any, index: number) => (
                    <View key={`set-${set?.id || index}-${exercise?.id}`} style={styles.setRow}>
                      <Text style={[styles.setNumber, { color: BrandColors.textSecondary }]}>
                        Set {index + 1}
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
            onPress={() => setShowAnalysisModal(false)}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Coming Soon</Text>
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
              onPress={() => Alert.alert('Coming Soon', 'Gallery upload feature coming soon!')}
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
                <Text style={[styles.cardioDetail, { color: BrandColors.textSecondary }]}>Cardio editing coming soon</Text>
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
      case 'prs': return renderPRsTab();
      case 'trends': return renderTrendsTab();
      case 'insights': return renderInsightsTab();
      default: return renderHistoryTab();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: BrandColors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderTabs()}
        {renderTabContent()}
      </ScrollView>
      
      {renderUnlockModal()}
      {renderSessionModal()}
      {renderAnalysisModal()}
      {renderVideoModal()}
      {renderEditModal()}
      {renderGuideModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  unlockButton: {
    // backgroundColor set dynamically
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
  sessionStats: {
    fontSize: 14,
    marginTop: 4,
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
});

