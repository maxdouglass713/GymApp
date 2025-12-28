import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BrandColors, ComponentStyles, Typography, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNutritionStore, FOOD_DATABASE, getLocalDateKey } from '@/stores/nutritionStore';
import { usePointsStore } from '@/stores/pointsStore';
import { useAuth } from '@/components/AuthProvider';
import { useUserStore } from '@/stores/userStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { nutritionFirebaseService, FoodItem as FirebaseFoodItem } from '@/services/nutritionFirebaseService';
import { getGoalDescription, calculatePersonalizedMacros } from '@/utils/macroCalculator';
import { userService, mealService } from '@/services/firestoreService';
import { mealPlanSharingService } from '@/services/mealPlanSharingService';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { SwipeableFoodItem } from '@/components/nutrition/SwipeableFoodItem';
import { MealSection } from '@/components/nutrition/MealSection';
import { DailyTotals } from '@/components/nutrition/DailyTotals';
import { MacroBars } from '@/components/nutrition/MacroBars';
import { CalorieBudget } from '@/components/nutrition/CalorieBudget';
import { PlayerSelector } from '@/components/nutrition/PlayerSelector';
import { MealPlanActions } from '@/components/nutrition/MealPlanActions';
import { LightningSeparator } from '@/components/shared/LightningSeparator';
import { generateUniqueId } from '@/utils/id';
import { SearchModal } from '@/components/nutrition/modals/SearchModal';
import { LogFoodModal } from '@/components/nutrition/modals/LogFoodModal';
import { SnapTrackModal } from '@/components/nutrition/modals/SnapTrackModal';
import { UnlockModal } from '@/components/nutrition/modals/UnlockModal';
import { NutritionPlannerModal } from '@/components/nutrition/modals/NutritionPlannerModal';
import { ManualMacroModal } from '@/components/nutrition/modals/ManualMacroModal';
import { EditFoodModal } from '@/components/nutrition/modals/EditFoodModal';
import { PlayerSelectionModal } from '@/components/nutrition/modals/PlayerSelectionModal';
import { CustomMealModal, type CustomMealInput } from '@/components/nutrition/modals/CustomMealModal';
import { WaterTrackingModal } from '@/components/nutrition/modals/WaterTrackingModal';
import { NutritionalBreakdownModal } from '@/components/nutrition/modals/NutritionalBreakdownModal';
import { useMealPlan } from '@/hooks/useNutrition/useMealPlan';
import { eventBus } from '@/lib/eventBus';
import { MealPlanGenerator } from '@/components/MealPlanGenerator';
import { isFeatureEnabled } from '@/utils/features/featureFlags';

// Global variable declarations for meal plan sharing
declare global {
  var sharedMealPlanData: any;
  var sharedMealPlanId: string;
}

const mapGoalToPrimary = (
  goal: string
): 'build_muscle' | 'lose_fat' | 'improve_fitness' => {
  switch (goal) {
    case 'build_muscle':
    case 'gain_strength':
    case 'increase_power':
      return 'build_muscle';
    case 'lose_fat':
      return 'lose_fat';
    default:
      return 'improve_fitness';
  }
};

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: undefined },
  { key: 'lunch', label: 'Lunch', icon: undefined },
  { key: 'dinner', label: 'Dinner', icon: undefined },
  { key: 'snacks', label: 'Snacks', icon: undefined },
] as const;

export default function NutritionScreen() {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const { user } = useAuth();
  const { userDoc, syncProfileToFirestore, profile } = useUserStore();
  
  const {
    selectedDate,
    currentDayNutrition,
    setSelectedDate,
    addFoodItem,
    updateFoodItem,
    removeFoodItem,
    getFoodsByMeal,
    loadUserMealsFromFirebase,
    getTargets,
    setMealCompleted,
    refreshDailyMeta,
    autoCompletePendingMeals,
    customMeals,
    addCustomMeal,
    loadCustomMeals,
  } = useNutritionStore();

  const { getWorkoutForDate } = useWorkoutStore();

  const todayKey = getLocalDateKey(new Date());
  const selectedDateKey = getLocalDateKey(selectedDate);
  const isPastSelectedDate = selectedDateKey < todayKey;

  const safeSetMealCompleted = React.useCallback(
    async (date: Date, mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks', completed: boolean, uid?: string) => {
      const storeFn: any = (useNutritionStore as any).getState?.().setMealCompleted;
      if (typeof setMealCompleted === 'function') {
        return setMealCompleted(date, mealType, completed, uid);
      }
      if (typeof storeFn === 'function') {
        return storeFn(date, mealType, completed, uid);
      }
      // Fallback: update via store setState directly
      try {
        const store: any = (useNutritionStore as any);
        const getState = store.getState;
        const setState = store.setState;
        const day = getState().getDailyNutrition(date);
        const dateStr = getLocalDateKey(date);
        const baseCompleted = day.completedMeals || { breakfast: false, lunch: false, dinner: false, snacks: false };
        const updatedCompleted = { ...baseCompleted, [mealType]: completed };
        const updatedDay = { ...day, completedMeals: updatedCompleted };
        setState((state: any) => ({
          dailyNutrition: state.dailyNutrition.some((d: any) => d.date === dateStr)
            ? state.dailyNutrition.map((d: any) => (d.date === dateStr ? updatedDay : d))
            : [...state.dailyNutrition, updatedDay],
          currentDayNutrition: getLocalDateKey(state.selectedDate) === dateStr ? updatedDay : state.currentDayNutrition,
        }));
      } catch (e) {
        console.warn('Fallback setMealCompleted failed:', e);
      }
    },
    [setMealCompleted]
  );
  
  const { totalPoints, addPoints, isFeatureUnlocked, spendPoints, unlockFeature, getDailyEarned, canEarnToday } = usePointsStore();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showLogFoodModal, setShowLogFoodModal] = useState(false);
  const [showSnapTrackModal, setShowSnapTrackModal] = useState(false);
  const [showWaterTrackingModal, setShowWaterTrackingModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showNutritionPlannerModal, setShowNutritionPlannerModal] = useState(false);
  const [showManualMacroModal, setShowManualMacroModal] = useState(false);
  // Edit Macros modal state
  const [showEditFoodModal, setShowEditFoodModal] = useState(false);
  const [showNutritionalBreakdownModal, setShowNutritionalBreakdownModal] = useState(false);
  const [editFood, setEditFood] = useState<any>(null);
  const [editServingSize, setEditServingSize] = useState('');
  const [editServingCount, setEditServingCount] = useState('1');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [showPlayerSelectionModal, setShowPlayerSelectionModal] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<Array<{id: string, name: string}>>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [showCustomMealModal, setShowCustomMealModal] = useState(false);
  const [showMealPlanGenerator, setShowMealPlanGenerator] = useState(false);
  
  // Coach-specific: Selected player and their targets
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [selectedPlayerTargets, setSelectedPlayerTargets] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);
  const [loadingPlayerTargets, setLoadingPlayerTargets] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<Array<{id: string, name: string}>>([]);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  
  // Use meal plan hook
  const { sharedMealPlanId } = useMealPlan();
  // Track if meal plan is completed
  const [isMealPlanCompleted, setIsMealPlanCompleted] = useState(false);
  // Track the last sent meal plan data to detect changes
  const [lastSentMealPlanData, setLastSentMealPlanData] = useState<any>(null);
  
  // Function to check if meal plan is completed
  const checkCompletionStatus = React.useCallback(async (mealPlanId: string) => {
    if (!user?.uid || !mealPlanId) return;
    
    try {
      // Query the sharedMealPlans collection to check completion status
      const { getDocs, query, where, collection } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      const mealPlanQuery = query(
        collection(db, 'sharedMealPlans'),
        where('mealPlanId', '==', mealPlanId)
      );
      const mealPlanSnapshot = await getDocs(mealPlanQuery);
      
      if (!mealPlanSnapshot.empty) {
        const mealPlanDoc = mealPlanSnapshot.docs[0];
        const mealPlanData = mealPlanDoc.data();
        const completionStatus = mealPlanData.completionStatus || {};
        const playerStatus = completionStatus[user.uid];
        
        if (playerStatus?.completed) {
          setIsMealPlanCompleted(true);
          // Store the last sent data if available
          const playerEdits = mealPlanData.playerEdits || {};
          if (playerEdits[user.uid]) {
            setLastSentMealPlanData(playerEdits[user.uid].mealPlanData);
          }
        } else {
          setIsMealPlanCompleted(false);
        }
      }
    } catch (error) {
      console.error('❌ Error checking completion status:', error);
    }
  }, [user?.uid]);

  // Auto-depopulate nutrition when new day starts
  useEffect(() => {
    const checkDayChange = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateCopy = new Date(selectedDate);
      selectedDateCopy.setHours(0, 0, 0, 0);

      // Auto-completion disabled - users should manually complete meals
      // await autoCompletePendingMeals(user?.uid || undefined);
      
      // If viewing today's nutrition and it's a new day, clear current day's foods
      if (selectedDateCopy.getTime() === today.getTime() && currentDayNutrition && currentDayNutrition.foods && currentDayNutrition.foods.length > 0) {
        try {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const lastDateKey = 'lastNutritionDate';
          const lastDateStr = await AsyncStorage.getItem(lastDateKey);
          const lastDate = lastDateStr ? new Date(lastDateStr) : null;
          
          if (lastDate) {
            lastDate.setHours(0, 0, 0, 0);
            // If last date is different from today, it's a new day - clear nutrition
            if (lastDate.getTime() !== today.getTime()) {
              // Clear all foods for today
              if (currentDayNutrition && currentDayNutrition.foods) {
                const foodsToRemove = currentDayNutrition.foods;
                for (const food of foodsToRemove) {
                  await removeFoodItem(food.id);
                }
              }
            }
          }
          
          // Update last tracked date
          await AsyncStorage.setItem(lastDateKey, today.toISOString());
        } catch (error) {
          console.error('Error checking day change:', error);
        }
      }
    };
    
    checkDayChange();
    
    // Check every minute to catch day changes
    const interval = setInterval(checkDayChange, 60000);
    
    return () => clearInterval(interval);
  }, [selectedDate, currentDayNutrition, removeFoodItem, autoCompletePendingMeals, user?.uid]);

  // Auto-completion disabled - users should manually complete meals
  // useEffect(() => {
  //   autoCompletePendingMeals(user?.uid || undefined).catch((error) =>
  //     console.error('❌ Error during pending meal auto-complete on mount:', error)
  //   );
  // }, [autoCompletePendingMeals, user?.uid]);

  // Removed auto-completion for past days - users should manually complete meals
  // useEffect(() => {
  //   if (isPastSelectedDate) {
  //     autoCompletePendingMeals(user?.uid || undefined).catch((error) =>
  //       console.error('❌ Error during pending meal auto-complete for past date:', error)
  //     );
  //   }
  // }, [isPastSelectedDate, autoCompletePendingMeals, user?.uid, currentDayNutrition]);
  
  // Check for meal plan ID on mount and when global changes
  React.useEffect(() => {
    const checkMealPlanId = () => {
      const mealPlanId = (global as any).sharedMealPlanId;
      if (mealPlanId && mealPlanId !== sharedMealPlanId) {
        // Check completion status when ID is set
        checkCompletionStatus(mealPlanId);
      }
    };
    
    checkMealPlanId();
    // Check periodically in case global was set after component mount
    const interval = setInterval(checkMealPlanId, 1000);
    return () => clearInterval(interval);
  }, [sharedMealPlanId, checkCompletionStatus]);
  
  // Listen for events from lightning bolt button
  useEffect(() => {
    const unsubscribeSnapTrack = eventBus.subscribe('openSnapTrack', async () => {
      if (!isFeatureEnabled('cameraPhotoMacros')) {
        return; // Feature disabled
      }
      if (!permission?.granted) {
        const result = await requestPermission();
        if (result.granted) {
          setShowSnapTrackModal(true);
        }
      } else {
        setShowSnapTrackModal(true);
      }
    });
    
    const unsubscribeSearch = eventBus.subscribe('openFoodSearch', (mealType?: string) => {
      if (mealType) {
        setSelectedMealType(mealType);
      }
      setShowSearchModal(true);
    });
    
    const unsubscribeWater = eventBus.subscribe('openWaterTracking', () => {
      setShowWaterTrackingModal(true);
    });
    
    return () => {
      unsubscribeSnapTrack();
      unsubscribeSearch();
      unsubscribeWater();
    };
  }, [permission, requestPermission]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [isLoggingFood, setIsLoggingFood] = useState(false);
  const [servingCount, setServingCount] = useState('1');
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [selectedMeasurement, setSelectedMeasurement] = useState<any>(null);
  // Persisted completion state lives in store now

  // Load team players for coaches
  useEffect(() => {
    const loadTeamPlayers = async () => {
      const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
      if (!isCoach || !profile?.teamId || !user?.uid) return;
      
      try {
        const { teamService } = await import('@/services/teamService');
        const team = await teamService.getTeamById(profile.teamId);
        if (!team || !team.members) return;
        
        const playerMemberIds = team.members
          .filter(member => member.userId !== user.uid && member.role === 'player')
          .map(member => member.userId);
        
        if (playerMemberIds.length === 0) return;
        
        const { userService } = await import('@/services/firestoreService');
        const players = await Promise.all(
          playerMemberIds.map(async (playerId) => {
            try {
              const playerDoc = await userService.getUser(playerId);
              return {
                id: playerId,
                name: playerDoc?.firstName || team.members.find(m => m.userId === playerId)?.name || 'Player'
              };
            } catch (error) {
              console.error(`Error loading player name for ${playerId}:`, error);
              return {
                id: playerId,
                name: team.members.find(m => m.userId === playerId)?.name || 'Player'
              };
            }
          })
        );
        
        setTeamPlayers(players);
      } catch (error) {
        console.error('❌ Error loading team players:', error);
      }
    };
    
    loadTeamPlayers();
  }, [profile?.teamId, profile?.userType, profile?.institutionRole, user?.uid]);

  // Legacy loadSharedMealPlan function - now handled by useMealPlan hook
  // Keeping for backward compatibility during transition
  const loadSharedMealPlan = React.useCallback(async () => {
    // Add a small delay to ensure global data is set after navigation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!(global as any).sharedMealPlanData) {
      return false;
    }
    
    // Note: Duplicate load prevention is now handled by useMealPlan hook
    
    
    try {
      const mealPlanData = (global as any).sharedMealPlanData;
      
      // Ensure we have the mealPlanId stored for completion tracking
      if (mealPlanData?.mealPlanId && !(global as any).sharedMealPlanId) {
        (global as any).sharedMealPlanId = mealPlanData.mealPlanId;
      }
      // Also store document ID if available from the original meal plan object
      const originalMealPlan = (global as any).sharedMealPlanData;
      if (originalMealPlan?.id && !(global as any).sharedMealPlanDocId) {
        (global as any).sharedMealPlanDocId = originalMealPlan.id;
      }
      
      // Extract date from meal plan
      let mealPlanDate: Date;
      let mealPlanDateString: string;
      if (mealPlanData.date) {
        // If date is a string, parse it
        if (typeof mealPlanData.date === 'string') {
          mealPlanDate = new Date(mealPlanData.date);
          mealPlanDateString = mealPlanData.date;
        } else {
          mealPlanDate = mealPlanData.date instanceof Date ? mealPlanData.date : new Date(mealPlanData.date);
          mealPlanDateString = getLocalDateKey(mealPlanDate);
        }
      } else {
        mealPlanDate = selectedDate;
        mealPlanDateString = getLocalDateKey(selectedDate);
      }
      
      // IMPORTANT: Check if meals already exist in Firebase for this date BEFORE loading
      // This prevents duplicating foods that were already loaded from a previous meal plan
      if (user?.uid && mealPlanDate && !isNaN(mealPlanDate.getTime())) {
        try {
          // Ensure mealPlanDate is a valid Date object
          const validDate = mealPlanDate instanceof Date ? mealPlanDate : new Date(mealPlanDate);
          
          if (isNaN(validDate.getTime())) {
            console.warn('⚠️ Invalid meal plan date, skipping existing meals check');
          } else {
            const existingMeals = await mealService.getMealsByDate(user.uid, validDate);
            
            // If meals already exist for this exact date, don't load the meal plan again
            // This means the meal plan was already loaded previously
            if (existingMeals.length > 0) {
              // Clear the global data since we're not loading it
              (global as any).sharedMealPlanData = null;
              (global as any).sharedMealPlanId = null;
              return false;
            }
          }
        } catch (error: any) {
          console.error('⚠️ Error checking existing meals:', error);
          console.error('⚠️ Error details:', error?.message || error);
          // Continue with loading if check fails - better to load than skip entirely
        }
      } else if (!user?.uid) {
        console.warn('⚠️ No user ID available, skipping existing meals check');
      } else {
        console.warn('⚠️ Invalid meal plan date, skipping existing meals check');
      }
      
      // Set the selected date to the meal plan date first
      setSelectedDate(mealPlanDate);
      
      // Wait a bit for date to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // DON'T load meals from Firebase here - we'll add only the foods from the meal plan
      // This prevents loading existing foods that might cause duplicates
      
      // Extract meals - handle different data structures
      let meals: any = {};
      if (mealPlanData.meals) {
        meals = mealPlanData.meals;
      } else if (mealPlanData.mealPlanData?.meals) {
        meals = mealPlanData.mealPlanData.meals;
      } else {
        console.error('❌ No meals found in meal plan data');
        return false;
      }


      // Helper function to deduplicate foods array (remove exact duplicates from the meal plan data itself)
      // This checks for duplicates based on name, serving size, serving count, and meal type
      const deduplicateFoods = (foods: any[]): any[] => {
        const seen = new Set<string>();
        const unique: any[] = [];
        
        for (const food of foods) {
          // Create unique key that includes all identifying properties
          const foodKey = `${food.name || 'Unknown'}::${food.servingSize || ''}::${food.servingCount || 1}::${food.mealType || ''}`;
          if (!seen.has(foodKey)) {
            seen.add(foodKey);
            unique.push(food);
          } else {
          }
        }
        
        return unique;
      };

      // Helper function to check if a food already exists (checks store state each time)
      const foodExists = (foodName: string, mealType: string): boolean => {
        const { currentDayNutrition } = useNutritionStore.getState();
        const existingFoods = currentDayNutrition?.foods || [];
        return existingFoods.some(
          f => f.name === foodName && 
               f.mealType === mealType &&
               Math.abs(new Date(f.loggedAt).getTime() - mealPlanDate.getTime()) < 86400000 // Within same day
        );
      };

      // Track which foods we've already added in this session to prevent duplicates
      const addedFoods = new Set<string>();
      const getFoodKey = (name: string, mealType: string) => `${name}::${mealType}`;

      // Load foods for each meal type
      const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snacks'> = ['breakfast', 'lunch', 'dinner', 'snacks'];
      
      for (const mealType of mealTypes) {
        // Deduplicate foods array before processing
        const rawFoods = meals[mealType] || [];
        const foods = deduplicateFoods(rawFoods);
        
        if (rawFoods.length !== foods.length) {
        }
        
        for (const food of foods) {
          try {
            const foodName = food.name || 'Unknown Food';
            const servingSize = food.servingSize || '1 serving';
            const servingCount = food.servingCount || 1;
            
            // Create a more specific key that includes serving info to catch exact duplicates
            const foodKey = `${foodName}::${servingSize}::${servingCount}::${mealType}`;
            
            // Check if we've already added this exact food in this session
            if (addedFoods.has(foodKey)) {
              continue;
            }
            
            // Also check if food already exists in the store with the same serving count
            const { currentDayNutrition } = useNutritionStore.getState();
            const existingFood = currentDayNutrition?.foods?.find(
              f => f.name === foodName && 
                   f.mealType === mealType &&
                   f.servingSize === servingSize &&
                   f.servingCount === servingCount &&
                   Math.abs(new Date(f.loggedAt).getTime() - mealPlanDate.getTime()) < 86400000 // Within same day
            );
            
            if (existingFood) {
              addedFoods.add(foodKey); // Mark as added to prevent retry
              continue;
            }
            
            // Mark as added before actually adding to prevent race conditions
            addedFoods.add(foodKey);
            
            // Convert shared food data to FoodItem format - preserve exact serving count
            // Calculate macrosPerServing correctly to avoid double multiplication
            let macrosPerServing;
            if (food.macrosPerServing) {
              macrosPerServing = food.macrosPerServing;
            } else if (food.totalMacros && servingCount > 0) {
              // Calculate per-serving by dividing total by serving count
              macrosPerServing = {
                calories: (food.totalMacros.calories || 0) / servingCount,
                protein: (food.totalMacros.protein || 0) / servingCount,
                carbs: (food.totalMacros.carbs || 0) / servingCount,
                fat: (food.totalMacros.fat || 0) / servingCount,
              };
            } else {
              // Fallback to zeros if no macro data
              macrosPerServing = { calories: 0, protein: 0, carbs: 0, fat: 0 };
            }
            
            // Calculate totalMacros from macrosPerServing * servingCount
            const totalMacros = {
              calories: macrosPerServing.calories * servingCount,
              protein: macrosPerServing.protein * servingCount,
              carbs: macrosPerServing.carbs * servingCount,
              fat: macrosPerServing.fat * servingCount,
            };
            
            const foodItem = {
              name: foodName,
              servingSize: servingSize,
              servingCount: servingCount, // Preserve exact serving count from meal plan
              macrosPerServing: macrosPerServing,
              totalMacros: totalMacros,
              mealType: mealType,
              loggedAt: mealPlanDate,
            };
            

            // Double-check one more time before adding (in case state changed)
            // Check for exact match including serving count
            const { currentDayNutrition: finalCheck } = useNutritionStore.getState();
            const finalDuplicate = finalCheck?.foods?.find(
              f => f.name === foodName && 
                   f.mealType === mealType &&
                   f.servingSize === servingSize &&
                   f.servingCount === servingCount &&
                   Math.abs(new Date(f.loggedAt).getTime() - mealPlanDate.getTime()) < 86400000
            );
            
            if (finalDuplicate) {
              continue;
            }
            
            // Add food item to the store
            // addFoodItem uses the current selectedDate from the store, which we've already set
            // Just pass the food data without date
            await addFoodItem({
              name: foodItem.name,
              servingSize: foodItem.servingSize,
              servingCount: foodItem.servingCount,
              macrosPerServing: foodItem.macrosPerServing,
              mealType: foodItem.mealType,
            });
            
            // IMPORTANT: Save to Firebase immediately so it persists when loadUserMealsFromFirebase is called
            // Wait a bit for addFoodItem to complete and update the store
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify the food was added correctly and check for duplicates
            const { currentDayNutrition: updatedNutrition, saveMealToFirebase } = useNutritionStore.getState();
            const matchingFoods = updatedNutrition?.foods?.filter(
              f => f.name === foodItem.name && 
                   f.mealType === foodItem.mealType &&
                   Math.abs(new Date(f.loggedAt).getTime() - mealPlanDate.getTime()) < 86400000 // Within same day
            ) || [];
            
            if (matchingFoods.length > 1) {
              console.warn(`⚠️ WARNING: ${matchingFoods.length} duplicates of ${foodItem.name} found in store! Removing extras...`);
              // Keep only the first one, remove the rest
              for (let i = 1; i < matchingFoods.length; i++) {
                removeFoodItem(matchingFoods[i].id);
              }
            }
            
            if (user?.uid) {
              try {
                // Use the first matching food (or the only one if no duplicates)
                const justAddedFood = matchingFoods[0];
                
                if (justAddedFood) {
                  await saveMealToFirebase(justAddedFood, user.uid);
                } else {
                  console.warn(`⚠️ Could not find ${foodItem.name} in store after adding`);
                }
              } catch (saveError) {
                console.error(`❌ Error saving ${foodItem.name} to Firebase:`, saveError);
                // Continue loading other foods even if one fails
              }
            }
            
            // Small delay between foods to allow state updates and Firebase saves
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`❌ Error loading food ${food.name}:`, error);
          }
        }
      }
      
      // Meal plan ID is now managed by useMealPlan hook
      // Clear the meal plan data but keep the IDs so we can track completion
      (global as any).sharedMealPlanData = null;
      
      console.log('📋 Meal plan ID stored:', {
        global: (global as any).sharedMealPlanId,
        state: sharedMealPlanId,
        docId: (global as any).sharedMealPlanDocId
      });
      
      // Show success alert (only once)
      Alert.alert(
        'Meal Plan Loaded! 🍽️',
        'Your assigned meal plan has been loaded. You can adjust serving sizes as needed!',
        [{ text: 'OK' }]
      );
      
      return true;
    } catch (error) {
      console.error('❌ Error loading shared meal plan:', error);
      Alert.alert(
        'Error',
        'Failed to load the assigned meal plan. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }, [addFoodItem, setSelectedDate, selectedDate, user, loadUserMealsFromFirebase, sharedMealPlanId]);

  // Initialize current day nutrition and load from Firebase
  useEffect(() => {
    setSelectedDate(selectedDate);
    
    if (user) {
      loadUserMealsFromFirebase(user.uid, selectedDate);
      // Also refresh per-day meta like completedMeals
      refreshDailyMeta(user.uid, selectedDate);
    }
  }, [selectedDate, user]);
  
  // Note: Meal plan loading is now handled by useMealPlan hook via useFocusEffect

  // Load meals when date changes
  useEffect(() => {
    if (user) {
      loadUserMealsFromFirebase(user.uid, selectedDate);
    }
  }, [selectedDate, user, loadUserMealsFromFirebase]);

  // Auto-calculate personalized targets for new users
  useEffect(() => {
    const initializePersonalizedTargets = async () => {
      if (!user?.uid || !userDoc) return;
      
      // Check if user already has personalized targets
      if (userDoc.customMacroTargets?.calories) {
        console.log('✅ User already has personalized targets');
        return;
      }

      const rawGoal =
        (Array.isArray(userDoc.goals) && userDoc.goals.length > 0
          ? userDoc.goals[0]
          : userDoc.primaryGoal) || 'improve_fitness';
      const primaryGoalValue = mapGoalToPrimary(rawGoal);
      
      // Check if we have enough profile data to calculate targets
      if (!userDoc.height?.value || !userDoc.weight?.value) {
        console.log('⚠️ Insufficient profile data for macro calculation');
        
        // Set default targets for users without complete profile data
        const defaultTargets = {
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 80,
        };
        
        await userService.updateUser(user.uid, {
          customMacroTargets: {
            ...defaultTargets,
            bmr: 1600,
            tdee: 2000,
            activityMultiplier: 1.2,
            calculatedAt: new Date(),
            basedOnGoal: primaryGoalValue,
          },
        });
        
        useNutritionStore.getState().setPersonalizedTargets(defaultTargets);
        
        // Sync profile to update local state
        await syncProfileToFirestore(user.uid, userDoc as any);
        
        console.log('✅ Default targets set for incomplete profile');
        return;
      }
      
      try {
        console.log('🧮 Auto-calculating personalized targets for new user...');
        
        // Calculate personalized macro targets
        const macroCalculation = calculatePersonalizedMacros({
          height: userDoc.height,
          weight: userDoc.weight,
          birthday: userDoc.birthday,
          sex: userDoc.sex,
          // Ensure only valid allowed values for primaryGoal
          primaryGoal: ['build_muscle', 'lose_fat', 'improve_fitness'].includes(primaryGoalValue)
            ? primaryGoalValue
            : 'improve_fitness',
          goals: userDoc.goals || (primaryGoalValue ? [primaryGoalValue] : []), // Include goals array
          weeklySchedule: userDoc.weeklySchedule,
        });
        
        // Update user profile with calculated targets
        await userService.updateUser(user.uid, {
          customMacroTargets: {
            calories: macroCalculation.targets.calories,
            protein: macroCalculation.targets.protein,
            carbs: macroCalculation.targets.carbs,
            fat: macroCalculation.targets.fat,
            bmr: macroCalculation.breakdown.bmr,
            tdee: macroCalculation.breakdown.tdee,
            activityMultiplier: macroCalculation.breakdown.activityMultiplier,
            calculatedAt: macroCalculation.lastCalculated,
            basedOnGoal: primaryGoalValue,
          },
        });
        
        // Update nutrition store
        useNutritionStore.getState().setPersonalizedTargets({
          calories: macroCalculation.targets.calories,
          protein: macroCalculation.targets.protein,
          carbs: macroCalculation.targets.carbs,
          fat: macroCalculation.targets.fat,
        });
        
        // Sync profile to update local state
        await syncProfileToFirestore(user.uid, userDoc as any);
        
        console.log('✅ Personalized targets calculated and saved:', macroCalculation.targets);
        
      } catch (error) {
        console.error('❌ Failed to calculate personalized targets:', error);
      }
    };
    
    initializePersonalizedTargets();
  }, [user?.uid, userDoc]);

  // Sync personalized targets from userDoc when they change (e.g., after goal update)
  useEffect(() => {
    if (userDoc?.customMacroTargets?.calories) {
      const targets = {
        calories: userDoc.customMacroTargets.calories,
        protein: userDoc.customMacroTargets.protein,
        carbs: userDoc.customMacroTargets.carbs,
        fat: userDoc.customMacroTargets.fat,
      };
      
      // Only update if targets have changed
      const currentTargets = useNutritionStore.getState().personalizedTargets;
      if (!currentTargets || 
          currentTargets.calories !== targets.calories ||
          currentTargets.protein !== targets.protein ||
          currentTargets.carbs !== targets.carbs ||
          currentTargets.fat !== targets.fat) {
        console.log('🔄 Syncing personalized targets from userDoc:', targets);
        useNutritionStore.getState().setPersonalizedTargets(targets);
        
        // Refresh current day nutrition to use new targets
        const { selectedDate, getDailyNutrition } = useNutritionStore.getState();
        const updatedDayNutrition = getDailyNutrition(selectedDate);
        useNutritionStore.setState({ currentDayNutrition: updatedDayNutrition });
      }
    }
  }, [userDoc?.customMacroTargets?.calories, userDoc?.customMacroTargets?.protein, userDoc?.customMacroTargets?.carbs, userDoc?.customMacroTargets?.fat]);

  const MEAL_TYPE_KEYWORDS: Record<string, string[]> = {
    breakfast: [
      'egg',
      'oat',
      'pancake',
      'waffle',
      'yogurt',
      'smoothie',
      'bagel',
      'toast',
      'cereal',
      'granola',
      'coffee',
      'hash',
      'sausage',
      'bacon',
      'banana',
      'oatmeal',
      'muffin'
    ],
    lunch: [
      'sandwich',
      'wrap',
      'salad',
      'rice',
      'bowl',
      'pita',
      'soup',
      'burger',
      'chicken',
      'turkey'
    ],
    dinner: [
      'steak',
      'pork',
      'salmon',
      'shrimp',
      'cod',
      'beef',
      'chicken',
      'rice',
      'potato',
      'pasta',
      'quinoa',
      'tuna'
    ],
    snacks: [
      'bar',
      'almond',
      'nuts',
      'yogurt',
      'fruit',
      'banana',
      'apple',
      'orange',
      'grapes',
      'cracker',
      'protein',
      'jerky',
      'cheese',
      'pb',
      'butter',
      'trail',
      'hummus'
    ],
  };

  const FOOD_MEAL_OVERRIDES: Record<string, Array<'breakfast' | 'lunch' | 'dinner' | 'snacks'>> = {
    'Oats': ['breakfast'],
    'Eggs': ['breakfast'],
    'Greek Yogurt': ['breakfast', 'snacks'],
    'Peanut Butter': ['breakfast', 'snacks'],
    'Protein Bar': ['snacks'],
    'Banana': ['breakfast', 'snacks'],
    'Almonds': ['snacks'],
    'Chicken Breast': ['lunch', 'dinner'],
    'Brown Rice': ['lunch', 'dinner'],
    'Salmon': ['dinner'],
    'Sweet Potato': ['lunch', 'dinner'],
    'Broccoli': ['lunch', 'dinner'],
    'Avocado': ['lunch', 'snacks'],
    'Cottage Cheese': ['breakfast', 'snacks'],
    'Quinoa': ['lunch', 'dinner'],
    'Tuna (Yellowfin)': ['lunch', 'dinner'],
    'Shrimp': ['dinner'],
    'Egg Whites': ['breakfast'],
    'Milk (2%)': ['breakfast', 'snacks'],
  };

  const getMealPriorityScore = React.useCallback(
    (foodName: string, mealType: string) => {
      const normalizedMeal = mealType.toLowerCase();
      const overrides = FOOD_MEAL_OVERRIDES[foodName];
      if (overrides && overrides.includes(normalizedMeal as any)) {
        return 2;
      }

      const keywords = MEAL_TYPE_KEYWORDS[normalizedMeal] || [];
      const normalizedName = foodName.toLowerCase();
      if (keywords.some((keyword) => normalizedName.includes(keyword))) {
        return 1;
      }

      // Snacks default to mid priority for uncategorized items, others lowest
      return normalizedMeal === 'snacks' ? 0.5 : 0;
    },
    []
  );

  const filteredFoods = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const mealType = selectedMealType;
    const scoredFoods = FOOD_DATABASE.filter((food) =>
      food.name.toLowerCase().includes(query)
    ).map((food) => ({
      food,
      score: mealType ? getMealPriorityScore(food.name, mealType) : 0,
    }));

    return scoredFoods
      .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
      .map(({ food }) => food);
  }, [getMealPriorityScore, searchQuery, selectedMealType]);

  const handleAddFood = () => {
    setSearchQuery('');
    setShowSearchModal(true);
  };

  const handleFoodSelect = (food: any) => {
    setSelectedFood(food);
    setServingCount('1');
    // Set the first measurement as default
    setSelectedMeasurement(food.measurements?.[0] || null);
    setShowSearchModal(false);
    setShowLogFoodModal(true);
  };

  const handleCustomMealSelect = (meal: any) => {
    // Convert custom meal to food item format
    const foodItem = {
      name: meal.name,
      measurements: [{
        amount: 1,
        unit: meal.servingSize,
        macros: meal.macrosPerServing,
      }],
    };
    handleFoodSelect(foodItem);
  };

  const handleCreateCustomMeal = () => {
    setShowSearchModal(false);
    setShowCustomMealModal(true);
  };

  const handleCustomMealSubmit = (mealInput: CustomMealInput) => {
    const userId = user?.uid || 'anonymous';
    const createdMeal = addCustomMeal({
      name: mealInput.name,
      servingSize: mealInput.servingSize,
      userId: userId,
      macrosPerServing: {
        calories: mealInput.calories,
        protein: mealInput.protein,
        carbs: mealInput.carbs,
        fat: mealInput.fat,
      },
    }, userId);
    
    // Automatically select the newly created meal
    handleCustomMealSelect(createdMeal);
    setShowCustomMealModal(false);
  };

  // Load custom meals on mount
  useEffect(() => {
    const userId = user?.uid || 'anonymous';
    loadCustomMeals(userId);
  }, [loadCustomMeals, user?.uid]);

  // Listen for meal selection from library
  useEffect(() => {
    const { eventBus } = require('@/lib/eventBus');
    const handleMealSelect = (meal: any) => {
      handleCustomMealSelect(meal);
    };
    
    const unsubscribe = eventBus.subscribe('nutrition:selectMeal', handleMealSelect);
    
    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogFood = async () => {
    if (isLoggingFood) {
      return;
    }

    if (!selectedFood || !servingCount || !selectedMeasurement) return;
    
    const count = parseFloat(servingCount);
    if (isNaN(count) || count <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid serving count.');
      return;
    }

    try {
      setIsLoggingFood(true);
      // Ensure we have a valid measurement
      if (!selectedMeasurement || !selectedMeasurement.macros) {
        Alert.alert('Invalid Selection', 'Please select a valid measurement unit.');
        return;
      }

      // Get per-serving macros from the selected measurement (before multiplication)
      const macrosPerServing = selectedMeasurement.macros;

      // Calculate total macros based on serving count
      const calculatedMacros = {
        calories: macrosPerServing.calories * count,
        protein: macrosPerServing.protein * count,
        carbs: macrosPerServing.carbs * count,
        fat: macrosPerServing.fat * count,
      };

      const servingSizeText = `${count} ${selectedMeasurement.unit}${count !== 1 ? 's' : ''}`;

      // Generate food ID before adding (so we can track points)
      const foodId = generateUniqueId('food');

      // Add food item locally first - this updates the store immediately and triggers UI update
      // Pass macrosPerServing (per-serving) so store can calculate totalMacros correctly
      // Also pass micronutrientsPerServing if available
      await addFoodItem({
        name: selectedFood.name,
        servingSize: servingSizeText,
        servingCount: count,
        macrosPerServing: macrosPerServing, // Per-serving macros, not total
        micronutrientsPerServing: selectedMeasurement?.micronutrients, // Pass micronutrients if available
        mealType: selectedMealType as any,
        id: foodId, // Pass the ID so we can track it for points
      } as any); // Type assertion to allow id field

      // Save to Firebase with user UID - await to ensure it's saved before continuing
      // This prevents the meal from disappearing if loadUserMealsFromFirebase is called
      if (user?.uid) {
        const { saveMealToFirebase } = useNutritionStore.getState();
        // Use selectedDate for loggedAt to ensure meals are associated with the correct date
        const loggedAtDate = new Date(selectedDate);
        loggedAtDate.setHours(12, 0, 0, 0);
        const newFoodItem = {
          id: foodId,
          name: selectedFood.name,
          servingSize: servingSizeText,
          servingCount: count,
          macrosPerServing: macrosPerServing, // Per-serving macros
          mealType: selectedMealType as any,
          loggedAt: loggedAtDate,
          totalMacros: calculatedMacros, // Total macros (already calculated)
        };
        // Await the save to ensure it completes before closing modal
        await saveMealToFirebase(newFoodItem, user.uid);
      }

      // No points awarded for adding a food item – points are given when a meal is marked complete
      Alert.alert('Food Added', `${selectedFood.name} added to your ${selectedMealType}.`);

      setShowLogFoodModal(false);
      setSelectedFood(null);
      setSelectedMeasurement(null);
      setServingCount('1');
    } catch (error) {
      console.error('Error logging food:', error);
      Alert.alert('Error', 'Failed to log meal. Please try again.');
    } finally {
      setIsLoggingFood(false);
    }
  };

  const handleLogWater = async (amount: number, count: number, type: 'bottles' | 'cups') => {
    try {
      const foodId = generateUniqueId('food');
      const servingSizeText = `${amount.toFixed(1)} oz`;
      
      // Water has 0 macros
      const waterMacros = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      // Display name shows bottle/cup count
      const unit = type === 'bottles' ? 'bottle' : 'cup';
      const unitPlural = type === 'bottles' ? 'bottles' : 'cups';
      const displayName = count === 1 ? `Water (1 ${unit})` : `Water (${count} ${unitPlural})`;

      // Add water as a food item under snacks meal type
      await addFoodItem({
        id: foodId,
        name: displayName,
        servingSize: servingSizeText,
        servingCount: 1,
        macrosPerServing: waterMacros,
        mealType: 'snacks',
      } as any);

      // Save to Firebase
      if (user?.uid) {
        const { saveMealToFirebase } = useNutritionStore.getState();
        // Use selectedDate for loggedAt to ensure meals are associated with the correct date
        const loggedAtDate = new Date(selectedDate);
        loggedAtDate.setHours(12, 0, 0, 0);
        const waterItem = {
          id: foodId,
          name: displayName,
          servingSize: servingSizeText,
          servingCount: 1,
          macrosPerServing: waterMacros,
          mealType: 'snacks' as const,
          loggedAt: loggedAtDate,
          totalMacros: waterMacros,
        };
        await saveMealToFirebase(waterItem, user.uid);
      }
    } catch (error) {
      console.error('Error logging water:', error);
      throw error;
    }
  };


  const handleEditFood = (food: any) => {
    setEditFood(food);
    setEditServingSize(food.servingSize?.toString?.() || '1 serving');
    setEditServingCount(food.servingCount?.toString?.() || '1');
    setEditCalories(food.macrosPerServing?.calories?.toString?.() || '0');
    setEditProtein(food.macrosPerServing?.protein?.toString?.() || '0');
    setEditCarbs(food.macrosPerServing?.carbs?.toString?.() || '0');
    setEditFat(food.macrosPerServing?.fat?.toString?.() || '0');
    setShowEditFoodModal(true);
  };

  const handleSaveEditFood = async () => {
    try {
      if (!editFood || !user?.uid) return;
      
      const servingCountNumber = parseFloat(editServingCount);
      const caloriesNumber = parseFloat(editCalories);
      const proteinNumber = parseFloat(editProtein);
      const carbsNumber = parseFloat(editCarbs);
      const fatNumber = parseFloat(editFat);

      if (
        isNaN(servingCountNumber) || servingCountNumber <= 0 ||
        isNaN(caloriesNumber) || isNaN(proteinNumber) ||
        isNaN(carbsNumber) || isNaN(fatNumber)
      ) {
        Alert.alert('Invalid Input', 'Please enter valid numbers for serving count and all macros.');
        return;
      }

      // Calculate updated total macros
      const updatedTotalMacros = {
        calories: caloriesNumber * servingCountNumber,
        protein: proteinNumber * servingCountNumber,
        carbs: carbsNumber * servingCountNumber,
        fat: fatNumber * servingCountNumber,
      };

      // Update local store
      updateFoodItem(editFood.id, {
        servingSize: editServingSize,
        servingCount: servingCountNumber,
        macrosPerServing: {
          calories: caloriesNumber,
          protein: proteinNumber,
          carbs: carbsNumber,
          fat: fatNumber,
        },
        totalMacros: updatedTotalMacros,
      });

      // Update Firebase
      const updatedFoodItem = {
        ...editFood,
        servingSize: editServingSize,
        servingCount: servingCountNumber,
        macrosPerServing: {
          calories: caloriesNumber,
          protein: proteinNumber,
          carbs: carbsNumber,
          fat: fatNumber,
        },
        totalMacros: updatedTotalMacros,
      };
      
      await nutritionFirebaseService.updateFoodItemInFirebase(updatedFoodItem, user.uid);

      setShowEditFoodModal(false);
      setEditFood(null);
      Alert.alert('Success', 'Food item updated successfully!');
    } catch (e) {
      console.error('Failed to save edited food:', e);
      Alert.alert('Error', 'Failed to save your changes.');
    }
  };

  const handleDeleteFood = async (food: any) => {
    Alert.alert(
      'Delete Food Item',
      `Are you sure you want to delete "${food.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from local store (this will also deduct points)
              await removeFoodItem(food.id);
              
              // Delete from Firebase and reload meals/meta to reflect immediately
              if (user?.uid) {
                await nutritionFirebaseService.deleteFoodItemFromFirebase(food.id);
                await loadUserMealsFromFirebase(user.uid, selectedDate);
                await refreshDailyMeta(user.uid, selectedDate);
              }
              
              Alert.alert('Deleted', `"${food.name}" has been removed.`);
            } catch (error) {
              console.error('Error deleting food item:', error);
              Alert.alert('Error', 'Failed to delete food item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCompleteMeal = async (mealType: string) => {
    if (!user?.uid) {
      Alert.alert('Meal Completed!', 'Meal logged.');
      return;
    }

    console.log('🍽️ Completing meal:', mealType, 'for user:', user.uid);

    // Check if user is a coach creating a meal plan for players
    const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';

    try {
      // Only award points if NOT a coach (coaches don't earn points for meal plans)
      if (!isCoach) {
        const mealCompletionId = `${getLocalDateKey(selectedDate)}_${mealType}`;
        // Add points using the proper store method (no daily cap)
        await addPoints({
          type: 'complete_meal',
          amount: 30,
          description: `Completed ${mealType} meal`,
          referenceId: mealCompletionId,
        }, user.uid);

        console.log('✅ Points added successfully for meal completion');
        Alert.alert('Meal Completed!', 'Meal completed! +30 V.');
      } else {
        console.log('👨‍💼 Coach completing meal - no points awarded');
        Alert.alert('Meal Completed!', 'Meal logged.');
      }
      
      // Mark this meal as completed in store (persists per day)
      await safeSetMealCompleted(selectedDate, mealType as any, true, user?.uid);
      
      // Force refresh of currentDayNutrition to update UI first
      if (user?.uid) {
        await refreshDailyMeta(user.uid, selectedDate);
        // The store will automatically update currentDayNutrition via the useEffect hook
        console.log('🔄 Refreshed day nutrition after meal completion');
      }
      
      // Note: We no longer track individual meal completions for shared meal plans
      // Players will use the "Mark as Complete" button instead
    } catch (error) {
      console.error('❌ Error completing meal:', error);
      Alert.alert('Meal Completed!', 'Meal logged (points may not have been added due to an error).');
    }
  };

  const handleSendMealPlanToTeam = async () => {
    console.log('📤 handleSendMealPlanToTeam called');
    console.log('📤 User:', user?.uid);
    console.log('📤 Profile:', profile);
    console.log('📤 Current Day Nutrition:', currentDayNutrition);
    
    if (!user?.uid || !profile?.teamId || !currentDayNutrition) {
      console.error('❌ Missing required data');
      Alert.alert('Error', 'Cannot send meal plan. Missing user or team information.');
      return;
    }

    const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
    console.log('📤 Is Coach:', isCoach);
    
    if (!isCoach) {
      Alert.alert('Error', 'Only coaches can send meal plans to their team.');
      return;
    }

    try {
      console.log('📤 Loading team and players...');
      // Load team and players
      setLoadingPlayers(true);
      const { teamService } = await import('@/services/teamService');
      const team = await teamService.getTeamById(profile.teamId);
      
      if (!team || !team.members) {
        Alert.alert('Error', 'Team not found or has no members.');
        setLoadingPlayers(false);
        return;
      }

      // Get player IDs (exclude coach)
      const playerMemberIds = team.members
        .filter(member => member.userId !== user.uid && member.role === 'player')
        .map(member => member.userId);
      
      if (playerMemberIds.length === 0) {
        Alert.alert('No Players', 'Your team has no players to send the meal plan to.');
        setLoadingPlayers(false);
        return;
      }

      // Get player names
      const { userService } = await import('@/services/firestoreService');
      const players = await Promise.all(
        playerMemberIds.map(async (playerId) => {
          try {
            const playerDoc = await userService.getUser(playerId);
            return {
              id: playerId,
              name: playerDoc?.firstName || team.members.find(m => m.userId === playerId)?.name || 'Player'
            };
          } catch (error) {
            console.error(`Error loading player name for ${playerId}:`, error);
            return {
              id: playerId,
              name: team.members.find(m => m.userId === playerId)?.name || 'Player'
            };
          }
        })
      );

      console.log('📤 Players loaded:', players);
      setAvailablePlayers(players);
      setSelectedPlayers([]);
      console.log('📤 Opening player selection modal...');
      setShowPlayerSelectionModal(true);
      setLoadingPlayers(false);
      console.log('✅ Modal should now be visible');
    } catch (error) {
      console.error('❌ Error loading players:', error);
      Alert.alert('Error', 'Failed to load players. Please try again.');
      setLoadingPlayers(false);
    }
  };

  const handleConfirmSendMealPlan = async (assignedDate?: Date) => {
    if (selectedPlayers.length === 0) {
      Alert.alert('No Players Selected', 'Please select at least one player to send the meal plan to.');
      return;
    }

    if (!user?.uid || !profile?.teamId || !currentDayNutrition) {
      Alert.alert('Error', 'Cannot send meal plan. Missing user or team information.');
      return;
    }

    try {
      setLoadingPlayers(true);
      
      // Import services
      const { mealPlanSharingService } = await import('@/services/mealPlanSharingService');
      const { teamService } = await import('@/services/teamService');
      
      const team = await teamService.getTeamById(profile.teamId);
      if (!team) {
        Alert.alert('Error', 'Team not found.');
        setLoadingPlayers(false);
        return;
      }

      // Get player names for selected IDs
      const playerNames = selectedPlayers.map(playerId => {
        const player = availablePlayers.find(p => p.id === playerId);
        return player?.name || 'Player';
      });

      // Use assigned date if provided, otherwise use selected date
      const targetDate = assignedDate || selectedDate;
      const selectedDateString = getLocalDateKey(targetDate);
      let nutritionToUse = currentDayNutrition;
      
      if (nutritionToUse && nutritionToUse.date !== selectedDateString) {
        console.warn('⚠️ Date mismatch detected, reloading nutrition for selected date');
        // Reload nutrition for the selected date
        await loadUserMealsFromFirebase(user.uid, selectedDate);
        // Get updated currentDayNutrition after reload
        const { currentDayNutrition: updatedNutrition } = useNutritionStore.getState();
        if (updatedNutrition && updatedNutrition.date === selectedDateString) {
          // Use the updated nutrition
          nutritionToUse = updatedNutrition;
        }
      }

      // Helper function to filter foods by date to ensure we only send foods for the selected date
      const filterFoodsByDate = (foods: any[]) => {
        return foods.filter(food => {
          const foodDate = food.loggedAt 
            ? getLocalDateKey(food.loggedAt)
            : null;
          return foodDate === selectedDateString;
        });
      };

      // Helper function to ensure we only send unique foods (no duplicates) and preserve exact serving counts
      const prepareFoodsForSending = (foods: any[]) => {
        // Remove duplicates based on food name, serving size, serving count, and meal type
        // This ensures if coach has "1 serving Greek Yogurt" entered once, it's sent once
        const seen = new Set<string>();
        const unique: any[] = [];
        
        for (const food of foods) {
          // Create a unique key based on all identifying properties
          const foodKey = `${food.name}::${food.servingSize}::${food.servingCount}::${food.mealType}`;
          
          if (!seen.has(foodKey)) {
            seen.add(foodKey);
            // Send the exact food object with exact serving count preserved
            unique.push({
              name: food.name,
              servingSize: food.servingSize,
              servingCount: food.servingCount, // Preserve exact serving count
              macrosPerServing: food.macrosPerServing,
              totalMacros: food.totalMacros,
              mealType: food.mealType,
            });
          } else {
            console.log(`⚠️ Skipping duplicate food in meal plan: ${food.name} (${food.servingCount} × ${food.servingSize})`);
          }
        }
        
        return unique;
      };

      // Get foods for each meal type and filter by date to ensure only selected date foods are included
      const breakfastFoodsRaw = filterFoodsByDate(getFoodsByMeal('breakfast'));
      const lunchFoodsRaw = filterFoodsByDate(getFoodsByMeal('lunch'));
      const dinnerFoodsRaw = filterFoodsByDate(getFoodsByMeal('dinner'));
      const snacksFoodsRaw = filterFoodsByDate(getFoodsByMeal('snacks'));

      // Prepare unique foods for sending (removes any duplicates)
      const breakfastFoods = prepareFoodsForSending(breakfastFoodsRaw);
      const lunchFoods = prepareFoodsForSending(lunchFoodsRaw);
      const dinnerFoods = prepareFoodsForSending(dinnerFoodsRaw);
      const snacksFoods = prepareFoodsForSending(snacksFoodsRaw);

      console.log(`📤 Preparing meal plan for ${selectedDateString}:`, {
        breakfast: `${breakfastFoodsRaw.length} → ${breakfastFoods.length} unique`,
        lunch: `${lunchFoodsRaw.length} → ${lunchFoods.length} unique`,
        dinner: `${dinnerFoodsRaw.length} → ${dinnerFoods.length} unique`,
        snacks: `${snacksFoodsRaw.length} → ${snacksFoods.length} unique`,
        total: breakfastFoods.length + lunchFoods.length + dinnerFoods.length + snacksFoods.length
      });

      // Log serving counts for verification
      snacksFoods.forEach(food => {
        console.log(`  📦 Snack: ${food.name} - ${food.servingCount} × ${food.servingSize}`);
      });

      // Prepare meal plan data - only include unique foods from the selected date with exact serving counts
      // Use assigned date if provided (for future assignments)
      const mealPlanData = {
        date: assignedDate ? getLocalDateKey(assignedDate) : selectedDateString,
        meals: {
          breakfast: breakfastFoods,
          lunch: lunchFoods,
          dinner: dinnerFoods,
          snacks: snacksFoods,
        },
        totalMacros: nutritionToUse?.totalMacros || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      };

      // Share meal plan with selected players
      const success = await mealPlanSharingService.shareMealPlanWithPlayers(
        mealPlanData,
        user.uid,
        profile.firstName || user.displayName || 'Coach',
        profile.teamId,
        team.name,
        selectedPlayers,
        playerNames
      );

      setLoadingPlayers(false);
      setShowPlayerSelectionModal(false);
      setSelectedPlayers([]);

      if (success) {
        Alert.alert(
          '✅ Meal Plan Sent!',
          `Your meal plan has been sent to ${selectedPlayers.length} player${selectedPlayers.length !== 1 ? 's' : ''}.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to send meal plan. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error sending meal plan:', error);
      Alert.alert('Error', 'Failed to send meal plan. Please try again.');
      setLoadingPlayers(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const handleSnapTrack = () => {
    if (!isFeatureEnabled('cameraPhotoMacros')) {
      return; // Feature disabled
    }
    if (!isFeatureUnlocked('photo_macros')) {
      setShowUnlockModal(true);
    } else {
      setShowSnapTrackModal(true);
    }
  };

  const handleUnlockSnapTrack = async () => {
    const cost = 5000;
    if (totalPoints >= cost && user?.uid) {
      const success = await spendPoints(cost, 'Unlock Snap & Track', user.uid);
      if (success) {
        await unlockFeature('photo_macros', 'gp', user.uid);
        setShowUnlockModal(false);
        Alert.alert('Unlocked!', 'Snap & Track feature unlocked!');
      }
    } else {
      Alert.alert('Insufficient Points', 'You need more V to unlock this feature.');
    }
  };

  const handleMockCapture = () => {
    setShowSnapTrackModal(false);
    Alert.alert('Photo Captured', 'AI estimated: Grilled Chicken (200g) - 330 cal, 62g protein, 0g carbs, 7g fat. Edit and save to log.');
  };

  // Format date helper
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handlePlayerSelect = async (playerId: string, playerName: string) => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerName(playerName);
    setLoadingPlayerTargets(true);
    
    try {
      const { userService } = await import('@/services/firestoreService');
      const playerDoc = await userService.getUser(playerId);
      
      if (playerDoc?.customMacroTargets) {
        const targets = {
          calories: playerDoc.customMacroTargets.calories,
          protein: playerDoc.customMacroTargets.protein,
          carbs: playerDoc.customMacroTargets.carbs,
          fat: playerDoc.customMacroTargets.fat,
        };
        setSelectedPlayerTargets(targets);
        
        // Update nutrition store with player's targets
        useNutritionStore.getState().setPersonalizedTargets(targets);
        
        // Refresh current day nutrition to use new targets
        const nutritionStore = useNutritionStore.getState();
        const updatedDayNutrition = nutritionStore.getDailyNutrition(nutritionStore.selectedDate);
        useNutritionStore.setState({ currentDayNutrition: updatedDayNutrition });
      } else {
        Alert.alert('No Targets', 'This player does not have macro targets set yet.');
        setSelectedPlayerTargets(null);
      }
    } catch (error) {
      console.error('❌ Error loading player targets:', error);
      Alert.alert('Error', 'Failed to load player targets. Please try again.');
      setSelectedPlayerTargets(null);
    } finally {
      setLoadingPlayerTargets(false);
    }
  };

  const handlePlayerSelectWithTargets = (playerId: string, playerName: string, targets: { calories: number; protein: number; carbs: number; fat: number }) => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerName(playerName);
    setSelectedPlayerTargets(targets);
    
    // Update nutrition store with player's targets
    useNutritionStore.getState().setPersonalizedTargets(targets);
    const { getDailyNutrition, selectedDate } = useNutritionStore.getState();
    const updatedDayNutrition = getDailyNutrition(selectedDate);
    useNutritionStore.setState({ currentDayNutrition: updatedDayNutrition });
  };

  const renderPlayerSelector = () => {
    return (
      <PlayerSelector
        profile={profile}
        colors={colors}
        onPlayerSelect={handlePlayerSelectWithTargets}
      />
    );
  };


  const renderMacroBars = () => {
    if (!currentDayNutrition) return null;
    
    const { totalMacros, targetMacros } = currentDayNutrition;

    return (
      <MacroBars
        totalMacros={totalMacros}
        targetMacros={targetMacros}
        colors={colors}
      />
    );
  };


  const renderMealSection = (mealType: any) => {
    const foods = getFoodsByMeal(mealType.key);
    
    return (
      <MealSection
        key={mealType.key}
        mealType={mealType}
        foods={foods}
        currentDayNutrition={currentDayNutrition}
        colors={colors}
        profile={profile}
        canCompleteMeal={true}
        onAddFood={(mealType) => {
          setSelectedMealType(mealType);
          handleAddFood();
        }}
        onCompleteMeal={handleCompleteMeal}
        onEditFood={handleEditFood}
        onDeleteFood={handleDeleteFood}
      />
    );
  };


  // Handle player marking meal plan as complete (also sends edits back to coach)
  const handleMarkMealPlanComplete = async () => {
    if (!user?.uid || !profile?.teamId || !currentDayNutrition) {
      Alert.alert('Error', 'Cannot mark meal plan as complete. Missing required information.');
      return;
    }

    // Try mealPlanId field first, then document ID as fallback
    const currentMealPlanId = (global as any).sharedMealPlanId || sharedMealPlanId;
    const mealPlanDocId = (global as any).sharedMealPlanDocId;
    
    if (!currentMealPlanId && !mealPlanDocId) {
      Alert.alert('Error', 'No meal plan found to mark as complete.');
      return;
    }
    
    // Use mealPlanId if available, otherwise use document ID
    const idToUse = currentMealPlanId || mealPlanDocId;
    
    console.log('🔍 Meal plan IDs available:', {
      mealPlanId: currentMealPlanId,
      docId: mealPlanDocId,
      idToUse: idToUse
    });

    Alert.alert(
      isMealPlanCompleted ? 'Update Meal Plan' : 'Complete Meal Plan',
      isMealPlanCompleted 
        ? 'This will send your updated meal plan back to your coach. Continue?'
        : 'This will mark your meal plan as complete and send your edits back to your coach. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isMealPlanCompleted ? 'Update & Send' : 'Complete & Send',
          onPress: async () => {
            try {
              console.log('✅ Player marking meal plan as complete and sending edits');
              
              // Get current meal plan data with player's edits
              const selectedDateString = getLocalDateKey(selectedDate);
              
              // Get foods for each meal type
              const breakfastFoods = getFoodsByMeal('breakfast');
              const lunchFoods = getFoodsByMeal('lunch');
              const dinnerFoods = getFoodsByMeal('dinner');
              const snacksFoods = getFoodsByMeal('snacks');

              // Prepare meal plan data with player's edits
              const mealPlanData = {
                date: selectedDateString,
                meals: {
                  breakfast: breakfastFoods.map(f => ({
                    name: f.name,
                    servingSize: f.servingSize,
                    servingCount: f.servingCount,
                    macrosPerServing: f.macrosPerServing,
                    totalMacros: f.totalMacros,
                    mealType: f.mealType,
                  })),
                  lunch: lunchFoods.map(f => ({
                    name: f.name,
                    servingSize: f.servingSize,
                    servingCount: f.servingCount,
                    macrosPerServing: f.macrosPerServing,
                    totalMacros: f.totalMacros,
                    mealType: f.mealType,
                  })),
                  dinner: dinnerFoods.map(f => ({
                    name: f.name,
                    servingSize: f.servingSize,
                    servingCount: f.servingCount,
                    macrosPerServing: f.macrosPerServing,
                    totalMacros: f.totalMacros,
                    mealType: f.mealType,
                  })),
                  snacks: snacksFoods.map(f => ({
                    name: f.name,
                    servingSize: f.servingSize,
                    servingCount: f.servingCount,
                    macrosPerServing: f.macrosPerServing,
                    totalMacros: f.totalMacros,
                    mealType: f.mealType,
                  })),
                },
                totalMacros: currentDayNutrition.totalMacros,
              };

              console.log('🔍 Attempting to complete meal plan');
              console.log('🔍 Available IDs:', {
                mealPlanId: currentMealPlanId,
                docId: mealPlanDocId,
                idToUse: idToUse
              });
              console.log('🔍 User ID:', user.uid);
              console.log('🔍 Profile:', {
                teamId: profile?.teamId,
                firstName: profile?.firstName
              });
              
              // Send edits back to coach (try both IDs)
              let editsSuccess = false;
              try {
                editsSuccess = await mealPlanSharingService.updateMealPlanWithPlayerEdits(
                  idToUse,
                  user.uid,
                  mealPlanData,
                  profile.firstName || user.displayName || 'Player'
                );
              } catch (editError) {
                console.error('❌ Error sending edits:', editError);
                // Try with document ID if mealPlanId failed
                if (currentMealPlanId && mealPlanDocId && idToUse === currentMealPlanId) {
                  console.log('🔄 Retrying with document ID...');
                  editsSuccess = await mealPlanSharingService.updateMealPlanWithPlayerEdits(
                    mealPlanDocId,
                    user.uid,
                    mealPlanData,
                    profile.firstName || user.displayName || 'Player'
                  );
                }
              }
              
              console.log('📤 Edits sent:', editsSuccess);

              // Mark as complete (try both IDs)
              let completeSuccess = false;
              try {
                completeSuccess = await mealPlanSharingService.markMealPlanComplete(
                  idToUse,
                  user.uid
                );
              } catch (completeError) {
                console.error('❌ Error marking complete:', completeError);
                // Try with document ID if mealPlanId failed
                if (currentMealPlanId && mealPlanDocId && idToUse === currentMealPlanId) {
                  console.log('🔄 Retrying with document ID...');
                  completeSuccess = await mealPlanSharingService.markMealPlanComplete(
                    mealPlanDocId,
                    user.uid
                  );
                }
              }
              
              console.log('✅ Completion status:', completeSuccess);

              if (completeSuccess && editsSuccess) {
                // Mark as completed and store the sent data
                setIsMealPlanCompleted(true);
                setLastSentMealPlanData(mealPlanData);
                // Refresh completion status to ensure button updates
                if (idToUse) {
                  checkCompletionStatus(idToUse);
                }
                Alert.alert(
                  isMealPlanCompleted ? 'Meal Plan Updated! 🎉' : 'Meal Plan Completed! 🎉',
                  isMealPlanCompleted 
                    ? 'Your updated meal plan has been sent to your coach.'
                    : 'Your meal plan has been marked as complete and your edits have been sent to your coach.',
                  [{ text: 'OK' }]
                );
              } else if (completeSuccess) {
                // Mark as completed even if edits failed
                setIsMealPlanCompleted(true);
                setLastSentMealPlanData(mealPlanData);
                // Refresh completion status
                if (idToUse) {
                  checkCompletionStatus(idToUse);
                }
                Alert.alert(
                  'Meal Plan Completed! 🎉',
                  'Your coach has been notified. Note: There was an issue sending your edits.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', 'Failed to mark meal plan as complete. Please try again.');
              }
            } catch (error) {
              console.error('❌ Error marking meal plan as complete:', error);
              Alert.alert('Error', 'An error occurred while marking the meal plan as complete.');
            }
          }
        }
      ]
    );
  };

  // Check if current meal plan has been edited compared to last sent version
  const hasMealPlanChanged = React.useMemo(() => {
    if (!currentDayNutrition || !lastSentMealPlanData) {
      // If no last sent data, show button if not completed
      return !isMealPlanCompleted;
    }
    
    // Get current meal plan data
    const selectedDateString = getLocalDateKey(selectedDate);
    const breakfastFoods = getFoodsByMeal('breakfast');
    const lunchFoods = getFoodsByMeal('lunch');
    const dinnerFoods = getFoodsByMeal('dinner');
    const snacksFoods = getFoodsByMeal('snacks');
    
    const currentMealPlanData = {
      date: selectedDateString,
      meals: {
        breakfast: breakfastFoods.map(f => ({
          name: f.name,
          servingSize: f.servingSize,
          servingCount: f.servingCount,
          mealType: f.mealType,
        })),
        lunch: lunchFoods.map(f => ({
          name: f.name,
          servingSize: f.servingSize,
          servingCount: f.servingCount,
          mealType: f.mealType,
        })),
        dinner: dinnerFoods.map(f => ({
          name: f.name,
          servingSize: f.servingSize,
          servingCount: f.servingCount,
          mealType: f.mealType,
        })),
        snacks: snacksFoods.map(f => ({
          name: f.name,
          servingSize: f.servingSize,
          servingCount: f.servingCount,
          mealType: f.mealType,
        })),
      },
    };
    
    // Compare current with last sent (simple JSON comparison)
    const currentStr = JSON.stringify(currentMealPlanData);
    const lastSentStr = JSON.stringify(lastSentMealPlanData);
    const hasChanged = currentStr !== lastSentStr;
    
    console.log('🔍 Meal plan change check:', {
      hasChanged,
      currentLength: currentStr.length,
      lastSentLength: lastSentStr.length
    });
    
    return hasChanged;
  }, [currentDayNutrition, lastSentMealPlanData, selectedDate, isMealPlanCompleted, getFoodsByMeal]);
  
  const renderDailyTotals = () => {
    if (!currentDayNutrition || !currentDayNutrition.foods || currentDayNutrition.foods.length === 0) return null;
    
    return (
      <DailyTotals
        totalMacros={currentDayNutrition.totalMacros}
        targetMacros={currentDayNutrition.targetMacros}
        colors={colors}
      />
    );
  };

  const handleSaveManualMacros = async () => {
    if (!user) return;
    
    try {
      const calories = parseInt(manualCalories);
      const protein = parseInt(manualProtein);
      const carbs = parseInt(manualCarbs);
      const fat = parseInt(manualFat);
      
      if (isNaN(calories) || isNaN(protein) || isNaN(carbs) || isNaN(fat)) {
        Alert.alert('Invalid Input', 'Please enter valid numbers for all macro fields.');
        return;
      }
      
      // Save to Firebase
      await userService.updateUser(user.uid, {
        customMacroTargets: {
          calories,
          protein,
          carbs,
          fat,
          calculatedAt: new Date(),
          basedOnWeight: userDoc?.weight?.value || 0,
          basedOnGoal: mapGoalToPrimary(
            profile?.goals && profile.goals.length > 0
              ? profile.goals[0]
              : profile?.primaryGoal || 'improve_fitness'
          ),
        },
      });
      
      // Update nutrition store
      useNutritionStore.getState().setPersonalizedTargets({ calories, protein, carbs, fat });
      
      // Refresh current day nutrition to use new targets
      const { selectedDate, getDailyNutrition } = useNutritionStore.getState();
      const updatedDayNutrition = getDailyNutrition(selectedDate);
      useNutritionStore.setState({ currentDayNutrition: updatedDayNutrition });
      
      setShowManualMacroModal(false);
      Alert.alert('Success', 'Your custom macro targets have been saved!');
    } catch (error) {
      console.error('Error saving manual macros:', error);
      Alert.alert('Error', 'Failed to save macro targets. Please try again.');
    }
  };

  // Handle complete meal plan (for players)
  const handleCompleteMealPlan = handleMarkMealPlanComplete;

  // Check if user is a coach
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
  
  // Week offset state (mirrors workout tab calendar navigation)
  const [weekOffset, setWeekOffset] = useState(0);

  const handleResetToToday = () => {
    const today = new Date();
    setWeekOffset(0);
    setSelectedDate(today);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.dateNavigatorContainer}>
          <TouchableOpacity
            style={styles.dateNavButton}
            onPress={() => {
              const prevDate = new Date(selectedDate);
              prevDate.setDate(prevDate.getDate() - 1);
              setSelectedDate(prevDate);
              setWeekOffset(0); // Reset week offset when manually navigating
            }}
          >
            <IconSymbol name="chevron.left" size={24} color={BrandColors.accent} />
          </TouchableOpacity>
          
          <View style={styles.dateDisplay}>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.dateNavButton}
            onPress={() => {
              const nextDate = new Date(selectedDate);
              nextDate.setDate(nextDate.getDate() + 1);
              setSelectedDate(nextDate);
              setWeekOffset(0); // Reset week offset when manually navigating
            }}
          >
            <IconSymbol name="chevron.right" size={24} color={BrandColors.accent} />
          </TouchableOpacity>
        </View>
        
        <LightningSeparator />
        
        {/* Main Content Section */}
        <View style={[styles.mainContent, { marginTop: -4 }]}>
          {renderPlayerSelector()}
          
          {/* Two Column Layout: Calorie Budget (Left) and Macro Bars (Right) */}
          <View style={styles.twoColumnLayout}>
            {/* Left: Calorie Budget */}
            <View style={styles.leftColumn}>
              <View style={[styles.calorieBudgetBox, { 
                backgroundColor: colors.surface, 
                borderColor: BrandColors.accent,
                shadowColor: BrandColors.accent,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 5,
              }]}>
                <View style={styles.macroBarsHeader}>
                  <Text style={[styles.macroBarsBoxTitle, { color: colors.text }]}>Calorie Budget</Text>
                </View>
                <CalorieBudget
                  consumed={(() => {
                    const consumedCalories = currentDayNutrition?.totalMacros?.calories || 0;
                    // Get workout for selected date and sum up calories burned from cardio
                    const workout = getWorkoutForDate(selectedDate);
                    const caloriesBurned = workout?.exercises
                      ?.filter(ex => ex.type === 'cardio' && ex.caloriesBurned)
                      .reduce((sum, ex) => sum + (ex.caloriesBurned || 0), 0) || 0;
                    // Subtract calories burned from consumed (net calories)
                    return Math.max(0, consumedCalories - caloriesBurned);
                  })()}
                  target={getTargets().calories || 2000}
                  colors={colors}
                />
              </View>
            </View>
            
            {/* Right: Macro Bars Box */}
            <View style={styles.rightColumn}>
              <TouchableOpacity
                style={[styles.macroBarsBox, { 
                  backgroundColor: colors.surface, 
                  borderColor: BrandColors.accent,
                  shadowColor: BrandColors.accent,
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }]}
                onPress={() => {
                  if (!isCoach && userDoc?.customMacroTargets) {
                    setManualCalories(userDoc.customMacroTargets.calories.toString());
                    setManualProtein(userDoc.customMacroTargets.protein.toString());
                    setManualCarbs(userDoc.customMacroTargets.carbs.toString());
                    setManualFat(userDoc.customMacroTargets.fat.toString());
                    setShowManualMacroModal(true);
                  }
                }}
                activeOpacity={0.7}
                disabled={isCoach || !userDoc?.customMacroTargets}
              >
                <View style={styles.macroBarsHeader}>
                  <Text style={[styles.macroBarsBoxTitle, { color: colors.text }]}>Daily Macros</Text>
                </View>
                {renderMacroBars()}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Meals Section */}
          <View style={styles.mealsSection}>
            {MEAL_TYPES.map(renderMealSection)}
          </View>
          
          {/* Nutritional Breakdown Button */}
          <View style={styles.nutritionalBreakdownButtonContainer}>
            <TouchableOpacity
              style={[styles.nutritionalBreakdownButton, { backgroundColor: BrandColors.accent }]}
              onPress={() => {
                console.log('Nutritional breakdown button pressed');
                setShowNutritionalBreakdownModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.nutritionalBreakdownButtonText}>View Nutritional Breakdown</Text>
            </TouchableOpacity>
          </View>
          
          {/* Meal Plan Actions */}
          <MealPlanActions
            profile={profile}
            currentDayNutrition={currentDayNutrition}
            selectedPlayerId={selectedPlayerId}
            isMealPlanCompleted={isMealPlanCompleted}
            hasSharedMealPlan={!!((global as any).sharedMealPlanId || sharedMealPlanId)}
            hasMealPlanChanged={hasMealPlanChanged}
            onSendMealPlan={handleSendMealPlanToTeam}
            onCompleteMealPlan={handleCompleteMealPlan}
            colors={colors}
          />
          
          {/* Daily Totals */}
          {renderDailyTotals()}
        </View>
      </ScrollView>
      
      <SearchModal
        visible={showSearchModal}
        searchQuery={searchQuery}
        filteredFoods={filteredFoods}
        customMeals={customMeals}
        onClose={() => setShowSearchModal(false)}
        onSearchChange={setSearchQuery}
        onFoodSelect={handleFoodSelect}
        onCustomMealSelect={handleCustomMealSelect}
        onCreateCustomMeal={handleCreateCustomMeal}
        colors={colors}
      />
      <CustomMealModal
        visible={showCustomMealModal}
        onClose={() => setShowCustomMealModal(false)}
        onSubmit={handleCustomMealSubmit}
        colors={colors}
      />
      <Modal
        visible={showMealPlanGenerator}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <MealPlanGenerator 
          isInitialGeneration={false}
          onClose={() => setShowMealPlanGenerator(false)}
        />
      </Modal>
      <LogFoodModal
        visible={showLogFoodModal}
        selectedFood={selectedFood}
        selectedMeasurement={selectedMeasurement}
        servingCount={servingCount}
        selectedMealType={selectedMealType}
        onClose={() => setShowLogFoodModal(false)}
        onMeasurementSelect={setSelectedMeasurement}
        onServingCountChange={setServingCount}
        onSave={handleLogFood}
        colors={colors}
      />
      {isFeatureEnabled('cameraPhotoMacros') && (
        <SnapTrackModal
          visible={showSnapTrackModal}
          onClose={() => setShowSnapTrackModal(false)}
          onCapture={handleMockCapture}
          colors={colors}
        />
      )}
      <WaterTrackingModal
        visible={showWaterTrackingModal}
        onClose={() => setShowWaterTrackingModal(false)}
        onLogWater={handleLogWater}
        colors={colors}
      />
      <UnlockModal
        visible={showUnlockModal}
        totalPoints={totalPoints}
        onClose={() => setShowUnlockModal(false)}
        onUnlock={handleUnlockSnapTrack}
        colors={colors}
      />
      <NutritionPlannerModal
        visible={showNutritionPlannerModal}
        onClose={() => setShowNutritionPlannerModal(false)}
        colors={colors}
      />
      <ManualMacroModal
        visible={showManualMacroModal}
        manualCalories={manualCalories}
        manualProtein={manualProtein}
        manualCarbs={manualCarbs}
        manualFat={manualFat}
        onClose={() => setShowManualMacroModal(false)}
        onCaloriesChange={setManualCalories}
        onProteinChange={setManualProtein}
        onCarbsChange={setManualCarbs}
        onFatChange={setManualFat}
        onSave={handleSaveManualMacros}
        colors={colors}
      />
      <EditFoodModal
        visible={showEditFoodModal}
        editFood={editFood}
        editServingSize={editServingSize}
        editServingCount={editServingCount}
        editCalories={editCalories}
        editProtein={editProtein}
        editCarbs={editCarbs}
        editFat={editFat}
        onClose={() => setShowEditFoodModal(false)}
        onServingSizeChange={setEditServingSize}
        onServingCountChange={setEditServingCount}
        onCaloriesChange={setEditCalories}
        onProteinChange={setEditProtein}
        onCarbsChange={setEditCarbs}
        onFatChange={setEditFat}
        onSave={handleSaveEditFood}
        colors={colors}
      />
      <PlayerSelectionModal
        visible={showPlayerSelectionModal}
        availablePlayers={availablePlayers}
        selectedPlayers={selectedPlayers}
        loadingPlayers={loadingPlayers}
        onClose={() => setShowPlayerSelectionModal(false)}
        onTogglePlayer={togglePlayerSelection}
        onConfirm={handleConfirmSendMealPlan}
        colors={colors}
      />
      <NutritionalBreakdownModal
        visible={showNutritionalBreakdownModal}
        onClose={() => setShowNutritionalBreakdownModal(false)}
        foods={currentDayNutrition?.foods || []}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateNavigatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  dateNavButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text,
  },
  weekPickerContainer: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mainContent: {
    paddingHorizontal: 16,
  },
  macroBarsBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    padding: Spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    minHeight: 280,
    flex: 1,
  },
  macroBarsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroBarsBoxTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  editMacroButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieBudgetBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    flex: 1,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  mealsSection: {
    gap: 12,
    marginBottom: 20,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  personalizedTargetsCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  personalizedTargetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  editMacrosButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editMacrosButtonText: {
    fontSize: 16,
  },
  personalizedTargetsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  personalizedTargetsSubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  breakdownContainer: {
    marginTop: 4,
    marginBottom: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  personalizedTargetsNote: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  playerSelectorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  playerSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  playerSelectorDropdown: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 10,
  },
  playerSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  playerSelectorButtonText: {
    fontSize: 16,
    flex: 1,
  },
  playerDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playerDropdownList: {
    maxHeight: 200,
  },
  playerDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  playerDropdownItemText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  playerTargetsCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  playerTargetsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  playerTargetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  playerTargetItem: {
    width: '48%',
    marginBottom: 12,
  },
  playerTargetLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  playerTargetValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  manualMacroDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  macroSection: {
    marginBottom: 20,
  },
  macroBar: {
    marginBottom: 12,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lockSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  mealSection: {
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  mealCount: {
    fontSize: 14,
  },
  emptyMealText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  foodServing: {
    fontSize: 14,
    marginBottom: 2,
  },
  foodMacros: {
    fontSize: 12,
  },
  removeFoodButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeFoodText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  teaserCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  teaserTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teaserSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  learnMoreButton: {
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: BrandColors.tint,
    minWidth: 80,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 80,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  searchResultServing: {
    fontSize: 14,
    marginBottom: 2,
  },
  searchResultMacros: {
    fontSize: 12,
  },
  foodDetails: {
    marginBottom: 20,
  },
  foodDetailsName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  foodDetailsServing: {
    fontSize: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  mealTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mealTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeMealButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  modalActionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  scanButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 44,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mockScanButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    minHeight: 44,
  },
  mockScanButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // New macro bar styles
  macroBarContainer: {
    marginBottom: 16,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroBarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  macroBarValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  macroBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // New meal button styles
  mealButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  mealButton: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 56,
  },
  mealButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Meal section styles
  mealSubtotal: {
    fontSize: 12,
    marginTop: 4,
  },
  // Daily totals styles
  dailyTotalsContainer: {
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BrandColors.gray700,
  },
  dailyTotalsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  dailyTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dailyTotalItem: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scanPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scanPlaceholderText: {
    fontSize: 24,
    marginBottom: 8,
  },
  scanPlaceholderSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraPlaceholderText: {
    fontSize: 24,
    marginBottom: 8,
  },
  cameraPlaceholderSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  captureButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  unlockModalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },
  unlockModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  unlockModalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  unlockModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  unlockModalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  unlockButton: {
    // backgroundColor set dynamically
  },
  unlockModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buyPointsButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  buyPointsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoModalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  infoModalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  infoModalButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    position: 'absolute',
    bottom: 50,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  measurementButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measurementButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 60,
  },
  measurementButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Swipe action styles moved to SwipeableFoodItem component
  sendMealPlanButton: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendMealPlanButtonDisabled: {
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendMealPlanButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
  },
  completeMealPlanButton: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  completeMealPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
  },
  playerSelectionModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  playerSelectionSubtitle: {
    fontSize: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    fontFamily: 'ui-rounded',
  },
  playerList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  playerSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  playerSelectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BrandColors.accent,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerSelectionName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  playerSelectionActions: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sendButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
  },
  // Macro Challenge Card styles
  macroChallengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 20,
  },
  macroChallengeCompleted: {
    // Styles applied when challenge is completed
  },
  macroChallengeReady: {
    // Styles applied when target is hit but not yet rewarded
  },
  macroChallengeIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  macroChallengeContent: {
    flex: 1,
  },
  macroChallengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroChallengeSubtitle: {
    fontSize: 14,
  },
  nutritionalBreakdownButtonContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  nutritionalBreakdownButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  nutritionalBreakdownButtonText: {
    color: '#fff',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
});

