/**
 * Coach AI Service
 * 
 * Provides AI-powered features for coaches and trainers
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Generate team workout plans for all players
 */
export async function generateTeamWorkoutPlans(
  teamId: string,
  players: Array<{
    id: string;
    name: string;
    goal: string;
    experience: string;
    equipment?: string;
  }>,
  schedule: {
    gameDays?: string[];
    practiceDays?: string[];
    restDays?: string[];
  }
): Promise<{ text: string; players: any[]; schedule: any }> {
  try {
    console.log('🤖 Generating team workout plans via Firebase Functions...', {
      teamId,
      playerCount: players.length,
    });

    const generateTeamWorkoutPlans = httpsCallable(getFunctions(), 'generateTeamWorkoutPlans');
    const result = await generateTeamWorkoutPlans({ teamId, players, schedule });

    return result.data as { text: string; players: any[]; schedule: any };
  } catch (error: any) {
    console.error('❌ Error generating team workout plans:', error);
    throw error;
  }
}

/**
 * Generate player progress summary
 */
export async function generatePlayerSummary(
  playerId: string,
  timeRange: 'week' | 'month' | 'quarter' = 'month'
): Promise<{ text: string; playerId: string; timeRange: string }> {
  try {
    console.log('🤖 Generating player summary via Firebase Functions...', {
      playerId,
      timeRange,
    });

    const generatePlayerSummary = httpsCallable(getFunctions(), 'generatePlayerSummary');
    const result = await generatePlayerSummary({ playerId, timeRange });

    return result.data as { text: string; playerId: string; timeRange: string };
  } catch (error: any) {
    console.error('❌ Error generating player summary:', error);
    throw error;
  }
}

/**
 * Generate workout tips during workout
 */
export async function generateWorkoutTip(
  exercise: string,
  currentSet: number,
  totalSets: number,
  formNotes?: string,
  progress?: string
): Promise<{ tip: string }> {
  try {
    console.log('🤖 Generating workout tip via Firebase Functions...', {
      exercise,
      currentSet,
      totalSets,
    });

    const generateWorkoutTips = httpsCallable(getFunctions(), 'generateWorkoutTips');
    const result = await generateWorkoutTips({
      exercise,
      currentSet,
      totalSets,
      formNotes,
      progress,
    });

    return result.data as { tip: string };
  } catch (error: any) {
    console.error('❌ Error generating workout tip:', error);
    // Don't throw - tips are optional
    return { tip: '' };
  }
}

