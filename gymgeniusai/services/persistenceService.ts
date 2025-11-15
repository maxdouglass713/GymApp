import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  WORKOUT_HISTORY: 'workout_history',
  CURRENT_WORKOUT: 'current_workout',
  CUSTOM_EXERCISES: 'custom_exercises',
  NUTRITION_DATA: 'nutrition_data',
  USER_PROFILE: 'user_profile',
  POINTS_DATA: 'points_data',
  PENDING_SYNCS: 'pending_syncs',
  FAVORITES: 'favorites',
  COMMUNITY_DATA: 'community_data',
  ONBOARDING_PROGRESS: 'onboarding_progress',
} as const;

export interface PendingSync {
  id: string;
  type: 'workout' | 'meal' | 'points' | 'profile';
  data: any;
  timestamp: number;
  userId: string;
}

class PersistenceService {
  // Generic save/load methods
  async save<T>(key: string, data: T): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      await AsyncStorage.setItem(key, jsonData);
      console.log(`💾 Saved ${key} to local storage`);
    } catch (error) {
      console.error(`❌ Failed to save ${key}:`, error);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const jsonData = await AsyncStorage.getItem(key);
      if (jsonData) {
        const data = JSON.parse(jsonData);
        console.log(`📱 Loaded ${key} from local storage`);
        return data;
      }
      return null;
    } catch (error) {
      console.error(`❌ Failed to load ${key}:`, error);
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Removed ${key} from local storage`);
    } catch (error) {
      console.error(`❌ Failed to remove ${key}:`, error);
    }
  }

  // Workout-specific methods
  async saveWorkoutHistory(workouts: any[]): Promise<void> {
    await this.save(STORAGE_KEYS.WORKOUT_HISTORY, workouts);
  }

  async loadWorkoutHistory(): Promise<any[] | null> {
    return await this.load<any[]>(STORAGE_KEYS.WORKOUT_HISTORY);
  }

  async saveCurrentWorkout(workout: any): Promise<void> {
    await this.save(STORAGE_KEYS.CURRENT_WORKOUT, workout);
  }

  async loadCurrentWorkout(): Promise<any | null> {
    return await this.load<any>(STORAGE_KEYS.CURRENT_WORKOUT);
  }

  async saveCustomExercises(exercises: any[]): Promise<void> {
    await this.save(STORAGE_KEYS.CUSTOM_EXERCISES, exercises);
  }

  async loadCustomExercises(): Promise<any[] | null> {
    return await this.load<any[]>(STORAGE_KEYS.CUSTOM_EXERCISES);
  }

  // Nutrition-specific methods
  async saveNutritionData(nutrition: any): Promise<void> {
    await this.save(STORAGE_KEYS.NUTRITION_DATA, nutrition);
  }

  async loadNutritionData(): Promise<any | null> {
    return await this.load<any>(STORAGE_KEYS.NUTRITION_DATA);
  }

  // User profile methods
  async saveUserProfile(profile: any): Promise<void> {
    await this.save(STORAGE_KEYS.USER_PROFILE, profile);
  }

  async loadUserProfile(): Promise<any | null> {
    return await this.load<any>(STORAGE_KEYS.USER_PROFILE);
  }

  // Points data methods
  async savePointsData(points: any): Promise<void> {
    await this.save(STORAGE_KEYS.POINTS_DATA, points);
  }

  async loadPointsData(): Promise<any | null> {
    return await this.load<any>(STORAGE_KEYS.POINTS_DATA);
  }

  async clearPointsData(): Promise<void> {
    await this.remove(STORAGE_KEYS.POINTS_DATA);
  }

  // Pending sync management
  async addPendingSync(sync: Omit<PendingSync, 'id' | 'timestamp'>): Promise<void> {
    try {
      const pendingSyncs = await this.loadPendingSyncs() || [];
      const newSync: PendingSync = {
        ...sync,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };
      
      pendingSyncs.push(newSync);
      await this.save(STORAGE_KEYS.PENDING_SYNCS, pendingSyncs);
      console.log(`📤 Added pending sync: ${sync.type}`);
    } catch (error) {
      console.error('❌ Failed to add pending sync:', error);
    }
  }

  async loadPendingSyncs(): Promise<PendingSync[] | null> {
    return await this.load<PendingSync[]>(STORAGE_KEYS.PENDING_SYNCS);
  }

  async removePendingSync(syncId: string): Promise<void> {
    try {
      const pendingSyncs = await this.loadPendingSyncs() || [];
      const filteredSyncs = pendingSyncs.filter(sync => sync.id !== syncId);
      await this.save(STORAGE_KEYS.PENDING_SYNCS, filteredSyncs);
      console.log(`✅ Removed pending sync: ${syncId}`);
    } catch (error) {
      console.error('❌ Failed to remove pending sync:', error);
    }
  }

  async clearPendingSyncs(): Promise<void> {
    await this.remove(STORAGE_KEYS.PENDING_SYNCS);
  }

  // Auto-save functionality
  async autoSave(type: 'workout' | 'nutrition' | 'profile' | 'points' | 'onboarding', data: any): Promise<void> {
    console.log(`🔄 Auto-saving ${type} data...`);
    
    switch (type) {
      case 'workout':
        await this.saveCurrentWorkout(data);
        break;
      case 'nutrition':
        await this.saveNutritionData(data);
        break;
      case 'profile':
        await this.saveUserProfile(data);
        break;
      case 'points':
        await this.savePointsData(data);
        break;
      case 'onboarding':
        await this.saveOnboardingProgress(data);
        break;
    }
  }

  async saveOnboardingProgress(progress: any): Promise<void> {
    await this.save(STORAGE_KEYS.ONBOARDING_PROGRESS, progress);
  }

  async loadOnboardingProgress(): Promise<any | null> {
    return await this.load<any>(STORAGE_KEYS.ONBOARDING_PROGRESS);
  }

  async clearOnboardingProgress(): Promise<void> {
    await this.remove(STORAGE_KEYS.ONBOARDING_PROGRESS);
  }

  // Clear all data (for logout)
  async clearAllData(): Promise<void> {
    console.log('🗑️ Clearing all local data...');
    const keys = Object.values(STORAGE_KEYS);
    
    for (const key of keys) {
      await this.remove(key);
    }
  }

  // Data restoration on app start
  // Favorites methods
  async saveFavorites(favorites: any[]): Promise<void> {
    return this.save(STORAGE_KEYS.FAVORITES, favorites);
  }

  async loadFavorites(): Promise<any[] | null> {
    return this.load<any[]>(STORAGE_KEYS.FAVORITES);
  }

  // Community data methods
  async saveCommunityData(communityData: any): Promise<void> {
    await this.save(STORAGE_KEYS.COMMUNITY_DATA, communityData);
  }

  async loadCommunityData(): Promise<any | null> {
    return this.load<any>(STORAGE_KEYS.COMMUNITY_DATA);
  }

  async clearCommunityData(): Promise<void> {
    await this.remove(STORAGE_KEYS.COMMUNITY_DATA);
  }

  async restoreAllData(): Promise<{
    workoutHistory: any[] | null;
    currentWorkout: any | null;
    customExercises: any[] | null;
    nutritionData: any | null;
    userProfile: any | null;
    pointsData: any | null;
    pendingSyncs: PendingSync[] | null;
    favorites: any[] | null;
    communityData: any | null;
  }> {
    console.log('📱 Restoring all data from local storage...');
    
    const [
      workoutHistory,
      currentWorkout,
      customExercises,
      nutritionData,
      userProfile,
      pointsData,
      pendingSyncs,
      favorites,
      communityData
    ] = await Promise.all([
      this.loadWorkoutHistory(),
      this.loadCurrentWorkout(),
      this.loadCustomExercises(),
      this.loadNutritionData(),
      this.loadUserProfile(),
      this.loadPointsData(),
      this.loadPendingSyncs(),
      this.loadFavorites(),
      this.loadCommunityData()
    ]);

    return {
      workoutHistory,
      currentWorkout,
      customExercises,
      nutritionData,
      userProfile,
      pointsData,
      pendingSyncs,
      favorites,
      communityData
    };
  }
}

export const persistenceService = new PersistenceService();



