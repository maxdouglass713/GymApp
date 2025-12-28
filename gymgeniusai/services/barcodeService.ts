/**
 * Service for fetching product information from barcodes using OpenFoodFacts API
 */

export interface MicroNutrients {
  // Vitamins
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

export interface ProductData {
  name: string;
  brand?: string;
  imageUrl?: string;
  servingSize?: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  micronutrients?: MicroNutrients; // per serving
  nutritionPer100g?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  nutritionPerServing?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

/**
 * Fetches product information from OpenFoodFacts API using barcode
 */
export const fetchProductByBarcode = async (barcode: string): Promise<ProductData | null> => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    
    if (!response.ok) {
      throw new Error('Product not found');
    }
    
    const data = await response.json();
    
    if (data.status === 0 || !data.product) {
      return null;
    }
    
    const product = data.product;
    
    // Extract product name
    const name = product.product_name || product.product_name_en || product.generic_name || 'Unknown Product';
    const brand = product.brands || product.brand || '';
    
    // Get image URL
    const imageUrl = product.image_url || product.image_front_url || product.image_front_small_url;
    
    // Extract serving size (in grams)
    let servingSize = '100g'; // Default
    if (product.serving_size) {
      // Try to parse serving size (e.g., "100 g", "1 cup", etc.)
      servingSize = product.serving_size;
    }
    
    // Extract nutrition data per 100g
    const nutriments = product.nutriments || {};
    
    // Get values per 100g (preferred)
    const caloriesPer100g = nutriments['energy-kcal_100g'] || 
                            nutriments['energy-kcal'] || 
                            (nutriments['energy_100g'] ? nutriments['energy_100g'] / 4.184 : 0); // Convert kJ to kcal
    const proteinPer100g = nutriments['proteins_100g'] || nutriments['proteins'] || 0;
    const carbsPer100g = nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0;
    const fatPer100g = nutriments['fat_100g'] || nutriments['fat'] || 0;
    
    // Get values per serving if available
    const caloriesPerServing = nutriments['energy-kcal_serving'] || 
                              (nutriments['energy_serving'] ? nutriments['energy_serving'] / 4.184 : null);
    const proteinPerServing = nutriments['proteins_serving'] || null;
    const carbsPerServing = nutriments['carbohydrates_serving'] || null;
    const fatPerServing = nutriments['fat_serving'] || null;
    
    // Determine serving size in grams
    let servingSizeInGrams = 100; // Default to 100g
    if (product.serving_size) {
      const servingSizeMatch = product.serving_size.match(/(\d+(?:\.\d+)?)\s*g/i);
      if (servingSizeMatch) {
        servingSizeInGrams = parseFloat(servingSizeMatch[1]);
      }
    }
    
    // Use per-serving values if available, otherwise calculate from per-100g
    let finalMacros;
    if (caloriesPerServing !== null && proteinPerServing !== null && 
        carbsPerServing !== null && fatPerServing !== null) {
      // Use per-serving values directly
      finalMacros = {
        calories: Math.round(caloriesPerServing),
        protein: Math.round(proteinPerServing * 10) / 10,
        carbs: Math.round(carbsPerServing * 10) / 10,
        fat: Math.round(fatPerServing * 10) / 10,
      };
      servingSize = product.serving_size || '1 serving';
    } else {
      // Calculate from per-100g values based on serving size
      const multiplier = servingSizeInGrams / 100;
      finalMacros = {
        calories: Math.round(caloriesPer100g * multiplier),
        protein: Math.round(proteinPer100g * multiplier * 10) / 10,
        carbs: Math.round(carbsPer100g * multiplier * 10) / 10,
        fat: Math.round(fatPer100g * multiplier * 10) / 10,
      };
      servingSize = `${servingSizeInGrams}g`;
    }
    
    // Extract micronutrients from OpenFoodFacts
    const extractMicronutrients = (): MicroNutrients | undefined => {
      const micros: MicroNutrients = {};
      
      // Vitamins
      if (nutriments['vitamin-a_100g']) micros.vitaminA = nutriments['vitamin-a_100g'];
      if (nutriments['vitamin-c_100g']) micros.vitaminC = nutriments['vitamin-c_100g'];
      if (nutriments['vitamin-d_100g']) micros.vitaminD = nutriments['vitamin-d_100g'];
      if (nutriments['vitamin-e_100g']) micros.vitaminE = nutriments['vitamin-e_100g'];
      if (nutriments['vitamin-k_100g']) micros.vitaminK = nutriments['vitamin-k_100g'];
      if (nutriments['thiamin_100g']) micros.thiamin = nutriments['thiamin_100g'];
      if (nutriments['riboflavin_100g']) micros.riboflavin = nutriments['riboflavin_100g'];
      if (nutriments['niacin_100g']) micros.niacin = nutriments['niacin_100g'];
      if (nutriments['vitamin-b6_100g']) micros.vitaminB6 = nutriments['vitamin-b6_100g'];
      if (nutriments['folate_100g']) micros.folate = nutriments['folate_100g'];
      if (nutriments['vitamin-b12_100g']) micros.vitaminB12 = nutriments['vitamin-b12_100g'];
      
      // Minerals
      if (nutriments['calcium_100g']) micros.calcium = nutriments['calcium_100g'];
      if (nutriments['iron_100g']) micros.iron = nutriments['iron_100g'];
      if (nutriments['magnesium_100g']) micros.magnesium = nutriments['magnesium_100g'];
      if (nutriments['phosphorus_100g']) micros.phosphorus = nutriments['phosphorus_100g'];
      if (nutriments['potassium_100g']) micros.potassium = nutriments['potassium_100g'];
      if (nutriments['sodium_100g']) micros.sodium = nutriments['sodium_100g'];
      if (nutriments['zinc_100g']) micros.zinc = nutriments['zinc_100g'];
      if (nutriments['copper_100g']) micros.copper = nutriments['copper_100g'];
      if (nutriments['manganese_100g']) micros.manganese = nutriments['manganese_100g'];
      if (nutriments['selenium_100g']) micros.selenium = nutriments['selenium_100g'];
      
      // Other
      if (nutriments['fiber_100g']) micros.fiber = nutriments['fiber_100g'];
      if (nutriments['sugars_100g']) micros.sugar = nutriments['sugars_100g'];
      if (nutriments['cholesterol_100g']) micros.cholesterol = nutriments['cholesterol_100g'];
      if (nutriments['saturated-fat_100g']) micros.saturatedFat = nutriments['saturated-fat_100g'];
      if (nutriments['trans-fat_100g']) micros.transFat = nutriments['trans-fat_100g'];
      
      // If we have any micronutrients, calculate per-serving values
      if (Object.keys(micros).length > 0) {
        const multiplier = servingSizeInGrams / 100;
        const servingMicros: MicroNutrients = {};
        
        Object.keys(micros).forEach(key => {
          const value = micros[key as keyof MicroNutrients];
          if (value !== undefined) {
            (servingMicros as any)[key] = Math.round(value * multiplier * 100) / 100;
          }
        });
        
        return servingMicros;
      }
      
      return undefined;
    };
    
    const micronutrients = extractMicronutrients();
    
    return {
      name: name.trim(),
      brand: brand.trim() || undefined,
      imageUrl: imageUrl || undefined,
      servingSize,
      macros: finalMacros,
      micronutrients,
      nutritionPer100g: {
        calories: Math.round(caloriesPer100g),
        protein: Math.round(proteinPer100g * 10) / 10,
        carbs: Math.round(carbsPer100g * 10) / 10,
        fat: Math.round(fatPer100g * 10) / 10,
      },
      nutritionPerServing: caloriesPerServing !== null ? {
        calories: Math.round(caloriesPerServing),
        protein: proteinPerServing ? Math.round(proteinPerServing * 10) / 10 : undefined,
        carbs: carbsPerServing ? Math.round(carbsPerServing * 10) / 10 : undefined,
        fat: fatPerServing ? Math.round(fatPerServing * 10) / 10 : undefined,
      } : undefined,
    };
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return null;
  }
};




