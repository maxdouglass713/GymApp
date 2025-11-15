import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { EXERCISE_DATABASE, CARDIO_DATABASE } from '@/utils/workout/exerciseDatabase';
import type { CustomExercise } from '@/stores/workoutStore';

interface ExerciseSearchProps {
  workoutType: 'strength' | 'cardio';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExerciseSelect: (exercise: string) => void;
  onCardioSelect: (activity: string) => void;
  onAddCardioPress: () => void;
  hasExercises: boolean;
  customExercises: CustomExercise[];
  onCustomExerciseSelect: (exercise: CustomExercise) => void;
  onCreateCustomExercise: () => void;
  onSearchFocus?: () => void;
  onSearchLayout?: (event: LayoutChangeEvent) => void;
}

export const ExerciseSearch: React.FC<ExerciseSearchProps> = ({
  workoutType,
  searchQuery,
  onSearchChange,
  onExerciseSelect,
  onCardioSelect,
  onAddCardioPress,
  hasExercises,
  customExercises,
  onCustomExerciseSelect,
  onCreateCustomExercise,
  onSearchFocus,
  onSearchLayout,
}) => {
  const filteredExercises = Object.keys(EXERCISE_DATABASE).filter(exercise =>
    exercise.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCardio = CARDIO_DATABASE.filter(activity =>
    activity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomExercises = customExercises.filter((exercise) => {
    const query = searchQuery.toLowerCase();
    const baseMatch = exercise.name.toLowerCase().includes(query);
    const muscleMatch = exercise.muscleGroup.toLowerCase().includes(query);
    const equipmentMatch = exercise.equipment.some((item) => item.toLowerCase().includes(query));
    return exercise.type === workoutType && (baseMatch || muscleMatch || equipmentMatch);
  });

  const shouldShowCreatePrompt =
    workoutType === 'strength' &&
    searchQuery.length > 0 &&
    filteredExercises.length === 0 &&
    filteredCustomExercises.length === 0;

  return (
    <View style={styles.searchSection} onLayout={onSearchLayout}>
      {workoutType === 'strength' ? (
        <>
          <TextInput
            style={[styles.searchInput, { color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={onSearchFocus}
            placeholder="Search exercises..."
            placeholderTextColor={BrandColors.textSecondary}
          />

          {searchQuery.length > 0 && (
            <View style={[styles.searchResults, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              {filteredExercises.slice(0, 5).map((exercise, index) => (
                <TouchableOpacity
                  key={`exercise-search-${exercise}-${index}`}
                  style={styles.searchResultItem}
                  onPress={() => onExerciseSelect(exercise)}
                >
                  <Text style={[styles.searchResultText, { color: BrandColors.text }]}>
                    {exercise}
                  </Text>
                </TouchableOpacity>
              ))}

              {filteredCustomExercises.slice(0, 5).map((exercise) => (
                <TouchableOpacity
                  key={`custom-exercise-search-${exercise.id}`}
                  style={styles.searchResultItem}
                  onPress={() => onCustomExerciseSelect(exercise)}
                >
                  <View>
                    <Text style={[styles.searchResultText, { color: BrandColors.text }]}>
                      {exercise.name}
                    </Text>
                    <Text style={[styles.searchResultMeta, { color: BrandColors.textSecondary }]}>
                      Custom • {exercise.muscleGroup} • {exercise.equipment.join(', ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {shouldShowCreatePrompt && (
            <TouchableOpacity
              style={[styles.createCustomButton, { borderColor: BrandColors.textSecondary, backgroundColor: BrandColors.gray800 }]}
              onPress={onCreateCustomExercise}
            >
              <Text style={[styles.createCustomText, { color: BrandColors.text }]}>Can't find it? Create a custom exercise</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <TextInput
            style={[styles.searchInput, { color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={onSearchFocus}
            placeholder="Search cardio activities..."
            placeholderTextColor={BrandColors.textSecondary}
          />

          {searchQuery.length > 0 && (
            <View style={[styles.searchResults, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary }]}>
              {filteredCardio.slice(0, 5).map((activity, index) => (
                <TouchableOpacity
                  key={`cardio-search-${activity}-${index}`}
                  style={styles.searchResultItem}
                  onPress={() => {
                    onCardioSelect(activity);
                  }}
                >
                  <Text style={[styles.searchResultText, { color: BrandColors.text }]}>
                    {activity}
                  </Text>
                </TouchableOpacity>
              ))}

              {filteredCustomExercises
                .filter((exercise) => exercise.type === 'cardio')
                .slice(0, 5)
                .map((exercise) => (
                  <TouchableOpacity
                    key={`custom-cardio-search-${exercise.id}`}
                    style={styles.searchResultItem}
                    onPress={() => onCustomExerciseSelect(exercise)}
                  >
                    <View>
                      <Text style={[styles.searchResultText, { color: BrandColors.text }]}>
                        {exercise.name}
                      </Text>
                      <Text style={[styles.searchResultMeta, { color: BrandColors.textSecondary }]}>
                        Custom • {exercise.equipment.join(', ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}
          
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.addCardioButton]}
            onPress={onAddCardioPress}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>
              + Add Cardio Activity
            </Text>
          </TouchableOpacity>
        </>
      )}
      
      {!hasExercises && (
        <Text style={[styles.helperText, { color: BrandColors.textSecondary }]}>
          Add {workoutType === 'cardio' ? 'cardio activities' : 'exercises'} to start logging.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  searchResults: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 200,
    marginTop: 8,
    overflow: 'hidden',
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchResultText: {
    fontSize: 16,
  },
  searchResultMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  addCardioButton: {
    marginTop: 12,
  },
  helperText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  createCustomButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  createCustomText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

