/**
 * Workout Plan Types
 * 
 * Defines the structure for AI-generated workout plans
 */

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string; // e.g., "8-12", "15", "AMRAP"
  rest: string; // e.g., "60s", "90s"
  notes?: string;
  muscleGroup: string;
  equipment?: string;
}

export interface GeneratedWorkout {
  id: string;
  workoutType: 'strength' | 'cardio' | 'hiit' | 'flexibility';
  name: string;
  description: string;
  duration: string; // e.g., "45 mins"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exercises: WorkoutExercise[];
  addedToWorkouts?: Date;
  addedToDate?: string;
}

export interface WorkoutBatch {
  id: string;
  userId: string;
  generatedAt: Date;
  goal: string; // User's fitness goal
  experience: string; // User's experience level
  equipment: string; // Available equipment
  workouts: {
    strength: GeneratedWorkout;
    cardio: GeneratedWorkout;
    hiit: GeneratedWorkout;
    flexibility: GeneratedWorkout;
  };
}

export interface WorkoutPlanGenerationRequest {
  userId: string;
  firstName: string;
  goal: string; // e.g., "build_muscle", "lose_weight", "stay_fit"
  experience: string; // e.g., "beginner", "intermediate", "advanced"
  equipment: string; // e.g., "full_gym", "home_basic", "bodyweight"
  weeklySchedule: number; // Days per week they workout
  injuries?: string;
  targetMuscleGroups?: string[]; // e.g., ["Chest", "Triceps", "Shoulders"]
  pastWorkouts?: PastWorkoutData[]; // Historical workout data for personalized sets/reps
  assignedClientId?: string;
  assignedClientName?: string;
  coachNotes?: string;
  customFocus?: string;
  sessionLength?: string;
  trainingSplit?: string; // e.g., "push_pull_legs", "upper_lower", "full_body", "body_part_split"
  areasOfImprovement?: string[]; // e.g., ["Upper Chest", "Hamstrings", "Core Stability"]
}

export interface PastWorkoutData {
  exerciseName: string;
  muscleGroup?: string;
  sets: number;
  reps: string | number;
  weight?: number;
  date: string;
  completed: boolean;
}










