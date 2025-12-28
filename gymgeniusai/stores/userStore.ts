import { create } from 'zustand';
import { OnboardingData } from './onboardingStore';
import { UserDocument } from '../types/firestore';
import { userService } from '../services/firestoreService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserStore {
  // Local state
  profile: OnboardingData | null;
  isOnboarded: boolean;
  
  // Firestore state
  userDoc: UserDocument | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setProfile: (profile: OnboardingData) => Promise<void>;
  clearProfile: () => void;
  loadProfileFromStorage: () => Promise<void>;
  
  // Firestore actions
  setUserDoc: (userDoc: UserDocument | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  fetchUserDoc: (uid: string) => Promise<void>;
  updateUserDoc: (uid: string, updates: Partial<UserDocument>) => Promise<void>;
  syncProfileToFirestore: (uid: string, profile: OnboardingData) => Promise<void>;
  loadProfileFromFirestore: (userDoc: UserDocument) => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  // Local state
  profile: null,
  isOnboarded: false,
  
  // Firestore state
  userDoc: null,
  loading: false,
  error: null,
  
  // Local actions
  setProfile: async (profile) => {
    try {
      // Save to AsyncStorage for local profile persistence
      await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
      console.log('💾 Profile saved to local storage:', profile);
      set({ profile, isOnboarded: true });
    } catch (error) {
      console.error('❌ Error saving profile to storage:', error);
      set({ profile, isOnboarded: true }); // Still set in memory even if storage fails
    }
  },
    
  clearProfile: () => {
    console.log('🧹 Clearing user profile from store and local storage');
    set({ profile: null, isOnboarded: false, userDoc: null });
    // Clear from local storage
    AsyncStorage.removeItem('user_profile').catch(error => {
      console.error('❌ Failed to clear profile from storage:', error);
    });
    console.log('✅ User profile cleared');
  },
    
  loadProfileFromStorage: async () => {
    try {
      console.log('🔄 Loading profile from local storage...');
      const storedProfile = await AsyncStorage.getItem('user_profile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        console.log('✅ Profile loaded from storage:', profile);
        set({ profile, isOnboarded: true });
      } else {
        console.log('📭 No profile found in storage');
      }
    } catch (error) {
      console.error('❌ Error loading profile from storage:', error);
    }
  },
  
  // Firestore state setters
  setUserDoc: (userDoc) => set({ userDoc }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  // Async Firestore actions
  fetchUserDoc: async (uid: string) => {
    try {
      console.log('UserStore: Fetching user doc for uid:', uid);
      set({ loading: true, error: null });
      const userDoc = await userService.getUser(uid);
      console.log('UserStore: User doc fetched:', userDoc);
      
      if (userDoc) {
        // Load profile data from Firestore document
        get().loadProfileFromFirestore(userDoc);
        console.log('UserStore: Profile loaded from Firestore document');
      }
      
      set({ userDoc, loading: false });
    } catch (error: any) {
      console.error('UserStore: Error fetching user doc:', error);
      set({ error: error.message, loading: false });
    }
  },
  
  updateUserDoc: async (uid: string, updates: Partial<UserDocument>) => {
    try {
      set({ loading: true, error: null });
      await userService.updateUser(uid, updates);
      
      // Refresh the user document
      const updatedDoc = await userService.getUser(uid);
      set({ userDoc: updatedDoc, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  syncProfileToFirestore: async (uid: string, profile: OnboardingData) => {
    try {
      console.log('🔄 Starting syncProfileToFirestore...');
      console.log('👤 UID:', uid);
      console.log('📋 Profile:', JSON.stringify(profile, null, 2));
      
      if (!uid) {
        throw new Error('User UID is required');
      }
      
      if (!profile) {
        throw new Error('Profile data is required');
      }
      
      set({ loading: true, error: null });
      
      // First check if user document exists
      console.log('📖 Checking if user document exists...');
      const existingDoc = await userService.getUser(uid);
      console.log('📄 Existing doc:', existingDoc ? 'Found' : 'Not found');
      
      if (existingDoc) {
        console.log('✅ User document exists, updating...');
        // User document exists, update it
        const userUpdates: any = {
          firstName: profile.firstName || existingDoc.firstName || '',
          onboardingCompleted: true,
        };
        
        console.log('📝 UserStore: Updating user with firstName:', profile.firstName || existingDoc.firstName);
        
        // Only add height if it exists and has valid data
        if (profile.height?.value && profile.height?.unit) {
          userUpdates.height = {
            value: profile.height.value, // Keep as string to preserve "5ft 10in" format
            unit: profile.height.unit,
          };
        } else if (existingDoc.height) {
          // Keep existing height if not provided
          userUpdates.height = existingDoc.height;
        }
        
        // Only add weight if it exists and has valid data
        if (profile.weight?.value && profile.weight?.unit) {
          userUpdates.weight = {
            value: parseFloat(String(profile.weight.value)) || 0, // Convert to number for weight
            unit: profile.weight.unit,
          };
        } else if (existingDoc.weight) {
          // Keep existing weight if not provided
          userUpdates.weight = existingDoc.weight;
        }
        
        // Only add optional fields if they have values (or keep existing if updating)
        if (profile.birthday !== undefined && profile.birthday !== null) {
          userUpdates.birthday = profile.birthday;
        }
        if (profile.sex !== undefined) userUpdates.sex = profile.sex;
        if (profile.exerciseExperience !== undefined) userUpdates.exerciseExperience = profile.exerciseExperience;
        if (profile.primaryGoal !== undefined) userUpdates.primaryGoal = profile.primaryGoal;
        if (profile.goals !== undefined && Array.isArray(profile.goals)) {
          userUpdates.goals = profile.goals;
        }
        if (profile.equipment !== undefined) userUpdates.equipment = profile.equipment;
        if (profile.weeklySchedule !== undefined) userUpdates.weeklySchedule = profile.weeklySchedule;
        if (profile.playsSports !== undefined) userUpdates.playsSports = profile.playsSports;
        if (profile.sport !== undefined) userUpdates.sport = profile.sport;
        if (profile.isOnTeam !== undefined) userUpdates.isOnTeam = profile.isOnTeam;
        if (profile.teamName !== undefined) userUpdates.teamName = profile.teamName;
        if (profile.role !== undefined) userUpdates.role = profile.role;
        if (profile.injuries !== undefined) userUpdates.injuries = profile.injuries;
        if (profile.nutritionPreference !== undefined) {
          userUpdates.nutritionPreference = profile.nutritionPreference === 'meal_ideas' ? 'simple_macros' : profile.nutritionPreference;
        }
        
        console.log('📝 Updating user with:', JSON.stringify(userUpdates, null, 2));
        
        try {
        await userService.updateUser(uid, userUpdates);
        console.log('✅ User updated successfully');
        } catch (updateError: any) {
          console.error('❌ Error updating user document:', updateError);
          console.error('❌ Error message:', updateError?.message);
          console.error('❌ Error code:', updateError?.code);
          throw new Error(`Failed to update user document: ${updateError?.message || 'Unknown error'}`);
        }
        
        // Verify the update worked
        const verifyDoc = await userService.getUser(uid);
        console.log('🔍 Verification - Updated doc:', verifyDoc ? 'Found' : 'Not found');
        if (!verifyDoc?.onboardingCompleted) {
          console.error('❌ CRITICAL: onboardingCompleted is still false after update!');
          throw new Error('Failed to update onboarding status');
        }
      } else {
        console.log('❌ User document does not exist, creating...');
        // User document doesn't exist, create it
        const userData: any = {
          email: '', // Will be filled from auth user
          firstName: profile.firstName,
          height: {
            value: profile.height.value, // Keep as string to preserve "5ft 10in" format
            unit: profile.height.unit,
          },
          weight: {
            value: parseFloat(profile.weight.value) || 0, // Convert to number for weight
            unit: profile.weight.unit,
          },
          points: 0,
          planTier: 'free' as const,
          streaks: {
            workouts: 0,
            meals: 0,
            cardio: 0,
          },
          onboardingCompleted: true,
        };
        
        // Only add optional fields if they have values
        if (profile.birthday !== undefined) userData.birthday = profile.birthday;
        if (profile.sex !== undefined) userData.sex = profile.sex;
        if (profile.exerciseExperience !== undefined) userData.exerciseExperience = profile.exerciseExperience;
        if (profile.primaryGoal !== undefined) userData.primaryGoal = profile.primaryGoal;
        if (profile.goals !== undefined) userData.goals = profile.goals;
        if (profile.equipment !== undefined) userData.equipment = profile.equipment;
        if (profile.weeklySchedule !== undefined) userData.weeklySchedule = profile.weeklySchedule;
        if (profile.playsSports !== undefined) userData.playsSports = profile.playsSports;
        if (profile.sport !== undefined) userData.sport = profile.sport;
        if (profile.isOnTeam !== undefined) userData.isOnTeam = profile.isOnTeam;
        if (profile.teamName !== undefined) userData.teamName = profile.teamName;
        if (profile.role !== undefined) userData.role = profile.role;
        if (profile.injuries !== undefined) userData.injuries = profile.injuries;
        if (profile.nutritionPreference !== undefined) {
          userData.nutritionPreference = profile.nutritionPreference === 'meal_ideas' ? 'simple_macros' : profile.nutritionPreference;
        }
        
        console.log('📝 Creating user with:', userData);
        await userService.createUser(uid, userData);
        console.log('✅ User created successfully');
      }
      
      // Refresh the user document and sync local profile
      console.log('🔄 Refreshing user document...');
      const updatedDoc = await userService.getUser(uid);
      console.log('📄 Updated doc:', updatedDoc);
      
      set({ 
        userDoc: updatedDoc, 
        profile: profile, // Keep local profile in sync
        loading: false 
      });
      
      console.log('🎉 syncProfileToFirestore completed successfully!');
    } catch (error: any) {
      console.error('❌ Error in syncProfileToFirestore:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error code:', error.code);
      set({ error: error.message, loading: false });
      throw error; // Re-throw so calling code can handle it
    }
  },

  // Load profile from Firestore user document
  loadProfileFromFirestore: (userDoc: UserDocument) => {
    if (!userDoc) return;
    
    console.log('📖 UserStore: Loading profile from Firestore document');
    console.log('👤 UserDoc firstName:', userDoc.firstName);
    
    const profile: OnboardingData = {
      firstName: userDoc.firstName || '',
      birthday: userDoc.birthday,
      height: {
        value: typeof userDoc.height?.value === 'string' ? userDoc.height.value : userDoc.height?.value?.toString() || '',
        unit: userDoc.height?.unit || 'ft/in',
      },
      weight: {
        value: userDoc.weight?.value?.toString() || '',
        unit: userDoc.weight?.unit || 'lb',
      },
      sex: userDoc.sex,
      exerciseExperience: userDoc.exerciseExperience,
      primaryGoal: userDoc.primaryGoal,
      goals: userDoc.goals || [],
      equipment: userDoc.equipment,
      weeklySchedule: userDoc.weeklySchedule,
      playsSports: userDoc.playsSports,
      sport: userDoc.sport,
      isOnTeam: userDoc.isOnTeam,
      teamName: userDoc.teamName,
      role: userDoc.role,
      // Institution/Team related fields
      userType: userDoc.userType,
      institutionRole: userDoc.institutionRole,
      institutionName: userDoc.institutionName,
      teamSize: userDoc.teamSize,
      institutionSport: userDoc.institutionSport,
      communityUnlocked: userDoc.communityUnlocked,
      teamInviteCode: userDoc.teamInviteCode,
      teamId: userDoc.teamId,
      injuries: userDoc.injuries,
      nutritionPreference: userDoc.nutritionPreference === 'detailed_tracking' || userDoc.nutritionPreference === 'photo_logging' ? 'simple_macros' : userDoc.nutritionPreference,
      // App usage type
      appUseType: userDoc.appUseType,
      subscriptionTier: userDoc.planTier,
      units: userDoc.settings?.units || 'imperial',
    };
    
    set({ profile, isOnboarded: userDoc.onboardingCompleted || false });
    
    // Load personalized macro targets into nutrition store if available
    if (userDoc.customMacroTargets) {
      console.log('🎯 Loading personalized macro targets from Firebase:', userDoc.customMacroTargets);
      const { useNutritionStore } = require('@/stores/nutritionStore');
      useNutritionStore.getState().setPersonalizedTargets({
        calories: userDoc.customMacroTargets.calories,
        protein: userDoc.customMacroTargets.protein,
        carbs: userDoc.customMacroTargets.carbs,
        fat: userDoc.customMacroTargets.fat,
      });
    }
    
    // Load subscription data into subscription store
    if (userDoc) {
      const { useSubscriptionStore } = require('@/stores/subscriptionStore');
      useSubscriptionStore.getState().loadFromUserDoc(userDoc);
    }
  },
}));

