import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, LayoutChangeEvent, ScrollView } from 'react-native';
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
  isKeyboardVisible?: boolean;
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
  isKeyboardVisible = false,
}) => {
  // Normalize text for flexible matching (handles hyphens, spaces, case)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .trim();
  };

  // Map search terms to muscle groups
  const getMuscleGroupFromSearch = (query: string): string | null => {
    const normalized = normalizeText(query);
    
    // Map common search terms to muscle groups
    const muscleGroupMap: Record<string, string> = {
      // Shoulders
      'shoulder': 'Shoulders',
      'shoulders': 'Shoulders',
      'delts': 'Shoulders',
      'deltoids': 'Shoulders',
      'deltoid': 'Shoulders',
      'delt': 'Shoulders',
      
      // Chest
      'chest': 'Chest',
      'pecs': 'Chest',
      'pectorals': 'Chest',
      'pectoral': 'Chest',
      'pec': 'Chest',
      
      // Back
      'back': 'Back',
      'lats': 'Back',
      'latissimus': 'Back',
      'lat': 'Back',
      'rhomboids': 'Back',
      'traps': 'Back',
      'trapezius': 'Back',
      
      // Legs
      'leg': 'Legs',
      'legs': 'Legs',
      'quads': 'Legs',
      'quadriceps': 'Legs',
      'quad': 'Legs',
      'hamstrings': 'Legs',
      'hamstring': 'Legs',
      'hams': 'Legs',
      'calves': 'Legs',
      'calf': 'Legs',
      'glutes': 'Legs',
      'glute': 'Legs',
      'thighs': 'Legs',
      'thigh': 'Legs',
      
      // Arms
      'arm': 'Arms',
      'arms': 'Arms',
      'bicep': 'Arms',
      'biceps': 'Arms',
      'tricep': 'Arms',
      'triceps': 'Arms',
      'forearm': 'Arms',
      'forearms': 'Arms',
      
      // Core
      'core': 'Core',
      'abs': 'Core',
      'abdominals': 'Core',
      'abdominal': 'Core',
      'obliques': 'Core',
      'oblique': 'Core',
      
      // Full Body
      'full body': 'Full Body',
      'fullbody': 'Full Body',
      'compound': 'Full Body',
    };
    
    // Check for exact match
    if (muscleGroupMap[normalized]) {
      return muscleGroupMap[normalized];
    }
    
    // Check if query contains any muscle group keyword
    for (const [keyword, muscleGroup] of Object.entries(muscleGroupMap)) {
      if (normalized.includes(keyword) || keyword.includes(normalized)) {
        return muscleGroup;
      }
    }
    
    return null;
  };

  const normalizedQuery = normalizeText(searchQuery);
  const matchedMuscleGroup = getMuscleGroupFromSearch(searchQuery);

  // Get all exercises, prioritized: exact matches first, then muscle group matches
  const filteredExercises = useMemo(() => {
    const allExercises = Object.keys(EXERCISE_DATABASE);
    
    // First, find exact name matches
    const exactMatches = allExercises.filter(exercise =>
      normalizeText(exercise).includes(normalizedQuery)
    );
    
    // Then, if search matches a muscle group, get all exercises for that group
    let muscleGroupMatches: string[] = [];
    if (matchedMuscleGroup) {
      muscleGroupMatches = allExercises.filter(exercise => {
        const exerciseData = EXERCISE_DATABASE[exercise];
        return exerciseData.muscleGroup === matchedMuscleGroup;
      });
    }
    
    // Combine: exact matches first, then muscle group matches (excluding duplicates)
    const combined = [...exactMatches];
    muscleGroupMatches.forEach(exercise => {
      if (!combined.includes(exercise)) {
        combined.push(exercise);
      }
    });
    
    return combined;
  }, [normalizedQuery, matchedMuscleGroup]);

  const filteredCardio = CARDIO_DATABASE.filter(activity =>
    normalizeText(activity).includes(normalizedQuery)
  );

  const filteredCustomExercises = customExercises.filter((exercise) => {
    const baseMatch = exercise.name ? normalizeText(exercise.name).includes(normalizedQuery) : false;
    const muscleMatch = exercise.muscleGroup ? normalizeText(exercise.muscleGroup).includes(normalizedQuery) : false;
    const equipmentMatch = Array.isArray(exercise.equipment) 
      ? exercise.equipment.some((item) => normalizeText(String(item)).includes(normalizedQuery))
      : (typeof exercise.equipment === 'string' && normalizeText(exercise.equipment).includes(normalizedQuery));
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
              <ScrollView 
                style={styles.scrollableResults}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white" // iOS: Make scroll indicator more visible (white on dark background)
                persistentScrollbar={true} // Android: Keep scrollbar visible
              >
                {filteredExercises.length > 0 && (
                  <>
                    {matchedMuscleGroup && (
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionHeaderText, { color: BrandColors.textSecondary }]}>
                          {filteredExercises.length} {matchedMuscleGroup} {filteredExercises.length === 1 ? 'Exercise' : 'Exercises'}
                        </Text>
                      </View>
                    )}
                    {filteredExercises.map((exercise, index) => (
                      <TouchableOpacity
                        key={`exercise-search-${exercise}-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => onExerciseSelect(exercise)}
                      >
                        <Text style={[styles.searchResultText, { color: BrandColors.text }]}>
                          {exercise}
                        </Text>
                        {EXERCISE_DATABASE[exercise] && (
                          <Text style={[styles.searchResultMeta, { color: BrandColors.textSecondary }]}>
                            {EXERCISE_DATABASE[exercise].muscleGroup}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {filteredCustomExercises.length > 0 && (
                  <>
                    {filteredExercises.length > 0 && (
                      <View style={styles.sectionDivider} />
                    )}
                    {filteredCustomExercises.map((exercise, index) => (
                      <TouchableOpacity
                        key={`custom-exercise-search-${exercise.id}-${index}`}
                        style={styles.searchResultItem}
                        onPress={() => onCustomExerciseSelect(exercise)}
                      >
                        <Text style={[styles.searchResultText, { color: BrandColors.text }]}>
                          {exercise.name || 'Custom Exercise'}
                        </Text>
                        {exercise.muscleGroup && (
                          <Text style={[styles.searchResultMeta, { color: BrandColors.textSecondary }]}>
                            Custom • {exercise.muscleGroup}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
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
              <ScrollView 
                style={styles.scrollableResults}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                indicatorStyle="white" // iOS: Make scroll indicator more visible (white on dark background)
                persistentScrollbar={true} // Android: Keep scrollbar visible
              >
                {filteredCardio.map((activity, index) => (
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
                          Custom • {Array.isArray(exercise.equipment) ? exercise.equipment.join(', ') : exercise.equipment}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}
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
    marginTop: 8,
    overflow: 'hidden',
  },
  scrollableResults: {
    maxHeight: 300,
  },
  sectionHeader: {
    padding: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
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

