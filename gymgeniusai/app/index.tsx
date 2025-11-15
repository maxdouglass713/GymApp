import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/components/AuthProvider';

export default function Index() {
  const { user, loading, hasCompletedOnboarding, profile } = useAuth();

  console.log('🔄 Index: Checking auth state');
  console.log('👤 User:', user?.uid || 'null');
  console.log('👤 Profile:', profile);
  console.log('⏳ Loading:', loading);
  console.log('✅ Has completed onboarding:', hasCompletedOnboarding());
  console.log('📋 Profile onboardingComplete:', profile?.onboardingComplete);

  // Show loading screen while checking auth state
  if (loading) {
    console.log('⏳ Index: Still loading, showing nothing');
    return null; // Expo Router will handle loading
  }

  // User is not authenticated - redirect to auth
  if (!user) {
    console.log('🚫 Index: No user, redirecting to sign in');
    return <Redirect href="/auth/signin" />;
  }

  // User is authenticated but hasn't completed onboarding
  if (!hasCompletedOnboarding()) {
    console.log('⚠️ Index: User exists but onboarding not complete, redirecting to auth');
    return <Redirect href="/auth/signin" />;
  }

  // User is authenticated and has completed onboarding - redirect to main app
  console.log('✅ Index: User authenticated and onboarding complete, redirecting to main app');
  console.log('👤 User profile:', user.profile);
  console.log('🎯 Redirecting to: /(tabs)');
  return <Redirect href="/(tabs)" />;
}
