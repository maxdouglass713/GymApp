/**
 * Workout Plan Store
 * 
 * Manages AI-generated workout plans and batches
 */

import { create } from 'zustand';
import { WorkoutBatch, GeneratedWorkout } from '../types/workoutPlan';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkoutPlanStore {
  // State
  workoutBatches: WorkoutBatch[];
  currentBatch: WorkoutBatch | null;
  isGenerating: boolean;
  isLoading: boolean;
  
  // Actions
  setWorkoutBatches: (batches: WorkoutBatch[]) => void;
  setCurrentBatch: (batch: WorkoutBatch | null) => void;
  addWorkoutBatch: (batch: WorkoutBatch) => void;
  setIsGenerating: (loading: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  markWorkoutAsAdded: (batchId: string, workoutType: 'strength' | 'cardio' | 'hiit' | 'flexibility', date: string) => void;
  clearAllWorkoutPlans: () => Promise<void>;
  
  // Computed
  getWorkoutBatchById: (batchId: string) => WorkoutBatch | undefined;
  getLatestBatch: () => WorkoutBatch | undefined;
}

const WORKOUT_PLANS_STORAGE_KEY = '@kinetic_flow_workout_plans';

export const useWorkoutPlanStore = create<WorkoutPlanStore>((set, get) => ({
  // Initial State
  workoutBatches: [],
  currentBatch: null,
  isGenerating: false,
  isLoading: false,
  
  // Actions
  setWorkoutBatches: (batches) => {
    set({ workoutBatches: batches });
    // Save to local storage
    AsyncStorage.setItem(WORKOUT_PLANS_STORAGE_KEY, JSON.stringify(batches)).catch(console.error);
  },
  
  setCurrentBatch: (batch) => set({ currentBatch: batch }),
  
  addWorkoutBatch: (batch) => {
    const batches = [batch, ...get().workoutBatches];
    set({ workoutBatches: batches, currentBatch: batch });
    // Save to local storage
    AsyncStorage.setItem(WORKOUT_PLANS_STORAGE_KEY, JSON.stringify(batches)).catch(console.error);
  },
  
  setIsGenerating: (loading) => set({ isGenerating: loading }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  markWorkoutAsAdded: (batchId, workoutType, date) => {
    const batches = get().workoutBatches.map(batch => {
      if (batch.id === batchId) {
        return {
          ...batch,
          workouts: {
            ...batch.workouts,
            [workoutType]: {
              ...batch.workouts[workoutType],
              addedToWorkouts: new Date(),
              addedToDate: date,
            },
          },
        };
      }
      return batch;
    });
    
    set({ workoutBatches: batches });
    AsyncStorage.setItem(WORKOUT_PLANS_STORAGE_KEY, JSON.stringify(batches)).catch(console.error);
  },
  
  clearAllWorkoutPlans: async () => {
    set({ workoutBatches: [], currentBatch: null });
    await AsyncStorage.removeItem(WORKOUT_PLANS_STORAGE_KEY);
  },
  
  // Computed
  getWorkoutBatchById: (batchId) => {
    return get().workoutBatches.find(batch => batch.id === batchId);
  },
  
  getLatestBatch: () => {
    const batches = get().workoutBatches;
    return batches.length > 0 ? batches[0] : undefined;
  },
}));

// Load workout plans from local storage on app start
export const loadWorkoutPlansFromStorage = async () => {
  try {
    const stored = await AsyncStorage.getItem(WORKOUT_PLANS_STORAGE_KEY);
    if (stored) {
      const batches = JSON.parse(stored);
      // Restore batches and set the latest one as current batch
      const latestBatch = batches.length > 0 ? batches[0] : null;
      useWorkoutPlanStore.setState({ 
        workoutBatches: batches,
        currentBatch: latestBatch 
      });
      console.log('📱 Loaded workout plans from local storage:', batches.length);
      if (latestBatch) {
        console.log('📱 Restored current batch:', latestBatch.id);
      }
    }
  } catch (error) {
    console.error('❌ Error loading workout plans from storage:', error);
  }
};










