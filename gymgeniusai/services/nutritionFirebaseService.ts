import { mealService } from '../services/firestoreService';
import { MealDocument, MealFoodDocument } from '../types/firestore';
import { db } from '@/config/firebase';
import { collection, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

// Define FoodItem interface locally to avoid circular imports
export interface FoodItem {
  id: string;
  name: string;
  servingSize: string;
  servingCount: number;
  macrosPerServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  loggedAt: Date;
  notes?: string;
}

// Helper function to convert Date objects to Firestore timestamps
const prepareForFirestore = (data: any): any => {
  if (!data) return data;
  
  const prepared = { ...data };
  Object.keys(prepared).forEach(key => {
    if (prepared[key] instanceof Date) {
      prepared[key] = Timestamp.fromDate(prepared[key]);
    } else if (typeof prepared[key] === 'object' && prepared[key] !== null) {
      prepared[key] = prepareForFirestore(prepared[key]);
    }
  });
  
  return prepared;
};

// Service to bridge local nutrition store with Firebase
export const nutritionFirebaseService = {
  // Convert local FoodItem to Firebase MealDocument format
  convertFoodItemToMealDocument: (foodItem: FoodItem, uid: string): MealDocument => {
    const mealFood: MealFoodDocument = {
      id: foodItem.id,
      name: foodItem.name,
      quantity: foodItem.servingCount,
      unit: foodItem.servingSize,
      macros: foodItem.macrosPerServing,
    };

    return {
      id: foodItem.id,
      uid,
      name: foodItem.name,
      type: foodItem.mealType === 'snacks' ? 'snack' : foodItem.mealType as any,
      macros: foodItem.totalMacros,
      foods: [mealFood],
      createdAt: foodItem.loggedAt,
      mealTime: foodItem.loggedAt,
    };
  },

  // Convert Firebase MealDocument to local FoodItem format
  convertMealDocumentToFoodItem: (mealDoc: MealDocument): FoodItem => {
    const mealFood = mealDoc.foods[0]; // Assuming single food per meal for now
    
    return {
      id: mealDoc.id,
      name: mealDoc.name,
      servingSize: mealFood.unit,
      servingCount: mealFood.quantity,
      macrosPerServing: mealFood.macros,
      totalMacros: mealDoc.macros,
      mealType: mealDoc.type === 'snack' ? 'snacks' : mealDoc.type as any,
      loggedAt: mealDoc.createdAt,
    };
  },

  // Save food item to Firebase
  async saveFoodItemToFirebase(foodItem: FoodItem, uid: string): Promise<void> {
    try {
      const mealDoc = this.convertFoodItemToMealDocument(foodItem, uid);
      await mealService.createMeal(mealDoc);
    } catch (error) {
      console.error('Error saving food item to Firebase:', error);
      throw error;
    }
  },

  // Load user's meals from Firebase for a specific date
  async loadUserMealsFromFirebase(uid: string, date: Date): Promise<FoodItem[]> {
    try {
      const mealDocs = await mealService.getMealsByDate(uid, date);
      return mealDocs.map(mealDoc => this.convertMealDocumentToFoodItem(mealDoc));
    } catch (error) {
      console.error('Error loading meals from Firebase:', error);
      return [];
    }
  },

  // Update food item in Firebase
  // If the document doesn't exist (e.g., from shared meal plan), create it instead
  async updateFoodItemInFirebase(foodItem: FoodItem, uid: string): Promise<void> {
    try {
      const mealDoc = this.convertFoodItemToMealDocument(foodItem, uid);
      
      // Check if the meal document exists in Firebase
      const mealRef = doc(db, 'meals', foodItem.id);
      const mealSnap = await getDoc(mealRef);
      
      if (mealSnap.exists()) {
        // Document exists, update it
        console.log('📝 Updating existing meal document:', foodItem.id);
        await mealService.updateMeal(foodItem.id, {
          name: mealDoc.name,
          type: mealDoc.type,
          macros: mealDoc.macros,
          foods: mealDoc.foods,
          mealTime: mealDoc.mealTime,
        });
      } else {
        // Document doesn't exist (e.g., from shared meal plan), create it with the existing ID
        console.log('➕ Meal document does not exist, creating new one:', foodItem.id);
        const mealRef = doc(db, 'meals', foodItem.id);
        const mealDocument: MealDocument = {
          id: foodItem.id,
          uid: uid,
          name: mealDoc.name,
          type: mealDoc.type,
          macros: mealDoc.macros,
          foods: mealDoc.foods,
          createdAt: foodItem.loggedAt,
          mealTime: foodItem.loggedAt,
        };
        await setDoc(mealRef, prepareForFirestore(mealDocument));
        console.log('✅ Created new meal document with ID:', foodItem.id);
      }
    } catch (error) {
      console.error('Error updating food item in Firebase:', error);
      throw error;
    }
  },

  // Delete food item from Firebase
  async deleteFoodItemFromFirebase(foodId: string): Promise<void> {
    try {
      await mealService.deleteMeal(foodId);
    } catch (error) {
      console.error('Error deleting food item from Firebase:', error);
      throw error;
    }
  },

  // Save per-day nutrition metadata (e.g., completedMeals, macroChallenge flags)
  async saveDailyNutrition(uid: string, dateStr: string, updates: any): Promise<void> {
    try {
      const dailyRef = doc(collection(db, 'users', uid, 'dailyNutrition'), dateStr);
      const existing = await getDoc(dailyRef);
      const data = existing.exists() ? { ...existing.data(), ...updates } : { date: dateStr, ...updates };
      await setDoc(dailyRef, data, { merge: true } as any);
    } catch (error) {
      console.error('Error saving daily nutrition meta to Firebase:', error);
      throw error;
    }
  },

  // Load per-day nutrition metadata
  async loadDailyNutrition(uid: string, dateStr: string): Promise<any | null> {
    try {
      const dailyRef = doc(collection(db, 'users', uid, 'dailyNutrition'), dateStr);
      const snap = await getDoc(dailyRef);
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      console.error('Error loading daily nutrition meta from Firebase:', error);
      return null;
    }
  },
};
