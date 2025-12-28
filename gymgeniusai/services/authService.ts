import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { COLLECTIONS } from '@/types/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  createdAt: Date;
  onboardingComplete: boolean;
  points: number;
  settings: {
    units: 'imperial' | 'metric';
    notifications: boolean;
    privacy: boolean;
  };
}

export interface AuthUser extends FirebaseUser {
  profile?: UserProfile;
  firstName?: string;
}

export class AuthService {
  private static instance: AuthService;
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Create a new user account with email and password
   */
  async signUp(email: string, password: string, displayName?: string): Promise<UserProfile> {
    try {
      console.log('🔄 Creating user account for:', email);
      
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name if provided
      if (displayName) {
        await updateProfile(user, { displayName });
      }

      // Create user profile document in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName || user.displayName || undefined,
        firstName: displayName || undefined, // Save first name as well
        createdAt: new Date(),
        onboardingComplete: false,
        points: 0,
        settings: {
          units: 'imperial',
          notifications: true,
          privacy: false,
        }
      };

      // Create Firestore document with essential fields only
      const firestoreDoc = {
        id: user.uid,
        email: user.email!,
        firstName: displayName || '',
        points: 0,
        planTier: 'free',
        streaks: {
          workouts: 0,
          meals: 0,
          cardio: 0,
        },
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), firestoreDoc);

      console.log('✅ User account created successfully');
      return userProfile;
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error object:', JSON.stringify(error, null, 2));
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: FirebaseUser; profile: UserProfile }> {
    try {
      console.log('🔄 AuthService: Signing in user:', email);
      console.log('🔍 AuthService: Password length:', password.length);
      console.log('🔍 AuthService: Firebase auth object exists:', !!auth);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('✅ AuthService: Firebase authentication successful, user UID:', user.uid);
      console.log('✅ AuthService: User email:', user.email);

      // Try to load user profile from Firestore, but create a fallback if it fails
      let profile: UserProfile;
      try {
        console.log('🔄 AuthService: Loading user profile from Firestore...');
        profile = await this.getUserProfile(user.uid);
        console.log('✅ AuthService: User profile loaded from Firestore:', profile);
      } catch (profileError) {
        console.warn('⚠️ AuthService: Could not load profile from Firestore, creating fallback:', profileError);
        
        // For users without a profile, create a basic fallback profile
        profile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || undefined,
          createdAt: new Date(),
          onboardingComplete: false,
          points: 0,
          settings: {
            units: 'imperial',
            notifications: true,
            privacy: false,
          }
        };
        console.log('✅ AuthService: Created fallback profile:', profile);
      }
      
      console.log('✅ AuthService: Sign in successful');
      return { user, profile };
    } catch (error: unknown) {
      console.error('❌ AuthService: Sign in failed:', error);
      
      // Log detailed error information
      if (error && typeof error === 'object') {
        console.error('❌ AuthService: Error type:', typeof error);
        console.error('❌ AuthService: Error message:', (error as any).message);
        console.error('❌ AuthService: Error code:', (error as any).code);
        console.error('❌ AuthService: Error stack:', (error as any).stack);
        
        // Check if it's a Firebase auth error
        if ((error as any).code) {
          console.error('❌ AuthService: Firebase error code:', (error as any).code);
          if ((error as any).code === 'auth/invalid-credential') {
            console.error('❌ AuthService: INVALID CREDENTIALS - Check email/password');
          }
        }
      }
      
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    try {
      console.log('🔄 Signing out user');
      await signOut(auth);
      console.log('✅ Sign out successful');
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      console.log('🔄 Sending password reset email to:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Create a user profile in Firestore
   */
  async createUserProfile(uid: string, email: string, displayName?: string): Promise<UserProfile> {
    try {
      console.log('🔄 AuthService: Creating user profile for:', uid);
      
      const userProfile: UserProfile = {
        uid,
        email,
        displayName: displayName || undefined,
        createdAt: new Date(),
        onboardingComplete: false,
        points: 0,
        settings: {
          units: 'imperial',
          notifications: true,
          privacy: false,
        }
      };

      await setDoc(doc(db, 'users', uid), {
        ...userProfile,
        createdAt: serverTimestamp(),
      });

      console.log('✅ AuthService: User profile created successfully');
      return userProfile;
    } catch (error: any) {
      console.error('❌ AuthService: Create user profile error:', error);
      throw error;
    }
  }

  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid: string): Promise<UserProfile> {
    try {
      console.log('🔄 AuthService: Getting user profile for:', uid);
      console.log('🔍 AuthService: Firestore db object:', !!db);
      
      const userDoc = await getDoc(doc(db, 'users', uid));
      console.log('🔍 AuthService: Document exists:', userDoc.exists());
      
      if (!userDoc.exists()) {
        console.error('❌ AuthService: User profile not found in Firestore');
        throw new Error('User profile not found');
      }

      const data = userDoc.data();
      console.log('🔍 AuthService: User profile data:', data);
      
      const profile = {
        uid,
        email: data.email,
        displayName: data.displayName,
        createdAt: data.createdAt?.toDate() || new Date(),
        onboardingComplete: data.onboardingComplete || false,
        points: data.points || 0,
        settings: {
          units: data.settings?.units || 'imperial',
          notifications: data.settings?.notifications ?? true,
          privacy: data.settings?.privacy ?? false,
        }
      };
      
      console.log('✅ AuthService: User profile constructed:', profile);
      return profile;
    } catch (error: any) {
      console.error('❌ AuthService: Get user profile failed:', error.message);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      console.log('🔄 Updating user profile:', uid);
      
      // Filter out undefined values
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      await setDoc(doc(db, 'users', uid), {
        ...cleanUpdates,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('✅ User profile updated');
    } catch (error: any) {
      console.error('❌ Update user profile error:', error);
      throw error;
    }
  }

  /**
   * Mark onboarding as complete
   */
  async markOnboardingComplete(uid: string): Promise<void> {
    await this.updateUserProfile(uid, { onboardingComplete: true });
  }

  /**
   * Update user points
   */
  async updateUserPoints(uid: string, pointsChange: number): Promise<void> {
    try {
      const userProfile = await this.getUserProfile(uid);
      const newPoints = userProfile.points + pointsChange;
      
      await this.updateUserProfile(uid, { points: newPoints });
      console.log(`✅ Points updated: ${userProfile.points} → ${newPoints}`);
    } catch (error: any) {
      console.error('❌ Update user points error:', error);
      throw error;
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Get current user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Delete all user data from Firestore collections
   */
  async deleteAllUserData(uid: string): Promise<void> {
    try {
      console.log('🔄 Deleting all data for user:', uid);

      // List of collections to clean up
      const collectionsToDelete = [
        { collection: COLLECTIONS.USERS, field: null }, // Delete user document directly
        { collection: COLLECTIONS.WORKOUTS, field: 'uid' },
        { collection: COLLECTIONS.MEALS, field: 'uid' },
        { collection: COLLECTIONS.MEAL_PLANS, field: 'userId' },
        { collection: COLLECTIONS.POINT_EVENTS, field: 'uid' },
        { collection: COLLECTIONS.FEATURE_UNLOCKS, field: 'uid' },
        { collection: COLLECTIONS.PROGRESS, field: 'uid' },
        { collection: COLLECTIONS.USER_CHALLENGES, field: 'uid' },
      ];

      // Delete user document
      const userRef = doc(db, COLLECTIONS.USERS, uid);
      try {
        await deleteDoc(userRef);
        console.log('✅ Deleted user document');
      } catch (error) {
        console.warn('⚠️ Error deleting user document (may not exist):', error);
      }

      // Delete documents from collections
      for (const { collection: collectionName, field } of collectionsToDelete) {
        if (field) {
          try {
            const q = query(
              collection(db, collectionName),
              where(field, '==', uid)
            );
            const querySnapshot = await getDocs(q);
            
            const deletePromises = querySnapshot.docs.map(async (docSnapshot) => {
              await deleteDoc(docSnapshot.ref);
            });
            
            await Promise.all(deletePromises);
            console.log(`✅ Deleted ${querySnapshot.size} documents from ${collectionName}`);
          } catch (error) {
            console.warn(`⚠️ Error deleting from ${collectionName}:`, error);
          }
        }
      }

      // Delete community memberships
      try {
        const membersQuery = query(
          collection(db, COLLECTIONS.COMMUNITY_MEMBERS),
          where('uid', '==', uid)
        );
        const membersSnapshot = await getDocs(membersQuery);
        const memberDeletePromises = membersSnapshot.docs.map(async (memberDoc) => {
          await deleteDoc(memberDoc.ref);
        });
        await Promise.all(memberDeletePromises);
        console.log(`✅ Deleted ${membersSnapshot.size} community memberships`);
      } catch (error) {
        console.warn('⚠️ Error deleting community memberships:', error);
      }

      // Delete community feed entries
      try {
        const feedQuery = query(
          collection(db, COLLECTIONS.COMMUNITY_FEED),
          where('userId', '==', uid)
        );
        const feedSnapshot = await getDocs(feedQuery);
        const feedDeletePromises = feedSnapshot.docs.map(async (feedDoc) => {
          await deleteDoc(feedDoc.ref);
        });
        await Promise.all(feedDeletePromises);
        console.log(`✅ Deleted ${feedSnapshot.size} feed entries`);
      } catch (error) {
        console.warn('⚠️ Error deleting feed entries:', error);
      }

      console.log('✅ All user data deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Delete user account and all associated data
   */
  async deleteAccount(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }

      console.log('🔄 Deleting account for user:', user.uid);

      // First, delete all user data from Firestore
      await this.deleteAllUserData(user.uid);

      // Then, delete the Firebase Auth account
      await deleteUser(user);
      
      console.log('✅ Account deleted successfully');
    } catch (error: any) {
      console.error('❌ Delete account error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Handle Firebase auth errors and convert to user-friendly messages
   */
  private handleAuthError(error: any): Error {
    console.error('Firebase auth error:', error);
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        return new Error('This email is already registered. Please try signing in instead.');
      case 'auth/weak-password':
        return new Error('Password should be at least 6 characters long.');
      case 'auth/invalid-email':
        return new Error('Please enter a valid email address.');
      case 'auth/user-not-found':
        return new Error('No account found with this email address.');
      case 'auth/wrong-password':
        return new Error('Incorrect password. Please try again.');
      case 'auth/invalid-credential':
        return new Error('Invalid email or password. Please check your credentials and try again.');
      case 'auth/too-many-requests':
        return new Error('Too many failed attempts. Please try again later.');
      case 'auth/network-request-failed':
        return new Error('Network error. Please check your connection and try again.');
      case 'auth/user-disabled':
        return new Error('This account has been disabled. Please contact support.');
      case 'auth/requires-recent-login':
        return new Error('This operation requires recent authentication. Please sign out and sign back in, then try again.');
      default:
        return new Error('An unexpected error occurred. Please try again.');
    }
  }
}

export const authService = AuthService.getInstance();