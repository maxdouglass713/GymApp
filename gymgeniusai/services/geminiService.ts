/**
 * Google Gemini API Service
 * 
 * Integrates with Google's Gemini AI through Firebase Functions
 * All AI calls go through Firebase Functions for security and tier enforcement
 */

import { MealPlanGenerationRequest, MealBatch, GeneratedMeal, MacroNutrients } from '../types/mealPlan';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSubscriptionStore } from '../stores/subscriptionStore';

/**
 * Generate personalized meal plan using Google Gemini AI via Firebase Functions
 * Requires valid subscription tier (Basic/Pro/Elite) - no fallback to stock meals
 */
export async function generateMealPlanWithAI(request: MealPlanGenerationRequest): Promise<MealBatch> {
  try {
    console.log('🤖 Generating meal plan with Gemini AI via Firebase Functions...');
    console.log('📊 Request data:', {
      goal: request.goal,
      targetCalories: request.targetMacros.calories,
      dietaryPreference: request.dietaryPreference,
      assignedClient: request.assignedClientName,
      customGoal: request.customGoal,
    });

    // Check subscription tier access - REQUIRED for AI meal plans
    const { canUseAI, tier } = useSubscriptionStore.getState();
    if (!canUseAI('mealPlan')) {
      const errorMessage = tier === 'free' 
        ? 'Upgrade to Basic, Pro, or Elite tier to generate AI meal plans'
        : tier === 'basic'
        ? 'Insufficient Volts. You need 5,000 Volts to generate an AI meal plan'
        : 'You have reached your monthly limit for AI meal plans. Upgrade to Elite for unlimited access';
      console.warn('⚠️ AI meal plan generation not available:', errorMessage);
      throw new Error(errorMessage);
    }

    // Call Firebase Function for AI generation
    try {
      const generateMealPlan = httpsCallable(getFunctions(), 'generateMealPlan');
      const result = await generateMealPlan({ request });
      
      const generatedText = (result.data as any)?.text;
      if (!generatedText) {
        throw new Error('AI meal plan generation failed. Please try again.');
      }
      
      console.log('✅ Received AI-generated meal plan');
      const mealBatch = parseMealPlanResponse(generatedText, request);
      
      console.log('✅ Successfully parsed meal plan:', {
        totalMeals: 4,
        totalCalories: mealBatch.totalMacros.calories,
      });
      
      return mealBatch;
    } catch (functionError: any) {
      // Handle specific Firebase Function errors
      const errorCode = functionError?.code || '';
      const errorMessage = functionError?.message || String(functionError) || '';
      
      console.error('Firebase Function error details:', { code: errorCode, message: errorMessage, error: functionError });
      
      if (errorCode === 'functions/not-found' || 
          errorCode === 'not-found' || 
          errorMessage.includes('not-found') ||
          errorMessage === 'not-found') {
        throw new Error('AI meal plan service is not available. The Firebase Function needs to be deployed. Please contact support or try again later.');
      }
      if (errorCode === 'permission-denied' || 
          errorCode === 'functions/permission-denied' ||
          errorMessage.includes('permission') ||
          errorMessage.includes('Permission denied')) {
        throw new Error('You do not have permission to use AI meal plans. Please check your subscription tier.');
      }
      // Handle Gemini API errors (404, 401, etc.)
      if (errorMessage.includes('Gemini API error: 404') || 
          errorMessage.includes('Gemini API error: 401') ||
          errorMessage.includes('Gemini API error: 403')) {
        throw new Error('AI service configuration error. The Gemini API key may be missing or invalid. Please contact support.');
      }
      if (errorMessage.includes('Gemini API key not configured') ||
          errorMessage.includes('failed-precondition')) {
        throw new Error('AI service is not properly configured. Please contact support.');
      }
      // Re-throw other function errors
      throw functionError;
    }
    
  } catch (error: any) {
    console.error('❌ Error generating meal plan:', error);
    
    // Extract error details
    const errorCode = error?.code || '';
    const errorMessage = error?.message || String(error) || '';
    
    // Handle "not-found" errors (Firebase Function not deployed)
    if (errorCode === 'functions/not-found' || 
        errorCode === 'not-found' || 
        errorMessage.includes('not-found') ||
        errorMessage === 'not-found' ||
        errorMessage.includes('[Error: not-found]')) {
      throw new Error('AI meal plan service is not available. The Firebase Function needs to be deployed. Please contact support or try again later.');
    }
    
    // Handle Gemini API errors
    if (errorMessage.includes('Gemini API error: 404') || 
        errorMessage.includes('Gemini API error: 401') ||
        errorMessage.includes('Gemini API error: 403')) {
      throw new Error('AI service configuration error. The Gemini API key may be missing or invalid. Please contact support.');
    }
    if (errorMessage.includes('Gemini API key not configured') ||
        errorMessage.includes('failed-precondition')) {
      throw new Error('AI service is not properly configured. Please contact support.');
    }
    
    // Re-throw subscription/permission errors
    if (error.message?.includes('Upgrade') || 
        error.message?.includes('Insufficient') || 
        error.message?.includes('limit') || 
        error.message?.includes('not available') || 
        error.message?.includes('permission')) {
      throw error;
    }
    
    // For other errors, provide a clear message
    throw new Error(error.message || 'Failed to generate AI meal plan. Please try again or upgrade your subscription.');
  }
}

/**
 * Estimate macros for a meal using AI
 */
export async function estimateMealMacros(mealName: string, servingSize: string): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} | null> {
  try {
    console.log('🤖 Estimating macros via Firebase Functions...', { mealName, servingSize });

    // Check feature flag first - feature is not available yet
    const { isFeatureEnabled } = require('@/utils/features/featureFlags');
    if (!isFeatureEnabled('aiMacroEstimation')) {
      console.warn('⚠️ AI macro estimation feature is disabled');
      throw new Error('AI macro estimation is not available yet. This feature is coming soon!');
    }
    
    // Check subscription tier access (Pro/Elite only, not Basic)
    const { canUseAI, tier } = useSubscriptionStore.getState();
    if (!canUseAI('macroEstimation')) {
      const errorMessage = tier === 'basic' 
        ? 'AI macro estimation requires a Pro or Elite subscription. Basic tier users do not have access to this feature.'
        : tier === 'free'
        ? 'Upgrade to Pro or Elite subscription to unlock AI macro estimation.'
        : 'You have reached your monthly limit for AI macro estimations. Upgrade to Elite for unlimited access.';
      console.warn('⚠️ AI macro estimation not available:', errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const estimateMacros = httpsCallable(getFunctions(), 'estimateMacros');
      const result = await estimateMacros({ mealName, servingSize });
      
      const macros = result.data as { calories: number; protein: number; carbs: number; fat: number };
      if (macros && macros.calories) {
        console.log('✅ Received AI macro estimation:', macros);
        return macros;
      }
      console.warn('⚠️ No valid macros returned from function');
    } catch (functionError: any) {
      console.error('❌ Firebase Function error:', functionError);
      console.error('❌ Error code:', functionError.code);
      console.error('❌ Error message:', functionError.message);
      
      // Handle specific error codes
      if (functionError.code === 'functions/not-found') {
        console.error('❌ Firebase Function not found. Make sure the function is deployed.');
        throw new Error('AI macro estimation is not available. The feature may still be deploying. Please try again later.');
      }
      
      if (functionError.code === 'permission-denied' || functionError.message?.includes('Upgrade')) {
        throw new Error(functionError.message || 'Upgrade required for AI macro estimation');
      }
      
      // For other errors, log but don't throw - use fallback
      console.warn('⚠️ Falling back to keyword-based estimation');
    }

    // Fallback to keyword-based estimation
    return getFallbackEstimate(mealName, servingSize);
  } catch (error: any) {
    console.error('❌ Error estimating macros:', error);
    if (error.message?.includes('Upgrade') || error.message?.includes('Insufficient')) {
      throw error;
    }
    return getFallbackEstimate(mealName, servingSize);
  }
}

/**
 * Fallback macro estimation based on keywords
 */
function getFallbackEstimate(mealName: string, servingSize: string): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
} | null {
  const name = mealName.toLowerCase();
  const size = parseFloat(servingSize) || 1;
  
  // Basic keyword-based estimation
  let baseCalories = 300;
  let baseProtein = 20;
  let baseCarbs = 30;
  let baseFat = 10;
  
  if (name.includes('chicken') || name.includes('turkey')) {
    baseCalories = 250;
    baseProtein = 30;
    baseCarbs = 0;
    baseFat = 5;
  } else if (name.includes('salmon') || name.includes('fish')) {
    baseCalories = 280;
    baseProtein = 25;
    baseCarbs = 0;
    baseFat = 12;
  } else if (name.includes('beef') || name.includes('steak')) {
    baseCalories = 350;
    baseProtein = 28;
    baseCarbs = 0;
    baseFat = 20;
  } else if (name.includes('rice') || name.includes('pasta')) {
    baseCalories = 200;
    baseProtein = 4;
    baseCarbs = 45;
    baseFat = 1;
  } else if (name.includes('salad')) {
    baseCalories = 150;
    baseProtein = 5;
    baseCarbs = 10;
    baseFat = 10;
  }
  
  return {
    calories: Math.round(baseCalories * size),
    protein: Math.round(baseProtein * size),
    carbs: Math.round(baseCarbs * size),
    fat: Math.round(baseFat * size),
  };
}

/**
 * Build the AI prompt for meal generation
 */
function buildMealPlanPrompt(request: MealPlanGenerationRequest): string {
  const {
    firstName,
    goal,
    targetMacros,
    dietaryPreference,
    age,
    weight,
    sex,
    assignedClientName,
    customGoal,
    customCalorieTarget,
    dietaryNotes,
    coachNotes,
  } = request;
  const clientName = assignedClientName || firstName;
  
  // Map goal to user-friendly description
  const goalDescriptions: Record<string, string> = {
    build_muscle: 'build muscle and gain strength',
    lose_weight: 'lose weight and burn fat',
    stay_fit: 'maintain fitness and health',
    increase_endurance: 'increase endurance and stamina',
    gain_strength: 'gain strength and lift heavier',
    increase_power: 'increase explosive power and performance',
    improve_flexibility: 'improve flexibility and mobility',
    general_health: 'improve overall health and wellbeing',
    improve_fitness: 'improve overall fitness'
  };
  
  const goalDescription = goalDescriptions[goal] || 'achieve fitness goals';
  const activeGoalDescription = customGoal || goalDescription;
  const preferenceDescription = dietaryNotes
    ? `${dietaryPreference || 'balanced whole foods'} (${dietaryNotes})`
    : dietaryPreference || 'balanced whole foods';
  const effectiveCalories = customCalorieTarget || targetMacros.calories;
  
  const coachNotesList: string[] = [];
  if (customGoal) {
    coachNotesList.push(`Primary focus: ${customGoal}`);
  }
  if (customCalorieTarget) {
    coachNotesList.push(`Target approximately ${customCalorieTarget} calories for the day`);
  }
  if (coachNotes) {
    coachNotesList.push(coachNotes);
  }
  const coachNotesBlock = coachNotesList.length
    ? `
COACH NOTES:
- ${coachNotesList.join('\n- ')}
`
    : '';
  
  return `You are a professional fitness nutritionist. Generate a complete daily meal plan for ${clientName}, who wants to ${activeGoalDescription}.

PROFILE:
- Goal: ${activeGoalDescription}
- ${age ? `Age: ${age}` : ''}
- ${weight ? `Weight: ${weight} lb` : ''}
- ${sex ? `Sex: ${sex}` : ''}
- Dietary Preference: ${preferenceDescription}

TARGET MACROS (Daily):
- Calories: ${effectiveCalories} kcal
- Protein: ${targetMacros.protein}g
- Carbs: ${targetMacros.carbs}g
- Fat: ${targetMacros.fat}g

${coachNotesBlock}

REQUIREMENTS:
Generate exactly 4 meals that fit the daily macro targets:

1. BREAKFAST (~25% of daily calories)
   - High protein, moderate carbs
   - Easy to prepare
   - Filling and energizing

2. LUNCH (~30% of daily calories)
   - Balanced meal
   - High protein
   - Good carbs and moderate fat

3. DINNER (~35% of daily calories)
   - Largest meal
   - High protein
   - Balanced macros

4. SNACK (~10% of daily calories)
   - High protein
   - Low carbs and fat
   - Quick and simple

FOR EACH MEAL, provide this EXACT format:

MEAL: [Meal Name]
TYPE: [breakfast/lunch/dinner/snack]
CALORIES: [number]
PROTEIN: [number]g
CARBS: [number]g
FAT: [number]g
INGREDIENTS:
- [amount] [unit] [ingredient name]
- [amount] [unit] [ingredient name]
- [amount] [unit] [ingredient name]
---

IMPORTANT:
- Use simple, accessible ingredients
- Provide exact portions (oz, cups, tbsp, etc.)
- Focus on whole foods
- Make meals appropriate for the goal (${goalDescription})
- Ensure total macros sum to approximately the daily targets
- Keep ingredient lists concise (4-6 items per meal)
- Use common measurements (oz, cups, tbsp, medium, large, etc.)

Generate the meal plan now:`;
}

/**
 * Parse AI response into structured MealBatch
 */
function parseMealPlanResponse(text: string, request: MealPlanGenerationRequest): MealBatch {
  console.log('🔍 Parsing AI response...');
  console.log('📝 Full AI response (first 2000 chars):', text.substring(0, 2000));
  
  // Split by meal separator (try multiple separators)
  let mealSections = text.split('---').filter(s => s.trim().length > 0);
  
  // If no sections found with ---, try other separators
  if (mealSections.length < 4) {
    mealSections = text.split(/\n\n+/).filter(s => s.trim().length > 0);
  }
  
  // Try splitting by "MEAL:" markers
  if (mealSections.length < 4) {
    const mealMatches = text.match(/MEAL:[\s\S]*?(?=MEAL:|$)/g);
    if (mealMatches && mealMatches.length >= 4) {
      mealSections = mealMatches;
    }
  }
  
  console.log(`📊 Found ${mealSections.length} meal sections`);
  
  if (mealSections.length < 4) {
    console.warn('⚠️ Less than 4 meal sections found. Attempting to parse anyway...');
  }
  
  const meals: GeneratedMeal[] = [];
  
  for (let i = 0; i < mealSections.length; i++) {
    const section = mealSections[i];
    try {
      console.log(`🔍 Parsing meal section ${i + 1}:`, section.substring(0, 200));
      const meal = parseMealSection(section);
      if (meal) {
        console.log(`✅ Parsed ${meal.mealType}: ${meal.name}`);
        meals.push(meal);
      } else {
        console.warn(`⚠️ Failed to parse meal section ${i + 1}`);
      }
    } catch (error) {
      console.error('❌ Error parsing meal section:', error);
    }
  }
  
  console.log(`✅ Successfully parsed ${meals.length} meals`);
  
  // Ensure we have all 4 meal types
  const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealsByType: any = {};
  
  meals.forEach((meal, index) => {
    const type = meal.mealType || mealTypes[index];
    mealsByType[type] = meal;
  });
  
  // Log what we found
  console.log('📋 Meals by type:', Object.keys(mealsByType));
  
  // Ensure all meal types are present - throw error if missing
  const missingMeals: string[] = [];
  mealTypes.forEach(type => {
    if (!mealsByType[type]) {
      missingMeals.push(type);
    }
  });
  
  if (missingMeals.length > 0) {
    console.error('❌ Missing meal types:', missingMeals);
    console.error('📝 Full response for debugging:', text);
    throw new Error(`AI meal plan generation failed. Missing ${missingMeals.join(', ')} meal(s). Please try again.`);
  }
  
  // Calculate total macros
  const totalMacros: MacroNutrients = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  
  Object.values(mealsByType).forEach((meal: any) => {
    totalMacros.calories += meal.macros.calories;
    totalMacros.protein += meal.macros.protein;
    totalMacros.carbs += meal.macros.carbs;
    totalMacros.fat += meal.macros.fat;
  });
  
  const batch: MealBatch = {
    id: `batch_${Date.now()}`,
    userId: request.userId,
    generatedAt: new Date(),
    meals: mealsByType,
    totalMacros,
    basedOnProfile: {
      goal: request.goal,
      targetCalories: request.targetMacros.calories,
      targetProtein: request.targetMacros.protein,
    },
  };
  
  return batch;
}

/**
 * Parse individual meal section
 */
function parseMealSection(section: string): GeneratedMeal | null {
  try {
    const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let name = '';
    let mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'breakfast';
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    const ingredients: any[] = [];
    
    let inIngredients = false;
    
    for (const line of lines) {
      // More flexible matching for MEAL: line
      if (line.match(/^MEAL\s*:?\s*/i)) {
        name = line.replace(/^MEAL\s*:?\s*/i, '').trim();
      } else if (line.match(/^TYPE\s*:?\s*/i)) {
        const type = line.replace(/^TYPE\s*:?\s*/i, '').trim().toLowerCase();
        // Handle variations like "snacks" -> "snack"
        const normalizedType = type.replace(/s$/, '');
        if (normalizedType === 'breakfast' || normalizedType === 'lunch' || normalizedType === 'dinner' || normalizedType === 'snack') {
          mealType = normalizedType as 'breakfast' | 'lunch' | 'dinner' | 'snack';
        }
      } else if (line.match(/^CALORIES?\s*:?\s*/i)) {
        const calText = line.replace(/^CALORIES?\s*:?\s*/i, '').replace(/kcal/gi, '').trim();
        calories = parseInt(calText) || 0;
      } else if (line.match(/^PROTEIN\s*:?\s*/i)) {
        const protText = line.replace(/^PROTEIN\s*:?\s*/i, '').replace(/g/gi, '').trim();
        protein = parseInt(protText) || 0;
      } else if (line.match(/^CARBS?\s*:?\s*/i)) {
        const carbsText = line.replace(/^CARBS?\s*:?\s*/i, '').replace(/g/gi, '').trim();
        carbs = parseInt(carbsText) || 0;
      } else if (line.match(/^FAT\s*:?\s*/i)) {
        const fatText = line.replace(/^FAT\s*:?\s*/i, '').replace(/g/gi, '').trim();
        fat = parseInt(fatText) || 0;
      } else if (line.match(/^INGREDIENTS?\s*:?\s*/i)) {
        inIngredients = true;
      } else if (inIngredients && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
        const ingredientText = line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
        const ingredient = parseIngredient(ingredientText);
        if (ingredient) {
          ingredients.push(ingredient);
        }
      }
    }
    
    // More lenient validation - allow meals with at least name and calories
    if (!name || calories === 0) {
      console.warn('⚠️ Meal section missing required fields:', { name, calories, ingredients: ingredients.length });
      return null;
    }
    
    // If no ingredients parsed, try to extract from the section text
    if (ingredients.length === 0) {
      console.warn('⚠️ No ingredients found, attempting to extract from section text');
      // Try to find ingredient-like lines
      const ingredientLines = lines.filter(l => 
        !l.match(/^(MEAL|TYPE|CALORIES?|PROTEIN|CARBS?|FAT|INGREDIENTS?)\s*:?/i) &&
        l.length > 0
      );
      ingredientLines.forEach(line => {
        const ingredient = parseIngredient(line);
        if (ingredient) {
          ingredients.push(ingredient);
        }
      });
    }
    
    return {
      id: `meal_${Date.now()}_${Math.random()}`,
      mealType,
      name,
      macros: { calories, protein, carbs, fat },
      ingredients,
    };
  } catch (error) {
    console.error('Error parsing meal section:', error);
    return null;
  }
}

/**
 * Parse ingredient string into structured format
 */
function parseIngredient(text: string): any {
  // Try to extract: "1 cup chicken breast" or "6 oz salmon" or "2 tbsp olive oil"
  const matches = text.match(/^([\d.\/]+)\s*([a-z]+)\s+(.+)$/i);
  
  if (matches) {
    return {
      name: matches[3].trim(),
      amount: matches[1].trim(),
      unit: matches[2].trim(),
    };
  }
  
  // Fallback: just use the whole text as name
  return {
    name: text,
    amount: '',
    unit: '',
  };
}


