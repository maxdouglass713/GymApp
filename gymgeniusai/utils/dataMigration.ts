import { userService, workoutService, mealService, pointsService } from '../services/firestoreService';
import { UserDocument, WorkoutDocument, MealDocument, PointEventDocument } from '../types/firestore';

// Import your existing store types
import { OnboardingData } from '../stores/onboardingStore';
import { Workout } from '../stores/workoutStore';

export interface MigrationResult {
  success: boolean;
  message: string;
  migratedCount?: number;
}

export const dataMigrationService = {
  // Migrate user onboarding data to Firestore
  async migrateOnboardingData(
    uid: string, 
    onboardingData: OnboardingData
  ): Promise<MigrationResult> {
    try {
      const userUpdates: Partial<UserDocument> = {
        firstName: onboardingData.firstName,
        height: onboardingData.height,
        weight: onboardingData.weight,
        sex: onboardingData.sex,
        exerciseExperience: onboardingData.exerciseExperience,
        primaryGoal: onboardingData.primaryGoal,
        goals: onboardingData.goals,
        equipment: onboardingData.equipment,
        weeklySchedule: onboardingData.weeklySchedule,
        injuries: onboardingData.injuries,
        nutritionPreference: onboardingData.nutritionPreference,
        onboardingCompleted: true,
      };

      await userService.updateUser(uid, userUpdates);

      return {
        success: true,
        message: 'Onboarding data migrated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to migrate onboarding data: ${error.message}`,
      };
    }
  },

  // Migrate workout data to Firestore
  async migrateWorkouts(
    uid: string, 
    workouts: Workout[]
  ): Promise<MigrationResult> {
    try {
      let migratedCount = 0;

      for (const workout of workouts) {
        const workoutData: Omit<WorkoutDocument, 'id' | 'createdAt'> = {
          uid,
          name: workout.name || 'Workout',
          exercises: workout.exercises.map(exercise => ({
            id: exercise.id,
            name: exercise.name,
            sets: exercise.sets.map(set => ({
              id: set.id,
              reps: set.reps,
              weight: set.weight,
              duration: set.duration,
              distance: set.distance,
              notes: set.notes,
              formAnalysisId: set.formAnalysisId,
            })),
            notes: exercise.notes,
            restTime: exercise.restTime,
          })),
          duration: workout.duration,
          notes: workout.notes,
          completedAt: workout.completedAt,
          isTemplate: workout.isTemplate || false,
          aiGenerated: workout.aiGenerated || false,
          goal: workout.goal,
          difficulty: workout.difficulty,
        };

        await workoutService.createWorkout(workoutData);
        migratedCount++;

        // Award points for completed workouts
        if (workout.completedAt) {
          await pointsService.addPointEvent({
            uid,
            type: 'workout',
            amount: 100,
            description: 'Completed workout',
            workoutId: workout.id,
          });
        }
      }

      return {
        success: true,
        message: `Successfully migrated ${migratedCount} workouts`,
        migratedCount,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to migrate workouts: ${error.message}`,
      };
    }
  },

  // Migrate meal data to Firestore
  async migrateMeals(
    uid: string, 
    meals: any[] // Replace with your actual meal type
  ): Promise<MigrationResult> {
    try {
      let migratedCount = 0;

      for (const meal of meals) {
        const mealData: Omit<MealDocument, 'id' | 'createdAt'> = {
          uid,
          name: meal.name || 'Meal',
          type: meal.type || 'snack',
          macros: meal.macros || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
          foods: meal.foods || [],
          photoUrl: meal.photoUrl,
          mealTime: meal.mealTime || new Date(),
        };

        await mealService.createMeal(mealData);
        migratedCount++;

        // Award points for meal logging
        await pointsService.addPointEvent({
          uid,
          type: 'meal_log',
          amount: 30,
          description: 'Logged meal',
          mealId: meal.id,
        });
      }

      return {
        success: true,
        message: `Successfully migrated ${migratedCount} meals`,
        migratedCount,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to migrate meals: ${error.message}`,
      };
    }
  },

  // Migrate points data to Firestore
  async migratePoints(
    uid: string, 
    points: number,
    pointHistory: any[] // Replace with your actual point history type
  ): Promise<MigrationResult> {
    try {
      let migratedCount = 0;

      // Update user's total points
      await userService.updateUser(uid, { points });

      // Migrate point history
      for (const pointEvent of pointHistory) {
        const pointEventData: Omit<PointEventDocument, 'id' | 'createdAt'> = {
          uid,
          type: pointEvent.type || 'workout',
          amount: pointEvent.amount || 0,
          description: pointEvent.description || 'Point event',
          workoutId: pointEvent.workoutId,
          mealId: pointEvent.mealId,
          videoId: pointEvent.videoId,
        };

        await pointsService.addPointEvent(pointEventData);
        migratedCount++;
      }

      return {
        success: true,
        message: `Successfully migrated ${migratedCount} point events`,
        migratedCount,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to migrate points: ${error.message}`,
      };
    }
  },

  // Complete migration of all user data
  async migrateAllUserData(
    uid: string,
    data: {
      onboarding?: OnboardingData;
      workouts?: Workout[];
      meals?: any[];
      points?: number;
      pointHistory?: any[];
    }
  ): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];

    // Migrate onboarding data
    if (data.onboarding) {
      const onboardingResult = await this.migrateOnboardingData(uid, data.onboarding);
      results.push(onboardingResult);
    }

    // Migrate workouts
    if (data.workouts && data.workouts.length > 0) {
      const workoutsResult = await this.migrateWorkouts(uid, data.workouts);
      results.push(workoutsResult);
    }

    // Migrate meals
    if (data.meals && data.meals.length > 0) {
      const mealsResult = await this.migrateMeals(uid, data.meals);
      results.push(mealsResult);
    }

    // Migrate points
    if (data.points !== undefined || (data.pointHistory && data.pointHistory.length > 0)) {
      const pointsResult = await this.migratePoints(
        uid, 
        data.points || 0, 
        data.pointHistory || []
      );
      results.push(pointsResult);
    }

    return results;
  },
};
