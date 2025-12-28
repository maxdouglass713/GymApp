import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  findNodeHandle,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { estimateMealMacros } from '@/services/geminiService';
import { AILoadingIndicator } from '@/components/ai/AILoadingIndicator';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { checkFeatureOrShowComingSoon, isFeatureEnabled } from '@/utils/features/featureFlags';

export interface CustomMeal {
  id: string;
  name: string;
  servingSize: string;
  macrosPerServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface CustomMealInput {
  name: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface CustomMealModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (meal: CustomMealInput) => void;
  colors: typeof BrandColors;
}

type WizardStep = 'name' | 'serving' | 'macros' | 'review';

const getInitialFormState = (): CustomMealInput => ({
  name: '',
  servingSize: '1 serving',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
});

export const CustomMealModal: React.FC<CustomMealModalProps> = ({
  visible,
  onClose,
  onSubmit,
  colors,
}) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<WizardStep>('name');
  const [form, setForm] = useState<CustomMealInput>(getInitialFormState());
  const [error, setError] = useState<string | null>(null);
  const [isEstimatingMacros, setIsEstimatingMacros] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { tier, canUseAI } = useSubscriptionStore();
  const currentScrollY = useRef(0);
  const nameInputRef = useRef<TextInput>(null);
  const servingInputRef = useRef<TextInput>(null);
  const caloriesInputRef = useRef<TextInput>(null);
  const proteinInputRef = useRef<TextInput>(null);
  const carbsInputRef = useRef<TextInput>(null);
  const fatInputRef = useRef<TextInput>(null);

  const steps: WizardStep[] = ['name', 'serving', 'macros', 'review'];
  const activeStepIndex = steps.indexOf(step);
  const totalSteps = steps.length;

  const resetState = () => {
    setForm(getInitialFormState());
    setStep('name');
    setError(null);
  };

  const closeModal = () => {
    resetState();
    onClose();
  };

  const handleNext = async () => {
    setError(null);

    switch (step) {
      case 'name': {
        if (!form.name.trim()) {
          setError('Please give your meal a name.');
          return;
        }
        setStep('serving');
        break;
      }
      case 'serving': {
        if (!form.servingSize.trim()) {
          setError('Please specify a serving size.');
          return;
        }
        
        // Try to estimate macros with AI if user has access
        // First check feature flag, then check tier access
        if (checkFeatureOrShowComingSoon('aiMacroEstimation', 'AI Macro Estimation') && canUseAI('macroEstimation') && form.name.trim()) {
          setIsEstimatingMacros(true);
          try {
            const estimatedMacros = await estimateMealMacros(form.name, form.servingSize);
            if (estimatedMacros) {
              setForm({
                ...form,
                calories: estimatedMacros.calories,
                protein: estimatedMacros.protein,
                carbs: estimatedMacros.carbs,
                fat: estimatedMacros.fat,
              });
              Alert.alert(
                '✨ AI Macro Estimation',
                'Macros have been pre-filled using AI! You can adjust them if needed.',
                [{ text: 'OK' }]
              );
            }
          } catch (error: any) {
            console.error('Error estimating macros:', error);
            // Don't show error if it's just a tier/permission issue - user can still proceed
            if (!error.message?.includes('Upgrade') && !error.message?.includes('Insufficient')) {
              Alert.alert('AI Estimation Unavailable', 'Proceeding with manual entry.');
            }
          } finally {
            setIsEstimatingMacros(false);
          }
        }
        
        setStep('macros');
        break;
      }
      case 'macros': {
        if (form.calories <= 0 || form.protein < 0 || form.carbs < 0 || form.fat < 0) {
          setError('Please enter valid macro values (calories must be > 0).');
          return;
        }
        setStep('review');
        break;
      }
      case 'review': {
        onSubmit(form);
        closeModal();
        break;
      }
    }
  };

  const handleBack = () => {
    if (step === 'name') {
      closeModal();
    } else {
      const currentIndex = steps.indexOf(step);
      setStep(steps[currentIndex - 1]);
      setError(null);
    }
  };

  const handleInputFocus = (inputRef: React.RefObject<TextInput>) => {
    // Small delay to ensure keyboard is shown
    setTimeout(() => {
      if (inputRef.current && scrollViewRef.current) {
        const inputHandle = findNodeHandle(inputRef.current);
        
        if (inputHandle) {
          // Use React Native's built-in scroll responder to keep input visible
          // This automatically follows the cursor and keeps it visible above keyboard
          const scrollResponder = scrollViewRef.current as any;
          scrollResponder?.scrollResponderScrollNativeHandleToKeyboard?.(
            inputHandle, 
            200, // Offset to keep input well above keyboard
            true // Animated
          );
        } else {
          // Fallback: measure and scroll to keep input visible
          inputRef.current.measureInWindow((x, y, width, height) => {
            scrollViewRef.current?.measureInWindow((scrollX, scrollY, scrollWidth, scrollHeight) => {
              const keyboardHeight = 400; // Keyboard height estimate
              const visibleAreaHeight = scrollHeight - keyboardHeight;
              const inputTop = y;
              const inputBottom = y + height;
              const visibleBottom = scrollY + visibleAreaHeight;
              
              // Calculate relative position within scroll view
              const relativeY = inputTop - scrollY;
              
              // If input is below visible area (accounting for keyboard), scroll down
              if (inputBottom > visibleBottom) {
                const scrollNeeded = inputBottom - visibleBottom + 150; // Add padding
                const currentScroll = currentScrollY.current;
                const newScrollY = currentScroll + scrollNeeded;
                
                scrollViewRef.current?.scrollTo({
                  y: newScrollY,
                  animated: true,
                });
                currentScrollY.current = newScrollY;
              } else if (inputTop < scrollY + 150) {
                // If input is too close to top, only scroll up if it's really necessary
                // But prioritize keeping it visible above keyboard
                const scrollUp = Math.max(0, relativeY - 100);
                scrollViewRef.current?.scrollTo({
                  y: scrollUp,
                  animated: true,
                });
                currentScrollY.current = scrollUp;
              }
              // If input is already in a good visible position, don't scroll
            });
          });
        }
      }
    }, 250);
  };

  const renderStepContent = () => {
    switch (step) {
      case 'name':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>What's the meal name?</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              Give your custom meal a descriptive name
            </Text>
            <TextInput
              ref={nameInputRef}
              style={[styles.textInput, { color: colors.text, borderColor: colors.gray700, backgroundColor: colors.surface }]}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="e.g., My Protein Smoothie"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              onFocus={() => handleInputFocus(nameInputRef)}
            />
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.accent, marginTop: Spacing.md }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextButtonText, { color: colors.background }]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'serving':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Serving Size</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              How is this meal typically measured?
            </Text>
            <TextInput
              ref={servingInputRef}
              style={[styles.textInput, { color: colors.text, borderColor: colors.gray700, backgroundColor: colors.surface }]}
              value={form.servingSize}
              onChangeText={(text) => setForm({ ...form, servingSize: text })}
              placeholder="e.g., 1 cup, 1 piece, 100g"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              onFocus={() => handleInputFocus(servingInputRef)}
            />
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.accent, marginTop: Spacing.md }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextButtonText, { color: colors.background }]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'macros':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Macro Information</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {isEstimatingMacros 
                ? 'AI is estimating macros...' 
                : canUseAI('macroEstimation') && form.calories === 0 && form.protein === 0 && form.carbs === 0 && form.fat === 0
                  ? 'Enter the nutritional information per serving, or let AI estimate for you'
                  : canUseAI('macroEstimation') && (form.calories > 0 || form.protein > 0 || form.carbs > 0 || form.fat > 0)
                    ? 'Macros have been pre-filled by AI. Adjust if needed.'
                    : 'Enter the nutritional information per serving'}
            </Text>
            
            {/* Inline AI Estimation Button */}
            {isFeatureEnabled('aiMacroEstimation') && canUseAI('macroEstimation') && form.name.trim() && form.servingSize.trim() && 
             form.calories === 0 && form.protein === 0 && form.carbs === 0 && form.fat === 0 && !isEstimatingMacros && (
              <TouchableOpacity
                style={[styles.aiEstimateButton, { 
                  backgroundColor: colors.accent + '15',
                  borderColor: colors.accent,
                }]}
                onPress={async () => {
                  // Check feature flag - show "Coming Soon" if AI is disabled
                  if (!checkFeatureOrShowComingSoon('aiMacroEstimation', 'AI Macro Estimation')) {
                    return;
                  }
                  setIsEstimatingMacros(true);
                  try {
                    const estimatedMacros = await estimateMealMacros(form.name, form.servingSize);
                    if (estimatedMacros) {
                      setForm({
                        ...form,
                        calories: estimatedMacros.calories,
                        protein: estimatedMacros.protein,
                        carbs: estimatedMacros.carbs,
                        fat: estimatedMacros.fat,
                      });
                      Alert.alert(
                        '✨ AI Macro Estimation',
                        'Macros have been estimated! You can adjust them if needed.',
                        [{ text: 'OK' }]
                      );
                    }
                  } catch (error: any) {
                    console.error('Error estimating macros:', error);
                    if (!error.message?.includes('Upgrade') && !error.message?.includes('Insufficient')) {
                      Alert.alert('AI Estimation Unavailable', 'Unable to estimate macros at this time.');
                    }
                  } finally {
                    setIsEstimatingMacros(false);
                  }
                }}
                activeOpacity={0.7}
              >
                <IconSymbol name="sparkles" size={18} color={colors.accent} />
                <Text style={[styles.aiEstimateButtonText, { color: colors.accent }]}>
                  Let AI estimate macros
                </Text>
              </TouchableOpacity>
            )}
            
            {isEstimatingMacros && (
              <View style={{ marginVertical: Spacing.md, alignItems: 'center' }}>
                <AILoadingIndicator message="Estimating macros..." size="small" />
              </View>
            )}
            
            <View style={styles.macroInputGroup}>
              <Text style={[styles.macroLabel, { color: '#FF6B35' }]}>Calories</Text>
              <TextInput
                ref={caloriesInputRef}
                style={[styles.macroInput, { color: colors.text, borderColor: '#FF6B35', backgroundColor: colors.surface }]}
                value={form.calories.toString()}
                onChangeText={(text) => setForm({ ...form, calories: parseInt(text) || 0 })}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                onFocus={() => handleInputFocus(caloriesInputRef)}
              />
            </View>

            <View style={styles.macroInputGroup}>
              <Text style={[styles.macroLabel, { color: '#DC143C' }]}>Protein (g)</Text>
              <TextInput
                ref={proteinInputRef}
                style={[styles.macroInput, { color: colors.text, borderColor: '#DC143C', backgroundColor: colors.surface }]}
                value={form.protein.toString()}
                onChangeText={(text) => setForm({ ...form, protein: parseInt(text) || 0 })}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                onFocus={() => handleInputFocus(proteinInputRef)}
              />
            </View>

            <View style={styles.macroInputGroup}>
              <Text style={[styles.macroLabel, { color: '#FFD700' }]}>Carbs (g)</Text>
              <TextInput
                ref={carbsInputRef}
                style={[styles.macroInput, { color: colors.text, borderColor: '#FFD700', backgroundColor: colors.surface }]}
                value={form.carbs.toString()}
                onChangeText={(text) => setForm({ ...form, carbs: parseInt(text) || 0 })}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                onFocus={() => handleInputFocus(carbsInputRef)}
              />
            </View>

            <View style={styles.macroInputGroup}>
              <Text style={[styles.macroLabel, { color: '#00FF88' }]}>Fat (g)</Text>
              <TextInput
                ref={fatInputRef}
                style={[styles.macroInput, { color: colors.text, borderColor: '#00FF88', backgroundColor: colors.surface }]}
                value={form.fat.toString()}
                onChangeText={(text) => setForm({ ...form, fat: parseInt(text) || 0 })}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                onFocus={() => handleInputFocus(fatInputRef)}
              />
            </View>
            
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.accent, marginTop: Spacing.xl }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextButtonText, { color: colors.background }]}>
                Next
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 'review':
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Review Your Meal</Text>
            <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.gray700 }]}>
              <Text style={[styles.reviewName, { color: colors.text }]}>{form.name}</Text>
              <Text style={[styles.reviewServing, { color: colors.textSecondary }]}>
                Serving: {form.servingSize}
              </Text>
              <View style={styles.reviewMacros}>
                <View style={styles.reviewMacroItem}>
                  <Text style={[styles.reviewMacroValue, { color: '#FF6B35' }]}>{form.calories}</Text>
                  <Text style={[styles.reviewMacroLabel, { color: colors.textSecondary }]}>Cal</Text>
                </View>
                <View style={styles.reviewMacroItem}>
                  <Text style={[styles.reviewMacroValue, { color: '#DC143C' }]}>{form.protein}g</Text>
                  <Text style={[styles.reviewMacroLabel, { color: colors.textSecondary }]}>Protein</Text>
                </View>
                <View style={styles.reviewMacroItem}>
                  <Text style={[styles.reviewMacroValue, { color: '#FFD700' }]}>{form.carbs}g</Text>
                  <Text style={[styles.reviewMacroLabel, { color: colors.textSecondary }]}>Carbs</Text>
                </View>
                <View style={styles.reviewMacroItem}>
                  <Text style={[styles.reviewMacroValue, { color: '#00FF88' }]}>{form.fat}g</Text>
                  <Text style={[styles.reviewMacroLabel, { color: colors.textSecondary }]}>Fat</Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: colors.gray800 }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Custom Meal</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Step {activeStepIndex + 1} of {totalSteps}
            </Text>
          </View>
        </View>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 400 }]}
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              currentScrollY.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            {renderStepContent()}
          </ScrollView>

          {step === 'review' && (
            <View style={[styles.modalActions, { 
              paddingBottom: Math.max(insets.bottom, 20),
              backgroundColor: colors.background,
            }]}>
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: colors.accent }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={[styles.nextButtonText, { color: colors.background }]}>
                  Create Meal
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  headerRight: {
    flex: 1,
  },
  modalTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '180deg' }],
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 300, // Large padding at bottom to ensure fat input is scrollable above keyboard and button
  },
  errorContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  stepDescription: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
  },
  macroInputGroup: {
    marginBottom: Spacing.md,
  },
  macroLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  macroInput: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  reviewCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  reviewName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  reviewServing: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.md,
  },
  reviewMacros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.md,
  },
  reviewMacroItem: {
    alignItems: 'center',
  },
  reviewMacroValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  reviewMacroLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  modalActions: {
    paddingTop: Spacing.sm,
  },
  nextButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  aiEstimateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  aiEstimateButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
});

