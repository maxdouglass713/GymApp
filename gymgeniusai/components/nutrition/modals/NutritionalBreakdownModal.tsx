import React, { useMemo } from 'react';
import { View, Text, Modal, ScrollView, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import type { FoodItem, MicroNutrients } from '@/stores/nutritionStore';

interface NutritionalBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  foods: FoodItem[];
  colors: typeof BrandColors;
}

export const NutritionalBreakdownModal: React.FC<NutritionalBreakdownModalProps> = ({
  visible,
  onClose,
  foods,
  colors,
}) => {
  // Calculate totals
  const totals = useMemo(() => {
    const macroTotals = foods.reduce(
      (acc, food) => ({
        calories: acc.calories + (food.totalMacros?.calories || 0),
        protein: acc.protein + (food.totalMacros?.protein || 0),
        carbs: acc.carbs + (food.totalMacros?.carbs || 0),
        fat: acc.fat + (food.totalMacros?.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const microTotals: Partial<MicroNutrients> = {};
    foods.forEach((food) => {
      // Check both totalMicronutrients and calculate from micronutrientsPerServing if needed
      let micros = food.totalMicronutrients;
      if (!micros && food.micronutrientsPerServing && food.servingCount) {
        // Calculate total from per-serving if totalMicronutrients doesn't exist
        micros = {} as MicroNutrients;
        Object.keys(food.micronutrientsPerServing).forEach((key) => {
          const nutrientKey = key as keyof MicroNutrients;
          const perServing = food.micronutrientsPerServing?.[nutrientKey];
          if (perServing !== undefined) {
            (micros as any)[nutrientKey] = perServing * food.servingCount;
          }
        });
      }
      
      if (micros) {
        Object.keys(micros).forEach((key) => {
          const nutrientKey = key as keyof MicroNutrients;
          const value = micros?.[nutrientKey] || 0;
          if (value > 0) {
            microTotals[nutrientKey] = (microTotals[nutrientKey] || 0) + value;
          }
        });
      }
    });

    return { macroTotals, microTotals };
  }, [foods]);

  const formatValue = (value: number | undefined, unit: string): string => {
    if (value === undefined || value === null) return '0' + unit;
    return `${Math.round(value * 10) / 10}${unit}`;
  };

  const microNutrientLabels: Record<keyof MicroNutrients, { label: string; unit: string }> = {
    // Vitamins
    vitaminA: { label: 'Vitamin A', unit: ' mcg RAE' },
    vitaminC: { label: 'Vitamin C', unit: ' mg' },
    vitaminD: { label: 'Vitamin D', unit: ' mcg' },
    vitaminE: { label: 'Vitamin E', unit: ' mg' },
    vitaminK: { label: 'Vitamin K', unit: ' mcg' },
    thiamin: { label: 'Thiamin (B1)', unit: ' mg' },
    riboflavin: { label: 'Riboflavin (B2)', unit: ' mg' },
    niacin: { label: 'Niacin (B3)', unit: ' mg' },
    vitaminB6: { label: 'Vitamin B6', unit: ' mg' },
    folate: { label: 'Folate (B9)', unit: ' mcg' },
    vitaminB12: { label: 'Vitamin B12', unit: ' mcg' },
    // Minerals
    calcium: { label: 'Calcium', unit: ' mg' },
    iron: { label: 'Iron', unit: ' mg' },
    magnesium: { label: 'Magnesium', unit: ' mg' },
    phosphorus: { label: 'Phosphorus', unit: ' mg' },
    potassium: { label: 'Potassium', unit: ' mg' },
    sodium: { label: 'Sodium', unit: ' mg' },
    zinc: { label: 'Zinc', unit: ' mg' },
    copper: { label: 'Copper', unit: ' mg' },
    manganese: { label: 'Manganese', unit: ' mg' },
    selenium: { label: 'Selenium', unit: ' mcg' },
    // Other
    fiber: { label: 'Fiber', unit: ' g' },
    sugar: { label: 'Sugar', unit: ' g' },
    cholesterol: { label: 'Cholesterol', unit: ' mg' },
    saturatedFat: { label: 'Saturated Fat', unit: ' g' },
    transFat: { label: 'Trans Fat', unit: ' g' },
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalOverlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Nutritional Breakdown</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={true}
            indicatorStyle="white" // iOS: Make scroll indicator more visible
            persistentScrollbar={true} // Android: Keep scrollbar visible
          >
            {/* Macro Nutrients Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Macro Nutrients</Text>
              <View style={[styles.macroGrid, { backgroundColor: colors.background }]}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Calories</Text>
                  <Text style={[styles.macroValue, { color: '#FF6B35' }]}>
                    {formatValue(totals.macroTotals.calories, ' cal')}
                  </Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Protein</Text>
                  <Text style={[styles.macroValue, { color: '#DC143C' }]}>
                    {formatValue(totals.macroTotals.protein, 'g')}
                  </Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Carbs</Text>
                  <Text style={[styles.macroValue, { color: '#FFD700' }]}>
                    {formatValue(totals.macroTotals.carbs, 'g')}
                  </Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>Fat</Text>
                  <Text style={[styles.macroValue, { color: '#00FF88' }]}>
                    {formatValue(totals.macroTotals.fat, 'g')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Micro Nutrients Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Micro Nutrients</Text>
              <View style={[styles.microList, { backgroundColor: colors.background }]}>
                {Object.entries(totals.microTotals)
                  .filter(([_, value]) => value !== undefined && value !== null && value > 0)
                  .map(([key, value]) => {
                    const nutrientKey = key as keyof MicroNutrients;
                    const label = microNutrientLabels[nutrientKey];
                    if (!label) return null;
                    return (
                      <View key={key} style={styles.microItem}>
                        <Text style={[styles.microLabel, { color: colors.text }]}>
                          {label.label}
                        </Text>
                        <Text style={[styles.microValue, { color: colors.text }]}>
                          {formatValue(value as number, label.unit)}
                        </Text>
                      </View>
                    );
                  })}
                {Object.keys(totals.microTotals).filter(
                  (key) => totals.microTotals[key as keyof MicroNutrients] !== undefined
                ).length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No micronutrient data available
                  </Text>
                )}
              </View>
            </View>

            {/* Food Items List */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Food Items</Text>
              <View style={styles.foodList}>
                {foods.map((food) => (
                  <View key={food.id} style={[styles.foodItem, { backgroundColor: colors.background }]}>
                    <Text style={[styles.foodName, { color: colors.text }]}>{food.name}</Text>
                    <Text style={[styles.foodServing, { color: colors.textSecondary }]}>
                      {food.servingCount} {food.servingSize}
                    </Text>
                    <Text style={[styles.foodMealType, { color: colors.textSecondary }]}>
                      {food.mealType.charAt(0).toUpperCase() + food.mealType.slice(1)}
                    </Text>
                  </View>
                ))}
                {foods.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No food items logged
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    minHeight: 400, // Ensure minimum height so modal is visible
    paddingBottom: Spacing.xl,
    width: '100%',
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.md,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  macroItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  macroLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  macroValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  microList: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  microItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  microLabel: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
  },
  microValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  foodList: {
    gap: Spacing.sm,
  },
  foodItem: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  foodName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  foodServing: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  foodMealType: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    padding: Spacing.lg,
    fontStyle: 'italic',
  },
});

