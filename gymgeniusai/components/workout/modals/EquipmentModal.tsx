import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EXERCISE_DATABASE } from '@/utils/workout/exerciseDatabase';

interface EquipmentModalProps {
  visible: boolean;
  selectedExercise: string;
  availableEquipment: string[];
  onClose: () => void;
  onSelectEquipment: (equipment: string) => void;
}

// Standard equipment options that can be used as alternatives
const STANDARD_EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbell',
  'Smith Machine',
  'Cable',
  'Machine',
  'Kettlebell',
  'Resistance Bands',
  'Trap Bar',
  'Bodyweight',
  'Weighted',
  'Assisted',
];

// Map equipment types to icons
const getEquipmentIcon = (equipment: string): string => {
  const normalized = equipment.toLowerCase();
  if (normalized.includes('barbell')) return 'figure.strengthtraining.traditional';
  if (normalized.includes('dumbbell')) return 'figure.strengthtraining.traditional';
  if (normalized.includes('machine')) return 'gearshape.fill';
  if (normalized.includes('cable')) return 'link';
  if (normalized.includes('bodyweight') || normalized.includes('assisted') || normalized.includes('weighted')) return 'figure.walk';
  if (normalized.includes('smith')) return 'figure.strengthtraining.traditional';
  if (normalized.includes('kettlebell')) return 'figure.strengthtraining.traditional';
  if (normalized.includes('trap bar')) return 'figure.strengthtraining.traditional';
  if (normalized.includes('resistance') || normalized.includes('band')) return 'figure.strengthtraining.traditional';
  if (normalized.includes('plate')) return 'circle.fill';
  return 'figure.strengthtraining.traditional'; // Default icon
};

// Generate brief exercise description
const getExerciseDescription = (exerciseName: string): string => {
  const exerciseData = EXERCISE_DATABASE[exerciseName];
  const muscleGroup = exerciseData?.muscleGroup || '';
  const name = exerciseName.toLowerCase();
  
  // Generate description based on exercise name and muscle group
  if (name.includes('press')) {
    return `Compound ${muscleGroup.toLowerCase()} exercise focusing on pushing strength`;
  }
  if (name.includes('fly') || name.includes('flyes')) {
    return `Isolation ${muscleGroup.toLowerCase()} exercise for muscle definition`;
  }
  if (name.includes('curl')) {
    return `Isolation arm exercise targeting biceps`;
  }
  if (name.includes('squat')) {
    return `Compound leg exercise, the king of lower body movements`;
  }
  if (name.includes('deadlift')) {
    return `Full-body compound exercise for strength and power`;
  }
  if (name.includes('row') || name.includes('pulldown')) {
    return `Pulling exercise targeting ${muscleGroup.toLowerCase()}`;
  }
  if (name.includes('raise')) {
    return `Isolation exercise for ${muscleGroup.toLowerCase()} development`;
  }
  if (name.includes('extension')) {
    return `Isolation exercise targeting triceps`;
  }
  if (name.includes('crunch') || name.includes('sit-up')) {
    return `Core exercise for abdominal strength`;
  }
  if (name.includes('push-up') || name.includes('pushup')) {
    return `Bodyweight ${muscleGroup.toLowerCase()} exercise`;
  }
  
  // Generic description
  return `${muscleGroup} exercise for strength and muscle development`;
};

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  visible,
  selectedExercise,
  availableEquipment,
  onClose,
  onSelectEquipment,
}) => {
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  
  const exerciseData = useMemo(() => EXERCISE_DATABASE[selectedExercise], [selectedExercise]);
  const exerciseDescription = useMemo(() => getExerciseDescription(selectedExercise), [selectedExercise]);
  const muscleGroup = exerciseData?.muscleGroup || '';

  // Get alternative equipment options (exclude already available ones)
  const alternativeEquipment = useMemo(() => {
    const availableLower = availableEquipment.map(eq => eq.toLowerCase());
    return STANDARD_EQUIPMENT_OPTIONS.filter(
      eq => !availableLower.includes(eq.toLowerCase())
    );
  }, [availableEquipment]);

  const handleOtherPress = () => {
    setShowOtherOptions(true);
  };

  const handleAlternativeEquipmentSelect = (equipment: string) => {
    setShowOtherOptions(false);
    onSelectEquipment(equipment);
  };

  const handleBackFromOther = () => {
    setShowOtherOptions(false);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: BrandColors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
            {showOtherOptions ? 'Other Equipment' : 'Select Equipment'}
          </Text>
          {showOtherOptions ? (
            <TouchableOpacity onPress={handleBackFromOther} style={styles.closeButtonContainer}>
              <IconSymbol name="chevron.left" size={24} color={BrandColors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose} style={styles.closeButtonContainer}>
              <IconSymbol name="xmark.circle.fill" size={24} color={BrandColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {!showOtherOptions ? (
            <>
              {/* Exercise Info Card */}
              <View style={[styles.exerciseInfoCard, { 
                backgroundColor: BrandColors.gray800,
                borderColor: BrandColors.accent + '40'
              }]}>
                <View style={styles.exerciseHeader}>
                  <View style={[styles.exerciseIconContainer, { backgroundColor: BrandColors.accent + '20' }]}>
                    <IconSymbol name="figure.strengthtraining.traditional" size={32} color={BrandColors.accent} />
                  </View>
                  <View style={styles.exerciseTextContainer}>
                    <Text style={[styles.exerciseName, { color: BrandColors.text }]}>
                      {selectedExercise}
                    </Text>
                    {muscleGroup && (
                      <Text style={[styles.muscleGroupLabel, { color: BrandColors.accent }]}>
                        {muscleGroup}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.exerciseDescription, { color: BrandColors.textSecondary }]}>
                  {exerciseDescription}
                </Text>
              </View>

              {/* Equipment Selection */}
              <Text style={[styles.equipmentSectionTitle, { color: BrandColors.text }]}>
                Available Equipment
              </Text>
              
              <View style={styles.equipmentGrid}>
                {availableEquipment.map((equipment, index) => {
                  const icon = getEquipmentIcon(equipment);
                  return (
                    <TouchableOpacity
                      key={`equipment-${equipment}-${index}`}
                      style={[
                        styles.equipmentCard,
                        { 
                          backgroundColor: BrandColors.gray800,
                          borderColor: BrandColors.textSecondary + '30'
                        }
                      ]}
                      onPress={() => onSelectEquipment(equipment)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.equipmentIconContainer, { backgroundColor: BrandColors.accent + '15' }]}>
                        <IconSymbol name={icon as any} size={28} color={BrandColors.accent} />
                      </View>
                      <Text style={[styles.equipmentName, { color: BrandColors.text }]}>
                        {equipment}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                
                {/* Other Button */}
                {alternativeEquipment.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.equipmentCard,
                      styles.otherButtonCard,
                      { 
                        backgroundColor: BrandColors.accent + '15',
                        borderColor: BrandColors.accent + '50',
                        borderWidth: 2
                      }
                    ]}
                    onPress={handleOtherPress}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.equipmentIconContainer, { backgroundColor: BrandColors.accent + '30' }]}>
                      <IconSymbol name="ellipsis.circle.fill" size={28} color={BrandColors.accent} />
                    </View>
                    <Text style={[styles.equipmentName, { color: BrandColors.accent, fontWeight: Typography.fontWeight.semibold }]}>
                      Other
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Alternative Equipment Options */}
              <Text style={[styles.equipmentSectionTitle, { color: BrandColors.text }]}>
                Alternative Equipment Options
              </Text>
              <Text style={[styles.otherDescription, { color: BrandColors.textSecondary }]}>
                Select an alternative way to perform this exercise
              </Text>
              
              <View style={styles.equipmentGrid}>
                {alternativeEquipment.map((equipment, index) => {
                  const icon = getEquipmentIcon(equipment);
                  return (
                    <TouchableOpacity
                      key={`alt-equipment-${equipment}-${index}`}
                      style={[
                        styles.equipmentCard,
                        { 
                          backgroundColor: BrandColors.gray800,
                          borderColor: BrandColors.textSecondary + '30'
                        }
                      ]}
                      onPress={() => handleAlternativeEquipmentSelect(equipment)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.equipmentIconContainer, { backgroundColor: BrandColors.accent + '15' }]}>
                        <IconSymbol name={icon as any} size={28} color={BrandColors.accent} />
                      </View>
                      <Text style={[styles.equipmentName, { color: BrandColors.text }]}>
                        {equipment}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  closeButtonContainer: {
    padding: Spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  exerciseInfoCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  exerciseIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  exerciseTextContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  muscleGroupLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseDescription: {
    fontSize: Typography.fontSize.base,
    lineHeight: 20,
  },
  equipmentSectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'space-between',
  },
  equipmentCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    width: '47%', // Two columns with gap
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  equipmentIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  equipmentName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  otherButtonCard: {
    borderStyle: 'dashed',
  },
  otherDescription: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
});

