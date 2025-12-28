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
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function InstitutionSetupScreen() {
  // V1.0: Block institution features - redirect immediately
  useEffect(() => {
    const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
    checkFeatureOrShowComingSoon('teamManagement', 'Team & Institution Features');
    // Redirect back after showing alert
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 500);
  }, []);

  const { updateData, data } = useOnboardingStore();
  const [currentStep, setCurrentStep] = useState(0);
  
  // Institution data
  const [institutionRole, setInstitutionRole] = useState<'coach' | 'admin' | 'player' | null>(null);
  const [institutionName, setInstitutionName] = useState('');
  const [teamSize, setTeamSize] = useState<'1-10' | '11-25' | '26-50' | '50+' | null>(null);
  const [institutionSport, setInstitutionSport] = useState('');

  const sportsList = [
    'Football', 'Basketball', 'Soccer', 'Baseball', 'Softball', 'Tennis', 'Volleyball',
    'Swimming', 'Track & Field', 'Cross Country', 'Wrestling', 'Gymnastics', 'Golf',
    'Hockey', 'Lacrosse', 'Rugby', 'Cheerleading', 'Dance', 'Martial Arts', 'Boxing',
    'Weightlifting', 'Powerlifting', 'Bodybuilding', 'Cycling', 'Running', 'Triathlon',
    'Other'
  ];

  const steps = [
    'role',
    'institution',
    'team-size',
    'sport'
  ];

  const handleRoleSelect = (role: 'coach' | 'admin' | 'player') => {
    setInstitutionRole(role);
    updateData({ institutionRole: role });
  };

  const handleTeamSizeSelect = (size: '1-10' | '11-25' | '26-50' | '50+') => {
    setTeamSize(size);
    updateData({ teamSize: size });
  };

  const handleSportSelect = (sport: string) => {
    setInstitutionSport(sport);
    updateData({ institutionSport: sport });
  };

  const handleNext = () => {
    // For players, go directly to team code screen after role selection
    if (institutionRole === 'player' && currentStep === 0) {
      handleFinish();
      return;
    }
    
    // For coaches/admins, continue with normal flow
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

  // Skip steps for players
  const getNextStep = () => {
    if (institutionRole === 'player') {
      // Players only need role selection, then go to player onboarding
      return steps.length; // This will trigger handleFinish
    }
    return currentStep + 1;
  };

  const getPreviousStep = () => {
    if (institutionRole === 'player') {
      // Players can only go back to role selection
      return 0;
    }
    return currentStep - 1;
  };

  const handleFinish = () => {
    // Validate all required fields
    if (!institutionRole) {
      Alert.alert('Missing Information', 'Please select your role.');
      return;
    }
    
    // For players, only require role - they'll enter team code in next step
    if (institutionRole === 'player') {
      updateData({
        institutionRole,
        communityUnlocked: true
      });
      
      // Navigate to player onboarding for team code
      router.replace('/player-onboarding');
      return;
    }
    
    // For coaches/admins, require all fields
    if (!institutionName.trim()) {
      Alert.alert('Missing Information', 'Please enter your institution name.');
      return;
    }
    if (!teamSize) {
      Alert.alert('Missing Information', 'Please select team size.');
      return;
    }
    if (!institutionSport.trim()) {
      Alert.alert('Missing Information', 'Please enter the sport.');
      return;
    }

    // Save institution data for coaches/admins
    updateData({
      institutionRole,
      institutionName: institutionName.trim(),
      teamSize,
      institutionSport: institutionSport.trim(),
      // Unlock community features for institutional users
      communityUnlocked: true
    });

    // Navigate to onboarding with institution context
    router.replace('/onboarding');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return institutionRole !== null;
      case 1: 
        // For players, skip institution name step
        if (institutionRole === 'player') return true;
        return institutionName.trim() !== '';
      case 2: 
        // For players, skip team size step
        if (institutionRole === 'player') return true;
        return teamSize !== null;
      case 3: 
        // For players, skip sport step
        if (institutionRole === 'player') return true;
        return institutionSport.trim() !== '';
      default: return false;
    }
  };

  const renderStep = () => {
    switch (steps[currentStep]) {
      case 'role':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>What's your role?</Text>
            <Text style={styles.subtitle}>
              This determines what features and permissions you'll have access to
            </Text>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  institutionRole === 'coach' && styles.roleCardSelected
                ]}
                onPress={() => handleRoleSelect('coach')}
                activeOpacity={0.8}
              >
                <Text style={styles.roleEmoji}>🏃‍♂️</Text>
                <Text style={[
                  styles.roleTitle,
                  institutionRole === 'coach' && styles.roleTitleSelected
                ]}>
                  Coach
                </Text>
                <Text style={[
                  styles.roleDescription,
                  institutionRole === 'coach' && styles.roleDescriptionSelected
                ]}>
                  Train and manage athletes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleCard,
                  institutionRole === 'admin' && styles.roleCardSelected
                ]}
                onPress={() => handleRoleSelect('admin')}
                activeOpacity={0.8}
              >
                <Text style={styles.roleEmoji}>👨‍💼</Text>
                <Text style={[
                  styles.roleTitle,
                  institutionRole === 'admin' && styles.roleTitleSelected
                ]}>
                  Administrator
                </Text>
                <Text style={[
                  styles.roleDescription,
                  institutionRole === 'admin' && styles.roleDescriptionSelected
                ]}>
                  Oversee multiple teams and programs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleCard,
                  institutionRole === 'player' && styles.roleCardSelected
                ]}
                onPress={() => handleRoleSelect('player')}
                activeOpacity={0.8}
              >
                <Text style={styles.roleEmoji}>⚽</Text>
                <Text style={[
                  styles.roleTitle,
                  institutionRole === 'player' && styles.roleTitleSelected
                ]}>
                  Player/Athlete
                </Text>
                <Text style={[
                  styles.roleDescription,
                  institutionRole === 'player' && styles.roleDescriptionSelected
                ]}>
                  Part of a team or program
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'institution':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>What's your institution name?</Text>
            <Text style={styles.subtitle}>
              Enter the name of your school, organization, or team
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[ComponentStyles.input, styles.textInput]}
                value={institutionName}
                onChangeText={setInstitutionName}
                placeholder="e.g., University of California, Lincoln High School"
                placeholderTextColor={BrandColors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={100}
              />
            </View>
          </View>
        );

      case 'team-size':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>How many team members?</Text>
            <Text style={styles.subtitle}>
              Select the approximate size of your team or program
            </Text>
            
            <View style={styles.optionsContainer}>
              {[
                { value: '1-10', label: '1-10 members' },
                { value: '11-25', label: '11-25 members' },
                { value: '26-50', label: '26-50 members' },
                { value: '50+', label: '50+ members' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sizeCard,
                    teamSize === option.value && styles.sizeCardSelected
                  ]}
                  onPress={() => handleTeamSizeSelect(option.value as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.sizeText,
                    teamSize === option.value && styles.sizeTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'sport':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>What sport or activity?</Text>
            <Text style={styles.subtitle}>
              Select the primary sport or activity for your team
            </Text>
            
            <ScrollView style={styles.sportsScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.sportsGrid}>
                {sportsList.map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.sportCard,
                      institutionSport === sport && styles.sportCardSelected
                    ]}
                    onPress={() => handleSportSelect(sport)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.sportText,
                      institutionSport === sport && styles.sportTextSelected
                    ]}>
                      {sport}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
          {currentStep > 0 && institutionRole !== 'player' && (
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
              {institutionRole === 'player' ? 'Continue to Team Code' : 
               currentStep === steps.length - 1 ? 'Continue to Onboarding' : 'Next'}
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
  roleCard: {
    backgroundColor: BrandColors.cardBackground,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: BrandColors.border,
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: BrandColors.accent,
    backgroundColor: BrandColors.accent + '10',
  },
  roleEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text,
    marginBottom: 8,
    fontFamily: 'ui-rounded',
  },
  roleTitleSelected: {
    color: BrandColors.accent,
  },
  roleDescription: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    fontFamily: 'ui-rounded',
  },
  roleDescriptionSelected: {
    color: BrandColors.text,
  },
  inputContainer: {
    width: '100%',
  },
  textInput: {
    fontSize: 16,
    textAlign: 'center',
  },
  sizeCard: {
    backgroundColor: BrandColors.cardBackground,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: BrandColors.border,
    alignItems: 'center',
  },
  sizeCardSelected: {
    borderColor: BrandColors.accent,
    backgroundColor: BrandColors.accent + '10',
  },
  sizeText: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text,
    fontFamily: 'ui-rounded',
  },
  sizeTextSelected: {
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
  // Sports selection styles
  sportsScrollView: {
    maxHeight: 300,
    width: '100%',
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  sportCard: {
    backgroundColor: BrandColors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: BrandColors.border,
    minWidth: '45%',
    alignItems: 'center',
  },
  sportCardSelected: {
    borderColor: BrandColors.accent,
    backgroundColor: BrandColors.accent + '10',
  },
  sportText: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  sportTextSelected: {
    color: BrandColors.accent,
  },
});
