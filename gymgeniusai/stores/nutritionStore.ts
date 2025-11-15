import { create } from 'zustand';
import { nutritionFirebaseService, FoodItem as FirebaseFoodItem } from '../services/nutritionFirebaseService';
import { mealService } from '@/services/firestoreService';
import { persistenceService } from '@/services/persistenceService';
import { generateUniqueId } from '@/utils/id';

export interface MacroNutrients {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export interface FoodItem {
  id: string;
  name: string;
  servingSize: string; // e.g., "100g", "1 cup", "1 piece"
  servingCount: number;
  macrosPerServing: MacroNutrients;
  totalMacros: MacroNutrients; // calculated: macrosPerServing * servingCount
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  loggedAt: Date;
  notes?: string;
}

export interface DailyNutrition {
  date: string; // ISO date string
  foods: FoodItem[];
  totalMacros: MacroNutrients;
  targetMacros: MacroNutrients;
  macroChallengeCompleted?: boolean; // 200 V bonus for hitting calorie target
  macroChallengeCheckedAt?: Date; // When the challenge was last checked
  completedMeals?: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
    snacks: boolean;
  };
}

export interface NutritionStore {
  // Current selected date
  selectedDate: Date;
  
  // Daily nutrition data
  dailyNutrition: DailyNutrition[];
  
  // Current day's data
  currentDayNutrition: DailyNutrition | null;
  
  // Personalized macro targets
  personalizedTargets: MacroNutrients | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  setSelectedDate: (date: Date) => void;
  addFoodItem: (food: Omit<FoodItem, 'id' | 'loggedAt' | 'totalMacros'> & { id?: string }) => Promise<void>;
  addMeal: (dateStr: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', mealData: any) => Promise<void>;
  updateFoodItem: (foodId: string, updates: Partial<FoodItem>) => Promise<void>;
  removeFoodItem: (foodId: string) => Promise<void>; // Made async for point deduction
  getDailyNutrition: (date: Date) => DailyNutrition;
  calculateDailyTotals: (foods: FoodItem[]) => MacroNutrients;
  getFoodsByMeal: (mealType: string) => FoodItem[];
  setPersonalizedTargets: (targets: MacroNutrients) => void;
  getTargets: () => MacroNutrients;
  checkMacroChallengeForDate: (date: Date, uid: string) => Promise<boolean>;
  checkAllPendingMacroChallenges: (uid: string) => Promise<void>;
  setMealCompleted: (date: Date, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', completed: boolean, uid?: string) => Promise<void>;
  refreshDailyMeta: (uid: string, date: Date) => Promise<void>;
  autoCompletePendingMeals: (uid?: string) => Promise<void>;
  
  // Firebase integration
  loadUserMealsFromFirebase: (uid: string, date: Date) => Promise<void>;
  syncMealsToFirebase: (uid: string, date: Date) => Promise<void>;
  saveMealToFirebase: (food: FoodItem, uid: string) => Promise<void>;
  loadAllUserMealsFromFirebase: (uid: string) => Promise<void>;
  clearAllNutritionData: () => void;
}

const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object' && (value as any)?.toDate && typeof (value as any).toDate === 'function') {
    const converted = (value as any).toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }

  return null;
};

export const getLocalDateKey = (value: Date | string | number | null | undefined): string => {
  const date =
    value instanceof Date
      ? value
      : toDateSafe(value) ?? new Date();

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Food database with multiple measurement options
const FOOD_DATABASE = [
  { 
    name: 'Chicken Breast', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 46.7, protein: 8.8, carbs: 0, fat: 1.0 } },
      { unit: 'g', amount: 100, macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
      { unit: 'lb', amount: 1, macros: { calories: 747, protein: 140.6, carbs: 0, fat: 16.3 } }
    ]
  },
  { 
    name: 'Brown Rice', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 216, protein: 5, carbs: 45, fat: 1.8 } },
      { unit: 'g', amount: 100, macros: { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 } },
      { unit: 'oz', amount: 1, macros: { calories: 31.5, protein: 0.7, carbs: 6.5, fat: 0.3 } }
    ]
  },
  { 
    name: 'Oats', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 307, protein: 13.4, carbs: 52.3, fat: 5.5 } },
      { unit: 'g', amount: 100, macros: { calories: 389, protein: 16.9, carbs: 66, fat: 6.9 } },
      { unit: 'tbsp', amount: 1, macros: { calories: 19.2, protein: 0.8, carbs: 3.3, fat: 0.3 } }
    ]
  },
  { 
    name: 'Eggs', 
    measurements: [
      { unit: 'large', amount: 1, macros: { calories: 70, protein: 6, carbs: 0.6, fat: 5 } },
      { unit: 'medium', amount: 1, macros: { calories: 63, protein: 5.5, carbs: 0.5, fat: 4.4 } },
      { unit: 'small', amount: 1, macros: { calories: 54, protein: 4.7, carbs: 0.4, fat: 3.7 } }
    ]
  },
  { 
    name: 'Greek Yogurt', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 100, protein: 17, carbs: 6, fat: 0.7 } },
      { unit: 'g', amount: 100, macros: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 } },
      { unit: 'container', amount: 1, macros: { calories: 150, protein: 25.5, carbs: 9, fat: 1.1 } }
    ]
  },
  { 
    name: 'Peanut Butter', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 94, protein: 4, carbs: 3.2, fat: 8 } },
      { unit: 'g', amount: 100, macros: { calories: 588, protein: 25, carbs: 20, fat: 50 } },
      { unit: 'oz', amount: 1, macros: { calories: 166.7, protein: 7.1, carbs: 5.7, fat: 14.2 } }
    ]
  },
  { 
    name: 'Whey Protein', 
    measurements: [
      { unit: 'scoop', amount: 1, macros: { calories: 120, protein: 24, carbs: 3, fat: 1 } },
      { unit: 'g', amount: 30, macros: { calories: 120, protein: 24, carbs: 3, fat: 1 } },
      { unit: 'tbsp', amount: 1, macros: { calories: 40, protein: 8, carbs: 1, fat: 0.3 } }
    ]
  },
  { 
    name: 'Banana', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 } },
      { unit: 'large', amount: 1, macros: { calories: 121, protein: 1.5, carbs: 31, fat: 0.4 } },
      { unit: 'small', amount: 1, macros: { calories: 90, protein: 1.1, carbs: 23, fat: 0.3 } }
    ]
  },
  { 
    name: 'Almonds', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 164, protein: 6, carbs: 6.2, fat: 14.2 } },
      { unit: 'g', amount: 100, macros: { calories: 579, protein: 21, carbs: 22, fat: 50 } },
      { unit: 'cup', amount: 1, macros: { calories: 529, protein: 19.2, carbs: 20.1, fat: 45.7 } }
    ]
  },
  { 
    name: 'Salmon', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 59, protein: 7.1, carbs: 0, fat: 3.4 } },
      { unit: 'g', amount: 100, macros: { calories: 208, protein: 25, carbs: 0, fat: 12 } },
      { unit: 'fillet', amount: 1, macros: { calories: 280, protein: 33.6, carbs: 0, fat: 16.1 } }
    ]
  },
  { 
    name: 'Sweet Potato', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 103, protein: 1.9, carbs: 24, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 } },
      { unit: 'cup', amount: 1, macros: { calories: 114, protein: 2.1, carbs: 26.6, fat: 0.1 } }
    ]
  },
  { 
    name: 'Broccoli', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 31, protein: 2.5, carbs: 6, fat: 0.3 } },
      { unit: 'g', amount: 100, macros: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
      { unit: 'oz', amount: 1, macros: { calories: 9.6, protein: 0.8, carbs: 2, fat: 0.1 } }
    ]
  },
  { 
    name: 'Avocado', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 240, protein: 3, carbs: 13, fat: 22 } },
      { unit: 'g', amount: 100, macros: { calories: 160, protein: 2, carbs: 9, fat: 15 } },
      { unit: 'cup', amount: 1, macros: { calories: 384, protein: 4.8, carbs: 21.6, fat: 36 } }
    ]
  },
  { 
    name: 'Quinoa', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 222, protein: 8.1, carbs: 40, fat: 3.5 } },
      { unit: 'g', amount: 100, macros: { calories: 120, protein: 4.4, carbs: 22, fat: 1.9 } },
      { unit: 'oz', amount: 1, macros: { calories: 34, protein: 1.2, carbs: 6.2, fat: 0.5 } }
    ]
  },
  { 
    name: 'Cottage Cheese', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 163, protein: 18.3, carbs: 5.7, fat: 7.2 } },
      { unit: 'g', amount: 100, macros: { calories: 98, protein: 11, carbs: 3.4, fat: 4.3 } },
      { unit: 'container', amount: 1, macros: { calories: 220, protein: 24.7, carbs: 7.7, fat: 9.7 } }
    ]
  },

  // ADDITIONAL MEATS & POULTRY
  { 
    name: 'Chicken Thigh', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 61, protein: 7.1, carbs: 0, fat: 3.4 } },
      { unit: 'g', amount: 100, macros: { calories: 215, protein: 25, carbs: 0, fat: 12 } }
    ]
  },
  { 
    name: 'Ground Turkey', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 51, protein: 7.1, carbs: 0, fat: 2.1 } },
      { unit: 'g', amount: 100, macros: { calories: 180, protein: 25, carbs: 0, fat: 7.4 } }
    ]
  },
  { 
    name: 'Ground Beef (90% lean)', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 48, protein: 7.1, carbs: 0, fat: 1.8 } },
      { unit: 'g', amount: 100, macros: { calories: 169, protein: 25, carbs: 0, fat: 6.4 } }
    ]
  },
  { 
    name: 'Ground Beef (80% lean)', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 57, protein: 6.4, carbs: 0, fat: 3.2 } },
      { unit: 'g', amount: 100, macros: { calories: 201, protein: 22.6, carbs: 0, fat: 11.3 } }
    ]
  },
  { 
    name: 'Pork Tenderloin', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 42, protein: 7.1, carbs: 0, fat: 1.1 } },
      { unit: 'g', amount: 100, macros: { calories: 148, protein: 25, carbs: 0, fat: 3.9 } }
    ]
  },
  { 
    name: 'Beef Steak (Sirloin)', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 53, protein: 8.9, carbs: 0, fat: 1.4 } },
      { unit: 'g', amount: 100, macros: { calories: 187, protein: 31.4, carbs: 0, fat: 4.9 } }
    ]
  },

  // MORE FISH & SEAFOOD
  { 
    name: 'Tuna (Yellowfin)', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 31, protein: 6.8, carbs: 0, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 109, protein: 24, carbs: 0, fat: 1.4 } }
    ]
  },
  { 
    name: 'Cod', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 23, protein: 5.7, carbs: 0, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 82, protein: 20, carbs: 0, fat: 0.7 } }
    ]
  },
  { 
    name: 'Shrimp', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 28, protein: 5.7, carbs: 0.7, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 99, protein: 20, carbs: 2.5, fat: 0.7 } }
    ]
  },

  // MORE DAIRY
  { 
    name: 'Egg Whites', 
    measurements: [
      { unit: 'large', amount: 1, macros: { calories: 17, protein: 3.6, carbs: 0.2, fat: 0.1 } },
      { unit: 'cup', amount: 1, macros: { calories: 126, protein: 26, carbs: 1.8, fat: 0.4 } }
    ]
  },
  { 
    name: 'Milk (2%)', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 122, protein: 8.1, carbs: 12, fat: 4.8 } },
      { unit: 'g', amount: 100, macros: { calories: 50, protein: 3.3, carbs: 4.9, fat: 2 } }
    ]
  },
  { 
    name: 'Cheddar Cheese', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 114, protein: 7, carbs: 0.4, fat: 9.4 } },
      { unit: 'g', amount: 100, macros: { calories: 403, protein: 25, carbs: 1.4, fat: 33 } }
    ]
  },

  // MORE GRAINS & CARBS
  { 
    name: 'White Rice', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 205, protein: 4.3, carbs: 45, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } }
    ]
  },
  { 
    name: 'Whole Wheat Bread', 
    measurements: [
      { unit: 'slice', amount: 1, macros: { calories: 81, protein: 3.6, carbs: 13.8, fat: 1.2 } },
      { unit: 'g', amount: 100, macros: { calories: 247, protein: 11, carbs: 42, fat: 3.6 } }
    ]
  },
  { 
    name: 'White Bread', 
    measurements: [
      { unit: 'slice', amount: 1, macros: { calories: 79, protein: 3, carbs: 15, fat: 1 } },
      { unit: 'g', amount: 100, macros: { calories: 265, protein: 10, carbs: 50, fat: 3.3 } }
    ]
  },
  { 
    name: 'Pasta (Whole Wheat)', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 174, protein: 7.5, carbs: 37, fat: 1.2 } },
      { unit: 'g', amount: 100, macros: { calories: 124, protein: 5.4, carbs: 26.4, fat: 0.9 } }
    ]
  },
  { 
    name: 'Pasta (Regular)', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 220, protein: 8, carbs: 43, fat: 1.3 } },
      { unit: 'g', amount: 100, macros: { calories: 131, protein: 4.8, carbs: 25.7, fat: 0.8 } }
    ]
  },

  // MORE VEGETABLES
  { 
    name: 'Spinach', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 } }
    ]
  },
  { 
    name: 'Kale', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 33, protein: 2.9, carbs: 6.7, fat: 0.6 } },
      { unit: 'g', amount: 100, macros: { calories: 49, protein: 4.3, carbs: 8.8, fat: 0.9 } }
    ]
  },
  { 
    name: 'Carrots', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 25, protein: 0.5, carbs: 6, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 } }
    ]
  },
  { 
    name: 'Bell Pepper', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 31, protein: 1, carbs: 7.3, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 31, protein: 1, carbs: 7.3, fat: 0.4 } }
    ]
  },
  { 
    name: 'Tomatoes', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } }
    ]
  },
  { 
    name: 'Onions', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 44, protein: 1.2, carbs: 10.3, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 } }
    ]
  },
  { 
    name: 'Mushrooms', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 15, protein: 2.2, carbs: 2.3, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 } }
    ]
  },
  { 
    name: 'Cucumber', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 16, protein: 0.7, carbs: 4, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 16, protein: 0.7, carbs: 4, fat: 0.2 } }
    ]
  },
  { 
    name: 'Zucchini', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 33, protein: 2.4, carbs: 6.1, fat: 0.6 } },
      { unit: 'g', amount: 100, macros: { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 } }
    ]
  },

  // STARCHY VEGETABLES
  { 
    name: 'White Potato', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 168, protein: 4.6, carbs: 37, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 77, protein: 2.1, carbs: 17, fat: 0.1 } }
    ]
  },
  { 
    name: 'Corn', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 132, protein: 4.7, carbs: 29, fat: 1.6 } },
      { unit: 'g', amount: 100, macros: { calories: 86, protein: 3.1, carbs: 19, fat: 1.1 } }
    ]
  },

  // MORE FRUITS
  { 
    name: 'Apple', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 } },
      { unit: 'g', amount: 100, macros: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 } }
    ]
  },
  { 
    name: 'Orange', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 } }
    ]
  },
  { 
    name: 'Strawberries', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 49, protein: 1, carbs: 12, fat: 0.5 } },
      { unit: 'g', amount: 100, macros: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 } }
    ]
  },
  { 
    name: 'Blueberries', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 84, protein: 1.1, carbs: 21, fat: 0.5 } },
      { unit: 'g', amount: 100, macros: { calories: 57, protein: 0.7, carbs: 14, fat: 0.3 } }
    ]
  },
  { 
    name: 'Grapes', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 62, protein: 0.6, carbs: 16, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 67, protein: 0.6, carbs: 17, fat: 0.2 } }
    ]
  },

  // MORE NUTS & SEEDS
  { 
    name: 'Walnuts', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5 } },
      { unit: 'g', amount: 100, macros: { calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2 } }
    ]
  },
  { 
    name: 'Cashews', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 157, protein: 5.2, carbs: 8.6, fat: 12.4 } },
      { unit: 'g', amount: 100, macros: { calories: 553, protein: 18.2, carbs: 30.2, fat: 43.8 } }
    ]
  },
  { 
    name: 'Peanuts', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 161, protein: 7.3, carbs: 4.6, fat: 14 } },
      { unit: 'g', amount: 100, macros: { calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2 } }
    ]
  },
  { 
    name: 'Chia Seeds', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 60, protein: 3, carbs: 5, fat: 4.5 } },
      { unit: 'g', amount: 100, macros: { calories: 486, protein: 17, carbs: 42, fat: 31 } }
    ]
  },
  { 
    name: 'Flax Seeds', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 37, protein: 1.3, carbs: 2, fat: 3 } },
      { unit: 'g', amount: 100, macros: { calories: 534, protein: 18, carbs: 29, fat: 42 } }
    ]
  },

  // MORE NUT BUTTERS & SPREADS
  { 
    name: 'Almond Butter', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 98, protein: 3.4, carbs: 3, fat: 8.9 } },
      { unit: 'g', amount: 100, macros: { calories: 614, protein: 21, carbs: 19, fat: 55 } }
    ]
  },
  { 
    name: 'Honey', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 64, protein: 0.1, carbs: 17.3, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 304, protein: 0.3, carbs: 82, fat: 0 } }
    ]
  },

  // MORE PROTEIN POWDERS & SUPPLEMENTS
  { 
    name: 'Casein Protein', 
    measurements: [
      { unit: 'scoop', amount: 1, macros: { calories: 110, protein: 24, carbs: 3, fat: 1 } },
      { unit: 'g', amount: 30, macros: { calories: 110, protein: 24, carbs: 3, fat: 1 } }
    ]
  },
  { 
    name: 'Plant Protein', 
    measurements: [
      { unit: 'scoop', amount: 1, macros: { calories: 100, protein: 20, carbs: 4, fat: 1.5 } },
      { unit: 'g', amount: 30, macros: { calories: 100, protein: 20, carbs: 4, fat: 1.5 } }
    ]
  },

  // BEANS & LEGUMES
  { 
    name: 'Black Beans', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 227, protein: 15, carbs: 41, fat: 0.9 } },
      { unit: 'g', amount: 100, macros: { calories: 132, protein: 8.7, carbs: 23.7, fat: 0.5 } }
    ]
  },
  { 
    name: 'Chickpeas', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 269, protein: 14.5, carbs: 45, fat: 4.3 } },
      { unit: 'g', amount: 100, macros: { calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6 } }
    ]
  },
  { 
    name: 'Lentils', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 230, protein: 18, carbs: 40, fat: 0.8 } },
      { unit: 'g', amount: 100, macros: { calories: 116, protein: 9, carbs: 20, fat: 0.4 } }
    ]
  },
  { 
    name: 'Kidney Beans', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 225, protein: 15, carbs: 40, fat: 0.9 } },
      { unit: 'g', amount: 100, macros: { calories: 127, protein: 8.7, carbs: 22.8, fat: 0.5 } }
    ]
  },

  // OILS & FATS
  { 
    name: 'Olive Oil', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 119, protein: 0, carbs: 0, fat: 13.5 } },
      { unit: 'g', amount: 100, macros: { calories: 884, protein: 0, carbs: 0, fat: 100 } }
    ]
  },
  { 
    name: 'Coconut Oil', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 121, protein: 0, carbs: 0, fat: 13.5 } },
      { unit: 'g', amount: 100, macros: { calories: 862, protein: 0, carbs: 0, fat: 100 } }
    ]
  },
  { 
    name: 'Butter', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 102, protein: 0.1, carbs: 0, fat: 11.5 } },
      { unit: 'g', amount: 100, macros: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81.1 } }
    ]
  },

  // COMMON SNACKS & TREATS
  { 
    name: 'Dark Chocolate (70%)', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 155, protein: 2.2, carbs: 12.9, fat: 10.8 } },
      { unit: 'g', amount: 100, macros: { calories: 546, protein: 7.8, carbs: 45.5, fat: 38.1 } }
    ]
  },
  { 
    name: 'Popcorn (Air-popped)', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 31, protein: 1, carbs: 6.2, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 387, protein: 12.9, carbs: 77.8, fat: 4.5 } }
    ]
  },
  { 
    name: 'Granola', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 471, protein: 10.1, carbs: 64, fat: 20.4 } },
      { unit: 'g', amount: 100, macros: { calories: 471, protein: 10.1, carbs: 64, fat: 20.4 } }
    ]
  },

  // FAST FOOD & RESTAURANT ITEMS
  { 
    name: 'McDonald\'s Big Mac', 
    measurements: [
      { unit: 'sandwich', amount: 1, macros: { calories: 550, protein: 25, carbs: 45, fat: 33 } }
    ]
  },
  { 
    name: 'McDonald\'s Fries (Medium)', 
    measurements: [
      { unit: 'serving', amount: 1, macros: { calories: 320, protein: 4, carbs: 43, fat: 15 } }
    ]
  },
  { 
    name: 'Chicken Caesar Salad', 
    measurements: [
      { unit: 'serving', amount: 1, macros: { calories: 450, protein: 35, carbs: 15, fat: 28 } }
    ]
  },
  { 
    name: 'Pizza Slice (Cheese)', 
    measurements: [
      { unit: 'slice', amount: 1, macros: { calories: 285, protein: 12, carbs: 36, fat: 10 } }
    ]
  },
  { 
    name: 'Burger (Beef Patty)', 
    measurements: [
      { unit: 'patty', amount: 1, macros: { calories: 250, protein: 20, carbs: 0, fat: 18 } }
    ]
  },
  { 
    name: 'Subway 6" Turkey Sub', 
    measurements: [
      { unit: 'sandwich', amount: 1, macros: { calories: 280, protein: 18, carbs: 46, fat: 3.5 } }
    ]
  },
  { 
    name: 'Chipotle Chicken Burrito Bowl', 
    measurements: [
      { unit: 'bowl', amount: 1, macros: { calories: 520, protein: 35, carbs: 45, fat: 18 } }
    ]
  },
  { 
    name: 'Starbucks Grande Latte', 
    measurements: [
      { unit: 'drink', amount: 1, macros: { calories: 190, protein: 13, carbs: 18, fat: 7 } }
    ]
  },

  // COMMON COOKING INGREDIENTS
  { 
    name: 'Garlic', 
    measurements: [
      { unit: 'clove', amount: 1, macros: { calories: 4, protein: 0.2, carbs: 1, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5 } }
    ]
  },
  { 
    name: 'Ginger', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 8, protein: 0.2, carbs: 1.8, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 80, protein: 1.8, carbs: 18, fat: 0.8 } }
    ]
  },
  { 
    name: 'Lemon Juice', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 4, protein: 0.1, carbs: 1.3, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 22, protein: 0.4, carbs: 6.9, fat: 0.2 } }
    ]
  },
  { 
    name: 'Soy Sauce', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 8, protein: 1.3, carbs: 0.8, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 53, protein: 8.5, carbs: 5.3, fat: 0 } }
    ]
  },

  // COMMON BEVERAGES
  { 
    name: 'Orange Juice', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 112, protein: 1.7, carbs: 26, fat: 0.5 } },
      { unit: 'g', amount: 100, macros: { calories: 45, protein: 0.7, carbs: 10.4, fat: 0.2 } }
    ]
  },
  { 
    name: 'Apple Juice', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 114, protein: 0.3, carbs: 28, fat: 0.3 } },
      { unit: 'g', amount: 100, macros: { calories: 46, protein: 0.1, carbs: 11.3, fat: 0.1 } }
    ]
  },
  { 
    name: 'Coconut Water', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 46, protein: 1.7, carbs: 9, fat: 0.5 } },
      { unit: 'g', amount: 100, macros: { calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2 } }
    ]
  },

  // CONDIMENTS & SAUCES
  { 
    name: 'Ketchup', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 15, protein: 0.4, carbs: 3.7, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 112, protein: 1.7, carbs: 27.4, fat: 0.1 } }
    ]
  },
  { 
    name: 'Mustard', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 3, protein: 0.4, carbs: 0.6, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 66, protein: 4, carbs: 4.9, fat: 4 } }
    ]
  },
  { 
    name: 'Mayonnaise', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 94, protein: 0.1, carbs: 0.1, fat: 10.3 } },
      { unit: 'g', amount: 100, macros: { calories: 680, protein: 1, carbs: 0.6, fat: 75 } }
    ]
  },
  { 
    name: 'Hot Sauce', 
    measurements: [
      { unit: 'tsp', amount: 1, macros: { calories: 1, protein: 0.1, carbs: 0.2, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 28, protein: 1.3, carbs: 6.1, fat: 0.3 } }
    ]
  },
  { 
    name: 'Tortilla Strips', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 130, protein: 2, carbs: 22, fat: 3.5 } },
      { unit: 'g', amount: 100, macros: { calories: 459, protein: 7.1, carbs: 78, fat: 12.4 } },
      { unit: 'cup', amount: 1, macros: { calories: 104, protein: 1.6, carbs: 17.6, fat: 2.8 } }
    ]
  },
  { 
    name: 'Pico De Gallo', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 4, protein: 0.1, carbs: 1, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 25, protein: 0.6, carbs: 6.2, fat: 0.2 } },
      { unit: 'cup', amount: 1, macros: { calories: 64, protein: 1.6, carbs: 15.9, fat: 0.5 } }
    ]
  },
  { 
    name: 'Lettuce', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 5, protein: 0.5, carbs: 1, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 15, protein: 1.4, carbs: 3, fat: 0.2 } },
      { unit: 'oz', amount: 1, macros: { calories: 4.3, protein: 0.4, carbs: 0.9, fat: 0.1 } }
    ]
  },
  { 
    name: 'Jalapeño Peppers', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 4, protein: 0.1, carbs: 1, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 29, protein: 0.9, carbs: 6.5, fat: 0.4 } },
      { unit: 'oz', amount: 1, macros: { calories: 8.2, protein: 0.3, carbs: 1.8, fat: 0.1 } }
    ]
  }
];

// Default macro targets (can be customized later)
const DEFAULT_TARGETS: MacroNutrients = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 67,
};

export const useNutritionStore = create<NutritionStore>((set, get) => ({
  selectedDate: new Date(),
  dailyNutrition: [],
  currentDayNutrition: null,
  personalizedTargets: null,
  loading: false,
  error: null,
  
  setSelectedDate: (date) => {
    set({ selectedDate: date });
    const { getDailyNutrition, dailyNutrition } = get();
    
    // Check if we already have data for this date
    const dateKey = getLocalDateKey(date);
    const existingDay = dailyNutrition.find(day => day.date === dateKey);
    
    if (existingDay) {
      // Use existing data
      set({ currentDayNutrition: existingDay });
    } else {
      // Create new day
      const dayNutrition = getDailyNutrition(date);
      set({ currentDayNutrition: dayNutrition });
    }
  },
  
  addFoodItem: async (foodData) => {
    try {
      const { selectedDate, getDailyNutrition } = get();
      const dayNutrition = getDailyNutrition(selectedDate);

      const sanitizedServingCount = Math.max(foodData.servingCount, 0);
      const baseMacros = foodData.macrosPerServing || { calories: 0, protein: 0, carbs: 0, fat: 0 };

      const newFoodItem: FoodItem = {
        ...foodData,
        id: foodData.id || generateUniqueId('food'),
        loggedAt: new Date(),
        totalMacros: {
          calories: baseMacros.calories * sanitizedServingCount,
          protein: baseMacros.protein * sanitizedServingCount,
          carbs: baseMacros.carbs * sanitizedServingCount,
          fat: baseMacros.fat * sanitizedServingCount,
        },
      };

      const dedupedFoods = dayNutrition.foods.filter((food) => food.id !== newFoodItem.id);
      const updatedFoods = [...dedupedFoods, newFoodItem].sort((a, b) => {
        const aTime = new Date(a.loggedAt).getTime();
        const bTime = new Date(b.loggedAt).getTime();
        return aTime - bTime;
      });

      const updatedDayNutrition: DailyNutrition = {
        ...dayNutrition,
        foods: updatedFoods,
        totalMacros: get().calculateDailyTotals(updatedFoods),
      };

      set((state) => {
        const existingIndex = state.dailyNutrition.findIndex((day) => day.date === updatedDayNutrition.date);
        const newDailyNutrition = existingIndex >= 0
          ? state.dailyNutrition.map((day, index) => (index === existingIndex ? updatedDayNutrition : day))
          : [...state.dailyNutrition, updatedDayNutrition];

        return {
          dailyNutrition: newDailyNutrition,
          currentDayNutrition: updatedDayNutrition,
        };
      });
    } catch (error) {
      console.error('Error adding food item:', error);
      throw error;
    }
  },
  
  addMeal: async (dateStr, mealType, mealData) => {
    try {
      console.log('🍽️ Adding meal to nutrition:', { dateStr, mealType, mealName: mealData.name });
      
      // Parse the date string to get the Date object
      const date = new Date(dateStr);
      
      // Create a food item from the meal data
      const newFoodItem: FoodItem = {
        id: mealData.id || generateUniqueId('meal'),
        name: mealData.name,
        servingSize: '1 serving',
        servingCount: 1,
        macrosPerServing: {
          calories: mealData.calories || mealData.macros?.calories || 0,
          protein: mealData.protein || mealData.macros?.protein || 0,
          carbs: mealData.carbs || mealData.macros?.carbs || 0,
          fat: mealData.fat || mealData.macros?.fat || 0,
        },
        totalMacros: {
          calories: mealData.calories || mealData.macros?.calories || 0,
          protein: mealData.protein || mealData.macros?.protein || 0,
          carbs: mealData.carbs || mealData.macros?.carbs || 0,
          fat: mealData.fat || mealData.macros?.fat || 0,
        },
        mealType: mealType,
        loggedAt: new Date(),
      };
      
      // Get or create daily nutrition for the target date
      const { getDailyNutrition } = get();
      const dayNutrition = getDailyNutrition(date);
      
      const updatedDayNutrition: DailyNutrition = {
        ...dayNutrition,
        foods: [...dayNutrition.foods, newFoodItem],
        totalMacros: get().calculateDailyTotals([...dayNutrition.foods, newFoodItem]),
      };
      
      set((state) => {
        const existingIndex = state.dailyNutrition.findIndex(day => day.date === updatedDayNutrition.date);
        const newDailyNutrition = existingIndex >= 0
          ? state.dailyNutrition.map((day, index) => index === existingIndex ? updatedDayNutrition : day)
          : [...state.dailyNutrition, updatedDayNutrition];

        return {
          dailyNutrition: newDailyNutrition,
          currentDayNutrition: updatedDayNutrition,
        };
      });
      
      console.log('✅ Meal added to nutrition successfully');
    } catch (error) {
      console.error('❌ Error adding meal:', error);
      throw error;
    }
  },
  
  updateFoodItem: (foodId, updates) => {
    const { selectedDate, getDailyNutrition } = get();
    const dayNutrition = getDailyNutrition(selectedDate);
    
    const updatedFoods = dayNutrition.foods.map(food => {
      if (food.id === foodId) {
        const updatedFood = { ...food, ...updates } as FoodItem;
        // Recalculate total macros if serving count or per-serving macros changed
        const servingCountToUse =
          updates.servingCount !== undefined ? updates.servingCount : food.servingCount;
        const macrosPerServingToUse = updates.macrosPerServing || food.macrosPerServing;
        if (updates.servingCount !== undefined || updates.macrosPerServing !== undefined) {
          updatedFood.totalMacros = {
            calories: macrosPerServingToUse.calories * servingCountToUse,
            protein: macrosPerServingToUse.protein * servingCountToUse,
            carbs: macrosPerServingToUse.carbs * servingCountToUse,
            fat: macrosPerServingToUse.fat * servingCountToUse,
          };
        }
        return updatedFood;
      }
      return food;
    });
    
    const updatedDayNutrition: DailyNutrition = {
      ...dayNutrition,
      foods: updatedFoods,
      totalMacros: get().calculateDailyTotals(updatedFoods),
    };
    
    set((state) => ({
      dailyNutrition: state.dailyNutrition.map(day => 
        day.date === updatedDayNutrition.date ? updatedDayNutrition : day
      ),
      currentDayNutrition: updatedDayNutrition,
    }));
  },
  
  removeFoodItem: async (foodId) => {
    const { selectedDate, getDailyNutrition } = get();
    const dayNutrition = getDailyNutrition(selectedDate);

    const foodToRemove = dayNutrition.foods.find(food => food.id === foodId);
    const mealType = foodToRemove?.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snacks' | undefined;

    // Deduct points if this food item earned points (only for personal users, not coaches)
    try {
      const { useUserStore } = await import('./userStore');
      const { usePointsStore } = await import('./pointsStore');
      const userState = useUserStore.getState();
      const profile = userState.profile;
      const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
      const uid = userState.userDoc?.id;

      if (uid && !isCoach) {
        await usePointsStore.getState().deductPoints(foodId, uid);
        console.log('✅ Points deducted for deleted food item');

        // If the meal was previously marked complete, revoke the completion points
        if (mealType && dayNutrition.completedMeals?.[mealType]) {
          const mealCompletionId = `${getLocalDateKey(selectedDate)}_${mealType}`;
          try {
            await usePointsStore.getState().deductPoints(mealCompletionId, uid);
            console.log('✅ Points deducted for meal completion reversal:', mealCompletionId);
          } catch (mealPointsError) {
            console.error('❌ Error deducting meal completion points:', mealPointsError);
          }
        }
      }
    } catch (pointsError) {
      console.error('❌ Error deducting points for food item:', pointsError);
      // Continue with deletion even if point deduction fails
    }

    const updatedFoods = dayNutrition.foods.filter(food => food.id !== foodId);

    const updatedCompletedMeals = {
      breakfast: dayNutrition.completedMeals?.breakfast ?? false,
      lunch: dayNutrition.completedMeals?.lunch ?? false,
      dinner: dayNutrition.completedMeals?.dinner ?? false,
      snacks: dayNutrition.completedMeals?.snacks ?? false,
    };

    if (mealType) {
      updatedCompletedMeals[mealType] = false;
    }

    const updatedDayNutrition: DailyNutrition = {
      ...dayNutrition,
      foods: updatedFoods,
      totalMacros: get().calculateDailyTotals(updatedFoods),
      completedMeals: updatedCompletedMeals,
    };

    set((state) => {
      const existingIndex = state.dailyNutrition.findIndex(day => day.date === updatedDayNutrition.date);
      const newDailyNutrition = existingIndex >= 0
        ? state.dailyNutrition.map((day, index) => index === existingIndex ? updatedDayNutrition : day)
        : [...state.dailyNutrition, updatedDayNutrition];

      return {
        dailyNutrition: newDailyNutrition,
        currentDayNutrition: updatedDayNutrition,
      };
    });

    // Persist updated completion state to Firebase
    try {
      const { useUserStore } = await import('./userStore');
      const userState = useUserStore.getState();
      const uid = userState.userDoc?.id;
      if (uid) {
        await nutritionFirebaseService.saveDailyNutrition(uid, updatedDayNutrition.date, {
          completedMeals: updatedCompletedMeals,
        } as any);

        // Refresh meta to ensure state stays in sync (particularly completion flags and points)
        await get().refreshDailyMeta(uid, selectedDate);
      }
    } catch (metaError) {
      console.error('❌ Error saving meal completion meta:', metaError);
    }
  },
  
  getDailyNutrition: (date) => {
    const { dailyNutrition, getTargets } = get();
    const dateString = getLocalDateKey(date);
    
    const existingDay = dailyNutrition.find(day => day.date === dateString);
    if (existingDay) {
      return existingDay;
    }
    
    // Create new day if doesn't exist - use personalized targets
    return {
      date: dateString,
      foods: [],
      totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      targetMacros: getTargets(),
      completedMeals: { breakfast: false, lunch: false, dinner: false, snacks: false },
    };
  },
  
  setPersonalizedTargets: (targets) => {
    console.log('🎯 Setting personalized macro targets:', targets);
    set({ personalizedTargets: targets });
    
    // Update all existing daily nutrition entries with new targets
    const { dailyNutrition } = get();
    const updatedDailyNutrition = dailyNutrition.map(day => ({
      ...day,
      targetMacros: targets,
    }));
    
    set({ dailyNutrition: updatedDailyNutrition });
    console.log('✅ Updated all daily nutrition entries with new targets');
  },

  refreshDailyMeta: async (uid, date) => {
    try {
      const dateStr = getLocalDateKey(date);
      const meta = await nutritionFirebaseService.loadDailyNutrition(uid, dateStr);
      if (!meta) return;

      const dayNutrition = get().getDailyNutrition(date);
      const updatedDay: DailyNutrition = {
        ...dayNutrition,
        completedMeals: meta.completedMeals || dayNutrition.completedMeals || { breakfast: false, lunch: false, dinner: false, snacks: false },
        macroChallengeCompleted: meta.macroChallengeCompleted ?? dayNutrition.macroChallengeCompleted,
        macroChallengeCheckedAt: meta.macroChallengeCheckedAt ?? dayNutrition.macroChallengeCheckedAt,
      };

      set((state) => ({
        dailyNutrition: state.dailyNutrition.some(d => d.date === dateStr)
          ? state.dailyNutrition.map(d => (d.date === dateStr ? updatedDay : d))
          : [...state.dailyNutrition, updatedDay],
        currentDayNutrition: getLocalDateKey(state.selectedDate) === dateStr ? updatedDay : state.currentDayNutrition,
      }));
    } catch (e) {
      console.warn('Failed to refresh daily meta:', e);
    }
  },
  
  getTargets: () => {
    const { personalizedTargets } = get();
    // Use personalized targets if available, otherwise use defaults
    return personalizedTargets || DEFAULT_TARGETS;
  },
  
  calculateDailyTotals: (foods) => {
    return foods.reduce(
      (totals, food) => ({
        calories: totals.calories + food.totalMacros.calories,
        protein: totals.protein + food.totalMacros.protein,
        carbs: totals.carbs + food.totalMacros.carbs,
        fat: totals.fat + food.totalMacros.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  },
  
  getFoodsByMeal: (mealType) => {
    const { currentDayNutrition } = get();
    if (!currentDayNutrition) return [];
    return currentDayNutrition.foods.filter(food => food.mealType === mealType);
  },

  // Firebase integration methods
  loadUserMealsFromFirebase: async (uid, date) => {
    try {
      set({ loading: true, error: null });
      
      console.log('Loading meals from Firebase...');
      const meals = await mealService.getMealsByDate(uid, date);
      const dateString = getLocalDateKey(date);
      const dailyMeta = await nutritionFirebaseService.loadDailyNutrition(uid, dateString).catch(() => null);
      const { getDailyNutrition } = get();
      const dayNutrition = getDailyNutrition(date);
      
      const foods: FoodItem[] = meals.map(meal => ({
        id: meal.id,
        name: meal.name,
        servingSize: meal.foods[0]?.unit || 'serving',
        servingCount: meal.foods[0]?.quantity || 1,
        macrosPerServing: {
          calories: meal.foods[0]?.macros.calories / (meal.foods[0]?.quantity || 1),
          protein: meal.foods[0]?.macros.protein / (meal.foods[0]?.quantity || 1),
          carbs: meal.foods[0]?.macros.carbs / (meal.foods[0]?.quantity || 1),
          fat: meal.foods[0]?.macros.fat / (meal.foods[0]?.quantity || 1),
        },
        mealType: meal.type,
        loggedAt: meal.mealTime,
        totalMacros: {
          calories: meal.foods[0]?.macros.calories || 0,
          protein: meal.foods[0]?.macros.protein || 0,
          carbs: meal.foods[0]?.macros.carbs || 0,
          fat: meal.foods[0]?.macros.fat || 0,
        },
      }));
      
      const updatedDayNutrition: DailyNutrition = {
        ...dayNutrition,
        foods,
        totalMacros: get().calculateDailyTotals(foods),
        completedMeals: dailyMeta?.completedMeals || dayNutrition.completedMeals || { breakfast: false, lunch: false, dinner: false, snacks: false },
      };
      
      set((state) => {
        const existingIndex = state.dailyNutrition.findIndex(day => day.date === updatedDayNutrition.date);
        const newDailyNutrition = existingIndex >= 0
          ? state.dailyNutrition.map((day, index) => index === existingIndex ? updatedDayNutrition : day)
          : [...state.dailyNutrition, updatedDayNutrition];

        return {
          dailyNutrition: newDailyNutrition,
          currentDayNutrition: updatedDayNutrition,
          loading: false,
        };
      });
      
      console.log(`Loaded ${foods.length} meals from Firebase`);
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  syncMealsToFirebase: async (uid, date) => {
    try {
      const { currentDayNutrition } = get();
      if (!currentDayNutrition) return;
      
      // Save each food item to Firebase
      for (const foodItem of currentDayNutrition.foods) {
        await nutritionFirebaseService.saveFoodItemToFirebase(foodItem as FirebaseFoodItem, uid);
      }
    } catch (error: any) {
      console.error('Error syncing meals to Firebase:', error);
      set({ error: 'Failed to sync meals to cloud' });
    }
  },

  saveMealToFirebase: async (food: FoodItem, uid: string) => {
    try {
      if (!uid) {
        console.log('No UID provided, skipping meal save');
        return;
      }

      console.log('🍽️ Saving meal to Firebase for user:', uid);
      console.log('📋 Meal details:', {
        name: food.name,
        mealType: food.mealType,
        calories: food.totalMacros.calories,
        protein: food.totalMacros.protein
      });

      await mealService.createMeal({
        id: food.id,
        uid: uid,
        name: food.name,
        type: food.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        macros: {
          calories: food.totalMacros.calories,
          protein: food.totalMacros.protein,
          carbs: food.totalMacros.carbs,
          fat: food.totalMacros.fat,
        },
        foods: [{
          id: food.id,
          name: food.name,
          quantity: food.servingCount,
          unit: food.servingSize,
          macros: {
            calories: food.totalMacros.calories,
            protein: food.totalMacros.protein,
            carbs: food.totalMacros.carbs,
            fat: food.totalMacros.fat,
          },
        }],
        mealTime: food.loggedAt,
        createdAt: food.loggedAt,
      });
      console.log('✅ Meal saved to Firebase successfully');
    } catch (error) {
      console.error('❌ Error saving meal to Firebase:', error);
      console.error('❌ Error details:', error.message);
    }
  },

  loadAllUserMealsFromFirebase: async (uid: string) => {
    try {
      console.log('🍽️ Loading all meals from Firebase for user:', uid);
      
      if (!uid) {
        console.error('❌ No UID provided for meal loading');
        return;
      }

      const meals = await mealService.getUserMeals(uid);
      console.log('📊 Raw Firebase meals received:', meals.length);

      if (!meals || meals.length === 0) {
        console.log('ℹ️ No meals found in Firebase for this user');
        set({ dailyNutrition: [] });
        // Clear local storage for users with no meals in Firebase
        persistenceService.saveNutritionData({ dailyNutrition: [] });
        console.log('🧹 Cleared local nutrition storage for user with no Firebase meals');
        return;
      }

      // Group meals by date
      const mealsByDate: Record<string, FoodItem[]> = {};
      
      meals.forEach(meal => {
        try {
          const dateString = getLocalDateKey(meal.mealTime);
          
          if (!mealsByDate[dateString]) {
            mealsByDate[dateString] = [];
          }

          // Convert meal to FoodItem format
          const foodItem: FoodItem = {
            id: meal.id,
            name: meal.name,
            servingSize: meal.foods[0]?.unit || 'serving',
            servingCount: meal.foods[0]?.quantity || 1,
            macrosPerServing: {
              calories: meal.foods[0]?.macros.calories / (meal.foods[0]?.quantity || 1),
              protein: meal.foods[0]?.macros.protein / (meal.foods[0]?.quantity || 1),
              carbs: meal.foods[0]?.macros.carbs / (meal.foods[0]?.quantity || 1),
              fat: meal.foods[0]?.macros.fat / (meal.foods[0]?.quantity || 1),
            },
            mealType: meal.type as 'breakfast' | 'lunch' | 'dinner' | 'snacks',
            loggedAt: meal.mealTime,
            totalMacros: {
              calories: meal.foods[0]?.macros.calories || 0,
              protein: meal.foods[0]?.macros.protein || 0,
              carbs: meal.foods[0]?.macros.carbs || 0,
              fat: meal.foods[0]?.macros.fat || 0,
            },
          };

          mealsByDate[dateString].push(foodItem);
        } catch (mealError) {
          console.error('❌ Error processing meal:', mealError, meal);
        }
      });

      // Convert to DailyNutrition format
      const dailyNutrition: DailyNutrition[] = Object.entries(mealsByDate).map(([date, foods]) => ({
        date,
        foods,
        totalMacros: get().calculateDailyTotals(foods),
        targetMacros: get().getTargets(), // Use personalized targets
        completedMeals: { breakfast: false, lunch: false, dinner: false, snacks: false },
      }));

      set({ dailyNutrition });
      console.log('✅ Successfully loaded meals from Firebase!');
      console.log('📋 Meals summary:', dailyNutrition.map(d => ({
        date: d.date,
        foodCount: d.foods.length,
        calories: d.totalMacros.calories
      })));

    } catch (error) {
      console.error('❌ Error loading meals from Firebase:', error);
      console.error('❌ Error details:', error.message);
    }
  },

  clearAllNutritionData: () => {
    console.log('🧹 Clearing all nutrition data from store and local storage');
    set({
      dailyNutrition: [],
      currentDayNutrition: null,
      selectedDate: new Date(),
      personalizedTargets: null,
    });
    // Clear from local storage
    persistenceService.saveNutritionData({ dailyNutrition: [] });
    console.log('✅ All nutrition data cleared');
  },

  // Macro Challenge - Awards 200 V for hitting calorie target within ±5%
  checkMacroChallengeForDate: async (date: Date, uid: string): Promise<boolean> => {
    try {
      const dateStr = getLocalDateKey(date);
      console.log('🎯 Checking macro challenge for date:', dateStr);

      // Get the day's nutrition data
      const dayNutrition = get().getDailyNutrition(date);

      // Check if challenge was already completed
      if (dayNutrition.macroChallengeCompleted) {
        console.log('✅ Macro challenge already completed for this date');
        return false;
      }

      // Check if it's a past date (only check past/current days, not future)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      
      if (checkDate > today) {
        console.log('⏭️ Cannot check macro challenge for future dates');
        return false;
      }

      // Get calorie targets
      const targetCalories = dayNutrition.targetMacros.calories;
      const actualCalories = dayNutrition.totalMacros.calories;

      // Calculate the 5% range
      const lowerBound = targetCalories * 0.95;
      const upperBound = targetCalories * 1.05;

      console.log('📊 Macro Challenge Check:', {
        target: targetCalories,
        actual: actualCalories,
        range: `${lowerBound.toFixed(0)} - ${upperBound.toFixed(0)}`,
        inRange: actualCalories >= lowerBound && actualCalories <= upperBound
      });

      // Check if calories are within ±5%
      if (actualCalories >= lowerBound && actualCalories <= upperBound) {
        console.log('🎉 Macro challenge completed! Awarding 200 V...');

        // Award 200 points
        const { addPoints } = await import('@/stores/pointsStore').then(m => m.usePointsStore.getState());
        await addPoints({
          type: 'macro_challenge',
          amount: 200,
          description: `Hit calorie target (${actualCalories.toFixed(0)}/${targetCalories} cal)`,
        }, uid);

        // Mark challenge as completed
        const updatedDailyNutrition = get().dailyNutrition.map(day => {
          if (day.date === dateStr) {
            return {
              ...day,
              macroChallengeCompleted: true,
              macroChallengeCheckedAt: new Date(),
            };
          }
          return day;
        });

        set({ dailyNutrition: updatedDailyNutrition });

        // Update current day if it's the selected date
        if (getLocalDateKey(get().selectedDate) === dateStr) {
          const updatedDay = updatedDailyNutrition.find(day => day.date === dateStr);
          if (updatedDay) {
            set({ currentDayNutrition: updatedDay });
          }
        }

        // Save to Firebase
        await nutritionFirebaseService.saveDailyNutrition(uid, dateStr, {
          macroChallengeCompleted: true,
          macroChallengeCheckedAt: new Date(),
        });

        console.log('✅ Macro challenge completed and saved!');
        return true;
      } else {
        console.log('❌ Macro challenge not met. Difference:', (actualCalories - targetCalories).toFixed(0), 'cal');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking macro challenge:', error);
      return false;
    }
  },

  // Check all pending macro challenges (runs on app startup or at midnight)
  checkAllPendingMacroChallenges: async (uid: string): Promise<void> => {
    try {
      console.log('🔄 Checking all pending macro challenges...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check each day in dailyNutrition that hasn't been checked yet
      for (const dayNutrition of get().dailyNutrition) {
        const dayDate = new Date(dayNutrition.date);
        dayDate.setHours(0, 0, 0, 0);

        // Only check past/current days that haven't been checked
        if (dayDate <= today && !dayNutrition.macroChallengeCompleted) {
          await get().checkMacroChallengeForDate(dayDate, uid);
        }
      }

      console.log('✅ All pending macro challenges checked');
    } catch (error) {
      console.error('❌ Error checking pending macro challenges:', error);
    }
  },

  setMealCompleted: async (date: Date, mealType, completed, uid) => {
    const dateStr = getLocalDateKey(date);
    const dayNutrition = get().getDailyNutrition(date);
    const updatedCompleted = {
      ...(dayNutrition.completedMeals || { breakfast: false, lunch: false, dinner: false, snacks: false }),
      [mealType]: completed,
    } as DailyNutrition['completedMeals'];

    const updatedDay: DailyNutrition = {
      ...dayNutrition,
      completedMeals: updatedCompleted,
    };

    set((state) => ({
      dailyNutrition: state.dailyNutrition.some(d => d.date === dateStr)
        ? state.dailyNutrition.map(d => (d.date === dateStr ? updatedDay : d))
        : [...state.dailyNutrition, updatedDay],
      currentDayNutrition: getLocalDateKey(state.selectedDate) === dateStr ? updatedDay : state.currentDayNutrition,
    }));

    // Save to Firebase if uid provided
    if (uid) {
      try {
        await nutritionFirebaseService.saveDailyNutrition(uid, dateStr, {
          completedMeals: updatedCompleted,
        } as any);
      } catch (e) {
        console.error('Error saving completedMeals to Firebase:', e);
      }
    }
  },

  autoCompletePendingMeals: async (uid) => {
    try {
      const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snacks'> = ['breakfast', 'lunch', 'dinner', 'snacks'];
      const todayKey = getLocalDateKey(new Date());
      const { dailyNutrition } = get();

      const daysToProcess = dailyNutrition.filter((day) => day.date && day.date < todayKey);
      if (!daysToProcess.length) {
        return;
      }

      let addPointsFn: ((entry: any, userId: string) => Promise<void>) | undefined;
      if (uid) {
        try {
          const pointsModule = await import('@/stores/pointsStore');
          addPointsFn = pointsModule.usePointsStore.getState().addPoints;
        } catch (error) {
          console.error('❌ Failed to load points store for auto completion:', error);
        }
      }

      for (const day of daysToProcess) {
        const dayDate = toDateSafe(day.date);
        if (!dayDate) {
          continue;
        }

        for (const mealType of mealTypes) {
          const alreadyCompleted = day.completedMeals?.[mealType] ?? false;
          if (alreadyCompleted) {
            continue;
          }

          const foodsForMeal = (day.foods || []).filter((food) => food.mealType === mealType);
          if (!foodsForMeal.length) {
            continue;
          }

          if (addPointsFn && uid) {
            const referenceId = `${day.date}_${mealType}`;
            await addPointsFn(
              {
                type: 'complete_meal',
                amount: 30,
                description: `Completed ${mealType} meal`,
                referenceId,
              },
              uid
            );
          }

          await get().setMealCompleted(dayDate, mealType, true, uid);
        }
      }
    } catch (error) {
      console.error('❌ Error auto-completing pending meals:', error);
    }
  },
}));

// Export food database for use in components
export { FOOD_DATABASE };
