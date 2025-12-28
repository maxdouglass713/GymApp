import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius, ComponentStyles } from '@/constants/theme';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useNutritionStore } from '@/stores/nutritionStore';
import { router } from 'expo-router';
import { eventBus } from '@/lib/eventBus';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/components/AuthProvider';

export default function WorkoutLibraryScreen() {
  const { favorites } = useFavoritesStore();
  const { workoutHistory } = useWorkoutStore();
  const { user } = useAuth();
  const { customMeals, loadCustomMeals } = useNutritionStore();
  const [isMealLibraryExpanded, setIsMealLibraryExpanded] = useState(false);

  // Load custom meals when user changes
  useEffect(() => {
    const userId = user?.uid || 'anonymous';
    loadCustomMeals(userId);
  }, [loadCustomMeals, user?.uid]);

  const sortedCustomMeals = useMemo(() => {
    const userId = user?.uid || 'anonymous';
    const userMeals = customMeals.filter((meal) => meal.userId === userId);
    return [...userMeals].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate; // Most recent first
    });
  }, [customMeals, user?.uid]);

  const handleMealSelect = (meal: any) => {
    router.push('/(tabs)/nutrition');
    setTimeout(() => {
      eventBus.emit('nutrition:selectMeal', meal);
    }, 150);
  };

  const recentWorkouts = useMemo(() => {
    if (!workoutHistory?.length) {
      return [];
    }

    return [...workoutHistory]
      .sort((a, b) => {
        const aDate = new Date(a.completedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.completedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 5);
  }, [workoutHistory]);

  return (
    <ScrollView style={ComponentStyles.screen} contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: BrandColors.text }]}>Library</Text>
      <Text style={[styles.subtitle, { color: BrandColors.textSecondary }]}>
        Browse your saved workouts and meals, or create custom exercises.
      </Text>

      <TouchableOpacity
        style={[ComponentStyles.card, styles.primaryAction]}
        activeOpacity={0.9}
        onPress={() => {
          eventBus.emit('workout:showFavorites');
          router.push({ pathname: '/(tabs)/workout', params: { segment: 'favorites' } });
        }}
      >
        <View style={styles.iconContainer}>
          <IconSymbol name="star.fill" size={32} color={BrandColors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.primaryTitle, { color: BrandColors.text }]}>Saved Workout Templates</Text>
          <Text style={[styles.primaryDescription, { color: BrandColors.textSecondary }]}>
            {favorites.length
              ? `You have ${favorites.length} templates ready to use.`
              : 'Star a workout to save it as a reusable template.'}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: BrandColors.textSecondary }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[ComponentStyles.card, styles.primaryAction]}
        activeOpacity={0.9}
        onPress={() => {
          eventBus.emit('workout:createCustomExercise');
          router.push({ pathname: '/(tabs)/workout', params: { segment: 'all' } });
        }}
      >
        <View style={styles.iconContainer}>
          <IconSymbol name="plus.circle.fill" size={32} color={BrandColors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.primaryTitle, { color: BrandColors.text }]}>Create Custom Exercise</Text>
          <Text style={[styles.primaryDescription, { color: BrandColors.textSecondary }]}>
            Build exercises that aren't in our database and reuse them across workouts.
          </Text>
        </View>
        <Text style={[styles.chevron, { color: BrandColors.textSecondary }]}>›</Text>
      </TouchableOpacity>

      <View style={[ComponentStyles.card, styles.sectionCard]}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Recent Workouts</Text>
        {recentWorkouts.length ? (
          recentWorkouts.map((workout, index) => (
            <TouchableOpacity
              key={`workout-${workout.id || 'workout'}-${index}-${workout.date || workout.createdAt || Date.now()}`}
              style={styles.workoutRow}
              activeOpacity={0.85}
              onPress={() => {
                router.push('/(tabs)/workout');
                setTimeout(() => {
                  const targetDate = workout.date
                    ? new Date(workout.date)
                    : new Date(workout.createdAt || Date.now());
                  useWorkoutStore.getState().setSelectedDate(targetDate);
                }, 150);
              }}
            >
              <View style={styles.workoutInfo}>
                <Text style={[styles.workoutName, { color: BrandColors.text }]}>{workout.title || 'Workout'}</Text>
                <Text style={[styles.workoutMeta, { color: BrandColors.textSecondary }]}>
                  {new Date(workout.date || workout.createdAt || Date.now()).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: BrandColors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: BrandColors.textSecondary }]}>No workouts logged yet.</Text>
        )}
      </View>

      {/* Meal Library Section */}
      <View style={[ComponentStyles.card, styles.sectionCard]}>
        <TouchableOpacity
          onPress={() => setIsMealLibraryExpanded(!isMealLibraryExpanded)}
          activeOpacity={0.7}
        >
        <View style={styles.sectionHeader}>
          <IconSymbol name="fork.knife" size={20} color={BrandColors.accent} />
          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Meal Library</Text>
          <Text style={[styles.sectionCount, { color: BrandColors.textSecondary }]}>
            {sortedCustomMeals.length}
          </Text>
            <IconSymbol 
              name={isMealLibraryExpanded ? "chevron.down" : "chevron.right"} 
              size={16} 
              color={BrandColors.textSecondary} 
              style={{ marginLeft: 'auto' }}
            />
        </View>
        </TouchableOpacity>
        
        {isMealLibraryExpanded && (
          <>
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
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingTop: 76,
    gap: Spacing.lg,
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
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  primaryDescription: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    marginTop: 4,
  },
  chevron: {
    fontSize: Typography.fontSize['2xl'],
    marginLeft: Spacing.sm,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  workoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderColor: BrandColors.gray700,
  },
  workoutInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  workoutName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  workoutMeta: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginTop: 2,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
});

