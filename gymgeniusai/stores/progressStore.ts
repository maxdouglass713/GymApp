import { create } from 'zustand';
import { Workout } from './workoutStore';

// Progress data interfaces
export interface PersonalRecord {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
  workoutId: string;
}

export interface ConsistencyScore {
  score: number; // 0-100
  tip: string;
  planAdherence: number; // 0-1
  streakFactor: number; // 0-1
  sessionQuality: number; // 0-1
}

export interface VolumeData {
  muscleGroup: string;
  volume: number; // total weight × reps × sets
  targetVolume: number;
  percentage: number;
}

export interface ExerciseTrendSession {
  workoutId: string;
  workoutTitle: string;
  date: string;
  topWeight: number | null;
  topReps: number | null;
  totalVolume: number;
  setCount: number;
}

export interface ExerciseTrendHighlight {
  id: string;
  exercise: string;
  changeType: 'weight' | 'reps';
  direction: 'up' | 'down';
  weightChange: number;
  repsChange: number;
  current: ExerciseTrendSession;
  previous: ExerciseTrendSession;
}

export interface ExerciseProgress {
  exercise: string;
  sessions: ExerciseTrendSession[];
}

export interface TrendWorkoutExerciseSummary {
  name: string;
  totalVolume: number;
  topWeight: number | null;
  topReps: number | null;
  setCount: number;
}

export interface TrendWorkoutSummary {
  id: string;
  title: string;
  date: string;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
  topExercises: TrendWorkoutExerciseSummary[];
}

export interface TrendData {
  period: '4W' | '12W' | '52W';
  workoutsPerWeek: number;
  volumeByMuscleGroup: VolumeData[];
  bodyweightTrend: { date: string; weight: number }[];
  proteinAdherence: number; // percentage of days meeting target
  exerciseHighlights: ExerciseTrendHighlight[];
  exerciseProgress: ExerciseProgress[];
  workoutSummaries: TrendWorkoutSummary[];
}

export interface WeakPointData {
  muscleGroup: string;
  volume: number;
  targetVolume: number;
  percentage: number;
  isWeakPoint: boolean; // <80% of target
}

export interface FatigueWarning {
  hasSpike: boolean;
  currentWeekVolume: number;
  fourWeekAverage: number;
  increasePercentage: number;
  recommendation: string;
}

export interface AdherenceData {
  weekday: string;
  adherence: number; // 0-1
  workouts: number;
}

export interface InsightsData {
  weakPoints: WeakPointData[];
  fatigueWarning: FatigueWarning;
  adherenceByWeekday: AdherenceData[];
  recoveryHint: string;
}

export interface ProgressStore {
  // Data
  personalRecords: PersonalRecord[];
  consistencyScore: ConsistencyScore;
  trendData: TrendData;
  insightsData: InsightsData;
  bodyweights: { date: string; weight: number }[];
  
  // UI State
  selectedTab: 'history' | 'prs' | 'trends' | 'insights';
  selectedMonth: Date;
  selectedTrendPeriod: '4W' | '12W' | '52W';
  selectedPRFilter: string;
  
  // Actions
  setSelectedTab: (tab: 'history' | 'prs' | 'trends' | 'insights') => void;
  setSelectedMonth: (month: Date) => void;
  setSelectedTrendPeriod: (period: '4W' | '12W' | '52W') => void;
  setSelectedPRFilter: (filter: string) => void;
  
  // Calculations
  calculateConsistencyScore: (workouts: Workout[]) => ConsistencyScore;
  calculatePersonalRecords: (workouts: Workout[]) => PersonalRecord[];
  calculateTrendData: (workouts: Workout[], period: '4W' | '12W' | '52W') => TrendData;
  calculateInsightsData: (workouts: Workout[]) => InsightsData;
  
  // Utility functions
  getEstimated1RM: (weight: number, reps: number) => number;
  getMuscleGroups: (exercise: string) => string[];
  calculateVolume: (sets: any[]) => number;
  getStreakData: (workouts: Workout[]) => { current: number; longest: number };
}

// Exercise to muscle group mapping
const EXERCISE_MUSCLE_MAP: Record<string, string[]> = {
  'Squat': ['Quads', 'Glutes'],
  'Bench Press': ['Chest', 'Triceps'],
  'Deadlift': ['Back', 'Glutes', 'Hamstrings'],
  'Lat Pulldown': ['Back'],
  'Shoulder Press': ['Shoulders'],
  'Romanian Deadlift': ['Hamstrings', 'Glutes'],
  'Barbell Row': ['Back'],
  'Bicep Curl': ['Biceps'],
  'Triceps Pushdown': ['Triceps'],
  'Leg Press': ['Quads', 'Glutes'],
  'Leg Curl': ['Hamstrings'],
  'Calf Raise': ['Calves'],
  'Overhead Press': ['Shoulders'],
  'Incline Press': ['Chest'],
  'Pull-ups': ['Back'],
  'Dips': ['Chest', 'Triceps'],
  'Lunges': ['Quads', 'Glutes'],
  'Bulgarian Split Squats': ['Quads', 'Glutes'],
  'Face Pulls': ['Shoulders'],
  'Hammer Curls': ['Biceps'],
  'Skull Crushers': ['Triceps'],
  'Lateral Raises': ['Shoulders'],
  'Rear Delt Flyes': ['Shoulders'],
  'Chest Flyes': ['Chest'],
  'Leg Extensions': ['Quads'],
  'Hip Thrusts': ['Glutes'],
  'Planks': ['Core'],
  'Russian Twists': ['Core'],
};

// Target volumes per muscle group (weekly)
const TARGET_VOLUMES: Record<string, number> = {
  'Chest': 8000,
  'Back': 10000,
  'Quads': 8000,
  'Hamstrings': 6000,
  'Glutes': 6000,
  'Shoulders': 4000,
  'Biceps': 2000,
  'Triceps': 3000,
  'Calves': 2000,
  'Core': 1000,
};

export const useProgressStore = create<ProgressStore>((set, get) => ({
  // Initial state
  personalRecords: [],
  consistencyScore: { score: 0, tip: 'Start logging workouts to see your consistency score!', planAdherence: 0, streakFactor: 0, sessionQuality: 0 },
  trendData: {
    period: '4W',
    workoutsPerWeek: 0,
    volumeByMuscleGroup: [],
    bodyweightTrend: [],
    proteinAdherence: 0,
    exerciseHighlights: [],
    exerciseProgress: [],
    workoutSummaries: [],
  },
  insightsData: {
    weakPoints: [],
    fatigueWarning: { hasSpike: false, currentWeekVolume: 0, fourWeekAverage: 0, increasePercentage: 0, recommendation: '' },
    adherenceByWeekday: [],
    recoveryHint: '',
  },
  bodyweights: [],
  
  selectedTab: 'history',
  selectedMonth: new Date(),
  selectedTrendPeriod: '4W',
  selectedPRFilter: 'All',
  
  setSelectedTab: (tab) => set({ selectedTab: tab }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedTrendPeriod: (period) => set({ selectedTrendPeriod: period }),
  setSelectedPRFilter: (filter) => set({ selectedPRFilter: filter }),
  
  calculateConsistencyScore: (workouts) => {
    if (workouts.length === 0) {
      return { score: 0, tip: 'Start logging workouts to see your consistency score!', planAdherence: 0, streakFactor: 0, sessionQuality: 0 };
    }
    
    // Plan adherence (60% weight) - assume 4 workouts per week target
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const recentWorkouts = workouts.filter(w => new Date(w.date) >= fourWeeksAgo);
    const plannedWorkouts = 16; // 4 weeks × 4 workouts
    const planAdherence = Math.min(recentWorkouts.length / plannedWorkouts, 1);
    
    // Streak factor (20% weight) - current streak up to 14 days max
    const streakData = get().getStreakData(workouts);
    const streakFactor = Math.min(streakData.current / 14, 1);
    
    // Session quality (20% weight) - assume all completed workouts are quality
    const completedWorkouts = workouts.filter(w => w.completedAt);
    const sessionQuality = completedWorkouts.length / Math.max(workouts.length, 1);
    
    const score = Math.round(100 * (0.6 * planAdherence + 0.2 * streakFactor + 0.2 * sessionQuality));
    
    let tip = '';
    if (planAdherence >= 0.8) {
      tip = `${Math.round(planAdherence * 100)}% plan adherence. Excellent consistency!`;
    } else if (planAdherence >= 0.6) {
      tip = `${Math.round(planAdherence * 100)}% plan adherence. Keep it up!`;
    } else if (streakData.current >= 7) {
      tip = `${streakData.current} day streak. Great momentum!`;
    } else {
      tip = `${recentWorkouts.length}/${plannedWorkouts} planned days completed. Keep building!`;
    }
    
    return { score, tip, planAdherence, streakFactor, sessionQuality };
  },
  
  calculatePersonalRecords: (workouts) => {
    const prs: PersonalRecord[] = [];
    const exercisePRs: Record<string, PersonalRecord> = {};
    
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (set.weight && set.reps && set.reps > 0) {
            const estimated1RM = get().getEstimated1RM(set.weight, set.reps);
            const currentPR = exercisePRs[exercise.name];
            
            if (!currentPR || estimated1RM > currentPR.estimated1RM) {
              exercisePRs[exercise.name] = {
                id: `${exercise.name}-${workout.id}-${set.id}`,
                exercise: exercise.name,
                weight: set.weight,
                reps: set.reps,
                estimated1RM,
                date: workout.date,
                workoutId: workout.id,
              };
            }
          }
        });
      });
    });
    
    return Object.values(exercisePRs);
  },
  
  calculateTrendData: (workouts, period) => {
    const now = new Date();
    let daysBack: number;
    
    switch (period) {
      case '4W': daysBack = 28; break;
      case '12W': daysBack = 84; break;
      case '52W': daysBack = 365; break;
    }
    
    const periodStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const periodWorkouts = workouts
      .filter(w => new Date(w.date) >= periodStart)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Workouts per week
    const weeks = Math.max(daysBack / 7, 1);
    const workoutsPerWeek = periodWorkouts.length / weeks;
    
    // Volume by muscle group
    const muscleGroupVolumes: Record<string, number> = {};
    const exerciseSessionsMap: Record<string, ExerciseTrendSession[]> = {};
    const workoutSummaries: TrendWorkoutSummary[] = [];
    
    periodWorkouts.forEach(workout => {
      let workoutVolume = 0;
      let workoutSetCount = 0;
      const workoutExerciseSummaries: TrendWorkoutExerciseSummary[] = [];
      
      workout.exercises.forEach(exercise => {
        const muscleGroups = get().getMuscleGroups(exercise.name);
        const volume = get().calculateVolume(exercise.sets);
        workoutVolume += volume;
        workoutSetCount += exercise.sets.length;
        
        muscleGroups.forEach(muscleGroup => {
          muscleGroupVolumes[muscleGroup] = (muscleGroupVolumes[muscleGroup] || 0) + volume;
        });
        
        if (exercise.type === 'cardio') {
          return;
        }
        
        const validSets = exercise.sets.filter(set => (set.weight ?? 0) > 0 && (set.reps ?? 0) > 0);
        if (validSets.length === 0) {
          return;
        }
        
        const topSet = validSets.reduce((best, current) => {
          if (!best) return current;
          const bestScore = (best.weight ?? 0) * (best.reps ?? 0);
          const currentScore = (current.weight ?? 0) * (current.reps ?? 0);
          if (currentScore > bestScore) {
            return current;
          }
          if (currentScore === bestScore) {
            return (current.weight ?? 0) > (best.weight ?? 0) ? current : best;
          }
          return best;
        }, validSets[0]);
        
        const session: ExerciseTrendSession = {
          workoutId: workout.id,
          workoutTitle: workout.title,
          date: workout.date,
          topWeight: topSet?.weight ?? null,
          topReps: topSet?.reps ?? null,
          totalVolume: validSets.reduce((total, set) => {
            const reps = set.reps ?? 0;
            const weight = set.weight ?? 0;
            return total + reps * weight;
          }, 0),
          setCount: validSets.length,
        };
        
        exerciseSessionsMap[exercise.name] = [
          ...(exerciseSessionsMap[exercise.name] || []),
          session,
        ];
        
        workoutExerciseSummaries.push({
          name: exercise.name,
          totalVolume: session.totalVolume,
          topWeight: session.topWeight,
          topReps: session.topReps,
          setCount: validSets.length,
        });
      });
      
      workoutExerciseSummaries.sort((a, b) => b.totalVolume - a.totalVolume);
      
      workoutSummaries.push({
        id: workout.id,
        title: workout.title,
        date: workout.date,
        exerciseCount: workout.exercises.length,
        setCount: workoutSetCount,
        totalVolume: workoutVolume,
        topExercises: workoutExerciseSummaries.slice(0, 3),
      });
    });
    
    const volumeByMuscleGroup: VolumeData[] = Object.entries(muscleGroupVolumes).map(([muscleGroup, volume]) => ({
      muscleGroup,
      volume,
      targetVolume: TARGET_VOLUMES[muscleGroup] || 0,
      percentage: TARGET_VOLUMES[muscleGroup] ? (volume / TARGET_VOLUMES[muscleGroup]) * 100 : 0,
    }));
    
    const exerciseProgress: ExerciseProgress[] = Object.entries(exerciseSessionsMap).map(([exercise, sessions]) => ({
      exercise,
      sessions: sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }));
    
    exerciseProgress.sort((a, b) => {
      const aLatest = a.sessions[a.sessions.length - 1]?.date ?? '';
      const bLatest = b.sessions[b.sessions.length - 1]?.date ?? '';
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });
    
    const exerciseHighlights: ExerciseTrendHighlight[] = [];
    exerciseProgress.forEach(progress => {
      if (progress.sessions.length < 2) return;
      const current = progress.sessions[progress.sessions.length - 1];
      const previous = progress.sessions[progress.sessions.length - 2];
      
      const weightChange = (current.topWeight ?? 0) - (previous.topWeight ?? 0);
      const repsChange = (current.topReps ?? 0) - (previous.topReps ?? 0);
      const absWeightChange = Math.abs(weightChange);
      const absRepsChange = Math.abs(repsChange);
      
      const baseWeight = Math.max(current.topWeight ?? 0, previous.topWeight ?? 0);
      const weightThreshold = baseWeight >= 60 ? 5 : baseWeight >= 30 ? 2.5 : 1;
      
      let changeType: 'weight' | 'reps' | null = null;
      let direction: 'up' | 'down' = 'up';
      
      if (absWeightChange >= weightThreshold) {
        changeType = 'weight';
        direction = weightChange >= 0 ? 'up' : 'down';
      } else if (absRepsChange >= 1) {
        changeType = 'reps';
        direction = repsChange >= 0 ? 'up' : 'down';
      }
      
      if (!changeType) {
        return;
      }
      
      exerciseHighlights.push({
        id: `${progress.exercise}-${current.workoutId}-${previous.workoutId}`,
        exercise: progress.exercise,
        changeType,
        direction,
        weightChange,
        repsChange,
        current,
        previous,
      });
    });
    
    exerciseHighlights.sort((a, b) => {
      const score = (highlight: ExerciseTrendHighlight) => {
        switch (highlight.changeType) {
          case 'weight': return Math.abs(highlight.weightChange);
          case 'reps': return Math.abs(highlight.repsChange);
          default: return 0;
        }
      };
      
      const directionPriority = (highlight: ExerciseTrendHighlight) => highlight.direction === 'up' ? 0 : 1;
      
      const dirDiff = directionPriority(a) - directionPriority(b);
      if (dirDiff !== 0) return dirDiff;
      
      return score(b) - score(a);
    });
    
    return {
      period,
      workoutsPerWeek,
      volumeByMuscleGroup,
      bodyweightTrend: [], // Will be populated when bodyweight tracking is added
      proteinAdherence: 0, // Will be populated when nutrition data is available
      exerciseHighlights: exerciseHighlights.slice(0, 8),
      exerciseProgress,
      workoutSummaries: workoutSummaries
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  },
  
  calculateInsightsData: (workouts) => {
    const trendData = get().calculateTrendData(workouts, '4W');
    
    // Weak points analysis
    const weakPoints: WeakPointData[] = trendData.volumeByMuscleGroup.map(v => ({
      muscleGroup: v.muscleGroup,
      volume: v.volume,
      targetVolume: v.targetVolume,
      percentage: v.percentage,
      isWeakPoint: v.percentage < 80,
    }));
    
    // Fatigue warning
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    
    const currentWeekWorkouts = workouts.filter(w => new Date(w.date) >= oneWeekAgo);
    const fourWeekWorkouts = workouts.filter(w => new Date(w.date) >= fourWeeksAgo);
    
    const currentWeekVolume = currentWeekWorkouts.reduce((total, workout) => {
      return total + workout.exercises.reduce((exTotal, exercise) => {
        return exTotal + get().calculateVolume(exercise.sets);
      }, 0);
    }, 0);
    
    const fourWeekAverage = fourWeekWorkouts.reduce((total, workout) => {
      return total + workout.exercises.reduce((exTotal, exercise) => {
        return exTotal + get().calculateVolume(exercise.sets);
      }, 0);
    }, 0) / 4;
    
    const increasePercentage = fourWeekAverage > 0 ? ((currentWeekVolume - fourWeekAverage) / fourWeekAverage) * 100 : 0;
    const hasSpike = increasePercentage > 25;
    
    const fatigueWarning: FatigueWarning = {
      hasSpike,
      currentWeekVolume,
      fourWeekAverage,
      increasePercentage,
      recommendation: hasSpike ? 'Consider deloading or reducing volume by 10% next week.' : 'Volume progression looks good.',
    };
    
    // Adherence by weekday
    const weekdayData: Record<string, { workouts: number; total: number }> = {};
    workouts.forEach(workout => {
      const weekday = new Date(workout.date).toLocaleDateString('en-US', { weekday: 'long' });
      weekdayData[weekday] = weekdayData[weekday] || { workouts: 0, total: 0 };
      weekdayData[weekday].workouts++;
      weekdayData[weekday].total++;
    });
    
    const adherenceByWeekday: AdherenceData[] = Object.entries(weekdayData).map(([weekday, data]) => ({
      weekday,
      adherence: data.total > 0 ? data.workouts / data.total : 0,
      workouts: data.workouts,
    }));
    
    const recoveryHint = hasSpike ? 'High volume week detected. Consider lighter training or active recovery.' : 'Recovery looks balanced.';
    
    return {
      weakPoints,
      fatigueWarning,
      adherenceByWeekday,
      recoveryHint,
    };
  },
  
  getEstimated1RM: (weight, reps) => {
    // Epley formula: 1RM = weight * (1 + reps/30)
    return Math.round(weight * (1 + reps / 30));
  },
  
  getMuscleGroups: (exercise) => {
    if (!exercise) {
      return ['Other'];
    }

    const normalized = exercise.trim().toLowerCase();

    const directMatch = Object.entries(EXERCISE_MUSCLE_MAP).find(
      ([key]) => key.toLowerCase() === normalized
    );
    if (directMatch) {
      return directMatch[1];
    }

    const keywordMap: Array<{ keywords: string[]; muscleGroups: string[] }> = [
      { keywords: ['squat', 'lunge', 'split squat', 'step-up'], muscleGroups: ['Quads', 'Glutes'] },
      { keywords: ['leg press', 'leg extension'], muscleGroups: ['Quads'] },
      { keywords: ['leg curl', 'hamstring curl', 'romanian'], muscleGroups: ['Hamstrings'] },
      { keywords: ['deadlift', 'rdl', 'good morning'], muscleGroups: ['Back', 'Glutes', 'Hamstrings'] },
      { keywords: ['calf'], muscleGroups: ['Calves'] },
      { keywords: ['bench', 'press', 'push-up', 'dip', 'fly'], muscleGroups: ['Chest', 'Triceps'] },
      { keywords: ['row', 'pull', 'lat'], muscleGroups: ['Back'] },
      { keywords: ['shoulder', 'overhead', 'lateral', 'rear delt'], muscleGroups: ['Shoulders'] },
      { keywords: ['bicep', 'curl', 'hammer'], muscleGroups: ['Biceps'] },
      { keywords: ['tricep', 'extension', 'skull crusher', 'pushdown'], muscleGroups: ['Triceps'] },
      { keywords: ['core', 'ab', 'plank', 'sit-up', 'crunch', 'twist'], muscleGroups: ['Core'] },
      { keywords: ['hip thrust', 'glute bridge'], muscleGroups: ['Glutes'] },
    ];

    const keywordMatch = keywordMap.find(({ keywords }) =>
      keywords.some((keyword) => normalized.includes(keyword))
    );

    if (keywordMatch) {
      return keywordMatch.muscleGroups;
    }

    return ['Other'];
  },
  
  calculateVolume: (sets) => {
    return sets.reduce((total, set) => {
      if (set.weight && set.reps) {
        return total + (set.weight * set.reps);
      }
      return total;
    }, 0);
  },
  
  getStreakData: (workouts) => {
    if (workouts.length === 0) return { current: 0, longest: 0 };
    
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const workoutDates = new Set(sortedWorkouts.map(w => w.date));
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    const checkDate = new Date(today);
    
    // Calculate current streak
    while (workoutDates.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    // Calculate longest streak
    const allDates = Array.from(workoutDates).sort();
    for (let i = 0; i < allDates.length; i++) {
      const currentDate = new Date(allDates[i]);
      const nextDate = i < allDates.length - 1 ? new Date(allDates[i + 1]) : null;
      
      if (nextDate && (currentDate.getTime() - nextDate.getTime()) === 24 * 60 * 60 * 1000) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak + 1);
        tempStreak = 0;
      }
    }
    
    return { current: currentStreak, longest: longestStreak };
  },
}));
