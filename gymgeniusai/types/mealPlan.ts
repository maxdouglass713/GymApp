/**
 * Meal Plan Types
 * 
 * Defines the structure for AI-generated meal plans
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealIngredient {
  name: string;
  amount: string;
  unit: string;
}

export interface MacroNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface GeneratedMeal {
  id: string;
  mealType: MealType;
  name: string;
  macros: MacroNutrients;
  ingredients: MealIngredient[];
  addedToNutrition?: Date;
  addedToDate?: string; // YYYY-MM-DD format
}

export interface MealBatch {
  id: string;
  userId: string;
  generatedAt: Date;
  meals: {
    breakfast: GeneratedMeal;
    lunch: GeneratedMeal;
    dinner: GeneratedMeal;
    snack: GeneratedMeal;
  };
  totalMacros: MacroNutrients;
  basedOnProfile: {
    goal: string;
    targetCalories: number;
    targetProtein: number;
  };
}

export interface MealPlanGenerationRequest {
  userId: string;
  firstName: string;
  goal: string;
  experience?: string;
  dietaryPreference?: string;
  targetMacros: MacroNutrients;
  age?: number;
  weight?: number;
  sex?: string;
  assignedClientId?: string;
  assignedClientName?: string;
  coachNotes?: string;
  customGoal?: string;
  customCalorieTarget?: number;
  dietaryNotes?: string;
}







