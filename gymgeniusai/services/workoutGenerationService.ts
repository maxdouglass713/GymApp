/**
 * Workout Generation Service
 * 
 * Generates personalized workout plans based on user profile
 * Uses smart fallback system (no AI API needed)
 */

import { WorkoutBatch, GeneratedWorkout, WorkoutExercise, WorkoutPlanGenerationRequest } from '../types/workoutPlan';

export async function generateWorkoutPlanWithAI(request: WorkoutPlanGenerationRequest): Promise<WorkoutBatch> {
  try {
    console.log('🏋️ Generating workout plan...');
    console.log('📊 Request data:', {
      goal: request.goal,
      experience: request.experience,
      equipment: request.equipment,
    });
    
    // Generate personalized workouts based on user profile (no AI needed!)
    console.log('🧠 Generating personalized workout plan...');
    return generateSmartWorkoutBatch(request);
    
  } catch (error) {
    console.error('❌ Error generating workout plan:', error);
    throw error;
  }
}

function generateSmartWorkoutBatch(request: WorkoutPlanGenerationRequest): WorkoutBatch {
  const { userId, goal, experience, equipment } = request;
  
  const batch: WorkoutBatch = {
    id: `workout_batch_${Date.now()}`,
    userId,
    generatedAt: new Date(),
    goal,
    experience,
    equipment,
    workouts: {
      strength: generateStrengthWorkout(request),
      cardio: generateCardioWorkout(request),
      hiit: generateHIITWorkout(request),
      flexibility: generateFlexibilityWorkout(request),
    },
  };
  
  return batch;
}

function generateStrengthWorkout(request: WorkoutPlanGenerationRequest): GeneratedWorkout {
  const { goal, experience, equipment } = request;
  
  const exercises = getStrengthExercises(goal, experience, equipment);
  
  return {
    id: `workout_${Date.now()}_strength`,
    workoutType: 'strength',
    name: getStrengthWorkoutName(goal),
    description: getStrengthDescription(goal, experience),
    duration: experience === 'beginner' ? '40-50 mins' : experience === 'intermediate' ? '50-60 mins' : '60-75 mins',
    difficulty: experience as any,
    exercises,
  };
}

function generateCardioWorkout(request: WorkoutPlanGenerationRequest): GeneratedWorkout {
  const { goal, experience, equipment } = request;
  
  const exercises = getCardioExercises(goal, experience, equipment);
  
  return {
    id: `workout_${Date.now()}_cardio`,
    workoutType: 'cardio',
    name: 'Cardio Conditioning',
    description: getCardioDescription(goal, experience),
    duration: experience === 'beginner' ? '20-30 mins' : experience === 'intermediate' ? '30-40 mins' : '40-60 mins',
    difficulty: experience as any,
    exercises,
  };
}

function generateHIITWorkout(request: WorkoutPlanGenerationRequest): GeneratedWorkout {
  const { goal, experience, equipment } = request;
  
  const exercises = getHIITExercises(goal, experience, equipment);
  
  return {
    id: `workout_${Date.now()}_hiit`,
    workoutType: 'hiit',
    name: 'HIIT Blast',
    description: 'High-intensity interval training for maximum calorie burn and conditioning',
    duration: experience === 'beginner' ? '15-20 mins' : experience === 'intermediate' ? '20-30 mins' : '30-40 mins',
    difficulty: experience as any,
    exercises,
  };
}

function generateFlexibilityWorkout(request: WorkoutPlanGenerationRequest): GeneratedWorkout {
  const { experience } = request;
  
  const exercises = getFlexibilityExercises(experience);
  
  return {
    id: `workout_${Date.now()}_flexibility`,
    workoutType: 'flexibility',
    name: 'Mobility & Stretch',
    description: 'Improve flexibility, reduce soreness, and prevent injuries',
    duration: '15-25 mins',
    difficulty: experience as any,
    exercises,
  };
}

// Helper to randomly select items from array
function randomSelect<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Exercise databases by type
function getStrengthExercises(goal: string, experience: string, equipment: string): WorkoutExercise[] {
  const isMuscleBuilding = goal === 'build_muscle';
  const hasGym = equipment === 'full_gym';
  
  const exercises: WorkoutExercise[] = [];
  
  if (hasGym) {
    // GYM EXERCISES - Multiple options for variety
    const legOptions = [
      {
        name: 'Barbell Squat',
        sets: experience === 'beginner' ? 3 : 4,
        reps: isMuscleBuilding ? '6-8' : '8-12',
        rest: '120s',
        muscleGroup: 'Legs',
        equipment: 'Barbell',
        notes: 'Keep core tight, chest up'
      },
      {
        name: 'Leg Press',
        sets: experience === 'beginner' ? 3 : 4,
        reps: isMuscleBuilding ? '8-10' : '10-12',
        rest: '90s',
        muscleGroup: 'Legs',
        equipment: 'Machine',
      },
      {
        name: 'Front Squat',
        sets: experience === 'beginner' ? 3 : 4,
        reps: '6-10',
        rest: '120s',
        muscleGroup: 'Legs',
        equipment: 'Barbell',
      },
    ];
    
    const chestOptions = [
      {
        name: 'Bench Press',
        sets: experience === 'beginner' ? 3 : 4,
        reps: isMuscleBuilding ? '6-8' : '8-12',
        rest: '120s',
        muscleGroup: 'Chest',
        equipment: 'Barbell',
      },
      {
        name: 'Dumbbell Bench Press',
        sets: experience === 'beginner' ? 3 : 4,
        reps: '8-12',
        rest: '90s',
        muscleGroup: 'Chest',
        equipment: 'Dumbbell',
      },
      {
        name: 'Incline Bench Press',
        sets: 3,
        reps: '8-10',
        rest: '90s',
        muscleGroup: 'Chest',
        equipment: 'Barbell',
      },
    ];
    
    const backOptions = [
      {
        name: 'Deadlift',
        sets: experience === 'beginner' ? 2 : 3,
        reps: isMuscleBuilding ? '4-6' : '6-8',
        rest: '180s',
        muscleGroup: 'Back',
        equipment: 'Barbell',
        notes: 'Keep back straight, drive through heels'
      },
      {
        name: 'Romanian Deadlift',
        sets: 3,
        reps: '8-10',
        rest: '120s',
        muscleGroup: 'Back/Hamstrings',
        equipment: 'Barbell',
      },
      {
        name: 'Barbell Rows',
        sets: 3,
        reps: '8-12',
        rest: '90s',
        muscleGroup: 'Back',
        equipment: 'Barbell',
      },
    ];
    
    const shoulderOptions = [
      {
        name: 'Overhead Press',
        sets: 3,
        reps: '8-10',
        rest: '90s',
        muscleGroup: 'Shoulders',
        equipment: 'Barbell',
      },
      {
        name: 'Dumbbell Shoulder Press',
        sets: 3,
        reps: '8-12',
        rest: '90s',
        muscleGroup: 'Shoulders',
        equipment: 'Dumbbell',
      },
      {
        name: 'Arnold Press',
        sets: 3,
        reps: '10-12',
        rest: '60s',
        muscleGroup: 'Shoulders',
        equipment: 'Dumbbell',
      },
    ];
    
    // Select one from each category
    exercises.push(randomSelect(legOptions, 1)[0]);
    exercises.push(randomSelect(chestOptions, 1)[0]);
    exercises.push(randomSelect(backOptions, 1)[0]);
    exercises.push(randomSelect(shoulderOptions, 1)[0]);
    
  } else {
    // BODYWEIGHT/HOME EXERCISES - Multiple options
    const pushOptions = [
      {
        name: 'Push-ups',
        sets: experience === 'beginner' ? 3 : 4,
        reps: isMuscleBuilding ? '12-15' : '15-20',
        rest: '60s',
        muscleGroup: 'Chest',
        equipment: 'Bodyweight',
      },
      {
        name: 'Diamond Push-ups',
        sets: 3,
        reps: '10-15',
        rest: '60s',
        muscleGroup: 'Chest/Triceps',
        equipment: 'Bodyweight',
      },
      {
        name: 'Wide Push-ups',
        sets: 3,
        reps: '12-18',
        rest: '60s',
        muscleGroup: 'Chest',
        equipment: 'Bodyweight',
      },
    ];
    
    const legOptions = [
      {
        name: 'Bodyweight Squats',
        sets: 4,
        reps: '15-20',
        rest: '60s',
        muscleGroup: 'Legs',
        equipment: 'Bodyweight',
      },
      {
        name: 'Jump Squats',
        sets: 3,
        reps: '12-15',
        rest: '90s',
        muscleGroup: 'Legs',
        equipment: 'Bodyweight',
      },
      {
        name: 'Lunges',
        sets: 3,
        reps: '12-15 each',
        rest: '60s',
        muscleGroup: 'Legs',
        equipment: 'Bodyweight',
      },
    ];
    
    const shoulderOptions = [
      {
        name: 'Pike Push-ups',
        sets: 3,
        reps: '10-12',
        rest: '60s',
        muscleGroup: 'Shoulders',
        equipment: 'Bodyweight',
      },
      {
        name: 'Handstand Push-ups',
        sets: 3,
        reps: '5-8',
        rest: '90s',
        muscleGroup: 'Shoulders',
        equipment: 'Bodyweight',
      },
    ];
    
    const legVariations = [
      {
        name: 'Bulgarian Split Squats',
        sets: 3,
        reps: '12-15 each',
        rest: '60s',
        muscleGroup: 'Legs',
        equipment: 'Bodyweight',
      },
      {
        name: 'Single Leg Deadlift',
        sets: 3,
        reps: '10-12 each',
        rest: '60s',
        muscleGroup: 'Legs/Balance',
        equipment: 'Bodyweight',
      },
    ];
    
    // Select random exercises
    exercises.push(randomSelect(pushOptions, 1)[0]);
    exercises.push(randomSelect(legOptions, 1)[0]);
    exercises.push(randomSelect(shoulderOptions, 1)[0]);
    exercises.push(randomSelect(legVariations, 1)[0]);
  }
  
  // Add random isolation/accessory exercises
  const accessoryOptions = [
    {
      name: hasGym ? 'Dumbbell Rows' : 'Inverted Rows',
      sets: 3,
      reps: '10-12',
      rest: '60s',
      muscleGroup: 'Back',
      equipment: hasGym ? 'Dumbbell' : 'Bodyweight',
    },
    {
      name: hasGym ? 'Lat Pulldown' : 'Pull-ups/Chin-ups',
      sets: 3,
      reps: hasGym ? '10-12' : '5-8',
      rest: '90s',
      muscleGroup: 'Back',
      equipment: hasGym ? 'Cable' : 'Bodyweight',
    },
    {
      name: hasGym ? 'Cable Flyes' : 'Dips',
      sets: 3,
      reps: '10-12',
      rest: '60s',
      muscleGroup: hasGym ? 'Chest' : 'Chest/Triceps',
      equipment: hasGym ? 'Cable' : 'Bodyweight',
    },
    {
      name: hasGym ? 'Leg Curl' : 'Nordic Curls',
      sets: 3,
      reps: hasGym ? '10-12' : '5-8',
      rest: '60s',
      muscleGroup: 'Hamstrings',
      equipment: hasGym ? 'Machine' : 'Bodyweight',
    },
  ];
  
  const coreOptions = [
    {
      name: 'Plank',
      sets: 3,
      reps: '30-60s',
      rest: '60s',
      muscleGroup: 'Core',
      equipment: 'Bodyweight',
    },
    {
      name: 'Russian Twists',
      sets: 3,
      reps: '20-30',
      rest: '45s',
      muscleGroup: 'Core',
      equipment: 'Bodyweight',
    },
    {
      name: 'Bicycle Crunches',
      sets: 3,
      reps: '15-20',
      rest: '45s',
      muscleGroup: 'Core',
      equipment: 'Bodyweight',
    },
  ];
  
  // Add 2-3 random accessories and 1 core
  exercises.push(...randomSelect(accessoryOptions, experience === 'beginner' ? 2 : 3));
  exercises.push(randomSelect(coreOptions, 1)[0]);
  
  // Assign unique IDs
  return exercises.map((ex, i) => ({ ...ex, id: `${i + 1}` }));
}

function getCardioExercises(goal: string, experience: string, equipment: string): WorkoutExercise[] {
  const hasGym = equipment === 'full_gym';
  
  const mainCardioOptions = [
    {
      name: hasGym ? 'Treadmill Run' : 'Outdoor Run',
      sets: 1,
      reps: experience === 'beginner' ? '20 mins' : experience === 'intermediate' ? '30 mins' : '40 mins',
      rest: '0s',
      muscleGroup: 'Cardio',
      equipment: hasGym ? 'Treadmill' : 'Outdoor',
      notes: 'Maintain steady pace, 60-70% max HR'
    },
    {
      name: hasGym ? 'Elliptical' : 'Jogging',
      sets: 1,
      reps: experience === 'beginner' ? '25 mins' : experience === 'intermediate' ? '35 mins' : '45 mins',
      rest: '0s',
      muscleGroup: 'Cardio',
      equipment: hasGym ? 'Elliptical' : 'Outdoor',
      notes: 'Low impact, steady pace'
    },
    {
      name: hasGym ? 'Rowing Machine' : 'Shadow Boxing',
      sets: experience === 'beginner' ? 3 : 5,
      reps: '5 mins',
      rest: '120s',
      muscleGroup: 'Cardio',
      equipment: hasGym ? 'Rowing Machine' : 'Bodyweight',
    },
  ];
  
  const intervalOptions = [
    {
      name: 'Jump Rope',
      sets: experience === 'beginner' ? 3 : 5,
      reps: experience === 'beginner' ? '1 min' : '2 mins',
      rest: '60s',
      muscleGroup: 'Cardio',
      equipment: 'Jump Rope',
    },
    {
      name: 'High Knees',
      sets: 4,
      reps: '45s',
      rest: '30s',
      muscleGroup: 'Cardio',
      equipment: 'Bodyweight',
    },
    {
      name: 'Jumping Jacks',
      sets: 4,
      reps: '60s',
      rest: '30s',
      muscleGroup: 'Cardio',
      equipment: 'Bodyweight',
    },
  ];
  
  const coolDownOptions = [
    {
      name: hasGym ? 'Stationary Bike' : 'Walking',
      sets: 1,
      reps: '10-15 mins',
      rest: '0s',
      muscleGroup: 'Cardio',
      equipment: hasGym ? 'Bike' : 'Outdoor',
      notes: 'Cool down pace'
    },
    {
      name: 'Light Jog',
      sets: 1,
      reps: '10 mins',
      rest: '0s',
      muscleGroup: 'Cardio',
      equipment: 'Outdoor',
      notes: 'Recovery pace'
    },
  ];
  
  return [
    randomSelect(mainCardioOptions, 1)[0],
    randomSelect(intervalOptions, 1)[0],
    randomSelect(coolDownOptions, 1)[0],
  ].map((ex, i) => ({ ...ex, id: `${i + 1}` }));
}

function getHIITExercises(goal: string, experience: string, equipment: string): WorkoutExercise[] {
  const hiitPool = [
    {
      name: 'Burpees',
      sets: experience === 'beginner' ? 4 : 6,
      reps: '30s work',
      rest: '30s',
      muscleGroup: 'Full Body',
      equipment: 'Bodyweight',
    },
    {
      name: 'Mountain Climbers',
      sets: experience === 'beginner' ? 4 : 6,
      reps: '30s work',
      rest: '30s',
      muscleGroup: 'Core',
      equipment: 'Bodyweight',
    },
    {
      name: 'Jump Squats',
      sets: experience === 'beginner' ? 4 : 6,
      reps: '30s work',
      rest: '30s',
      muscleGroup: 'Legs',
      equipment: 'Bodyweight',
    },
    {
      name: 'High Knees',
      sets: experience === 'beginner' ? 4 : 6,
      reps: '30s work',
      rest: '30s',
      muscleGroup: 'Cardio',
      equipment: 'Bodyweight',
    },
    {
      name: 'Plank Jacks',
      sets: experience === 'beginner' ? 4 : 6,
      reps: '30s work',
      rest: '30s',
      muscleGroup: 'Core',
      equipment: 'Bodyweight',
    },
    {
      name: 'Box Jumps',
      sets: experience === 'beginner' ? 4 : 6,
      reps: '30s work',
      rest: '30s',
      muscleGroup: 'Legs',
      equipment: 'Box',
    },
    {
      name: 'Tuck Jumps',
      sets: experience === 'beginner' ? 4 : 6,
      reps: '30s work',
      rest: '30s',
      muscleGroup: 'Legs',
      equipment: 'Bodyweight',
    },
    {
      name: 'Broad Jumps',
      sets: experience === 'beginner' ? 4 : 6,
      reps: '30s work',
      rest: '30s',
      muscleGroup: 'Legs',
      equipment: 'Bodyweight',
    },
  ];
  
  // Select 5 random HIIT exercises
  return randomSelect(hiitPool, 5).map((ex, i) => ({ ...ex, id: `${i + 1}` }));
}

function getFlexibilityExercises(experience: string): WorkoutExercise[] {
  const flexibilityPool = [
    {
      name: 'Cat-Cow Stretch',
      sets: 3,
      reps: '10 reps',
      rest: '30s',
      muscleGroup: 'Spine',
      equipment: 'Bodyweight',
      notes: 'Slowly alternate between poses'
    },
    {
      name: 'Hip Flexor Stretch',
      sets: 2,
      reps: '30s each side',
      rest: '15s',
      muscleGroup: 'Hips',
      equipment: 'Bodyweight',
    },
    {
      name: 'Hamstring Stretch',
      sets: 2,
      reps: '30s each leg',
      rest: '15s',
      muscleGroup: 'Hamstrings',
      equipment: 'Bodyweight',
    },
    {
      name: 'Shoulder Stretch',
      sets: 2,
      reps: '20s each arm',
      rest: '15s',
      muscleGroup: 'Shoulders',
      equipment: 'Bodyweight',
    },
    {
      name: 'Child\'s Pose',
      sets: 1,
      reps: '60s',
      rest: '0s',
      muscleGroup: 'Full Body',
      equipment: 'Bodyweight',
      notes: 'Deep breathing, relax'
    },
    {
      name: 'Quad Stretch',
      sets: 2,
      reps: '30s each leg',
      rest: '15s',
      muscleGroup: 'Quads',
      equipment: 'Bodyweight',
    },
    {
      name: 'Pigeon Pose',
      sets: 2,
      reps: '45s each side',
      rest: '15s',
      muscleGroup: 'Hips',
      equipment: 'Bodyweight',
    },
    {
      name: 'Cobra Stretch',
      sets: 3,
      reps: '30s',
      rest: '20s',
      muscleGroup: 'Back',
      equipment: 'Bodyweight',
    },
    {
      name: 'Seated Forward Fold',
      sets: 2,
      reps: '45s',
      rest: '15s',
      muscleGroup: 'Hamstrings/Back',
      equipment: 'Bodyweight',
    },
    {
      name: 'Thread the Needle',
      sets: 2,
      reps: '30s each side',
      rest: '15s',
      muscleGroup: 'Shoulders/Back',
      equipment: 'Bodyweight',
    },
  ];
  
  // Select 6 random stretches
  return randomSelect(flexibilityPool, 6).map((ex, i) => ({ ...ex, id: `${i + 1}` }));
}

// Helper functions for workout names and descriptions
function getStrengthWorkoutName(goal: string): string {
  switch (goal) {
    case 'build_muscle':
      return 'Hypertrophy Builder';
    case 'lose_weight':
      return 'Strength & Tone';
    case 'stay_fit':
      return 'Full Body Strength';
    case 'improve_endurance':
      return 'Strength Endurance';
    default:
      return 'Strength Training';
  }
}

function getStrengthDescription(goal: string, experience: string): string {
  if (goal === 'build_muscle') {
    return 'Build muscle mass with compound movements and progressive overload';
  } else if (goal === 'lose_weight') {
    return 'Burn calories while building lean muscle for a toned physique';
  } else {
    return 'Maintain and improve overall strength and functional fitness';
  }
}

function getCardioDescription(goal: string, experience: string): string {
  if (goal === 'lose_weight') {
    return 'Maximize calorie burn with steady-state cardio';
  } else if (goal === 'improve_endurance') {
    return 'Build cardiovascular endurance and stamina';
  } else {
    return 'Improve heart health and overall conditioning';
  }
}

