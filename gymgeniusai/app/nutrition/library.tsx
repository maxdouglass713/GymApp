import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius, ComponentStyles } from '@/constants/theme';
import { useNutritionStore } from '@/stores/nutritionStore';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eventBus } from '@/lib/eventBus';
import { useAuth } from '@/components/AuthProvider';

export default function MealLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { customMeals, loadCustomMeals } = useNutritionStore();

  // Load custom meals when user changes
  useEffect(() => {
    const userId = user?.uid || 'anonymous';
    loadCustomMeals(userId);
  }, [loadCustomMeals, user?.uid]);

  const sortedCustomMeals = useMemo(() => {
    const userId = user?.uid || 'anonymous';
    // Filter to only show meals for the current user (safety measure)
    const userMeals = customMeals.filter((meal) => meal.userId === userId);
    return [...userMeals].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate; // Most recent first
    });
  }, [customMeals, user?.uid]);

  const handleMealSelect = (meal: any) => {
    // Navigate back to nutrition tab and trigger meal selection
    router.push('/(tabs)/nutrition');
    // Emit event to select the meal (similar to workout library)
    setTimeout(() => {
      eventBus.emit('nutrition:selectMeal', meal);
    }, 150);
  };

  return (
    <View style={[ComponentStyles.screen, { paddingTop: Math.max(insets.top, 20) }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.left" size={20} color={BrandColors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: BrandColors.text }]}>Meal Library</Text>
            <Text style={[styles.subtitle, { color: BrandColors.textSecondary }]}>
              Browse your favorite meals and custom creations.
            </Text>
          </View>
        </View>

        {/* Favorite Meals Section - Placeholder for future implementation */}
        <View style={[ComponentStyles.card, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="star.fill" size={20} color={BrandColors.accent} />
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Favorite Meals</Text>
          </View>
          <TouchableOpacity
            onPress={() => checkFeatureOrShowComingSoon('mealLibrary', 'Favorite Meals Library')}
            style={{ padding: 8 }}
          >
            <Text style={[styles.emptyText, { color: BrandColors.textSecondary }]}>
              Star meals to save them as favorites. Coming soon! (Tap for details)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Created Meals Section */}
        <View style={[ComponentStyles.card, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="square.stack.fill" size={20} color={BrandColors.accent} />
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Created Meals</Text>
            <Text style={[styles.sectionCount, { color: BrandColors.textSecondary }]}>
              {sortedCustomMeals.length}
            </Text>
          </View>
          
          {sortedCustomMeals.length > 0 ? (
            <View style={styles.mealsList}>
              {sortedCustomMeals.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  style={[styles.mealRow, { borderColor: BrandColors.gray700 }]}
                  activeOpacity={0.85}
                  onPress={() => handleMealSelect(meal)}
                >
                  <View style={styles.mealInfo}>
                    <Text style={[styles.mealName, { color: BrandColors.text }]} numberOfLines={1}>
                      {meal.name}
                    </Text>
                    <Text style={[styles.mealServing, { color: BrandColors.textSecondary }]}>
                      {meal.servingSize}
                    </Text>
                  </View>
                  <View style={styles.mealMacros}>
                    <Text style={[styles.macroValue, { color: '#FF6B35' }]}>
                      {Math.round(meal.macrosPerServing.calories)} cal
                    </Text>
                    <View style={styles.macroRow}>
                      <Text style={[styles.macroLabel, { color: BrandColors.textSecondary }]}>
                        P: <Text style={{ color: '#DC143C' }}>{Math.round(meal.macrosPerServing.protein)}g</Text>
                      </Text>
                      <Text style={[styles.macroLabel, { color: BrandColors.textSecondary }]}>
                        C: <Text style={{ color: '#FFD700' }}>{Math.round(meal.macrosPerServing.carbs)}g</Text>
                      </Text>
                      <Text style={[styles.macroLabel, { color: BrandColors.textSecondary }]}>
                        F: <Text style={{ color: '#00FF88' }}>{Math.round(meal.macrosPerServing.fat)}g</Text>
                      </Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={BrandColors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: BrandColors.textSecondary }]}>
              No custom meals created yet. Create one from the nutrition tab!
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
    marginTop: 4,
  },
  sectionCard: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  sectionCount: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  mealsList: {
    gap: Spacing.xs,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: 2,
  },
  mealServing: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
  },
  mealMacros: {
    alignItems: 'flex-end',
    gap: 4,
  },
  macroValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  macroLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    fontStyle: 'italic',
  },
});

