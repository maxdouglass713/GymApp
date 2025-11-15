import { create } from 'zustand';
import { workoutService } from '@/services/firestoreService';
import { useUserStore } from './userStore';
import { persistenceService } from '@/services/persistenceService';
import { generateUniqueId } from '@/utils/id';

export interface WorkoutSet {
  id: string;
  reps: number | null;
  weight: number | null;
  style: 'slow' | 'normal' | 'fast';
  notes?: string;
  videoAttachmentId?: string;
  formAnalysisId?: string;
}

export interface MachineLoadMetadata {
  type: 'pin' | 'plate';
  equipment?: string | string[];
  baseWeight?: number;
  plateCounts?: Record<string, number>;
  exerciseName?: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  notes?: string;
  type?: 'strength' | 'cardio';
  status?: 'draft' | 'saved' | 'completed';
  muscleGroup?: string;
  equipment?: string[] | string;
  isCustom?: boolean;
  customExerciseId?: string;
  trackingStyle?: CustomExerciseTrackingStyle;
  cardioMetrics?: {
    duration?: boolean;
    distance?: boolean;
  };
  isBodyweight?: boolean;
  machineLoad?: MachineLoadMetadata;
}

export interface Workout {
  id: string;
  title: string;
  date: string; // ISO date string
  exercises: WorkoutExercise[];
  createdAt: Date;
  completedAt?: Date;
  status?: 'draft' | 'saved' | 'completed';
}

export type CustomExerciseTrackingStyle =
  | 'weight_reps'
  | 'reps_only'
  | 'time'
  | 'distance'
  | 'time_distance';

export interface CustomExercise {
  id: string;
  name: string;
  type: 'strength' | 'cardio';
  muscleGroup: string;
  equipment: string[];
  isBodyweight: boolean;
  trackingStyle: CustomExerciseTrackingStyle;
  cardioMetrics?: {
    duration?: boolean;
    distance?: boolean;
  };
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomExerciseInput {
  name: string;
  type: 'strength' | 'cardio';
  muscleGroup: string;
  equipment: string[];
  isBodyweight?: boolean;
  trackingStyle?: CustomExerciseTrackingStyle;
  cardioMetrics?: {
    duration?: boolean;
    distance?: boolean;
  };
  description?: string;
}

export interface WorkoutStore {
  // Current workout being built
  currentWorkout: Partial<Workout>;
  
  // Workout history
  workoutHistory: Workout[];
  
  // Selected date for workout
  selectedDate: Date;

  // Custom exercises
  customExercises: CustomExercise[];
  
  // Actions
  setSelectedDate: (date: Date) => void;
  setWorkoutTitle: (title: string) => void;
  addExercise: (exerciseName: string | any) => WorkoutExercise;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  setExerciseSetCount: (exerciseId: string, count: number) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, field: string, value: any) => void;
  updateExerciseNotes: (exerciseId: string, notes: string) => void;
  updateExerciseMachineLoad: (
    exerciseId: string,
    payload: {
      machineLoad: MachineLoadMetadata | undefined;
      name?: string;
      equipment?: string[] | string;
    }
  ) => void;
  setExerciseStatus: (exerciseId: string, status: 'draft' | 'saved') => void;
  markExercisesAsSaved: (exerciseIds?: string | string[]) => void;
  markExerciseAsSaved: (exerciseId: string) => void;
  hydrateDraftWorkout: (workout: Workout) => void;
  finishWorkout: () => Workout | null;
  clearCurrentWorkout: () => void;
  getWorkoutForDate: (date: Date) => Workout | null;
  loadWorkoutsFromFirebase: (uid: string) => Promise<void>;
  saveWorkoutToFirebase: (workout: Workout) => Promise<void>;
  deleteWorkoutFromHistory: (workoutId: string) => Promise<void>;
  restoreFromLocalStorage: () => Promise<void>;
  updateWorkoutInHistory: (updated: Workout) => Promise<void>;
  clearAllWorkoutData: () => void;
  addCustomExercise: (exercise: CustomExerciseInput) => CustomExercise;
  updateCustomExercise: (id: string, updates: Partial<CustomExerciseInput>) => CustomExercise | null;
  removeCustomExercise: (id: string) => void;
  loadCustomExercises: () => Promise<void>;
}

const KG_TO_LB = 2.20462;

const isBodyweightLabel = (label?: string) => {
  if (!label) {
    return false;
  }
  const normalized = label.toLowerCase();
  return normalized.includes('bodyweight') || normalized.includes('body weight') || normalized.includes('own weight');
};

const parseWeightValue = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getUserBodyWeightInLb = (): number | null => {
  const { userDoc, profile } = useUserStore.getState();

  const docWeightValue = parseWeightValue(userDoc?.weight?.value);
  if (docWeightValue !== null) {
    const converted = userDoc?.weight?.unit === 'kg' ? docWeightValue * KG_TO_LB : docWeightValue;
    return Math.round(converted * 10) / 10;
  }

  const profileWeightValue = parseWeightValue(profile?.weight?.value);
  if (profileWeightValue !== null) {
    const converted = profile?.weight?.unit === 'kg' ? profileWeightValue * KG_TO_LB : profileWeightValue;
    return Math.round(converted * 10) / 10;
  }

  return null;
};

const toDateSafe = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    // Handle ISO date strings without timezone by treating them as local dates
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnlyMatch) {
      const [_, yearStr, monthStr, dayStr] = dateOnlyMatch;
      const parsedLocal = new Date(
        Number(yearStr),
        Number(monthStr) - 1,
        Number(dayStr),
        12,
        0,
        0,
        0
      );

      return Number.isNaN(parsedLocal.getTime()) ? null : parsedLocal;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object' && (value as any)?.toDate && typeof (value as any).toDate === 'function') {
    const converted = (value as any).toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }

  return null;
};

const getLocalDateKey = (value: Date | string | number | null | undefined): string => {
  const date =
    value instanceof Date
      ? value
      : toDateSafe(value) ?? new Date();

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  currentWorkout: { exercises: [], status: 'draft' },
  workoutHistory: [],
  selectedDate: new Date(),
  customExercises: [],
  
  setSelectedDate: (date) => {
    set({ selectedDate: date });
    const { currentWorkout } = get();
    if (!currentWorkout.title) {
      const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      set({
        currentWorkout: {
          ...currentWorkout,
          title: `Workout – ${formattedDate}`,
          date: getLocalDateKey(date),
          exercises: currentWorkout.exercises || [],
          status: currentWorkout.status || 'draft',
        }
      });
    }
  },
  
  setWorkoutTitle: (title) => {
    set((state) => ({
      currentWorkout: {
        ...state.currentWorkout,
        title,
      }
    }));
  },

  loadCustomExercises: async () => {
    try {
      const stored = await persistenceService.loadCustomExercises();
      if (stored && Array.isArray(stored)) {
        set({ customExercises: stored as CustomExercise[] });
      } else {
        set({ customExercises: [] });
      }
    } catch (error) {
      console.error('❌ Failed to load custom exercises:', error);
    }
  },

  addCustomExercise: (exerciseInput) => {
    const nowIso = new Date().toISOString();
    const trackingStyle: CustomExerciseTrackingStyle =
      exerciseInput.trackingStyle ||
      (exerciseInput.type === 'strength' ? 'weight_reps' : 'time');

    const cardioMetrics =
      exerciseInput.type === 'cardio'
        ? {
            duration: exerciseInput.cardioMetrics?.duration !== false,
            distance: exerciseInput.cardioMetrics?.distance || false,
          }
        : undefined;

    const customExercise: CustomExercise = {
      id: generateUniqueId('custom_exercise'),
      name: exerciseInput.name.trim(),
      type: exerciseInput.type,
      muscleGroup: exerciseInput.muscleGroup,
      equipment: exerciseInput.equipment.length ? exerciseInput.equipment : ['Bodyweight'],
      isBodyweight: Boolean(exerciseInput.isBodyweight),
      trackingStyle,
      cardioMetrics,
      description: exerciseInput.description?.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    set((state) => {
      const updated = [...state.customExercises, customExercise];
      void persistenceService.saveCustomExercises(updated);
      return { customExercises: updated };
    });

    return customExercise;
  },

  updateCustomExercise: (id, updates) => {
    let updatedExercise: CustomExercise | null = null;
    set((state) => {
      const updatedList = state.customExercises.map((exercise) => {
        if (exercise.id !== id) {
          return exercise;
        }

        const nextTrackingStyle: CustomExerciseTrackingStyle =
          updates.trackingStyle || exercise.trackingStyle;

        const nextCardioMetrics =
          (updates.type || exercise.type) === 'cardio'
            ? {
                duration:
                  updates.cardioMetrics?.duration ??
                  exercise.cardioMetrics?.duration ??
                  true,
                distance:
                  updates.cardioMetrics?.distance ??
                  exercise.cardioMetrics?.distance ??
                  false,
              }
            : undefined;

        updatedExercise = {
          ...exercise,
          ...updates,
          equipment: updates.equipment
            ? updates.equipment.length
              ? updates.equipment
              : ['Bodyweight']
            : exercise.equipment,
          isBodyweight:
            typeof updates.isBodyweight === 'boolean'
              ? updates.isBodyweight
              : exercise.isBodyweight,
          trackingStyle: nextTrackingStyle,
          cardioMetrics: nextCardioMetrics,
          description: updates.description?.trim() || exercise.description,
          updatedAt: new Date().toISOString(),
        };

        return updatedExercise;
      });

      if (updatedExercise) {
        void persistenceService.saveCustomExercises(updatedList);
      }

      return { customExercises: updatedList };
    });

    return updatedExercise;
  },

  removeCustomExercise: (id) => {
    set((state) => {
      const filtered = state.customExercises.filter((exercise) => exercise.id !== id);
      void persistenceService.saveCustomExercises(filtered);
      return { customExercises: filtered };
    });
  },
  
  addExercise: (exerciseData) => {
    let newExercise: WorkoutExercise;
    const isObjectPayload = typeof exerciseData === 'object' && exerciseData !== null;
    const payload = isObjectPayload ? { ...exerciseData } : {};
    const payloadName =
      typeof exerciseData === 'string'
        ? exerciseData
        : payload.displayName || payload.name || 'Custom Exercise';

    const isCardioExercise = isObjectPayload && payload?.type === 'cardio';
    const trackingStyle = isObjectPayload ? (payload?.trackingStyle as CustomExerciseTrackingStyle | undefined) : undefined;
    const equipmentLabel = Array.isArray(payload?.equipment)
      ? payload.equipment.join(', ')
      : payload?.equipment;

    const isBodyweightExercise = typeof exerciseData === 'string'
      ? isBodyweightLabel(exerciseData)
      : Boolean(payload?.isBodyweight) ||
        isBodyweightLabel(equipmentLabel) ||
        isBodyweightLabel(payloadName);

    const defaultBodyWeight =
      !isCardioExercise && isBodyweightExercise ? getUserBodyWeightInLb() : null;

    const initialSet: WorkoutSet = {
      id: generateUniqueId('set'),
      reps: null,
      weight: trackingStyle === 'reps_only' ? null : defaultBodyWeight,
      style: 'normal',
    };

    if (!isObjectPayload) {
      newExercise = {
        id: generateUniqueId('exercise'),
        name: payloadName,
        sets: [initialSet],
        type: 'strength',
        status: 'draft' as const,
      };
    } else {
      const { sets: incomingSets, ...rest } = payload;
      newExercise = {
        ...rest,
        id: generateUniqueId('exercise'),
        name: payloadName,
        type: rest.type || 'strength',
        status: 'draft' as const,
        sets: isCardioExercise && Array.isArray(incomingSets) && incomingSets.length > 0
          ? incomingSets
          : [initialSet],
      };

      if (isBodyweightExercise) {
        newExercise.isBodyweight = true;
      }
      if (equipmentLabel) {
        newExercise.equipment = Array.isArray(rest.equipment) ? rest.equipment : equipmentLabel;
      }
      if (trackingStyle) {
        newExercise.trackingStyle = trackingStyle;
      }
      if (rest.customExerciseId) {
        newExercise.isCustom = true;
      }
    }

    set((state) => {
      const updatedWorkout = {
        ...state.currentWorkout,
        status: 'draft' as const,
        exercises: [...(state.currentWorkout.exercises || []), newExercise],
      };
      
      // Auto-save to local storage
      persistenceService.autoSave('workout', updatedWorkout);
      
      return { currentWorkout: updatedWorkout };
    });

    return newExercise;
  },
  
  removeExercise: (exerciseId) => {
    set((state) => {
      const updatedWorkout = {
        ...state.currentWorkout,
        status: 'draft' as const,
        exercises: state.currentWorkout.exercises?.filter(ex => ex.id !== exerciseId) || [],
      };
      
      // Auto-save to local storage
      persistenceService.autoSave('workout', updatedWorkout);
      
      return { currentWorkout: updatedWorkout };
    });
  },
  
  addSet: (exerciseId) => {
    set((state) => {
      const updatedWorkout = {
        ...state.currentWorkout,
        status: 'draft' as const,
        exercises: state.currentWorkout.exercises?.map(ex =>
          ex.id === exerciseId
            ? (() => {
                const previousSet = ex.sets?.[ex.sets.length - 1];
                // For plate loaded machines, additional sets should be blank
                const isPlateLoaded = ex.machineLoad?.type === 'plate';
                const derivedWeight = isPlateLoaded
                  ? null // Blank for plate loaded machines
                  : previousSet && previousSet.weight !== null && previousSet.weight !== undefined
                    ? previousSet.weight
                    : isBodyweightLabel(ex.name) ? getUserBodyWeightInLb() : null;

                const newSet: WorkoutSet = {
                  id: generateUniqueId('set'),
                  reps: null,
                  weight: derivedWeight,
                  style: 'normal',
                };

                return {
                  ...ex,
                  status: 'draft' as const,
                  sets: [...ex.sets, newSet],
                };
              })()
            : ex
        ) || [],
      };
      
      // Auto-save to local storage
      persistenceService.autoSave('workout', updatedWorkout);
      
      return { currentWorkout: updatedWorkout };
    });
  },

  setExerciseSetCount: (exerciseId, count) => {
    const requestedCount = Number.isFinite(count) ? Math.floor(count) : 1;
    const safeCount = Math.min(Math.max(requestedCount, 1), 12);

    set((state) => {
      const exercise = state.currentWorkout.exercises?.find((ex) => ex.id === exerciseId);

      if (!exercise) {
        return state;
      }

      const currentCount = exercise.sets?.length || 0;

      if (safeCount > currentCount) {
        const setsToAdd = safeCount - currentCount;
        const isPlateLoaded = exercise.machineLoad?.type === 'plate';
        // When setting set count from bubble buttons, don't copy weight from first set
        // Only set bodyweight for bodyweight exercises
        const defaultWeight = isPlateLoaded
          ? null
          : isBodyweightLabel(exercise.name)
            ? getUserBodyWeightInLb()
            : null;

        const newSets: WorkoutSet[] = Array.from({ length: setsToAdd }, () => ({
          id: generateUniqueId('set'),
          reps: null,
          weight: defaultWeight,
          style: 'normal',
        }));

        const updatedWorkout = {
          ...state.currentWorkout,
          status: 'draft' as const,
          exercises: state.currentWorkout.exercises?.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  status: 'draft' as const,
                  sets: [...(ex.sets || []), ...newSets],
                }
              : ex
          ) || [],
        };

        // Auto-save to local storage
        persistenceService.autoSave('workout', updatedWorkout);

        return { currentWorkout: updatedWorkout };
      }

      if (safeCount < currentCount) {
        const setsToRemove = exercise.sets?.slice(safeCount) || [];
        const updatedWorkout = {
          ...state.currentWorkout,
          status: 'draft' as const,
          exercises: state.currentWorkout.exercises?.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  status: 'draft' as const,
                  sets: ex.sets?.filter((set) => !setsToRemove.some((r) => r.id === set.id)) || [],
                }
              : ex
          ) || [],
        };

        // Auto-save to local storage
        persistenceService.autoSave('workout', updatedWorkout);

        return { currentWorkout: updatedWorkout };
      }

      return state;
    });
  },
  
  removeSet: (exerciseId, setId) => {
    set((state) => {
      const updatedWorkout = {
        ...state.currentWorkout,
        status: 'draft' as const,
        exercises: state.currentWorkout.exercises?.map(ex => 
          ex.id === exerciseId 
            ? { ...ex, status: 'draft' as const, sets: ex.sets.filter(set => set.id !== setId) }
            : ex
        ) || [],
      };
      
      // Auto-save to local storage
      persistenceService.autoSave('workout', updatedWorkout);
      
      return { currentWorkout: updatedWorkout };
    });
  },
  
  updateSet: (exerciseId, setId, field, value) => {
    set((state) => {
      const updatedWorkout = {
        ...state.currentWorkout,
        status: 'draft' as const,
        exercises: state.currentWorkout.exercises?.map(ex => 
          ex.id === exerciseId 
            ? { 
                ...ex, 
                status: 'draft' as const,
                sets: ex.sets.map(set => 
                  set.id === setId ? { ...set, [field]: value } : set
                )
              }
            : ex
        ) || [],
      };
      
      // Auto-save to local storage
      persistenceService.autoSave('workout', updatedWorkout);
      
      return { currentWorkout: updatedWorkout };
    });
  },
  
  updateExerciseNotes: (exerciseId, notes) => {
    set((state) => {
      const updatedWorkout = {
        ...state.currentWorkout,
        status: 'draft' as const,
        exercises: state.currentWorkout.exercises?.map(ex => 
          ex.id === exerciseId ? { ...ex, status: 'draft' as const, notes } : ex
        ) || [],
      };
      
      // Auto-save to local storage
      persistenceService.autoSave('workout', updatedWorkout);
      
      return { currentWorkout: updatedWorkout };
    });
  },
  
  updateExerciseMachineLoad: (exerciseId, payload) => {
    set((state) => {
      const updatedExercises = state.currentWorkout.exercises?.map((ex) => {
        if (ex.id !== exerciseId) {
          return ex;
        }

        const nextExercise = {
          ...ex,
          machineLoad: payload.machineLoad,
        };

        if (payload.name) {
          nextExercise.name = payload.name;
        }

        if (payload.equipment !== undefined) {
          nextExercise.equipment = payload.equipment;
        }

        return nextExercise;
      }) || [];

      const updatedWorkout = {
        ...state.currentWorkout,
        status: 'draft' as const,
        exercises: updatedExercises,
      };

      persistenceService.autoSave('workout', updatedWorkout);

      return { currentWorkout: updatedWorkout };
    });
  },

  setExerciseStatus: (exerciseId, status) => {
    set((state) => {
      const updatedWorkout = {
        ...state.currentWorkout,
        exercises: state.currentWorkout.exercises?.map(ex =>
          ex.id === exerciseId ? { ...ex, status: status } : ex
        ) || [],
      };

      persistenceService.autoSave('workout', updatedWorkout);

      return { currentWorkout: updatedWorkout };
    });
  },

  markExercisesAsSaved: (exerciseIds) => {
    const { selectedDate, saveWorkoutToFirebase } = get();
    const selectedDateKey = getLocalDateKey(selectedDate);
    let workoutToPersist: Workout | null = null;

    const idsArray = exerciseIds
      ? Array.isArray(exerciseIds)
        ? exerciseIds
        : [exerciseIds]
      : null;
    const idsSet = idsArray ? new Set(idsArray) : null;

    set((state) => {
      const currentExercises = (state.currentWorkout.exercises || []) as WorkoutExercise[];
      const updatedExercises: WorkoutExercise[] = currentExercises.map((ex) => {
        const shouldUpdate = !idsSet || idsSet.has(ex.id);
        if (!shouldUpdate) {
          return ex;
        }

        const nextStatus: 'saved' | 'completed' = ex.status === 'completed' ? 'completed' : 'saved';
        return {
          ...ex,
          status: nextStatus,
        };
      });

      const allLocked = updatedExercises.every((ex) => ex.status === 'saved' || ex.status === 'completed');
      const workoutStatus: 'draft' | 'saved' | 'completed' =
        state.currentWorkout.status === 'completed'
          ? 'completed'
          : allLocked
            ? 'saved'
            : 'draft';

      const dateParts = selectedDateKey.split('-').map(Number);
      const [year, month, day] =
        dateParts.length === 3
          ? dateParts
          : [selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate()];

      const updatedWorkout: Workout = {
        id: state.currentWorkout.id || generateUniqueId('workout'),
        title:
          state.currentWorkout.title ||
          `Workout – ${selectedDateKey}`,
        date: state.currentWorkout.date || selectedDateKey,
        exercises: updatedExercises as WorkoutExercise[],
        createdAt: state.currentWorkout.createdAt
          ? toDateSafe(state.currentWorkout.createdAt) || new Date()
          : new Date(),
        completedAt: state.currentWorkout.status === 'completed'
          ? toDateSafe(state.currentWorkout.completedAt) || new Date()
          : undefined,
        status: workoutStatus,
      };

      const updatedHistory = [...state.workoutHistory];
      const existingIndex = updatedHistory.findIndex(
        (workout) =>
          workout.date === updatedWorkout.date && workout.status !== 'completed'
      );

      if (existingIndex >= 0) {
        updatedHistory[existingIndex] = {
          ...updatedHistory[existingIndex],
          ...updatedWorkout,
          exercises: updatedExercises as WorkoutExercise[],
          status: updatedWorkout.status,
        };
      } else {
        updatedHistory.push({
          ...updatedWorkout,
        });
      }

      persistenceService.autoSave('workout', updatedWorkout);
      persistenceService.saveWorkoutHistory(updatedHistory);

      workoutToPersist = updatedWorkout;

      return {
        currentWorkout: updatedWorkout,
        workoutHistory: updatedHistory,
      };
    });

    if (workoutToPersist) {
      saveWorkoutToFirebase(workoutToPersist).catch((error) => {
        console.error('❌ Failed to persist saved workout to Firebase:', error);
      });
    }
  },
  markExerciseAsSaved: (exerciseId) => {
    get().markExercisesAsSaved(exerciseId);
  },

  hydrateDraftWorkout: (workout) => {
    set(() => {
      const normalizedExercises =
        workout.exercises?.map((exercise) => ({
          ...exercise,
          status: exercise.status || 'saved',
          sets: Array.isArray(exercise.sets)
            ? exercise.sets.map((set) => ({
                ...set,
              }))
            : [],
        })) || [];

      return {
        currentWorkout: {
          ...workout,
          exercises: normalizedExercises,
          status: workout.status || 'saved',
          createdAt: toDateSafe(workout.createdAt) || new Date(),
          completedAt: workout.completedAt
            ? toDateSafe(workout.completedAt) || undefined
            : undefined,
        },
      };
    });
  },

  finishWorkout: () => {
    const { currentWorkout, selectedDate, saveWorkoutToFirebase } = get();
    
    console.log('🏋️ Finishing workout...');
    console.log('📋 Current workout:', currentWorkout);
    
    if (!currentWorkout.exercises || currentWorkout.exercises.length === 0) {
      console.log('❌ No exercises found in current workout');
      return null;
    }
    
    // Validate that all strength exercise sets have reps and weight
    // Skip validation for cardio exercises
    const hasIncompleteSets = currentWorkout.exercises.some(ex => {
      if (ex.type === 'cardio') {
        return false; // Skip validation for cardio
      }
      return ex.sets && ex.sets.some(set => set.reps === null || set.weight === null);
    });
    
    if (hasIncompleteSets) {
      console.log('❌ Incomplete sets found');
      return null;
    }
    
    const now = new Date();
    const currentWorkoutId =
      typeof currentWorkout.id === 'string' && currentWorkout.id.trim() !== ''
        ? currentWorkout.id
        : null;
    const existingWorkout = currentWorkoutId
      ? get().workoutHistory.find((workout) => workout.id === currentWorkoutId)
      : null;
    const completedWorkout: Workout = {
      id: currentWorkoutId || generateUniqueId('workout'),
      title: currentWorkout.title || `Workout – ${selectedDate.toLocaleDateString()}`,
      date: getLocalDateKey(selectedDate),
      exercises: (currentWorkout.exercises as WorkoutExercise[]).map((exercise) => ({
        ...exercise,
        status: 'completed',
      })),
      createdAt: toDateSafe(currentWorkout.createdAt) || existingWorkout?.createdAt || now,
      completedAt: now,
      status: 'completed',
    };
    
    console.log('✅ Completed workout created:', completedWorkout);
    
    set((state) => {
      const filteredHistory = state.workoutHistory.filter((workout) => {
        if (workout.id === completedWorkout.id) {
          return false;
        }
        if (
          workout.date === completedWorkout.date &&
          workout.status !== 'completed'
        ) {
          return false;
        }
        return true;
      });
      const updatedHistory = [...filteredHistory, completedWorkout];
      
      // Save workout history to local storage
      persistenceService.saveWorkoutHistory(updatedHistory);
      
      return {
        workoutHistory: updatedHistory,
        currentWorkout: { exercises: [], status: 'draft' },
      };
    });
    
    // Try to save to Firebase in background (don't wait for it)
    const userState = useUserStore.getState();
    if (userState.userDoc?.id) {
      saveWorkoutToFirebase(completedWorkout).catch(error => {
        console.log('❌ Firebase save failed, but workout saved locally:', error);
      });
    }
    
    return completedWorkout;
  },
  
  clearCurrentWorkout: () => {
    set({ currentWorkout: { exercises: [], status: 'draft' } });
  },
  
  getWorkoutForDate: (date) => {
    const { workoutHistory } = get();
    const dateString = getLocalDateKey(date);
    return workoutHistory.find(workout => workout.date === dateString) || null;
  },
  
  loadWorkoutsFromFirebase: async (uid: string) => {
    try {
      console.log('📥 Loading workouts from Firebase for user:', uid);
      
      if (!uid || uid.trim() === '') {
        console.log('ℹ️ No valid UID provided for workout loading, clearing history');
        set({ workoutHistory: [] });
        return;
      }

      console.log('🔄 Calling Firebase service...');
      const workouts = await workoutService.getUserWorkouts(uid);
      console.log('📊 Raw Firebase workouts received:', workouts.length);
      
      if (!workouts || workouts.length === 0) {
        console.log('ℹ️ No workouts found in Firebase for this user');
        set({ workoutHistory: [] });
        // Clear local storage for users with no workouts in Firebase
        persistenceService.saveWorkoutHistory([]);
        persistenceService.saveCurrentWorkout({ exercises: [] });
        console.log('🧹 Cleared local workout storage for user with no Firebase workouts');
        return;
      }
      
      // Convert Firestore documents to Workout objects
      const workoutHistory = workouts.map((workout, index) => {
        try {
          console.log(`🔄 Processing workout ${index + 1}/${workouts.length}:`, {
            id: workout.id,
            name: workout.name,
            hasExercises: !!workout.exercises,
            exerciseCount: workout.exercises?.length || 0,
            exercisesType: typeof workout.exercises,
            isExercisesArray: Array.isArray(workout.exercises)
          });

          // Validate workout structure
          if (!workout) {
            console.error('❌ Workout is null or undefined');
            return null;
          }

          // Convert exercises object to array if needed
          let exercisesArray: any[] = [];
          
          if (workout.exercises) {
            if (Array.isArray(workout.exercises)) {
              console.log(`  ✅ Exercises is already an array with ${workout.exercises.length} items`);
              exercisesArray = workout.exercises;
            } else if (typeof workout.exercises === 'object') {
              console.log(`  🔄 Converting exercises object to array...`);
              const keys = Object.keys(workout.exercises);
              console.log(`  📋 Found keys:`, keys);
              exercisesArray = keys
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => {
                  const exercise = (workout.exercises as any)[key];
                  console.log(`  🔍 Converting key "${key}":`, exercise);
                  return exercise;
                });
              console.log(`  ✅ Converted to array with ${exercisesArray.length} items`);
            }
          } else {
            console.log(`  ⚠️ No exercises found in workout`);
          }

          const isTemplate = !!workout.isTemplate;
          const completedAtDate = workout.completedAt
            ? toDateSafe(workout.completedAt) || null
            : null;

          const processedWorkout = {
            // IMPORTANT: Use the original workout ID if it exists, otherwise use Firebase doc ID
            // The original workout.id is what was used as referenceId for points
            id: workout.originalWorkoutId || workout.id || `workout_${Date.now()}_${index}`,
            title: workout.name || 'Untitled Workout',
            date: getLocalDateKey(workout.scheduledDate || workout.completedAt || new Date()),
            exercises: exercisesArray.map((exercise, exerciseIndex) => {
              try {
                console.log(`  🔄 Processing exercise ${exerciseIndex + 1}:`, {
                  id: exercise.id,
                  name: exercise.name,
                  hasSets: !!exercise.sets,
                  setCount: exercise.sets?.length || 0
                });

                // Convert sets object to array if needed
                let setsArray: any[] = [];
                
                if (exercise.sets) {
                  if (Array.isArray(exercise.sets)) {
                    setsArray = exercise.sets;
                  } else if (typeof exercise.sets === 'object') {
                    setsArray = Object.keys(exercise.sets)
                      .sort((a, b) => parseInt(a) - parseInt(b))
                      .map(key => (exercise.sets as any)[key]);
                  }
                }

                return {
                  id: exercise.id || `exercise_${Date.now()}_${exerciseIndex}`,
                  name: exercise.name || 'Unknown Exercise',
                  sets: setsArray.map((set, setIndex) => {
                    try {
                      return {
                        id: set.id || `set_${Date.now()}_${setIndex}`,
                        reps: typeof set.reps === 'number' ? set.reps : null,
                        weight: typeof set.weight === 'number' ? set.weight : null,
                        style: 'normal' as const,
                        notes: set.notes || '',
                      };
                    } catch (setError) {
                      console.error(`❌ Error processing set ${setIndex}:`, setError, set);
                      return {
                        id: `set_${Date.now()}_${setIndex}`,
                        reps: null,
                        weight: null,
                        style: 'normal' as const,
                        notes: '',
                      };
                    }
                  }),
                  notes: exercise.notes || '',
                  type: 'strength' as const,
                  status: isTemplate ? 'saved' as const : 'completed' as const,
                };
              } catch (exerciseError) {
                console.error(`❌ Error processing exercise ${exerciseIndex}:`, exerciseError, exercise);
                return {
                  id: `exercise_${Date.now()}_${exerciseIndex}`,
                  name: 'Error Loading Exercise',
                  sets: [],
                  notes: '',
                  type: 'strength' as const,
                };
              }
            }),
            createdAt: workout.createdAt || new Date(),
            completedAt: isTemplate ? undefined : completedAtDate || new Date(),
            status: isTemplate ? 'saved' as const : 'completed' as const,
          };

          console.log(`✅ Successfully processed workout ${index + 1}`);
          return processedWorkout;
        } catch (workoutError) {
          console.error(`❌ Error processing workout ${index}:`, workoutError);
          console.error('❌ Workout data:', workout);
          return null;
        }
      }).filter(Boolean) as Workout[];

      set({ workoutHistory });
      console.log('✅ Successfully loaded workouts from Firebase!');
      console.log('📋 Workout summary:', workoutHistory.map(w => ({
        title: w.title,
        date: w.date,
        exerciseCount: w.exercises.length
      })));
      
    } catch (error: unknown) {
      console.error('❌ Error loading workouts from Firebase:', error);
      
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      console.error('❌ Error details:', errorMessage);
      
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('❌ Error code:', error.code);
      }
      
      // Create fallback workouts if processing completely fails
      console.log('🔄 Creating fallback workout data...');
      const fallbackWorkouts = [
        {
          id: 'fallback_friday',
          title: 'Workout – Friday',
          date: getLocalDateKey(new Date()),
          exercises: [
              {
                id: 'fallback_exercise_1',
                name: 'Sample Exercise',
                sets: [
                  {
                    id: 'fallback_set_1',
                    reps: 10,
                    weight: 50,
                    style: 'normal' as const,
                    notes: '',
                  }
                ],
                notes: '',
                type: 'strength' as const,
              }
          ],
          createdAt: new Date(),
          completedAt: new Date(),
          status: 'completed' as const,
        }
      ];
      
      set({ workoutHistory: fallbackWorkouts });
      console.log('✅ Set fallback workout data');
    }
  },

  // Restore data from local storage
  restoreFromLocalStorage: async () => {
    try {
      console.log('📱 Restoring workout data from local storage...');
      const [workoutHistory, currentWorkout, customExercises] = await Promise.all([
        persistenceService.loadWorkoutHistory(),
        persistenceService.loadCurrentWorkout(),
        persistenceService.loadCustomExercises(),
      ]);

      if (workoutHistory) {
        console.log(`📱 Restored ${workoutHistory.length} workouts from local storage`);
        set({ workoutHistory });
      }

      if (currentWorkout) {
        console.log('📱 Restored current workout from local storage');
        set({ currentWorkout });
      }

      if (customExercises) {
        console.log(`📱 Restored ${customExercises.length} custom exercises from local storage`);
        set({ customExercises });
      }

      console.log('📱 Workout data restored from local storage');
      
    } catch (error) {
      console.error('❌ Failed to restore workout data:', error);
    }
  },

  saveWorkoutToFirebase: async (workout: Workout) => {
    try {
      const userState = useUserStore.getState();
      
      // Try to get user ID from multiple sources
      let userId = null;
      
      if (userState.userDoc?.id) {
        userId = userState.userDoc.id;
        console.log('🔥 Using user ID from userDoc:', userId);
      } else {
        // Try to get from auth context
        const { user } = require('@/components/AuthProvider').useAuth();
        if (user?.uid) {
          userId = user.uid;
          console.log('🔥 Using user ID from auth:', userId);
        }
      }
      
      if (!userId) {
        console.log('❌ No user ID found, cannot save workout to Firebase');
        return;
      }

      console.log('🔥 Saving workout to Firebase for user:', userId);
      console.log('📋 Workout details:', {
        title: workout.title,
        exerciseCount: workout.exercises?.length || 0,
        completedAt: workout.completedAt,
        userId: userId
      });

      // Convert exercises to array if needed (same logic as loadWorkoutsFromFirebase)
      let exercisesArray: any[] = [];
      
      if (workout.exercises) {
        if (Array.isArray(workout.exercises)) {
          exercisesArray = workout.exercises;
        } else if (typeof workout.exercises === 'object') {
          exercisesArray = Object.keys(workout.exercises)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => (workout.exercises as any)[key]);
        }
      }

      const isTemplate = workout.status === 'saved' || workout.status === 'draft';

      let completedAt: Date | undefined;
      if (isTemplate) {
        if (workout.date) {
          const [yearStr, monthStr, dayStr] = workout.date.split('-');
          const year = Number(yearStr);
          const month = Number(monthStr) - 1;
          const day = Number(dayStr);
          const localDate = new Date(year, month, day, 12, 0, 0, 0);
          completedAt = localDate;
        } else {
          completedAt = workout.completedAt || new Date();
        }
      } else {
        completedAt = workout.completedAt || new Date();
      }

      if (isTemplate && workout.id) {
        try {
          await workoutService.deleteWorkoutByOriginalId(userId, workout.id);
        } catch (error) {
          console.log('⚠️ Failed to delete existing draft workout:', error);
        }
      }

      const workoutData = {
        uid: userId,
        name: workout.title || 'Untitled Workout',
        // Store the original workout ID so we can use it for point deduction
        originalWorkoutId: workout.id,
        status: workout.status,
        scheduledDate: workout.date,
        exercises: exercisesArray.map(exercise => {
          // Convert sets to array if needed
          let setsArray: any[] = [];
          
          if (exercise.sets) {
            if (Array.isArray(exercise.sets)) {
              setsArray = exercise.sets;
            } else if (typeof exercise.sets === 'object') {
              setsArray = Object.keys(exercise.sets)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(key => (exercise.sets as any)[key]);
            }
          }

          return {
            id: exercise.id,
            name: exercise.name,
            sets: setsArray.map(set => ({
              id: set.id,
              reps: set.reps || 0,
              weight: set.weight || 0,
              notes: set.notes || '',
            })),
            notes: exercise.notes || '',
          };
        }),
        completedAt,
        isTemplate,
      };

      console.log('📤 Sending workout data to Firebase...');
      const workoutId = await workoutService.createWorkout(workoutData);
      console.log('✅ Workout saved to Firebase successfully with ID:', workoutId);
      console.log('👤 Saved under user ID:', userId);
      
    } catch (error: unknown) {
      console.error('❌ Error saving workout to Firebase:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
    }
  },
  
  deleteWorkoutFromHistory: async (workoutId: string) => {
    try {
      console.log('🗑️ deleteWorkoutFromHistory called with workoutId:', workoutId);
      
      // Get user UID for point deduction - try multiple sources
      const userState = useUserStore.getState();
      const uid = userState.userDoc?.id;
      
      // If no UID from userDoc, try to get from auth context
      if (!uid) {
        try {
          const { useAuth } = await import('@/components/AuthProvider');
          // We can't use the hook directly here, so we'll get it from the caller
          // For now, we'll deduct points if we have a workoutId and the caller provides UID
        } catch (e) {
          console.log('Could not get auth context');
        }
      }
      
      // Optimistically update local state FIRST
      set((state) => {
        const filteredHistory = state.workoutHistory.filter(w => w.id !== workoutId);
        console.log('🗑️ Filtered workout history. Before:', state.workoutHistory.length, 'After:', filteredHistory.length);
        return {
          workoutHistory: filteredHistory,
        };
      });
      
      // Persist locally
      const { workoutHistory } = get();
      persistenceService.saveWorkoutHistory(workoutHistory);
      console.log('✅ Workout removed from local state and persisted');
      
      // Remove from Firebase (try by document ID first, then by original ID)
      try {
      await workoutService.deleteWorkout(workoutId);
        console.log('✅ Workout removed from Firebase by document ID');
      } catch (directDeleteError) {
        console.log('ℹ️ Could not delete workout by document ID:', directDeleteError instanceof Error ? directDeleteError.message : directDeleteError);
      }
      
      if (uid) {
        try {
          await workoutService.deleteWorkoutByOriginalId(uid, workoutId);
        } catch (originalDeleteError) {
          console.error('❌ Failed to delete workout by original ID:', originalDeleteError);
        }
      }
      
      console.log('✅ Workout deletion from Firebase complete');
    } catch (error) {
      console.error('❌ Failed to delete workout:', error);
      throw error; // Re-throw so caller can handle
    }
  },
  
  updateWorkoutInHistory: async (updated: Workout) => {
    try {
      // Update local state
      set((state) => ({
        workoutHistory: state.workoutHistory.map(w => w.id === updated.id ? { ...updated } : w),
      }));
      // Persist locally
      const { workoutHistory } = get();
      persistenceService.saveWorkoutHistory(workoutHistory);

      // Persist to Firebase in background if workout has a Firestore id shape
      try {
        await workoutService.updateWorkout(updated.id, {
          name: updated.title,
          exercises: updated.exercises.map(ex => ({
            id: ex.id,
            name: ex.name,
            notes: ex.notes || '',
            sets: ex.sets.map(s => ({ id: s.id, reps: s.reps || 0, weight: s.weight || 0, notes: s.notes || '' }))
          })),
          completedAt: updated.completedAt || new Date(),
        } as any);
      } catch (fbErr) {
        console.log('⚠️ Firebase update failed (kept local changes):', fbErr);
      }
    } catch (error) {
      console.error('❌ Failed to update workout:', error);
    }
  },

  clearAllWorkoutData: () => {
    console.log('🧹 Clearing all workout data from store and local storage');
    set({
      currentWorkout: { exercises: [], status: 'draft' },
      workoutHistory: [],
      selectedDate: new Date(),
      customExercises: [],
    });
    // Clear from local storage
    persistenceService.saveWorkoutHistory([]);
    persistenceService.saveCurrentWorkout({ exercises: [] });
    persistenceService.saveCustomExercises([]);
    console.log('✅ All workout data cleared');
  },
}));
