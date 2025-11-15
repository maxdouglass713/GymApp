import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface NutritionHeaderProps {
  selectedDate: Date;
  onDatePress: () => void;
  formatDate: (date: Date) => string;
  colors: typeof BrandColors;
}

export const NutritionHeader: React.FC<NutritionHeaderProps> = ({
  selectedDate,
  onDatePress,
  formatDate,
  colors,
}) => {
  return (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Nutrition</Text>
      <TouchableOpacity onPress={onDatePress}>
        <Text style={[styles.headerDate, { color: colors.icon }]}>
          {formatDate(selectedDate)}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});

