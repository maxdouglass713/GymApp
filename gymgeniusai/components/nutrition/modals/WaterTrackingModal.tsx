import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface WaterTrackingModalProps {
  visible: boolean;
  onClose: () => void;
  onLogWater: (amount: number, count: number, type: 'bottles' | 'cups') => Promise<void>;
  colors: typeof BrandColors;
}

const BOTTLE_SIZE = 16.9; // Standard water bottle size in oz
const CUP_SIZE = 8; // Standard cup size in oz

export const WaterTrackingModal: React.FC<WaterTrackingModalProps> = ({
  visible,
  onClose,
  onLogWater,
  colors,
}) => {
  const [waterType, setWaterType] = useState<'bottles' | 'cups'>('bottles');
  const [count, setCount] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const handleLog = async () => {
    const num = parseFloat(count);
    if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      Alert.alert('Invalid Amount', `Please enter a valid number of ${waterType}.`);
      return;
    }
    
    const sizePerUnit = waterType === 'bottles' ? BOTTLE_SIZE : CUP_SIZE;
    const totalOz = num * sizePerUnit;
    setIsLogging(true);
    try {
      await onLogWater(totalOz, num, waterType);
      setCount('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to log water. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const sizePerUnit = waterType === 'bottles' ? BOTTLE_SIZE : CUP_SIZE;
  const totalOz = count ? (parseFloat(count) || 0) * sizePerUnit : 0;
  const isValidInput = count && !isNaN(parseFloat(count)) && parseFloat(count) > 0 && Number.isInteger(parseFloat(count));
  const unitLabel = waterType === 'bottles' ? 'bottle' : 'cup';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          style={styles.keyboardView}
        >
          <View 
            style={[styles.modalContainer, { backgroundColor: colors.surface }]}
            onStartShouldSetResponder={() => true}
          >
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={onClose}
                >
                  <Text style={[styles.backButtonText, { color: '#FFFFFF' }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Log Water</Text>
                <View style={styles.headerSpacer} />
              </View>
              
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.content}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.waterIcon}>💧</Text>
                  </View>
                  
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        {
                          backgroundColor: waterType === 'bottles' ? BrandColors.accent : colors.gray800,
                          borderColor: BrandColors.accent,
                        }
                      ]}
                      onPress={() => {
                        setWaterType('bottles');
                        setCount('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        { color: waterType === 'bottles' ? BrandColors.background : colors.text }
                      ]}>
                        Bottles
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        {
                          backgroundColor: waterType === 'cups' ? BrandColors.accent : colors.gray800,
                          borderColor: BrandColors.accent,
                        }
                      ]}
                      onPress={() => {
                        setWaterType('cups');
                        setCount('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        { color: waterType === 'cups' ? BrandColors.background : colors.text }
                      ]}>
                        Cups
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    How many {waterType} did you drink?
                  </Text>
                  
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[
                        styles.input,
                        { 
                          color: colors.text,
                          borderColor: isValidInput ? BrandColors.accent : colors.icon,
                          backgroundColor: colors.background,
                        }
                      ]}
                      value={count}
                      onChangeText={setCount}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={[styles.unitLabel, { color: colors.text }]}>
                      {unitLabel}{count && parseFloat(count) !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  
                  {isValidInput && (
                    <View style={[styles.totalContainer, { backgroundColor: colors.gray800 }]}>
                      <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                        Total: <Text style={[styles.totalAmount, { color: BrandColors.accent }]}>
                          {totalOz.toFixed(1)} oz
                        </Text>
                      </Text>
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      { 
                        backgroundColor: BrandColors.accent,
                        opacity: (isLogging || !isValidInput) ? 0.6 : 1,
                      }
                    ]}
                    onPress={handleLog}
                    disabled={isLogging || !isValidInput}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.saveButtonText}>
                      {isLogging ? 'Logging...' : 'Log Water'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  backButtonText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.medium,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.bold,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.md,
  },
  content: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  waterIcon: {
    fontSize: 56,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    marginBottom: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  input: {
    width: 120,
    height: 60,
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  unitLabel: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.medium,
  },
  totalContainer: {
    width: '100%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  totalLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.regular,
  },
  totalAmount: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.bold,
  },
  saveButton: {
    width: '100%',
    height: 56,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonText: {
    color: BrandColors.background,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.bold,
  },
});

