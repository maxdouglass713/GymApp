import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface MealPlanActionsProps {
  profile: any;
  currentDayNutrition: any;
  selectedPlayerId: string | null;
  isMealPlanCompleted: boolean;
  hasSharedMealPlan: boolean;
  hasMealPlanChanged: boolean;
  onSendMealPlan: () => void;
  onCompleteMealPlan: () => void;
  colors: typeof BrandColors;
}

export const MealPlanActions: React.FC<MealPlanActionsProps> = ({
  profile,
  currentDayNutrition,
  selectedPlayerId,
  isMealPlanCompleted,
  hasSharedMealPlan,
  hasMealPlanChanged,
  onSendMealPlan,
  onCompleteMealPlan,
  colors,
}) => {
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
  
  // Send Meal Plan Button (for coaches)
  const renderSendMealPlanButton = () => {
    if (!isCoach) {
      return null;
    }
    
    if (!selectedPlayerId) {
      return (
        <View style={[styles.sendMealPlanButtonDisabled, { backgroundColor: colors.icon + '40' }]}>
          <Text style={[styles.sendMealPlanButtonText, { color: colors.icon }]}>
            Select a player to create meal plan
          </Text>
        </View>
      );
    }
    
    const completed = (currentDayNutrition?.completedMeals || {}) as { breakfast?: boolean; lunch?: boolean; dinner?: boolean; snacks?: boolean };
    const allMealsCompleted = completed.breakfast &&
      completed.lunch &&
      completed.dinner &&
      completed.snacks;
    
    const hasFoods = currentDayNutrition?.foods && currentDayNutrition.foods.length > 0;
    
    if (allMealsCompleted && hasFoods) {
      return (
        <TouchableOpacity
          style={[styles.sendMealPlanButton, { backgroundColor: colors.tint }]}
          onPress={onSendMealPlan}
          activeOpacity={0.8}
        >
          <Text style={styles.sendMealPlanButtonText}>
            📤 Send Meal Plan to Team
          </Text>
        </TouchableOpacity>
      );
    }
    
    return null;
  };

  // Complete Meal Plan Button (for players)
  const renderCompleteMealPlanButton = () => {
    if (isCoach) {
      return null;
    }
    
    // Show button if:
    // 1. Not completed yet, OR
    // 2. Completed but has been edited (changed from last sent version)
    const shouldShowButton = hasSharedMealPlan && (!isMealPlanCompleted || hasMealPlanChanged);
    
    if (!shouldShowButton) {
      return null;
    }
    
    return (
      <View style={{ marginTop: 16, marginBottom: 8 }}>
        <TouchableOpacity
          style={[styles.completeMealPlanButton, { backgroundColor: BrandColors.success }]}
          onPress={onCompleteMealPlan}
          activeOpacity={0.8}
        >
          <IconSymbol name="checkmark.circle.fill" size={24} color="#FFFFFF" />
          <Text style={styles.completeMealPlanButtonText}>
            {isMealPlanCompleted ? 'Update & Send Changes' : 'Complete & Send to Coach'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      {renderSendMealPlanButton()}
      {renderCompleteMealPlanButton()}
    </>
  );
};

const styles = StyleSheet.create({
  sendMealPlanButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sendMealPlanButtonDisabled: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sendMealPlanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  completeMealPlanButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  completeMealPlanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});

