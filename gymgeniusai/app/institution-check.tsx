import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function InstitutionCheckScreen() {
  const { updateData } = useOnboardingStore();
  const [selectedOption, setSelectedOption] = useState<'personal' | 'institution' | 'gym_trainer' | null>(null);

  const handleOptionSelect = (option: 'personal' | 'institution' | 'gym_trainer') => {
    // V1.0: Block team/institution/trainer - only personal use allowed
    if (option !== 'personal') {
      const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
      checkFeatureOrShowComingSoon('teamManagement', 'Team & Institution Features');
      return;
    }
    
    // Provide haptic feedback when selecting
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(option);
    updateData({ 
      userType: option === 'gym_trainer' ? 'institution' : option, // Map gym_trainer to institution for compatibility
      appUseType: option === 'institution' ? 'team_institution' : option, // Map to match onboarding store type
      // Auto-assign Basic tier for personal use, Elite for coaches and trainers
      subscriptionTier: (option === 'institution' || option === 'gym_trainer') ? 'elite' : 'basic',
      // Reset institution-specific fields when switching
      institutionRole: undefined,
      institutionName: undefined,
      teamSize: undefined,
      institutionSport: undefined
    });
  };

  const handleContinue = () => {
    if (!selectedOption) {
      Alert.alert('Please select an option', 'Choose how you will be using the app.');
      return;
    }

    if (selectedOption === 'personal') {
      // V1.0: When personal is selected, go directly to step 1 (birthday), skipping step 0 (subscription tier)
      const { useOnboardingStore } = require('@/stores/onboardingStore');
      useOnboardingStore.getState().setCurrentStep(1); // Start at step 1 (birthday), skip step 0
      router.replace('/onboarding');
    } else if (selectedOption === 'gym_trainer') {
      router.replace('/trainer-entry');
    } else {
      router.replace('/institution-setup');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>How are you using Kinetic Flow?</Text>
            <Text style={styles.subtitle}>
              This helps us customize your experience and unlock the right features for you
            </Text>
            <Text style={styles.instructionText}>
              👆 Tap an option below to select
            </Text>
          </View>

          <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === 'personal' && styles.optionCardSelected
            ]}
            onPress={() => handleOptionSelect('personal')}
            activeOpacity={0.7}
          >
            {selectedOption === 'personal' && (
              <View style={styles.checkmarkContainer}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            )}
            <View style={styles.optionIcon}>
              <Text style={styles.optionEmoji}>👤</Text>
            </View>
            <Text style={[
              styles.optionTitle,
              selectedOption === 'personal' && styles.optionTitleSelected
            ]}>
              Personal Use
            </Text>
            <Text style={[
              styles.optionDescription,
              selectedOption === 'personal' && styles.optionDescriptionSelected
            ]}>
              Individual fitness and nutrition tracking for personal goals
            </Text>
            <View style={styles.optionFeatures}>
              <Text style={[
                styles.featureText,
                selectedOption === 'personal' && styles.featureTextSelected
              ]}>
                • Personalized workout plans
              </Text>
              <Text style={[
                styles.featureText,
                selectedOption === 'personal' && styles.featureTextSelected
              ]}>
                • Nutrition tracking
              </Text>
              <Text style={[
                styles.featureText,
                selectedOption === 'personal' && styles.featureTextSelected
              ]}>
                • Progress monitoring
              </Text>
            </View>
          </TouchableOpacity>

          {/* HIDDEN for v1.0 - Team & Institution option */}
          {/* <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === 'institution' && styles.optionCardSelected,
              { opacity: 0.5 }
            ]}
            onPress={() => handleOptionSelect('institution')}
            activeOpacity={1}
            disabled={true}
          >
            {selectedOption === 'institution' && (
              <View style={styles.checkmarkContainer}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            )}
            <View style={styles.optionIcon}>
              <Text style={styles.optionEmoji}>🏫</Text>
            </View>
            <Text style={[
              styles.optionTitle,
              selectedOption === 'institution' && styles.optionTitleSelected
            ]}>
              Team & Institution
            </Text>
            <Text style={[
              styles.optionDescription,
              selectedOption === 'institution' && styles.optionDescriptionSelected
            ]}>
              Managing athletes, teams, or institutional fitness programs
            </Text>
            <View style={styles.optionFeatures}>
              <Text style={[
                styles.featureText,
                selectedOption === 'institution' && styles.featureTextSelected
              ]}>
                • Team management tools
              </Text>
              <Text style={[
                styles.featureText,
                selectedOption === 'institution' && styles.featureTextSelected
              ]}>
                • Community features unlocked
              </Text>
              <Text style={[
                styles.featureText,
                selectedOption === 'institution' && styles.featureTextSelected
              ]}>
                • Analytics & reporting
              </Text>
            </View>
          </TouchableOpacity> */}

          {/* HIDDEN for v1.0 - Gym / Personal Trainer option */}
          {/* <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === 'gym_trainer' && styles.optionCardSelected,
              { opacity: 0.5 }
            ]}
            onPress={() => handleOptionSelect('gym_trainer')}
            activeOpacity={1}
            disabled={true}
          >
            {selectedOption === 'gym_trainer' && (
              <View style={styles.checkmarkContainer}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            )}
            <View style={styles.optionIcon}>
              <Text style={styles.optionEmoji}>💪</Text>
            </View>
            <Text style={[
              styles.optionTitle,
              selectedOption === 'gym_trainer' && styles.optionTitleSelected
            ]}>
              Gym / Personal Trainer
            </Text>
            <Text style={[
              styles.optionDescription,
              selectedOption === 'gym_trainer' && styles.optionDescriptionSelected
            ]}>
              Personal trainers and gyms managing clients and members
            </Text>
            <View style={styles.optionFeatures}>
              <Text style={[
                styles.featureText,
                selectedOption === 'gym_trainer' && styles.featureTextSelected
              ]}>
                • Client management platform
              </Text>
              <Text style={[
                styles.featureText,
                selectedOption === 'gym_trainer' && styles.featureTextSelected
              ]}>
                • Custom meal & workout plans
              </Text>
              <Text style={[
                styles.featureText,
                selectedOption === 'gym_trainer' && styles.featureTextSelected
              ]}>
                • Progress tracking & analytics
              </Text>
            </View>
          </TouchableOpacity> */}
        </View>

        <View style={styles.buttonContainer}>
            {!selectedOption && (
              <Text style={styles.hintText}>
                Please select an option above to continue
              </Text>
            )}
            <TouchableOpacity
              style={[
                ComponentStyles.button.primary,
                styles.continueButton,
                !selectedOption && styles.continueButtonDisabled
              ]}
              onPress={handleContinue}
              disabled={!selectedOption}
            >
              <Text style={ComponentStyles.button.primaryText}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: BrandColors.text,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'ui-rounded',
  },
  subtitle: {
    fontSize: 16,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'ui-rounded',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    color: BrandColors.accent,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
    fontFamily: 'ui-rounded',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: BrandColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    borderWidth: 3,
    borderColor: BrandColors.border,
    alignItems: 'center',
    minHeight: 140,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCardSelected: {
    borderColor: BrandColors.accent,
    backgroundColor: BrandColors.accent + '15',
    borderWidth: 3,
    shadowColor: BrandColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BrandColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionIcon: {
    marginBottom: 8,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text,
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: 'ui-rounded',
  },
  optionTitleSelected: {
    color: BrandColors.accent,
  },
  optionDescription: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
    fontFamily: 'ui-rounded',
  },
  optionDescriptionSelected: {
    color: BrandColors.text,
  },
  optionFeatures: {
    alignItems: 'flex-start',
    width: '100%',
    marginTop: 2,
  },
  featureText: {
    fontSize: 11,
    color: BrandColors.textSecondary,
    marginBottom: 1,
    fontFamily: 'ui-rounded',
  },
  featureTextSelected: {
    color: BrandColors.text,
  },
  buttonContainer: {
    width: '100%',
    paddingTop: 20,
    paddingBottom: 40,
  },
  hintText: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'ui-rounded',
    fontStyle: 'italic',
  },
  continueButton: {
    marginTop: 0,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
});
