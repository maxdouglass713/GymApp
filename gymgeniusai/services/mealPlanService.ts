/**
 * Meal Plan Firebase Service
 * 
 * Handles CRUD operations for meal plans in Firestore
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MealBatch } from '../types/mealPlan';

const MEAL_PLANS_COLLECTION = 'mealPlans';

/**
 * Save meal batch to Firestore
 */
export async function saveMealBatchToFirebase(batch: MealBatch): Promise<void> {
  try {
    console.log('💾 Saving meal batch to Firebase:', batch.id);
    
    const batchRef = doc(db, MEAL_PLANS_COLLECTION, batch.id);
    
    // Convert dates to Firestore Timestamps
    const batchData = {
      ...batch,
      generatedAt: Timestamp.fromDate(new Date(batch.generatedAt)),
      meals: {
        breakfast: {
          ...batch.meals.breakfast,
          addedToNutrition: batch.meals.breakfast.addedToNutrition 
            ? Timestamp.fromDate(new Date(batch.meals.breakfast.addedToNutrition))
            : null,
        },
        lunch: {
          ...batch.meals.lunch,
          addedToNutrition: batch.meals.lunch.addedToNutrition 
            ? Timestamp.fromDate(new Date(batch.meals.lunch.addedToNutrition))
            : null,
        },
        dinner: {
          ...batch.meals.dinner,
          addedToNutrition: batch.meals.dinner.addedToNutrition 
            ? Timestamp.fromDate(new Date(batch.meals.dinner.addedToNutrition))
            : null,
        },
        snack: {
          ...batch.meals.snack,
          addedToNutrition: batch.meals.snack.addedToNutrition 
            ? Timestamp.fromDate(new Date(batch.meals.snack.addedToNutrition))
            : null,
        },
      },
    };
    
    await setDoc(batchRef, batchData);
    console.log('✅ Meal batch saved to Firebase');
  } catch (error) {
    console.error('❌ Error saving meal batch to Firebase:', error);
    throw error;
  }
}

/**
 * Load all meal batches for a user
 */
export async function loadMealBatchesFromFirebase(userId: string): Promise<MealBatch[]> {
  try {
    console.log('📥 Loading meal batches from Firebase for user:', userId);
    
    // Simplified query that doesn't require a composite index
    const q = query(
      collection(db, MEAL_PLANS_COLLECTION),
      where('userId', '==', userId),
      limit(50) // Load more batches and sort in memory
    );
    
    const querySnapshot = await getDocs(q);
    const batches: MealBatch[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Convert Timestamps back to Dates
      const batch: MealBatch = {
        ...data,
        id: doc.id,
        generatedAt: data.generatedAt?.toDate() || new Date(),
        meals: {
          breakfast: {
            ...data.meals.breakfast,
            addedToNutrition: data.meals.breakfast.addedToNutrition?.toDate(),
          },
          lunch: {
            ...data.meals.lunch,
            addedToNutrition: data.meals.lunch.addedToNutrition?.toDate(),
          },
          dinner: {
            ...data.meals.dinner,
            addedToNutrition: data.meals.dinner.addedToNutrition?.toDate(),
          },
          snack: {
            ...data.meals.snack,
            addedToNutrition: data.meals.snack.addedToNutrition?.toDate(),
          },
        },
      } as MealBatch;
      
      batches.push(batch);
    });
    
    // Sort by generatedAt in descending order (newest first)
    batches.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
    
    // Return only the last 20 batches
    const recentBatches = batches.slice(0, 20);
    
    console.log('✅ Loaded meal batches from Firebase:', recentBatches.length);
    return recentBatches;
  } catch (error) {
    console.error('❌ Error loading meal batches from Firebase:', error);
    return [];
  }
}

/**
 * Get a specific meal batch by ID
 */
export async function getMealBatchById(batchId: string): Promise<MealBatch | null> {
  try {
    const batchRef = doc(db, MEAL_PLANS_COLLECTION, batchId);
    const batchDoc = await getDoc(batchRef);
    
    if (!batchDoc.exists()) {
      return null;
    }
    
    const data = batchDoc.data();
    
    const batch: MealBatch = {
      ...data,
      id: batchDoc.id,
      generatedAt: data.generatedAt?.toDate() || new Date(),
      meals: {
        breakfast: {
          ...data.meals.breakfast,
          addedToNutrition: data.meals.breakfast.addedToNutrition?.toDate(),
        },
        lunch: {
          ...data.meals.lunch,
          addedToNutrition: data.meals.lunch.addedToNutrition?.toDate(),
        },
        dinner: {
          ...data.meals.dinner,
          addedToNutrition: data.meals.dinner.addedToNutrition?.toDate(),
        },
        snack: {
          ...data.meals.snack,
          addedToNutrition: data.meals.snack.addedToNutrition?.toDate(),
        },
      },
    } as MealBatch;
    
    return batch;
  } catch (error) {
    console.error('❌ Error getting meal batch:', error);
    return null;
  }
}

