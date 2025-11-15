import { Alert } from 'react-native';
import { useNutritionStore } from '@/stores/nutritionStore';

/**
 * Helper function to deduplicate foods array
 */
export const deduplicateFoods = (foods: any[]): any[] => {
  const seen = new Set<string>();
  const unique: any[] = [];
  
  for (const food of foods) {
    const foodKey = `${food.name || 'Unknown'}::${food.servingSize || ''}::${food.servingCount || 1}::${food.mealType || ''}`;
    if (!seen.has(foodKey)) {
      seen.add(foodKey);
      unique.push(food);
    } else {
      console.log(`⚠️ Found duplicate in meal plan data: ${food.name} (${food.servingCount} × ${food.servingSize}) - skipping`);
    }
  }
  
  return unique;
};

/**
 * Check if a food already exists in the store
 */
export const foodExists = (foodName: string, mealType: string, mealPlanDate: Date): boolean => {
  const { currentDayNutrition } = useNutritionStore.getState();
  const existingFoods = currentDayNutrition?.foods || [];
  return existingFoods.some(
    f => f.name === foodName && 
         f.mealType === mealType &&
         Math.abs(new Date(f.loggedAt).getTime() - mealPlanDate.getTime()) < 86400000 // Within same day
  );
};

/**
 * Get unique food key for tracking
 */
export const getFoodKey = (name: string, mealType: string, servingSize: string, servingCount: number) => 
  `${name}::${servingSize}::${servingCount}::${mealType}`;

/**
 * Convert shared food data to FoodItem format
 */
export const convertSharedFoodToFoodItem = (food: any, mealType: string, mealPlanDate: Date) => {
  const servingSize = food.servingSize || '1 serving';
  const servingCount = food.servingCount || 1;
  
  return {
    name: food.name || 'Unknown Food',
    servingSize: servingSize,
    servingCount: servingCount,
    macrosPerServing: food.macrosPerServing || {
      calories: food.totalMacros?.calories || 0,
      protein: food.totalMacros?.protein || 0,
      carbs: food.totalMacros?.carbs || 0,
      fat: food.totalMacros?.fat || 0,
    },
    totalMacros: food.totalMacros || {
      calories: (food.macrosPerServing?.calories || 0) * servingCount,
      protein: (food.macrosPerServing?.protein || 0) * servingCount,
      carbs: (food.macrosPerServing?.carbs || 0) * servingCount,
      fat: (food.macrosPerServing?.fat || 0) * servingCount,
    },
    mealType: mealType,
    loggedAt: mealPlanDate,
  };
};

