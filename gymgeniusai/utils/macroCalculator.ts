/**
 * Personalized Macro Calculator
 * Calculates customized nutrition targets based on user profile data
 * Uses Mifflin-St Jeor equation for BMR and TDEE calculations
 */

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroCalculation {
  targets: MacroTargets;
  breakdown: {
    bmr: number;
    tdee: number;
    activityMultiplier: number;
    calorieAdjustment: number;
    goal: string;
  };
  lastCalculated: Date;
  basedOn: {
    weight: number;
    weightUnit: string;
    height: string;
    age: number | null;
    sex: string | null;
    goal: string;
    weeklySchedule: number;
  };
}

interface UserProfileData {
  height: {
    value: string | number;
    unit: 'ft/in' | 'cm';
  };
  weight: {
    value: string | number;
    unit: 'lb' | 'kg';
  };
  birthday?: Date;
  sex?: 'male' | 'female' | 'other';
  primaryGoal?: 'build_muscle' | 'lose_fat' | 'improve_fitness';
  goals?: string[];
  weeklySchedule?: number;
}

/**
 * Convert height to centimeters
 */
function convertHeightToCm(height: string | number, unit: 'ft/in' | 'cm'): number {
  if (unit === 'cm') {
    return typeof height === 'number' ? height : parseFloat(height.toString());
  }
  
  // Parse "5ft 10in" format
  const heightStr = height.toString();
  const ftMatch = heightStr.match(/(\d+)ft/);
  const inMatch = heightStr.match(/(\d+)in/);
  
  const feet = ftMatch ? parseInt(ftMatch[1]) : 0;
  const inches = inMatch ? parseInt(inMatch[1]) : 0;
  
  // Convert to cm: (feet × 30.48) + (inches × 2.54)
  return (feet * 30.48) + (inches * 2.54);
}

/**
 * Convert weight to kilograms
 */
function convertWeightToKg(weight: string | number, unit: 'lb' | 'kg'): number {
  const weightNum = typeof weight === 'number' ? weight : parseFloat(weight.toString());
  
  if (unit === 'kg') {
    return weightNum;
  }
  
  // Convert lb to kg
  return weightNum * 0.453592;
}

/**
 * Calculate age from birthday
 */
function calculateAge(birthday?: Date): number | null {
  if (!birthday) return null;
  
  const today = new Date();
  const birthDate = new Date(birthday);
  const age = Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  return age > 0 && age < 150 ? age : null;
}

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 */
function calculateBMR(weightKg: number, heightCm: number, age: number, sex?: string): number {
  // Base calculation: (10 × weight in kg) + (6.25 × height in cm) - (5 × age)
  const baseCalc = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  
  // Gender adjustment
  if (sex === 'male') {
    return baseCalc + 5;
  } else if (sex === 'female') {
    return baseCalc - 161;
  } else {
    // For 'other' or undefined, use average of male and female
    return baseCalc - 78; // Average of +5 and -161
  }
}

/**
 * Get activity multiplier based on weekly workout schedule
 */
function getActivityMultiplier(weeklySchedule?: number): number {
  if (!weeklySchedule) return 1.2; // Sedentary default
  
  if (weeklySchedule <= 2) return 1.2;   // Sedentary
  if (weeklySchedule <= 4) return 1.55;  // Moderately active
  if (weeklySchedule <= 6) return 1.725; // Very active
  return 1.9; // Extremely active (7 days)
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
function calculateTDEE(bmr: number, weeklySchedule?: number): number {
  const multiplier = getActivityMultiplier(weeklySchedule);
  return Math.round(bmr * multiplier);
}

/**
 * Adjust calories based on fitness goal
 */
function adjustCaloriesForGoal(tdee: number, goal?: string): { calories: number; adjustment: number } {
  if (!goal) {
    return { calories: tdee, adjustment: 0 };
  }
  
  switch (goal) {
    case 'build_muscle':
    case 'gain_strength':
    case 'increase_power':
      return { calories: tdee + 300, adjustment: 300 };
    case 'lose_fat':
    case 'lose_weight':
      return { calories: tdee - 500, adjustment: -500 };
    case 'improve_endurance':
      return { calories: tdee + 150, adjustment: 150 };
    case 'improve_fitness':
    case 'improve_flexibility':
    case 'general_health':
    case 'stay_fit':
    case 'flexibility':
    default:
      return { calories: tdee, adjustment: 0 };
  }
}

/**
 * Calculate macro split based on goal and body weight
 */
function calculateMacros(totalCalories: number, weightLb: number, goal?: string): MacroTargets {
  let proteinGrams: number;
  let fatPercentage: number;
  
  switch (goal) {
    case 'build_muscle':
    case 'gain_strength':
    case 'increase_power':
      proteinGrams = Math.round(weightLb * 1.0); // 1g per lb for muscle building
      fatPercentage = 25; // 25% of calories from fat
      break;
    case 'lose_fat':
    case 'lose_weight':
      proteinGrams = Math.round(weightLb * 1.0); // 1g per lb to preserve muscle
      fatPercentage = 25; // 25% of calories from fat
      break;
    case 'improve_endurance':
      proteinGrams = Math.round(weightLb * 0.8);
      fatPercentage = 20;
      break;
    case 'improve_fitness':
    case 'improve_flexibility':
    case 'general_health':
    case 'stay_fit':
    case 'flexibility':
    default:
      proteinGrams = Math.round(weightLb * 0.8); // 0.8g per lb for maintenance
      fatPercentage = 30; // 30% of calories from fat
      break;
  }
  
  // Calculate fat calories and grams (1g fat = 9 calories)
  const fatCalories = Math.round(totalCalories * (fatPercentage / 100));
  const fatGrams = Math.round(fatCalories / 9);
  
  // Calculate protein calories (1g protein = 4 calories)
  const proteinCalories = proteinGrams * 4;
  
  // Remaining calories go to carbs (1g carb = 4 calories)
  const carbCalories = totalCalories - proteinCalories - fatCalories;
  const carbGrams = Math.round(carbCalories / 4);
  
  return {
    calories: totalCalories,
    protein: proteinGrams,
    carbs: Math.max(0, carbGrams), // Ensure non-negative
    fat: fatGrams,
  };
}

/**
 * Main function: Calculate personalized macro targets for a user
 */
export function calculatePersonalizedMacros(profile: UserProfileData): MacroCalculation {
  // Step 1: Convert height and weight to metric
  const heightCm = convertHeightToCm(profile.height.value, profile.height.unit);
  const weightKg = convertWeightToKg(profile.weight.value, profile.weight.unit);
  const weightLb = profile.weight.unit === 'lb' 
    ? (typeof profile.weight.value === 'number' ? profile.weight.value : parseFloat(profile.weight.value.toString()))
    : weightKg * 2.20462;
  const primaryGoal = profile.goals && profile.goals.length > 0 ? profile.goals[0] : profile.primaryGoal;
  
  // Step 2: Calculate age
  const age = calculateAge(profile.birthday) || 25; // Default to 25 if no birthday
  
  // Step 3: Calculate BMR
  const bmr = calculateBMR(weightKg, heightCm, age, profile.sex);
  
  // Step 4: Calculate TDEE
  const tdee = calculateTDEE(bmr, profile.weeklySchedule);
  
  // Step 5: Adjust for goal
  const { calories, adjustment } = adjustCaloriesForGoal(tdee, primaryGoal);
  
  // Step 6: Calculate macro split
  const macros = calculateMacros(calories, weightLb, primaryGoal);
  
  // Step 7: Get activity multiplier for breakdown
  const activityMultiplier = getActivityMultiplier(profile.weeklySchedule);
  
  return {
    targets: macros,
    breakdown: {
      bmr: Math.round(bmr),
      tdee: tdee,
      activityMultiplier: activityMultiplier,
      calorieAdjustment: adjustment,
      goal: primaryGoal || profile.primaryGoal || 'improve_fitness',
    },
    lastCalculated: new Date(),
    basedOn: {
      weight: Math.round(weightLb),
      weightUnit: 'lb',
      height: profile.height.value.toString(),
      age: age,
      sex: profile.sex || null,
      goal: primaryGoal || profile.primaryGoal || 'improve_fitness',
      weeklySchedule: profile.weeklySchedule || 3,
    },
  };
}

/**
 * Helper function: Check if macro targets need recalculation
 */
export function shouldRecalculateMacros(
  lastCalculation: MacroCalculation,
  currentProfile: UserProfileData
): boolean {
  const weightChanged = Math.abs(
    lastCalculation.basedOn.weight - 
    (currentProfile.weight.unit === 'lb' 
      ? parseFloat(currentProfile.weight.value.toString())
      : parseFloat(currentProfile.weight.value.toString()) * 2.20462)
  ) > 5; // 5+ lb change
  
  const currentGoal = currentProfile.goals && currentProfile.goals.length > 0
    ? currentProfile.goals[0]
    : currentProfile.primaryGoal;
  const goalChanged = lastCalculation.basedOn.goal !== (currentGoal || 'improve_fitness');
  
  const scheduleChanged = lastCalculation.basedOn.weeklySchedule !== currentProfile.weeklySchedule;
  
  // Recalculate if 30+ days have passed
  const daysSinceCalculation = Math.floor(
    (new Date().getTime() - new Date(lastCalculation.lastCalculated).getTime()) / (1000 * 60 * 60 * 24)
  );
  const timeExpired = daysSinceCalculation > 30;
  
  return weightChanged || goalChanged || scheduleChanged || timeExpired;
}

/**
 * Format macro targets for display
 */
export function formatMacroTargets(targets: MacroTargets): string {
  return `${targets.calories} cal • ${targets.protein}g protein • ${targets.carbs}g carbs • ${targets.fat}g fat`;
}

/**
 * Get goal description for display
 */
export function getGoalDescription(goal?: string): string {
  switch (goal) {
    case 'build_muscle':
      return 'Building Muscle (Calorie Surplus)';
    case 'lose_fat':
      return 'Losing Fat (Calorie Deficit)';
    case 'improve_fitness':
      return 'Maintaining Fitness';
    default:
      return 'General Fitness';
  }
}







