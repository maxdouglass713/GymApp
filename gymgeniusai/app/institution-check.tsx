import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function InstitutionCheckScreen() {
  const { updateData } = useOnboardingStore();
  const [selectedOption, setSelectedOption] = useState<'personal' | 'institution' | null>(null);

  const handleOptionSelect = (option: 'personal' | 'institution') => {
    // Provide haptic feedback when selecting
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(option);
    updateData({ 
      userType: option,
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
      // Navigate to regular onboarding
      router.replace('/onboarding');
    } else {
      // Navigate to institution setup
      router.replace('/institution-setup');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>How will you be using Kinetic Flow AI?</Text>
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

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === 'institution' && styles.optionCardSelected
            ]}
            onPress={() => handleOptionSelect('institution')}
            activeOpacity={0.7}
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
              Team/Institution Use
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
          </TouchableOpacity>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    flex: 1,
    gap: 20,
    justifyContent: 'center',
  },
  optionCard: {
    backgroundColor: BrandColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 3,
    borderColor: BrandColors.border,
    alignItems: 'center',
    minHeight: 180,
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
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionIcon: {
    marginBottom: 12,
  },
  optionEmoji: {
    fontSize: 40,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text,
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'ui-rounded',
  },
  optionTitleSelected: {
    color: BrandColors.accent,
  },
  optionDescription: {
    fontSize: 13,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
    fontFamily: 'ui-rounded',
  },
  optionDescriptionSelected: {
    color: BrandColors.text,
  },
  optionFeatures: {
    alignItems: 'flex-start',
    width: '100%',
    marginTop: 4,
  },
  featureText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginBottom: 2,
    fontFamily: 'ui-rounded',
  },
  featureTextSelected: {
    color: BrandColors.text,
  },
  buttonContainer: {
    width: '100%',
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
    marginBottom: 20,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
});
