import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { generateUniqueId } from '@/utils/id';

interface EditTodaysWorkoutModalProps {
  visible: boolean;
  workout: any;
  onClose: () => void;
  onSave: (workout: any) => Promise<void>;
  onWorkoutChange: (workout: any) => void;
  onDelete?: (workoutId: string) => Promise<void>;
}

export const EditTodaysWorkoutModal: React.FC<EditTodaysWorkoutModalProps> = ({
  visible,
  workout,
  onClose,
  onSave,
  onWorkoutChange,
  onDelete,
}) => {
  const handleWeightChange = (exerciseId: string, setId: string, text: string) => {
    if (!workout || !workout.exercises) return;
    
    // Allow decimal points and numbers only
    const cleanedText = text.replace(/[^0-9.]/g, '');
    // Only allow one decimal point
    const parts = cleanedText.split('.');
    if (parts.length > 2) return;
    // Limit decimal places to 1
    if (parts[1] && parts[1].length > 1) return;
    
    const updatedWorkout = { ...workout };
    const exerciseIndex = updatedWorkout.exercises.findIndex((ex: any) => ex && ex.id === exerciseId);
    if (exerciseIndex !== -1 && updatedWorkout.exercises[exerciseIndex]?.sets) {
      const setIndex = updatedWorkout.exercises[exerciseIndex].sets.findIndex((s: any) => s && s.id === setId);
      if (setIndex !== -1) {
        updatedWorkout.exercises[exerciseIndex].sets[setIndex].weight = cleanedText ? parseFloat(cleanedText) : 0;
        onWorkoutChange(updatedWorkout);
      }
    }
  };

  const handleRepsChange = (exerciseId: string, setId: string, text: string) => {
    if (!workout || !workout.exercises) return;
    
    const updatedWorkout = { ...workout };
    const exerciseIndex = updatedWorkout.exercises.findIndex((ex: any) => ex && ex.id === exerciseId);
    if (exerciseIndex !== -1 && updatedWorkout.exercises[exerciseIndex]?.sets) {
      const setIndex = updatedWorkout.exercises[exerciseIndex].sets.findIndex((s: any) => s && s.id === setId);
      if (setIndex !== -1) {
        updatedWorkout.exercises[exerciseIndex].sets[setIndex].reps = parseInt(text) || 0;
        onWorkoutChange(updatedWorkout);
      }
    }
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    if (!workout || !workout.exercises) return;
    
    const updatedWorkout = { ...workout };
    const exerciseIndex = updatedWorkout.exercises.findIndex((ex: any) => ex && ex.id === exerciseId);
    if (exerciseIndex !== -1 && updatedWorkout.exercises[exerciseIndex]?.sets) {
      updatedWorkout.exercises[exerciseIndex].sets = updatedWorkout.exercises[exerciseIndex].sets.filter((s: any) => s && s.id && s.id !== setId);
      onWorkoutChange(updatedWorkout);
    }
  };

  const handleAddSet = (exerciseId: string) => {
    if (!workout || !workout.exercises) return;
    
    const newSet = {
      id: generateUniqueId('set'),
      reps: 0,
      weight: 0,
      style: 'normal' as const,
      notes: '',
    };
    
    const updatedWorkout = { ...workout };
    const exerciseIndex = updatedWorkout.exercises.findIndex((ex: any) => ex && ex.id === exerciseId);
    if (exerciseIndex !== -1) {
      updatedWorkout.exercises[exerciseIndex].sets = [...(updatedWorkout.exercises[exerciseIndex].sets || []).filter((s: any) => s && s.id), newSet];
      onWorkoutChange(updatedWorkout);
    }
  };

  const handleAddExercise = () => {
    const newExercise = {
      id: generateUniqueId('exercise'),
      name: 'New Exercise',
      sets: [{
        id: generateUniqueId('set'),
        reps: 0,
        weight: 0,
        style: 'normal' as const,
        notes: '',
      }],
      notes: '',
      type: 'strength' as const,
    };
    
    const updatedWorkout = {
      ...workout,
      exercises: [...(workout.exercises || []), newExercise]
    };
    onWorkoutChange(updatedWorkout);
  };

  const handleSave = async () => {
    try {
      await onSave(workout);
      Alert.alert('Success', 'Workout updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout changes.');
    }
  };

  const handleDelete = () => {
    if (!workout || !workout.id) {
      Alert.alert('Error', 'Cannot delete workout: No workout ID found.');
      return;
    }

    const workoutId = workout.id; // Store in local variable to avoid accessing workout.id if workout becomes null

    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (onDelete && workoutId) {
                // Call onDelete - it handles point deduction and state updates
                // Don't show success alert here, let the parent handle it
                await onDelete(workoutId);
                onClose(); // Close modal immediately after deletion starts
              } else {
                Alert.alert('Error', 'Delete functionality not available.');
              }
            } catch (error) {
              console.error('Error deleting workout:', error);
              Alert.alert('Error', 'Failed to delete workout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.editModalContent, { backgroundColor: BrandColors.background }]}>
          <View style={styles.editModalHeader}>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>Edit Today's Workout</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <Text style={[styles.closeButton, { color: BrandColors.textSecondary }]}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalScroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.editModalScrollContent}>
            {workout?.exercises?.filter((exercise: any) => exercise && exercise.id).map((exercise: any, index: number) => (
              <View key={`edit-exercise-${exercise.id || 'ex-' + index}-${index}-${workout?.id || 'workout'}`} style={[styles.editExerciseCard, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.textSecondary }]}>
                <View style={styles.editExerciseHeader}>
                  <Text style={[styles.exerciseName, { color: BrandColors.text }]}>{exercise.name}</Text>
                </View>

                {exercise.type === 'cardio' ? (
                  <View style={styles.cardioDetails}>
                    <Text style={[styles.cardioDetailsText, { color: BrandColors.textSecondary }]}>
                      Duration: {exercise.duration || 'N/A'} • Intensity: {exercise.intensity || 'moderate'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.setsContainer}>
                    {exercise.sets?.filter((set: any) => set && set.id).map((set: any, setIndex: number) => (
                      <View key={`edit-set-${set.id || 'set-' + setIndex}-${setIndex}-${exercise.id || 'ex'}`}>
                        <View style={styles.setRow}>
                          <Text style={[styles.setNumber, { color: BrandColors.textSecondary }]}>
                            Set {setIndex + 1}
                          </Text>
                          
                          <TextInput
                            style={[styles.setInput, { backgroundColor: BrandColors.gray700, color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
                            value={set.weight?.toString() || ''}
                            onChangeText={(text) => handleWeightChange(exercise.id, set.id, text)}
                            placeholder="Weight"
                            placeholderTextColor={BrandColors.textSecondary}
                            keyboardType="decimal-pad"
                          />
                          
                          <TextInput
                            style={[styles.setInput, { backgroundColor: BrandColors.gray700, color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
                            value={set.reps?.toString() || ''}
                            onChangeText={(text) => handleRepsChange(exercise.id, set.id, text)}
                            placeholder="Reps"
                            placeholderTextColor={BrandColors.textSecondary}
                            keyboardType="numeric"
                          />
                          
                          <TouchableOpacity
                            style={styles.removeSetButton}
                            onPress={() => handleRemoveSet(exercise.id, set.id)}
                          >
                            <Text style={[styles.removeButtonText, { color: BrandColors.accent }]}>×</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    
                    <TouchableOpacity
                      style={[styles.addSetButton, { backgroundColor: BrandColors.gray700, borderColor: BrandColors.textSecondary }]}
                      onPress={() => handleAddSet(exercise.id)}
                    >
                      <Text style={[styles.addSetButtonText, { color: BrandColors.text }]}>+ Add Set</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addExerciseButton, { backgroundColor: BrandColors.accent }]}
              onPress={handleAddExercise}
            >
              <Text style={[styles.addExerciseButtonText, { color: '#000' }]}>+ Add Exercise</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.editModalActions}>
            {onDelete && workout?.id && (
              <TouchableOpacity
                style={[styles.deleteButton, styles.modalButton]}
                onPress={handleDelete}
              >
                <Text style={[styles.deleteButtonText, { color: '#fff' }]}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[ComponentStyles.button.secondary, styles.modalButton]}
              onPress={onClose}
            >
              <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ComponentStyles.button.primary, styles.modalButton]}
              onPress={handleSave}
            >
              <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 8,
  },
  closeButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editModalScroll: {
    flex: 1,
  },
  editModalScrollContent: {
    padding: 20,
  },
  editExerciseCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  editExerciseHeader: {
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardioDetails: {
    paddingVertical: 8,
  },
  cardioDetailsText: {
    fontSize: 14,
  },
  setsContainer: {
    gap: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    width: 50,
    fontSize: 14,
    fontWeight: '500',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  removeSetButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addSetButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  addSetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addExerciseButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButton: {
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
