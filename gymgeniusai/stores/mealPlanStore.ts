/**
 * Meal Plan Store
 * 
 * Manages AI-generated meal plans and batches
 */

import { create } from 'zustand';
import { MealBatch, GeneratedMeal } from '../types/mealPlan';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MealPlanStore {
  // State
  mealBatches: MealBatch[];
  currentBatch: MealBatch | null;
  isGenerating: boolean;
  isLoading: boolean;
  
  // Actions
  setMealBatches: (batches: MealBatch[]) => void;
  setCurrentBatch: (batch: MealBatch | null) => void;
  addMealBatch: (batch: MealBatch) => void;
  setIsGenerating: (loading: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  markMealAsAdded: (batchId: string, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', date: string) => void;
  clearAllMealPlans: () => Promise<void>;
  
  // Computed
  getMealBatchById: (batchId: string) => MealBatch | undefined;
  getLatestBatch: () => MealBatch | undefined;
}

const MEAL_PLANS_STORAGE_KEY = '@kinetic_flow_meal_plans';

export const useMealPlanStore = create<MealPlanStore>((set, get) => ({
  // Initial State
  mealBatches: [],
  currentBatch: null,
  isGenerating: false,
  isLoading: false,
  
  // Actions
  setMealBatches: (batches) => {
    set({ mealBatches: batches });
    // Save to local storage
    AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(batches)).catch(console.error);
  },
  
  setCurrentBatch: (batch) => set({ currentBatch: batch }),
  
  addMealBatch: (batch) => {
    const batches = [batch, ...get().mealBatches];
    set({ mealBatches: batches, currentBatch: batch });
    // Save to local storage
    AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(batches)).catch(console.error);
  },
  
  setIsGenerating: (loading) => set({ isGenerating: loading }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  markMealAsAdded: (batchId, mealType, date) => {
    const batches = get().mealBatches.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          meals: {
            ...batch.meals,
            [mealType]: {
              ...batch.meals[mealType],
              addedToNutrition: new Date(),
              addedToDate: date,
            },
          },
        };
      }
      return batch;
    });
    
    set({ mealBatches: batches });
    AsyncStorage.setItem(MEAL_PLANS_STORAGE_KEY, JSON.stringify(batches)).catch(console.error);
  },
  
  clearAllMealPlans: async () => {
    set({ mealBatches: [], currentBatch: null });
    await AsyncStorage.removeItem(MEAL_PLANS_STORAGE_KEY);
  },
  
  // Computed
  getMealBatchById: (batchId) => {
    return get().mealBatches.find(batch => batch.id === batchId);
  },
  
  getLatestBatch: () => {
    const batches = get().mealBatches;
    return batches.length > 0 ? batches[0] : undefined;
  },
}));

// Load meal plans from local storage on app start
export const loadMealPlansFromStorage = async () => {
  try {
    const stored = await AsyncStorage.getItem(MEAL_PLANS_STORAGE_KEY);
    if (stored) {
      const batches = JSON.parse(stored);
      useMealPlanStore.setState({ mealBatches: batches });
      console.log('📱 Loaded meal plans from local storage:', batches.length);
    }
  } catch (error) {
    console.error('❌ Error loading meal plans from storage:', error);
  }
};







