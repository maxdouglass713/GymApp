import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { EXERCISE_DATABASE } from '@/utils/workout/exerciseDatabase';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface TodaysWorkoutProps {
  workout: any;
  selectedDate: Date;
  favorites: any[];
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  onAddFavorite: (favorite: any) => void;
  onRemoveFavorite: (id: string) => void;
}

export const TodaysWorkout: React.FC<TodaysWorkoutProps> = ({
  workout,
  selectedDate,
  favorites,
  onEdit,
  onShare,
  onDelete,
  onAddFavorite,
  onRemoveFavorite,
}) => {
  if (!workout) {
    return null;
  }

  // Check if selected date is today
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();
  const workoutLabel = isToday ? "Today's Workout" : `Workout - ${selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'short', 
    day: 'numeric' 
  })}`;

  // Only show workout card if there are exercises logged
  if (!workout.exercises || workout.exercises.length === 0) {
    return null;
  }

  const isSavedDraft = workout.status === 'saved' && !workout.completedAt;

  const formatTime = (date: any) => {
    if (!date) return 'Unknown time';
    
    // Convert to Date object if it's not already
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid time';
    }
    
    return dateObj.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getTotalSets = () => {
    return workout.exercises.reduce((total: number, exercise: any) => {
      return total + (exercise.sets?.length || 0);
    }, 0);
  };

  const isFavorite = favorites.some(fav => 
    fav.name === workout.title && 
    JSON.stringify(fav.exercises) === JSON.stringify(workout.exercises)
  );

  const canFavorite = Array.isArray(workout.exercises) && workout.exercises.length > 0;

  const handleFavoriteToggle = () => {
    if (isFavorite) {
      // Find and remove the matching favorite
      const favoriteToRemove = favorites.find(fav => 
        fav.name === workout.title && 
        JSON.stringify(fav.exercises) === JSON.stringify(workout.exercises)
      );
      if (favoriteToRemove) {
        onRemoveFavorite(favoriteToRemove.id);
        Alert.alert('Removed from Favorites', 'Workout removed from favorites');
      }
    } else {
      // Extract muscle groups from exercises
      const muscleGroups = workout.exercises?.map((ex: any) => {
        const exerciseName = ex.name?.split(' (')[0];
        const exerciseData = exerciseName ? EXERCISE_DATABASE[exerciseName as keyof typeof EXERCISE_DATABASE] : null;
        return exerciseData?.muscleGroup || 'Unknown';
      }).filter((mg: string, index: number, arr: string[]) => arr.indexOf(mg) === index) || [];

      onAddFavorite({
        name: workout.title || 'Untitled Workout',
        exercises: workout.exercises || [],
        muscleGroups,
      });
      Alert.alert('Added to Favorites', 'Workout saved as favorite template');
    }
  };

  return (
    <View
      style={[
        styles.todaysWorkoutCard,
        {
          backgroundColor: BrandColors.surface,
          borderColor: isSavedDraft ? BrandColors.gray700 : BrandColors.accent,
          opacity: isSavedDraft ? 0.9 : 1,
        },
      ]}
    >
      {/* Header Section */}
      <View style={styles.todaysWorkoutHeader}>
        <View style={styles.todaysWorkoutTitleContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.todaysWorkoutTitle, { color: BrandColors.accent }]}>
              {workoutLabel}
            </Text>
            {isSavedDraft && (
              <View style={[styles.statusBadge, { backgroundColor: 'rgba(156, 196, 255, 0.15)', borderColor: BrandColors.textSecondary }]}>
                <Text style={[styles.statusBadgeText, { color: BrandColors.textSecondary }]}>Saved</Text>
              </View>
            )}
          </View>
          <View style={styles.timeRow}>
            <Text style={[styles.timeIcon, { color: BrandColors.textSecondary }]}>🕐</Text>
            <Text style={[styles.todaysWorkoutTime, { color: BrandColors.textSecondary }]}>
              {formatTime(workout.completedAt || workout.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.todaysWorkoutStats}>
        <View style={[styles.statCard, { backgroundColor: 'rgba(0, 229, 255, 0.08)', borderColor: 'rgba(0, 229, 255, 0.2)' }]}>
          <Text style={[styles.statValue, { color: BrandColors.accent }]}>
            {workout.exercises.length}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>Exercises</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: 'rgba(51, 230, 166, 0.08)', borderColor: 'rgba(51, 230, 166, 0.2)' }]}>
          <Text style={[styles.statValue, { color: BrandColors.success }]}>
            {getTotalSets()}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>Sets</Text>
        </View>
      </View>

      {/* Exercises Preview */}
      <View style={styles.exercisesSection}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>Exercises</Text>
        <View style={styles.todaysWorkoutExercises}>
          {workout.exercises.slice(0, 3).map((exercise: any, index: number) => (
            <View key={`today-exercise-${exercise.id || 'ex-' + index}-${index}-${workout.id || 'workout'}`} style={styles.todaysExerciseItem}>
              <View style={styles.exerciseBullet} />
              <Text style={[styles.todaysExerciseName, { color: BrandColors.text }]} numberOfLines={1}>
                {exercise.name}
              </Text>
              <View style={[styles.exerciseSetsBadge, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
                <Text style={[styles.todaysExerciseSets, { color: BrandColors.accent }]}>
                  {exercise.sets?.length || 0} sets
                </Text>
              </View>
            </View>
          ))}
          {workout.exercises.length > 3 && (
            <View style={styles.moreExercisesContainer}>
              <Text style={[styles.moreExercises, { color: BrandColors.textSecondary }]}>
                +{workout.exercises.length - 3} more exercises
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {canFavorite && (
          <TouchableOpacity
            style={[styles.actionButton, styles.favoriteButton, { 
              backgroundColor: isFavorite ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 229, 255, 0.08)', 
              borderColor: isFavorite ? '#FFD700' : BrandColors.accent 
            }]}
            onPress={handleFavoriteToggle}
          >
            <Text style={[styles.actionButtonIcon, { 
              color: isFavorite ? '#FFD700' : BrandColors.accent 
            }]}>
              {isFavorite ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        )}
        {onEdit && (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton, { 
              backgroundColor: 'rgba(0, 229, 255, 0.08)', 
              borderColor: BrandColors.accent 
            }]}
            onPress={onEdit}
          >
            <IconSymbol name="pencil" size={18} color={BrandColors.accent} />
          </TouchableOpacity>
        )}
        {onShare && (
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton, { 
              backgroundColor: 'rgba(245, 158, 11, 0.08)', 
              borderColor: '#f59e0b' 
            }]}
            onPress={onShare}
          >
            <Text style={[styles.actionButtonIcon, { color: '#f59e0b' }]}>📤</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton, { 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              borderColor: '#ef4444' 
            }]}
            onPress={onDelete}
          >
            <Text style={[styles.actionButtonIcon, { color: '#ef4444' }]}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  todaysWorkoutCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  todaysWorkoutHeader: {
    marginBottom: 12,
  },
  todaysWorkoutTitleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  todaysWorkoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeIcon: {
    fontSize: 11,
  },
  todaysWorkoutTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todaysWorkoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  exercisesSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  todaysWorkoutExercises: {
    gap: 6,
  },
  todaysExerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 8,
  },
  exerciseBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.accent,
  },
  todaysExerciseName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  exerciseSetsBadge: {
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  todaysExerciseSets: {
    fontSize: 10,
    fontWeight: '700',
  },
  moreExercisesContainer: {
    paddingTop: 4,
    alignItems: 'center',
  },
  moreExercises: {
    fontSize: 11,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  favoriteButton: {
    // Same size as other buttons
  },
  editButton: {
    // Same size as other buttons
  },
  shareButton: {
    // Same size as other buttons
  },
  deleteButton: {
    // Same size as other buttons
  },
  actionButtonIcon: {
    fontSize: 18,
  },
});
