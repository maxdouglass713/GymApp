import { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/components/AuthProvider';
import { useNutritionStore } from '@/stores/nutritionStore';
import { deduplicateFoods, getFoodKey, convertSharedFoodToFoodItem } from '@/utils/nutrition/mealPlanHelpers';
import { useFocusEffect } from '@react-navigation/native';

export const useMealPlan = () => {
  const { user } = useAuth();
  const { 
    addFoodItem, 
    setSelectedDate, 
    selectedDate, 
    loadUserMealsFromFirebase,
    removeFoodItem,
    saveMealToFirebase,
    currentDayNutrition,
  } = useNutritionStore();
  
  const sharedMealPlanLoadedRef = useRef(false);
  const [sharedMealPlanId, setSharedMealPlanId] = useState<string | null>(null);

  const loadSharedMealPlan = useCallback(async () => {
    try {
      const mealPlanData = (global as any).sharedMealPlanData;
      if (!mealPlanData) {
        console.log('🍽️ No shared meal plan data available');
        return false;
      }

      console.log('🍽️ Loading shared meal plan:', mealPlanData);

      // Check if meal plan already loaded for this date
      const mealPlanDate = mealPlanData.date 
        ? new Date(mealPlanData.date)
        : new Date();
      
      if (user?.uid) {
        try {
          const existingMeals = await loadUserMealsFromFirebase(user.uid, mealPlanDate);
          if (existingMeals && existingMeals.length > 0) {
            const shouldProceed = await new Promise<boolean>((resolve) => {
              Alert.alert(
                'Meal Plan Already Exists',
                `You already have meals logged for ${mealPlanDate.toLocaleDateString()}. Do you want to add the meal plan foods anyway?`,
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                  { text: 'Add Anyway', onPress: () => resolve(true) },
                ]
              );
            });

            if (!shouldProceed) {
              return false;
            }
          }
        } catch (error: any) {
          console.error('⚠️ Error checking existing meals:', error);
          console.log('⚠️ Continuing with meal plan load despite check error');
        }
      }
      
      sharedMealPlanLoadedRef.current = true;
      setSelectedDate(mealPlanDate);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let meals: any = {};
      if (mealPlanData.meals) {
        meals = mealPlanData.meals;
      } else if (mealPlanData.mealPlanData?.meals) {
        meals = mealPlanData.mealPlanData.meals;
      } else {
        console.error('❌ No meals found in meal plan data');
        sharedMealPlanLoadedRef.current = false;
        return false;
      }

      console.log('🍽️ Found meals:', Object.keys(meals));

      const addedFoods = new Set<string>();
      const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snacks'> = ['breakfast', 'lunch', 'dinner', 'snacks'];
      
      for (const mealType of mealTypes) {
        const rawFoods = meals[mealType] || [];
        const foods = deduplicateFoods(rawFoods);
        
        if (rawFoods.length !== foods.length) {
          console.log(`⚠️ Deduplicated ${mealType}: ${rawFoods.length} -> ${foods.length} foods`);
        }
        
        console.log(`🍽️ Loading ${mealType}: ${foods.length} unique foods`);
        
        for (const food of foods) {
          try {
            const foodName = food.name || 'Unknown Food';
            const servingSize = food.servingSize || '1 serving';
            const servingCount = food.servingCount || 1;
            const foodKey = getFoodKey(foodName, mealType, servingSize, servingCount);
            
            console.log(`🍽️ Processing: ${foodName} - ${servingCount} × ${servingSize} (${mealType})`);
            
            if (addedFoods.has(foodKey)) {
              console.log(`⚠️ Food ${foodName} already added in this session, skipping`);
              continue;
            }
            
            const { currentDayNutrition } = useNutritionStore.getState();
            const existingFood = currentDayNutrition?.foods?.find(
              f => f.name === foodName && 
                   f.mealType === mealType &&
                   f.servingSize === servingSize &&
                   f.servingCount === servingCount &&
                   Math.abs(new Date(f.loggedAt).getTime() - mealPlanDate.getTime()) < 86400000
            );
            
            if (existingFood) {
              console.log(`⚠️ Food ${foodName} already exists in store, skipping`);
              addedFoods.add(foodKey);
              continue;
            }
            
            addedFoods.add(foodKey);
            const foodItem = convertSharedFoodToFoodItem(food, mealType, mealPlanDate);
            
            console.log(`✅ Adding: ${foodItem.name} - ${foodItem.servingCount} × ${foodItem.servingSize} (${mealType})`);

            const { currentDayNutrition: finalCheck } = useNutritionStore.getState();
            const finalDuplicate = finalCheck?.foods?.find(
              f => f.name === foodName && 
                   f.mealType === mealType &&
                   f.servingSize === servingSize &&
                   f.servingCount === servingCount &&
                   Math.abs(new Date(f.loggedAt).getTime() - mealPlanDate.getTime()) < 86400000
            );
            
            if (finalDuplicate) {
              console.log(`⚠️ Food ${foodName} appeared in store during processing, skipping`);
              continue;
            }
            
            await addFoodItem({
              name: foodItem.name,
              servingSize: foodItem.servingSize,
              servingCount: foodItem.servingCount,
              macrosPerServing: foodItem.macrosPerServing,
              mealType: foodItem.mealType,
            });
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const { currentDayNutrition: updatedNutrition } = useNutritionStore.getState();
            const matchingFoods = updatedNutrition?.foods?.filter(
              f => f.name === foodItem.name && 
                   f.mealType === foodItem.mealType &&
                   Math.abs(new Date(f.loggedAt).getTime() - mealPlanDate.getTime()) < 86400000
            ) || [];
            
            if (matchingFoods.length > 1) {
              console.warn(`⚠️ WARNING: ${matchingFoods.length} duplicates found! Removing extras...`);
              for (let i = 1; i < matchingFoods.length; i++) {
                removeFoodItem(matchingFoods[i].id);
                console.log(`🗑️ Removed duplicate ${foodItem.name}`);
              }
            }
            
            if (user?.uid) {
              try {
                const justAddedFood = matchingFoods[0];
                if (justAddedFood) {
                  await saveMealToFirebase(justAddedFood, user.uid);
                  console.log(`✅ Saved ${foodItem.name} to Firebase`);
                }
              } catch (saveError) {
                console.error(`❌ Error saving ${foodItem.name} to Firebase:`, saveError);
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`❌ Error loading food ${food.name}:`, error);
          }
        }
      }
      
      const mealPlanId = (global as any).sharedMealPlanId || '';
      if (mealPlanId && mealPlanId !== sharedMealPlanId) {
        setSharedMealPlanId(mealPlanId);
        console.log('📋 Updated state with meal plan ID:', mealPlanId);
      }
      
      (global as any).sharedMealPlanData = null;
      
      console.log('✅ Meal plan loaded successfully');
      
      Alert.alert(
        'Meal Plan Loaded! 🍽️',
        'Your assigned meal plan has been loaded. You can adjust serving sizes as needed!',
        [{ text: 'OK' }]
      );
      
      return true;
    } catch (error) {
      console.error('❌ Error loading shared meal plan:', error);
      sharedMealPlanLoadedRef.current = false;
      Alert.alert(
        'Error',
        'Failed to load the assigned meal plan. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }, [addFoodItem, setSelectedDate, selectedDate, user, loadUserMealsFromFirebase, sharedMealPlanId, removeFoodItem, saveMealToFirebase]);

  // Check for shared meal plan when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        if (!sharedMealPlanLoadedRef.current && (global as any).sharedMealPlanData) {
          console.log('🍽️ useFocusEffect: Loading shared meal plan');
          loadSharedMealPlan();
        } else if (sharedMealPlanLoadedRef.current) {
          console.log('🍽️ useFocusEffect: Meal plan already loaded, skipping');
        } else if (!(global as any).sharedMealPlanData) {
          console.log('🍽️ useFocusEffect: No shared meal plan data available');
        }
      }, 300);
      
      return () => {
        clearTimeout(timer);
        if (!(global as any).sharedMealPlanData) {
          sharedMealPlanLoadedRef.current = false;
        }
      };
    }, [loadSharedMealPlan])
  );

  return {
    sharedMealPlanId,
    isMealPlanLoaded: sharedMealPlanLoadedRef.current,
  };
};

