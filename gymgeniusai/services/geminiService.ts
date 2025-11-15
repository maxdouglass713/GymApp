/**
 * Google Gemini API Service
 * 
 * Integrates with Google's Gemini AI for meal plan generation
 */

import { MealPlanGenerationRequest, MealBatch, GeneratedMeal, MacroNutrients } from '../types/mealPlan';

// Google Gemini API Key - Free tier: 60 requests per minute
// TODO: Move to environment variable or Firebase Cloud Function for production
const GEMINI_API_KEY = 'AIzaSyDR4UON1RXGkUfL8rJYWe5PbNRLyM5Kt5Q';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Generate personalized meal plan using Google Gemini AI
 * Falls back to smart meal generation if API is unavailable
 */
export async function generateMealPlanWithAI(request: MealPlanGenerationRequest): Promise<MealBatch> {
  try {
    console.log('🤖 Generating meal plan with Gemini AI...');
    console.log('📊 Request data:', {
      goal: request.goal,
      targetCalories: request.targetMacros.calories,
      dietaryPreference: request.dietaryPreference,
    });
    
    // Generate personalized meals based on user profile (no AI needed!)
    console.log('🧠 Generating personalized meal plan...');
    return generateSmartFallbackMealBatch(request);
    
    /* TODO: Re-enable when API key is properly configured
    const prompt = buildMealPlanPrompt(request);
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data: GeminiResponse = await response.json();
    console.log('✅ Received response from Gemini AI');
    
    const generatedText = data.candidates[0]?.content?.parts[0]?.text;
    if (!generatedText) {
      throw new Error('No text generated from Gemini AI');
    }
    
    // Parse the AI response into structured meal data
    const mealBatch = parseMealPlanResponse(generatedText, request);
    
    console.log('✅ Successfully parsed meal plan:', {
      totalMeals: 4,
      totalCalories: mealBatch.totalMacros.calories,
    });
    
    return mealBatch;
    */
    
  } catch (error) {
    console.error('❌ Error generating meal plan:', error);
    // Fallback to smart meal generation
    console.log('🔄 Falling back to smart meal generation...');
    return generateSmartFallbackMealBatch(request);
  }
}

/**
 * Build the AI prompt for meal generation
 */
function buildMealPlanPrompt(request: MealPlanGenerationRequest): string {
  const { firstName, goal, targetMacros, dietaryPreference, age, weight, sex } = request;
  
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
  
  return `You are a professional fitness nutritionist. Generate a complete daily meal plan for ${firstName}, who wants to ${goalDescription}.

PROFILE:
- Goal: ${goalDescription}
- ${age ? `Age: ${age}` : ''}
- ${weight ? `Weight: ${weight} lb` : ''}
- ${sex ? `Sex: ${sex}` : ''}
- Dietary Preference: ${dietaryPreference || 'balanced whole foods'}

TARGET MACROS (Daily):
- Calories: ${targetMacros.calories} kcal
- Protein: ${targetMacros.protein}g
- Carbs: ${targetMacros.carbs}g
- Fat: ${targetMacros.fat}g

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
  
  // Split by meal separator
  const mealSections = text.split('---').filter(s => s.trim().length > 0);
  
  if (mealSections.length < 4) {
    console.warn('⚠️ AI response has fewer than 4 meals, using fallback');
    return generateFallbackMealBatch(request);
  }
  
  const meals: GeneratedMeal[] = [];
  
  for (const section of mealSections.slice(0, 4)) {
    try {
      const meal = parseMealSection(section);
      if (meal) {
        meals.push(meal);
      }
    } catch (error) {
      console.error('❌ Error parsing meal section:', error);
    }
  }
  
  // Ensure we have all 4 meal types
  const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = ['breakfast', 'lunch', 'dinner', 'snack'];
  const mealsByType: any = {};
  
  meals.forEach((meal, index) => {
    const type = meal.mealType || mealTypes[index];
    mealsByType[type] = meal;
  });
  
  // Fill in missing meals with fallback
  mealTypes.forEach(type => {
    if (!mealsByType[type]) {
      mealsByType[type] = generateFallbackMeal(type, request);
    }
  });
  
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
      if (line.startsWith('MEAL:')) {
        name = line.replace('MEAL:', '').trim();
      } else if (line.startsWith('TYPE:')) {
        const type = line.replace('TYPE:', '').trim().toLowerCase();
        if (type === 'breakfast' || type === 'lunch' || type === 'dinner' || type === 'snack') {
          mealType = type;
        }
      } else if (line.startsWith('CALORIES:')) {
        calories = parseInt(line.replace('CALORIES:', '').replace('kcal', '').trim()) || 0;
      } else if (line.startsWith('PROTEIN:')) {
        protein = parseInt(line.replace('PROTEIN:', '').replace('g', '').trim()) || 0;
      } else if (line.startsWith('CARBS:')) {
        carbs = parseInt(line.replace('CARBS:', '').replace('g', '').trim()) || 0;
      } else if (line.startsWith('FAT:')) {
        fat = parseInt(line.replace('FAT:', '').replace('g', '').trim()) || 0;
      } else if (line.startsWith('INGREDIENTS:')) {
        inIngredients = true;
      } else if (inIngredients && line.startsWith('-')) {
        const ingredientText = line.replace('-', '').trim();
        const ingredient = parseIngredient(ingredientText);
        if (ingredient) {
          ingredients.push(ingredient);
        }
      }
    }
    
    if (!name || calories === 0 || ingredients.length === 0) {
      return null;
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

/**
 * Generate smart meal batch based on user profile (no AI needed!)
 */
function generateSmartFallbackMealBatch(request: MealPlanGenerationRequest): MealBatch {
  console.log('🧠 Generating personalized meal batch...');
  
  return {
    id: `batch_${Date.now()}`,
    userId: request.userId,
    generatedAt: new Date(),
    meals: {
      breakfast: generateSmartMeal('breakfast', request),
      lunch: generateSmartMeal('lunch', request),
      dinner: generateSmartMeal('dinner', request),
      snack: generateSmartMeal('snack', request),
    },
    totalMacros: request.targetMacros,
    basedOnProfile: {
      goal: request.goal,
      targetCalories: request.targetMacros.calories,
      targetProtein: request.targetMacros.protein,
    },
  };
}

/**
 * Generate smart meal based on user's goal and dietary preferences
 */
function generateSmartMeal(type: 'breakfast' | 'lunch' | 'dinner' | 'snack', request: MealPlanGenerationRequest): GeneratedMeal {
  try {
    const { goal, targetMacros, dietaryPreference, weight } = request;
    
    console.log(`🍽️ Generating ${type} meal for goal: ${goal}`);
    
    // Calculate meal portions based on type (calories distribution)
    const mealCalorieRatios = {
      breakfast: 0.25, // 25%
      lunch: 0.30,     // 30%
      dinner: 0.35,    // 35%
      snack: 0.10      // 10%
    };
    
    const targetCalories = Math.round(targetMacros.calories * mealCalorieRatios[type]);
    const targetProtein = Math.round(targetMacros.protein * mealCalorieRatios[type]);
    const targetCarbs = Math.round(targetMacros.carbs * mealCalorieRatios[type]);
    const targetFat = Math.round(targetMacros.fat * mealCalorieRatios[type]);
    
    console.log(`📊 Target macros for ${type}:`, { targetCalories, targetProtein, targetCarbs, targetFat });
    
    // Get meal options based on goal and dietary preference
    const mealOptions = getMealOptions(type, goal, dietaryPreference, weight);
    console.log(`🍽️ Found ${mealOptions.length} meal options for ${type}`);
    
    if (!mealOptions || mealOptions.length === 0) {
      throw new Error(`No meal options found for ${type}`);
    }
    
    // Select a random meal from options
    const selectedMeal = mealOptions[Math.floor(Math.random() * mealOptions.length)];
    console.log(`✅ Selected meal: ${selectedMeal.name}`);
    
    // Adjust portions to match target macros
    const adjustedMeal = adjustMealPortions(selectedMeal, {
      calories: targetCalories,
      protein: targetProtein,
      carbs: targetCarbs,
      fat: targetFat
    });
    
    console.log(`🎯 Adjusted meal: ${adjustedMeal.name}`, adjustedMeal);
    
    return {
      id: `meal_${Date.now()}_${type}_${Math.random().toString(36).substr(2, 9)}`,
      mealType: type,
      name: adjustedMeal.name,
      macros: {
        calories: adjustedMeal.calories,
        protein: adjustedMeal.protein,
        carbs: adjustedMeal.carbs,
        fat: adjustedMeal.fat,
      },
      ingredients: adjustedMeal.ingredients,
    };
  } catch (error) {
    console.error(`❌ Error generating ${type} meal:`, error);
    throw error;
  }
}

/**
 * Generate fallback meal batch if AI fails (legacy)
 */
function generateFallbackMealBatch(request: MealPlanGenerationRequest): MealBatch {
  console.log('🔄 Generating fallback meal batch...');
  
  const isHighProtein = request.goal === 'build_muscle';
  const caloriesPerMeal = Math.floor(request.targetMacros.calories / 4);
  
  return {
    id: `batch_${Date.now()}`,
    userId: request.userId,
    generatedAt: new Date(),
    meals: {
      breakfast: generateFallbackMeal('breakfast', request),
      lunch: generateFallbackMeal('lunch', request),
      dinner: generateFallbackMeal('dinner', request),
      snack: generateFallbackMeal('snack', request),
    },
    totalMacros: request.targetMacros,
    basedOnProfile: {
      goal: request.goal,
      targetCalories: request.targetMacros.calories,
      targetProtein: request.targetMacros.protein,
    },
  };
}

/**
 * Get meal options based on type, goal, and dietary preference
 */
function getMealOptions(type: 'breakfast' | 'lunch' | 'dinner' | 'snack', goal: string, dietaryPreference: string, weight: number) {
  console.log(`🔍 Getting meal options for:`, { type, goal, dietaryPreference, weight });
  
  const isMuscleBuilding = goal === 'build_muscle';
  const isWeightLoss = goal === 'lose_weight';
  const isHighProtein = isMuscleBuilding || isWeightLoss;
  
  const mealDatabase = {
    breakfast: [
      {
        name: 'Protein Oatmeal Bowl',
        baseCalories: 450,
        baseProtein: 25,
        baseCarbs: 55,
        baseFat: 12,
        ingredients: [
          { name: 'oatmeal', amount: '1', unit: 'cup' },
          { name: 'protein powder', amount: '1', unit: 'scoop' },
          { name: 'banana', amount: '1', unit: 'medium' },
          { name: 'almond milk', amount: '1', unit: 'cup' },
          { name: 'almonds', amount: '10', unit: 'pieces' },
        ]
      },
      {
        name: 'Greek Yogurt Parfait',
        baseCalories: 380,
        baseProtein: 28,
        baseCarbs: 35,
        baseFat: 15,
        ingredients: [
          { name: 'Greek yogurt', amount: '1', unit: 'cup' },
          { name: 'berries', amount: '1', unit: 'cup' },
          { name: 'granola', amount: '0.5', unit: 'cup' },
          { name: 'honey', amount: '1', unit: 'tbsp' },
        ]
      },
      {
        name: 'Protein Pancakes',
        baseCalories: 420,
        baseProtein: 30,
        baseCarbs: 45,
        baseFat: 10,
        ingredients: [
          { name: 'protein pancake mix', amount: '1', unit: 'cup' },
          { name: 'eggs', amount: '2', unit: 'large' },
          { name: 'almond milk', amount: '0.5', unit: 'cup' },
          { name: 'syrup', amount: '2', unit: 'tbsp' },
        ]
      }
    ],
    lunch: [
      {
        name: 'Chicken & Rice Bowl',
        baseCalories: 520,
        baseProtein: 35,
        baseCarbs: 60,
        baseFat: 12,
        ingredients: [
          { name: 'chicken breast', amount: '6', unit: 'oz' },
          { name: 'brown rice', amount: '1', unit: 'cup' },
          { name: 'mixed vegetables', amount: '1', unit: 'cup' },
          { name: 'olive oil', amount: '1', unit: 'tbsp' },
        ]
      },
      {
        name: 'Turkey & Avocado Wrap',
        baseCalories: 480,
        baseProtein: 32,
        baseCarbs: 45,
        baseFat: 18,
        ingredients: [
          { name: 'turkey breast', amount: '4', unit: 'oz' },
          { name: 'whole wheat wrap', amount: '1', unit: 'large' },
          { name: 'avocado', amount: '0.5', unit: 'medium' },
          { name: 'spinach', amount: '1', unit: 'cup' },
          { name: 'tomato', amount: '2', unit: 'slices' },
        ]
      },
      {
        name: 'Quinoa Buddha Bowl',
        baseCalories: 450,
        baseProtein: 22,
        baseCarbs: 55,
        baseFat: 16,
        ingredients: [
          { name: 'quinoa', amount: '1', unit: 'cup' },
          { name: 'chickpeas', amount: '0.5', unit: 'cup' },
          { name: 'roasted vegetables', amount: '1', unit: 'cup' },
          { name: 'tahini dressing', amount: '2', unit: 'tbsp' },
        ]
      }
    ],
    dinner: [
      {
        name: 'Salmon with Sweet Potato',
        baseCalories: 580,
        baseProtein: 40,
        baseCarbs: 55,
        baseFat: 20,
        ingredients: [
          { name: 'salmon fillet', amount: '6', unit: 'oz' },
          { name: 'sweet potato', amount: '1', unit: 'medium' },
          { name: 'broccoli', amount: '2', unit: 'cups' },
          { name: 'olive oil', amount: '1', unit: 'tbsp' },
        ]
      },
      {
        name: 'Beef Stir Fry',
        baseCalories: 550,
        baseProtein: 38,
        baseCarbs: 45,
        baseFat: 22,
        ingredients: [
          { name: 'lean beef', amount: '6', unit: 'oz' },
          { name: 'brown rice', amount: '1', unit: 'cup' },
          { name: 'stir fry vegetables', amount: '2', unit: 'cups' },
          { name: 'coconut oil', amount: '1', unit: 'tbsp' },
        ]
      },
      {
        name: 'Turkey Meatballs & Pasta',
        baseCalories: 520,
        baseProtein: 35,
        baseCarbs: 50,
        baseFat: 15,
        ingredients: [
          { name: 'turkey meatballs', amount: '4', unit: 'pieces' },
          { name: 'whole wheat pasta', amount: '1.5', unit: 'cups' },
          { name: 'marinara sauce', amount: '0.5', unit: 'cup' },
          { name: 'parmesan cheese', amount: '2', unit: 'tbsp' },
        ]
      }
    ],
    snack: [
      {
        name: 'Protein Shake',
        baseCalories: 220,
        baseProtein: 25,
        baseCarbs: 20,
        baseFat: 5,
        ingredients: [
          { name: 'protein powder', amount: '1', unit: 'scoop' },
          { name: 'almond milk', amount: '1', unit: 'cup' },
          { name: 'banana', amount: '0.5', unit: 'medium' },
        ]
      },
      {
        name: 'Greek Yogurt & Berries',
        baseCalories: 180,
        baseProtein: 20,
        baseCarbs: 25,
        baseFat: 2,
        ingredients: [
          { name: 'Greek yogurt', amount: '1', unit: 'cup' },
          { name: 'mixed berries', amount: '0.5', unit: 'cup' },
          { name: 'honey', amount: '1', unit: 'tsp' },
        ]
      },
      {
        name: 'Hard Boiled Eggs',
        baseCalories: 140,
        baseProtein: 12,
        baseCarbs: 1,
        baseFat: 10,
        ingredients: [
          { name: 'hard boiled eggs', amount: '2', unit: 'large' },
        ]
      }
    ]
  };
  
  const options = mealDatabase[type] || [];
  console.log(`📋 Returning ${options.length} meal options for ${type}`);
  return options;
}

/**
 * Adjust meal portions to match target macros
 */
function adjustMealPortions(meal: any, targets: any) {
  const { baseCalories, baseProtein, baseCarbs, baseFat } = meal;
  
  // Calculate adjustment ratios
  const calorieRatio = targets.calories / baseCalories;
  const proteinRatio = targets.protein / baseProtein;
  
  // Use the more conservative ratio to avoid over-adjustment
  const adjustmentRatio = Math.min(calorieRatio, proteinRatio);
  
  // Adjust macros proportionally
  const adjustedCalories = Math.round(baseCalories * adjustmentRatio);
  const adjustedProtein = Math.round(baseProtein * adjustmentRatio);
  const adjustedCarbs = Math.round(baseCarbs * adjustmentRatio);
  const adjustedFat = Math.round(baseFat * adjustmentRatio);
  
  // Adjust ingredient portions (simplified - just multiply amounts)
  const adjustedIngredients = meal.ingredients.map((ingredient: any) => ({
    ...ingredient,
    amount: ingredient.amount ? (parseFloat(ingredient.amount) * adjustmentRatio).toFixed(1) : ingredient.amount
  }));
  
  return {
    name: meal.name,
    calories: adjustedCalories,
    protein: adjustedProtein,
    carbs: adjustedCarbs,
    fat: adjustedFat,
    ingredients: adjustedIngredients
  };
}

/**
 * Generate fallback meal for a specific type
 */
function generateFallbackMeal(type: 'breakfast' | 'lunch' | 'dinner' | 'snack', request: MealPlanGenerationRequest): GeneratedMeal {
  const caloriesPerMeal = Math.floor(request.targetMacros.calories / 4);
  const proteinPerMeal = Math.floor(request.targetMacros.protein / 4);
  
  const fallbackMeals = {
    breakfast: {
      name: 'Protein Oatmeal Bowl',
      calories: Math.floor(caloriesPerMeal * 0.8),
      protein: proteinPerMeal,
      carbs: 50,
      fat: 10,
      ingredients: [
        { name: 'oatmeal', amount: '1', unit: 'cup' },
        { name: 'protein powder', amount: '1', unit: 'scoop' },
        { name: 'banana', amount: '1', unit: 'medium' },
        { name: 'almond milk', amount: '1', unit: 'cup' },
      ],
    },
    lunch: {
      name: 'Chicken & Rice Bowl',
      calories: caloriesPerMeal,
      protein: proteinPerMeal,
      carbs: 60,
      fat: 15,
      ingredients: [
        { name: 'chicken breast', amount: '6', unit: 'oz' },
        { name: 'brown rice', amount: '1', unit: 'cup' },
        { name: 'mixed vegetables', amount: '1', unit: 'cup' },
        { name: 'olive oil', amount: '1', unit: 'tbsp' },
      ],
    },
    dinner: {
      name: 'Salmon with Vegetables',
      calories: Math.floor(caloriesPerMeal * 1.2),
      protein: proteinPerMeal,
      carbs: 45,
      fat: 20,
      ingredients: [
        { name: 'salmon fillet', amount: '6', unit: 'oz' },
        { name: 'sweet potato', amount: '1', unit: 'medium' },
        { name: 'broccoli', amount: '2', unit: 'cups' },
        { name: 'butter', amount: '1', unit: 'tbsp' },
      ],
    },
    snack: {
      name: 'Protein Shake',
      calories: Math.floor(caloriesPerMeal * 0.6),
      protein: Math.floor(proteinPerMeal * 1.2),
      carbs: 20,
      fat: 5,
      ingredients: [
        { name: 'protein powder', amount: '1', unit: 'scoop' },
        { name: 'almond milk', amount: '1', unit: 'cup' },
        { name: 'banana', amount: '0.5', unit: 'medium' },
      ],
    },
  };
  
  const meal = fallbackMeals[type];
  
  return {
    id: `meal_${Date.now()}_${type}`,
    mealType: type,
    name: meal.name,
    macros: {
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    },
    ingredients: meal.ingredients,
  };
}

