import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { getGoalDescription } from '@/utils/macroCalculator';

interface MacroTargetsCardProps {
  customMacroTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    bmr?: number;
    tdee?: number;
    activityMultiplier?: number;
    basedOnGoal?: string;
  };
  colors: typeof BrandColors;
  onEdit: () => void;
}

export const MacroTargetsCard: React.FC<MacroTargetsCardProps> = ({
  customMacroTargets,
  colors,
  onEdit,
}) => {
  const goalDesc = getGoalDescription(customMacroTargets.basedOnGoal);
  
  return (
    <View style={[styles.personalizedTargetsCard, { backgroundColor: colors.surface, borderColor: colors.tint }]}>
      <View style={styles.personalizedTargetsHeader}>
        <View>
          <Text style={[styles.personalizedTargetsTitle, { color: colors.tint }]}>
            🎯 Daily Macro Targets
          </Text>
          <Text style={[styles.personalizedTargetsSubtitle, { color: colors.icon }]}>
            {goalDesc}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.editMacrosButton, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
          onPress={onEdit}
        >
          <Text style={[styles.editMacrosButtonText, { color: colors.tint }]}>✏️</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.personalizedTargetsNote, { color: colors.icon }]}>
        Based on your height, weight, age, and fitness goal
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  personalizedTargetsCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  personalizedTargetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  editMacrosButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editMacrosButtonText: {
    fontSize: 16,
  },
  personalizedTargetsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  personalizedTargetsSubtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  personalizedTargetsNote: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

