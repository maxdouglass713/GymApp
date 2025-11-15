import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface DailyTotalsProps {
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

export const DailyTotals: React.FC<DailyTotalsProps> = ({
  totalMacros,
  targetMacros,
  colors,
}) => {
  return (
    <View style={[styles.dailyTotalsContainer, { backgroundColor: colors.surface, borderColor: colors.icon }]}>
      <Text style={[styles.dailyTotalsTitle, { color: colors.text }]}>Daily Totals</Text>
      <View style={styles.totalsGrid}>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: colors.icon }]}>Calories</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {Math.round(totalMacros.calories)} / {targetMacros.calories}
          </Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: colors.icon }]}>Protein</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {Math.round(totalMacros.protein)}g / {targetMacros.protein}g
          </Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: colors.icon }]}>Carbs</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {Math.round(totalMacros.carbs)}g / {targetMacros.carbs}g
          </Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: colors.icon }]}>Fat</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {Math.round(totalMacros.fat)}g / {targetMacros.fat}g
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dailyTotalsContainer: {
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  dailyTotalsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  totalItem: {
    flex: 1,
    minWidth: '45%',
  },
  totalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});

