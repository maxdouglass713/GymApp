import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { CardioCard } from './CardioCard';

interface ExerciseCardProps {
  exercise: {
    id: string;
    name: string;
    type?: string;
    status?: 'draft' | 'saved' | 'completed';
    sets?: Array<{
      id: string;
      weight?: number | null;
      reps?: number | null;
      notes?: string;
    }>;
    duration?: number;
    speed?: number;
    distance?: number;
    intensity?: string;
  };
  validationErrors: Record<string, boolean>;
  onUpdateSet: (exerciseId: string, setId: string, field: string, value: any) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onSetCountChange?: (exerciseId: string, count: number) => void;
  onSetStatus?: (exerciseId: string, status: 'draft' | 'saved') => void;
  onSaveExercise?: (exerciseId: string) => void;
  focusRequest?: {
    exerciseId: string;
    setId: string;
    field: 'weight' | 'reps';
  } | null;
  onFocusHandled?: () => void;
  onWeightFocus?: (exerciseId: string, setId: string) => void;
  onInputFocus?: (input: TextInput | null, field?: 'weight' | 'reps') => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  validationErrors,
  onUpdateSet,
  onRemoveExercise,
  onRemoveSet,
  onSetCountChange,
  onSetStatus,
  onSaveExercise,
  focusRequest,
  onFocusHandled,
  onWeightFocus,
  onInputFocus,
}) => {
  if (!exercise || !exercise.id) {
    console.error('❌ Invalid exercise data:', exercise);
    return null;
  }

  const isSaved = exercise.status === 'saved';
  const isCompleted = exercise.status === 'completed';
  const isLocked = isSaved || isCompleted;
  const [isCollapsed, setIsCollapsed] = useState(isLocked);
  const previousStatusRef = useRef(exercise.status);

  useEffect(() => {
    const currentStatus = exercise.status;
    if (previousStatusRef.current !== currentStatus) {
      if (currentStatus === 'saved' || currentStatus === 'completed') {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
      previousStatusRef.current = currentStatus;
    }
  }, [exercise.status]);

  if (exercise.type === 'cardio') {
    return (
      <CardioCard
        exercise={exercise as any}
        onRemove={onRemoveExercise}
      />
    );
  }

  const [showSetPicker, setShowSetPicker] = useState(false);
  const [notesVisibility, setNotesVisibility] = useState<Record<string, boolean>>({});
  const setCount = exercise.sets && Array.isArray(exercise.sets) ? exercise.sets.length : 1;
  const setOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  const collapseEnabled = setCount > 0;
  const lastSet = exercise.sets && exercise.sets.length > 0 ? exercise.sets[exercise.sets.length - 1] : null;
  const inputRefs = useRef<Record<string, { weight: TextInput | null; reps: TextInput | null; notes: TextInput | null }>>({});

  const statusLabel = isSaved || isCompleted ? 'saved' : 'in progress';
  const collapsedSummaryText = collapseEnabled
    ? `${setCount} ${setCount === 1 ? 'set' : 'sets'} ${statusLabel}${lastSet ? ` • Last: ${lastSet.weight ?? '-'}${lastSet?.weight != null ? ' lb' : ''} × ${lastSet.reps ?? '-'} reps` : ''}`
    : `${setCount} ${setCount === 1 ? 'set' : 'sets'} planned`;

  useEffect(() => {
    if (!exercise.sets || !Array.isArray(exercise.sets)) {
      setNotesVisibility((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }

    setNotesVisibility((prev) => {
      const next: Record<string, boolean> = {};
      let changed = false;
      const currentIds = new Set<string>();

      for (const set of exercise.sets) {
        currentIds.add(set.id);
        const existing = prev[set.id];
        const hasExistingNotes = typeof set.notes === 'string' && set.notes.trim().length > 0;
        const defaultVisible = existing !== undefined ? existing : hasExistingNotes;
        next[set.id] = defaultVisible;

        if (existing === undefined) {
          changed = true;
        } else if (existing !== defaultVisible) {
          changed = true;
        }
      }

      if (!changed) {
        const prevKeys = Object.keys(prev);
        if (prevKeys.length !== currentIds.size) {
          changed = true;
        } else {
          for (const key of prevKeys) {
            if (!currentIds.has(key)) {
              changed = true;
              break;
            }
          }
        }
      }

      return changed ? next : prev;
    });
  }, [exercise.sets]);

  const setNotesVisibilityExplicit = (setId: string, value: boolean) => {
    setNotesVisibility((prev) => ({
      ...prev,
      [setId]: value,
    }));
  };

  const handleNotesToggle = (setId: string, nextVisible: boolean) => {
    setNotesVisibilityExplicit(setId, nextVisible);

    if (nextVisible) {
      requestAnimationFrame(() => {
        const noteInput = inputRefs.current[setId]?.notes ?? null;
        if (noteInput) {
          noteInput.focus();
          onInputFocus?.(noteInput, undefined);
        }
      });
    }
  };

  const handleSelectSetCount = (count: number) => {
    if (isSaved) {
      return;
    }
    if (onSetCountChange) {
      onSetCountChange(exercise.id, count);
    } else {
      console.warn('onSetCountChange handler is missing for exercise', exercise.id);
    }
    setShowSetPicker(false);
  };

  useEffect(() => {
    if (!focusRequest || focusRequest.exerciseId !== exercise.id) {
      return;
    }

    const timer = setTimeout(() => {
      const refsForSet = inputRefs.current[focusRequest.setId];
      const targetInput = refsForSet?.[focusRequest.field];

      if (targetInput && typeof targetInput.focus === 'function') {
        targetInput.focus();
        // Also call onInputFocus to trigger scrolling with proper offset
        onInputFocus?.(targetInput, focusRequest.field);
      }

      onFocusHandled?.();
    }, 75);

    return () => clearTimeout(timer);
  }, [exercise.id, focusRequest, onFocusHandled, onInputFocus]);

  return (
    <View
      style={[
        styles.exerciseCard,
        {
          backgroundColor: BrandColors.background,
          borderColor: isSaved ? BrandColors.gray700 : BrandColors.textSecondary,
          opacity: isSaved ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseTitleGroup}>
          <Text style={[styles.exerciseName, { color: BrandColors.text }]}>{exercise.name}</Text>
          {isSaved && (
            <View style={[styles.savedBadge, { borderColor: BrandColors.textSecondary }]}>
              <Text style={[styles.savedBadgeText, { color: BrandColors.textSecondary }]}>Saved</Text>
              <Text style={[styles.savedBadgeIcon, { color: BrandColors.textSecondary }]}>🔒</Text>
            </View>
          )}
        </View>
        <View style={styles.exerciseHeaderActions}>
          <TouchableOpacity
            style={[
              styles.collapseToggle,
              {
                borderColor: BrandColors.gray700,
                backgroundColor: collapseEnabled ? BrandColors.gray800 : 'transparent',
                opacity: collapseEnabled ? 1 : 0.3,
              },
            ]}
            onPress={() => {
              if (!collapseEnabled) return;
              setIsCollapsed((prev) => !prev);
            }}
            disabled={!collapseEnabled}
          >
            <Text style={[styles.collapseToggleText, { color: BrandColors.textSecondary }]}>
              {collapseEnabled ? (isCollapsed ? '▲' : '▼') : '▼'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.setCountButton,
              { borderColor: BrandColors.textSecondary, backgroundColor: BrandColors.gray800, opacity: isSaved ? 0.5 : 1 },
            ]}
            onPress={() => setShowSetPicker(true)}
            disabled={isSaved}
          >
            <Text style={[styles.setCountText, { color: BrandColors.textSecondary }]}>
              {`${setCount} Set${setCount > 1 ? 's' : ''}`}
            </Text>
          </TouchableOpacity>
          {isSaved ? (
            <TouchableOpacity
              style={[styles.editSavedButton, { borderColor: BrandColors.textSecondary, backgroundColor: BrandColors.gray800 }]}
              onPress={() => onSetStatus?.(exercise.id, 'draft')}
            >
              <Text style={[styles.editSavedButtonText, { color: BrandColors.textSecondary }]}>Edit</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemoveExercise(exercise.id)}
          >
            <Text style={[styles.removeButtonText, { color: BrandColors.accent }]}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {collapseEnabled && isCollapsed ? (
        <View style={styles.collapsedSummary}>
          <Text style={[styles.collapsedSummaryText, { color: BrandColors.textSecondary }]}>{collapsedSummaryText}</Text>
        </View>
      ) : (
        <View style={styles.setsContainer}>
          {exercise.sets && Array.isArray(exercise.sets) ? exercise.sets.map((set: any, setIndex: number) => {
            const noteContent = typeof set.notes === 'string' ? set.notes.trim() : '';
            const notesVisible = notesVisibility[set.id] ?? (noteContent.length > 0);

            return (
              <View key={`current-set-${set.id || setIndex}-${exercise.id}`}>
                <View style={styles.setRow}>
                  <Text style={[styles.setNumber, { color: BrandColors.textSecondary }]}>Set {setIndex + 1}</Text>
                  
                  <TextInput
                    style={[
                      styles.setInput,
                      { 
                        color: BrandColors.text, 
                        borderColor: validationErrors[`${exercise.id}-${set.id}`] ? BrandColors.accent : BrandColors.textSecondary 
                      }
                    ]}
                    ref={(ref) => {
                    if (!inputRefs.current[set.id]) {
                      inputRefs.current[set.id] = { weight: null, reps: null, notes: null };
                      }
                      inputRefs.current[set.id].weight = ref;
                    }}
                    value={set.weight?.toString() || ''}
                    editable={!isLocked}
                    selectTextOnFocus={!isLocked}
                    onChangeText={(text) => {
                      const cleanedText = text.replace(/[^0-9.]/g, '');
                      const parts = cleanedText.split('.');
                      if (parts.length > 2) return;
                      if (parts[1] && parts[1].length > 1) return;
                      onUpdateSet(exercise.id, set.id, 'weight', cleanedText ? parseFloat(cleanedText) : null);
                    }}
                    placeholder="Weight"
                    placeholderTextColor={BrandColors.textSecondary}
                    keyboardType="decimal-pad"
                    onFocus={() => {
                      const inputRef = inputRefs.current[set.id]?.weight ?? null;
                      onInputFocus?.(inputRef, 'weight');
                      onWeightFocus?.(exercise.id, set.id);
                    }}
                  />
                  
                  <TextInput
                    style={[
                      styles.setInput,
                      { 
                        color: BrandColors.text, 
                        borderColor: validationErrors[`${exercise.id}-${set.id}`] ? BrandColors.accent : BrandColors.textSecondary 
                      }
                    ]}
                    ref={(ref) => {
                    if (!inputRefs.current[set.id]) {
                      inputRefs.current[set.id] = { weight: null, reps: null, notes: null };
                      }
                      inputRefs.current[set.id].reps = ref;
                    }}
                    value={set.reps?.toString() || ''}
                    editable={!isLocked}
                    selectTextOnFocus={!isLocked}
                    onChangeText={(text) => onUpdateSet(exercise.id, set.id, 'reps', text ? parseInt(text) : null)}
                    placeholder="Reps"
                    placeholderTextColor={BrandColors.textSecondary}
                    keyboardType="numeric"
                    onFocus={() => {
                      const inputRef = inputRefs.current[set.id]?.reps ?? null;
                      onInputFocus?.(inputRef, 'reps');
                    }}
                  />
                  
                  <TouchableOpacity
                    style={[
                      styles.notesToggleButton,
                      {
                        borderColor: BrandColors.textSecondary,
                        backgroundColor: notesVisible ? BrandColors.gray800 : 'transparent',
                        opacity: isLocked ? 0.4 : 1,
                      },
                    ]}
                    onPress={() => handleNotesToggle(set.id, !notesVisible)}
                    disabled={isLocked}
                  >
                  <Text
                    style={[
                      styles.notesToggleIcon,
                      { color: notesVisible ? BrandColors.text : BrandColors.textSecondary },
                    ]}
                  >
                    📝
                  </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeSetButton}
                    onPress={() => !isLocked && onRemoveSet(exercise.id, set.id)}
                    disabled={isLocked}
                  >
                    <Text style={[styles.removeSetButtonText, { color: BrandColors.accent }]}>×</Text>
                  </TouchableOpacity>
                </View>
                
                {notesVisible && (
                  <View style={styles.setNotesRow}>
                    <TextInput
                      style={[
                        styles.setNotesInput,
                        { 
                          color: BrandColors.text, 
                          borderColor: BrandColors.textSecondary,
                          backgroundColor: BrandColors.gray800
                        }
                      ]}
                      value={set.notes || ''}
                      ref={(ref) => {
                        if (!inputRefs.current[set.id]) {
                          inputRefs.current[set.id] = { weight: null, reps: null, notes: null };
                        }
                        inputRefs.current[set.id].notes = ref;
                      }}
                      editable={!isLocked}
                    onFocus={() => {
                      const noteInput = inputRefs.current[set.id]?.notes ?? null;
                      onInputFocus?.(noteInput, undefined);
                    }}
                      onChangeText={(text) => onUpdateSet(exercise.id, set.id, 'notes', text)}
                      placeholder="Add notes for this set (optional)"
                      placeholderTextColor={BrandColors.textSecondary}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              </View>
            );
          }) : (
            <Text style={[styles.helperText, { color: BrandColors.textSecondary }]}>
              No sets available
            </Text>
          )}
        </View>
      )}

      {(!isLocked && onSaveExercise) && (
        <TouchableOpacity
          style={[styles.saveExerciseButton, { backgroundColor: BrandColors.accent }]}
          onPress={() => onSaveExercise(exercise.id)}
        >
          <Text style={[styles.saveExerciseButtonText, { color: BrandColors.gray900 }]}>Save Exercise</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showSetPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSetPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSetPicker(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: BrandColors.surface, borderColor: BrandColors.gray700 }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>How many sets?</Text>
            <View style={styles.setOptionsContainer}>
              {setOptions.map((option) => (
                <TouchableOpacity
                  key={`set-option-${option}`}
                  style={[
                    styles.setOptionButton,
                    {
                      backgroundColor: option === setCount ? BrandColors.accent : BrandColors.gray800,
                      borderColor: option === setCount ? BrandColors.accent : BrandColors.gray700,
                    },
                  ]}
                  onPress={() => handleSelectSetCount(option)}
                >
                  <Text style={[styles.setOptionText, { color: option === setCount ? BrandColors.gray900 : BrandColors.text }]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.modalCancelButton, { borderColor: BrandColors.gray700 }]} onPress={() => setShowSetPicker(false)}>
              <Text style={[styles.modalCancelText, { color: BrandColors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  exerciseCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    marginBottom: 12,
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  collapseToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseTitleGroup: {
    flex: 1,
    marginRight: 10,
    gap: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  savedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  savedBadgeIcon: {
    fontSize: 14,
  },
  exerciseHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  setsContainer: {
    marginBottom: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  setNumber: {
    width: 42,
    fontSize: 13,
    fontWeight: '500',
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  removeSetButton: {
    padding: 8,
  },
  removeSetButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  setNotesRow: {
    marginBottom: 8,
  },
  setNotesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    minHeight: 48,
  },
  notesToggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesToggleIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  setCountButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  editSavedButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editSavedButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  setCountText: {
    fontSize: 13,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  collapsedSummary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.gray700,
    backgroundColor: BrandColors.gray800,
    gap: 2,
  },
  collapsedSummaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  setOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 12,
  },
  setOptionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minWidth: 52,
    alignItems: 'center',
  },
  setOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  saveExerciseButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveExerciseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

