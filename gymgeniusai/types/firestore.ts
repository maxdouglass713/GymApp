// Firestore document types based on the requirements document

// Team-related types
export interface TeamDocument {
  id: string;
  name: string;
  description?: string;
  sport?: string;
  inviteCode: string;
  coachId: string; // UID of the coach who created the team
  coachName: string;
  createdAt: Date;
  updatedAt: Date;
  members: TeamMember[];
  settings: {
    maxMembers?: number;
    isPublic: boolean;
  };
}

export interface TeamMember {
  userId: string;
  name: string;
  role: 'player' | 'coach' | 'admin';
  joinedAt: Date;
  status: 'active' | 'inactive';
}

export interface UserDocument {
  id: string;
  email: string;
  firstName: string;
  birthday?: Date;
  points: number;
  planTier: 'free' | 'premium';
  streaks: {
    workouts: number;
    meals: number;
    cardio: number;
  };
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Physical measurements
  height?: {
    value: string | number; // String for "5ft 10in" format or number for cm
    unit: 'ft/in' | 'cm';
  };
  weight?: {
    value: number;
    unit: 'lb' | 'kg';
  };
  sex?: 'male' | 'female' | 'other';
  
  // Experience and goals
  exerciseExperience?: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal?: 'build_muscle' | 'lose_fat' | 'improve_fitness';
  goals?: Array<'build_muscle' | 'lose_fat' | 'improve_fitness' | 'gain_strength' | 'improve_endurance' | 'increase_power' | 'improve_flexibility' | 'general_health'>;
  equipment?: 'home_only' | 'gym_access' | 'both';
  weeklySchedule?: number;
  
  // Sports related
  playsSports?: boolean;
  sport?: string;
  isOnTeam?: boolean;
  teamName?: string;
  role?: 'player' | 'coach';
  
  // Institution/Team related
  userType?: 'personal' | 'institution';
  institutionRole?: 'coach' | 'admin' | 'player';
  institutionName?: string;
  teamSize?: '1-10' | '11-25' | '26-50' | '50+';
  institutionSport?: string;
  communityUnlocked?: boolean;
  teamInviteCode?: string; // Store invite code for players
  teamId?: string; // Store Firebase team ID
  
  injuries?: string;
  nutritionPreference?: 'simple_macros' | 'detailed_tracking' | 'photo_logging';
  
  // Personalized macro targets
  customMacroTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    bmr?: number;
    tdee?: number;
    activityMultiplier?: number;
    calculatedAt?: Date;
    basedOnWeight?: number;
    basedOnGoal?: string;
  };
}

export interface PointEventDocument {
  id: string;
  uid: string;
  type: 'workout' | 'cardio' | 'meal_log' | 'streak' | 'video_watch' | 'purchase';
  amount: number;
  description: string;
  createdAt: Date;
  
  // Optional metadata
  workoutId?: string;
  mealId?: string;
  foodId?: string; // For individual food items
  videoId?: string;
}

export interface FeatureUnlockDocument {
  id: string;
  uid: string;
  featureKey: string;
  via: 'v' | 'purchase' | 'premium';
  pointsSpent?: number;
  createdAt: Date;
}

export interface FeatureCatalogDocument {
  id: string;
  featureKey: string;
  name: string;
  description: string;
  pointsRequired: number;
  iapProductId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface WorkoutDocument {
  id: string;
  uid: string;
  name: string;
  exercises: WorkoutExerciseDocument[];
  duration?: number; // in minutes
  notes?: string;
  createdAt: Date;
  completedAt?: Date;
  isTemplate: boolean;
  originalWorkoutId?: string; // Store the original workout ID for point deduction
  status?: 'draft' | 'saved' | 'completed';
  scheduledDate?: string;
  
  // AI-generated workout metadata
  aiGenerated?: boolean;
  goal?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface WorkoutExerciseDocument {
  id: string;
  name: string;
  sets: WorkoutSetDocument[];
  notes?: string;
  restTime?: number; // in seconds
  machineLoad?: {
    type: 'pin' | 'plate';
    equipment?: string | string[];
    baseWeight?: number;
    plateCounts?: Record<string, number>;
    exerciseName?: string;
  };
}

export interface WorkoutSetDocument {
  id: string;
  reps: number;
  weight?: number;
  duration?: number; // for time-based exercises
  distance?: number; // for cardio
  notes?: string;
  formAnalysisId?: string;
}

export interface MealDocument {
  id: string;
  uid: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  foods: MealFoodDocument[];
  photoUrl?: string;
  createdAt: Date;
  mealTime: Date;
}

export interface MealFoodDocument {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface ProgressDocument {
  id: string;
  uid: string;
  type: 'weight' | 'measurement' | 'photo';
  value: number;
  unit?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: Date;
}

export interface CommunityChallengeDocument {
  id: string;
  communityId?: string;
  name: string;
  description: string;
  type: 'workout' | 'nutrition' | 'cardio' | 'streak';
  target: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  participants: string[]; // user IDs
  rewards: {
    points: number;
    badge?: string;
  };
  isActive: boolean;
  createdAt: Date;
  createdBy?: string;
  createdByName?: string;
}

export interface UserChallengeDocument {
  id: string;
  uid: string;
  challengeId: string;
  progress: number;
  completed: boolean;
  joinedAt: Date;
  completedAt?: Date;
}

export interface MealPlanDocument {
  id: string;
  userId: string;
  generatedAt: Date;
  meals: {
    breakfast: GeneratedMealDocument;
    lunch: GeneratedMealDocument;
    dinner: GeneratedMealDocument;
    snack: GeneratedMealDocument;
  };
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  basedOnProfile: {
    goal: string;
    targetCalories: number;
    targetProtein: number;
  };
}

export interface GeneratedMealDocument {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  addedToNutrition?: Date;
  addedToDate?: string;
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  POINT_EVENTS: 'pointEvents',
  FEATURE_UNLOCKS: 'featureUnlocks',
  FEATURE_CATALOG: 'featureCatalog',
  WORKOUTS: 'workouts',
  MEALS: 'meals',
  MEAL_PLANS: 'mealPlans',
  PROGRESS: 'progress',
  COMMUNITY_CHALLENGES: 'communityChallenges',
  USER_CHALLENGES: 'userChallenges',
  COMMUNITIES: 'communities',
  COMMUNITY_MEMBERS: 'communityMembers',
  COMMUNITY_FEED: 'communityFeed',
} as const;

export interface PersonalCommunityDocument {
  id: string;
  name: string;
  description?: string;
  type: 'friends' | 'work';
  inviteCode: string;
  ownerId: string;
  ownerName: string;
  createdAt: Date;
  updatedAt: Date;
  membersCount: number;
}

export interface CommunityMemberDocument {
  id: string;
  communityId: string;
  uid: string;
  displayName: string;
  role: 'owner' | 'member';
  status: 'active' | 'invited';
  joinedAt: Date;
}

export interface CommunityFeedDocument {
  id: string;
  communityId: string;
  userId: string;
  displayName: string;
  message: string;
  workoutId?: string;
  challengeId?: string;
  createdAt: Date;
}
