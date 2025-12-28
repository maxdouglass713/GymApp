import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, NativeSyntheticEvent, NativeScrollEvent, Keyboard, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

interface OnboardingStepProps {
  step: number;
}

export default function OnboardingStep({ step }: OnboardingStepProps) {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const { data, updateData } = useOnboardingStore();

  const renderStep = () => {
    switch (step) {
      case 0:
        // HIDDEN for v1.0 App Store submission - Auto-assign Basic tier
        // Auto-set Basic tier if not already set
        if (!data.subscriptionTier || data.subscriptionTier !== 'basic') {
          updateData({ subscriptionTier: 'basic' });
        }
        // Return null - this step should be skipped entirely
        // The onboarding screen will auto-advance past this step
        return null;
      case 1:
        return (
          <BirthdayStep
            colors={colors}
            data={data}
            updateData={updateData}
          />
        );
      case 2:
        return (
          <HeightStep
            colors={colors}
            data={data}
            updateData={updateData}
          />
        );
      case 3:
        return (
          <WeightStep
            colors={colors}
            data={data}
            updateData={updateData}
          />
        );
      case 4:
        return <SexStep colors={colors} data={data} updateData={updateData} />;
      case 5:
        return <ExperienceStep colors={colors} data={data} updateData={updateData} />;
      case 6:
        return <GoalStep colors={colors} data={data} updateData={updateData} />;
      case 7:
        return <EquipmentStep colors={colors} data={data} updateData={updateData} />;
      case 8:
        return <ScheduleStep colors={colors} data={data} updateData={updateData} />;
      case 9:
        return <InjuriesStep colors={colors} data={data} updateData={updateData} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderStep()}
    </View>
  );
}

// App Use Type Step
function AppUseTypeStep({ colors, data, updateData }: any) {
  const options = [
    {
      value: 'personal' as const,
      label: 'Personal Use',
      description: 'For your own fitness journey',
      icon: 'person.fill',
      iconColor: BrandColors.accent,
      backgroundColor: BrandColors.accent + '20',
    },
    {
      value: 'team_institution' as const,
      label: 'Team & Institution',
      description: 'Coaches managing teams or institutions',
      icon: 'sportscourt.fill',
      iconColor: '#4FC3F7',
      backgroundColor: '#4FC3F7' + '20',
    },
    {
      value: 'gym_trainer' as const,
      label: 'Gym / Personal Trainer',
      description: 'Personal trainers and gyms managing clients',
      icon: 'figure.strengthtraining.traditional',
      iconColor: '#FF6B6B',
      backgroundColor: '#FF6B6B' + '20',
    },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: BrandColors.accent + '30' }]}>
          <IconSymbol name="sparkles" size={32} color={BrandColors.accent} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>What are you using the app for?</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          Choose the option that best describes your use case
        </Text>
      </View>
      
      <View style={styles.genderOptionsContainer}>
        {options.map((option) => {
          const isSelected = data.appUseType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderOptionCard,
                { 
                  backgroundColor: isSelected ? option.backgroundColor : colors.background,
                  borderColor: isSelected ? option.iconColor : colors.gray800,
                  borderWidth: isSelected ? 3 : 1,
                  opacity: option.value !== 'personal' ? 0.5 : 1,
                }
              ]}
              onPress={() => {
                // V1.0: Block team/institution/trainer - only personal use allowed
                if (option.value !== 'personal') {
                  checkFeatureOrShowComingSoon('teamManagement', 'Team & Institution Features');
                    return;
                }
                updateData({ appUseType: option.value });
              }}
              activeOpacity={option.value !== 'personal' ? 1 : 0.7}
              disabled={option.value !== 'personal'}
            >
              {option.value !== 'personal' && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background + 'CC', borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 10 }]}>
                  <IconSymbol name="lock.fill" size={24} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 12, fontWeight: '600' }}>Coming Soon</Text>
                </View>
              )}
              <View style={[
                styles.genderIconCircle,
                {
                  backgroundColor: isSelected 
                    ? option.iconColor
                    : option.backgroundColor,
                }
              ]}>
                <IconSymbol 
                  name={option.icon as any} 
                  size={32} 
                  color={isSelected ? '#fff' : option.iconColor} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.genderOptionLabel,
                  { 
                    color: isSelected ? option.iconColor : colors.text,
                    fontSize: Typography.fontSize.xl,
                    marginBottom: 4,
                  }
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  { 
                    color: isSelected ? colors.text : colors.textSecondary,
                    fontSize: Typography.fontSize.sm,
                  }
                ]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Subscription Tier Step
function SubscriptionTierStep({ colors, data, updateData }: any) {
  // V1.0: Force Basic tier only - disable Pro/Elite upgrades
  // Auto-assign Basic tier if not already set
  useEffect(() => {
    if (!data.subscriptionTier || (data.subscriptionTier !== 'basic')) {
      updateData({ subscriptionTier: 'basic' });
    }
  }, [data.subscriptionTier, updateData]);

  const tiers = [
    {
      value: 'basic' as const,
      label: 'Basic',
      price: '$0/month',
      description: 'AI features with Volts (earned through ads)',
      features: [
        'Track workouts & meals',
        'Basic progress tracking',
        'AI meal plans (5,000 V)',
        'AI workout plans (6,000 V)',
        'Watch ads to earn Volts',
      ],
      icon: 'star.fill',
      iconColor: BrandColors.success,
      backgroundColor: BrandColors.success + '20',
    },
    {
      value: 'pro' as const,
      label: 'Pro',
      price: '$9.99/month',
      description: 'Limited AI access per month',
      features: [
        'Everything in Basic',
        '10 AI meal plans/month',
        '50 AI macro estimations/month',
        '10 AI workout plans/month',
        'No ads',
      ],
      icon: 'sparkles',
      iconColor: BrandColors.info,
      backgroundColor: BrandColors.info + '20',
    },
    {
      value: 'elite' as const,
      label: 'Elite',
      price: '$19.99/month',
      description: 'Unlimited AI access + coach features',
      features: [
        'Everything in Pro',
        'Unlimited AI features',
        'Bulk team plan generation',
        'Player progress summaries',
        'AI coach alerts',
      ],
      icon: 'crown.fill',
      iconColor: BrandColors.accent,
      backgroundColor: BrandColors.accent + '20',
    },
  ];

  return (
    <ScrollView 
      style={styles.tierScrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tierScrollContent}
    >
      <View style={styles.stepContainer}>
        <View style={styles.genderHeader}>
          <View style={[styles.genderIconContainer, { backgroundColor: BrandColors.accent + '30' }]}>
            <IconSymbol name="sparkles" size={32} color={BrandColors.accent} />
          </View>
          <Text style={[styles.genderTitle, { color: colors.text }]}>Choose your subscription tier</Text>
          <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
            Basic tier is available now. Pro and Elite tiers coming soon!
              </Text>
        </View>
        
        <View style={styles.tierCardsContainer}>
          {tiers.map((tier) => {
            const isSelected = data.subscriptionTier === tier.value;
            // V1.0: Lock Pro and Elite tiers - only Basic is available
            const isLocked = tier.value !== 'basic';
            
            return (
              <TouchableOpacity
                key={tier.value}
                style={[
                  styles.tierCard,
                  { 
                    backgroundColor: isSelected ? tier.backgroundColor : colors.background,
                    borderColor: isSelected ? tier.iconColor : colors.gray800,
                    borderWidth: isSelected ? 3 : 1,
                    opacity: isLocked ? 0.5 : 1,
                  }
                ]}
                onPress={() => {
                  if (!isLocked) {
                    updateData({ subscriptionTier: tier.value });
                  } else {
                    // Show "Coming Soon" alert for locked tiers
                    checkFeatureOrShowComingSoon('subscriptionUpgrades', 'Subscription Upgrades');
                  }
                }}
                activeOpacity={isLocked ? 1 : 0.7}
                disabled={isLocked}
              >
                {isLocked && (
                  <View style={[styles.lockedOverlay, { backgroundColor: colors.background + 'CC' }]}>
                    <IconSymbol name="lock.fill" size={24} color={colors.textSecondary} />
                    <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                      Coming Soon
                    </Text>
                  </View>
                )}
                <View style={styles.tierHeader}>
                  <View style={[
                    styles.tierIconContainer,
                    {
                      backgroundColor: isSelected 
                        ? tier.iconColor
                        : tier.backgroundColor,
                    }
                  ]}>
                    <IconSymbol 
                      name={tier.icon as any} 
                      size={24} 
                      color={isSelected ? '#fff' : tier.iconColor} 
                    />
                  </View>
                  <View style={styles.tierTitleContainer}>
                    <Text style={[
                      styles.tierLabel,
                      { 
                        color: isSelected ? tier.iconColor : colors.text,
                        fontSize: Typography.fontSize['2xl'],
                      }
                    ]}>
                      {tier.label}
                    </Text>
                    <Text style={[
                      styles.tierPrice,
                      { 
                        color: isSelected ? tier.iconColor : colors.textSecondary,
                        fontSize: Typography.fontSize.lg,
                      }
                    ]}>
                      {tier.price}
                    </Text>
                  </View>
                </View>
                <Text style={[
                  styles.tierDescription,
                  { 
                    color: colors.textSecondary,
                    fontSize: Typography.fontSize.base,
                    marginTop: Spacing.sm,
                    marginBottom: Spacing.md,
                  }
                ]}>
                  {tier.description}
                </Text>
                <View style={styles.tierFeaturesContainer}>
                  {tier.features.map((feature, index) => (
                    <View key={index} style={styles.tierFeatureRow}>
                      <IconSymbol 
                        name="checkmark.circle.fill" 
                        size={16} 
                        color={isSelected ? tier.iconColor : colors.textSecondary} 
                      />
                      <Text style={[
                        styles.tierFeatureText,
                        { 
                          color: isSelected ? colors.text : colors.textSecondary,
                          fontSize: Typography.fontSize.sm,
                          marginLeft: Spacing.xs,
                        }
                      ]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// Birthday Step
function BirthdayStep({ colors, data, updateData }: any) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState<string>(data.birthday ? (data.birthday.getMonth() + 1).toString() : '');
  const [day, setDay] = useState<string>(data.birthday ? data.birthday.getDate().toString() : '');
  const [year, setYear] = useState<string>(data.birthday ? data.birthday.getFullYear().toString() : '');
  const monthInputRef = useRef<TextInput>(null);
  const dayInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);

  const parsedDate = useMemo(() => {
    if (month && day && year && year.length === 4) {
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      const yearNum = parseInt(year, 10);

      if (
        !Number.isNaN(monthNum) &&
        !Number.isNaN(dayNum) &&
        !Number.isNaN(yearNum) &&
        monthNum >= 1 &&
        monthNum <= 12 &&
        dayNum >= 1 &&
        dayNum <= 31 &&
        yearNum >= 1900 &&
        yearNum <= today.getFullYear()
      ) {
        return { monthNum, dayNum, yearNum };
      }
    }
    return null;
  }, [day, month, today, year]);

  useEffect(() => {
    if (parsedDate) {
      const birthday = new Date(parsedDate.yearNum, parsedDate.monthNum - 1, parsedDate.dayNum);
      updateData({ birthday });
    }
  }, [parsedDate, updateData]);

  const handleMonthChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, '');
    if (cleanedText === '') {
      setMonth('');
      return;
    }

    if (cleanedText.length === 1) {
      setMonth(cleanedText);
      return;
    }

    const nextValue = cleanedText.slice(0, 2);
    const numValue = parseInt(nextValue, 10);
    if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 12) {
      setMonth(nextValue);
      dayInputRef.current?.focus();
    }
  };

  const handleDayChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, '');
    if (cleanedText === '') {
      setDay('');
      return;
    }

    if (cleanedText.length === 1) {
      setDay(cleanedText);
      return;
    }

    const nextValue = cleanedText.slice(0, 2);
    const numValue = parseInt(nextValue, 10);
    if (!Number.isNaN(numValue) && numValue >= 1 && numValue <= 31) {
      setDay(nextValue);
      yearInputRef.current?.focus();
    }
  };

  const handleYearChange = (text: string) => {
    const cleanedText = text.replace(/[^0-9]/g, '');
    if (cleanedText.length <= 4) {
      setYear(cleanedText);
      if (cleanedText.length === 4) {
        Keyboard.dismiss();
      }
    }
  };

  const age = useMemo(() => {
    if (parsedDate) {
      const birthDate = new Date(parsedDate.yearNum, parsedDate.monthNum - 1, parsedDate.dayNum);
      const ageDifference = Math.floor(
        (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      return ageDifference > 0 && ageDifference < 150 ? ageDifference : null;
    }
    return null;
  }, [parsedDate, today]);

  const birthdayColor = '#4FC3F7'; // Light blue

  return (
    <View style={styles.stepContainer}>
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: birthdayColor + '30' }]}>
          <IconSymbol name="calendar" size={32} color={birthdayColor} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>When's your birthday?</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          We'll use this to personalize your fitness recommendations (Optional)
        </Text>
      </View>

      <View style={styles.birthdayContainer}>
        <View style={styles.birthdayInputWrapper}>
          <TextInput
            style={[styles.birthdayInput, { 
              color: colors.text, 
              borderColor: month ? birthdayColor : colors.gray800,
              backgroundColor: colors.background,
              borderWidth: month ? 3 : 1,
            }]}
            ref={monthInputRef}
            value={month}
            onChangeText={handleMonthChange}
            placeholder="MM"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
            autoCorrect={false}
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={() => dayInputRef.current?.focus()}
            blurOnSubmit={false}
          />
          <Text style={[styles.birthdayLabel, { color: month ? birthdayColor : BrandColors.text }]}>Month</Text>
        </View>

        <Text style={[styles.birthdaySeparator, { color: birthdayColor, fontSize: Typography.fontSize['2xl'] }]}>/</Text>

        <View style={styles.birthdayInputWrapper}>
          <TextInput
            style={[styles.birthdayInput, { 
              color: colors.text, 
              borderColor: day ? birthdayColor : colors.gray800,
              backgroundColor: colors.background,
              borderWidth: day ? 3 : 1,
            }]}
            ref={dayInputRef}
            value={day}
            onChangeText={handleDayChange}
            placeholder="DD"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
            autoCorrect={false}
            maxLength={2}
            returnKeyType="next"
            onSubmitEditing={() => yearInputRef.current?.focus()}
            blurOnSubmit={false}
          />
          <Text style={[styles.birthdayLabel, { color: day ? birthdayColor : BrandColors.text }]}>Day</Text>
        </View>

        <Text style={[styles.birthdaySeparator, { color: birthdayColor, fontSize: Typography.fontSize['2xl'] }]}>/</Text>

        <View style={styles.birthdayInputWrapper}>
          <TextInput
            style={[styles.birthdayInputYear, { 
              color: colors.text, 
              borderColor: year && year.length === 4 ? birthdayColor : colors.gray800,
              backgroundColor: colors.background,
              borderWidth: year && year.length === 4 ? 3 : 1,
            }]}
            ref={yearInputRef}
            value={year}
            onChangeText={handleYearChange}
            placeholder="YYYY"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
            autoCorrect={false}
            maxLength={4}
          />
          <Text style={[styles.birthdayLabel, { color: year && year.length === 4 ? birthdayColor : BrandColors.text }]}>Year</Text>
        </View>
      </View>

      {age !== null && age > 0 && (
        <View style={[styles.ageDisplayContainer, { backgroundColor: birthdayColor + '20', borderColor: birthdayColor }]}>
          <IconSymbol name="person.fill" size={20} color={birthdayColor} />
          <Text style={[styles.ageDisplay, { color: birthdayColor }]}>
            Age: {age} years old
          </Text>
        </View>
      )}

    </View>
  );
}

// Height Step
function HeightStep({ colors, data, updateData }: any) {
  const [unit, setUnit] = useState<'ft/in' | 'cm'>(data.height?.unit || 'ft/in');
  const feetInputRef = useRef<TextInput>(null);
  const inchesInputRef = useRef<TextInput>(null);
  const cmInputRef = useRef<TextInput>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelKeyboardDismiss = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const scheduleKeyboardDismiss = useCallback(() => {
    cancelKeyboardDismiss();
    dismissTimeoutRef.current = setTimeout(() => {
      Keyboard.dismiss();
      dismissTimeoutRef.current = null;
    }, 500);
  }, [cancelKeyboardDismiss]);

  useEffect(() => {
    return () => {
      cancelKeyboardDismiss();
    };
  }, [cancelKeyboardDismiss]);

  // Parse existing data or use empty defaults
  const parseExistingHeight = () => {
    if (data.height?.value) {
      if (data.height.unit === 'ft/in') {
        // Match feet and inches, allowing decimals in inches (e.g., "5ft 11.5in")
        const match = data.height.value.match(/(\d+)ft\s*([\d.]+)in/);
        if (match) {
          return { feet: parseInt(match[1]), inches: match[2] };
        }
      } else if (data.height.unit === 'cm') {
        const cmValue = parseFloat(data.height.value);
        if (!isNaN(cmValue)) {
          return { cm: cmValue.toString() };
        }
      }
    }
    return { feet: '', inches: '', cm: '' };
  };

  const existingHeight = parseExistingHeight();
  const [feet, setFeet] = useState<string>(existingHeight.feet?.toString() || '');
  const [inches, setInches] = useState<string>(existingHeight.inches?.toString() || '');
  const [cm, setCm] = useState<string>(existingHeight.cm?.toString() || '');

  // Initialize data into store
  useEffect(() => {
    if (unit === 'ft/in') {
      if (feet && inches) {
        updateData({ height: { value: `${feet}ft ${inches}in`, unit: 'ft/in' } });
      } else {
        updateData({ height: { value: '', unit: 'ft/in' } });
      }
    } else {
      updateData({ height: { value: cm, unit: 'cm' } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, feet, inches, cm]);

  const handleFeetChange = (text: string) => {
    // Allow only numbers
    const cleanedText = text.replace(/[^0-9]/g, '');
    const feetValue = cleanedText.slice(0, 1);
    const numValue = parseInt(feetValue, 10);
    
    // Limit feet to 3-8 range
    if (feetValue === '' || (!Number.isNaN(numValue) && numValue >= 3 && numValue <= 8)) {
      setFeet(feetValue);

      if (feetValue && inches) {
        updateData({ height: { value: `${feetValue}ft ${inches}in`, unit: 'ft/in' } });
      } else if (!feetValue) {
        updateData({ height: { value: '', unit: 'ft/in' } });
      }

      if (feetValue.length === 1) {
        inchesInputRef.current?.focus();
      }
    }
  };

  const handleInchesChange = (text: string) => {
    // Allow numbers and one decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '');
    const parts = cleanedText.split('.');
    
    // Only allow one decimal point
    if (parts.length > 2) {
      return;
    }
    
    // Allow 1 decimal place for inches (e.g., 11.5)
    if (parts[1] && parts[1].length > 1) {
      return;
    }
    
    // Limit to reasonable inches range (0-11.9)
    if (cleanedText === '') {
      setInches('');
      updateData({ height: { value: '', unit: 'ft/in' } });
      cancelKeyboardDismiss();
      return;
    }

    const numValue = parseFloat(cleanedText);
    if (!Number.isNaN(numValue) && numValue >= 0 && numValue < 12) {
      setInches(cleanedText);
      updateData({ height: { value: `${feet}ft ${cleanedText}in`, unit: 'ft/in' } });

      if (feet) {
        scheduleKeyboardDismiss();
      }
    }
  };

  const handleCmChange = (text: string) => {
    // Allow numbers and one decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '');
    const parts = cleanedText.split('.');
    
    // Only allow one decimal point
    if (parts.length > 2) {
      return;
    }
    
    // Allow 1 decimal place for cm (e.g., 173.5)
    if (parts[1] && parts[1].length > 1) {
      return;
    }
    
    // Limit cm to 100-250 range
    if (cleanedText === '') {
      setCm('');
      updateData({ height: { value: '', unit: 'cm' } });
      cancelKeyboardDismiss();
      return;
    }

    const numValue = parseFloat(cleanedText);
    if (!Number.isNaN(numValue) && numValue >= 100 && numValue <= 250) {
      setCm(cleanedText);
      updateData({ height: { value: cleanedText, unit: 'cm' } });
      scheduleKeyboardDismiss();
    }
  };

  const convertFtInToCm = (ft: number, inches: number) => {
    const totalCm = (ft * 30.48) + (inches * 2.54);
    return Math.round(totalCm * 10) / 10; // Round to 1 decimal place
  };
  const convertCmToFtIn = (cm: number) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    // Round inches to 1 decimal place
    const roundedInches = Math.round(inches * 10) / 10;
    return { feet, inches: roundedInches };
  };

  const switchUnit = () => {
    cancelKeyboardDismiss();

    if (unit === 'ft/in') {
      const feetNum = parseInt(feet);
      const inchesNum = parseFloat(inches || '0');
      if (!isNaN(feetNum) && !isNaN(inchesNum)) {
        const convertedCm = convertFtInToCm(feetNum, inchesNum);
        setCm(convertedCm.toString());
        setUnit('cm');
        updateData({ height: { value: convertedCm.toString(), unit: 'cm' } });
      } else {
        // If no valid values, just switch unit and clear fields
        setFeet('');
        setInches('');
        setUnit('cm');
        updateData({ height: { value: '', unit: 'cm' } });
      }
    } else {
      const cmNum = parseFloat(cm);
      if (!isNaN(cmNum)) {
        const converted = convertCmToFtIn(cmNum);
        setFeet(converted.feet.toString());
        setInches(converted.inches.toString());
        setUnit('ft/in');
        updateData({ height: { value: `${converted.feet}ft ${converted.inches}in`, unit: 'ft/in' } });
      } else {
        // If no valid values, just switch unit and clear fields
        setCm('');
        setUnit('ft/in');
        updateData({ height: { value: '', unit: 'ft/in' } });
      }
    }
  };

  const heightColor = '#4FC3F7'; // Light blue

  return (
    <View style={styles.stepContainer}>
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: heightColor + '30' }]}>
          <IconSymbol name="ruler.fill" size={32} color={heightColor} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>What's your height?</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          Enter your height below (e.g., 5'8" or 173 cm)
        </Text>
      </View>

      {unit === 'ft/in' ? (
        <View style={styles.heightInputsContainer}>
          <View style={styles.heightInputRow}>
            <View style={styles.heightInputWrapper}>
              <TextInput
                style={[styles.heightInput, { 
                  color: colors.text, 
                  borderColor: feet ? heightColor : colors.gray800,
                  backgroundColor: colors.background,
                  borderWidth: feet ? 3 : 1,
                }]}
                ref={feetInputRef}
                value={feet}
                onChangeText={handleFeetChange}
                placeholder="—"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
                autoCorrect={false}
                maxLength={1}
                returnKeyType="next"
                onSubmitEditing={() => inchesInputRef.current?.focus()}
              />
              <Text style={[styles.heightLabel, { color: feet ? heightColor : BrandColors.text }]}>FT</Text>
            </View>
            
            <View style={styles.heightInputWrapper}>
              <TextInput
                style={[styles.heightInput, { 
                  color: colors.text, 
                  borderColor: inches ? heightColor : colors.gray800,
                  backgroundColor: colors.background,
                  borderWidth: inches ? 3 : 1,
                }]}
                ref={inchesInputRef}
                value={inches}
                onChangeText={handleInchesChange}
                placeholder="—"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
                autoCorrect={false}
                maxLength={2}
                returnKeyType="done"
                onSubmitEditing={() => {
                  cancelKeyboardDismiss();
                  Keyboard.dismiss();
                }}
              />
              <Text style={[styles.heightLabel, { color: inches ? heightColor : BrandColors.text }]}>INCH</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, { 
              color: colors.text, 
              borderColor: cm ? heightColor : colors.gray800,
              backgroundColor: colors.background,
              borderWidth: cm ? 3 : 1,
            }]}
            ref={cmInputRef}
            value={cm}
            onChangeText={handleCmChange}
            placeholder="—"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
            autoCorrect={false}
            maxLength={3}
            returnKeyType="done"
            onSubmitEditing={() => {
              cancelKeyboardDismiss();
              Keyboard.dismiss();
            }}
          />
          <Text style={[styles.inputLabel, { color: cm ? heightColor : BrandColors.text }]}>
            Centimeters (cm)
          </Text>
        </View>
      )}

      <TouchableOpacity 
        onPress={switchUnit} 
        style={[styles.metricToggle, { 
          backgroundColor: heightColor + '20',
          borderColor: heightColor,
          borderWidth: 1,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          borderRadius: BorderRadius.lg,
        }]} 
        activeOpacity={0.8}
      >
        <IconSymbol name="arrow.left.arrow.right" size={16} color={heightColor} />
        <Text style={{ color: heightColor, marginLeft: Spacing.sm, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold }}>
          {unit === 'ft/in' ? 'Switch to cm' : 'Switch to ft/in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Weight Step
function WeightStep({ colors, data, updateData }: any) {
  const cameFromMetric = (data.height?.unit === 'cm');
  const [unit, setUnit] = useState<'lb' | 'kg'>(data.weight?.unit || (cameFromMetric ? 'kg' : 'lb'));
  const weightInputRef = useRef<TextInput>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Get current weight from daily weights
  const { useWeightStore } = require('@/stores/weightStore');
  const { dailyWeights } = useWeightStore();
  
  // Get most recent weight from daily weights
  const currentWeight = React.useMemo(() => {
    if (dailyWeights && dailyWeights.length > 0) {
      const sorted = [...dailyWeights].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return sorted[0].weight;
    }
    return null;
  }, [dailyWeights]);

  const cancelKeyboardDismiss = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  const scheduleKeyboardDismiss = useCallback(() => {
    cancelKeyboardDismiss();
    dismissTimeoutRef.current = setTimeout(() => {
      Keyboard.dismiss();
      dismissTimeoutRef.current = null;
    }, 500);
  }, [cancelKeyboardDismiss]);

  useEffect(() => {
    return () => {
      cancelKeyboardDismiss();
    };
  }, [cancelKeyboardDismiss]);

  // Parse existing data or use empty defaults
  const parseExistingWeight = () => {
    if (data.weight?.value) {
      const weightValue = parseFloat(data.weight.value);
      if (!isNaN(weightValue)) {
        return { value: weightValue };
      }
    }
    return { value: '' };
  };

  const existingWeight = parseExistingWeight();
  const [weightValue, setWeightValue] = useState<string>(
    existingWeight.value ? existingWeight.value.toString() : ''
  );

  // Initialize data into store
  useEffect(() => {
    updateData({ weight: { value: weightValue, unit: unit } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, weightValue]);

  const handleWeightChange = (text: string) => {
    // Allow only numbers and one decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '');
    const parts = cleanedText.split('.');
    
    // Only allow one decimal point
    if (parts.length > 2) {
      return;
    }
    
    // Allow 1 decimal place for both lb and kg
    if (parts[1] && parts[1].length > 1) {
      return;
    }
    
    setWeightValue(cleanedText);
    updateData({ weight: { value: cleanedText, unit: unit } });

    if (cleanedText) {
      scheduleKeyboardDismiss();
    } else {
      cancelKeyboardDismiss();
    }
  };

  const convertLbToKg = (lbs: number) => +(lbs * 0.453592).toFixed(1);
  const convertKgToLb = (kgs: number) => Math.round(kgs * 2.20462);

  const switchUnit = () => {
    cancelKeyboardDismiss();

    const currentValue = parseFloat(weightValue);
    if (!isNaN(currentValue) && currentValue > 0) {
      if (unit === 'lb') {
        const converted = convertLbToKg(currentValue);
        setWeightValue(converted.toString());
        setUnit('kg');
        updateData({ weight: { value: converted.toString(), unit: 'kg' } });
      } else {
        const converted = convertKgToLb(currentValue);
        setWeightValue(converted.toString());
        setUnit('lb');
        updateData({ weight: { value: converted.toString(), unit: 'lb' } });
      }
    } else {
      // If no valid values, just switch unit and clear field
      setWeightValue('');
      setUnit(unit === 'lb' ? 'kg' : 'lb');
      updateData({ weight: { value: '', unit: unit === 'lb' ? 'kg' : 'lb' } });
    }
  };

  const weightColor = '#4FC3F7'; // Light blue

  return (
    <View style={styles.stepContainer}>
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: weightColor + '30' }]}>
          <IconSymbol name="scalemass.fill" size={32} color={weightColor} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>What's your weight?</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          Used to calculate your BMI and fitness recommendations
        </Text>
        {currentWeight && (
          <View style={[styles.currentWeightContainer, { backgroundColor: weightColor + '20', borderColor: weightColor }]}>
            <IconSymbol name="scalemass.fill" size={16} color={weightColor} />
            <Text style={[styles.currentWeightText, { color: weightColor }]}>
              Current weight: {currentWeight.toFixed(1)} {unit}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            color: colors.text, 
            borderColor: weightValue ? weightColor : colors.gray800,
            backgroundColor: colors.background,
            borderWidth: weightValue ? 3 : 1,
          }]}
          ref={weightInputRef}
          value={weightValue}
          onChangeText={handleWeightChange}
          placeholder={`Enter weight in ${unit}`}
          placeholderTextColor={colors.icon}
          keyboardType="numeric"
          autoCorrect={false}
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={() => {
            cancelKeyboardDismiss();
            Keyboard.dismiss();
          }}
        />
        <Text style={[styles.inputLabel, { color: weightValue ? weightColor : BrandColors.text }]}>
          {unit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
        </Text>
      </View>

      <TouchableOpacity 
        onPress={switchUnit} 
        style={[styles.metricToggle, { 
          backgroundColor: weightColor + '20',
          borderColor: weightColor,
          borderWidth: 1,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.lg,
          borderRadius: BorderRadius.lg,
        }]} 
        activeOpacity={0.8}
      >
        <IconSymbol name="arrow.left.arrow.right" size={16} color={weightColor} />
        <Text style={{ color: weightColor, marginLeft: Spacing.sm, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold }}>
          {unit === 'lb' ? 'Switch to kg' : 'Switch to lb'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Sex Step (Optional)
function SexStep({ colors, data, updateData }: any) {
  const options = [
    { 
      value: 'male', 
      label: 'Male',
      icon: 'person.fill',
      iconColor: '#00D4FF', // Bright blue
      backgroundColor: '#00D4FF20', // Light blue background
    },
    { 
      value: 'female', 
      label: 'Female',
      icon: 'person.fill',
      iconColor: '#FF69B4', // Bright pink
      backgroundColor: '#FF69B420', // Light pink background
    },
  ];

  return (
    <View style={styles.stepContainer}>
      {/* Header with Lightning Bolt Icon */}
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: BrandColors.accent + '30' }]}>
          <IconSymbol name="bolt.fill" size={32} color={BrandColors.accent} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>Choose Your Gender</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          Select Your Gender For Personalized Health And Nutrition Recommendations
        </Text>
      </View>
      
      <View style={styles.genderOptionsContainer}>
        {options.map((option) => {
          const isSelected = data.sex === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderOptionCard,
                { 
                  backgroundColor: isSelected ? option.backgroundColor : colors.background,
                  borderColor: isSelected ? option.iconColor : colors.gray800,
                  borderWidth: isSelected ? 3 : 1,
                }
              ]}
              onPress={() => updateData({ sex: option.value })}
              activeOpacity={0.7}
            >
              <View style={[
                styles.genderIconCircle,
                {
                  backgroundColor: isSelected 
                    ? option.iconColor
                    : option.backgroundColor,
                }
              ]}>
                <IconSymbol 
                  name={option.icon as any} 
                  size={32} 
                  color={isSelected ? '#fff' : option.iconColor} 
                />
              </View>
              <Text style={[
                styles.genderOptionLabel,
                { 
                  color: isSelected ? option.iconColor : colors.text,
                  fontSize: Typography.fontSize.xl,
                }
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Experience Step
function ExperienceStep({ colors, data, updateData }: any) {
  const options = [
    { 
      value: 'beginner', 
      label: 'Beginner', 
      description: 'New to working out',
      icon: 'star.fill',
      iconColor: '#00FF88', // Green
      backgroundColor: '#00FF8820',
    },
    { 
      value: 'intermediate', 
      label: 'Intermediate', 
      description: 'Some experience',
      icon: 'star.fill',
      iconColor: '#FFD700', // Gold
      backgroundColor: '#FFD70020',
    },
    { 
      value: 'advanced', 
      label: 'Advanced', 
      description: 'Experienced lifter',
      icon: 'star.fill',
      iconColor: '#FF6B35', // Orange
      backgroundColor: '#FF6B3520',
    },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: BrandColors.accent + '30' }]}>
          <IconSymbol name="bolt.fill" size={32} color={BrandColors.accent} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>What's your exercise experience?</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          This helps us create the right workout intensity for your fitness level
        </Text>
      </View>
      
      <View style={styles.genderOptionsContainer}>
        {options.map((option) => {
          const isSelected = data.exerciseExperience === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderOptionCard,
                { 
                  backgroundColor: isSelected ? option.backgroundColor : colors.background,
                  borderColor: isSelected ? option.iconColor : colors.gray800,
                  borderWidth: isSelected ? 3 : 1,
                }
              ]}
              onPress={() => updateData({ exerciseExperience: option.value })}
              activeOpacity={0.7}
            >
              <View style={[
                styles.genderIconCircle,
                {
                  backgroundColor: isSelected 
                    ? option.iconColor
                    : option.backgroundColor,
                }
              ]}>
                <IconSymbol 
                  name={option.icon as any} 
                  size={32} 
                  color={isSelected ? '#fff' : option.iconColor} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.genderOptionLabel,
                  { 
                    color: isSelected ? option.iconColor : colors.text,
                    fontSize: Typography.fontSize.xl,
                    marginBottom: 4,
                  }
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  { 
                    color: isSelected ? colors.text : colors.textSecondary,
                    fontSize: Typography.fontSize.sm,
                  }
                ]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Goal Step
function GoalStep({ colors, data, updateData }: any) {
  const options = [
    { 
      value: 'build_muscle', 
      label: 'Build Muscle', 
      description: 'Gain strength and size', 
      icon: 'figure.strengthtraining.traditional',
      iconColor: '#FF6B35', // Orange
      backgroundColor: '#FF6B3520',
    },
    { 
      value: 'lose_fat', 
      label: 'Lose Fat', 
      description: 'Burn calories and lean out', 
      icon: 'flame.fill',
      iconColor: '#FF4500', // Fire orange-red (mix of orange, yellow, red)
      backgroundColor: '#FF450020',
      isFire: true, // Special flag for fire gradient effect
    },
    { 
      value: 'improve_fitness', 
      label: 'Improve Fitness', 
      description: 'General health and endurance', 
      icon: 'heart.fill',
      iconColor: '#DC143C', // Red
      backgroundColor: '#DC143C20',
    },
    { 
      value: 'gain_strength', 
      label: 'Gain Strength', 
      description: 'Lift heavier and get stronger', 
      icon: 'dumbbell.fill',
      iconColor: '#808080', // Gray (like a real dumbbell)
      backgroundColor: '#80808020',
    },
    { 
      value: 'improve_endurance', 
      label: 'Improve Endurance', 
      description: 'Increase stamina and cardio capacity', 
      icon: 'figure.run',
      iconColor: '#00FF88', // Green
      backgroundColor: '#00FF8820',
    },
    { 
      value: 'increase_power', 
      label: 'Increase Power', 
      description: 'Boost explosive athleticism', 
      icon: 'bolt.fill',
      iconColor: BrandColors.accent, // Blue lightning bolt (#00D4FF)
      backgroundColor: BrandColors.accent + '20',
    },
    { 
      value: 'improve_flexibility', 
      label: 'Improve Flexibility', 
      description: 'Enhance mobility and range of motion', 
      icon: 'figure.flexibility',
      iconColor: '#9D4EDD', // Purple
      backgroundColor: '#9D4EDD20',
    },
    { 
      value: 'general_health', 
      label: 'General Health', 
      description: 'Feel better and stay healthy', 
      icon: 'cross.case.fill', // Med kit icon
      iconColor: '#DC143C', // Red med kit
      backgroundColor: '#00FF8820', // Green background
    },
  ];

  const selectedGoals: string[] = Array.isArray(data.goals) ? data.goals : [];
  
  // Debug log to verify goals are loaded
  useEffect(() => {
    if (data.goals && data.goals.length > 0) {
      console.log('✅ GoalStep: Goals loaded:', data.goals);
    } else {
      console.log('⚠️ GoalStep: No goals found in data:', { goals: data.goals, primaryGoal: data.primaryGoal });
    }
  }, [data.goals]);

  const mapGoalToPrimary = (goal?: string) => {
    switch (goal) {
      case 'gain_strength':
      case 'increase_power':
        return 'build_muscle';
      case 'lose_fat':
        return 'lose_fat';
      case 'improve_endurance':
      case 'improve_flexibility':
      case 'general_health':
        return 'improve_fitness';
      case 'build_muscle':
      case 'improve_fitness':
        return goal;
      default:
        return goal as any;
    }
  };

  const toggleGoal = (goal: string) => {
    let updatedGoals: string[];
    if (selectedGoals.includes(goal)) {
      updatedGoals = selectedGoals.filter((g) => g !== goal);
    } else {
      updatedGoals = [...selectedGoals, goal];
    }

    updateData({
      goals: updatedGoals,
      primaryGoal: mapGoalToPrimary(updatedGoals[0]),
    });
  };

  return (
    <View style={styles.stepContainer}>
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: BrandColors.accent + '30' }]}>
          <IconSymbol name="bolt.fill" size={32} color={BrandColors.accent} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>What are your fitness goals?</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          Pick as many as you want—we'll tailor your workouts and nutrition around them
        </Text>
      </View>
      
      <View style={styles.genderOptionsContainer}>
        {options.map((option) => {
          const isSelected = selectedGoals.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderOptionCard,
                { 
                  backgroundColor: isSelected ? (option.value === 'general_health' ? '#00FF8820' : option.backgroundColor) : colors.background,
                  borderColor: isSelected ? (option.value === 'general_health' ? '#00FF88' : option.iconColor) : colors.gray800,
                  borderWidth: isSelected ? 3 : 1,
                }
              ]}
              onPress={() => toggleGoal(option.value)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.genderIconCircle,
                {
                  backgroundColor: isSelected 
                    ? option.iconColor
                    : option.backgroundColor,
                },
                // Special styling for fire icon (Lose Fat)
                option.isFire && {
                  backgroundColor: isSelected 
                    ? '#FF4500' // Fire orange-red
                    : '#FF450020',
                },
                // Special styling for gray dumbbell (Gain Strength)
                option.value === 'gain_strength' && {
                  backgroundColor: isSelected 
                    ? '#808080' // Gray
                    : '#80808020',
                },
                // Special styling for General Health (green background, red icon)
                option.value === 'general_health' && {
                  backgroundColor: isSelected 
                    ? '#00FF88' // Green background
                    : '#00FF8820',
                },
              ]}>
                {option.isFire && isSelected ? (
                  // Fire effect with layered colors (orange, yellow, red)
                  <View style={{ position: 'relative', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ position: 'absolute' }}>
                      <IconSymbol name={option.icon as any} size={32} color="#FFD700" />
                    </View>
                    <View style={{ position: 'absolute' }}>
                      <IconSymbol name={option.icon as any} size={28} color="#FF6B35" />
                    </View>
                    <View style={{ position: 'absolute' }}>
                      <IconSymbol name={option.icon as any} size={24} color="#FF0000" />
                    </View>
                  </View>
                ) : (
                  <IconSymbol 
                    name={option.icon as any} 
                    size={32} 
                    color={isSelected ? (option.value === 'general_health' ? '#DC143C' : (option.value === 'gain_strength' ? '#fff' : '#fff')) : option.iconColor} 
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.genderOptionLabel,
                  { 
                    color: isSelected ? (option.value === 'general_health' ? '#00FF88' : option.iconColor) : colors.text,
                    fontSize: Typography.fontSize.xl,
                    marginBottom: 4,
                  }
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  { 
                    color: isSelected ? colors.text : colors.textSecondary,
                    fontSize: Typography.fontSize.sm,
                  }
                ]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {selectedGoals.length > 0 && (
        <View style={styles.selectedGoalsContainer}>
          <Text style={[styles.selectedGoalsTitle, { color: '#FFFFFF' }]}>Selected goals:</Text>
          <View style={styles.selectedGoalsChips}>
            {selectedGoals.map((goal) => {
              const option = options.find((opt) => opt.value === goal);
              return (
                <View key={`chip-${goal}`} style={[styles.goalChip, { borderColor: BrandColors.accent }]}>
                  <Text style={[styles.goalChipText, { color: '#FFFFFF' }]}>{option?.label || goal}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

// Equipment Step
function EquipmentStep({ colors, data, updateData }: any) {
  const options = [
    { 
      value: 'home_only', 
      label: 'Home Only', 
      description: 'Bodyweight and minimal equipment',
      icon: 'house.fill',
      iconColor: '#9D4EDD', // Purple
      backgroundColor: '#9D4EDD20',
    },
    { 
      value: 'gym_access', 
      label: 'Gym Access', 
      description: 'Full gym equipment available',
      icon: 'dumbbell.fill',
      iconColor: '#00E5FF', // Cyan
      backgroundColor: '#00E5FF20',
    },
    { 
      value: 'both', 
      label: 'Both', 
      description: 'Mix of home and gym workouts',
      icon: 'figure.strengthtraining.traditional',
      iconColor: '#FFB800', // Yellow
      backgroundColor: '#FFB80020',
    },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: BrandColors.accent + '30' }]}>
          <IconSymbol name="bolt.fill" size={32} color={BrandColors.accent} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>What equipment do you have?</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          This helps us create workouts you can actually do with your available equipment
        </Text>
      </View>
      
      <View style={styles.genderOptionsContainer}>
        {options.map((option) => {
          const isSelected = data.equipment === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderOptionCard,
                { 
                  backgroundColor: isSelected ? option.backgroundColor : colors.background,
                  borderColor: isSelected ? option.iconColor : colors.gray800,
                  borderWidth: isSelected ? 3 : 1,
                }
              ]}
              onPress={() => updateData({ equipment: option.value })}
              activeOpacity={0.7}
            >
              <View style={[
                styles.genderIconCircle,
                {
                  backgroundColor: isSelected 
                    ? option.iconColor
                    : option.backgroundColor,
                }
              ]}>
                <IconSymbol 
                  name={option.icon as any} 
                  size={32} 
                  color={isSelected ? '#fff' : option.iconColor} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.genderOptionLabel,
                  { 
                    color: isSelected ? option.iconColor : colors.text,
                    fontSize: Typography.fontSize.xl,
                    marginBottom: 4,
                  }
                ]}>
                  {option.label}
                </Text>
                <Text style={[
                  styles.optionDescription,
                  { 
                    color: isSelected ? colors.text : colors.textSecondary,
                    fontSize: Typography.fontSize.sm,
                  }
                ]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Schedule Step
function ScheduleStep({ colors, data, updateData }: any) {
  const days = [1, 2, 3, 4, 5, 6, 7];
  const dayColor = '#4FC3F7'; // Light blue (same as birthday, height, weight)

  return (
    <View style={styles.stepContainer}>
      <View style={styles.genderHeader}>
        <View style={[styles.genderIconContainer, { backgroundColor: BrandColors.accent + '30' }]}>
          <IconSymbol name="bolt.fill" size={32} color={BrandColors.accent} />
        </View>
        <Text style={[styles.genderTitle, { color: colors.text }]}>How many days per week do you work out?</Text>
        <Text style={[styles.genderSubtitle, { color: colors.textSecondary }]}>
          Choose how often you want to work out each week
        </Text>
      </View>
      
      <View style={styles.daysContainer}>
        {days.map((day) => {
          const isSelected = data.weeklySchedule === day;
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                { 
                  backgroundColor: isSelected ? dayColor : 'transparent',
                  borderColor: dayColor,
                  borderWidth: isSelected ? 3 : 1,
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                }
              ]}
              onPress={() => updateData({ weeklySchedule: day })}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayButtonText,
                { 
                  color: isSelected ? '#FFFFFF' : dayColor,
                  fontSize: Typography.fontSize['2xl'],
                }
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Injuries Step (Optional)
function InjuriesStep({ colors, data, updateData }: any) {
  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>Any injuries or limitations? (Optional)</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        Let us know so we can modify exercises for you and keep you safe
      </Text>
      
      <TextInput
        style={[styles.textArea, { 
          color: '#FFFFFF', 
          borderColor: colors.icon,
          backgroundColor: colors.background 
        }]}
        value={data.injuries}
        onChangeText={(value) => updateData({ injuries: value })}
        placeholder="e.g., knee injury, back pain, shoulder issues..."
        placeholderTextColor="#FFFFFF"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      
    </View>
  );
}

// Nutrition Step (Optional)
function NutritionStep({ colors, data, updateData }: any) {
  const options = [
    { value: 'simple_macros', label: 'Simple Macros', description: 'Just track calories and macros' },
    { value: 'meal_ideas', label: 'Meal Ideas', description: 'Get meal suggestions and recipes' },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>Nutrition preference (Optional)</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        How would you like to approach nutrition and meal planning?
      </Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              { 
                backgroundColor: data.nutritionPreference === option.value ? BrandColors.accent : 'transparent',
                borderColor: BrandColors.accent
              }
            ]}
            onPress={() => updateData({ nutritionPreference: option.value })}
          >
            <Text style={[
              styles.optionButtonText,
              { color: data.nutritionPreference === option.value ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {option.label}
            </Text>
            <Text style={[
              styles.optionDescription,
              { color: data.nutritionPreference === option.value ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Sports Step
function SportsStep({ colors, data, updateData }: any) {
  const handleSelect = (playsSports: boolean) => {
    updateData({ playsSports });
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Do you play sports?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        This helps us customize your workout and nutrition plans
      </Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            { borderColor: colors.icon },
            data.playsSports === true && { borderColor: colors.accent, backgroundColor: colors.accent + '20' }
          ]}
          onPress={() => handleSelect(true)}
        >
          <Text style={[
            styles.optionButtonText,
            { color: colors.text },
            data.playsSports === true && { color: colors.accent }
          ]}>
            Yes
          </Text>
          <Text style={[styles.optionDescription, { color: colors.icon }]}>
            I play one or more sports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            { borderColor: colors.icon },
            data.playsSports === false && { borderColor: colors.accent, backgroundColor: colors.accent + '20' }
          ]}
          onPress={() => handleSelect(false)}
        >
          <Text style={[
            styles.optionButtonText,
            { color: colors.text },
            data.playsSports === false && { color: colors.accent }
          ]}>
            No
          </Text>
          <Text style={[styles.optionDescription, { color: colors.icon }]}>
            I focus on general fitness
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Sport Selection Step
function SportSelectionStep({ colors, data, updateData }: any) {
  const sports = [
    'Basketball', 'Football', 'Soccer', 'Baseball', 'Softball', 'Tennis', 'Volleyball',
    'Swimming', 'Track & Field', 'Cross Country', 'Wrestling', 'Gymnastics', 'Golf',
    'Hockey', 'Lacrosse', 'Rugby', 'Other'
  ];

  const handleSelect = (sport: string) => {
    updateData({ sport });
  };

  // Skip this step if user doesn't play sports
  if (data.playsSports === false) {
    return null;
  }

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Which sport do you play?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        Select your primary sport
      </Text>
      
      <ScrollView style={styles.sportsList} showsVerticalScrollIndicator={false}>
        {sports.map((sport) => (
          <TouchableOpacity
            key={sport}
            style={[
              styles.sportOption,
              { borderColor: colors.icon },
              data.sport === sport && { borderColor: colors.accent, backgroundColor: colors.accent + '20' }
            ]}
            onPress={() => handleSelect(sport)}
          >
            <Text style={[
              styles.sportOptionText,
              { color: colors.text },
              data.sport === sport && { color: colors.accent }
            ]}>
              {sport}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Team Step
function TeamStep({ colors, data, updateData }: any) {
  const handleSelect = (isOnTeam: boolean) => {
    updateData({ isOnTeam });
  };

  // Skip this step if user doesn't play sports
  if (data.playsSports === false) {
    return null;
  }

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Are you on a team?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        This unlocks team features like group workouts and leaderboards
      </Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            { borderColor: colors.icon },
            data.isOnTeam === true && { borderColor: colors.accent, backgroundColor: colors.accent + '20' }
          ]}
          onPress={() => handleSelect(true)}
        >
          <Text style={[
            styles.optionButtonText,
            { color: colors.text },
            data.isOnTeam === true && { color: colors.accent }
          ]}>
            Yes
          </Text>
          <Text style={[styles.optionDescription, { color: colors.icon }]}>
            I'm part of a team
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            { borderColor: colors.icon },
            data.isOnTeam === false && { borderColor: colors.accent, backgroundColor: colors.accent + '20' }
          ]}
          onPress={() => handleSelect(false)}
        >
          <Text style={[
            styles.optionButtonText,
            { color: colors.text },
            data.isOnTeam === false && { color: colors.accent }
          ]}>
            No
          </Text>
          <Text style={[styles.optionDescription, { color: colors.icon }]}>
            I play individually
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Team Name Step
function TeamNameStep({ colors, data, updateData }: any) {
  // Skip this step if user is not on a team
  if (data.isOnTeam !== true) {
    return null;
  }

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">What's your team name?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        This helps us connect you with your teammates (Optional)
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            color: colors.text, 
            borderColor: colors.icon,
            backgroundColor: colors.background 
          }]}
          value={data.teamName || ''}
          onChangeText={(value) => updateData({ teamName: value })}
          placeholder="Enter your team name"
          placeholderTextColor={colors.icon}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={50}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingBottom: 56,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'ui-rounded',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
    fontFamily: 'ui-rounded',
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  textInput: {
    width: '100%',
    height: 70,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 20,
    fontSize: 24,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.semibold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputLabel: {
    fontSize: Typography.fontSize.base,
    marginTop: Spacing.md,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.medium,
  },
  // Height input styles
  heightInputsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  heightInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 300,
  },
  heightInputWrapper: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  heightInput: {
    width: '100%',
    height: 70,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 16,
    fontSize: 28,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.bold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heightLabel: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Birthday input styles
  birthdayContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  birthdayInputWrapper: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  birthdayInput: {
    width: 80,
    height: 70,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 8,
    fontSize: 24,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.bold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  birthdayInputYear: {
    width: 110,
    height: 70,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 8,
    fontSize: 24,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.bold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  birthdayLabel: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    fontWeight: '500',
  },
  birthdaySeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  ageDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  ageDisplay: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  // Wheel pickers
  wheelsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    marginBottom: 12,
  },
  wheelContainer: {
    alignItems: 'center',
    width: '40%',
  },
  singleWheelContainer: {
    width: '80%',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  wheelLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  wheel: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  wheelContent: {
    paddingVertical: 60, // for centering first/last
  },
  wheelItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 20,
    fontWeight: '600',
  },
  wheelTextSelected: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: BrandColors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  wheelTextDim: {
    opacity: 0.4,
    fontSize: 16,
    color: '#888888',
  },
  unitSuffix: {
    marginTop: 6,
    fontSize: 12,
  },
  readout: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  metricToggle: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'ui-rounded',
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  selectedGoalsContainer: {
    width: '100%',
    marginTop: 24,
  },
  selectedGoalsTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 12,
    textAlign: 'center',
  },
  selectedGoalsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  goalChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  goalChipText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.md,
  },
  dayButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
  },
  wheelsWrapper: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
  },
  sportsList: {
    maxHeight: 300,
    marginTop: 20,
  },
  sportOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  sportOptionText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  // Gender selection styles
  genderHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  genderIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  genderTitle: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  genderSubtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  genderOptionsContainer: {
    width: '100%',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  genderOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  genderIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  genderOptionLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  currentWeightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  currentWeightText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  // Tier selection styles
  tierScrollView: {
    flex: 1,
    width: '100%',
  },
  tierScrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xl,
  },
  tierCardsContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  tierCard: {
    width: '100%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tierIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  tierTitleContainer: {
    flex: 1,
  },
  tierLabel: {
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  tierPrice: {
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  tierDescription: {
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
  },
  tierFeaturesContainer: {
    marginTop: Spacing.sm,
  },
  tierFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tierFeatureText: {
    fontFamily: Typography.fontFamily,
    flex: 1,
    lineHeight: 20,
  },
  eliteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  eliteBadgeText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    zIndex: 10,
  },
  lockedText: {
    fontFamily: Typography.fontFamily,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

