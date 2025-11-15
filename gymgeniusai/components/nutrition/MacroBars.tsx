import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface MacroBarsProps {
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targetMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  colors: typeof BrandColors;
}

export const MacroBars: React.FC<MacroBarsProps> = ({
  totalMacros,
  targetMacros,
  colors,
}) => {
  const macroData = [
    { key: 'calories', label: 'Calories', current: totalMacros.calories, target: targetMacros.calories, unit: 'kcal' },
    { key: 'protein', label: 'Protein', current: totalMacros.protein, target: targetMacros.protein, unit: 'g' },
    { key: 'carbs', label: 'Carbs', current: totalMacros.carbs, target: targetMacros.carbs, unit: 'g' },
    { key: 'fat', label: 'Fat', current: totalMacros.fat, target: targetMacros.fat, unit: 'g' },
  ];

  return (
    <View style={styles.macroSection}>
      {macroData.map((macro) => {
        const percentage = Math.min((macro.current / macro.target) * 100, 100);
        return (
          <View key={macro.key} style={styles.macroBarContainer}>
            <View style={styles.macroBarHeader}>
              <Text style={[styles.macroBarLabel, { color: colors.text }]}>{macro.label}</Text>
              <Text style={[styles.macroBarValue, { color: colors.text }]}>
                {Math.round(macro.current)} / {macro.target} {macro.unit}
              </Text>
            </View>
            <View style={[styles.macroBarTrack, { backgroundColor: colors.surface }]}>
              <View 
                style={[
                  styles.macroBarFill, 
                  { 
                    backgroundColor: colors.tint,
                    width: `${percentage}%`,
                    minWidth: percentage > 0 ? 2 : 0
                  }
                ]} 
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  macroSection: {
    marginBottom: 20,
  },
  macroBarContainer: {
    marginBottom: 16,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroBarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  macroBarValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  macroBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});

