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

export interface MicroNutrients {
  // Vitamins (in various units)
  vitaminA?: number; // mcg RAE
  vitaminC?: number; // mg
  vitaminD?: number; // mcg
  vitaminE?: number; // mg
  vitaminK?: number; // mcg
  thiamin?: number; // mg (B1)
  riboflavin?: number; // mg (B2)
  niacin?: number; // mg (B3)
  vitaminB6?: number; // mg
  folate?: number; // mcg (B9)
  vitaminB12?: number; // mcg
  
  // Minerals
  calcium?: number; // mg
  iron?: number; // mg
  magnesium?: number; // mg
  phosphorus?: number; // mg
  potassium?: number; // mg
  sodium?: number; // mg
  zinc?: number; // mg
  copper?: number; // mg
  manganese?: number; // mg
  selenium?: number; // mcg
  
  // Other
  fiber?: number; // g
  sugar?: number; // g
  cholesterol?: number; // mg
  saturatedFat?: number; // g
  transFat?: number; // g
}

export interface FoodItem {
  id: string;
  name: string;
  servingSize: string; // e.g., "100g", "1 cup", "1 piece"
  servingCount: number;
  macrosPerServing: MacroNutrients;
  totalMacros: MacroNutrients; // calculated: macrosPerServing * servingCount
  micronutrientsPerServing?: MicroNutrients; // per serving
  totalMicronutrients?: MicroNutrients; // calculated: micronutrientsPerServing * servingCount
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

export interface CustomMeal {
  id: string;
  userId: string; // User ID to ensure meals are user-specific
  name: string;
  servingSize: string;
  macrosPerServing: MacroNutrients;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string; // User ID who created this meal (for global meals)
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
  
  // Custom meals
  customMeals: CustomMeal[];
  
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
  
  // Custom meals
  addCustomMeal: (meal: Omit<CustomMeal, 'id' | 'createdAt'>, userId: string) => CustomMeal;
  updateCustomMeal: (id: string, updates: Partial<Omit<CustomMeal, 'id' | 'createdAt'>>, userId: string) => CustomMeal | null;
  removeCustomMeal: (id: string, userId: string) => void;
  loadCustomMeals: (userId: string) => Promise<void>;
  saveCustomMeals: (userId: string) => Promise<void>;
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
      { 
        unit: 'oz', 
        amount: 1, 
        macros: { calories: 46.7, protein: 8.8, carbs: 0, fat: 1.0 },
        micronutrients: {
          vitaminB6: 0.3, niacin: 4.9, phosphorus: 180, selenium: 12.8, zinc: 0.4,
          potassium: 220, sodium: 74, cholesterol: 24, saturatedFat: 0.3
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        micronutrients: {
          vitaminB6: 1.0, niacin: 17.3, phosphorus: 635, selenium: 45.2, zinc: 1.4,
          potassium: 777, sodium: 262, cholesterol: 85, saturatedFat: 1.0
        }
      },
      { 
        unit: 'lb', 
        amount: 1, 
        macros: { calories: 747, protein: 140.6, carbs: 0, fat: 16.3 },
        micronutrients: {
          vitaminB6: 4.5, niacin: 78.5, phosphorus: 2880, selenium: 205, zinc: 6.4,
          potassium: 3525, sodium: 1188, cholesterol: 385, saturatedFat: 4.5
        }
      }
    ]
  },
  { 
    name: 'Brown Rice', 
    measurements: [
      { 
        unit: 'cup', 
        amount: 1, 
        macros: { calories: 216, protein: 5, carbs: 45, fat: 1.8 },
        micronutrients: {
          thiamin: 0.2, niacin: 3.0, vitaminB6: 0.3, folate: 8, magnesium: 84,
          phosphorus: 162, potassium: 84, zinc: 1.2, manganese: 1.8, selenium: 19.1,
          fiber: 3.5
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
        micronutrients: {
          thiamin: 0.1, niacin: 1.5, vitaminB6: 0.2, folate: 4, magnesium: 43,
          phosphorus: 83, potassium: 43, zinc: 0.6, manganese: 0.9, selenium: 9.8,
          fiber: 1.8
        }
      },
      { 
        unit: 'oz', 
        amount: 1, 
        macros: { calories: 31.5, protein: 0.7, carbs: 6.5, fat: 0.3 },
        micronutrients: {
          thiamin: 0.03, niacin: 0.4, vitaminB6: 0.05, folate: 1, magnesium: 12,
          phosphorus: 24, potassium: 12, zinc: 0.2, manganese: 0.3, selenium: 2.8,
          fiber: 0.5
        }
      }
    ]
  },
  { 
    name: 'Oats', 
    measurements: [
      { 
        unit: 'cup', 
        amount: 1, 
        macros: { calories: 307, protein: 13.4, carbs: 52.3, fat: 5.5 },
        micronutrients: {
          thiamin: 0.5, riboflavin: 0.1, niacin: 0.9, vitaminB6: 0.1, folate: 32,
          calcium: 54, iron: 3.4, magnesium: 166, phosphorus: 523, potassium: 304,
          zinc: 3.1, manganese: 3.6, selenium: 13.2, fiber: 8.2
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
        micronutrients: {
          thiamin: 0.6, riboflavin: 0.1, niacin: 1.1, vitaminB6: 0.1, folate: 41,
          calcium: 68, iron: 4.3, magnesium: 210, phosphorus: 662, potassium: 385,
          zinc: 3.9, manganese: 4.6, selenium: 16.7, fiber: 10.4
        }
      },
      { 
        unit: 'tbsp', 
        amount: 1, 
        macros: { calories: 19.2, protein: 0.8, carbs: 3.3, fat: 0.3 },
        micronutrients: {
          thiamin: 0.03, riboflavin: 0.01, niacin: 0.05, vitaminB6: 0.005, folate: 2,
          calcium: 3, iron: 0.2, magnesium: 8, phosphorus: 26, potassium: 15,
          zinc: 0.2, manganese: 0.2, selenium: 0.7, fiber: 0.5
        }
      }
    ]
  },
  { 
    name: 'Eggs', 
    measurements: [
      { 
        unit: 'large', 
        amount: 1, 
        macros: { calories: 70, protein: 6, carbs: 0.6, fat: 5 },
        micronutrients: {
          vitaminA: 80, vitaminD: 1.1, vitaminE: 0.5, vitaminK: 0.2,
          thiamin: 0.02, riboflavin: 0.23, niacin: 0.04, vitaminB6: 0.09, folate: 24, vitaminB12: 0.6,
          calcium: 28, iron: 0.9, magnesium: 6, phosphorus: 99, potassium: 69, sodium: 71,
          zinc: 0.6, selenium: 15.4, cholesterol: 186, saturatedFat: 1.6
        }
      },
      { 
        unit: 'medium', 
        amount: 1, 
        macros: { calories: 63, protein: 5.5, carbs: 0.5, fat: 4.4 },
        micronutrients: {
          vitaminA: 72, vitaminD: 1.0, vitaminE: 0.5, vitaminK: 0.2,
          thiamin: 0.02, riboflavin: 0.21, niacin: 0.04, vitaminB6: 0.08, folate: 22, vitaminB12: 0.5,
          calcium: 25, iron: 0.8, magnesium: 5, phosphorus: 89, potassium: 62, sodium: 64,
          zinc: 0.5, selenium: 13.9, cholesterol: 167, saturatedFat: 1.4
        }
      },
      { 
        unit: 'small', 
        amount: 1, 
        macros: { calories: 54, protein: 4.7, carbs: 0.4, fat: 3.7 },
        micronutrients: {
          vitaminA: 62, vitaminD: 0.9, vitaminE: 0.4, vitaminK: 0.2,
          thiamin: 0.02, riboflavin: 0.18, niacin: 0.03, vitaminB6: 0.07, folate: 19, vitaminB12: 0.4,
          calcium: 22, iron: 0.7, magnesium: 5, phosphorus: 76, potassium: 53, sodium: 55,
          zinc: 0.5, selenium: 11.9, cholesterol: 143, saturatedFat: 1.2
        }
      }
    ]
  },
  { 
    name: 'Greek Yogurt', 
    measurements: [
      { 
        unit: 'cup', 
        amount: 1, 
        macros: { calories: 100, protein: 17, carbs: 6, fat: 0.7 },
        micronutrients: {
          vitaminB12: 1.3, riboflavin: 0.3, calcium: 200, phosphorus: 240, potassium: 240,
          zinc: 0.9, selenium: 18.5, sodium: 36, cholesterol: 5, saturatedFat: 0.1
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
        micronutrients: {
          vitaminB12: 0.8, riboflavin: 0.2, calcium: 118, phosphorus: 142, potassium: 142,
          zinc: 0.5, selenium: 10.9, sodium: 21, cholesterol: 3, saturatedFat: 0.1
        }
      },
      { 
        unit: 'container', 
        amount: 1, 
        macros: { calories: 150, protein: 25.5, carbs: 9, fat: 1.1 },
        micronutrients: {
          vitaminB12: 2.0, riboflavin: 0.5, calcium: 300, phosphorus: 360, potassium: 360,
          zinc: 1.4, selenium: 27.8, sodium: 54, cholesterol: 8, saturatedFat: 0.2
        }
      }
    ]
  },
  { 
    name: 'Peanut Butter', 
    measurements: [
      { 
        unit: 'tbsp', 
        amount: 1, 
        macros: { calories: 94, protein: 4, carbs: 3.2, fat: 8 },
        micronutrients: {
          niacin: 4.2, vitaminE: 1.9, folate: 24, magnesium: 49, phosphorus: 107,
          potassium: 180, zinc: 0.9, manganese: 0.4, selenium: 1.8, fiber: 1.0,
          saturatedFat: 1.6
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 588, protein: 25, carbs: 20, fat: 50 },
        micronutrients: {
          niacin: 26.2, vitaminE: 11.9, folate: 150, magnesium: 306, phosphorus: 669,
          potassium: 1125, zinc: 5.6, manganese: 2.5, selenium: 11.3, fiber: 6.2,
          saturatedFat: 10.0
        }
      },
      { 
        unit: 'oz', 
        amount: 1, 
        macros: { calories: 166.7, protein: 7.1, carbs: 5.7, fat: 14.2 },
        micronutrients: {
          niacin: 7.4, vitaminE: 3.4, folate: 43, magnesium: 87, phosphorus: 190,
          potassium: 319, zinc: 1.6, manganese: 0.7, selenium: 3.2, fiber: 1.8,
          saturatedFat: 2.8
        }
      }
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
      { 
        unit: 'medium', 
        amount: 1, 
        macros: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
        micronutrients: {
          vitaminC: 10.3, vitaminB6: 0.4, folate: 24, potassium: 422, magnesium: 32,
          manganese: 0.3, fiber: 3.1, sugar: 14.4
        }
      },
      { 
        unit: 'large', 
        amount: 1, 
        macros: { calories: 121, protein: 1.5, carbs: 31, fat: 0.4 },
        micronutrients: {
          vitaminC: 11.9, vitaminB6: 0.5, folate: 28, potassium: 487, magnesium: 37,
          manganese: 0.4, fiber: 3.5, sugar: 16.6
        }
      },
      { 
        unit: 'small', 
        amount: 1, 
        macros: { calories: 90, protein: 1.1, carbs: 23, fat: 0.3 },
        micronutrients: {
          vitaminC: 8.7, vitaminB6: 0.4, folate: 20, potassium: 362, magnesium: 27,
          manganese: 0.3, fiber: 2.6, sugar: 12.2
        }
      }
    ]
  },
  { 
    name: 'Almonds', 
    measurements: [
      { 
        unit: 'oz', 
        amount: 1, 
        macros: { calories: 164, protein: 6, carbs: 6.2, fat: 14.2 },
        micronutrients: {
          vitaminE: 7.3, riboflavin: 0.3, niacin: 1.0, folate: 14, calcium: 76,
          magnesium: 76, phosphorus: 137, potassium: 208, zinc: 0.9, manganese: 0.6,
          fiber: 3.5, saturatedFat: 1.1
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 579, protein: 21, carbs: 22, fat: 50 },
        micronutrients: {
          vitaminE: 25.6, riboflavin: 1.1, niacin: 3.6, folate: 49, calcium: 269,
          magnesium: 269, phosphorus: 484, potassium: 733, zinc: 3.1, manganese: 2.2,
          fiber: 12.5, saturatedFat: 3.8
        }
      },
      { 
        unit: 'cup', 
        amount: 1, 
        macros: { calories: 529, protein: 19.2, carbs: 20.1, fat: 45.7 },
        micronutrients: {
          vitaminE: 23.4, riboflavin: 1.0, niacin: 3.3, folate: 45, calcium: 246,
          magnesium: 246, phosphorus: 442, potassium: 670, zinc: 2.8, manganese: 2.0,
          fiber: 11.4, saturatedFat: 3.5
        }
      }
    ]
  },
  { 
    name: 'Salmon', 
    measurements: [
      { 
        unit: 'oz', 
        amount: 1, 
        macros: { calories: 59, protein: 7.1, carbs: 0, fat: 3.4 },
        micronutrients: {
          vitaminB12: 2.4, niacin: 3.8, vitaminB6: 0.4, vitaminD: 11.1, selenium: 13.5,
          phosphorus: 178, potassium: 106, sodium: 37, cholesterol: 23, saturatedFat: 0.6
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 208, protein: 25, carbs: 0, fat: 12 },
        micronutrients: {
          vitaminB12: 8.5, niacin: 13.4, vitaminB6: 1.4, vitaminD: 39.2, selenium: 47.6,
          phosphorus: 628, potassium: 374, sodium: 131, cholesterol: 81, saturatedFat: 2.1
        }
      },
      { 
        unit: 'fillet', 
        amount: 1, 
        macros: { calories: 280, protein: 33.6, carbs: 0, fat: 16.1 },
        micronutrients: {
          vitaminB12: 11.4, niacin: 18.0, vitaminB6: 1.9, vitaminD: 52.7, selenium: 64.0,
          phosphorus: 844, potassium: 503, sodium: 176, cholesterol: 109, saturatedFat: 2.8
        }
      }
    ]
  },
  { 
    name: 'Sweet Potato', 
    measurements: [
      { 
        unit: 'medium', 
        amount: 1, 
        macros: { calories: 103, protein: 1.9, carbs: 24, fat: 0.1 },
        micronutrients: {
          vitaminA: 1840, vitaminC: 22.7, vitaminB6: 0.3, potassium: 542, manganese: 0.6,
          fiber: 3.8, sugar: 7.4
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
        micronutrients: {
          vitaminA: 1533, vitaminC: 18.9, vitaminB6: 0.3, potassium: 452, manganese: 0.5,
          fiber: 3.2, sugar: 6.2
        }
      },
      { 
        unit: 'cup', 
        amount: 1, 
        macros: { calories: 114, protein: 2.1, carbs: 26.6, fat: 0.1 },
        micronutrients: {
          vitaminA: 2037, vitaminC: 25.1, vitaminB6: 0.3, potassium: 600, manganese: 0.7,
          fiber: 4.2, sugar: 8.2
        }
      }
    ]
  },
  { 
    name: 'Broccoli', 
    measurements: [
      { 
        unit: 'cup', 
        amount: 1, 
        macros: { calories: 31, protein: 2.5, carbs: 6, fat: 0.3 },
        micronutrients: {
          vitaminA: 567, vitaminC: 81.2, vitaminK: 92.5, folate: 57, potassium: 288,
          manganese: 0.2, fiber: 2.3
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
        micronutrients: {
          vitaminA: 623, vitaminC: 89.2, vitaminK: 101.6, folate: 63, potassium: 316,
          manganese: 0.2, fiber: 2.6
        }
      },
      { 
        unit: 'oz', 
        amount: 1, 
        macros: { calories: 9.6, protein: 0.8, carbs: 2, fat: 0.1 },
        micronutrients: {
          vitaminA: 177, vitaminC: 25.3, vitaminK: 28.8, folate: 18, potassium: 90,
          manganese: 0.06, fiber: 0.7
        }
      }
    ]
  },
  { 
    name: 'Avocado', 
    measurements: [
      { 
        unit: 'medium', 
        amount: 1, 
        macros: { calories: 240, protein: 3, carbs: 13, fat: 22 },
        micronutrients: {
          vitaminK: 21, folate: 81, vitaminC: 10, vitaminE: 3.1, potassium: 708,
          magnesium: 29, fiber: 10, saturatedFat: 3.1
        }
      },
      { 
        unit: 'g', 
        amount: 100, 
        macros: { calories: 160, protein: 2, carbs: 9, fat: 15 },
        micronutrients: {
          vitaminK: 14, folate: 54, vitaminC: 7, vitaminE: 2.1, potassium: 472,
          magnesium: 19, fiber: 7, saturatedFat: 2.1
        }
      },
      { 
        unit: 'cup', 
        amount: 1, 
        macros: { calories: 384, protein: 4.8, carbs: 21.6, fat: 36 },
        micronutrients: {
          vitaminK: 50, folate: 194, vitaminC: 17, vitaminE: 7.4, potassium: 1700,
          magnesium: 70, fiber: 17, saturatedFat: 5.0
        }
      }
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
  },

  // ADDITIONAL PROTEINS
  { 
    name: 'Turkey Breast', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 44, protein: 9.4, carbs: 0, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 155, protein: 33, carbs: 0, fat: 1.4 } },
      { unit: 'slice', amount: 1, macros: { calories: 22, protein: 4.7, carbs: 0, fat: 0.2 } }
    ]
  },
  { 
    name: 'Ground Chicken', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 52, protein: 6.4, carbs: 0, fat: 2.8 } },
      { unit: 'g', amount: 100, macros: { calories: 183, protein: 22.6, carbs: 0, fat: 9.9 } }
    ]
  },
  { 
    name: 'Lamb', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 75, protein: 7.1, carbs: 0, fat: 5 } },
      { unit: 'g', amount: 100, macros: { calories: 265, protein: 25, carbs: 0, fat: 17.6 } }
    ]
  },
  { 
    name: 'Pork Chop', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 69, protein: 8.9, carbs: 0, fat: 3.6 } },
      { unit: 'g', amount: 100, macros: { calories: 243, protein: 31.4, carbs: 0, fat: 12.6 } }
    ]
  },
  { 
    name: 'Duck Breast', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 67, protein: 7.1, carbs: 0, fat: 3.9 } },
      { unit: 'g', amount: 100, macros: { calories: 236, protein: 25, carbs: 0, fat: 13.8 } }
    ]
  },
  { 
    name: 'Bison', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 46, protein: 8.9, carbs: 0, fat: 1.1 } },
      { unit: 'g', amount: 100, macros: { calories: 162, protein: 31.4, carbs: 0, fat: 3.9 } }
    ]
  },
  { 
    name: 'Halibut', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 30, protein: 6.4, carbs: 0, fat: 0.7 } },
      { unit: 'g', amount: 100, macros: { calories: 106, protein: 22.6, carbs: 0, fat: 2.5 } }
    ]
  },
  { 
    name: 'Tilapia', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 27, protein: 5.7, carbs: 0, fat: 0.7 } },
      { unit: 'g', amount: 100, macros: { calories: 96, protein: 20, carbs: 0, fat: 2.5 } }
    ]
  },
  { 
    name: 'Sardines', 
    measurements: [
      { unit: 'can', amount: 1, macros: { calories: 191, protein: 22.7, carbs: 0, fat: 10.5 } },
      { unit: 'oz', amount: 1, macros: { calories: 59, protein: 7, carbs: 0, fat: 3.3 } }
    ]
  },
  { 
    name: 'Mackerel', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 62, protein: 7.1, carbs: 0, fat: 3.6 } },
      { unit: 'g', amount: 100, macros: { calories: 219, protein: 25, carbs: 0, fat: 12.6 } }
    ]
  },
  { 
    name: 'Scallops', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 26, protein: 5.7, carbs: 1.4, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 92, protein: 20, carbs: 5, fat: 0.7 } }
    ]
  },
  { 
    name: 'Crab', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 23, protein: 4.6, carbs: 0, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 81, protein: 16.2, carbs: 0, fat: 1.4 } }
    ]
  },
  { 
    name: 'Lobster', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 24, protein: 5.1, carbs: 0.3, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 85, protein: 18, carbs: 1.1, fat: 0.7 } }
    ]
  },
  { 
    name: 'Mussels', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 21, protein: 3.2, carbs: 1.1, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 74, protein: 11.3, carbs: 3.9, fat: 1.4 } }
    ]
  },

  // MORE DAIRY & DAIRY ALTERNATIVES
  { 
    name: 'Milk (Whole)', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 149, protein: 8, carbs: 12, fat: 8 } },
      { unit: 'g', amount: 100, macros: { calories: 61, protein: 3.3, carbs: 4.9, fat: 3.3 } }
    ]
  },
  { 
    name: 'Milk (Skim)', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 83, protein: 8.3, carbs: 12, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 34, protein: 3.4, carbs: 4.9, fat: 0.1 } }
    ]
  },
  { 
    name: 'Almond Milk (Unsweetened)', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 30, protein: 1, carbs: 1, fat: 2.5 } },
      { unit: 'g', amount: 100, macros: { calories: 15, protein: 0.5, carbs: 0.5, fat: 1.3 } }
    ]
  },
  { 
    name: 'Soy Milk', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 80, protein: 7, carbs: 4, fat: 4 } },
      { unit: 'g', amount: 100, macros: { calories: 33, protein: 2.9, carbs: 1.7, fat: 1.7 } }
    ]
  },
  { 
    name: 'Coconut Milk', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 445, protein: 4.6, carbs: 6.4, fat: 48 } },
      { unit: 'g', amount: 100, macros: { calories: 230, protein: 2.3, carbs: 3.3, fat: 24 } }
    ]
  },
  { 
    name: 'Mozzarella Cheese', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 71, protein: 6.3, carbs: 0.6, fat: 5 } },
      { unit: 'g', amount: 100, macros: { calories: 250, protein: 22.2, carbs: 2.1, fat: 17.6 } }
    ]
  },
  { 
    name: 'Feta Cheese', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 75, protein: 4, carbs: 1.2, fat: 6 } },
      { unit: 'g', amount: 100, macros: { calories: 265, protein: 14.2, carbs: 4.2, fat: 21.2 } }
    ]
  },
  { 
    name: 'Swiss Cheese', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 106, protein: 7.7, carbs: 1.1, fat: 7.9 } },
      { unit: 'g', amount: 100, macros: { calories: 374, protein: 27.2, carbs: 3.9, fat: 27.9 } }
    ]
  },
  { 
    name: 'Parmesan Cheese', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 111, protein: 10, carbs: 0.9, fat: 7.3 } },
      { unit: 'g', amount: 100, macros: { calories: 392, protein: 35.3, carbs: 3.2, fat: 25.8 } }
    ]
  },
  { 
    name: 'Ricotta Cheese', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 216, protein: 14, carbs: 7.8, fat: 16 } },
      { unit: 'g', amount: 100, macros: { calories: 174, protein: 11.3, carbs: 6.3, fat: 12.9 } }
    ]
  },
  { 
    name: 'Sour Cream', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 23, protein: 0.4, carbs: 0.9, fat: 2.3 } },
      { unit: 'g', amount: 100, macros: { calories: 198, protein: 2.4, carbs: 4.6, fat: 19.7 } }
    ]
  },
  { 
    name: 'Cream Cheese', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 99, protein: 1.8, carbs: 1.1, fat: 9.8 } },
      { unit: 'g', amount: 100, macros: { calories: 349, protein: 6.4, carbs: 3.9, fat: 34.6 } }
    ]
  },

  // MORE GRAINS & CARBS
  { 
    name: 'Barley', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 193, protein: 3.6, carbs: 44, fat: 0.7 } },
      { unit: 'g', amount: 100, macros: { calories: 123, protein: 2.3, carbs: 28, fat: 0.4 } }
    ]
  },
  { 
    name: 'Bulgur', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 151, protein: 5.6, carbs: 34, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 83, protein: 3.1, carbs: 18.7, fat: 0.2 } }
    ]
  },
  { 
    name: 'Farro', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 200, protein: 8, carbs: 44, fat: 1 } },
      { unit: 'g', amount: 100, macros: { calories: 120, protein: 4.8, carbs: 26.4, fat: 0.6 } }
    ]
  },
  { 
    name: 'Buckwheat', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 155, protein: 5.7, carbs: 33, fat: 1 } },
      { unit: 'g', amount: 100, macros: { calories: 92, protein: 3.4, carbs: 19.6, fat: 0.6 } }
    ]
  },
  { 
    name: 'Wild Rice', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 166, protein: 6.5, carbs: 35, fat: 0.6 } },
      { unit: 'g', amount: 100, macros: { calories: 101, protein: 4, carbs: 21.3, fat: 0.4 } }
    ]
  },
  { 
    name: 'Bagel', 
    measurements: [
      { unit: 'regular', amount: 1, macros: { calories: 245, protein: 9.6, carbs: 48, fat: 1.5 } },
      { unit: 'mini', amount: 1, macros: { calories: 72, protein: 2.8, carbs: 14, fat: 0.4 } }
    ]
  },
  { 
    name: 'English Muffin', 
    measurements: [
      { unit: 'muffin', amount: 1, macros: { calories: 134, protein: 4.4, carbs: 26, fat: 1 } },
      { unit: 'g', amount: 100, macros: { calories: 235, protein: 7.7, carbs: 45.6, fat: 1.8 } }
    ]
  },
  { 
    name: 'Tortilla (Flour)', 
    measurements: [
      { unit: 'large', amount: 1, macros: { calories: 146, protein: 4, carbs: 24, fat: 3.7 } },
      { unit: 'small', amount: 1, macros: { calories: 94, protein: 2.6, carbs: 15.5, fat: 2.4 } }
    ]
  },
  { 
    name: 'Tortilla (Corn)', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 62, protein: 1.6, carbs: 13, fat: 0.8 } },
      { unit: 'g', amount: 100, macros: { calories: 218, protein: 5.7, carbs: 45.7, fat: 2.8 } }
    ]
  },
  { 
    name: 'Pita Bread', 
    measurements: [
      { unit: 'large', amount: 1, macros: { calories: 165, protein: 5.5, carbs: 33, fat: 0.7 } },
      { unit: 'small', amount: 1, macros: { calories: 82, protein: 2.8, carbs: 16.5, fat: 0.4 } }
    ]
  },
  { 
    name: 'Couscous', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 176, protein: 6, carbs: 36, fat: 0.3 } },
      { unit: 'g', amount: 100, macros: { calories: 112, protein: 3.8, carbs: 23.2, fat: 0.2 } }
    ]
  },

  // MORE VEGETABLES
  { 
    name: 'Asparagus', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 27, protein: 2.9, carbs: 5.2, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1 } }
    ]
  },
  { 
    name: 'Brussels Sprouts', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 38, protein: 3, carbs: 8, fat: 0.3 } },
      { unit: 'g', amount: 100, macros: { calories: 43, protein: 3.4, carbs: 9, fat: 0.3 } }
    ]
  },
  { 
    name: 'Cauliflower', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 25, protein: 2, carbs: 5, fat: 0.3 } },
      { unit: 'g', amount: 100, macros: { calories: 25, protein: 1.9, carbs: 5, fat: 0.3 } }
    ]
  },
  { 
    name: 'Cabbage', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 22, protein: 1.1, carbs: 5, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 25, protein: 1.3, carbs: 6, fat: 0.1 } }
    ]
  },
  { 
    name: 'Eggplant', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 20, protein: 0.8, carbs: 5, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 25, protein: 1, carbs: 6, fat: 0.2 } }
    ]
  },
  { 
    name: 'Green Beans', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 31, protein: 1.8, carbs: 7, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 31, protein: 1.8, carbs: 7, fat: 0.2 } }
    ]
  },
  { 
    name: 'Peas', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 118, protein: 7.9, carbs: 21, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 81, protein: 5.4, carbs: 14.4, fat: 0.3 } }
    ]
  },
  { 
    name: 'Artichoke', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 60, protein: 4.2, carbs: 13, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 47, protein: 3.3, carbs: 10.3, fat: 0.2 } }
    ]
  },
  { 
    name: 'Arugula', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 5, protein: 0.5, carbs: 0.7, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 25, protein: 2.6, carbs: 3.7, fat: 0.7 } }
    ]
  },
  { 
    name: 'Romaine Lettuce', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 8, protein: 0.6, carbs: 1.5, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 17, protein: 1.2, carbs: 3.3, fat: 0.3 } }
    ]
  },
  { 
    name: 'Radish', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 1, protein: 0.1, carbs: 0.2, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 16, protein: 0.7, carbs: 3.4, fat: 0.1 } }
    ]
  },
  { 
    name: 'Celery', 
    measurements: [
      { unit: 'stalk', amount: 1, macros: { calories: 6, protein: 0.3, carbs: 1.2, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 16, protein: 0.7, carbs: 3, fat: 0.2 } }
    ]
  },
  { 
    name: 'Beets', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 35, protein: 1.3, carbs: 8, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 43, protein: 1.6, carbs: 10, fat: 0.2 } }
    ]
  },
  { 
    name: 'Turnips', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 36, protein: 1.1, carbs: 8, fat: 0.1 } },
      { unit: 'g', amount: 100, macros: { calories: 28, protein: 0.9, carbs: 6.4, fat: 0.1 } }
    ]
  },

  // MORE FRUITS
  { 
    name: 'Grapefruit', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 52, protein: 1, carbs: 13, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 42, protein: 0.8, carbs: 10.7, fat: 0.1 } }
    ]
  },
  { 
    name: 'Pineapple', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 82, protein: 0.9, carbs: 22, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 50, protein: 0.5, carbs: 13.1, fat: 0.1 } }
    ]
  },
  { 
    name: 'Mango', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 135, protein: 1, carbs: 35, fat: 0.6 } },
      { unit: 'cup', amount: 1, macros: { calories: 99, protein: 0.8, carbs: 25, fat: 0.4 } }
    ]
  },
  { 
    name: 'Peach', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 58, protein: 1.4, carbs: 14, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 39, protein: 0.9, carbs: 9.5, fat: 0.3 } }
    ]
  },
  { 
    name: 'Pear', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 101, protein: 0.7, carbs: 27, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 57, protein: 0.4, carbs: 15.2, fat: 0.1 } }
    ]
  },
  { 
    name: 'Plum', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 30, protein: 0.5, carbs: 7.5, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 46, protein: 0.7, carbs: 11.4, fat: 0.3 } }
    ]
  },
  { 
    name: 'Cherries', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 77, protein: 1.6, carbs: 19, fat: 0.3 } },
      { unit: 'g', amount: 100, macros: { calories: 63, protein: 1, carbs: 16, fat: 0.2 } }
    ]
  },
  { 
    name: 'Kiwi', 
    measurements: [
      { unit: 'medium', amount: 1, macros: { calories: 42, protein: 0.8, carbs: 10, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5 } }
    ]
  },
  { 
    name: 'Pomegranate', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 83, protein: 1.5, carbs: 19, fat: 1.2 } },
      { unit: 'g', amount: 100, macros: { calories: 83, protein: 1.7, carbs: 19, fat: 1.2 } }
    ]
  },
  { 
    name: 'Watermelon', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 46, protein: 0.9, carbs: 12, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 } }
    ]
  },
  { 
    name: 'Cantaloupe', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 53, protein: 1.3, carbs: 13, fat: 0.3 } },
      { unit: 'g', amount: 100, macros: { calories: 34, protein: 0.8, carbs: 8.2, fat: 0.2 } }
    ]
  },
  { 
    name: 'Papaya', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 62, protein: 0.7, carbs: 16, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 43, protein: 0.5, carbs: 11, fat: 0.3 } }
    ]
  },
  { 
    name: 'Blackberries', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 62, protein: 2, carbs: 14, fat: 0.7 } },
      { unit: 'g', amount: 100, macros: { calories: 43, protein: 1.4, carbs: 9.6, fat: 0.5 } }
    ]
  },
  { 
    name: 'Raspberries', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 64, protein: 1.5, carbs: 15, fat: 0.8 } },
      { unit: 'g', amount: 100, macros: { calories: 52, protein: 1.2, carbs: 12, fat: 0.7 } }
    ]
  },

  // MORE NUTS & SEEDS
  { 
    name: 'Pecans', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 196, protein: 2.6, carbs: 3.9, fat: 20.4 } },
      { unit: 'g', amount: 100, macros: { calories: 691, protein: 9.2, carbs: 13.7, fat: 72 } }
    ]
  },
  { 
    name: 'Pistachios', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 159, protein: 5.7, carbs: 7.7, fat: 12.9 } },
      { unit: 'g', amount: 100, macros: { calories: 560, protein: 20.2, carbs: 27.2, fat: 45.5 } }
    ]
  },
  { 
    name: 'Brazil Nuts', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 186, protein: 4.1, carbs: 3.5, fat: 18.8 } },
      { unit: 'g', amount: 100, macros: { calories: 659, protein: 14.5, carbs: 12.3, fat: 66.4 } }
    ]
  },
  { 
    name: 'Hazelnuts', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 178, protein: 4.3, carbs: 4.7, fat: 17.2 } },
      { unit: 'g', amount: 100, macros: { calories: 628, protein: 15, carbs: 16.6, fat: 60.8 } }
    ]
  },
  { 
    name: 'Macadamia Nuts', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 204, protein: 2.2, carbs: 3.9, fat: 21.5 } },
      { unit: 'g', amount: 100, macros: { calories: 718, protein: 7.9, carbs: 13.8, fat: 75.8 } }
    ]
  },
  { 
    name: 'Sunflower Seeds', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 165, protein: 5.5, carbs: 6.8, fat: 14.1 } },
      { unit: 'g', amount: 100, macros: { calories: 584, protein: 19.4, carbs: 24, fat: 49.8 } }
    ]
  },
  { 
    name: 'Pumpkin Seeds', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 158, protein: 8.6, carbs: 3, fat: 13.9 } },
      { unit: 'g', amount: 100, macros: { calories: 559, protein: 30.4, carbs: 10.6, fat: 49.1 } }
    ]
  },
  { 
    name: 'Sesame Seeds', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 52, protein: 1.6, carbs: 2.1, fat: 4.5 } },
      { unit: 'g', amount: 100, macros: { calories: 573, protein: 17.7, carbs: 23.4, fat: 49.7 } }
    ]
  },
  { 
    name: 'Hemp Seeds', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 57, protein: 3.3, carbs: 0.8, fat: 4.8 } },
      { unit: 'g', amount: 100, macros: { calories: 553, protein: 31.6, carbs: 8.7, fat: 48.8 } }
    ]
  },

  // MORE BEANS & LEGUMES
  { 
    name: 'Pinto Beans', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 245, protein: 15, carbs: 45, fat: 1.1 } },
      { unit: 'g', amount: 100, macros: { calories: 143, protein: 8.7, carbs: 26.2, fat: 0.6 } }
    ]
  },
  { 
    name: 'Navy Beans', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 255, protein: 15, carbs: 47, fat: 1.1 } },
      { unit: 'g', amount: 100, macros: { calories: 140, protein: 8.2, carbs: 25.8, fat: 0.6 } }
    ]
  },
  { 
    name: 'Lima Beans', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 216, protein: 14.7, carbs: 39, fat: 0.7 } },
      { unit: 'g', amount: 100, macros: { calories: 113, protein: 7.7, carbs: 20.4, fat: 0.4 } }
    ]
  },
  { 
    name: 'Green Lentils', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 230, protein: 18, carbs: 40, fat: 0.8 } },
      { unit: 'g', amount: 100, macros: { calories: 116, protein: 9, carbs: 20, fat: 0.4 } }
    ]
  },
  { 
    name: 'Red Lentils', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 230, protein: 18, carbs: 40, fat: 0.8 } },
      { unit: 'g', amount: 100, macros: { calories: 116, protein: 9, carbs: 20, fat: 0.4 } }
    ]
  },
  { 
    name: 'Edamame', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 189, protein: 17, carbs: 15, fat: 8 } },
      { unit: 'g', amount: 100, macros: { calories: 122, protein: 11, carbs: 9.9, fat: 5.2 } }
    ]
  },
  { 
    name: 'Black-Eyed Peas', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 198, protein: 13, carbs: 36, fat: 0.8 } },
      { unit: 'g', amount: 100, macros: { calories: 116, protein: 7.5, carbs: 20.8, fat: 0.5 } }
    ]
  },

  // MORE SNACKS & TREATS
  { 
    name: 'Trail Mix', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 138, protein: 3.8, carbs: 11, fat: 9.4 } },
      { unit: 'g', amount: 100, macros: { calories: 462, protein: 13.4, carbs: 38.8, fat: 33.2 } }
    ]
  },
  { 
    name: 'Protein Bar', 
    measurements: [
      { unit: 'bar', amount: 1, macros: { calories: 200, protein: 20, carbs: 20, fat: 6 } },
      { unit: 'g', amount: 100, macros: { calories: 400, protein: 40, carbs: 40, fat: 12 } }
    ]
  },
  { 
    name: 'Rice Cakes', 
    measurements: [
      { unit: 'cake', amount: 1, macros: { calories: 35, protein: 0.7, carbs: 7.3, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 387, protein: 7.8, carbs: 80.9, fat: 2.2 } }
    ]
  },
  { 
    name: 'Crackers (Whole Wheat)', 
    measurements: [
      { unit: 'cracker', amount: 1, macros: { calories: 14, protein: 0.4, carbs: 2.4, fat: 0.4 } },
      { unit: 'g', amount: 100, macros: { calories: 427, protein: 11, carbs: 73, fat: 12.1 } }
    ]
  },
  { 
    name: 'Pretzels', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 111, protein: 2.8, carbs: 22, fat: 1 } },
      { unit: 'g', amount: 100, macros: { calories: 384, protein: 9.7, carbs: 76, fat: 3.5 } }
    ]
  },
  { 
    name: 'Yogurt (Regular)', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 149, protein: 8.5, carbs: 11.4, fat: 8 } },
      { unit: 'g', amount: 100, macros: { calories: 59, protein: 3.4, carbs: 4.5, fat: 3.2 } }
    ]
  },
  { 
    name: 'Ice Cream', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 273, protein: 4.6, carbs: 31, fat: 14.5 } },
      { unit: 'g', amount: 100, macros: { calories: 207, protein: 3.5, carbs: 23.6, fat: 11 } }
    ]
  },
  { 
    name: 'Sorbet', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 184, protein: 0.5, carbs: 47, fat: 0.2 } },
      { unit: 'g', amount: 100, macros: { calories: 139, protein: 0.4, carbs: 35.6, fat: 0.2 } }
    ]
  },

  // COMMON BREAKFAST ITEMS
  { 
    name: 'Pancakes', 
    measurements: [
      { unit: 'pancake', amount: 1, macros: { calories: 86, protein: 2.3, carbs: 14, fat: 2.1 } },
      { unit: 'g', amount: 100, macros: { calories: 227, protein: 6.1, carbs: 37, fat: 5.6 } }
    ]
  },
  { 
    name: 'Waffles', 
    measurements: [
      { unit: 'waffle', amount: 1, macros: { calories: 218, protein: 6.5, carbs: 26, fat: 11 } },
      { unit: 'g', amount: 100, macros: { calories: 291, protein: 8.7, carbs: 34.7, fat: 14.7 } }
    ]
  },
  { 
    name: 'French Toast', 
    measurements: [
      { unit: 'slice', amount: 1, macros: { calories: 149, protein: 6.1, carbs: 16, fat: 6.4 } },
      { unit: 'g', amount: 100, macros: { calories: 229, protein: 9.4, carbs: 24.6, fat: 9.8 } }
    ]
  },
  { 
    name: 'Hash Browns', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 165, protein: 2, carbs: 28, fat: 5.5 } },
      { unit: 'g', amount: 100, macros: { calories: 165, protein: 2, carbs: 28, fat: 5.5 } }
    ]
  },
  { 
    name: 'Bacon', 
    measurements: [
      { unit: 'slice', amount: 1, macros: { calories: 43, protein: 3, carbs: 0.1, fat: 3.3 } },
      { unit: 'oz', amount: 1, macros: { calories: 142, protein: 9.9, carbs: 0.4, fat: 11 } }
    ]
  },
  { 
    name: 'Sausage (Pork)', 
    measurements: [
      { unit: 'link', amount: 1, macros: { calories: 86, protein: 3.6, carbs: 1.1, fat: 7.2 } },
      { unit: 'oz', amount: 1, macros: { calories: 87, protein: 3.6, carbs: 1.1, fat: 7.3 } }
    ]
  },
  { 
    name: 'Sausage (Turkey)', 
    measurements: [
      { unit: 'link', amount: 1, macros: { calories: 52, protein: 5.7, carbs: 1.1, fat: 2.5 } },
      { unit: 'oz', amount: 1, macros: { calories: 53, protein: 5.8, carbs: 1.1, fat: 2.5 } }
    ]
  },
  { 
    name: 'Ham', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 46, protein: 5.7, carbs: 1.1, fat: 1.8 } },
      { unit: 'slice', amount: 1, macros: { calories: 46, protein: 5.7, carbs: 1.1, fat: 1.8 } }
    ]
  },

  // COMMON SALAD INGREDIENTS
  { 
    name: 'Croutons', 
    measurements: [
      { unit: 'oz', amount: 1, macros: { calories: 122, protein: 3, carbs: 22, fat: 2.5 } },
      { unit: 'g', amount: 100, macros: { calories: 407, protein: 10, carbs: 73.3, fat: 8.3 } }
    ]
  },
  { 
    name: 'Caesar Dressing', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 78, protein: 0.6, carbs: 0.8, fat: 8.5 } },
      { unit: 'g', amount: 100, macros: { calories: 542, protein: 4.2, carbs: 5.6, fat: 59 } }
    ]
  },
  { 
    name: 'Ranch Dressing', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 73, protein: 0.4, carbs: 1.2, fat: 7.9 } },
      { unit: 'g', amount: 100, macros: { calories: 508, protein: 2.8, carbs: 8.3, fat: 54.9 } }
    ]
  },
  { 
    name: 'Balsamic Vinaigrette', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 63, protein: 0.1, carbs: 3.4, fat: 5.7 } },
      { unit: 'g', amount: 100, macros: { calories: 441, protein: 0.7, carbs: 23.8, fat: 39.9 } }
    ]
  },
  { 
    name: 'Italian Dressing', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 43, protein: 0.1, carbs: 3.4, fat: 3.4 } },
      { unit: 'g', amount: 100, macros: { calories: 301, protein: 0.7, carbs: 23.8, fat: 23.8 } }
    ]
  },

  // COMMON COOKING INGREDIENTS
  { 
    name: 'Chicken Broth', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 15, protein: 1.7, carbs: 0.8, fat: 0.5 } },
      { unit: 'g', amount: 100, macros: { calories: 6, protein: 0.7, carbs: 0.3, fat: 0.2 } }
    ]
  },
  { 
    name: 'Beef Broth', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 17, protein: 2, carbs: 1, fat: 0.5 } },
      { unit: 'g', amount: 100, macros: { calories: 7, protein: 0.8, carbs: 0.4, fat: 0.2 } }
    ]
  },
  { 
    name: 'Vinegar', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 3, protein: 0, carbs: 0.1, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 18, protein: 0, carbs: 0.6, fat: 0 } }
    ]
  },
  { 
    name: 'Worcestershire Sauce', 
    measurements: [
      { unit: 'tbsp', amount: 1, macros: { calories: 13, protein: 0.1, carbs: 3.1, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 78, protein: 0.6, carbs: 18.6, fat: 0 } }
    ]
  },
  { 
    name: 'Sriracha', 
    measurements: [
      { unit: 'tsp', amount: 1, macros: { calories: 5, protein: 0.1, carbs: 1, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 112, protein: 2.2, carbs: 22.6, fat: 0.5 } }
    ]
  },

  // COMMON BEVERAGES
  { 
    name: 'Green Tea', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 2, protein: 0, carbs: 0.5, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 2, protein: 0, carbs: 0.5, fat: 0 } }
    ]
  },
  { 
    name: 'Black Coffee', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 2, protein: 0.3, carbs: 0, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 2, protein: 0.3, carbs: 0, fat: 0 } }
    ]
  },
  { 
    name: 'Protein Shake (Ready-to-Drink)', 
    measurements: [
      { unit: 'bottle', amount: 1, macros: { calories: 160, protein: 30, carbs: 4, fat: 2 } },
      { unit: 'g', amount: 100, macros: { calories: 53, protein: 10, carbs: 1.3, fat: 0.7 } }
    ]
  },
  { 
    name: 'Energy Drink', 
    measurements: [
      { unit: 'can', amount: 1, macros: { calories: 110, protein: 0, carbs: 28, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 45, protein: 0, carbs: 11.4, fat: 0 } }
    ]
  },
  { 
    name: 'Sports Drink', 
    measurements: [
      { unit: 'cup', amount: 1, macros: { calories: 50, protein: 0, carbs: 14, fat: 0 } },
      { unit: 'g', amount: 100, macros: { calories: 21, protein: 0, carbs: 5.9, fat: 0 } }
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
  customMeals: [],
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

      // Use selectedDate for loggedAt to ensure meals are associated with the correct date
      // Set time to noon to avoid timezone issues
      const loggedAtDate = new Date(selectedDate);
      loggedAtDate.setHours(12, 0, 0, 0);

      // Calculate total micronutrients if available
      const calculateTotalMicronutrients = (microsPerServing?: MicroNutrients, count: number): MicroNutrients | undefined => {
        if (!microsPerServing) return undefined;
        
        const total: MicroNutrients = {};
        Object.keys(microsPerServing).forEach(key => {
          const value = microsPerServing[key as keyof MicroNutrients];
          if (value !== undefined) {
            (total as any)[key] = Math.round(value * count * 100) / 100;
          }
        });
        
        return Object.keys(total).length > 0 ? total : undefined;
      };

      const newFoodItem: FoodItem = {
        ...foodData,
        id: foodData.id || generateUniqueId('food'),
        loggedAt: loggedAtDate,
        totalMacros: {
          calories: baseMacros.calories * sanitizedServingCount,
          protein: baseMacros.protein * sanitizedServingCount,
          carbs: baseMacros.carbs * sanitizedServingCount,
          fat: baseMacros.fat * sanitizedServingCount,
        },
        totalMicronutrients: calculateTotalMicronutrients(foodData.micronutrientsPerServing, sanitizedServingCount),
      };

      // Check for duplicates by ID first, then by name + mealType + similar time (within 5 seconds)
      const now = Date.now();
      const isDuplicate = dayNutrition.foods.some((food) => {
        if (food.id === newFoodItem.id) return true;
        // Check for same name, meal type, and logged within 5 seconds (likely same add action)
        const foodTime = new Date(food.loggedAt).getTime();
        const timeDiff = Math.abs(now - foodTime);
        return food.name === newFoodItem.name && 
               food.mealType === newFoodItem.mealType && 
               timeDiff < 5000;
      });

      if (isDuplicate) {
        console.log('⚠️ Duplicate food item detected, skipping add:', newFoodItem.name);
        return; // Don't add duplicate
      }

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
      
      // Use the target date for loggedAt to ensure meals are associated with the correct date
      // Set time to noon to avoid timezone issues
      const loggedAtDate = new Date(date);
      loggedAtDate.setHours(12, 0, 0, 0);
      
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
        loggedAt: loggedAtDate,
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
        const micronutrientsPerServingToUse = updates.micronutrientsPerServing || food.micronutrientsPerServing;
        
        if (updates.servingCount !== undefined || updates.macrosPerServing !== undefined) {
          updatedFood.totalMacros = {
            calories: macrosPerServingToUse.calories * servingCountToUse,
            protein: macrosPerServingToUse.protein * servingCountToUse,
            carbs: macrosPerServingToUse.carbs * servingCountToUse,
            fat: macrosPerServingToUse.fat * servingCountToUse,
          };
        }
        
        // Recalculate total micronutrients if serving count or per-serving micronutrients changed
        if (updates.servingCount !== undefined || updates.micronutrientsPerServing !== undefined) {
          if (micronutrientsPerServingToUse) {
            const total: MicroNutrients = {};
            Object.keys(micronutrientsPerServingToUse).forEach(key => {
              const value = micronutrientsPerServingToUse[key as keyof MicroNutrients];
              if (value !== undefined) {
                (total as any)[key] = Math.round(value * servingCountToUse * 100) / 100;
              }
            });
            updatedFood.totalMicronutrients = Object.keys(total).length > 0 ? total : undefined;
          } else {
            updatedFood.totalMicronutrients = undefined;
          }
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
    const { currentDayNutrition, selectedDate } = get();
    if (!currentDayNutrition) return [];
    const selectedDateKey = getLocalDateKey(selectedDate);
    // Filter by meal type AND date to ensure foods from other dates don't show up
    return currentDayNutrition.foods.filter(food => {
      const foodDateKey = getLocalDateKey(food.loggedAt);
      return food.mealType === mealType && foodDateKey === selectedDateKey;
    });
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
      
      const foodsFromFirebase: FoodItem[] = meals.map(meal => ({
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
      
      // Merge with existing local foods - prefer Firebase data but keep local foods that aren't in Firebase yet
      // This prevents losing meals that were just added but not yet synced
      const existingFoodIds = new Set(dayNutrition.foods.map(f => f.id));
      const firebaseFoodIds = new Set(foodsFromFirebase.map(f => f.id));
      
      // Keep local foods that aren't in Firebase (recently added, not yet synced)
      const localOnlyFoods = dayNutrition.foods.filter(f => !firebaseFoodIds.has(f.id));
      
      // Combine: Firebase foods + local-only foods, deduplicated by ID
      const mergedFoods = [...foodsFromFirebase];
      localOnlyFoods.forEach(localFood => {
        // Only add if it's not already in the merged list
        if (!mergedFoods.some(f => f.id === localFood.id)) {
          mergedFoods.push(localFood);
        }
      });
      
      // Sort by loggedAt time
      mergedFoods.sort((a, b) => {
        const aTime = new Date(a.loggedAt).getTime();
        const bTime = new Date(b.loggedAt).getTime();
        return aTime - bTime;
      });
      
      const updatedDayNutrition: DailyNutrition = {
        ...dayNutrition,
        foods: mergedFoods,
        totalMacros: get().calculateDailyTotals(mergedFoods),
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
      
      console.log(`Loaded ${foodsFromFirebase.length} meals from Firebase, ${localOnlyFoods.length} local-only meals preserved, ${mergedFoods.length} total`);
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
      customMeals: [], // Clear custom meals on logout
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
  
  // Custom meals
  addCustomMeal: (mealData, userId) => {
    if (!userId) {
      console.error('User ID is required to add custom meal');
      throw new Error('User ID is required');
    }
    const newMeal: CustomMeal = {
      ...mealData,
      userId,
      id: generateUniqueId('custom-meal'),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      customMeals: [...state.customMeals, newMeal],
    }));
    // Save locally
    get().saveCustomMeals(userId);
    
    // Save to Firebase (global collection)
    const { globalCustomMealsService } = require('@/services/firestoreService');
    globalCustomMealsService.saveCustomMeal(newMeal, userId)
      .then(() => {
        console.log('✅ Custom meal saved to global Firebase collection');
      })
      .catch((error) => {
        console.error('❌ Error saving custom meal to Firebase:', error);
        // Don't block - local save already succeeded
      });
    
    return newMeal;
  },
  
  updateCustomMeal: (id, updates, userId) => {
    if (!userId) {
      console.error('User ID is required to update custom meal');
      return null;
    }
    const { customMeals } = get();
    const mealIndex = customMeals.findIndex((m) => m.id === id && m.userId === userId);
    if (mealIndex === -1) return null;
    
    const updatedMeal: CustomMeal = {
      ...customMeals[mealIndex],
      ...updates,
      id,
      userId, // Ensure userId is preserved
      updatedAt: new Date().toISOString(),
    };
    
    set({
      customMeals: customMeals.map((m) => (m.id === id && m.userId === userId ? updatedMeal : m)),
    });
    get().saveCustomMeals(userId);
    return updatedMeal;
  },
  
  removeCustomMeal: (id, userId) => {
    if (!userId) {
      console.error('User ID is required to remove custom meal');
      return;
    }
    set((state) => ({
      customMeals: state.customMeals.filter((m) => !(m.id === id && m.userId === userId)),
    }));
    get().saveCustomMeals(userId);
  },
  
  loadCustomMeals: async (userId) => {
    try {
      if (!userId) {
        console.warn('No user ID provided, skipping custom meals load');
        set({ customMeals: [] });
        return;
      }
      // Load local custom meals (user's own)
      const stored = await persistenceService.loadCustomMeals(userId);
      const localMeals = (stored && Array.isArray(stored)) 
        ? stored.filter((meal) => meal.userId === userId) 
        : [];
      
      // Load global custom meals from Firebase (all users)
      try {
        const { globalCustomMealsService } = require('@/services/firestoreService');
        const globalMeals = await globalCustomMealsService.getAllCustomMeals();
        console.log(`✅ Loaded ${globalMeals.length} global custom meals from Firebase`);
        
        // Merge local and global meals, avoiding duplicates by ID
        const mealMap = new Map<string, CustomMeal>();
        
        // Add local meals first (user's own take priority)
        localMeals.forEach(meal => {
          mealMap.set(meal.id, meal);
        });
        
        // Add global meals (don't overwrite local if same ID)
        globalMeals.forEach(meal => {
          if (!mealMap.has(meal.id)) {
            // Set userId to current user for global meals so they can be used
            mealMap.set(meal.id, { ...meal, userId } as CustomMeal);
          }
        });
        
        const allMeals = Array.from(mealMap.values());
        set({ customMeals: allMeals });
        console.log(`✅ Total custom meals loaded: ${allMeals.length} (${localMeals.length} local, ${globalMeals.length} global)`);
      } catch (firebaseError) {
        console.error('❌ Error loading global custom meals from Firebase:', firebaseError);
        // Fallback to local only if Firebase fails
        set({ customMeals: localMeals });
      }
    } catch (error) {
      console.error('Error loading custom meals:', error);
      set({ customMeals: [] });
    }
  },
  
  saveCustomMeals: async (userId) => {
    try {
      if (!userId) {
        console.warn('No user ID provided, skipping custom meals save');
        return;
      }
      const { customMeals } = get();
      // Only save meals for this user
      const userMeals = customMeals.filter((meal) => meal.userId === userId);
      await persistenceService.saveCustomMeals(userMeals, userId);
    } catch (error) {
      console.error('Error saving custom meals:', error);
    }
  },
}));

// Export food database for use in components
export { FOOD_DATABASE };
