import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: undefined },
  { key: 'lunch', label: 'Lunch', icon: undefined },
  { key: 'dinner', label: 'Dinner', icon: undefined },
  { key: 'snacks', label: 'Snacks', icon: undefined },
] as const;

interface QuickActionsProps {
  onMealSelect: (mealType: string) => void;
  colors: typeof BrandColors;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onMealSelect,
  colors,
}) => {
  return (
    <View style={styles.mealButtonsContainer}>
      {MEAL_TYPES.map((meal) => (
        <TouchableOpacity
          key={meal.key}
          style={[styles.mealButton, { backgroundColor: colors.tint, borderColor: colors.tint }]}
          onPress={() => onMealSelect(meal.key)}
          accessibilityLabel={`Add ${meal.label}`}
          accessibilityRole="button"
        >
          <Text style={[styles.mealButtonText, { color: '#FFFFFF' }]}>Add {meal.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  mealButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  mealButton: {
    flex: 1,
    minWidth: 150,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 56,
  },
  mealButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

