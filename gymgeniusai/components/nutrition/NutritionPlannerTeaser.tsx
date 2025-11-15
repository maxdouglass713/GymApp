import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface NutritionPlannerTeaserProps {
  onLearnMore: () => void;
  colors: typeof BrandColors;
}

export const NutritionPlannerTeaser: React.FC<NutritionPlannerTeaserProps> = ({
  onLearnMore,
  colors,
}) => {
  return (
    <View style={[styles.teaserCard, { backgroundColor: colors.background, borderColor: colors.icon }]}>
      <Text style={[styles.teaserTitle, { color: colors.text }]}>
        Nutrition Planner & Grocery Lists
      </Text>
      <Text style={[styles.teaserSubtitle, { color: colors.icon }]}>
        Unlock at 1,200 V
      </Text>
      <TouchableOpacity
        style={styles.learnMoreButton}
        onPress={onLearnMore}
      >
        <Text style={[styles.learnMoreText, { color: colors.tint }]}>Learn more</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  teaserCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  teaserTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teaserSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  learnMoreButton: {
    alignSelf: 'flex-start',
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

