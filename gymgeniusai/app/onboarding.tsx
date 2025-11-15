import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/components/AuthProvider';
import OnboardingStep from '@/components/OnboardingStep';
import { calculatePersonalizedMacros } from '@/utils/macroCalculator';

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const currentStep = useOnboardingStore((state) => state.currentStep);
  const totalSteps = useOnboardingStore((state) => state.totalSteps);
  const isStepValid = useOnboardingStore((state) => state.isStepValid);
  const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep);
  const data = useOnboardingStore((state) => state.data);
  const restoreSavedProgress = useOnboardingStore((state) => state.restoreSavedProgress);
  const hasRestored = useOnboardingStore((state) => state.hasRestored);
  const clearSavedProgress = useOnboardingStore((state) => state.clearSavedProgress);
  const { setProfile, syncProfileToFirestore, loading, fetchUserDoc } = useUserStore();
  const { user, markOnboardingComplete, updateUserProfile } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    restoreSavedProgress();
  }, [restoreSavedProgress]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setIsCompleting(true);
    
    try {
      console.log('🔄 Completing onboarding...');
      console.log('👤 User UID:', user?.uid || 'No user (bypass mode)');
      console.log('📋 Profile data:', data);
      
      if (!user) {
        // Bruce Wayne bypass mode - save to local storage only
        console.log('🦇 Bruce Wayne bypass mode - saving onboarding data locally');
        
        // Save onboarding data to local storage
        await setProfile(data);
        
        await clearSavedProgress();

        Alert.alert(
          'Onboarding Complete!', 
          'Your profile has been saved locally. You can now use the app!',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }
      
      // Normal authenticated user flow
      // Save profile data to user profile in Firestore
      const profileUpdates: any = {};
      
      // Save all onboarding data fields (only if they have values)
      if (data.firstName) {
        profileUpdates.firstName = data.firstName;
        console.log('✅ Saving firstName to profile:', data.firstName);
      } else {
        console.log('❌ No firstName found in onboarding data:', data);
      }
      if (data.birthday !== undefined) profileUpdates.birthday = data.birthday;
      if (data.height) profileUpdates.height = data.height;
      if (data.weight) profileUpdates.weight = data.weight;
      if (data.sex !== undefined) profileUpdates.sex = data.sex;
      if (data.exerciseExperience !== undefined) profileUpdates.exerciseExperience = data.exerciseExperience;
      if (data.primaryGoal !== undefined) profileUpdates.primaryGoal = data.primaryGoal;
      if (Array.isArray(data.goals)) profileUpdates.goals = data.goals;
      if (data.equipment !== undefined) profileUpdates.equipment = data.equipment;
      if (data.weeklySchedule !== undefined) profileUpdates.weeklySchedule = data.weeklySchedule;
      if (data.playsSports !== undefined) profileUpdates.playsSports = data.playsSports;
      if (data.sport !== undefined) profileUpdates.sport = data.sport;
      if (data.isOnTeam !== undefined) profileUpdates.isOnTeam = data.isOnTeam;
      if (data.teamName !== undefined) profileUpdates.teamName = data.teamName;
      if (data.role !== undefined) profileUpdates.role = data.role;
      if (data.injuries !== undefined) profileUpdates.injuries = data.injuries;
      if (data.nutritionPreference !== undefined) profileUpdates.nutritionPreference = data.nutritionPreference;
      
      // Institution/Team related fields
      if (data.userType !== undefined) profileUpdates.userType = data.userType;
      if (data.institutionRole !== undefined) profileUpdates.institutionRole = data.institutionRole;
      if (data.institutionName !== undefined) profileUpdates.institutionName = data.institutionName;
      if (data.teamSize !== undefined) profileUpdates.teamSize = data.teamSize;
      if (data.institutionSport !== undefined) profileUpdates.institutionSport = data.institutionSport;
      if (data.communityUnlocked !== undefined) profileUpdates.communityUnlocked = data.communityUnlocked;
      if (data.teamInviteCode !== undefined) profileUpdates.teamInviteCode = data.teamInviteCode;
      if (data.teamId !== undefined) profileUpdates.teamId = data.teamId;
      
      // Set default values for new users
      profileUpdates.planTier = 'free';
      profileUpdates.points = 0;
      profileUpdates.streaks = {
        workouts: 0,
        cardio: 0,
        meals: 0
      };
      
      profileUpdates.settings = {
        units: data.units || 'imperial',
        notifications: true,
        privacy: false,
      };
      
      // Calculate personalized macro targets
      try {
        console.log('🧮 Calculating personalized macro targets...');
        const macroCalculation = calculatePersonalizedMacros(data);
        
        profileUpdates.customMacroTargets = {
          calories: macroCalculation.targets.calories,
          protein: macroCalculation.targets.protein,
          carbs: macroCalculation.targets.carbs,
          fat: macroCalculation.targets.fat,
          bmr: macroCalculation.breakdown.bmr,
          tdee: macroCalculation.breakdown.tdee,
          activityMultiplier: macroCalculation.breakdown.activityMultiplier,
          calculatedAt: macroCalculation.lastCalculated,
          basedOnWeight: macroCalculation.basedOn.weight,
          basedOnGoal: macroCalculation.basedOn.goal,
        };
        
        console.log('✅ Personalized macros calculated:', macroCalculation.targets);
        console.log('📊 Breakdown - BMR:', macroCalculation.breakdown.bmr, 'TDEE:', macroCalculation.breakdown.tdee);
      } catch (error) {
        console.error('❌ Error calculating macros, using defaults:', error);
        // Don't fail onboarding if macro calculation fails
      }
      
      await updateUserProfile(profileUpdates);
      
      // Sync profile data to user store for local access
      await setProfile(data);
      
      // Fetch updated user document from Firebase
      await fetchUserDoc(user.uid);
      
      // Mark onboarding as complete
      await markOnboardingComplete();
      
      console.log('✅ Onboarding completed successfully');
      
      // Show success message
      await clearSavedProgress();

      Alert.alert('Welcome to KINETIC FLOW AI!', 'Your profile has been set up successfully.', [
        {
            text: 'OK',
            onPress: () => {
              // Navigate to main app
              router.replace('/(tabs)');
            }
          }
        ]);
    } catch (error: any) {
      console.error('❌ Error saving profile:', error);
      Alert.alert('Error', `Failed to save profile: ${error.message}`);
    } finally {
      setIsCompleting(false);
    }
  };

  const canProceed = isStepValid(currentStep);
  const progress = (currentStep + 1) / totalSteps;

  if (!hasRestored) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.progressText, { color: colors.icon }]}>
          Loading onboarding...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: colors.icon + '20' }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: colors.tint,
                width: `${progress * 100}%`
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: colors.icon }]}>
          {currentStep + 1} of {totalSteps}
        </Text>
      </View>

      {/* Auto-save indicator removed per request; autosave still runs silently */}

      {/* Step Content */}
      <View style={styles.stepContainer}>
        <ScrollView
          contentContainerStyle={styles.stepContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <OnboardingStep step={currentStep} />
        </ScrollView>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.backButton, { borderColor: colors.tint }]}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Text style={[styles.backButtonText, { color: colors.tint }]}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.nextButton, 
            { 
              backgroundColor: canProceed ? BrandColors.accent : colors.icon + '40',
              opacity: canProceed ? 1 : 0.6
            }
          ]}
          onPress={handleNext}
          disabled={!canProceed || isCompleting || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isCompleting || loading
              ? 'Saving...'
              : currentStep === 0
                ? 'Continue'
                : currentStep === 1
                  ? 'Submit'
                  : currentStep === 2
                    ? 'Submit'
                    : currentStep === totalSteps - 1
                      ? 'Finish'
                      : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  autoSaveContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  autoSaveText: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    fontStyle: 'italic',
  },
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 56,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  nextButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
});
