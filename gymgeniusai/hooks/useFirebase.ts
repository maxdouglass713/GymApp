import { useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';
import { userService } from '../services/firestoreService';
import { UserDocument } from '../types/firestore';

export const useFirebaseAuth = () => {
  const [authState, setAuthState] = useState<{
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
  }>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setAuthState({
        user,
        loading: false,
        error: null,
      });
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, firstName: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await authService.signUp(email, password, firstName);
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Sign-in is taking longer than expected. Please try again.' 
        }));
      }, 30000); // 30 second timeout
      
      await authService.signIn(email, password);
      
      // Clear timeout if sign-in succeeds
      clearTimeout(timeoutId);
      // Note: loading will be set to false by the auth state listener
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await authService.signOut();
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
      throw error;
    }
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
  };
};

export const useUserDocument = (uid: string | null) => {
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setUserDoc(null);
      return;
    }

    const fetchUserDoc = async () => {
      try {
        setLoading(true);
        setError(null);
        const doc = await userService.getUser(uid);
        setUserDoc(doc);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDoc();
  }, [uid]);

  const updateUserDoc = async (updates: Partial<UserDocument>) => {
    if (!uid) return;

    try {
      setLoading(true);
      setError(null);
      await userService.updateUser(uid, updates);
      
      // Refresh the user document
      const updatedDoc = await userService.getUser(uid);
      setUserDoc(updatedDoc);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    userDoc,
    loading,
    error,
    updateUserDoc,
  };
};
