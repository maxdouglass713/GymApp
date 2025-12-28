import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MicroNutrients } from '@/stores/nutritionStore';

interface MicronutrientsDisplayProps {
  micronutrients?: MicroNutrients;
  colors: typeof BrandColors;
}

export const MicronutrientsDisplay: React.FC<MicronutrientsDisplayProps> = ({ 
  micronutrients, 
  colors 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!micronutrients || Object.keys(micronutrients).length === 0) {
    return null;
  }

  // Group micronutrients by category
  const vitamins: Array<{ name: string; value: number; unit: string }> = [];
  const minerals: Array<{ name: string; value: number; unit: string }> = [];
  const other: Array<{ name: string; value: number; unit: string }> = [];

  if (micronutrients.vitaminA !== undefined) vitamins.push({ name: 'Vitamin A', value: micronutrients.vitaminA, unit: 'mcg' });
  if (micronutrients.vitaminC !== undefined) vitamins.push({ name: 'Vitamin C', value: micronutrients.vitaminC, unit: 'mg' });
  if (micronutrients.vitaminD !== undefined) vitamins.push({ name: 'Vitamin D', value: micronutrients.vitaminD, unit: 'mcg' });
  if (micronutrients.vitaminE !== undefined) vitamins.push({ name: 'Vitamin E', value: micronutrients.vitaminE, unit: 'mg' });
  if (micronutrients.vitaminK !== undefined) vitamins.push({ name: 'Vitamin K', value: micronutrients.vitaminK, unit: 'mcg' });
  if (micronutrients.thiamin !== undefined) vitamins.push({ name: 'Thiamin (B1)', value: micronutrients.thiamin, unit: 'mg' });
  if (micronutrients.riboflavin !== undefined) vitamins.push({ name: 'Riboflavin (B2)', value: micronutrients.riboflavin, unit: 'mg' });
  if (micronutrients.niacin !== undefined) vitamins.push({ name: 'Niacin (B3)', value: micronutrients.niacin, unit: 'mg' });
  if (micronutrients.vitaminB6 !== undefined) vitamins.push({ name: 'Vitamin B6', value: micronutrients.vitaminB6, unit: 'mg' });
  if (micronutrients.folate !== undefined) vitamins.push({ name: 'Folate (B9)', value: micronutrients.folate, unit: 'mcg' });
  if (micronutrients.vitaminB12 !== undefined) vitamins.push({ name: 'Vitamin B12', value: micronutrients.vitaminB12, unit: 'mcg' });

  if (micronutrients.calcium !== undefined) minerals.push({ name: 'Calcium', value: micronutrients.calcium, unit: 'mg' });
  if (micronutrients.iron !== undefined) minerals.push({ name: 'Iron', value: micronutrients.iron, unit: 'mg' });
  if (micronutrients.magnesium !== undefined) minerals.push({ name: 'Magnesium', value: micronutrients.magnesium, unit: 'mg' });
  if (micronutrients.phosphorus !== undefined) minerals.push({ name: 'Phosphorus', value: micronutrients.phosphorus, unit: 'mg' });
  if (micronutrients.potassium !== undefined) minerals.push({ name: 'Potassium', value: micronutrients.potassium, unit: 'mg' });
  if (micronutrients.sodium !== undefined) minerals.push({ name: 'Sodium', value: micronutrients.sodium, unit: 'mg' });
  if (micronutrients.zinc !== undefined) minerals.push({ name: 'Zinc', value: micronutrients.zinc, unit: 'mg' });
  if (micronutrients.copper !== undefined) minerals.push({ name: 'Copper', value: micronutrients.copper, unit: 'mg' });
  if (micronutrients.manganese !== undefined) minerals.push({ name: 'Manganese', value: micronutrients.manganese, unit: 'mg' });
  if (micronutrients.selenium !== undefined) minerals.push({ name: 'Selenium', value: micronutrients.selenium, unit: 'mcg' });

  if (micronutrients.fiber !== undefined) other.push({ name: 'Fiber', value: micronutrients.fiber, unit: 'g' });
  if (micronutrients.sugar !== undefined) other.push({ name: 'Sugar', value: micronutrients.sugar, unit: 'g' });
  if (micronutrients.cholesterol !== undefined) other.push({ name: 'Cholesterol', value: micronutrients.cholesterol, unit: 'mg' });
  if (micronutrients.saturatedFat !== undefined) other.push({ name: 'Saturated Fat', value: micronutrients.saturatedFat, unit: 'g' });
  if (micronutrients.transFat !== undefined) other.push({ name: 'Trans Fat', value: micronutrients.transFat, unit: 'g' });

  const totalItems = vitamins.length + minerals.length + other.length;
  if (totalItems === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.headerText, { color: colors.accent }]}>
          Micronutrients ({totalItems})
        </Text>
        <IconSymbol
          name={isExpanded ? 'chevron.up' : 'chevron.down'}
          size={16}
          color={colors.accent}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.content, { backgroundColor: colors.gray800 }]}>
          {vitamins.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Vitamins</Text>
              {vitamins.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: colors.textSecondary }]}>{item.name}</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {item.value.toFixed(1)} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {minerals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Minerals</Text>
              {minerals.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: colors.textSecondary }]}>{item.name}</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {item.value.toFixed(1)} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {other.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Other</Text>
              {other.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: colors.textSecondary }]}>{item.name}</Text>
                  <Text style={[styles.itemValue, { color: colors.text }]}>
                    {item.value.toFixed(1)} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 12,
  },
  itemValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});

