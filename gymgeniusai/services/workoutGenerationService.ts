/**
 * Workout Generation Service
 * 
 * Generates personalized workout plans based on user profile and past workouts
 * Uses Firebase Functions to call Gemini AI for smart generation
 */

import { WorkoutBatch, GeneratedWorkout, WorkoutExercise, WorkoutPlanGenerationRequest } from '../types/workoutPlan';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSubscriptionStore } from '../stores/subscriptionStore';

export async function generateWorkoutPlanWithAI(request: WorkoutPlanGenerationRequest): Promise<WorkoutBatch> {
  try {
    console.log('🏋️ Generating workout plan with AI...');
    console.log('📊 Request data:', {
      goal: request.goal,
      experience: request.experience,
      equipment: request.equipment,
      targetMuscleGroups: request.targetMuscleGroups,
      pastWorkoutsCount: request.pastWorkouts?.length || 0,
    });
    
    // Check subscription tier access - REQUIRED for AI workout plans
    const { canUseAI, tier } = useSubscriptionStore.getState();
    if (!canUseAI('workoutPlan')) {
      const errorMessage = tier === 'free' 
        ? 'Upgrade to Basic, Pro, or Elite tier to generate AI workout plans'
        : tier === 'basic'
        ? 'Insufficient Volts. You need 6,000 Volts to generate an AI workout plan'
        : 'You have reached your monthly limit for AI workout plans. Upgrade to Elite for unlimited access';
      console.warn('⚠️ AI workout plan generation not available:', errorMessage);
      throw new Error(errorMessage);
    }

    // Call Firebase Function for AI generation
    try {
      const generateWorkoutPlan = httpsCallable(getFunctions(), 'generateWorkoutPlan');
      const result = await generateWorkoutPlan({ request });
      
      const generatedText = (result.data as any)?.text;
      if (!generatedText) {
        console.error('❌ No text received from AI:', result.data);
        throw new Error('AI workout plan generation failed. Please try again.');
      }
      
      console.log('✅ Received AI-generated workout plan');
      console.log('📄 Raw AI response length:', generatedText.length);
      console.log('📄 Raw AI response (first 500 chars):', generatedText.substring(0, 500));
      
      // Parse the AI response and create WorkoutBatch
      const batch = parseWorkoutPlanResponse(generatedText, request);
      return batch;
    } catch (functionError: any) {
      // Handle specific Firebase Function errors
      const errorCode = functionError?.code || '';
      const errorMessage = functionError?.message || String(functionError) || '';
      
      console.error('Firebase Function error details:', { code: errorCode, message: errorMessage, error: functionError });
      
      if (errorCode === 'functions/not-found' || 
          errorCode === 'not-found' || 
          errorMessage.includes('not-found') ||
          errorMessage === 'not-found') {
        throw new Error('AI workout plan service is not available. The Firebase Function needs to be deployed. Please contact support or try again later.');
      }
      if (errorCode === 'permission-denied' || 
          errorCode === 'functions/permission-denied' ||
          errorMessage.includes('permission') ||
          errorMessage.includes('Permission denied')) {
        throw new Error('You do not have permission to use AI workout plans. Please check your subscription tier.');
      }
      // Re-throw other function errors
      throw functionError;
    }
    
  } catch (error: any) {
    console.error('❌ Error generating workout plan:', error);
    
    // Extract error details
    const errorCode = error?.code || '';
    const errorMessage = error?.message || String(error) || '';
    
    // Handle "not-found" errors (Firebase Function not deployed)
    if (errorCode === 'functions/not-found' || 
        errorCode === 'not-found' || 
        errorMessage.includes('not-found') ||
        errorMessage === 'not-found' ||
        errorMessage.includes('[Error: not-found]')) {
      throw new Error('AI workout plan service is not available. The Firebase Function needs to be deployed. Please contact support or try again later.');
    }
    
    // Re-throw subscription/permission errors
    if (error.message?.includes('Upgrade') || 
        error.message?.includes('Insufficient') || 
        error.message?.includes('limit') || 
        error.message?.includes('not available') || 
        error.message?.includes('permission')) {
      throw error;
    }
    
    // For other errors, provide a clear message
    throw new Error(error.message || 'Failed to generate AI workout plan. Please try again or upgrade your subscription.');
  }
}

/**
 * Parse AI-generated workout plan response
 */
function parseWorkoutPlanResponse(text: string, request: WorkoutPlanGenerationRequest): WorkoutBatch {
  console.log('🔍 Parsing AI workout plan response...');
  console.log('📄 Full response text length:', text.length);
  console.log('📄 Full response text:', text);
  
  // Try multiple parsing strategies
  let exerciseSections: string[] = [];
  
  // Strategy 1: Split by "---" separator
  exerciseSections = text.split('---').filter(s => s.trim().length > 0);
  console.log('📊 Exercise sections found (--- separator):', exerciseSections.length);
  
  // Strategy 2: If no sections found with ---, try "EXERCISE:" markers
  if (exerciseSections.length <= 1) {
    const exerciseMatches = text.match(/EXERCISE:/gi);
    if (exerciseMatches && exerciseMatches.length > 0) {
      console.log('📊 Found EXERCISE: markers:', exerciseMatches.length);
      // Split by EXERCISE: but keep the marker
      exerciseSections = text.split(/(?=EXERCISE:)/i).filter(s => s.trim().length > 0 && s.includes('EXERCISE:'));
      console.log('📊 Exercise sections found (EXERCISE: separator):', exerciseSections.length);
    }
  }
  
  // Strategy 3: Try numbered exercises (1., 2., 3., etc.)
  if (exerciseSections.length <= 1) {
    const numberedMatches = text.match(/\d+\.\s*[A-Z]/g);
    if (numberedMatches && numberedMatches.length > 0) {
      console.log('📊 Found numbered exercises:', numberedMatches.length);
      // Split by numbered patterns
      exerciseSections = text.split(/(?=\d+\.\s*[A-Z])/).filter(s => s.trim().length > 0);
      console.log('📊 Exercise sections found (numbered separator):', exerciseSections.length);
    }
  }
  
  // Strategy 4: Try bullet points or dashes
  if (exerciseSections.length <= 1) {
    const bulletMatches = text.match(/^[-•*]\s+[A-Z]/gm);
    if (bulletMatches && bulletMatches.length > 0) {
      console.log('📊 Found bullet point exercises:', bulletMatches.length);
      exerciseSections = text.split(/(?=^[-•*]\s+[A-Z])/m).filter(s => s.trim().length > 0);
      console.log('📊 Exercise sections found (bullet separator):', exerciseSections.length);
    }
  }
  
  // Strategy 5: Try to find exercise names directly (common exercise patterns)
  if (exerciseSections.length <= 1) {
    // Look for common exercise name patterns
    const exerciseNamePatterns = [
      /(?:^|\n)(?:EXERCISE:?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Press|Squat|Deadlift|Curl|Extension|Row|Pull|Push|Raise|Fly|Dip|Lunge|Step|Crunch|Plank|Bridge|Hold|Swing|Kick|Jump|Run|Walk|Bike|Swim))/gmi,
      /(?:^|\n)(?:EXERCISE:?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:with|using)\s+[A-Z][a-z]+)/gmi,
    ];
    
    for (const pattern of exerciseNamePatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length >= 2) {
        console.log('📊 Found exercise name patterns:', matches.length);
        // Try to extract sections around these matches
        const positions = matches.map(m => m.index || 0);
        exerciseSections = [];
        for (let i = 0; i < positions.length; i++) {
          const start = positions[i];
          const end = i < positions.length - 1 ? positions[i + 1] : text.length;
          const section = text.substring(start, end).trim();
          if (section.length > 10) {
            exerciseSections.push(section);
          }
        }
        console.log('📊 Exercise sections found (name pattern):', exerciseSections.length);
        if (exerciseSections.length >= 2) break;
      }
    }
  }
  
  const exercises: WorkoutExercise[] = [];
  
  for (let i = 0; i < exerciseSections.length; i++) {
    const section = exerciseSections[i];
    console.log(`🔍 Parsing exercise section ${i + 1}/${exerciseSections.length}:`, section.substring(0, 200));
    try {
      const exercise = parseExerciseSection(section);
      if (exercise) {
        console.log(`✅ Parsed exercise ${i + 1}:`, exercise.name);
        exercises.push(exercise);
      } else {
        console.warn(`⚠️ Exercise section ${i + 1} returned null`);
        console.warn('Section content:', section);
      }
    } catch (error) {
      console.error(`❌ Error parsing exercise section ${i + 1}:`, error);
      console.error('Section content:', section);
    }
  }
  
  console.log('📊 Total exercises parsed:', exercises.length);
  console.log('📊 Exercise names:', exercises.map(e => e.name));
  
  // Create a strength workout with the parsed exercises
  // Require minimum exercises for valid workout
  if (exercises.length < 4) {
    console.error('❌ Insufficient exercises parsed:', exercises.length);
    console.error('❌ Raw response was:', text);
    console.error('❌ Exercise sections found:', exerciseSections.length);
    console.error('❌ Exercise sections:', exerciseSections.map((s, i) => `Section ${i + 1}: ${s.substring(0, 100)}...`));
    throw new Error(`AI workout plan generation failed. Received incomplete workout plan (only ${exercises.length} exercises parsed from ${exerciseSections.length} sections, need at least 4). Please try again.`);
  }
  
  // Create strength workout from AI-generated exercises
  const strengthWorkout: GeneratedWorkout = {
    id: `workout_${Date.now()}_strength`,
    workoutType: 'strength',
    name: request.targetMuscleGroups && request.targetMuscleGroups.length > 0
      ? `${request.targetMuscleGroups.join(' & ')} Focus`
      : 'Full Body Strength',
    description: `AI-generated workout targeting ${request.targetMuscleGroups?.join(', ') || 'full body'} based on your goals and past performance`,
    duration: request.experience === 'beginner' ? '40-50 mins' : request.experience === 'intermediate' ? '50-60 mins' : '60-75 mins',
    difficulty: request.experience as any,
    exercises: exercises.slice(0, 8), // Limit to 8 exercises
  };
  
  // Note: The Firebase function should be updated to return all workout types (strength, cardio, HIIT, flexibility)
  // For now, we only have strength workouts from AI. The other types will need to be generated by the AI
  // or we can make them optional. For now, we'll create a batch with just the strength workout
  // and indicate that other types need AI generation.
  
  // TODO: Update Firebase function to generate all workout types, or make multiple AI calls
  // For now, return a batch with only the strength workout (other types will be empty/placeholder)
  // This ensures we never use stock workouts - only AI-generated content
  
  const batch: WorkoutBatch = {
    id: `workout_batch_${Date.now()}`,
    userId: request.userId,
    generatedAt: new Date(),
    goal: request.goal,
    experience: request.experience,
    equipment: request.equipment,
    workouts: {
      strength: strengthWorkout,
      // Cardio, HIIT, and flexibility workouts will be generated by AI in future updates
      // For now, these are empty - users will need to generate them separately or wait for full AI support
      cardio: {
        id: `workout_${Date.now()}_cardio`,
        workoutType: 'cardio',
        name: 'AI Cardio Workout',
        description: 'AI-generated cardio workout - coming soon',
        duration: '20-30 mins',
        difficulty: request.experience as any,
        exercises: [],
      },
      hiit: {
        id: `workout_${Date.now()}_hiit`,
        workoutType: 'hiit',
        name: 'AI HIIT Workout',
        description: 'AI-generated HIIT workout - coming soon',
        duration: '15-20 mins',
        difficulty: request.experience as any,
        exercises: [],
      },
      flexibility: {
        id: `workout_${Date.now()}_flexibility`,
        workoutType: 'flexibility',
        name: 'AI Flexibility Workout',
        description: 'AI-generated flexibility workout - coming soon',
        duration: '15-25 mins',
        difficulty: request.experience as any,
        exercises: [],
      },
    },
  };
  
  return batch;
}

/**
 * Parse individual exercise section from AI response
 */
function parseExerciseSection(section: string): WorkoutExercise | null {
  try {
    const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let name = '';
    let muscleGroup = '';
    let sets = 3;
    let reps = '8-12';
    let rest = '90s';
    let weight: number | undefined;
    let notes = '';
    
    // Try to extract exercise name from various formats
    for (const line of lines) {
      const upperLine = line.toUpperCase();
      
      // Standard format: EXERCISE: name
      if (upperLine.startsWith('EXERCISE:')) {
        name = line.replace(/^EXERCISE:\s*/i, '').trim();
      }
      // Alternative: Exercise name on its own line (if it looks like an exercise name)
      else if (!name && line.length > 3 && line.length < 50 && /^[A-Z]/.test(line)) {
        // Check if it looks like an exercise name (not a label)
        if (!line.includes(':') && !line.match(/^(SETS|REPS|REST|WEIGHT|NOTES|MUSCLE)/i)) {
          name = line;
        }
      }
      // Numbered format: 1. Exercise Name
      else if (!name && /^\d+\.\s+/.test(line)) {
        name = line.replace(/^\d+\.\s+/, '').trim();
      }
      // Bullet format: - Exercise Name or • Exercise Name
      else if (!name && /^[-•*]\s+/.test(line)) {
        name = line.replace(/^[-•*]\s+/, '').trim();
      }
      
      // Extract other fields
      if (upperLine.startsWith('MUSCLE_GROUP:') || upperLine.startsWith('MUSCLE GROUP:')) {
        muscleGroup = line.replace(/^MUSCLE[_\s]GROUP:\s*/i, '').trim();
      } else if (upperLine.startsWith('SETS:')) {
        const setsStr = line.replace(/^SETS:\s*/i, '').trim();
        sets = parseInt(setsStr) || 3;
      } else if (upperLine.startsWith('REPS:') || upperLine.startsWith('REPETITIONS:')) {
        reps = line.replace(/^(REPS|REPETITIONS):\s*/i, '').trim();
      } else if (upperLine.startsWith('REST:')) {
        rest = line.replace(/^REST:\s*/i, '').trim();
      } else if (upperLine.startsWith('WEIGHT:')) {
        const weightStr = line.replace(/^WEIGHT:\s*/i, '').trim();
        weight = parseFloat(weightStr) || undefined;
      } else if (upperLine.startsWith('NOTES:') || upperLine.startsWith('NOTE:')) {
        notes = line.replace(/^NOTES?:\s*/i, '').trim();
      }
      // Try to extract sets/reps from natural language
      else if (!name && (upperLine.includes('SETS') || upperLine.includes('REPS'))) {
        const setsMatch = line.match(/(\d+)\s*sets?/i);
        if (setsMatch) sets = parseInt(setsMatch[1]) || sets;
        
        const repsMatch = line.match(/(\d+(?:-\d+)?)\s*reps?/i);
        if (repsMatch) reps = repsMatch[1];
      }
    }
    
    // If we still don't have a name, try to extract from the first line
    if (!name && lines.length > 0) {
      const firstLine = lines[0];
      // Remove common prefixes
      name = firstLine
        .replace(/^\d+\.\s*/, '')
        .replace(/^[-•*]\s*/, '')
        .replace(/^EXERCISE:\s*/i, '')
        .trim();
      
      // If it still looks like a label, skip it
      if (name.includes(':') && name.length < 20) {
        name = '';
      }
    }
    
    // If we still don't have a name, try to find it in the section text
    if (!name) {
      // Look for common exercise patterns
      const exercisePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Press|Squat|Deadlift|Curl|Extension|Row|Pull|Push|Raise|Fly|Dip|Lunge|Step|Crunch|Plank|Bridge|Hold|Swing|Kick|Jump))/;
      const match = section.match(exercisePattern);
      if (match) {
        name = match[1].trim();
      }
    }
    
    // Final validation - if we have a name, create the exercise
    if (name && name.length > 2) {
      return {
        id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        sets: sets || 3,
        reps: reps || '8-12',
        rest: rest || '90s',
        notes: notes || undefined,
        muscleGroup: muscleGroup || 'Full Body',
        equipment: weight ? 'Weighted' : undefined,
      };
    }
    
    console.warn('⚠️ Could not extract exercise name from section:', section.substring(0, 100));
    return null;
  } catch (error) {
    console.error('Error parsing exercise section:', error);
    console.error('Section content:', section);
    return null;
  }
}

// Note: All stock workout generation functions have been removed.
// Only AI-generated workouts are available for users with the correct subscription tier.

