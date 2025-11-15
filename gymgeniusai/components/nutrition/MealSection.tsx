import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { SwipeableFoodItem } from './SwipeableFoodItem';

interface MealType {
  key: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  label: string;
  icon: string;
}

interface FoodItem {
  id: string;
  name: string;
  servingCount: number;
  servingSize: string;
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealType: string;
}

interface DailyNutrition {
  foods?: FoodItem[];
  completedMeals?: {
    breakfast?: boolean;
    lunch?: boolean;
    dinner?: boolean;
    snacks?: boolean;
  };
}

interface MealSectionProps {
  mealType: MealType;
  foods: FoodItem[];
  currentDayNutrition: DailyNutrition | null;
  colors: typeof BrandColors;
  profile: any;
  onAddFood: (mealType: string) => void;
  onCompleteMeal: (mealType: string) => void;
  onEditFood: (food: FoodItem) => void;
  onDeleteFood: (food: FoodItem) => void;
  canCompleteMeal?: boolean;
}

export const MealSection: React.FC<MealSectionProps> = ({
  mealType,
  foods,
  currentDayNutrition,
  colors,
  profile,
  onAddFood,
  onCompleteMeal,
  onEditFood,
  onDeleteFood,
  canCompleteMeal = true,
}) => {
  const mealTotals = foods.reduce((totals, food) => ({
    calories: totals.calories + food.totalMacros.calories,
    protein: totals.protein + food.totalMacros.protein,
    carbs: totals.carbs + food.totalMacros.carbs,
    fat: totals.fat + food.totalMacros.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  const isCompleted = ((currentDayNutrition?.completedMeals as any)?.[mealType.key] ?? false);
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
  
  return (
    <View style={styles.mealSection}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealIcon}>{mealType.icon}</Text>
        <Text style={[styles.mealTitle, { color: colors.text }]}>{mealType.label}</Text>
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              borderColor: colors.accent,
              backgroundColor: 'transparent',
            },
          ]}
          onPress={() => onAddFood(mealType.key)}
          activeOpacity={0.8}
        >
          <Text style={[styles.addButtonText, { color: colors.accent }]}>＋</Text>
          <Text style={[styles.addButtonLabel, { color: colors.accent }]}>Add</Text>
        </TouchableOpacity>
        {foods.length > 0 && (
          <Text style={[styles.mealSubtotal, { color: '#FFFFFF' }]}>
            {Math.round(mealTotals.calories)} cal | P: {Math.round(mealTotals.protein)}g | C: {Math.round(mealTotals.carbs)}g | F: {Math.round(mealTotals.fat)}g
          </Text>
        )}
      </View>
      
      {foods.length === 0 ? (
        <Text style={[styles.emptyMealText, { color: '#FFFFFF' }]}>
          No {mealType.label.toLowerCase()} logged yet. Tap + to start.
        </Text>
      ) : (
        <>
          {foods.map((food) => (
            <SwipeableFoodItem 
              key={food.id} 
              food={food} 
              colors={colors}
              onEdit={onEditFood}
              onDelete={onDeleteFood}
            />
          ))}
          
          {isCompleted ? (
            <TouchableOpacity
              style={[ComponentStyles.button.secondary, styles.completeMealButton]}
              onPress={() => onAddFood(mealType.key)}
              activeOpacity={0.8}
            >
              <Text style={ComponentStyles.button.secondaryText}>Edit {mealType.label}</Text>
            </TouchableOpacity>
          ) : canCompleteMeal ? (
            <TouchableOpacity
              style={[ComponentStyles.button.primary, styles.completeMealButton]}
              onPress={() => onCompleteMeal(mealType.key)}
              activeOpacity={0.8}
            >
              <Text style={ComponentStyles.button.primaryText}>
                Complete {mealType.label}{isCoach ? '' : ' +30 V'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[ComponentStyles.button.secondary, styles.completeMealButton, { opacity: 0.7 }]}
              onPress={() => onAddFood(mealType.key)}
              activeOpacity={0.8}
            >
              <Text style={ComponentStyles.button.secondaryText}>Edit {mealType.label}</Text>
              <Text style={[styles.autoCompleteNote, { color: colors.textSecondary }]}>
                Completed automatically for past days
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mealSection: {
    marginBottom: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  mealSubtotal: {
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  addButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyMealText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  completeMealButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  autoCompleteNote: {
    fontSize: 12,
    marginTop: 4,
  },
});

