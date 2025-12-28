import { create } from 'zustand';
import { getLocalDateKey } from './nutritionStore';
import { userService } from '@/services/firestoreService';

export interface DailyWeight {
  date: string; // YYYY-MM-DD format
  weight: number;
  loggedAt: Date;
}

export interface WeightStore {
  dailyWeights: DailyWeight[];
  
  // Actions
  logWeight: (weight: number, date?: Date) => Promise<void>;
  getWeightForDate: (date: Date) => DailyWeight | null;
  hasLoggedWeightToday: () => boolean;
  loadWeightsFromFirebase: (uid: string) => Promise<void>;
  syncWeightsToFirebase: (uid: string) => Promise<void>;
}

export const useWeightStore = create<WeightStore>((set, get) => ({
  dailyWeights: [],
  
  logWeight: async (weight: number, date?: Date) => {
    const targetDate = date || new Date();
    const dateKey = getLocalDateKey(targetDate);
    
    const newWeight: DailyWeight = {
      date: dateKey,
      weight,
      loggedAt: new Date(),
    };
    
    console.log('⚖️ Store - logWeight called with:', { weight, dateKey, newWeight });
    
    // Update local state - replace if exists for same date
    set((state) => {
      const filtered = state.dailyWeights.filter((w) => w.date !== dateKey);
      const updated = [...filtered, newWeight];
      console.log('⚖️ Store - Updating dailyWeights. Old length:', state.dailyWeights.length, 'New length:', updated.length);
      console.log('⚖️ Store - Updated weights:', updated);
      return { dailyWeights: updated };
    });
    
    // Verify the update
    const afterUpdate = get().dailyWeights;
    console.log('⚖️ Store - After update, dailyWeights length:', afterUpdate.length);
    console.log('⚖️ Store - After update, dailyWeights:', afterUpdate);
  },
  
  getWeightForDate: (date: Date) => {
    const dateKey = getLocalDateKey(date);
    return get().dailyWeights.find((w) => w.date === dateKey) || null;
  },
  
  hasLoggedWeightToday: () => {
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    return get().dailyWeights.some((w) => w.date === todayKey);
  },
  
  loadWeightsFromFirebase: async (uid: string) => {
    try {
      if (!uid) {
        console.warn('⚠️ No UID provided for loading weights');
        return;
      }
      
      // Get current local weights before loading
      const currentLocalWeights = get().dailyWeights;
      console.log('⚖️ Store - loadWeightsFromFirebase: Current local weights length:', currentLocalWeights.length);
      
      const userDoc = await userService.getUser(uid);
      if (!userDoc) {
        console.warn('⚠️ User document not found for UID:', uid);
        // Don't clear if we have local weights
        if (currentLocalWeights.length === 0) {
          set({ dailyWeights: [] });
        }
        return;
      }
      
      if (userDoc.dailyWeights && Array.isArray(userDoc.dailyWeights)) {
        // Convert Firestore timestamps to Date objects
        const weights: DailyWeight[] = userDoc.dailyWeights
          .map((w: any) => {
            try {
              if (!w || typeof w !== 'object') {
                console.warn('⚠️ Invalid weight entry:', w);
                return null;
              }
              
              let loggedAtDate: Date;
              if (w.loggedAt?.toDate && typeof w.loggedAt.toDate === 'function') {
                // Firestore Timestamp
                loggedAtDate = w.loggedAt.toDate();
              } else if (w.loggedAt instanceof Date) {
                // Already a Date object
                loggedAtDate = w.loggedAt;
              } else if (typeof w.loggedAt === 'string') {
                // String date
                loggedAtDate = new Date(w.loggedAt);
              } else if (w.loggedAt && typeof w.loggedAt === 'object') {
                // Try to convert if it has seconds/nanoseconds (Firestore Timestamp structure)
                try {
                  if ((w.loggedAt as any).seconds) {
                    loggedAtDate = new Date((w.loggedAt as any).seconds * 1000);
                  } else {
                    loggedAtDate = new Date();
                  }
                } catch {
                  loggedAtDate = new Date();
                }
              } else {
                // Default to current date if missing
                loggedAtDate = new Date();
              }
              
              // Validate the date
              if (isNaN(loggedAtDate.getTime())) {
                console.warn('⚠️ Invalid date for weight entry:', w);
                loggedAtDate = new Date();
              }
              
              const weightValue = typeof w.weight === 'number' 
                ? w.weight 
                : parseFloat(String(w.weight || 0));
              
              if (isNaN(weightValue) || weightValue <= 0) {
                console.warn('⚠️ Invalid weight value:', w.weight);
                return null;
              }
              
              return {
                date: w.date || getLocalDateKey(loggedAtDate),
                weight: weightValue,
                loggedAt: loggedAtDate,
              };
            } catch (error) {
              console.error('❌ Error processing weight entry:', error, w);
              return null;
            }
          })
          .filter((w): w is DailyWeight => w !== null);
        
        // Merge with local weights - local takes precedence for same date
        const mergedWeights = [...currentLocalWeights];
        weights.forEach((firebaseWeight) => {
          const existingIndex = mergedWeights.findIndex(w => w.date === firebaseWeight.date);
          if (existingIndex >= 0) {
            // Local weight exists for this date, keep it (it's more recent)
            console.log('⚖️ Store - Keeping local weight for date:', firebaseWeight.date);
          } else {
            // No local weight for this date, add Firebase weight
            mergedWeights.push(firebaseWeight);
          }
        });
        
        // Sort by date
        mergedWeights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        set({ dailyWeights: mergedWeights });
        console.log('✅ Loaded weights from Firebase:', weights.length);
        console.log('✅ Merged weights total:', mergedWeights.length);
        console.log('✅ Merged weights data:', mergedWeights);
      } else {
        // No weights in Firebase, but keep local weights if they exist
        if (currentLocalWeights.length === 0) {
          set({ dailyWeights: [] });
          console.log('📭 No weights found in Firebase, initializing empty array');
        } else {
          console.log('📭 No weights in Firebase, but keeping local weights:', currentLocalWeights.length);
        }
      }
    } catch (error) {
      console.error('❌ Error loading weights from Firebase:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // Set empty array on error to prevent crashes
      set({ dailyWeights: [] });
    }
  },
  
  syncWeightsToFirebase: async (uid: string) => {
    try {
      const weights = get().dailyWeights;
      if (!weights || weights.length === 0) {
        console.log('📭 No weights to sync');
        return;
      }
      
      // Ensure all weights have valid data
      const validWeights = weights.filter(w => 
        w && 
        typeof w.date === 'string' && 
        typeof w.weight === 'number' && 
        !isNaN(w.weight) &&
        w.loggedAt instanceof Date &&
        !isNaN(w.loggedAt.getTime())
      );
      
      if (validWeights.length === 0) {
        console.warn('⚠️ No valid weights to sync');
        return;
      }
      
      await userService.updateUser(uid, {
        dailyWeights: validWeights,
      });
      console.log('✅ Synced weights to Firebase:', validWeights.length);
    } catch (error) {
      console.error('❌ Error syncing weights to Firebase:', error);
      throw error; // Re-throw so component can handle it
    }
  },
}));

