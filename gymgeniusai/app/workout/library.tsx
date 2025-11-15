import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius, ComponentStyles } from '@/constants/theme';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { router } from 'expo-router';
import { eventBus } from '@/lib/eventBus';

export default function WorkoutLibraryScreen() {
  const { favorites } = useFavoritesStore();
  const { workoutHistory } = useWorkoutStore();

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
      <Text style={[styles.title, { color: BrandColors.text }]}>Workout Library</Text>
      <Text style={[styles.subtitle, { color: BrandColors.textSecondary }]}>
        Browse your saved templates, revisit recent workouts, or build something new.
      </Text>

      <TouchableOpacity
        style={[ComponentStyles.card, styles.primaryAction]}
        activeOpacity={0.9}
        onPress={() => {
          eventBus.emit('workout:showFavorites');
          router.push({ pathname: '/(tabs)/workout', params: { segment: 'favorites' } });
        }}
      >
        <Text style={[styles.primaryIcon, { color: BrandColors.accent }]}>⭐</Text>
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
        <Text style={[styles.primaryIcon, { color: BrandColors.accent }]}>➕</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.primaryTitle, { color: BrandColors.text }]}>Create Custom Exercise</Text>
          <Text style={[styles.primaryDescription, { color: BrandColors.textSecondary }]}>
            Build exercises that aren’t in our database and reuse them across workouts.
          </Text>
        </View>
        <Text style={[styles.chevron, { color: BrandColors.textSecondary }]}>›</Text>
      </TouchableOpacity>

      <View style={[ComponentStyles.card, styles.sectionCard]}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Recent Workouts</Text>
        {recentWorkouts.length ? (
          recentWorkouts.map((workout) => (
            <TouchableOpacity
              key={workout.id}
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
  primaryIcon: {
    fontSize: Typography.fontSize['3xl'],
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
});

