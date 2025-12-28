import { create } from 'zustand';
import { pointsService, featureService } from '../services/firestoreService';
import { persistenceService } from '@/services/persistenceService';

export interface PointEvent {
  id: string;
  type: 'workout' | 'cardio' | 'complete_meal' | 'streak' | 'video' | 'purchase';
  amount: number;
  createdAt: Date;
  description: string;
  referenceId?: string; // Reference to workoutId or foodId for tracking/deletion
}

export interface FeatureUnlock {
  featureKey: string;
  pointsRequired: number;
  unlockedAt?: Date;
  unlockedVia: 'gp' | 'purchase' | 'premium';
}

export interface PointsStore {
  totalPoints: number;
  pointEvents: PointEvent[];
  featureUnlocks: FeatureUnlock[];
  
  // Actions
  addPoints: (event: Omit<PointEvent, 'id' | 'createdAt'>, uid: string) => Promise<string | null>; // Returns point event ID
  deductPoints: (referenceId: string, uid: string) => Promise<void>; // Deduct points by referenceId
  spendPoints: (amount: number, reason: string, uid: string) => Promise<boolean>;
  spendPointsToUnlock: (featureKey: string, uid: string) => Promise<boolean>;
  unlockFeature: (featureKey: string, via: 'gp' | 'purchase' | 'premium', uid: string) => Promise<void>;
  isFeatureUnlocked: (featureKey: string) => boolean;
  getDailyEarned: (type: 'workout' | 'cardio' | 'complete_meal' | 'video') => number;
  canEarnToday: (type: 'workout' | 'cardio' | 'complete_meal' | 'video') => boolean;
  resetPoints: () => void;
  
  // Firebase integration
  loadUserPointsFromFirebase: (uid: string) => Promise<void>;
  loadUserFeaturesFromFirebase: (uid: string) => Promise<void>;
  
  // Local storage integration
  restoreFromLocalStorage: () => Promise<void>;
}

// Feature catalog based on requirements
// Note: AI features are now tier-based (Pro/Elite), not Volt-based
const FEATURE_CATALOG: Record<string, number> = {
  'nutrition_meal_ideas': 1200,
  'workout_ideas': 1500,
  'advanced_insights': 2000,
  'community_challenges': 3000,
  'ai_coach': 4000,
  // AI Features (require Pro/Elite tier, shown for informational purposes)
  'ai_meal_plans': 0, // Pro/Elite tier required
  'ai_macro_estimation': 0, // Pro/Elite tier required
  'ai_photo_detection': 0, // Pro/Elite tier required
  'ai_workout_plans': 0, // Pro/Elite tier required
  'ai_exercise_suggestions': 0, // Pro/Elite tier required
  'ai_progress_insights': 0, // Pro/Elite tier required
  'ai_goal_recalibration': 0, // Pro/Elite tier required
};

const DAILY_CAPS = {
  workout: 300,
  cardio: 100,
  complete_meal: Infinity, // No cap for meal logging
  video: 40,
};

export const usePointsStore = create<PointsStore>((set, get) => ({
  totalPoints: 0,
  pointEvents: [],
  featureUnlocks: [],
  
  addPoints: async (event, uid) => {
    try {
      if (!uid) {
        console.log('No UID provided, skipping points save');
        return;
      }

      console.log('🎯 Adding points for user:', uid);
      console.log('📋 Points event:', {
        type: event.type,
        amount: event.amount,
        description: event.description,
        referenceId: event.referenceId
      });

      // Temporary guard: skip meal logging events that should no longer award points
      if (event.type === 'complete_meal' && event.description?.toLowerCase().includes('logged a meal')) {
        console.log('⚠️ Skipping legacy meal log point event');
        return null;
      }

      // Save to Firebase and get the event ID
      // Map referenceId to workoutId or foodId based on event type
      const eventData: any = {
        uid,
        type: event.type,
        amount: event.amount,
        description: event.description,
      };
      
      // Store referenceId as workoutId for workouts/cardio, or foodId for meals
      if (event.referenceId) {
        if (event.type === 'workout' || event.type === 'cardio') {
          eventData.workoutId = event.referenceId;
        } else if (event.type === 'complete_meal') {
          eventData.foodId = event.referenceId; // Store food ID for individual food items
        }
      }
      
      const eventId = await pointsService.addPointEvent(eventData);

      // Check if this event already exists in local state (prevent duplicates)
      const { pointEvents: existingEvents } = get();
      const eventAlreadyExists = existingEvents.some(e => 
        e.referenceId === event.referenceId && 
        e.type === event.type && 
        Math.abs(e.createdAt.getTime() - Date.now()) < 5000 // Within 5 seconds
      );

      if (eventAlreadyExists) {
        console.log('⚠️ Duplicate point event detected, skipping local state update');
        return eventId;
      }

      // Update local state with the Firebase event ID
      const newEvent: PointEvent = {
        ...event,
        id: eventId,
        createdAt: new Date(),
      };
      
      set((state) => {
        // Double-check for duplicates before adding
        const duplicateExists = state.pointEvents.some(e => e.id === eventId || 
          (e.referenceId === event.referenceId && e.type === event.type && 
           Math.abs(e.createdAt.getTime() - Date.now()) < 5000)
        );
        
        if (duplicateExists) {
          console.log('⚠️ Duplicate detected in set, skipping');
          return state;
        }

        const updatedState = {
          totalPoints: state.totalPoints + event.amount,
          pointEvents: [...state.pointEvents, newEvent],
          featureUnlocks: state.featureUnlocks,
        };

        // Auto-save points data to local storage
        persistenceService.autoSave('points', updatedState);
        
        return updatedState;
      });

      console.log('✅ Points added and saved to device storage');

      return eventId;
    } catch (error) {
      console.error('❌ Error adding points:', error);
      console.error('❌ Error details:', error.message);
      return null;
    }
  },
  
  deductPoints: async (referenceId: string, uid: string) => {
    try {
      if (!uid || !referenceId) {
        console.log('No UID or referenceId provided for points deduction');
        return;
      }

      console.log('🗑️ Deducting points for reference:', referenceId);

      // First check local state for the event
      // Check both referenceId match and also check by workoutId/foodId fields
      const { pointEvents } = get();
      let eventToRemove = pointEvents.find(e => 
        e.referenceId === referenceId ||
        (e as any).workoutId === referenceId ||
        (e as any).foodId === referenceId
      );

      // If not found locally, check Firebase
      if (!eventToRemove) {
        const { pointsService } = await import('@/services/firestoreService');
        const allEvents = await pointsService.getUserPointEvents(uid, 1000); // Get more events to find the one we need
        const firebaseEvent = allEvents.find((e: any) => 
          (e.workoutId === referenceId || e.foodId === referenceId || e.referenceId === referenceId)
        );
        
        console.log('🔍 Searching for point event with referenceId:', referenceId);
        console.log('📊 Total events in Firebase:', allEvents.length);
        console.log('📊 Events with matching workoutId/foodId/referenceId:', allEvents.filter((e: any) => 
          (e.workoutId === referenceId || e.foodId === referenceId || e.referenceId === referenceId)
        ).length);

        if (firebaseEvent) {
          // Convert Firebase event to local format
          eventToRemove = {
            id: firebaseEvent.id,
            type: firebaseEvent.type as any,
            amount: firebaseEvent.amount,
            createdAt: firebaseEvent.createdAt,
            description: firebaseEvent.description,
            referenceId: firebaseEvent.workoutId || firebaseEvent.foodId || firebaseEvent.referenceId,
          };
        }
      }

      if (!eventToRemove) {
        console.log('⚠️ No point event found for reference:', referenceId);
        return;
      }

      // Delete the point event from Firebase
      const { deleteDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      const { COLLECTIONS } = await import('@/types/firestore');
      try {
        await deleteDoc(doc(db, COLLECTIONS.POINT_EVENTS, eventToRemove.id));
      } catch (deleteError) {
        console.error('❌ Error deleting point event from Firebase:', deleteError);
        // Continue with local state update even if Firebase delete fails
      }

      // Update local state
      set((state) => ({
        totalPoints: Math.max(0, state.totalPoints - eventToRemove.amount),
        pointEvents: state.pointEvents.filter(e => e.id !== eventToRemove.id && e.referenceId !== referenceId),
      }));

      // Auto-save points data to local storage
      const { pointEvents: updatedEvents, totalPoints: updatedTotal } = get();
      persistenceService.autoSave('points', {
        totalPoints: updatedTotal,
        pointEvents: updatedEvents,
        featureUnlocks: get().featureUnlocks,
      });

      console.log('✅ Points deducted successfully');
    } catch (error) {
      console.error('❌ Error deducting points:', error);
      console.error('❌ Error details:', error.message);
    }
  },
  
  spendPoints: async (amount, reason, uid) => {
    try {
      const { totalPoints } = get();
      if (totalPoints < amount) {
        return false;
      }

      console.log('💸 Spending points for user:', uid);
      console.log('📋 Spend details:', { amount, reason });

      // Save to Firebase first
      await pointsService.addPointEvent({
        uid,
        type: 'purchase',
        amount: -amount,
        description: reason,
      });

      // Update local state
      const spendEvent: PointEvent = {
        id: Date.now().toString(),
        type: 'purchase',
        amount: -amount,
        createdAt: new Date(),
        description: reason,
      };
      
      set((state) => ({
        totalPoints: state.totalPoints - amount,
        pointEvents: [...state.pointEvents, spendEvent],
      }));

      console.log('✅ Points spent successfully');
      return true;
    } catch (error) {
      console.error('❌ Error spending points:', error);
      console.error('❌ Error details:', error.message);
      return false;
    }
  },
  
  spendPointsToUnlock: async (featureKey, uid) => {
    try {
      const { totalPoints, isFeatureUnlocked } = get();
      const cost = FEATURE_CATALOG[featureKey];
      
      if (!cost || isFeatureUnlocked(featureKey) || totalPoints < cost) {
        return false;
      }
      
      // Spend points and unlock feature
      const success = await get().spendPoints(cost, `Unlocked ${featureKey}`, uid);
      if (success) {
        await get().unlockFeature(featureKey, 'gp', uid);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error unlocking feature:', error);
      console.error('❌ Error details:', error.message);
      return false;
    }
  },
  
  unlockFeature: async (featureKey, via, uid) => {
    try {
      if (!uid) {
        console.log('No UID provided, skipping feature unlock save');
        return;
      }

      const pointsRequired = FEATURE_CATALOG[featureKey] || 0;
      console.log('🔓 Unlocking feature for user:', uid);
      console.log('📋 Feature details:', { featureKey, via, pointsRequired });
      
      // For Basic tier users: MUST have sufficient Volts to unlock features
      // Skip this check for Pro/Elite tiers and premium unlocks
      if (via === 'gp' && pointsRequired > 0) {
        try {
          // Dynamically import subscriptionStore to avoid circular dependency
          const subscriptionStore = require('./subscriptionStore');
          const { tier } = subscriptionStore.useSubscriptionStore.getState();
          
          if (tier === 'basic') {
            const { totalPoints } = get();
            if (totalPoints < pointsRequired) {
              console.error(`❌ Basic tier user cannot unlock ${featureKey}: Insufficient Volts. Required: ${pointsRequired}, Have: ${totalPoints}`);
              throw new Error(`Insufficient Volts. You need ${pointsRequired} V to unlock this feature, but you only have ${totalPoints} V.`);
            }
            
            // Deduct Volts for Basic tier users
            console.log(`💸 Basic tier: Deducting ${pointsRequired} V for feature unlock`);
            const spent = await get().spendPoints(pointsRequired, `Unlocked ${featureKey}`, uid);
            if (!spent) {
              throw new Error('Failed to deduct Volts for feature unlock');
            }
          }
        } catch (subscriptionError) {
          console.error('❌ Error checking subscription tier or spending points:', subscriptionError);
          throw subscriptionError;
        }
      }
      
      // IMPORTANT: For Pro/Elite tiers or premium unlocks, points are NOT deducted here.

      // Save to Firebase
      await featureService.unlockFeature({
        uid,
        featureKey,
        pointsRequired,
        unlockedVia: via,
      });

      // Update local state - add unlock
      const unlock: FeatureUnlock = {
        featureKey,
        pointsRequired,
        unlockedAt: new Date(),
        unlockedVia: via,
      };
      
      set((state) => {
        const updatedState = {
          ...state,
          featureUnlocks: [...state.featureUnlocks, unlock],
        };
        
        // Auto-save feature unlocks to local storage
        persistenceService.autoSave('points', updatedState);
        
        return updatedState;
      });

      console.log('✅ Feature unlocked successfully and saved to local storage');
    } catch (error) {
      console.error('❌ Error unlocking feature:', error);
      console.error('❌ Error details:', error.message);
      throw error; // Re-throw so the UI can show the error
    }
  },
  
  isFeatureUnlocked: (featureKey) => {
    const { featureUnlocks } = get();
    
    // Auto-unlock features for coaches and players: custom meal ideas, workout ideas, advanced AI insights
    const autoUnlockedFeatures = ['nutrition_meal_ideas', 'workout_ideas', 'advanced_insights'];
    
    if (autoUnlockedFeatures.includes(featureKey)) {
      // Check if user is a coach or player from userStore
      // Import dynamically to avoid circular dependency
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useUserStore } = require('./userStore');
        const profile = useUserStore.getState()?.profile;
        const isCoachOrPlayer = profile?.userType === 'institution';
        
        if (isCoachOrPlayer) {
          // Auto-unlock these features for coaches and players
          console.log('✅ Auto-unlocking feature for coach/player:', featureKey);
          return true;
        }
      } catch (error) {
        // If userStore is not available, fall through to normal check
        console.log('Could not check user profile for auto-unlock:', error);
      }
    }
    
    return featureUnlocks.some(unlock => unlock.featureKey === featureKey);
  },
  
  getDailyEarned: (type) => {
    const { pointEvents } = get();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return pointEvents
      .filter(event => 
        event.type === type && 
        event.amount > 0 && 
        event.createdAt >= today
      )
      .reduce((sum, event) => sum + event.amount, 0);
  },
  
  canEarnToday: (type) => {
    const { getDailyEarned } = get();
    const earned = getDailyEarned(type);
    return earned < DAILY_CAPS[type];
  },
  
  resetPoints: () => {
    console.log('🔄 Resetting all points data');
    set({
      totalPoints: 0,
      pointEvents: [],
      featureUnlocks: [],
    });
    // Also clear from local storage
    persistenceService.clearPointsData().catch(error => {
      console.error('❌ Failed to clear points data from storage:', error);
    });
  },

  // Firebase integration methods
  loadUserPointsFromFirebase: async (uid: string) => {
    try {
      console.log('🎯 Loading points from Firebase for user:', uid);
      
      if (!uid) {
        console.error('❌ No UID provided for points loading');
        return;
      }

      const pointEvents = await pointsService.getUserPointEvents(uid);
      console.log('📊 Raw Firebase point events received:', pointEvents.length);

      if (!pointEvents || pointEvents.length === 0) {
        console.log('ℹ️ No point events found in Firebase for this user');
        set({ pointEvents: [], totalPoints: 0 });
        return;
      }

      // Convert to local format and calculate total
      // Map workoutId/foodId from Firebase to referenceId for local tracking
      // Deduplicate events by ID and referenceId to prevent double counting
      const seenEventIds = new Set<string>();
      const seenReferenceIds = new Set<string>();
      
      const events: PointEvent[] = pointEvents
        .map((event: any) => ({
        id: event.id,
        type: event.type,
        amount: event.amount,
        createdAt: event.createdAt,
        description: event.description,
          referenceId: event.workoutId || event.foodId || event.referenceId, // Map Firebase fields to referenceId
        }))
        .filter((event) => {
          // Filter out duplicate events - same ID or same referenceId + type + same day
          if (seenEventIds.has(event.id)) {
            console.log('⚠️ Duplicate event ID found in Firebase:', event.id);
            return false;
          }
          seenEventIds.add(event.id);
          
          // Also check for duplicate referenceId + type combinations (same workout/food)
          if (event.referenceId) {
            const refKey = `${event.referenceId}-${event.type}`;
            if (seenReferenceIds.has(refKey)) {
              console.log('⚠️ Duplicate referenceId + type found in Firebase:', refKey);
              return false;
            }
            seenReferenceIds.add(refKey);
          }
          
          return true;
        });

      const totalPoints = events.reduce((sum, event) => sum + event.amount, 0);

      console.log('📊 Loaded points from Firebase:', {
        totalEvents: pointEvents.length,
        uniqueEvents: events.length,
        duplicatesRemoved: pointEvents.length - events.length,
        totalPoints
      });

      set({ pointEvents: events, totalPoints });
      console.log('✅ Successfully loaded points from Firebase!');
      console.log('📋 Points summary:', {
        totalPoints,
        eventCount: events.length,
        recentEvents: events.slice(0, 3).map(e => ({ type: e.type, amount: e.amount }))
      });

    } catch (error) {
      console.error('❌ Error loading points from Firebase:', error);
      console.error('❌ Error details:', error.message);
    }
  },

  loadUserFeaturesFromFirebase: async (uid: string) => {
    try {
      console.log('🔓 Loading features from Firebase for user:', uid);
      
      if (!uid) {
        console.error('❌ No UID provided for features loading');
        return;
      }

      const featureUnlocks = await featureService.getUserUnlockedFeatures(uid);
      console.log('📊 Raw Firebase feature unlocks received:', featureUnlocks.length);

      // Convert to local format
      const unlocks: FeatureUnlock[] = (featureUnlocks || []).map(unlock => ({
        featureKey: unlock.featureKey,
        pointsRequired: unlock.pointsRequired,
        unlockedAt: unlock.unlockedAt,
        unlockedVia: unlock.unlockedVia,
      }));

      // Auto-unlock features for coaches and players
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useUserStore } = require('./userStore');
        const profile = useUserStore.getState()?.profile;
        const isCoachOrPlayer = profile?.userType === 'institution';
        
        if (isCoachOrPlayer) {
          const autoUnlockedFeatures = ['nutrition_meal_ideas', 'workout_ideas', 'advanced_insights'];
          
          // Add auto-unlocked features if they don't already exist
          autoUnlockedFeatures.forEach(featureKey => {
            const alreadyUnlocked = unlocks.some(u => u.featureKey === featureKey);
            if (!alreadyUnlocked) {
              unlocks.push({
                featureKey,
                pointsRequired: FEATURE_CATALOG[featureKey] || 0,
                unlockedAt: new Date(),
                unlockedVia: 'premium', // Mark as premium/auto-unlocked for coaches/players
              });
              console.log('✅ Auto-added feature unlock for coach/player:', featureKey);
              
              // Also save to Firebase for persistence
              featureService.unlockFeature({
                uid,
                featureKey,
                pointsRequired: FEATURE_CATALOG[featureKey] || 0,
                unlockedVia: 'premium',
              })
                .catch(error => {
                  console.error('❌ Error saving auto-unlock to Firebase:', error);
                });
            }
          });
        }
      } catch (error) {
        console.log('Could not check user profile for auto-unlock during load:', error);
      }

      set({ featureUnlocks: unlocks });
      console.log('✅ Successfully loaded features from Firebase!');
      console.log('📋 Features summary:', unlocks.map(u => ({
        feature: u.featureKey,
        unlockedVia: u.unlockedVia,
        unlockedAt: u.unlockedAt
      })));

    } catch (error) {
      console.error('❌ Error loading features from Firebase:', error);
      console.error('❌ Error details:', error.message);
    }
  },

  // Restore points data from local storage
  restoreFromLocalStorage: async () => {
    try {
      console.log('📱 Restoring points data from local storage...');
      const pointsData = await persistenceService.loadPointsData();

      if (pointsData) {
        console.log(`📱 Restored points data: ${pointsData.totalPoints} points, ${pointsData.pointEvents?.length || 0} events`);
        set({
          totalPoints: pointsData.totalPoints || 0,
          pointEvents: pointsData.pointEvents || [],
          featureUnlocks: pointsData.featureUnlocks || [],
        });
      }

      console.log('📱 Points data restored from local storage');
      
    } catch (error) {
      console.error('❌ Failed to restore points data:', error);
    }
  },
}));

// Export feature catalog for use in components
export { FEATURE_CATALOG };

