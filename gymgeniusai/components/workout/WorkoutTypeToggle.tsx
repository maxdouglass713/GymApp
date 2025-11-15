import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface WorkoutTypeToggleProps {
  workoutType: 'strength' | 'cardio';
  onTypeChange: (type: 'strength' | 'cardio') => void;
}

export const WorkoutTypeToggle: React.FC<WorkoutTypeToggleProps> = ({
  workoutType,
  onTypeChange,
}) => {
  return (
    <View style={styles.workoutTypeToggle}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          { backgroundColor: workoutType === 'strength' ? BrandColors.accent : 'transparent' }
        ]}
        onPress={() => onTypeChange('strength')}
      >
        <Text style={[
          styles.toggleButtonText,
          { color: workoutType === 'strength' ? '#000' : BrandColors.text }
        ]}>
          Strength
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          { backgroundColor: workoutType === 'cardio' ? BrandColors.accent : 'transparent' }
        ]}
        onPress={() => onTypeChange('cardio')}
      >
        <Text style={[
          styles.toggleButtonText,
          { color: workoutType === 'cardio' ? '#000' : BrandColors.text }
        ]}>
          Cardio
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  workoutTypeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

