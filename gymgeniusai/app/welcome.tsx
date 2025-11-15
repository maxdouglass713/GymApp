import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { BrandColors, Typography, Spacing, BorderRadius, ComponentStyles } from '@/constants/theme';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import { useUserStore } from '@/stores/userStore';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();
  const { isOnboarded, userDoc } = useUserStore();

  // Auto-redirect based on authentication state
  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is signed in, check if they've completed onboarding
        if (userDoc?.onboardingCompleted || isOnboarded) {
          console.log('✅ User authenticated and onboarded, redirecting to main app');
          router.replace('/(tabs)');
        } else {
          console.log('✅ User authenticated but not onboarded, redirecting to auth');
          router.replace('/auth');
        }
      } else {
        // User is not signed in, redirect to auth screen
        console.log('❌ User not authenticated, redirecting to auth');
        router.replace('/auth');
      }
    }
  }, [user, loading, isOnboarded, userDoc]);

  const handleGetStarted = () => {
    if (user) {
      // User is signed in, check if they've completed onboarding
      if (userDoc?.onboardingCompleted || isOnboarded) {
        router.push('/(tabs)');
      } else {
        router.push('/onboarding');
      }
      } else {
        // User needs to sign in or sign up - go to auth screen
        router.push('/auth/signin');
      }
  };

  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  const handleTestFirebase = () => {
    router.push('/firebase-test');
  };

  return (
    <View style={ComponentStyles.screen}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Logo size="large" showText={false} useImage={true} />
        </View>

        {/* App Title */}
        <Text style={styles.title}>
          KINETIC FLOW AI
        </Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Brains + Gains.
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Your AI-powered fitness companion for smarter workouts, better nutrition, and stronger communities.
        </Text>

        {/* Status */}
        {loading && (
          <Text style={styles.statusText}>Loading...</Text>
        )}
        
        {user && (
          <Text style={styles.statusText}>Welcome back, {user.firstName || user.email?.split('@')[0] || 'User'}!</Text>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.getStartedButton]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={ComponentStyles.button.primaryText}>
              Get Started
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ComponentStyles.button.secondary, styles.signInButton]}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={ComponentStyles.button.secondaryText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ComponentStyles.button.secondary, styles.testButton]}
            onPress={handleTestFirebase}
            activeOpacity={0.8}
          >
            <Text style={ComponentStyles.button.secondaryText}>🧪 Test Firebase</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.xxl,
  },
  title: {
    color: BrandColors.text,
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  tagline: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  subtitle: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    marginBottom: Spacing.xxxl,
    maxWidth: 300,
  },
  statusText: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    gap: Spacing.md,
    width: '100%',
    maxWidth: 300,
  },
  getStartedButton: {
    minWidth: 200,
    shadowColor: BrandColors.accent,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signInButton: {
    minWidth: 200,
  },
  testButton: {
    minWidth: 200,
  },
});

