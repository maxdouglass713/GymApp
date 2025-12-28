/**
 * AI Progress Insights Service
 * 
 * Analyzes user progress data and generates personalized insights, recommendations, and goal adjustments
 */

import { functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { TrendData, InsightsData, ExerciseProgress, PersonalRecord } from '@/stores/progressStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Workout } from '@/stores/workoutStore';

export interface AIProgressInsight {
  type: 'trend' | 'alert' | 'action' | 'achievement';
  title: string;
  message: string;
  severity?: 'positive' | 'warning' | 'info';
  actionItems?: string[];
}

export interface AIGoalAnalysis {
  currentGoal: string;
  realisticTimeline: string;
  projectedCompletion: string;
  adjustments?: {
    type: 'timeline' | 'target' | 'approach';
    recommendation: string;
    reasoning: string;
  }[];
  prPredictions?: Array<{
    exercise: string;
    currentPR: number;
    projectedPR: number;
    timeframe: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

export async function generateProgressInsights(
  trendData: TrendData,
  insightsData: InsightsData,
  exerciseProgress: ExerciseProgress[],
  personalRecords: PersonalRecord[]
): Promise<AIProgressInsight[]> {
  const { canUseAI } = useSubscriptionStore.getState();
  
  if (!canUseAI('coachFeatures')) {
    throw new Error('AI progress insights not available for current tier.');
  }

  try {
    const generateInsights = httpsCallable(functions, 'generateProgressInsights');
    const result = await generateInsights({
      trendData,
      insightsData,
      exerciseProgress,
      personalRecords,
    });
    
    return result.data as AIProgressInsight[];
  } catch (error: any) {
    console.error('Error generating progress insights:', error);
    
    // Fallback: Generate mock insights based on data
    return generateMockInsights(trendData, insightsData, exerciseProgress, personalRecords);
  }
}

/**
 * Generate role-based progress insights for Elite tier users
 */
export async function generateProgressInsightsByRole(
  rolePerspective: 'personal' | 'trainer' | 'coach',
  trendData: TrendData,
  insightsData: InsightsData,
  exerciseProgress: ExerciseProgress[],
  personalRecords: PersonalRecord[],
  workoutHistory: Workout[]
): Promise<string> {
  const { tier } = useSubscriptionStore.getState();
  
  if (tier !== 'elite') {
    throw new Error('Role-based progress insights are only available for Elite tier users.');
  }

  try {
    const generateRoleInsights = httpsCallable(functions, 'generateProgressInsightsByRole');
    const result = await generateRoleInsights({
      rolePerspective,
      trendData,
      insightsData,
      exerciseProgress,
      personalRecords,
      workoutHistory,
    });
    
    return result.data as string;
  } catch (error: any) {
    console.error('Error generating role-based progress insights:', error);
    throw error;
  }
}

export async function analyzeGoals(
  userGoals: string[],
  currentProgress: {
    workouts: number;
    personalRecords: PersonalRecord[];
    trendData: TrendData;
    weightHistory?: Array<{ date: string; weight: number }>;
  }
): Promise<AIGoalAnalysis> {
  const { canUseAI } = useSubscriptionStore.getState();
  
  if (!canUseAI('coachFeatures')) {
    throw new Error('AI goal analysis not available for current tier.');
  }

  try {
    const analyzeGoalsCallable = httpsCallable(getFunctions(), 'analyzeGoals');
    const result = await analyzeGoalsCallable({
      userGoals,
      currentProgress,
    });
    
    return result.data as AIGoalAnalysis;
  } catch (error: any) {
    console.error('Error analyzing goals:', error);
    
    // Fallback: Generate mock goal analysis
    return generateMockGoalAnalysis(userGoals, currentProgress);
  }
}

// Mock fallback functions
function generateMockInsights(
  trendData: TrendData,
  insightsData: InsightsData,
  exerciseProgress: ExerciseProgress[],
  personalRecords: PersonalRecord[]
): AIProgressInsight[] {
  const insights: AIProgressInsight[] = [];

  // Trend explanations
  if (trendData.exerciseHighlights.length > 0) {
    const latestHighlight = trendData.exerciseHighlights[0];
    if (latestHighlight.direction === 'up') {
      insights.push({
        type: 'trend',
        title: `🎉 Great Progress on ${latestHighlight.exercise}!`,
        message: `You've gained ${Math.abs(latestHighlight.weightChange)} lbs on ${latestHighlight.exercise} this month! Your form focus is paying off.`,
        severity: 'positive',
      });
    } else {
      insights.push({
        type: 'trend',
        title: `📉 ${latestHighlight.exercise} Needs Attention`,
        message: `Your ${latestHighlight.exercise} decreased by ${Math.abs(latestHighlight.weightChange)} lbs. This could indicate fatigue or technique issues.`,
        severity: 'warning',
      });
    }
  }

  // Volume alerts
  if (insightsData.fatigueWarning.hasSpike) {
    insights.push({
      type: 'alert',
      title: '⚠️ Volume Spike Detected',
      message: `Your training volume increased by ${insightsData.fatigueWarning.increasePercentage.toFixed(0)}% this week compared to your 4-week average. Consider a deload week to prevent overtraining.`,
      severity: 'warning',
      actionItems: [
        'Reduce volume by 10-20% next week',
        'Add an extra rest day',
        'Focus on sleep and recovery',
      ],
    });
  }

  // Weak points / Action items
  const weakPoints = insightsData.weakPoints.filter(wp => wp.isWeakPoint);
  if (weakPoints.length > 0) {
    const topWeakPoint = weakPoints.sort((a, b) => a.percentage - b.percentage)[0];
    const daysNeeded = Math.ceil((100 - topWeakPoint.percentage) / 20); // Rough estimate
    
    insights.push({
      type: 'action',
      title: `💪 ${topWeakPoint.muscleGroup} Under-Trained`,
      message: `Your ${topWeakPoint.muscleGroup} volume is only ${topWeakPoint.percentage.toFixed(0)}% of target. Add 2 ${topWeakPoint.muscleGroup} training days this week to catch up.`,
      severity: 'info',
      actionItems: [
        `Add ${daysNeeded} dedicated ${topWeakPoint.muscleGroup} workout(s)`,
        'Focus on compound movements for efficiency',
        'Increase volume gradually to avoid overuse',
      ],
    });
  }

  // Achievements
  if (trendData.exerciseHighlights.filter(h => h.direction === 'up').length >= 3) {
    insights.push({
      type: 'achievement',
      title: '🏆 Multiple PRs This Month!',
      message: `You've hit improvements on ${trendData.exerciseHighlights.filter(h => h.direction === 'up').length} exercises this month. Your consistency is paying off!`,
      severity: 'positive',
    });
  }

  return insights;
}

function generateMockGoalAnalysis(
  userGoals: string[],
  currentProgress: {
    workouts: number;
    personalRecords: PersonalRecord[];
    trendData: TrendData;
    weightHistory?: Array<{ date: string; weight: number }>;
  }
): AIGoalAnalysis {
  const primaryGoal = userGoals[0] || 'improve_fitness';
  const workoutsPerWeek = currentProgress.trendData.workoutsPerWeek;
  
  // Estimate timeline based on goal and consistency
  let realisticTimeline = '12-16 weeks';
  let projectedCompletion = new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
  
  if (workoutsPerWeek >= 4) {
    realisticTimeline = '8-12 weeks';
    projectedCompletion = new Date(Date.now() + 10 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
  } else if (workoutsPerWeek < 2) {
    realisticTimeline = '16-20 weeks';
    projectedCompletion = new Date(Date.now() + 18 * 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
  }

  // PR predictions
  const prPredictions = currentProgress.personalRecords.slice(0, 3).map(pr => {
    const progressionRate = 0.02; // 2% per week
    const weeks = 6;
    const projected1RM = Math.round(pr.estimated1RM * (1 + progressionRate * weeks));
    
    return {
      exercise: pr.exercise,
      currentPR: pr.estimated1RM,
      projectedPR: projected1RM,
      timeframe: `${weeks} weeks`,
      confidence: workoutsPerWeek >= 3 ? 'high' : workoutsPerWeek >= 2 ? 'medium' : 'low',
    };
  });

  return {
    currentGoal: primaryGoal,
    realisticTimeline,
    projectedCompletion,
    adjustments: [
      {
        type: 'approach',
        recommendation: workoutsPerWeek < 3 
          ? 'Increase training frequency to 3-4 days per week for faster progress'
          : 'Your training frequency is solid. Focus on progressive overload.',
        reasoning: `Based on your current ${workoutsPerWeek.toFixed(1)} workouts per week, ${workoutsPerWeek < 3 ? 'increasing frequency' : 'maintaining consistency'} will help you reach your goal.`,
      },
    ],
    prPredictions,
  };
}


