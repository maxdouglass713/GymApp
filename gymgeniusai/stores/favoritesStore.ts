import { create } from 'zustand';
import { persistenceService } from '@/services/persistenceService';

export interface FavoriteWorkout {
  id: string;
  name: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: Array<{
      id: string;
      reps: number | null;
      weight: number | null;
      style: 'slow' | 'normal' | 'fast';
      notes?: string;
    }>;
    notes?: string;
    type?: 'strength' | 'cardio';
  }>;
  muscleGroups: string[];
  lastUsed?: Date;
  lastUsedSetData?: {
    [exerciseId: string]: {
      [setId: string]: {
        reps: number | null;
        weight: number | null;
      };
    };
  };
  createdAt: Date;
}

export interface FavoritesStore {
  favorites: FavoriteWorkout[];
  addFavorite: (workout: Omit<FavoriteWorkout, 'id' | 'createdAt'>) => Promise<void>;
  removeFavorite: (favoriteId: string) => Promise<void>;
  updateFavorite: (favoriteId: string, updates: Partial<FavoriteWorkout>) => Promise<void>;
  updateLastUsed: (favoriteId: string, setData: any) => Promise<void>;
  isFavorite: (workoutId: string) => boolean;
  getFavoriteById: (favoriteId: string) => FavoriteWorkout | null;
  restoreFromLocalStorage: () => Promise<void>;
  clearAllFavoritesData: () => void;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favorites: [],

  addFavorite: async (workoutData) => {
    const newFavorite: FavoriteWorkout = {
      ...workoutData,
      id: Date.now().toString(),
      createdAt: new Date(),
    };

    set((state) => ({
      favorites: [...state.favorites, newFavorite],
    }));

    // Persist to local storage
    const { favorites } = get();
    await persistenceService.saveFavorites(favorites);
  },

  removeFavorite: async (favoriteId: string) => {
    set((state) => ({
      favorites: state.favorites.filter(fav => fav.id !== favoriteId),
    }));

    // Persist to local storage
    const { favorites } = get();
    await persistenceService.saveFavorites(favorites);
  },

  updateFavorite: async (favoriteId: string, updates: Partial<FavoriteWorkout>) => {
    set((state) => ({
      favorites: state.favorites.map(fav => 
        fav.id === favoriteId ? { ...fav, ...updates } : fav
      ),
    }));

    // Persist to local storage
    const { favorites } = get();
    await persistenceService.saveFavorites(favorites);
  },

  updateLastUsed: async (favoriteId: string, setData: any) => {
    const favorite = get().favorites.find(fav => fav.id === favoriteId);
    if (!favorite) return;

    // Extract last used set data from the workout
    const lastUsedSetData: any = {};
    setData.exercises?.forEach((exercise: any) => {
      lastUsedSetData[exercise.id] = {};
      exercise.sets?.forEach((set: any) => {
        lastUsedSetData[exercise.id][set.id] = {
          reps: set.reps,
          weight: set.weight,
        };
      });
    });

    set((state) => ({
      favorites: state.favorites.map(fav => 
        fav.id === favoriteId 
          ? { 
              ...fav, 
              lastUsed: new Date(),
              lastUsedSetData 
            } 
          : fav
      ),
    }));

    // Persist to local storage
    const { favorites } = get();
    await persistenceService.saveFavorites(favorites);
  },

  isFavorite: (workoutId: string) => {
    const { favorites } = get();
    return favorites.some(fav => fav.id === workoutId);
  },

  getFavoriteById: (favoriteId: string) => {
    const { favorites } = get();
    return favorites.find(fav => fav.id === favoriteId) || null;
  },

  restoreFromLocalStorage: async () => {
    try {
      console.log('📱 Restoring favorites from local storage...');
      const favorites = await persistenceService.loadFavorites();
      
      if (favorites) {
        console.log(`📱 Restored ${favorites.length} favorites from local storage`);
        set({ favorites });
      }

      console.log('📱 Favorites restored from local storage');
    } catch (error) {
      console.error('❌ Failed to restore favorites:', error);
    }
  },

  clearAllFavoritesData: () => {
    console.log('🧹 Clearing all favorites data from store and local storage');
    set({ favorites: [] });
    // Clear from local storage
    persistenceService.saveFavorites([]);
    console.log('✅ All favorites data cleared');
  },
}));
