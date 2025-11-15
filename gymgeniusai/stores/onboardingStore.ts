import { create } from 'zustand';
import { persistenceService } from '@/services/persistenceService';

export interface OnboardingData {
  // Personal info
  firstName: string;
  birthday?: Date;
  
  // Physical measurements
  height: {
    value: string;
    unit: 'ft/in' | 'cm';
  };
  weight: {
    value: string;
    unit: 'lb' | 'kg';
  };
  sex?: 'male' | 'female' | 'other';
  
  // Experience and goals
  exerciseExperience?: 'beginner' | 'intermediate' | 'advanced';
  primaryGoal?: 'build_muscle' | 'lose_fat' | 'improve_fitness';
  goals?: Array<'build_muscle' | 'lose_fat' | 'improve_fitness' | 'gain_strength' | 'improve_endurance' | 'increase_power' | 'improve_flexibility' | 'general_health'>;
  
  // Equipment and schedule
  equipment?: 'home_only' | 'gym_access' | 'both';
  weeklySchedule?: number; // days per week
  
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
  
  // Optional fields
  injuries?: string;
  nutritionPreference?: 'simple_macros' | 'meal_ideas';
  units?: 'imperial' | 'metric';
}

interface OnboardingStore {
  data: OnboardingData;
  currentStep: number;
  totalSteps: number;
  hasRestored: boolean;
  updateData: (updates: Partial<OnboardingData>) => void;
  setData: (data: OnboardingData) => void;
  setCurrentStep: (step: number) => void;
  resetOnboarding: () => void;
  isStepValid: (step: number) => boolean;
  autoSave: (uid: string) => Promise<void>;
  restoreSavedProgress: () => Promise<void>;
  clearSavedProgress: () => Promise<void>;
}

const initialData: OnboardingData = {
  firstName: '',
  birthday: undefined,
  height: { value: '', unit: 'ft/in' },
  weight: { value: '', unit: 'lb' },
  sex: undefined,
  exerciseExperience: undefined,
  primaryGoal: undefined,
  goals: [],
  equipment: undefined,
  weeklySchedule: undefined,
  playsSports: undefined,
  sport: undefined,
  isOnTeam: undefined,
  teamName: undefined,
  role: undefined,
  userType: undefined,
  institutionRole: undefined,
  institutionName: undefined,
  teamSize: undefined,
  institutionSport: undefined,
  communityUnlocked: false,
  teamInviteCode: undefined,
  teamId: undefined,
  injuries: undefined,
  nutritionPreference: undefined,
};

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  data: initialData,
  currentStep: 0,
  totalSteps: 9,
  hasRestored: false,
  
  updateData: (updates) => {
    set((state) => {
      const newData = { ...state.data, ...updates };
      persistenceService
        .saveOnboardingProgress({
          data: newData,
          currentStep: state.currentStep,
        })
        .catch((error) => console.warn('❌ Failed to auto-save onboarding data:', error));

      return { data: newData };
    });
  },
  
  setData: (data) => {
    set((state) => {
      persistenceService
        .saveOnboardingProgress({
          data,
          currentStep: state.currentStep,
        })
        .catch((error) => console.warn('❌ Failed to save onboarding data:', error));

      return { data };
    });
  },
    
  setCurrentStep: (step) => 
    set((state) => {
      persistenceService
        .saveOnboardingProgress({
          data: state.data,
          currentStep: step,
        })
        .catch((error) => console.warn('❌ Failed to save onboarding step:', error));

      return { currentStep: step };
    }),
    
  resetOnboarding: () => {
    persistenceService
      .clearOnboardingProgress()
      .catch((error) => console.warn('❌ Failed to clear onboarding data:', error));
    set({ data: initialData, currentStep: 0, hasRestored: true });
  },
    
  isStepValid: (step) => {
    const { data } = get();
    
    switch (step) {
      case 0: // Birthday (optional)
        return true;
      case 1: // Height
        return data.height.value.trim() !== '';
      case 2: // Weight
        return data.weight.value.trim() !== '';
      case 3: // Sex (optional)
        return true;
      case 4: // Exercise experience
        return data.exerciseExperience !== undefined;
      case 5: // Goals
        return Array.isArray(data.goals) && data.goals.length > 0;
      case 6: // Equipment
        return data.equipment !== undefined;
      case 7: // Weekly schedule
        return data.weeklySchedule !== undefined && data.weeklySchedule > 0;
      case 8: // Injuries (optional)
        return true;
      default:
        return false;
    }
  },
  
  autoSave: async (uid: string) => {
    try {
      const { data } = get();
      console.log('💾 Auto-saving onboarding progress...');
      
      // Just log for now - auto-save will be handled in the onboarding component
      console.log('✅ Auto-save data prepared');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      // Don't throw error - this shouldn't break the user experience
    }
  },
  restoreSavedProgress: async () => {
    const { hasRestored } = get();
    if (hasRestored) {
      return;
    }

    try {
      const savedProgress = await persistenceService.loadOnboardingProgress();
      if (savedProgress && savedProgress.data) {
        const mergedData = { ...initialData, ...savedProgress.data };
        const savedStepRaw =
          typeof savedProgress.currentStep === 'number' ? savedProgress.currentStep : 0;
        const maxStep = get().totalSteps - 1;
        const savedStep = Math.max(0, Math.min(savedStepRaw, maxStep));

        set({
          data: mergedData,
          currentStep: savedStep,
          hasRestored: true,
        });
        console.log('✅ Restored onboarding progress from local storage');
      } else {
        set({ hasRestored: true });
      }
    } catch (error) {
      console.error('❌ Failed to restore onboarding progress:', error);
      set({ hasRestored: true });
    }
  },
  clearSavedProgress: async () => {
    try {
      await persistenceService.clearOnboardingProgress();
      console.log('🧹 Cleared saved onboarding progress');
    } catch (error) {
      console.warn('⚠️ Failed to clear onboarding progress:', error);
    }
  },
}));

