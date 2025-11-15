import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { EXERCISE_DATABASE } from '@/utils/workout/exerciseDatabase';

interface TodaysWorkoutProps {
  workout: any;
  selectedDate: Date;
  favorites: any[];
  onEdit?: () => void;
  onShare: () => void;
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

  const getTotalVolume = () => {
    return workout.exercises.reduce((total: number, exercise: any) => {
      return total + (exercise.sets?.reduce((setTotal: number, set: any) => {
        return setTotal + ((set.weight || 0) * (set.reps || 0));
      }, 0) || 0);
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
          backgroundColor: BrandColors.gray800,
          borderColor: isSavedDraft ? BrandColors.gray700 : BrandColors.accent,
          opacity: isSavedDraft ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.todaysWorkoutHeader}>
        <View style={styles.todaysWorkoutTitleContainer}>
          <Text style={[styles.todaysWorkoutTitle, { color: BrandColors.accent }]}>
            {workoutLabel}
          </Text>
          <Text style={[styles.todaysWorkoutTime, { color: BrandColors.textSecondary }]}>
            {formatTime(workout.completedAt || workout.createdAt)}
          </Text>
        </View>
        <View style={styles.todaysWorkoutActions}>
          {isSavedDraft && (
            <View style={[styles.statusBadge, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.statusBadgeText, { color: BrandColors.textSecondary }]}>Saved</Text>
              <Text style={[styles.statusBadgeIcon, { color: BrandColors.textSecondary }]}>🔒</Text>
            </View>
          )}
          {canFavorite && (
            <TouchableOpacity
              style={[styles.starButton, { 
                backgroundColor: isFavorite ? '#FFD700' : 'transparent', 
                borderColor: isFavorite ? '#FFD700' : BrandColors.accent 
              }]}
              onPress={handleFavoriteToggle}
            >
              <Text style={[styles.starButtonText, { 
                color: isFavorite ? '#000' : BrandColors.accent 
              }]}>
                {isFavorite ? '⭐' : '☆'}
              </Text>
            </TouchableOpacity>
          )}
          {onEdit && (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: BrandColors.accent }]}
            onPress={onEdit}
          >
            <Text style={[styles.editButtonText, { color: '#000' }]}>Edit</Text>
          </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: '#f59e0b' }]}
            onPress={onShare}
          >
            <Text style={[styles.shareButtonText, { color: '#000' }]}>📤 Share</Text>
          </TouchableOpacity>
          
          {onDelete && (
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#ef4444' }]}
              onPress={onDelete}
            >
              <Text style={[styles.deleteButtonText, { color: '#fff' }]}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.todaysWorkoutStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: BrandColors.text }]}>
            {workout.exercises.length}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>Exercises</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: BrandColors.text }]}>
            {getTotalSets()}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>Sets</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: BrandColors.text }]}>
            {getTotalVolume()}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>Volume</Text>
        </View>
      </View>

      <View style={styles.todaysWorkoutExercises}>
        {workout.exercises.slice(0, 3).map((exercise: any, index: number) => (
          <View key={`today-exercise-${exercise.id}-${index}-${workout.id}`} style={styles.todaysExerciseItem}>
            <Text style={[styles.todaysExerciseName, { color: BrandColors.text }]}>
              {exercise.name}
            </Text>
            <Text style={[styles.todaysExerciseSets, { color: BrandColors.textSecondary }]}>
              {exercise.sets?.length || 0} sets
            </Text>
          </View>
        ))}
        {workout.exercises.length > 3 && (
          <Text style={[styles.moreExercises, { color: BrandColors.textSecondary }]}>
            +{workout.exercises.length - 3} more exercises
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  todaysWorkoutCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  todaysWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  todaysWorkoutTitleContainer: {
    flex: 1,
  },
  todaysWorkoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  todaysWorkoutTime: {
    fontSize: 14,
  },
  todaysWorkoutActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadgeIcon: {
    fontSize: 14,
  },
  starButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButtonText: {
    fontSize: 18,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  todaysWorkoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  todaysWorkoutExercises: {
    gap: 8,
  },
  todaysExerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  todaysExerciseName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  todaysExerciseSets: {
    fontSize: 14,
  },
  moreExercises: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 8,
    fontStyle: 'italic',
  },
});
