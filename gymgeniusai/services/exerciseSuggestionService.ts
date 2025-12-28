import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import type { WorkoutExercise } from '@/stores/workoutStore';
import { EXERCISE_DATABASE } from '@/utils/workout/exerciseDatabase';

type WorkoutType = 'strength' | 'cardio';

export interface ExerciseSuggestion {
  exercise: string;
  muscleGroup?: string;
  sets?: number;
  reps?: string;
  equipment?: string;
  rationale?: string;
  cues?: string[];
}

interface SerializedExercise {
  name: string;
  muscleGroup: string;
  type?: string;
  sets: number;
  completedSets: number;
  avgReps?: number;
  avgWeight?: number;
  totalVolume?: number;
  equipment?: string[] | string;
}

export interface WorkoutSummary {
  lastExercise?: string;
  totalExercises: number;
  totalStrengthExercises: number;
  completedSets: number;
  muscleBreakdown: Record<string, { sets: number; volume: number }>;
  missingMuscles: string[];
  leastWorkedMuscle?: string;
  mostWorkedMuscle?: string;
}

export interface WorkoutSuggestionContext {
  serializedExercises: SerializedExercise[];
  summary: WorkoutSummary;
}

const DEFAULT_MUSCLE_SEQUENCE = ['Legs', 'Back', 'Chest', 'Shoulders', 'Arms', 'Core', 'Full Body'];

const MUSCLE_GROUP_LIBRARY = Object.entries(EXERCISE_DATABASE).reduce<Record<string, string[]>>(
  (acc, [name, data]) => {
    const group = data.muscleGroup || 'Full Body';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(name);
    return acc;
  },
  {}
);

const CUES_BY_GROUP: Record<string, string[]> = {
  Legs: ['Drive through your heels', 'Brace your core before each rep', 'Control the eccentric phase'],
  Back: ['Lead with your elbows, not your hands', 'Keep your spine neutral', 'Squeeze your lats at the top'],
  Chest: ['Pinch your shoulder blades together', 'Lower slowly for 2 seconds', 'Keep wrists stacked over elbows'],
  Shoulders: ['Keep tension off your traps', 'Soft bend at the elbow', 'Control the weight on the way down'],
  Arms: ['Keep elbows tucked to your sides', 'Avoid swinging the weight', 'Squeeze hard at the peak'],
  Core: ['Keep ribs pulled down', 'Move slowly and stay controlled', 'Breathe through the brace'],
  'Full Body': ['Move intentionally–quality over speed', 'Stay balanced through your mid-foot'],
};

export function buildWorkoutSuggestionContext(exercises: WorkoutExercise[]): WorkoutSuggestionContext {
  const serializedExercises: SerializedExercise[] = [];
  const breakdown: WorkoutSummary['muscleBreakdown'] = {};
  let completedSets = 0;
  let totalStrengthExercises = 0;

  const normalizedExercises = exercises || [];

  normalizedExercises.forEach((exercise) => {
    const normalizedName = stripEquipmentName(exercise.name);
    // Use the stored muscle group from the exercise (set when exercise was added)
    // If not stored, fall back to database lookup
    let muscleGroup = exercise.muscleGroup;
    if (!muscleGroup) {
      const dbEntry = EXERCISE_DATABASE[normalizedName as keyof typeof EXERCISE_DATABASE];
      muscleGroup = dbEntry?.muscleGroup || determineMuscleGroup(normalizedName);
    }
    const sets = exercise.sets?.length || 0;
    const filledSets = exercise.sets?.filter((set) => set.reps !== null && set.reps !== undefined).length || 0;
    const totalReps = exercise.sets?.reduce((sum, set) => (typeof set.reps === 'number' ? sum + set.reps : sum), 0) || 0;
    const totalWeight = exercise.sets?.reduce(
      (sum, set) => (typeof set.weight === 'number' ? sum + set.weight : sum),
      0
    ) || 0;
    const avgReps = filledSets > 0 ? Math.round(totalReps / filledSets) : undefined;
    const avgWeight = filledSets > 0 ? Math.round(totalWeight / filledSets) : undefined;
    const totalVolume =
      exercise.sets?.reduce((sum, set) => {
        if (typeof set.reps === 'number' && typeof set.weight === 'number') {
          return sum + set.reps * set.weight;
        }
        return sum;
      }, 0) || 0;

    if (exercise.type !== 'cardio') {
      totalStrengthExercises += 1;
      breakdown[muscleGroup] = breakdown[muscleGroup] || { sets: 0, volume: 0 };
      breakdown[muscleGroup].sets += filledSets || sets;
      breakdown[muscleGroup].volume += totalVolume;
      completedSets += filledSets;
    }

    serializedExercises.push({
      name: normalizedName,
      muscleGroup,
      type: exercise.type,
      sets,
      completedSets: filledSets,
      avgReps,
      avgWeight,
      totalVolume,
      equipment: exercise.equipment,
    });
  });

  const missingMuscles = DEFAULT_MUSCLE_SEQUENCE.filter(
    (group) => (breakdown[group]?.sets || 0) === 0
  );

  const sortedMuscles = Object.entries(breakdown).sort((a, b) => a[1].sets - b[1].sets);
  const leastWorkedMuscle = sortedMuscles[0]?.[0];
  const mostWorkedMuscle = sortedMuscles[sortedMuscles.length - 1]?.[0];

  const summary: WorkoutSummary = {
    lastExercise: serializedExercises.slice(-1)[0]?.name,
    totalExercises: normalizedExercises.length,
    totalStrengthExercises,
    completedSets,
    muscleBreakdown: breakdown,
    missingMuscles,
    leastWorkedMuscle,
    mostWorkedMuscle,
  };

  return {
    serializedExercises,
    summary,
  };
}

export async function requestAISuggestion(
  workoutType: WorkoutType,
  context: WorkoutSuggestionContext
): Promise<ExerciseSuggestion> {
  const { canUseAI, tier } = useSubscriptionStore.getState();
  if (!canUseAI('workoutPlan')) {
    const errorMessage =
      tier === 'free'
        ? 'Upgrade to unlock AI exercise suggestions.'
        : tier === 'basic'
        ? 'Insufficient Volts for AI exercise suggestions.'
        : 'Monthly AI workout limit reached.';
    throw new Error(errorMessage);
  }

  // Check we have exercises to analyze
  const lastExercise = context.serializedExercises[context.serializedExercises.length - 1];
  if (!lastExercise) {
    throw new Error('No exercises to base suggestion on.');
  }
  
  // Analyze workout pattern to log what's being sent
  const muscleGroupPattern: Record<string, number> = {};
  context.serializedExercises.forEach(ex => {
    const group = ex.muscleGroup || 'Unknown';
    if (group !== 'Unknown') {
      muscleGroupPattern[group] = (muscleGroupPattern[group] || 0) + 1;
    }
  });
  
  const dominantGroup = Object.entries(muscleGroupPattern)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  console.log(`🎯 AI SUGGESTION REQUEST:`);
  console.log(`   Total exercises: ${context.serializedExercises.length}`);
  console.log(`   Exercise pattern:`, muscleGroupPattern);
  console.log(`   Dominant group: ${dominantGroup || 'None'}`);
  console.log(`   Last exercise: "${lastExercise.name}" (${lastExercise.muscleGroup})`);
  
  // The backend will analyze the pattern and determine the target group
  // We'll use whatever the backend suggests

  const callable = httpsCallable(getFunctions(), 'suggestNextExercise');
  const payload = {
    workoutType,
    exercises: context.serializedExercises,
    summary: context.summary,
  };

  try {
    const result = await callable(payload);
    const suggestion = (result.data as any)?.suggestion as ExerciseSuggestion | undefined;
    const debug = (result.data as any)?.debug;
    
    // Log the prompt and debug info in client console for easy viewing
    if (debug) {
      console.log('=== AI SUGGESTION PROMPT (Client View) ===');
      console.log('Target Muscle Group:', debug.targetMuscleGroup);
      console.log('Valid Exercises:', debug.validExercises);
      console.log('Full Prompt Sent to AI:');
      console.log(debug.prompt);
      console.log('=== END PROMPT ===');
    }
    
      // Use the muscle group determined by the backend (based on workout pattern)
      if (suggestion?.exercise) {
        // The backend has already determined the correct muscle group based on the workout pattern
        // Use what it returned
        console.log(`✅ Backend suggested: "${suggestion.exercise}" for ${suggestion.muscleGroup}`);
        return suggestion;
      }
  } catch (error) {
    console.error('AI suggestion failed:', error);
  }

  throw new Error('AI did not return a valid exercise suggestion.');
}

export function buildFallbackSuggestion(
  workoutType: WorkoutType,
  context: WorkoutSuggestionContext
): ExerciseSuggestion {
  if (workoutType === 'cardio') {
    return {
      exercise: 'Rowing Machine Intervals',
      muscleGroup: 'Full Body',
      sets: 5,
      reps: '1:00 on / 1:00 off',
      rationale: 'Add intensity intervals to keep heart rate elevated and finish strong.',
      cues: ['Drive with legs first', 'Keep strokes smooth and powerful'],
    };
  }

  const { serializedExercises } = context;
  
  if (!serializedExercises || serializedExercises.length === 0) {
    return {
      exercise: 'Face Pulls',
      muscleGroup: 'Shoulders',
      sets: 3,
      reps: '12-15',
      rationale: 'Start your workout with this exercise.',
      cues: ['Pull to your face', 'Squeeze shoulder blades'],
    };
  }
  
  // Analyze workout pattern - find dominant muscle group from ALL exercises
  const muscleGroupPattern: Record<string, { count: number; totalSets: number }> = {};
  serializedExercises.forEach(ex => {
    const group = ex.muscleGroup || 'Unknown';
    if (group !== 'Unknown') {
      if (!muscleGroupPattern[group]) {
        muscleGroupPattern[group] = { count: 0, totalSets: 0 };
      }
      muscleGroupPattern[group].count++;
      muscleGroupPattern[group].totalSets += (ex.completedSets || ex.sets || 0);
    }
  });
  
  // Find dominant muscle group (most exercises, then most sets)
  const sortedGroups = Object.entries(muscleGroupPattern)
    .sort((a, b) => {
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count;
      }
      return b[1].totalSets - a[1].totalSets;
    });
  
  const dominantGroup = sortedGroups[0]?.[0];
  const dominantGroupData = dominantGroup ? muscleGroupPattern[dominantGroup] : null;
  const lastExercise = serializedExercises[serializedExercises.length - 1];
  const lastExerciseGroup = lastExercise?.muscleGroup || 'Legs';
  
  // Determine target group: Use dominant group if it has 2+ exercises, otherwise use last exercise's group
  let targetMuscleGroup: string;
  if (dominantGroup && dominantGroupData && dominantGroupData.count >= 2) {
    // Clear pattern - use dominant group
    targetMuscleGroup = dominantGroup;
  } else if (dominantGroup && lastExerciseGroup === dominantGroup) {
    // Last exercise matches dominant, use it
    targetMuscleGroup = dominantGroup;
  } else {
    // No clear pattern yet, use last exercise
    targetMuscleGroup = lastExerciseGroup;
  }
  
  // Calculate volume for the target group
  const targetGroupData = muscleGroupPattern[targetMuscleGroup] || { count: 0, totalSets: 0 };
  const exerciseCount = targetGroupData.count;
  const totalSets = targetGroupData.totalSets;
  
  // Only suggest different group if volume is sufficient
  const volumeThreshold = targetMuscleGroup === 'Legs' ? 12 : 9;
  const exerciseThreshold = targetMuscleGroup === 'Legs' ? 4 : 3;
  const hasEnoughVolume = totalSets >= volumeThreshold || exerciseCount >= exerciseThreshold;
  
  // Keep same muscle group unless volume is sufficient
  const finalTargetMuscle = hasEnoughVolume && context.summary?.missingMuscles?.length
    ? context.summary.missingMuscles[0]
    : targetMuscleGroup;

  const candidatePool = getAvailableExercisesForGroup(finalTargetMuscle, serializedExercises);
  const selectedExercise = candidatePool.length > 0
    ? candidatePool[Math.floor(Math.random() * candidatePool.length)]
    : (finalTargetMuscle === 'Legs' ? 'Leg Curl' : 'Face Pulls');

  const cues = CUES_BY_GROUP[finalTargetMuscle] || ['Move with control', 'Focus on quality reps'];
  const rationale = finalTargetMuscle === targetMuscleGroup
    ? `Continue building ${finalTargetMuscle.toLowerCase()} with ${selectedExercise}. You've done ${exerciseCount} ${finalTargetMuscle.toLowerCase()} exercise${exerciseCount > 1 ? 's' : ''} so far.`
    : `Add ${selectedExercise} to target ${finalTargetMuscle.toLowerCase()}.`;

  return {
    exercise: selectedExercise,
    muscleGroup: finalTargetMuscle, // Always use the determined group
    sets: finalTargetMuscle === 'Core' ? 3 : 4,
    reps: finalTargetMuscle === 'Core' ? '30-40s' : '10-12',
    rationale,
    cues: cues.slice(0, 2),
  };
}

function stripEquipmentName(name: string): string {
  if (!name) {
    return '';
  }
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function determineMuscleGroup(name: string, provided?: string): string {
  if (!name) {
    return provided || 'Full Body';
  }
  
  const lower = name.toLowerCase();
  
  // ALWAYS check for leg exercises FIRST (before generic "press" check)
  // This is critical to catch "Leg Press" before it gets misclassified as Chest
  if (lower.includes('leg') || lower.includes('squat') || lower.includes('lunge') || 
      lower.includes('deadlift') || lower.includes('calf') || lower.includes('hamstring') ||
      lower.includes('quad') || lower.includes('glute') || lower.includes('hip thrust') ||
      lower.includes('leg extension') || lower.includes('leg curl')) {
    return 'Legs';
  }
  
  // Check database AFTER keyword check (database is authoritative but keywords catch edge cases)
  const dbEntry = EXERCISE_DATABASE[name as keyof typeof EXERCISE_DATABASE];
  if (dbEntry?.muscleGroup) {
    return dbEntry.muscleGroup;
  }
  
  // If provided muscle group is valid and not conflicting, use it
  // But don't trust it if it conflicts with obvious keywords
  if (provided && provided !== 'Unknown' && provided !== 'Full Body') {
    // Double-check: if name clearly indicates a different group, override
    if (lower.includes('leg') && provided !== 'Legs') {
      return 'Legs'; // Override wrong provided value
    }
    if ((lower.includes('row') || lower.includes('pull') || lower.includes('lat')) && provided !== 'Back') {
      return 'Back'; // Override wrong provided value
    }
    return provided;
  }
  
  // Check for back exercises
  if (lower.includes('row') || lower.includes('pull') || lower.includes('lat') ||
      lower.includes('pulldown') || lower.includes('chin') || lower.includes('shrug')) {
    return 'Back';
  }
  
  // Check for chest exercises (but exclude leg press which was already caught above)
  if ((lower.includes('press') || lower.includes('push')) && !lower.includes('leg') && 
      !lower.includes('shoulder') && !lower.includes('overhead')) {
    return 'Chest';
  }
  
  // Check for shoulder exercises
  if (lower.includes('raise') || lower.includes('shoulder') || lower.includes('lateral') ||
      lower.includes('rear delt') || lower.includes('front delt') || lower.includes('overhead press')) {
    return 'Shoulders';
  }
  
  // Check for arm exercises
  if (lower.includes('curl') || lower.includes('tricep') || lower.includes('bicep') ||
      lower.includes('extension') || lower.includes('dip')) {
    return 'Arms';
  }
  
  // Check for core exercises
  if (lower.includes('plank') || lower.includes('crunch') || lower.includes('core') ||
      lower.includes('ab') || lower.includes('sit-up')) {
    return 'Core';
  }
  
  return provided || 'Full Body';
}

function getAvailableExercisesForGroup(group: string, exercises: SerializedExercise[]): string[] {
  const pool = MUSCLE_GROUP_LIBRARY[group] || MUSCLE_GROUP_LIBRARY['Full Body'] || [];
  const used = new Set(exercises.map((exercise) => exercise.name));
  const filtered = pool.filter((exercise) => !used.has(exercise));
  return filtered.length > 0 ? filtered : pool;
}


