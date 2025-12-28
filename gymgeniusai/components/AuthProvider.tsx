import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { authService, AuthUser, UserProfile } from '@/services/authService';
import { dataService } from '@/services/dataService';
import { useUserStore } from '@/stores/userStore';
import { usePointsStore } from '@/stores/pointsStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useMealPlanStore } from '@/stores/mealPlanStore';
import { useOnboardingStore } from '@/stores/onboardingStore';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  hasCompletedOnboarding: () => boolean;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousUidRef = React.useRef<string | null>(null);
  
  // Get store actions
  const { fetchUserDoc, loadProfileFromStorage, profile: userStoreProfile, isOnboarded, clearProfile } = useUserStore();
  const { } = usePointsStore();

  useEffect(() => {
    console.log('🔄 Setting up auth state listener');
    console.log('🔍 Firebase auth object:', !!auth);
    console.log('🔍 Firebase auth app:', !!auth?.app);
    console.log('🔍 Firebase config:', {
      apiKey: !!auth?.app?.options?.apiKey,
      projectId: auth?.app?.options?.projectId
    });
    console.log('🔍 Firebase auth current user:', auth?.currentUser?.uid || 'none');
    console.log('🔍 Firebase auth ready:', auth?.app?.options);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('🔍 Auth state changed:', firebaseUser ? firebaseUser.uid : 'null');
      
      if (firebaseUser) {
        // Check if this is a different user logging in
        if (previousUidRef.current && previousUidRef.current !== firebaseUser.uid) {
          console.log('🔄 Different user detected, clearing previous user data...');
          clearProfile();
          useOnboardingStore.getState().resetOnboarding(); // Clear onboarding data for new user
          usePointsStore.getState().resetPoints();
          useWorkoutStore.getState().clearAllWorkoutData();
          useNutritionStore.getState().clearAllNutritionData();
          useFavoritesStore.getState().clearAllFavoritesData();
          await useMealPlanStore.getState().clearAllMealPlans();
        }
        
        // Always clear onboarding data when any user logs in to ensure fresh start
        console.log('🧹 Clearing onboarding data for fresh user experience...');
        useOnboardingStore.getState().resetOnboarding();
        
        previousUidRef.current = firebaseUser.uid;
        
        try {
          // Load user profile from Firestore
          console.log('🔄 AuthProvider: Loading user profile for:', firebaseUser.uid);
          const userProfile = await authService.getUserProfile(firebaseUser.uid);
          
          const authUser: AuthUser = {
            ...firebaseUser,
            profile: userProfile
          };
          
          setUser(authUser);
          setProfile(userProfile);
          
          console.log('✅ AuthProvider: User authenticated:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            onboardingComplete: userProfile.onboardingComplete,
            points: userProfile.points
          });
          
          // Initialize stores with user data
          try {
            console.log('🔄 Initializing stores with user data...');
            await fetchUserDoc(firebaseUser.uid);
            console.log('✅ Stores initialized with user data');
          } catch (storeError: any) {
            console.error('❌ Error initializing stores:', storeError);
            // Don't fail authentication if store initialization fails
          }
        } catch (error: any) {
          console.error('❌ AuthProvider: Error loading user profile:', error.message);
          
          // If user profile doesn't exist, create a basic one
          if (error.message === 'User profile not found') {
            console.log('🔄 AuthProvider: Creating missing user profile...');
            try {
              const newProfile = await authService.createUserProfile(
                firebaseUser.uid,
                firebaseUser.email || '',
                firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'
              );
              
              const authUser: AuthUser = {
                ...firebaseUser,
                profile: newProfile
              };
              
              setUser(authUser);
              setProfile(newProfile);
              
              console.log('✅ AuthProvider: User profile created and user authenticated');
            } catch (createError: any) {
              console.error('❌ AuthProvider: Error creating user profile:', createError.message);
              setError('Failed to create user profile');
              setUser(null);
              setProfile(null);
            }
          } else {
            console.error('❌ AuthProvider: Profile loading failed:', error.message);
            setError('Failed to load user profile: ' + error.message);
            setUser(null);
            setProfile(null);
          }
        }
      } else {
        console.log('🔓 User signed out');
        previousUidRef.current = null; // Clear the previous UID
        setUser(null);
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => {
      console.log('🧹 Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Signing up user:', email);
      
      const userProfile = await authService.signUp(email, password, displayName);
      
      // Clear onboarding data for fresh start
      useOnboardingStore.getState().resetOnboarding();
      
      setProfile(userProfile);
      
      console.log('✅ Sign up successful');
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      console.log('🔄 AuthProvider: signIn function called with:', email);
      setLoading(true);
      setError(null);
      console.log('🔄 AuthProvider: Signing in user:', email);
      console.log('🔍 AuthProvider: Firebase auth object:', !!auth);
      
      const { user: firebaseUser, profile: userProfile } = await authService.signIn(email, password);
      
      console.log('📋 AuthProvider: Firebase user:', firebaseUser.uid);
      console.log('📋 AuthProvider: User profile:', userProfile);
      
      // Clear onboarding data for fresh start
      useOnboardingStore.getState().resetOnboarding();
      
      const authUser: AuthUser = {
        ...firebaseUser,
        profile: userProfile
      };
      
      setUser(authUser);
      setProfile(userProfile);
      
      console.log('✅ AuthProvider: Sign in successful, state updated');
    } catch (error: unknown) {
      console.error('❌ AuthProvider: Sign in failed:', error);
      
      let errorMessage = 'An unexpected error occurred';
      let errorCode = 'unknown';
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      if (error && typeof error === 'object' && 'code' in error) {
        errorCode = String(error.code);
      }
      
      console.error('❌ AuthProvider: Error details:', { errorMessage, errorCode });
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Signing out user');
      
      await authService.signOut();
      
      // Clear all user data from stores
      console.log('🧹 Clearing all user data from stores and local storage...');
      clearProfile();
      useOnboardingStore.getState().resetOnboarding(); // Clear onboarding data
      usePointsStore.getState().resetPoints();
      useWorkoutStore.getState().clearAllWorkoutData();
      useNutritionStore.getState().clearAllNutritionData();
      useFavoritesStore.getState().clearAllFavoritesData();
      await useMealPlanStore.getState().clearAllMealPlans();
      
      setUser(null);
      setProfile(null);
      
      console.log('✅ Sign out successful and data cleared');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      console.log('🔄 Resetting password for:', email);
      
      await authService.resetPassword(email);
      
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      setError(error.message);
      throw error;
    }
  };

  const markOnboardingComplete = async (): Promise<void> => {
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    try {
      setError(null);
      console.log('🔄 Marking onboarding complete for user:', user.uid);
      
      await authService.markOnboardingComplete(user.uid);
      
      // Update local profile state
      if (profile) {
        const updatedProfile = { ...profile, onboardingComplete: true };
        setProfile(updatedProfile);
        
        // Update user object as well
        const updatedUser = { ...user, profile: updatedProfile };
        setUser(updatedUser);
      }
      
      console.log('✅ Onboarding marked as complete');
    } catch (error: any) {
      console.error('❌ Mark onboarding complete error:', error);
      setError(error.message);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user?.uid) {
      throw new Error('No authenticated user');
    }

    try {
      setError(null);
      console.log('🔄 Updating user profile:', updates);
      
      await authService.updateUserProfile(user.uid, updates);
      
      // Update local profile state
      if (profile) {
        const updatedProfile = { ...profile, ...updates };
        setProfile(updatedProfile);
        
        // Update user object as well
        const updatedUser = { ...user, profile: updatedProfile };
        setUser(updatedUser);
      }
      
      console.log('✅ User profile updated');
    } catch (error: any) {
      console.error('❌ Update user profile error:', error);
      setError(error.message);
      throw error;
    }
  };

  const hasCompletedOnboarding = (): boolean => {
    // Check authenticated user profile first
    if (profile && profile.onboardingComplete !== undefined) {
      return profile.onboardingComplete;
    }
    
    // Check local profile store as fallback
    if (isOnboarded && userStoreProfile) {
      return true;
    }
    
    // For existing accounts that don't have onboardingComplete field,
    // assume they have completed onboarding (legacy accounts)
    if (profile) {
      return true;
    }
    
    return false;
  };

  const isAuthenticated = (): boolean => {
    return user !== null && profile !== null;
  };

  const contextValue: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    markOnboardingComplete,
    updateUserProfile,
    hasCompletedOnboarding,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};