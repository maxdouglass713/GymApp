import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { BrandColors } from '@/constants/theme';
import { useWorkoutStore } from '@/stores/workoutStore';
import { persistenceService } from '@/services/persistenceService';
import { IconSymbol } from '@/components/ui/icon-symbol';

const getLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
import { DatePickerModal } from '@/components/shared/DatePickerModal';

interface FavoritesListProps {
  favorites: any[];
  onUpdateFavorite: (id: string, data: any) => void;
  onRemoveFavorite: (id: string) => void;
  onSegmentChange: (segment: 'all' | 'favorites') => void;
  favoriteToApply?: string | null;
  onAppliedFavorite?: () => void;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
  favorites,
  onUpdateFavorite,
  onRemoveFavorite,
  onSegmentChange,
  favoriteToApply,
  onAppliedFavorite,
}) => {
  const { currentWorkout } = useWorkoutStore();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingFavorite, setPendingFavorite] = useState<any | null>(null);

  // Define handleUseTemplate before useEffect to fix Hooks order
  const handleUseTemplate = React.useCallback((favorite: any) => {
    setPendingFavorite(favorite);
    setShowDatePicker(true);
  }, []);

  // Move useEffect BEFORE early return to fix Hooks order
  React.useEffect(() => {
    if (favoriteToApply) {
      const favorite = favorites.find((fav) => fav.id === favoriteToApply);
      if (favorite) {
        setPendingFavorite(favorite);
        setShowDatePicker(true);
      }
      onAppliedFavorite?.();
    }
  }, [favoriteToApply, favorites, onAppliedFavorite]);

  if (favorites.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
        <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
          No favorites yet. Finish a workout, then tap ⭐ on the Today's Workout card to save it.
        </Text>
      </View>
    );
  }

  const handleEditFavorite = (favorite: any) => {
    Alert.alert(
      'Edit Favorite',
      'Edit favorite name?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => {
            Alert.prompt(
              'Edit Favorite Name',
              'Enter new name:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: (newName: string | undefined) => {
                    if (newName && newName.trim()) {
                      onUpdateFavorite(favorite.id, { name: newName.trim() });
                    }
                  }
                }
              ],
              'plain-text',
              favorite.name
            );
          }
        }
      ]
    );
  };

  const handleDeleteFavorite = (favorite: any) => {
    Alert.alert(
      'Delete Favorite',
      `Are you sure you want to delete "${favorite.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            onRemoveFavorite(favorite.id);
            Alert.alert('Deleted', 'Favorite workout deleted');
          }
        }
      ]
    );
  };

  const applyTemplateToDate = (favorite: any, targetDate: Date) => {
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    const exercisesWithLastUsed = favorite.exercises.map((exercise: any) => {
      const lastUsedExerciseData = (favorite.lastUsedSetData as any)?.[exercise.id] || {};
      const anyLastValues = Object.values(lastUsedExerciseData).some((setData: any) => {
        if (!setData || typeof setData !== 'object') {
          return false;
        }
        return setData.reps != null || setData.weight != null;
      });

      const updatedSets = exercise.sets.map((set: any) => {
        const lastUsedData = favorite.lastUsedSetData?.[exercise.id]?.[set.id];
        return {
          ...set,
          reps: null,
          weight: null,
          lastUsedReps: lastUsedData?.reps ?? null,
          lastUsedWeight: lastUsedData?.weight ?? null,
        };
      });

      const historicalNote =
        anyLastValues
          ? [
              'Last session:',
              ...Object.entries(lastUsedExerciseData)
                .map(([setId, data]) => {
                  if (!data || typeof data !== 'object') {
                    return null;
                  }
                  const reps = (data as any).reps;
                  const weight = (data as any).weight;
                  if (reps == null && weight == null) {
                    return null;
                  }
                  const parts: string[] = [];
                  if (weight != null) parts.push(`${weight} lb`);
                  if (reps != null) parts.push(`${reps} reps`);
                  return parts.length ? parts.join(' × ') : null;
                })
                .filter(Boolean),
            ].join('\n')
          : exercise.notes;

      return {
        ...exercise,
        sets: updatedSets,
        notes: historicalNote || exercise.notes,
      };
    });

    const targetDateKey = getLocalDateKey(normalizedDate);
    const draftWorkout = {
      id: `favorite_${favorite.id}_${Date.now()}`,
      title: `${favorite.name} – ${normalizedDate.toLocaleDateString()}`,
      date: targetDateKey,
      exercises: exercisesWithLastUsed,
      createdAt: new Date(),
    };

    useWorkoutStore.setState({
      selectedDate: normalizedDate,
      currentWorkout: draftWorkout,
    });

    persistenceService.autoSave('workout', draftWorkout);

    onUpdateFavorite(favorite.id, { lastUsed: normalizedDate });
    onSegmentChange('all');
  };

  const handleConfirmDate = (date: Date) => {
    setShowDatePicker(false);
    if (pendingFavorite && date) {
      applyTemplateToDate(pendingFavorite, date);
    }
    setPendingFavorite(null);
  };

  const handleCloseDatePicker = () => {
    setShowDatePicker(false);
    setPendingFavorite(null);
  };

  return (
    <>
      <View style={styles.favoritesList}>
        {favorites.map((favorite) => {
          const renderRightActions = () => (
            <View style={styles.swipeActionsRightContainer}>
              <TouchableOpacity
                style={[styles.editAction, { backgroundColor: BrandColors.surface, borderColor: BrandColors.accent }]}
                onPress={() => handleEditFavorite(favorite)}
                activeOpacity={0.85}
              >
                <IconSymbol name="pencil" size={20} color={BrandColors.accent} />
              </TouchableOpacity>
            </View>
          );

          const renderLeftActions = () => (
            <View style={styles.swipeActionsLeftContainer}>
              <TouchableOpacity
                style={[styles.deleteAction, { backgroundColor: '#DC2626' }]}
                onPress={() => handleDeleteFavorite(favorite)}
                activeOpacity={0.85}
              >
                <Text style={[styles.actionIcon, { color: '#FFFFFF' }]}>🗑️</Text>
              </TouchableOpacity>
            </View>
          );

          return (
            <Swipeable
              key={favorite.id}
              renderRightActions={renderRightActions}
              renderLeftActions={renderLeftActions}
              friction={2}
              overshootLeft={false}
              overshootRight={false}
            >
              <View style={[styles.favoriteCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
                <View style={styles.favoriteHeader}>
                  <Text style={[styles.favoriteName, { color: BrandColors.text }]}>{favorite.name}</Text>
                  <View style={styles.favoriteMuscleGroups}>
                    {favorite.muscleGroups.slice(0, 3).map((muscle: string, index: number) => (
                      <Text key={index} style={[styles.muscleTag, { color: BrandColors.accent, backgroundColor: BrandColors.accent + '20' }]}>
                        {muscle}
                      </Text>
                    ))}
                  </View>
                </View>
                
                <View style={styles.favoriteFooter}>
                  <Text style={[styles.lastUsed, { color: BrandColors.textSecondary }]}>
                    Last used: {favorite.lastUsed ? new Date(favorite.lastUsed).toLocaleDateString() : 'Never'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.useTemplateButton, { backgroundColor: BrandColors.accent }]}
                    onPress={() => handleUseTemplate(favorite)}
                  >
                    <Text style={[styles.useTemplateText, { color: '#000' }]}>Use as Template</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Swipeable>
          );
        })}
      </View>

      <DatePickerModal
        visible={showDatePicker}
        initialDate={pendingFavorite?.lastUsed ? new Date(pendingFavorite.lastUsed) : new Date()}
        onClose={handleCloseDatePicker}
        onDateSelect={handleConfirmDate}
      />
    </>
  );
};
const styles = StyleSheet.create({
  favoritesList: {
    gap: 12,
  },
  emptyState: {
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  favoriteCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  favoriteHeader: {
    marginBottom: 12,
  },
  favoriteName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  favoriteMuscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleTag: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  favoriteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastUsed: {
    fontSize: 14,
    flex: 1,
  },
  useTemplateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  useTemplateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  swipeActionsRightContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  editAction: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderWidth: 1,
  },
  swipeActionsLeftContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  deleteAction: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionIcon: {
    fontSize: 24,
  },
});
