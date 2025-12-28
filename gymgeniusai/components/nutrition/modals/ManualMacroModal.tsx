import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, findNodeHandle } from 'react-native';
import { BrandColors, ComponentStyles, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ManualMacroModalProps {
  visible: boolean;
  manualCalories: string;
  manualProtein: string;
  manualCarbs: string;
  manualFat: string;
  onClose: () => void;
  onCaloriesChange: (value: string) => void;
  onProteinChange: (value: string) => void;
  onCarbsChange: (value: string) => void;
  onFatChange: (value: string) => void;
  onSave: () => void;
  colors: typeof BrandColors;
}

export const ManualMacroModal: React.FC<ManualMacroModalProps> = ({
  visible,
  manualCalories,
  manualProtein,
  manualCarbs,
  manualFat,
  onClose,
  onCaloriesChange,
  onProteinChange,
  onCarbsChange,
  onFatChange,
  onSave,
  colors,
}) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const caloriesInputRef = useRef<TextInput>(null);
  const proteinInputRef = useRef<TextInput>(null);
  const carbsInputRef = useRef<TextInput>(null);
  const fatInputRef = useRef<TextInput>(null);
  
  const handleInputFocus = (inputRef: React.RefObject<TextInput>) => {
    // Delay to ensure keyboard is shown
    setTimeout(() => {
      if (inputRef.current && scrollViewRef.current) {
        const inputHandle = findNodeHandle(inputRef.current);
        
        if (inputHandle) {
          // Use React Native's built-in scroll responder to keep input visible
          const scrollResponder = scrollViewRef.current as any;
          scrollResponder?.scrollResponderScrollNativeHandleToKeyboard?.(
            inputHandle, 
            200, // Increased offset to keep input well above keyboard
            true // Animated
          );
        } else {
          // Fallback: measure and scroll
          inputRef.current.measureInWindow((x, y, width, height) => {
            scrollViewRef.current?.measureInWindow((scrollX, scrollY, scrollWidth, scrollHeight) => {
              const keyboardHeight = 400; // Increased keyboard height estimate
              const visibleAreaHeight = scrollHeight - keyboardHeight;
              const inputTop = y;
              const inputBottom = y + height;
              const visibleBottom = scrollY + visibleAreaHeight;
              
              // If input is below visible area, scroll down significantly
              if (inputBottom > visibleBottom) {
                const scrollNeeded = inputBottom - visibleBottom + 200; // Increased padding
                scrollViewRef.current?.scrollTo({
                  y: scrollNeeded,
                  animated: true,
                });
              } else if (inputTop < scrollY + 100) {
                // If input is too close to top, scroll up slightly
                const relativeY = inputTop - scrollY;
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, relativeY - 150),
                  animated: true,
                });
              }
            });
          });
        }
      }
    }, 250);
  };

  const macroInputs = [
    {
      key: 'calories',
      label: 'Calories',
      value: manualCalories,
      onChange: onCaloriesChange,
      placeholder: '2500',
      unit: 'cal',
      color: '#FF6B35',
      ref: caloriesInputRef,
    },
    {
      key: 'protein',
      label: 'Protein',
      value: manualProtein,
      onChange: onProteinChange,
      placeholder: '150',
      unit: 'g',
      color: '#DC143C',
      ref: proteinInputRef,
    },
    {
      key: 'carbs',
      label: 'Carbs',
      value: manualCarbs,
      onChange: onCarbsChange,
      placeholder: '250',
      unit: 'g',
      color: '#FFD700',
      ref: carbsInputRef,
    },
    {
      key: 'fat',
      label: 'Fat',
      value: manualFat,
      onChange: onFatChange,
      placeholder: '70',
      unit: 'g',
      color: '#00FF88',
      ref: fatInputRef,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: colors.gray800 }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Custom Macro Targets</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Set your daily nutrition goals
            </Text>
          </View>
        </View>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.infoModalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 20) + 400 }]}
          keyboardShouldPersistTaps="handled"
        >
          {macroInputs.map((input) => (
            <View key={input.key} style={styles.macroInputCard}>
              <View style={[styles.macroInputHeader, { borderLeftColor: input.color }]}>
                <View>
                  <Text style={[styles.macroInputLabel, { color: colors.text }]}>{input.label}</Text>
                  <Text style={[styles.macroInputUnit, { color: colors.textSecondary }]}>{input.unit}</Text>
                </View>
              </View>
              <TextInput
                ref={input.ref}
                style={[
                  styles.modalInput, 
                  { 
                    color: colors.text, 
                    borderColor: input.color,
                    backgroundColor: colors.surface,
                  }
                ]}
                value={input.value}
                onChangeText={input.onChange}
                placeholder={input.placeholder}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                onFocus={() => handleInputFocus(input.ref)}
              />
            </View>
          ))}
          
          <View style={styles.modalActionsContainer}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
              onPress={onSave}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveButtonText, { color: colors.background }]}>Save Targets</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
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
    marginBottom: Spacing.md,
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
  infoModalContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.lg,
  },
  macroInputCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'transparent',
  },
  macroInputHeader: {
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 3,
  },
  macroInputLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  macroInputUnit: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  modalInput: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  modalActionsContainer: {
    paddingTop: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  saveButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
});

