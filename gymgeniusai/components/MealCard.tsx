/**
 * Meal Card Component
 * 
 * Displays a single meal from a generated meal plan
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GeneratedMeal } from '@/types/mealPlan';
import { BrandColors } from '@/constants/theme';

interface MealCardProps {
  meal: GeneratedMeal;
  onPress: () => void;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '🌞',
  dinner: '🌙',
  snack: '🍎',
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  dinner: 'DINNER',
  snack: 'SNACK',
};

export function MealCard({ meal, onPress }: MealCardProps) {
  const icon = MEAL_ICONS[meal.mealType] || '🍽️';
  const label = MEAL_LABELS[meal.mealType] || meal.mealType.toUpperCase();
  
  return (
    <View style={styles.container}>
      <View style={[styles.labelRow, { backgroundColor: BrandColors.gray800 }]}>
        <Text style={[styles.icon, styles.labelText]}>{icon}</Text>
        <Text style={[styles.labelText, { color: BrandColors.accent }]}>{label}</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.card, { 
          backgroundColor: BrandColors.gray900,
          borderColor: BrandColors.gray800,
        }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.mealName, { color: BrandColors.text }]} numberOfLines={1}>
            {meal.name}
          </Text>
          <Text style={[styles.arrow, { color: BrandColors.accent }]}>›</Text>
        </View>
        
        <View style={styles.macrosRow}>
          <Text style={[styles.macroText, { color: BrandColors.textSecondary }]}>
            {meal.macros.calories} kcal
          </Text>
          <Text style={[styles.divider, { color: BrandColors.gray700 }]}>|</Text>
          <Text style={[styles.macroText, { color: BrandColors.textSecondary }]}>
            {meal.macros.protein}g P
          </Text>
          <Text style={[styles.divider, { color: BrandColors.gray700 }]}>|</Text>
          <Text style={[styles.macroText, { color: BrandColors.textSecondary }]}>
            {meal.macros.carbs}g C
          </Text>
          <Text style={[styles.divider, { color: BrandColors.gray700 }]}>|</Text>
          <Text style={[styles.macroText, { color: BrandColors.textSecondary }]}>
            {meal.macros.fat}g F
          </Text>
        </View>
        
        {meal.addedToNutrition && (
          <View style={styles.addedBadge}>
            <Text style={[styles.addedText, { color: BrandColors.success }]}>
              ✓ Added to nutrition
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  card: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  arrow: {
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  macroText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    marginHorizontal: 8,
    fontSize: 14,
  },
  addedBadge: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 0, 0.2)',
  },
  addedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

