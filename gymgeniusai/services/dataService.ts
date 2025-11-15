import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface MealItem {
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
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt: Date;
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface WorkoutSet {
  id: string;
  reps: number | null;
  weight: number | null;
  duration?: number; // for time-based exercises
  distance?: number; // for distance-based exercises
  notes?: string;
  style: 'slow' | 'normal' | 'fast';
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  notes?: string;
  type?: 'strength' | 'cardio';
  machineLoad?: {
    type: 'pin' | 'plate';
    equipment?: string | string[];
    baseWeight?: number;
    plateCounts?: Record<string, number>;
    exerciseName?: string;
  };
}

export interface Workout {
  id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  exercises: WorkoutExercise[];
  createdAt: Date;
  completedAt?: Date;
}

export interface CardioEntry {
  id: string;
  type: string;
  date: string; // ISO date string (YYYY-MM-DD)
  duration: number; // in minutes
  distance?: number; // in miles or km
  calories?: number;
  intensity: 'low' | 'moderate' | 'high';
  notes?: string;
  createdAt: Date;
}

export interface DailySummary {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  userId: string;
  meals: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    mealCount: number;
  };
  workouts: {
    workoutCount: number;
    totalDuration: number; // in minutes
    exercisesCompleted: number;
  };
  cardio: {
    cardioCount: number;
    totalDuration: number; // in minutes
    totalDistance?: number;
    totalCalories?: number;
  };
  pointsEarned: number;
  updatedAt: Date;
}

export class DataService {
  private static instance: DataService;
  
  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  /**
   * Add a meal entry for a user
   */
  async addMeal(userId: string, meal: Omit<MealItem, 'id' | 'loggedAt'>): Promise<string> {
    try {
      console.log('🔄 Adding meal for user:', userId);
      
      const mealData = {
        ...meal,
        userId,
        loggedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'users', userId, 'meals'), mealData);
      
      // Update daily summary
      await this.updateDailySummary(userId, meal.date);
      
      console.log('✅ Meal added successfully');
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Add meal error:', error);
      throw error;
    }
  }

  /**
   * Add a workout entry for a user
   */
  async addWorkout(userId: string, workout: Omit<Workout, 'id' | 'createdAt' | 'completedAt'>): Promise<string> {
    try {
      console.log('🔄 Adding workout for user:', userId);
      
      const workoutData = {
        ...workout,
        userId,
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'users', userId, 'workouts'), workoutData);
      
      // Update daily summary
      await this.updateDailySummary(userId, workout.date);
      
      console.log('✅ Workout added successfully');
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Add workout error:', error);
      throw error;
    }
  }

  /**
   * Add a cardio entry for a user
   */
  async addCardio(userId: string, cardio: Omit<CardioEntry, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('🔄 Adding cardio for user:', userId);
      
      const cardioData = {
        ...cardio,
        userId,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'users', userId, 'cardio'), cardioData);
      
      // Update daily summary
      await this.updateDailySummary(userId, cardio.date);
      
      console.log('✅ Cardio added successfully');
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Add cardio error:', error);
      throw error;
    }
  }

  /**
   * Get meals for a user within a date range
   */
  async getMeals(userId: string, startDate: string, endDate: string): Promise<MealItem[]> {
    try {
      console.log('🔄 Getting meals for user:', userId, 'from', startDate, 'to', endDate);
      
      const q = query(
        collection(db, 'users', userId, 'meals'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('loggedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const meals: MealItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        meals.push({
          id: doc.id,
          ...data,
          loggedAt: data.loggedAt?.toDate() || new Date(),
        } as MealItem);
      });

      console.log(`✅ Retrieved ${meals.length} meals`);
      return meals;
    } catch (error: any) {
      console.error('❌ Get meals error:', error);
      throw error;
    }
  }

  /**
   * Get workouts for a user within a date range
   */
  async getWorkouts(userId: string, startDate: string, endDate: string): Promise<Workout[]> {
    try {
      console.log('🔄 Getting workouts for user:', userId, 'from', startDate, 'to', endDate);
      
      const q = query(
        collection(db, 'users', userId, 'workouts'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('completedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const workouts: Workout[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        workouts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate(),
        } as Workout);
      });

      console.log(`✅ Retrieved ${workouts.length} workouts`);
      return workouts;
    } catch (error: any) {
      console.error('❌ Get workouts error:', error);
      throw error;
    }
  }

  /**
   * Get cardio entries for a user within a date range
   */
  async getCardio(userId: string, startDate: string, endDate: string): Promise<CardioEntry[]> {
    try {
      console.log('🔄 Getting cardio for user:', userId, 'from', startDate, 'to', endDate);
      
      const q = query(
        collection(db, 'users', userId, 'cardio'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const cardioEntries: CardioEntry[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        cardioEntries.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as CardioEntry);
      });

      console.log(`✅ Retrieved ${cardioEntries.length} cardio entries`);
      return cardioEntries;
    } catch (error: any) {
      console.error('❌ Get cardio error:', error);
      throw error;
    }
  }

  /**
   * Get daily summary for a specific date
   */
  async getDailySummary(userId: string, date: string): Promise<DailySummary | null> {
    try {
      console.log('🔄 Getting daily summary for user:', userId, 'date:', date);
      
      const docRef = doc(db, 'users', userId, 'dailySummaries', date);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as DailySummary;
      }

      console.log('ℹ️ No daily summary found for date:', date);
      return null;
    } catch (error: any) {
      console.error('❌ Get daily summary error:', error);
      throw error;
    }
  }

  /**
   * Get recent activity (last 30 days) for a user
   */
  async getRecentActivity(userId: string): Promise<{
    meals: MealItem[];
    workouts: Workout[];
    cardio: CardioEntry[];
    dailySummaries: DailySummary[];
  }> {
    try {
      console.log('🔄 Getting recent activity for user:', userId);
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [meals, workouts, cardio, dailySummaries] = await Promise.all([
        this.getMeals(userId, startDate, endDate),
        this.getWorkouts(userId, startDate, endDate),
        this.getCardio(userId, startDate, endDate),
        this.getDailySummaries(userId, startDate, endDate)
      ]);

      console.log('✅ Retrieved recent activity data');
      return { meals, workouts, cardio, dailySummaries };
    } catch (error: any) {
      console.error('❌ Get recent activity error:', error);
      throw error;
    }
  }

  /**
   * Get daily summaries within a date range
   */
  async getDailySummaries(userId: string, startDate: string, endDate: string): Promise<DailySummary[]> {
    try {
      const q = query(
        collection(db, 'users', userId, 'dailySummaries'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const summaries: DailySummary[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        summaries.push({
          id: doc.id,
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as DailySummary);
      });

      return summaries;
    } catch (error: any) {
      console.error('❌ Get daily summaries error:', error);
      throw error;
    }
  }

  /**
   * Update or create daily summary for a specific date
   */
  async updateDailySummary(userId: string, date: string): Promise<void> {
    try {
      console.log('🔄 Updating daily summary for user:', userId, 'date:', date);
      
      await runTransaction(db, async (transaction) => {
        const summaryRef = doc(db, 'users', userId, 'dailySummaries', date);
        const summaryDoc = await transaction.get(summaryRef);

        // Get all data for this date
        const [meals, workouts, cardio] = await Promise.all([
          this.getMeals(userId, date, date),
          this.getWorkouts(userId, date, date),
          this.getCardio(userId, date, date)
        ]);

        // Calculate totals
        const mealTotals = meals.reduce((totals, meal) => ({
          totalCalories: totals.totalCalories + meal.totalMacros.calories,
          totalProtein: totals.totalProtein + meal.totalMacros.protein,
          totalCarbs: totals.totalCarbs + meal.totalMacros.carbs,
          totalFat: totals.totalFat + meal.totalMacros.fat,
          mealCount: totals.mealCount + 1,
        }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealCount: 0 });

        const workoutTotals = workouts.reduce((totals, workout) => ({
          workoutCount: totals.workoutCount + 1,
          totalDuration: totals.totalDuration + (workout.exercises.reduce((exerciseTotal, exercise) => 
            exerciseTotal + (exercise.sets.reduce((setTotal, set) => 
              setTotal + (set.duration || 0), 0)), 0)),
          exercisesCompleted: totals.exercisesCompleted + workout.exercises.length,
        }), { workoutCount: 0, totalDuration: 0, exercisesCompleted: 0 });

        const cardioTotals = cardio.reduce((totals, entry) => ({
          cardioCount: totals.cardioCount + 1,
          totalDuration: totals.totalDuration + entry.duration,
          totalDistance: (totals.totalDistance || 0) + (entry.distance || 0),
          totalCalories: (totals.totalCalories || 0) + (entry.calories || 0),
        }), { cardioCount: 0, totalDuration: 0, totalDistance: 0, totalCalories: 0 });

        // Calculate points earned (100 for workout, 50 for cardio, 30 for meal)
        const pointsEarned = (workoutTotals.workoutCount * 100) + 
                           (cardioTotals.cardioCount * 50) + 
                           (mealTotals.mealCount * 30);

        const summaryData: Omit<DailySummary, 'id'> = {
          date,
          userId,
          meals: mealTotals,
          workouts: workoutTotals,
          cardio: cardioTotals,
          pointsEarned,
          updatedAt: new Date(),
        };

        transaction.set(summaryRef, {
          ...summaryData,
          updatedAt: serverTimestamp(),
        });
      });

      console.log('✅ Daily summary updated');
    } catch (error: any) {
      console.error('❌ Update daily summary error:', error);
      throw error;
    }
  }

  /**
   * Delete user data (for account deletion)
   */
  async deleteUserData(userId: string): Promise<void> {
    try {
      console.log('🔄 Deleting all data for user:', userId);
      
      // Note: In a production app, you'd typically use Firebase Admin SDK
      // or Cloud Functions to delete user data due to security rules
      console.warn('⚠️ User data deletion requires server-side implementation');
    } catch (error: any) {
      console.error('❌ Delete user data error:', error);
      throw error;
    }
  }
}

export const dataService = DataService.getInstance();
