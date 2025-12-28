import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function TrainerSetupScreen() {
  // V1.0: Block trainer features - redirect immediately
  useEffect(() => {
    const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
    checkFeatureOrShowComingSoon('teamManagement', 'Trainer Features');
    // Redirect back after showing alert
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 500);
  }, []);

  const { updateData, data } = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Trainer data
  const [gymName, setGymName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [clientCountEstimate, setClientCountEstimate] = useState<'1-5' | '6-15' | '16-30' | '30+' | null>(null);

  const specializations = [
    'Weight Loss', 'Muscle Building', 'Athletic Performance', 'Rehabilitation', 
    'General Fitness', 'Powerlifting', 'Bodybuilding', 'Endurance Training',
    'Functional Training', 'Senior Fitness', 'Youth Fitness', 'Online Coaching', 'Other'
  ];

  const steps = [
    'gym-name',
    'specialization',
    'client-count'
  ];

  const handleGymNameChange = (name: string) => {
    setGymName(name);
  };

  const handleSpecializationSelect = (spec: string) => {
    setSpecialization(spec);
    updateData({ institutionName: spec }); // Reuse institutionName for specialization
  };

  const handleClientCountSelect = (count: '1-5' | '6-15' | '16-30' | '30+') => {
    setClientCountEstimate(count);
    updateData({ teamSize: count }); // Reuse teamSize for client count
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
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

  const handleFinish = () => {
    // Validate all required fields
    if (!gymName.trim()) {
      Alert.alert('Missing Information', 'Please enter your gym or business name.');
      return;
    }
    if (!specialization.trim()) {
      Alert.alert('Missing Information', 'Please select your specialization.');
      return;
    }
    if (!clientCountEstimate) {
      Alert.alert('Missing Information', 'Please select your estimated client count.');
      return;
    }

    // Save trainer data
    updateData({
      appUseType: 'gym_trainer', // CRITICAL: Mark as trainer
      institutionRole: 'coach', // Set as coach for compatibility with existing systems
      institutionName: gymName.trim(),
      institutionSport: specialization.trim(), // Reuse institutionSport for specialization
      teamSize: clientCountEstimate,
      // Mark as trainer
      userType: 'institution', // For compatibility with existing coach features
      communityUnlocked: true // Unlock community/client management features
    });

    // Navigate to onboarding with trainer context
    router.replace('/onboarding');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return gymName.trim() !== '';
      case 1: return specialization.trim() !== '';
      case 2: return clientCountEstimate !== null;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (steps[currentStep]) {
      case 'gym-name':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>What's your gym or business name?</Text>
            <Text style={styles.subtitle}>
              Enter the name of your gym, personal training business, or coaching practice
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[ComponentStyles.input, styles.textInput]}
                value={gymName}
                onChangeText={handleGymNameChange}
                placeholder="e.g., FitZone Gym, John's Personal Training"
                placeholderTextColor={BrandColors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={100}
              />
            </View>
          </View>
        );

      case 'specialization':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>What's your specialization?</Text>
            <Text style={styles.subtitle}>
              Select your primary training focus or specialization
            </Text>
            
            <ScrollView style={styles.specializationScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.specializationGrid}>
                {specializations.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={[
                      styles.specializationCard,
                      specialization === spec && styles.specializationCardSelected
                    ]}
                    onPress={() => handleSpecializationSelect(spec)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.specializationText,
                      specialization === spec && styles.specializationTextSelected
                    ]}>
                      {spec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 'client-count':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>How many clients do you manage?</Text>
            <Text style={styles.subtitle}>
              Select the approximate number of clients you currently train or plan to train
            </Text>
            
            <View style={styles.optionsContainer}>
              {[
                { value: '1-5', label: '1-5 clients' },
                { value: '6-15', label: '6-15 clients' },
                { value: '16-30', label: '16-30 clients' },
                { value: '30+', label: '30+ clients' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.countCard,
                    clientCountEstimate === option.value && styles.countCardSelected
                  ]}
                  onPress={() => handleClientCountSelect(option.value as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.countText,
                    clientCountEstimate === option.value && styles.countTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / steps.length) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {renderStep()}

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[ComponentStyles.button.secondary, styles.backButton]}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Text style={ComponentStyles.button.secondaryText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              ComponentStyles.button.primary,
              styles.nextButton,
              !canProceed() && styles.nextButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!canProceed()}
            activeOpacity={0.8}
          >
            <Text style={ComponentStyles.button.primaryText}>
              {currentStep === steps.length - 1 ? 'Continue to Onboarding' : 'Next'}
            </Text>
          </TouchableOpacity>
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: BrandColors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BrandColors.accent,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    fontFamily: 'ui-rounded',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BrandColors.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'ui-rounded',
  },
  subtitle: {
    fontSize: 16,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    fontFamily: 'ui-rounded',
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  inputContainer: {
    width: '100%',
  },
  textInput: {
    fontSize: 16,
    textAlign: 'center',
  },
  countCard: {
    backgroundColor: BrandColors.cardBackground,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: BrandColors.border,
    alignItems: 'center',
  },
  countCardSelected: {
    borderColor: BrandColors.accent,
    backgroundColor: BrandColors.accent + '10',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text,
    fontFamily: 'ui-rounded',
  },
  countTextSelected: {
    color: BrandColors.accent,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 40,
  },
  backButton: {
    flex: 0.4,
  },
  nextButton: {
    flex: 0.55,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  // Specialization selection styles
  specializationScrollView: {
    maxHeight: 300,
    width: '100%',
  },
  specializationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  specializationCard: {
    backgroundColor: BrandColors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: BrandColors.border,
    minWidth: '45%',
    alignItems: 'center',
  },
  specializationCardSelected: {
    borderColor: BrandColors.accent,
    backgroundColor: BrandColors.accent + '10',
  },
  specializationText: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  specializationTextSelected: {
    color: BrandColors.accent,
  },
});

