import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, NativeSyntheticEvent, NativeScrollEvent, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOnboardingStore } from '@/stores/onboardingStore';

interface OnboardingStepProps {
  step: number;
}

export default function OnboardingStep({ step }: OnboardingStepProps) {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const { data, updateData, currentStep, setCurrentStep, totalSteps } = useOnboardingStore();

  const advanceToNextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, setCurrentStep, totalSteps]);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <BirthdayStep
            colors={colors}
            data={data}
            updateData={updateData}
            onComplete={advanceToNextStep}
          />
        );
      case 1:
        return (
          <HeightStep
            colors={colors}
            data={data}
            updateData={updateData}
            onComplete={advanceToNextStep}
          />
        );
      case 2:
        return (
          <WeightStep
            colors={colors}
            data={data}
            updateData={updateData}
            onComplete={advanceToNextStep}
          />
        );
      case 3:
        return <SexStep colors={colors} data={data} updateData={updateData} />;
      case 4:
        return <ExperienceStep colors={colors} data={data} updateData={updateData} />;
      case 5:
        return <GoalStep colors={colors} data={data} updateData={updateData} />;
      case 6:
        return <EquipmentStep colors={colors} data={data} updateData={updateData} />;
      case 7:
        return <ScheduleStep colors={colors} data={data} updateData={updateData} />;
      case 8:
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

// Birthday Step
function BirthdayStep({ colors, data, updateData, onComplete }: any) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState<string>(data.birthday ? (data.birthday.getMonth() + 1).toString() : '');
  const [day, setDay] = useState<string>(data.birthday ? data.birthday.getDate().toString() : '');
  const [year, setYear] = useState<string>(data.birthday ? data.birthday.getFullYear().toString() : '');
  const monthInputRef = useRef<TextInput>(null);
  const dayInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  const triggerAutoAdvance = useCallback(() => {
    if (!onComplete) {
      return;
    }
    cancelAutoAdvance();
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      onComplete();
      autoAdvanceTimeoutRef.current = null;
    }, 500);
  }, [cancelAutoAdvance, onComplete]);

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

  useEffect(() => {
    if (parsedDate) {
      triggerAutoAdvance();
    } else {
      cancelAutoAdvance();
    }

    return cancelAutoAdvance;
  }, [cancelAutoAdvance, parsedDate, triggerAutoAdvance]);

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

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">When's your birthday?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        We'll use this to personalize your fitness recommendations (Optional)
      </Text>

      <View style={styles.birthdayContainer}>
        <View style={styles.birthdayInputWrapper}>
          <TextInput
            style={[styles.birthdayInput, { 
              color: colors.text, 
              borderColor: colors.icon,
              backgroundColor: colors.background 
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
          <Text style={[styles.birthdayLabel, { color: BrandColors.text }]}>Month</Text>
        </View>

        <Text style={[styles.birthdaySeparator, { color: colors.text }]}>/</Text>

        <View style={styles.birthdayInputWrapper}>
          <TextInput
            style={[styles.birthdayInput, { 
              color: colors.text, 
              borderColor: colors.icon,
              backgroundColor: colors.background 
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
          <Text style={[styles.birthdayLabel, { color: BrandColors.text }]}>Day</Text>
        </View>

        <Text style={[styles.birthdaySeparator, { color: colors.text }]}>/</Text>

        <View style={styles.birthdayInputWrapper}>
          <TextInput
            style={[styles.birthdayInputYear, { 
              color: colors.text, 
              borderColor: colors.icon,
              backgroundColor: colors.background 
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
          <Text style={[styles.birthdayLabel, { color: BrandColors.text }]}>Year</Text>
        </View>
      </View>

      {age !== null && age > 0 && (
        <Text style={[styles.ageDisplay, { color: BrandColors.accent }]}>
          Age: {age} years old
        </Text>
      )}

    </View>
  );
}

// Height Step
function HeightStep({ colors, data, updateData, onComplete }: any) {
  const [unit, setUnit] = useState<'ft/in' | 'cm'>(data.height?.unit || 'ft/in');
  const feetInputRef = useRef<TextInput>(null);
  const inchesInputRef = useRef<TextInput>(null);
  const cmInputRef = useRef<TextInput>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const cancelAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  const triggerAutoAdvance = useCallback(() => {
    if (!onComplete) {
      return;
    }
    cancelAutoAdvance();
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      onComplete();
      autoAdvanceTimeoutRef.current = null;
    }, 600);
  }, [cancelAutoAdvance, onComplete]);

  useEffect(() => {
    return () => {
      cancelKeyboardDismiss();
      cancelAutoAdvance();
    };
  }, [cancelAutoAdvance, cancelKeyboardDismiss]);

  // Parse existing data or use empty defaults
  const parseExistingHeight = () => {
    if (data.height?.value) {
      if (data.height.unit === 'ft/in') {
        const match = data.height.value.match(/(\d+)ft\s*(\d+)in/);
        if (match) {
          return { feet: parseInt(match[1]), inches: parseInt(match[2]) };
        }
      } else if (data.height.unit === 'cm') {
        const cmValue = parseInt(data.height.value);
        if (!isNaN(cmValue)) {
          return { cm: cmValue };
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
        triggerAutoAdvance();
      } else if (!feetValue) {
        updateData({ height: { value: '', unit: 'ft/in' } });
        cancelAutoAdvance();
      } else {
        cancelAutoAdvance();
      }

      if (feetValue.length === 1) {
        inchesInputRef.current?.focus();
      }
    } else {
      cancelAutoAdvance();
    }
  };

  const handleInchesChange = (text: string) => {
    // Allow only numbers
    const cleanedText = text.replace(/[^0-9]/g, '');
    const nextValue = cleanedText.slice(0, 2);
    const numValue = parseInt(nextValue, 10);
    
    // Limit inches to 0-11 range
    if (nextValue === '') {
      setInches('');
      updateData({ height: { value: '', unit: 'ft/in' } });
      cancelKeyboardDismiss();
      cancelAutoAdvance();
      return;
    }

    if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 11) {
      setInches(nextValue);
      updateData({ height: { value: `${feet}ft ${nextValue}in`, unit: 'ft/in' } });

      if (feet) {
        scheduleKeyboardDismiss();
        triggerAutoAdvance();
      } else {
        cancelAutoAdvance();
      }
    } else {
      cancelAutoAdvance();
    }
  };

  const handleCmChange = (text: string) => {
    // Allow only numbers
    const cleanedText = text.replace(/[^0-9]/g, '');
    const nextValue = cleanedText.slice(0, 3);
    const numValue = parseInt(nextValue, 10);
    
    // Limit cm to 100-250 range
    if (nextValue === '') {
      setCm('');
      updateData({ height: { value: '', unit: 'cm' } });
      cancelKeyboardDismiss();
      cancelAutoAdvance();
      return;
    }

    if (!Number.isNaN(numValue) && numValue >= 100 && numValue <= 250) {
      setCm(nextValue);
      updateData({ height: { value: nextValue, unit: 'cm' } });
      scheduleKeyboardDismiss();
      triggerAutoAdvance();
    } else {
      cancelAutoAdvance();
    }
  };

  const convertFtInToCm = (ft: number, inches: number) => Math.round((ft * 30.48) + (inches * 2.54));
  const convertCmToFtIn = (cm: number) => {
    const totalInches = Math.round(cm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return { feet, inches };
  };

  const switchUnit = () => {
    cancelKeyboardDismiss();
    cancelAutoAdvance();

    if (unit === 'ft/in') {
      const feetNum = parseInt(feet);
      const inchesNum = parseInt(inches);
      if (!isNaN(feetNum) && !isNaN(inchesNum)) {
        const convertedCm = convertFtInToCm(feetNum, inchesNum);
        setCm(convertedCm.toString());
        setUnit('cm');
        updateData({ height: { value: convertedCm.toString(), unit: 'cm' } });
        triggerAutoAdvance();
      } else {
        // If no valid values, just switch unit and clear fields
        setFeet('');
        setInches('');
        setUnit('cm');
        updateData({ height: { value: '', unit: 'cm' } });
      }
    } else {
      const cmNum = parseInt(cm);
      if (!isNaN(cmNum)) {
        const converted = convertCmToFtIn(cmNum);
        setFeet(converted.feet.toString());
        setInches(converted.inches.toString());
        setUnit('ft/in');
        updateData({ height: { value: `${converted.feet}ft ${converted.inches}in`, unit: 'ft/in' } });
        triggerAutoAdvance();
      } else {
        // If no valid values, just switch unit and clear fields
        setCm('');
        setUnit('ft/in');
        updateData({ height: { value: '', unit: 'ft/in' } });
      }
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">What's your height?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        Enter your height below (e.g., 5'8" or 173 cm)
      </Text>

      {unit === 'ft/in' ? (
        <View style={styles.heightInputsContainer}>
          <View style={styles.heightInputRow}>
            <View style={styles.heightInputWrapper}>
              <TextInput
                style={[styles.heightInput, { 
                  color: colors.text, 
                  borderColor: colors.icon,
                  backgroundColor: colors.background 
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
              <Text style={[styles.heightLabel, { color: BrandColors.text }]}>FT</Text>
            </View>
            
            <View style={styles.heightInputWrapper}>
              <TextInput
                style={[styles.heightInput, { 
                  color: colors.text, 
                  borderColor: colors.icon,
                  backgroundColor: colors.background 
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
              <Text style={[styles.heightLabel, { color: BrandColors.text }]}>INCH</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, { 
              color: colors.text, 
              borderColor: colors.icon,
              backgroundColor: colors.background 
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
          <Text style={[styles.inputLabel, { color: BrandColors.text }]}>
            Centimeters (cm)
          </Text>
        </View>
      )}

      <TouchableOpacity onPress={switchUnit} style={styles.metricToggle} activeOpacity={0.8}>
        <Text style={{ color: '#FFFFFF' }}>
          {unit === 'ft/in' ? 'Switch to cm' : 'Switch to ft/in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Weight Step
function WeightStep({ colors, data, updateData, onComplete }: any) {
  const cameFromMetric = (data.height?.unit === 'cm');
  const [unit, setUnit] = useState<'lb' | 'kg'>(data.weight?.unit || (cameFromMetric ? 'kg' : 'lb'));
  const weightInputRef = useRef<TextInput>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const cancelAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  const triggerAutoAdvance = useCallback(() => {
    if (!onComplete) {
      return;
    }
    cancelAutoAdvance();
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      onComplete();
      autoAdvanceTimeoutRef.current = null;
    }, 600);
  }, [cancelAutoAdvance, onComplete]);

  useEffect(() => {
    return () => {
      cancelKeyboardDismiss();
      cancelAutoAdvance();
    };
  }, [cancelAutoAdvance, cancelKeyboardDismiss]);

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
  const [weightValue, setWeightValue] = useState<string>(existingWeight.value.toString());

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
    
    // Limit decimal places to 1 for kg, 0 for lb
    if (parts[1] && parts[1].length > (unit === 'kg' ? 1 : 0)) {
      return;
    }
    
    setWeightValue(cleanedText);
    updateData({ weight: { value: cleanedText, unit: unit } });

    if (cleanedText) {
      scheduleKeyboardDismiss();
      const numericWeight = parseFloat(cleanedText);
      if (!Number.isNaN(numericWeight) && numericWeight > 0) {
        triggerAutoAdvance();
      } else {
        cancelAutoAdvance();
      }
    } else {
      cancelKeyboardDismiss();
      cancelAutoAdvance();
    }
  };

  const convertLbToKg = (lbs: number) => +(lbs * 0.453592).toFixed(1);
  const convertKgToLb = (kgs: number) => Math.round(kgs * 2.20462);

  const switchUnit = () => {
    cancelKeyboardDismiss();
    cancelAutoAdvance();

    const currentValue = parseFloat(weightValue);
    if (!isNaN(currentValue) && currentValue > 0) {
      if (unit === 'lb') {
        const converted = convertLbToKg(currentValue);
        setWeightValue(converted.toString());
        setUnit('kg');
        updateData({ weight: { value: converted.toString(), unit: 'kg' } });
        triggerAutoAdvance();
      } else {
        const converted = convertKgToLb(currentValue);
        setWeightValue(converted.toString());
        setUnit('lb');
        updateData({ weight: { value: converted.toString(), unit: 'lb' } });
        triggerAutoAdvance();
      }
    } else {
      // If no valid values, just switch unit and clear field
      setWeightValue('');
      setUnit(unit === 'lb' ? 'kg' : 'lb');
      updateData({ weight: { value: '', unit: unit === 'lb' ? 'kg' : 'lb' } });
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">What's your weight?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        Used to calculate your BMI and fitness recommendations
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.textInput, { 
            color: colors.text, 
            borderColor: colors.icon,
            backgroundColor: colors.background 
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
        <Text style={[styles.inputLabel, { color: BrandColors.text }]}>
          {unit === 'lb' ? 'Pounds (lb)' : 'Kilograms (kg)'}
        </Text>
      </View>

      <TouchableOpacity onPress={switchUnit} style={styles.metricToggle} activeOpacity={0.8}>
        <Text style={{ color: '#FFFFFF' }}>{unit === 'lb' ? 'Switch to kg' : 'Switch to lb'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Sex Step (Optional)
function SexStep({ colors, data, updateData }: any) {
  const options = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>Sex (Optional)</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        This helps us personalize your fitness recommendations
      </Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              { 
                backgroundColor: data.sex === option.value ? BrandColors.accent : 'transparent',
                borderColor: BrandColors.accent
              }
            ]}
            onPress={() => updateData({ sex: option.value })}
          >
            <Text style={[
              styles.optionButtonText,
              { color: data.sex === option.value ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Experience Step
function ExperienceStep({ colors, data, updateData }: any) {
  const options = [
    { value: 'beginner', label: 'Beginner', description: 'New to working out' },
    { value: 'intermediate', label: 'Intermediate', description: 'Some experience' },
    { value: 'advanced', label: 'Advanced', description: 'Experienced lifter' },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>What's your exercise experience?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        This helps us create the right workout intensity for your fitness level
      </Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              { 
                backgroundColor: data.exerciseExperience === option.value ? BrandColors.accent : 'transparent',
                borderColor: BrandColors.accent
              }
            ]}
            onPress={() => updateData({ exerciseExperience: option.value })}
          >
            <Text style={[
              styles.optionButtonText,
              { color: data.exerciseExperience === option.value ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {option.label}
            </Text>
            <Text style={[
              styles.optionDescription,
              { color: data.exerciseExperience === option.value ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Goal Step
function GoalStep({ colors, data, updateData }: any) {
  const options = [
    { value: 'build_muscle', label: 'Build Muscle', description: 'Gain strength and size' },
    { value: 'lose_fat', label: 'Lose Fat', description: 'Burn calories and lean out' },
    { value: 'improve_fitness', label: 'Improve Fitness', description: 'General health and endurance' },
    { value: 'gain_strength', label: 'Gain Strength', description: 'Lift heavier and get stronger' },
    { value: 'improve_endurance', label: 'Improve Endurance', description: 'Increase stamina and cardio capacity' },
    { value: 'increase_power', label: 'Increase Power', description: 'Boost explosive athleticism' },
    { value: 'improve_flexibility', label: 'Improve Flexibility', description: 'Enhance mobility and range of motion' },
    { value: 'general_health', label: 'General Health', description: 'Feel better and stay healthy' },
  ];

  const selectedGoals: string[] = Array.isArray(data.goals) ? data.goals : [];

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
      <Text style={[styles.title, { color: colors.text }]}>What are your fitness goals?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        Pick as many as you want—we’ll tailor your workouts and nutrition around them
      </Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const isSelected = selectedGoals.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                { 
                  backgroundColor: isSelected ? BrandColors.accent : 'transparent',
                  borderColor: BrandColors.accent
                }
              ]}
              onPress={() => toggleGoal(option.value)}
            >
              <Text style={[
                styles.optionButtonText,
                { color: isSelected ? '#FFFFFF' : '#FFFFFF' }
              ]}>
                {option.label}
              </Text>
              <Text style={[
                styles.optionDescription,
                { color: isSelected ? '#FFFFFF' : '#FFFFFF' }
              ]}>
                {option.description}
              </Text>
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
    { value: 'home_only', label: 'Home Only', description: 'Bodyweight and minimal equipment' },
    { value: 'gym_access', label: 'Gym Access', description: 'Full gym equipment available' },
    { value: 'both', label: 'Both', description: 'Mix of home and gym workouts' },
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>What equipment do you have?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        This helps us create workouts you can actually do with your available equipment
      </Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              { 
                backgroundColor: data.equipment === option.value ? BrandColors.accent : 'transparent',
                borderColor: BrandColors.accent
              }
            ]}
            onPress={() => updateData({ equipment: option.value })}
          >
            <Text style={[
              styles.optionButtonText,
              { color: data.equipment === option.value ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {option.label}
            </Text>
            <Text style={[
              styles.optionDescription,
              { color: data.equipment === option.value ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {option.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Schedule Step
function ScheduleStep({ colors, data, updateData }: any) {
  const days = [1, 2, 3, 4, 5, 6, 7];

  return (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>How many days per week do you work out?</Text>
      <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>
        Choose how often you want to work out each week
      </Text>
      
      <View style={styles.daysContainer}>
        {days.map((day) => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayButton,
              { 
                backgroundColor: data.weeklySchedule === day ? BrandColors.accent : 'transparent',
                borderColor: BrandColors.accent
              }
            ]}
            onPress={() => updateData({ weeklySchedule: day })}
          >
            <Text style={[
              styles.dayButtonText,
              { color: data.weeklySchedule === day ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {day}
            </Text>
          </TouchableOpacity>
        ))}
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
            styles.optionTitle,
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
            styles.optionTitle,
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
            styles.optionTitle,
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
            styles.optionTitle,
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
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    marginTop: 8,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
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
    height: 60,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    fontWeight: '600',
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
    width: 70,
    height: 60,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    fontSize: 20,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    fontWeight: '600',
  },
  birthdayInputYear: {
    width: 100,
    height: 60,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    fontSize: 20,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    fontWeight: '600',
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
  ageDisplay: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
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
    marginTop: 8,
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
    gap: 12,
  },
  dayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});

