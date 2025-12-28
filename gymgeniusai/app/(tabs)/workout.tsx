import React, { useState, useEffect, useCallback, useRef, useMemo, Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  LayoutChangeEvent,
  findNodeHandle,
  Share,
} from 'react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { useWorkoutStore } from '@/stores/workoutStore';
import { usePointsStore } from '@/stores/pointsStore';
import { useVideoStore } from '@/stores/videoStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useCommunityStore } from '@/stores/communityStore';
import { useAuth } from '@/components/AuthProvider';
import { useUserStore } from '@/stores/userStore';
import { teamService } from '@/services/teamService';
import { userService } from '@/services/firestoreService';
import { workoutSharingService } from '@/services/workoutSharingService';
import { generateUniqueId } from '@/utils/id';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { EXERCISE_DATABASE, CARDIO_DATABASE, STYLE_OPTIONS } from '@/utils/workout/exerciseDatabase';
import { CardioModal } from '@/components/workout/modals/CardioModal';
import { EquipmentModal } from '@/components/workout/modals/EquipmentModal';
import { UnlockModal } from '@/components/workout/modals/UnlockModal';
import { VideoModal } from '@/components/workout/modals/VideoModal';
import { ReviewModal } from '@/components/workout/modals/ReviewModal';
import { AnalysisModal } from '@/components/workout/modals/AnalysisModal';
import { EditTodaysWorkoutModal } from '@/components/workout/modals/EditTodaysWorkoutModal';
import { ShareModal } from '@/components/workout/modals/ShareModal';
import { WeekPicker } from '@/components/workout/WeekPicker';
import { LightningSeparator } from '@/components/shared/LightningSeparator';
import { WorkoutTypeToggle } from '@/components/workout/WorkoutTypeToggle';
import { WorkoutMetadata } from '@/components/workout/WorkoutMetadata';
import { ExerciseSearch } from '@/components/workout/ExerciseSearch';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { TodaysWorkout } from '@/components/workout/TodaysWorkout';
import { SegmentedControl } from '@/components/workout/SegmentedControl';
import { FavoritesList } from '@/components/workout/FavoritesList';
import { useSharedWorkout } from '@/hooks/useWorkout/useSharedWorkout';
import { DatePickerModal } from '@/components/shared/DatePickerModal';
import { router, useLocalSearchParams } from 'expo-router';
import { eventBus } from '@/lib/eventBus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomExerciseModal } from '@/components/workout/modals/CustomExerciseModal';
import type { CustomExercise, CustomExerciseInput, MachineLoadMetadata } from '@/stores/workoutStore';
import { useWeightStore } from '@/stores/weightStore';
import { WorkoutPlanGenerator } from '@/components/WorkoutPlanGenerator';
import { AISuggestExerciseButton } from '@/components/workout/AISuggestExerciseButton';
import { logErrorToFirebase } from '@/utils/errorLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MACHINE_PLATE_WEIGHTS = [45, 35, 25, 10, 5, 2.5] as const;
const DEFAULT_MACHINE_BASE_WEIGHT = 25;

const createInitialPlateCounts = (): Record<string, number> => {
  return MACHINE_PLATE_WEIGHTS.reduce<Record<string, number>>((acc, weight) => {
    acc[String(weight)] = 0;
    return acc;
  }, {});
};

type MachineSelectionState = {
  exerciseName: string;
  equipment: string;
  exerciseId?: string;
  targetSetId?: string;
  baseWeight?: number;
  machineLoad?: MachineLoadMetadata;
};

// Exercise database moved to @/utils/workout/exerciseDatabase.ts

export default function WorkoutScreen() {
  const { user } = useAuth();
  const insetsRaw = useSafeAreaInsets();
  
  // Ensure insets has valid values (defensive check)
  const insets = insetsRaw || { top: 0, bottom: 0, left: 0, right: 0 };
  const scrollViewRef = useRef<ScrollView>(null);
  const searchSectionOffsetRef = useRef(0);
  const suppressPlateModalSetRef = useRef<string | null>(null);
  const baseWeightInputRef = useRef<TextInput | null>(null);
  const {
    currentWorkout,
    selectedDate: rawSelectedDate,
    workoutHistory,
    customExercises,
    setSelectedDate,
    setWorkoutTitle,
    addExercise,
    removeExercise,
    updateSet,
    setExerciseSetCount: setExerciseSetCountOriginal,
    removeSet,
    setExerciseStatus,
    markExerciseAsSaved,
    hydrateDraftWorkout,
    finishWorkout,
    clearCurrentWorkout,
    loadWorkoutsFromFirebase,
    getWorkoutForDate,
    saveWorkoutToFirebase,
    deleteWorkoutFromHistory,
    addCustomExercise,
    loadCustomExercises,
    updateExerciseMachineLoad,
  } = useWorkoutStore();
  
  // Ensure selectedDate is always valid - normalize immediately
  const selectedDate = (rawSelectedDate && rawSelectedDate instanceof Date && !isNaN(rawSelectedDate.getTime()))
    ? rawSelectedDate
    : new Date();
  
  // Fix selectedDate in store if it's invalid (run once on mount)
  useEffect(() => {
    if (!rawSelectedDate || !(rawSelectedDate instanceof Date) || isNaN(rawSelectedDate.getTime())) {
      console.warn('⚠️ Invalid selectedDate detected in store, fixing...');
      try {
        setSelectedDate(new Date());
      } catch (error) {
        console.error('❌ Error fixing selectedDate:', error);
      }
    }
  }, []); // Only run once on mount

  const { addPoints, canEarnToday, getDailyEarned } = usePointsStore();
  const { favorites, addFavorite, removeFavorite, updateFavorite, updateLastUsed, restoreFromLocalStorage } = useFavoritesStore();
  const { communities, activeCommunityId, createFeedEntry } = useCommunityStore();
  const { profile } = useUserStore();
  const { loadWeightsFromFirebase } = useWeightStore();
  
  // Check if user is a coach - use profile check for consistency
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
  const isPlayer = profile?.userType === 'institution' && profile?.institutionRole === 'player';
  const isTrainerClient = profile?.appUseType === 'gym_trainer' && profile?.institutionRole === 'player';
  const isClient = isPlayer || isTrainerClient;
  
  // Use shared workout hook
  useSharedWorkout();
  
  // Mock function for feature unlocking (since useVideoStore doesn't have isFeatureUnlocked)
  const isFeatureUnlocked = (feature: string) => {
    // For now, return true for all features to avoid errors
    return true;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [currentSharedWorkoutId, setCurrentSharedWorkoutId] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [workoutType, setWorkoutType] = useState<'strength' | 'cardio'>('strength');
  const [showCardioModal, setShowCardioModal] = useState(false);
  const [selectedCardioActivity, setSelectedCardioActivity] = useState('');
  const [todaysWorkout, setTodaysWorkout] = useState<any>(null);
  const [showEditTodaysWorkout, setShowEditTodaysWorkout] = useState(false);
  const [editingTodaysWorkout, setEditingTodaysWorkout] = useState<any>(null);
  const [cardioDuration, setCardioDuration] = useState('');
  const [cardioSpeed, setCardioSpeed] = useState('');
  const [cardioDistance, setCardioDistance] = useState('');
  const [cardioIntensity, setCardioIntensity] = useState('moderate');
  const [cardioCaloriesBurned, setCardioCaloriesBurned] = useState('');
  const [customCardioMetrics, setCustomCardioMetrics] = useState<{ duration?: boolean; distance?: boolean } | null>(null);
  const [activeCustomCardioExerciseId, setActiveCustomCardioExerciseId] = useState<string | null>(null);
  type SetFocusRequest = { exerciseId: string; setId: string; field: 'weight' | 'reps' };
  const [pendingSetFocus, setPendingSetFocus] = useState<SetFocusRequest | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);
  const [showWorkoutPlanGenerator, setShowWorkoutPlanGenerator] = useState(false);
  
  // Equipment selection modal state
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [showCableGripModal, setShowCableGripModal] = useState(false);
  const [pendingCableSelection, setPendingCableSelection] = useState<{ exerciseName: string; equipment: string } | null>(null);
  const [showMachineLoadModal, setShowMachineLoadModal] = useState(false);
  const [pendingMachineSelection, setPendingMachineSelection] = useState<MachineSelectionState | null>(null);
  const [showPlateSelectionModal, setShowPlateSelectionModal] = useState(false);
  const [plateCounts, setPlateCounts] = useState<Record<string, number>>(() => createInitialPlateCounts());
  const [plateBaseWeight, setPlateBaseWeight] = useState(DEFAULT_MACHINE_BASE_WEIGHT);
  const [plateBaseWeightText, setPlateBaseWeightText] = useState(String(DEFAULT_MACHINE_BASE_WEIGHT));
  const [isEditingBaseWeight, setIsEditingBaseWeight] = useState(false);

  // Segmented control state
  const [activeSegment, setActiveSegment] = useState<'all' | 'favorites'>('all');
  const [favoriteToApply, setFavoriteToApply] = useState<string | null>(null);
  const params = useLocalSearchParams<{ segment?: string; favoriteId?: string }>();
  useEffect(() => {
    const segment = Array.isArray(params.segment) ? params.segment[0] : params.segment;
    const favoriteId = Array.isArray(params.favoriteId) ? params.favoriteId[0] : params.favoriteId;

    if (segment === 'favorites') {
      setActiveSegment('favorites');
    }
    if (segment === 'favorites' && favoriteId) {
      setFavoriteToApply(favoriteId);
    }
  }, [params.segment, params.favoriteId]);
  const [showSaveFavoritePrompt, setShowSaveFavoritePrompt] = useState(false);
  const [isViewingExistingWorkout, setIsViewingExistingWorkout] = useState(false);
  const [isEditingCompletedWorkout, setIsEditingCompletedWorkout] = useState(false);
  const canEditTodaysWorkout = useMemo(() => {
    if (isCoach) {
      return true;
    }
    if (!todaysWorkout) {
      return false;
    }
    return !todaysWorkout?.isAssignedWorkout;
  }, [isCoach, todaysWorkout]);
  
  const openCardioBuilder = useCallback(() => {
    setWorkoutType('cardio');
    setActiveSegment('all');
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [setWorkoutType, setActiveSegment]);

  const handleCustomExerciseSelect = useCallback(
    (exercise: CustomExercise) => {
      if (exercise.type === 'cardio') {
        const cardioMetricsConfig = exercise.cardioMetrics ?? { duration: true, distance: false };
        setWorkoutType('cardio');
        setActiveSegment('all');
        setSelectedCardioActivity(exercise.name);
        setCardioDuration('');
        setCardioSpeed('');
        setCardioDistance('');
        setCustomCardioMetrics(cardioMetricsConfig);
        setActiveCustomCardioExerciseId(exercise.id);
        setShowCardioModal(true);
        setSearchQuery('');
        return;
      }

      // Build display name with equipment details (like cable exercises)
      let displayName = exercise.name;
      
      // Safely extract equipment as string
      let firstEquipment = '';
      if (exercise.equipment) {
        if (Array.isArray(exercise.equipment) && exercise.equipment.length > 0) {
          const first = exercise.equipment[0];
          firstEquipment = typeof first === 'string' ? first : '';
        } else if (typeof exercise.equipment === 'string') {
          firstEquipment = exercise.equipment;
        }
      }
      
      // If it's a machine/cable exercise with machine type, show details
      if (exercise.machineType && exercise.machineType !== 'none' && firstEquipment) {
        const machineTypeLabel = exercise.machineType === 'pin' ? 'Pin Loaded' : 'Plate Loaded';
        displayName = `${exercise.name} (${firstEquipment} – ${machineTypeLabel})`;
      } else if (firstEquipment && !exercise.isBodyweight && firstEquipment !== 'Bodyweight') {
        // Show equipment if not bodyweight
        displayName = `${exercise.name} (${firstEquipment})`;
      }

      // Create machine load metadata if machine type is specified
      let machineLoad: MachineLoadMetadata | undefined;
      if (exercise.machineType && exercise.machineType !== 'none' && firstEquipment) {
        if (exercise.machineType === 'pin') {
          machineLoad = {
            type: 'pin',
            exerciseName: exercise.name,
            equipment: firstEquipment,
          };
        } else if (exercise.machineType === 'plate') {
          machineLoad = {
            type: 'plate',
            exerciseName: exercise.name,
            equipment: firstEquipment,
            baseWeight: DEFAULT_MACHINE_BASE_WEIGHT,
            plateCounts: createInitialPlateCounts(),
          };
        }
      }

      const createdExercise = addExercise({
        name: exercise.name,
        displayName: displayName,
        type: 'strength',
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        isBodyweight: exercise.isBodyweight,
        trackingStyle: exercise.trackingStyle,
        customExerciseId: exercise.id,
        isCustom: true,
        machineLoad: machineLoad,
      });

      setWorkoutType('strength');
      setActiveSegment('all');
      setCustomCardioMetrics(null);
      setActiveCustomCardioExerciseId(null);
      setSearchQuery('');

      if (createdExercise?.sets?.length) {
        const initialSet = createdExercise.sets[0];
        const focusField: 'weight' | 'reps' =
          exercise.trackingStyle === 'reps_only' ? 'reps' : 'weight';
        setPendingSetFocus({
          exerciseId: createdExercise.id,
          setId: initialSet.id,
          field: focusField,
        });
        if (focusField === 'weight') {
          suppressPlateModalSetRef.current = initialSet.id;
        }
      }
    },
    [
      addExercise,
      setWorkoutType,
      setActiveSegment,
      setSelectedCardioActivity,
      setCardioDuration,
      setCardioSpeed,
      setCardioDistance,
      setCustomCardioMetrics,
      setActiveCustomCardioExerciseId,
      setShowCardioModal,
      setSearchQuery,
      setPendingSetFocus,
    ]
  );

  const handleCreateCustomExercisePress = useCallback(() => {
    setShowCustomExerciseModal(true);
  }, []);

  const handleCustomExerciseSubmit = useCallback(
    (exerciseInput: CustomExerciseInput) => {
      const created = addCustomExercise(exerciseInput);
      handleCustomExerciseSelect(created);
      setShowCustomExerciseModal(false);
    },
    [addCustomExercise, handleCustomExerciseSelect]
  );

  const getLocalDateKey = (value: Date | null | undefined): string => {
    if (!value || !(value instanceof Date) || isNaN(value.getTime())) {
      // Return today's date key as fallback
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Removed scrollToEnd - let handleSetInputFocus handle scrolling to the focused input

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('workout:openCardioBuilder', openCardioBuilder);
    return () => unsubscribe();
  }, [openCardioBuilder]);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('workout:showFavorites', (payload?: { favoriteId?: string }) => {
      setActiveSegment('favorites');
      if (payload?.favoriteId) {
        setFavoriteToApply(payload.favoriteId);
      }
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('workout:createCustomExercise', () => {
      setActiveSegment('all');
      setWorkoutType('strength');
      setShowCustomExerciseModal(true);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => unsubscribe();
  }, [setWorkoutType, setActiveSegment]);

  useEffect(() => {
    loadCustomExercises();
  }, [loadCustomExercises]);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDatePickerForShare, setShowDatePickerForShare] = useState(false);
  const [assignedDateForShare, setAssignedDateForShare] = useState<Date>(new Date());
  const [completedWorkoutToShare, setCompletedWorkoutToShare] = useState<any>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [firebaseTeamData, setFirebaseTeamData] = useState<any>(null);
  const [firebasePlayerNames, setFirebasePlayerNames] = useState<Record<string, string>>({});
  const [communityTeamNames, setCommunityTeamNames] = useState<Record<string, string>>({});
  
  // Track if workouts are assigned for the selected date (for coaches)
  const [hasAssignedWorkoutsForDate, setHasAssignedWorkoutsForDate] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideListener = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const keyboardVerticalOffset = useMemo(() => {
    if (Platform.OS !== 'ios') {
      return 0;
    }
    return isKeyboardVisible ? 0 : insets.bottom;
  }, [insets.bottom, isKeyboardVisible]);

  const actionBarPaddingBottom = useMemo(() => {
    if (isKeyboardVisible) {
      return 0;
    }
    return Math.max(12, insets.bottom);
  }, [insets.bottom, isKeyboardVisible]);

  const estimatedPlateLoadedWeight = useMemo(() => {
    return MACHINE_PLATE_WEIGHTS.reduce((total, weight) => {
      const count = plateCounts[String(weight)] || 0;
      return total + count * weight;
    }, plateBaseWeight);
  }, [plateCounts, plateBaseWeight]);

  const handleSearchFocus = useCallback(() => {
    const targetOffset = Math.max(searchSectionOffsetRef.current - 32, 0);
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: targetOffset, animated: true });
    });
  }, []);

  const handleSearchLayout = useCallback((event: LayoutChangeEvent) => {
    searchSectionOffsetRef.current = event.nativeEvent.layout.y;
  }, []);

  const hadSearchQueryRef = useRef(false);
  useEffect(() => {
    const hasQuery = searchQuery.trim().length > 0;
    if (hasQuery && !hadSearchQueryRef.current) {
      handleSearchFocus();
    }
    hadSearchQueryRef.current = hasQuery;
  }, [searchQuery, handleSearchFocus]);

  
  // Week navigation state
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, 1 = next week

  // Filtered exercises moved to ExerciseSearch component

  // Handle exercise selection with equipment modal
  const handleExerciseSelection = (exerciseName: string) => {
    if (!exerciseName || !exerciseName.trim()) {
      console.warn('⚠️ Empty exercise name provided to handleExerciseSelection');
      return;
    }

    const exerciseData = EXERCISE_DATABASE[exerciseName as keyof typeof EXERCISE_DATABASE];

    if (!exerciseData) {
      // Exercise not in database - add it directly
      const createdExercise = addExercise(exerciseName);
      if (!createdExercise) {
        console.error('❌ Failed to add exercise:', exerciseName);
        return;
      }
      setSearchQuery('');
      Keyboard.dismiss();
      if (createdExercise?.sets?.length) {
        setPendingSetFocus({
          exerciseId: createdExercise.id,
          setId: createdExercise.sets[0].id,
          field: 'weight',
        });
        suppressPlateModalSetRef.current = createdExercise.sets[0].id;
      }
      return;
    }

    const equipmentOptions = exerciseData.equipment || [];
    const firstEquipment = equipmentOptions[0] || 'Bodyweight';
    const isMachineEquipment = firstEquipment.toLowerCase() === 'machine';
    const hasMultipleEquipmentOptions = equipmentOptions.length > 1;

    const openMachineLoadFlow = (equipmentLabel: string) => {
      setSelectedExercise(exerciseName);
      setAvailableEquipment(equipmentOptions);
      setPendingMachineSelection({
        exerciseName,
        equipment: equipmentLabel,
        baseWeight: DEFAULT_MACHINE_BASE_WEIGHT,
      });
      setPlateCounts(createInitialPlateCounts());
      setPlateBaseWeight(DEFAULT_MACHINE_BASE_WEIGHT);
      setPlateBaseWeightText(String(DEFAULT_MACHINE_BASE_WEIGHT));
      setIsEditingBaseWeight(false);
      setShowMachineLoadModal(true);
    };

    if (!hasMultipleEquipmentOptions && isMachineEquipment) {
      openMachineLoadFlow(firstEquipment);
      return;
    }

    if (hasMultipleEquipmentOptions) {
      setSelectedExercise(exerciseName);
      setAvailableEquipment(equipmentOptions);
      setShowEquipmentModal(true);
      return;
    }

    if (isMachineEquipment) {
      openMachineLoadFlow(firstEquipment);
      return;
    }

    // Single equipment option, not a machine - add exercise directly
    const createdExercise = addExercise(`${exerciseName} (${firstEquipment})`);
    if (!createdExercise) {
      console.error('❌ Failed to add exercise:', exerciseName);
      return;
    }
    setSearchQuery('');
    Keyboard.dismiss();
    if (createdExercise?.sets?.length) {
      setPendingSetFocus({
        exerciseId: createdExercise.id,
        setId: createdExercise.sets[0].id,
        field: 'weight',
      });
      suppressPlateModalSetRef.current = createdExercise.sets[0].id;
    }
  };

  // Handle equipment selection
  const handleEquipmentSelection = (equipment: string) => {
    if (!selectedExercise) {
      return;
    }

    const normalizedEquipment = equipment.toLowerCase();
    const isMachine = normalizedEquipment === 'machine';
    const isCable = normalizedEquipment.includes('cable');

    if (isMachine) {
      setPendingMachineSelection({
        exerciseName: selectedExercise,
        equipment,
        baseWeight: DEFAULT_MACHINE_BASE_WEIGHT,
      });
      setPlateCounts(createInitialPlateCounts());
      setPlateBaseWeight(DEFAULT_MACHINE_BASE_WEIGHT);
      setPlateBaseWeightText(String(DEFAULT_MACHINE_BASE_WEIGHT));
      setIsEditingBaseWeight(false);
      setShowMachineLoadModal(true);
      setShowEquipmentModal(false);
      return;
    }

    if (isCable) {
      setPendingCableSelection({ exerciseName: selectedExercise, equipment });
      setShowCableGripModal(true);
      setShowEquipmentModal(false);
      return;
    }

    const createdExercise = addExercise(`${selectedExercise} (${equipment})`);
    if (!createdExercise) {
      console.error('❌ Failed to add exercise:', selectedExercise);
      return;
    }
    setSearchQuery('');
    Keyboard.dismiss();
    setShowEquipmentModal(false);
    setSelectedExercise('');
    setAvailableEquipment([]);
    if (createdExercise?.sets?.length) {
      setPendingSetFocus({
        exerciseId: createdExercise.id,
        setId: createdExercise.sets[0].id,
        field: 'weight',
      });
      suppressPlateModalSetRef.current = createdExercise.sets[0].id;
    }
  };

  const handleCableGripSelection = (grip: string) => {
    if (!pendingCableSelection) {
      return;
    }

    // Check if this is a triceps exercise
    const isTriceps = pendingCableSelection.exerciseName.toLowerCase().includes('triceps') || 
                      pendingCableSelection.exerciseName.toLowerCase().includes('tricep');
    
    // Format the label: for triceps use attachment name as-is, for others add "Grip"
    const gripLabel = isTriceps
      ? grip.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') // Capitalize each word
      : grip.charAt(0).toUpperCase() + grip.slice(1) + ' Grip';
    
    const createdExercise = addExercise(`${pendingCableSelection.exerciseName} (${pendingCableSelection.equipment} – ${gripLabel})`);
    if (!createdExercise) {
      console.error('❌ Failed to add exercise:', pendingCableSelection.exerciseName);
      return;
    }
    setPendingCableSelection(null);
    setShowCableGripModal(false);
    setSelectedExercise('');
    setAvailableEquipment([]);
    setSearchQuery('');
    Keyboard.dismiss();
    if (createdExercise?.sets?.length) {
      setPendingSetFocus({
        exerciseId: createdExercise.id,
        setId: createdExercise.sets[0].id,
        field: 'weight',
      });
      suppressPlateModalSetRef.current = createdExercise.sets[0].id;
    }
  };

  const resetMachineSelectionState = () => {
    setPendingMachineSelection(null);
    setShowMachineLoadModal(false);
    setShowPlateSelectionModal(false);
    setSelectedExercise('');
    setAvailableEquipment([]);
    setPlateCounts(createInitialPlateCounts());
    setPlateBaseWeight(DEFAULT_MACHINE_BASE_WEIGHT);
    setPlateBaseWeightText(String(DEFAULT_MACHINE_BASE_WEIGHT));
    setIsEditingBaseWeight(false);
  };

  const handleMachineLoadSelection = (loadType: 'pin' | 'plate') => {
    if (!pendingMachineSelection) {
      resetMachineSelectionState();
      return;
    }

    if (loadType === 'pin') {
      const machineLoad: MachineLoadMetadata = {
        type: 'pin',
        equipment: pendingMachineSelection.equipment,
        baseWeight: pendingMachineSelection.baseWeight ?? DEFAULT_MACHINE_BASE_WEIGHT,
        exerciseName: pendingMachineSelection.exerciseName,
      };

      const displayName = `${pendingMachineSelection.exerciseName} (${pendingMachineSelection.equipment} – Pin Loaded)`;

      if (pendingMachineSelection.exerciseId) {
        updateExerciseMachineLoad(pendingMachineSelection.exerciseId, {
          machineLoad,
          name: displayName,
          equipment: [pendingMachineSelection.equipment],
        });

        if (pendingMachineSelection.targetSetId) {
          suppressPlateModalSetRef.current = pendingMachineSelection.targetSetId;
          setPendingSetFocus({
            exerciseId: pendingMachineSelection.exerciseId,
            setId: pendingMachineSelection.targetSetId,
            field: 'weight',
          });
        }

        resetMachineSelectionState();
        return;
      }

      const createdExercise = addExercise({
        name: pendingMachineSelection.exerciseName,
        displayName,
        equipment: [pendingMachineSelection.equipment],
        machineLoad,
        type: 'strength',
      });

      if (createdExercise?.sets?.length) {
        const firstSet = createdExercise.sets[0];
        suppressPlateModalSetRef.current = firstSet.id;
        setPendingSetFocus({
          exerciseId: createdExercise.id,
          setId: firstSet.id,
          field: 'weight',
        });
      }

      setSearchQuery('');
      resetMachineSelectionState();
      return;
    }

    setShowMachineLoadModal(false);
    const baseWeight = pendingMachineSelection.baseWeight ?? DEFAULT_MACHINE_BASE_WEIGHT;
    setPlateBaseWeight(baseWeight);
    setPlateBaseWeightText(String(baseWeight));
    setIsEditingBaseWeight(false);
    setShowPlateSelectionModal(true);
  };

  const handlePlateCountChange = (plateWeight: number, delta: number) => {
    setPlateCounts((prev) => {
      const key = String(plateWeight);
      const currentCount = prev[key] || 0;
      const nextCount = Math.max(0, currentCount + delta);
      if (nextCount === currentCount) {
        return prev;
      }
      return {
        ...prev,
        [key]: nextCount,
      };
    });
  };

  const handleBaseWeightChange = (text: string) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    setPlateBaseWeightText(sanitized);
    const value = sanitized === '' ? 0 : parseInt(sanitized, 10);
    setPlateBaseWeight(value);
    setPendingMachineSelection((prev) => (prev ? { ...prev, baseWeight: value } : prev));
  };

  const toggleBaseWeightEditing = () => {
    if (isEditingBaseWeight) {
      if (plateBaseWeightText === '') {
        handleBaseWeightChange('0');
      }
      setIsEditingBaseWeight(false);
      return;
    }

    setPlateBaseWeightText(String(plateBaseWeight));
    setIsEditingBaseWeight(true);
  };

  useEffect(() => {
    if (isEditingBaseWeight) {
      requestAnimationFrame(() => {
        baseWeightInputRef.current?.focus();
      });
    }
  }, [isEditingBaseWeight]);

  const handleCancelPlateSelection = () => {
    setShowPlateSelectionModal(false);
    resetMachineSelectionState();
  };

  const handleConfirmPlateSelection = () => {
    if (!pendingMachineSelection) {
      handleCancelPlateSelection();
      return;
    }

    const plateSummaryParts = MACHINE_PLATE_WEIGHTS.map((weight) => {
      const count = plateCounts[String(weight)] || 0;
      return count > 0 ? `${weight}x${count}` : null;
    }).filter(Boolean) as string[];

    const plateDescriptor = plateSummaryParts.length
      ? `Plate Loaded [${plateSummaryParts.join(', ')}]`
      : 'Plate Loaded';

    const baseWeight = pendingMachineSelection.baseWeight ?? DEFAULT_MACHINE_BASE_WEIGHT;
    const totalWeight = MACHINE_PLATE_WEIGHTS.reduce((total, weight) => {
      const count = plateCounts[String(weight)] || 0;
      return total + count * weight;
    }, baseWeight);

    const storedPlateCounts = MACHINE_PLATE_WEIGHTS.reduce<Record<string, number>>((acc, weight) => {
      acc[String(weight)] = plateCounts[String(weight)] || 0;
      return acc;
    }, {});

    const machineLoad: MachineLoadMetadata = {
      type: 'plate',
      equipment: pendingMachineSelection.equipment,
      baseWeight,
      plateCounts: storedPlateCounts,
      exerciseName: pendingMachineSelection.exerciseName,
    };

    const displayName = `${pendingMachineSelection.exerciseName} (${pendingMachineSelection.equipment} – ${plateDescriptor})`;

    if (pendingMachineSelection.exerciseId) {
      updateExerciseMachineLoad(pendingMachineSelection.exerciseId, {
        machineLoad,
        name: displayName,
        equipment: [pendingMachineSelection.equipment],
      });

      if (pendingMachineSelection.targetSetId) {
        updateSet(pendingMachineSelection.exerciseId, pendingMachineSelection.targetSetId, 'weight', totalWeight);
        suppressPlateModalSetRef.current = pendingMachineSelection.targetSetId;
        setPendingSetFocus({
          exerciseId: pendingMachineSelection.exerciseId,
          setId: pendingMachineSelection.targetSetId,
          field: 'weight',
        });
      }

      resetMachineSelectionState();
      return;
    }

    const createdExercise = addExercise({
      name: pendingMachineSelection.exerciseName,
      displayName,
      equipment: [pendingMachineSelection.equipment],
      machineLoad,
      type: 'strength',
    });

    if (createdExercise?.sets?.length) {
      const firstSet = createdExercise.sets[0];
      updateSet(createdExercise.id, firstSet.id, 'weight', totalWeight);
      suppressPlateModalSetRef.current = firstSet.id;
      setPendingSetFocus({
        exerciseId: createdExercise.id,
        setId: firstSet.id,
        field: 'weight',
      });
    }

    setSearchQuery('');
    resetMachineSelectionState();
  };

  // Wrapper for setExerciseSetCount that focuses on set 2's weight input after sets are added
  const handleSetCountChange = useCallback((exerciseId: string, count: number) => {
    const exercise = currentWorkout.exercises?.find((ex) => ex.id === exerciseId);
    const currentSetCount = exercise?.sets?.length || 0;
    const isAddingSets = count > currentSetCount;
    
    // Call the original setExerciseSetCount
    setExerciseSetCountOriginal(exerciseId, count);
    
    // If we're adding sets and will have at least 2 sets, focus on set 2's weight input
    if (isAddingSets && count >= 2) {
      // Wait for the sets to be created, then focus on set 2 (index 1)
      // Use multiple timeouts to ensure the state has updated
      setTimeout(() => {
        // Get the latest state from the store
        const latestState = useWorkoutStore.getState();
        const updatedExercise = latestState.currentWorkout.exercises?.find((ex) => ex.id === exerciseId);
        if (updatedExercise?.sets && updatedExercise.sets.length >= 2) {
          const set2 = updatedExercise.sets[1]; // Set 2 is at index 1
          if (set2?.id) {
            setPendingSetFocus({
              exerciseId,
              setId: set2.id,
              field: 'weight',
            });
          }
        }
      }, 150);
    }
  }, [currentWorkout.exercises, setExerciseSetCountOriginal]);

  const handleSetInputFocus = useCallback((input: TextInput | null, field?: 'weight' | 'reps') => {
    if (!input || !scrollViewRef.current) {
      return;
    }

    const inputHandle = findNodeHandle(input);
    const scrollHandle = findNodeHandle(scrollViewRef.current);

    if (!inputHandle || !scrollHandle) {
      return;
    }

    // Determine scroll offset based on field type
    // Use moderate offsets to position input above keyboard with some breathing room
    const scrollOffset = field === 'weight' ? 250 : field === 'reps' ? 200 : 150;

    requestAnimationFrame(() => {
      const responder = scrollViewRef.current as any;
      
      // Use React Native's built-in scroll responder with larger offset for weight inputs
      // This ensures the input is well above the keyboard when focused
      responder?.scrollResponderScrollNativeHandleToKeyboard?.(inputHandle, scrollOffset, true);
    });
  }, []);

  const handleWeightInputFocus = useCallback(
    (exerciseId: string, setId: string) => {
      if (suppressPlateModalSetRef.current === setId) {
        suppressPlateModalSetRef.current = null;
        return;
      }

      const exercise = currentWorkout.exercises?.find((ex) => ex.id === exerciseId);
      if (!exercise) {
        return;
      }

      const machineLoad = (exercise as { machineLoad?: MachineLoadMetadata }).machineLoad;
      if (!machineLoad || machineLoad.type !== 'plate') {
        return;
      }

      const normalizedCounts = createInitialPlateCounts();
      if (machineLoad.plateCounts) {
        Object.entries(machineLoad.plateCounts).forEach(([weight, count]) => {
          if (weight in normalizedCounts) {
            normalizedCounts[weight] = count;
          }
        });
      }

      const baseWeight = machineLoad.baseWeight ?? DEFAULT_MACHINE_BASE_WEIGHT;
      setPlateBaseWeight(baseWeight);
      setPlateBaseWeightText(String(baseWeight));
      const baseName =
        machineLoad.exerciseName ||
        exercise.name.replace(/\s*\(.*\)\s*$/, '').trim();

      const equipmentLabel = (() => {
        if (machineLoad.equipment) {
          if (Array.isArray(machineLoad.equipment)) {
            return machineLoad.equipment[0] ?? 'Machine';
          }
          return machineLoad.equipment;
        }
        if (Array.isArray(exercise.equipment)) {
          return exercise.equipment[0] ?? 'Machine';
        }
        return exercise.equipment ?? 'Machine';
      })();

      setPlateCounts(normalizedCounts);
      setPendingMachineSelection({
        exerciseId,
        targetSetId: setId,
        exerciseName: baseName,
        equipment: equipmentLabel,
        baseWeight,
        machineLoad,
      });
      setShowMachineLoadModal(false);
      setShowPlateSelectionModal(true);
      setIsEditingBaseWeight(false);
    },
    [currentWorkout.exercises]
  );

  // Auto-depopulate workout when new day starts
  useEffect(() => {
    const checkDayChange = async () => {
      try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateCopy = new Date(selectedDate);
      selectedDateCopy.setHours(0, 0, 0, 0);
      
      // If viewing today's workout and it's a new day, clear current workout
      if (selectedDateCopy.getTime() === today.getTime() && currentWorkout.exercises && currentWorkout.exercises.length > 0) {
        try {
            // Validate AsyncStorage is available before using
            if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
              console.error('❌ AsyncStorage not available');
              return;
            }
            
          const lastDateKey = 'lastWorkoutDate';
            let lastDateStr: string | null = null;
            
            try {
              lastDateStr = await AsyncStorage.getItem(lastDateKey);
            } catch (getError) {
              console.error('❌ Error reading AsyncStorage:', getError);
              // Log to Firebase
              logErrorToFirebase(getError instanceof Error ? getError : new Error(String(getError)), {
                component: 'WorkoutScreen.AsyncStorage.getItem',
                userId: user?.uid,
              }).catch(() => {});
              // Continue without date check if read fails - don't crash
              return;
            }
            
            if (lastDateStr) {
              try {
                const lastDate = new Date(lastDateStr);
                if (!isNaN(lastDate.getTime())) {
            lastDate.setHours(0, 0, 0, 0);
            // If last date is different from today, it's a new day - clear workout
            if (lastDate.getTime() !== today.getTime()) {
                    if (typeof clearCurrentWorkout === 'function') {
              clearCurrentWorkout();
            }
                  }
                }
              } catch (dateError) {
                console.error('❌ Error parsing date from AsyncStorage:', dateError);
                // Continue - invalid date is not critical
              }
          }
          
            // Update last tracked date - wrap in try-catch with error logging
            try {
              if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
          await AsyncStorage.setItem(lastDateKey, today.toISOString());
              }
            } catch (setError) {
              console.error('❌ Error writing to AsyncStorage:', setError);
              // Log to Firebase but don't crash
              logErrorToFirebase(setError instanceof Error ? setError : new Error(String(setError)), {
                component: 'WorkoutScreen.AsyncStorage.setItem',
                userId: user?.uid,
              }).catch(() => {});
              // Don't crash if write fails
            }
        } catch (error) {
            console.error('❌ Error in checkDayChange AsyncStorage block:', error);
            // Log to Firebase but don't crash
            logErrorToFirebase(error instanceof Error ? error : new Error(String(error)), {
              component: 'WorkoutScreen.checkDayChange',
              userId: user?.uid,
            }).catch(() => {});
          }
        }
      } catch (error) {
        console.error('❌ Error in checkDayChange:', error);
        // Log but don't crash
        logErrorToFirebase(error instanceof Error ? error : new Error(String(error)), {
          component: 'WorkoutScreen.checkDayChange',
          userId: user?.uid,
        }).catch(() => {});
      }
    };
    
    // Wrap initial call in try-catch
    try {
      checkDayChange().catch((error) => {
        console.error('❌ Unhandled error in checkDayChange:', error);
      });
    } catch (error) {
      console.error('❌ Error calling checkDayChange:', error);
    }
    
    // Check every minute to catch day changes - wrap interval callback
    const interval = setInterval(() => {
      try {
        checkDayChange().catch((error) => {
          console.error('❌ Unhandled error in checkDayChange interval:', error);
        });
      } catch (error) {
        console.error('❌ Error in checkDayChange interval:', error);
      }
    }, 60000);
    
    return () => {
      try {
        clearInterval(interval);
      } catch (error) {
        console.error('❌ Error clearing interval:', error);
      }
    };
  }, [selectedDate, clearCurrentWorkout, currentWorkout.exercises?.length]);

  useEffect(() => {
    if (user && user.uid) {
      // Wrap in try-catch to prevent crashes
      try {
      loadWorkoutsFromFirebase(user.uid).catch((error) => {
        console.error('❌ Error loading workouts in workout screen:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        console.error('❌ Error message:', errorMessage);
        console.error('❌ Error stack:', errorStack);
          // Log to Firebase for debugging
          logErrorToFirebase(error instanceof Error ? error : new Error(String(error)), {
            component: 'WorkoutScreen.loadWorkoutsFromFirebase',
            userId: user.uid,
          }).catch((logErr) => {
            console.error('❌ Failed to log error to Firebase:', logErr);
          });
        // Don't crash the app - just log the error
      });
      } catch (error) {
        console.error('❌ Fatal error loading workouts:', error);
        // Don't crash - continue with empty workout history
      }
      
      // Load weights from Firebase
      loadWeightsFromFirebase(user.uid).catch((error) => {
        console.error('❌ Error loading weights:', error);
      });
    }
    
    // Restore favorites data
    restoreFromLocalStorage();
  }, [user, loadWorkoutsFromFirebase, restoreFromLocalStorage, loadWeightsFromFirebase]);

  // Track if we're currently deleting to prevent reload
  const [isDeletingWorkout, setIsDeletingWorkout] = useState(false);

  // Load workout for selected date when date changes or workout history changes
  useEffect(() => {
    // Don't reload if we're in the middle of deleting
    if (isDeletingWorkout) {
      return;
    }

    // Safety check: ensure selectedDate is valid before proceeding
    if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      console.error('❌ Invalid selectedDate in workout screen useEffect:', selectedDate);
      // Set to today's date as fallback
      if (setSelectedDate) {
        setSelectedDate(new Date());
      }
      return;
    }

    const loadWorkoutForDate = async () => {
      try {
        // Validate selectedDate again inside the function
        if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
          console.error('❌ Invalid selectedDate in loadWorkoutForDate:', selectedDate);
          setTodaysWorkout(null);
          setIsViewingExistingWorkout(false);
          setIsEditingCompletedWorkout(false);
          return;
        }
        
        // Validate getWorkoutForDate is a function before calling
        if (!getWorkoutForDate || typeof getWorkoutForDate !== 'function') {
          console.error('❌ getWorkoutForDate is not a function');
          setTodaysWorkout(null);
          setIsViewingExistingWorkout(false);
          setIsEditingCompletedWorkout(false);
          return;
        }
        
      // First check workout history
        let workout = null;
        try {
          workout = getWorkoutForDate(selectedDate);
        } catch (error) {
          console.error('❌ Error calling getWorkoutForDate:', error);
          workout = null;
        }

      const currentKey =
        currentWorkout?.date && currentWorkout.exercises?.length
          ? currentWorkout.date
          : null;
      const selectedKey = getLocalDateKey(selectedDate);

      // Preserve draft workout if:
      // 1. No saved workout found for this date
      // 2. currentWorkout has exercises
      // 3. Either currentKey matches selectedKey OR currentKey is null (new draft without date set yet)
      if (!workout && currentWorkout?.exercises?.length) {
        const shouldPreserveDraft = 
          !currentKey || // New draft without date set yet
          currentKey === selectedKey; // Existing draft for this date
        
        if (shouldPreserveDraft) {
          const draftWorkout = {
            id: currentWorkout.id || generateUniqueId('draft'),
            title:
              currentWorkout.title ||
              `Workout – ${selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}`,
            date: selectedKey,
            exercises: currentWorkout.exercises,
            createdAt: currentWorkout.createdAt || new Date(),
            completedAt: undefined,
          };

          setTodaysWorkout(draftWorkout);
          setIsViewingExistingWorkout(false);
          return;
        }
      }
      
      // For coaches: Check if there are any assigned workouts for this date and load the first one to display
      if (isCoach && user?.uid && profile?.teamId) {
        try {
          const dateString = getLocalDateKey(selectedDate);
          const coachAssignments = await workoutSharingService.getCoachAssignments(user.uid, profile.teamId);
          
          // Check if any assignments exist for the selected date
          const assignmentsForDate = coachAssignments.filter((assignment: any) => {
            try {
              // Handle assignedDate (could be Firestore Timestamp, string, or Date)
              let assignedDate = null;
              if (assignment.assignedDate) {
                let assignedDateObj: Date | null = null;
                if (assignment.assignedDate.toDate && typeof assignment.assignedDate.toDate === 'function') {
                  assignedDateObj = assignment.assignedDate.toDate();
                } else if (typeof assignment.assignedDate === 'string') {
                  assignedDateObj = new Date(assignment.assignedDate);
                } else if (assignment.assignedDate instanceof Date) {
                  assignedDateObj = assignment.assignedDate;
                }
                if (assignedDateObj) {
                  assignedDate = getLocalDateKey(assignedDateObj);
                }
              }
              
              // Handle workoutData.date (should be a string, but handle all cases)
              let workoutDate = null;
              if (assignment.workoutData?.date) {
                let workoutDateObj: Date | null = null;
                if (typeof assignment.workoutData.date === 'string') {
                  // If it's already a date string (YYYY-MM-DD), use it directly
                  if (/^\d{4}-\d{2}-\d{2}$/.test(assignment.workoutData.date)) {
                    workoutDate = assignment.workoutData.date;
                  } else {
                    workoutDateObj = new Date(assignment.workoutData.date);
                  }
                } else if (assignment.workoutData.date instanceof Date) {
                  workoutDateObj = assignment.workoutData.date;
                } else if (assignment.workoutData.date.toDate && typeof assignment.workoutData.date.toDate === 'function') {
                  workoutDateObj = assignment.workoutData.date.toDate();
                }
                if (workoutDateObj && !workoutDate) {
                  workoutDate = getLocalDateKey(workoutDateObj);
                }
              }
              
              return assignedDate === dateString || workoutDate === dateString;
            } catch (error) {
              console.error('❌ Error parsing assignment date:', error);
              return false;
            }
          });
          
          setHasAssignedWorkoutsForDate(assignmentsForDate.length > 0);
          
          // If there's an assigned workout and no workout in history, show the first assigned workout
          if (assignmentsForDate.length > 0 && !workout) {
            const firstAssignment = assignmentsForDate[0];
            const workoutData = firstAssignment.workoutData || firstAssignment;
            
            // Handle assignedDate timestamp conversion - use assignedDate for workout date
            let workoutDateString = dateString; // Default to selected date
            let createdAtDate = new Date();
            
            if (firstAssignment.assignedDate) {
              try {
                const assignedDate = firstAssignment.assignedDate as any;
                let assignedDateObj: Date;
                
                if (assignedDate?.toDate && typeof assignedDate.toDate === 'function') {
                  // Firestore Timestamp
                  assignedDateObj = assignedDate.toDate();
                } else if (typeof assignedDate === 'string') {
                  assignedDateObj = new Date(assignedDate);
                } else if (assignedDate instanceof Date) {
                  assignedDateObj = assignedDate;
                } else {
                  assignedDateObj = new Date();
                }
                
                // Use assignedDate for both workout date and createdAt
                // Use local date key to avoid timezone issues
                workoutDateString = getLocalDateKey(assignedDateObj);
                createdAtDate = assignedDateObj;
              } catch (error) {
                console.error('❌ Error parsing assignedDate:', error);
                createdAtDate = new Date();
              }
            } else if (firstAssignment.createdAt) {
              // Fallback to createdAt if assignedDate doesn't exist
              try {
                const createdAt = firstAssignment.createdAt as any;
                if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
                  createdAtDate = createdAt.toDate();
                } else if (typeof createdAt === 'string') {
                  createdAtDate = new Date(createdAt);
                } else if (createdAt instanceof Date) {
                  createdAtDate = createdAt;
                }
              } catch (error) {
                console.error('❌ Error parsing createdAt:', error);
                createdAtDate = new Date();
              }
            }
            
            // Reset exercises to draft status for coach view (they're viewing what was assigned, not completed)
            const resetExercises = (workoutData.exercises || []).map((exercise: any) => ({
              ...exercise,
              status: 'draft' as const, // Reset to draft status
              sets: (exercise.sets || []).map((set: any) => ({
                ...set,
                completed: false, // Reset set completion status
              })),
            }));
            
            workout = {
              id: firstAssignment.id || generateUniqueId('workout'),
              title: workoutData.title || firstAssignment.workoutName || 'Assigned Workout',
              date: workoutDateString, // Use assignedDate, not selectedDate
              exercises: resetExercises, // Use reset exercises with draft status
              createdAt: createdAtDate,
              completedAt: undefined,
              status: 'draft', // Explicitly set to draft
              // @ts-ignore - Extended properties for assigned workouts
              isAssignedWorkout: true, // Flag to indicate this is an assigned workout
              // @ts-ignore - Extended properties for assigned workouts
              assignmentId: firstAssignment.id, // Store the assignment ID for deletion
            };
            
            // Update selectedDate to match the assigned date so it appears on the correct day
            if (workoutDateString !== dateString && firstAssignment.assignedDate) {
              try {
                const assignedDate = firstAssignment.assignedDate as any;
                let assignedDateObj: Date | null = null;
                
                if (assignedDate?.toDate && typeof assignedDate.toDate === 'function') {
                  assignedDateObj = assignedDate.toDate();
                } else if (typeof assignedDate === 'string') {
                  assignedDateObj = new Date(assignedDate);
                } else if (assignedDate instanceof Date) {
                  assignedDateObj = assignedDate;
                }
                
                // Set selected date to match assigned date if we successfully parsed it
                if (assignedDateObj && !isNaN(assignedDateObj.getTime())) {
                  setSelectedDate(assignedDateObj);
                }
              } catch (error) {
                console.error('❌ Error updating selectedDate:', error);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error checking assigned workouts for date:', error);
          setHasAssignedWorkoutsForDate(false);
        }
      } else {
        setHasAssignedWorkoutsForDate(false);
      }
      
      // If no workout in history, check assigned workouts from inbox (for players)
      if (!workout && user?.uid && !isCoach) {
        try {
          const inboxWorkouts = await workoutSharingService.getPlayerInbox(user.uid);
          const dateString = getLocalDateKey(selectedDate);
          
          // Find assigned workout for this date
          const assignedWorkout = inboxWorkouts.find((w: any) => {
            try {
              // Handle assignedDate (could be Firestore Timestamp, string, or Date)
              let assignedDate = null;
              if (w.assignedDate) {
                let assignedDateObj: Date | null = null;
                if (w.assignedDate.toDate && typeof w.assignedDate.toDate === 'function') {
                  assignedDateObj = w.assignedDate.toDate();
                } else if (typeof w.assignedDate === 'string') {
                  assignedDateObj = new Date(w.assignedDate);
                } else if (w.assignedDate instanceof Date) {
                  assignedDateObj = w.assignedDate;
                }
                if (assignedDateObj) {
                  assignedDate = getLocalDateKey(assignedDateObj);
                }
              }
              
              // Handle workoutData.date (should be a string, but handle all cases)
              let workoutDate = null;
              if (w.workoutData?.date) {
                let workoutDateObj: Date | null = null;
                if (typeof w.workoutData.date === 'string') {
                  // If it's already a date string (YYYY-MM-DD), use it directly
                  if (/^\d{4}-\d{2}-\d{2}$/.test(w.workoutData.date)) {
                    workoutDate = w.workoutData.date;
                  } else {
                    workoutDateObj = new Date(w.workoutData.date);
                  }
                } else if (w.workoutData.date instanceof Date) {
                  workoutDateObj = w.workoutData.date;
                } else if (w.workoutData.date.toDate && typeof w.workoutData.date.toDate === 'function') {
                  workoutDateObj = w.workoutData.date.toDate();
                }
                if (workoutDateObj && !workoutDate) {
                  workoutDate = getLocalDateKey(workoutDateObj);
                }
              }
              
              return (assignedDate === dateString || workoutDate === dateString) && w.status !== 'completed';
            } catch (error) {
              console.error('❌ Error parsing workout date:', error);
              return false;
            }
          });
          
          if (assignedWorkout) {
            // Convert assigned workout to Workout format
            const workoutData = assignedWorkout.workoutData || assignedWorkout;
            
            // Handle assignedDate timestamp conversion (Firestore Timestamp or string)
            // Use assignedDate for the workout date to ensure it appears on the correct day
            let workoutDateString = dateString; // Default to selected date
            let createdAtDate = new Date();
            
            if (assignedWorkout.assignedDate) {
              try {
                const assignedDate = assignedWorkout.assignedDate as any;
                let assignedDateObj: Date;
                
                if (assignedDate?.toDate && typeof assignedDate.toDate === 'function') {
                  // Firestore Timestamp
                  assignedDateObj = assignedDate.toDate();
                } else if (typeof assignedDate === 'string') {
                  assignedDateObj = new Date(assignedDate);
                } else if (assignedDate instanceof Date) {
                  assignedDateObj = assignedDate;
                } else {
                  assignedDateObj = new Date();
                }
                
                // Use assignedDate for both workout date and createdAt
                // Use local date key to avoid timezone issues
                workoutDateString = getLocalDateKey(assignedDateObj);
                createdAtDate = assignedDateObj;
              } catch (error) {
                console.error('❌ Error parsing assignedDate:', error);
                createdAtDate = new Date();
              }
            } else if (assignedWorkout.createdAt) {
              // Fallback to createdAt if assignedDate doesn't exist
              try {
                const createdAt = assignedWorkout.createdAt as any;
                if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
                  createdAtDate = createdAt.toDate();
                } else if (typeof createdAt === 'string') {
                  createdAtDate = new Date(createdAt);
                } else if (createdAt instanceof Date) {
                  createdAtDate = createdAt;
                }
              } catch (error) {
                console.error('❌ Error parsing createdAt:', error);
                createdAtDate = new Date();
              }
            }
            
            // Reset exercises to draft status - assigned workouts should not be completed
            const resetExercises = (workoutData.exercises || []).map((exercise: any) => ({
              ...exercise,
              status: 'draft' as const, // Reset to draft status
              sets: (exercise.sets || []).map((set: any) => ({
                ...set,
                completed: false, // Reset set completion status
              })),
            }));
            
            workout = {
              id: assignedWorkout.id || generateUniqueId('workout'),
              title: workoutData.title || assignedWorkout.workoutName || 'Assigned Workout',
              date: workoutDateString, // Use assignedDate, not selectedDate
              exercises: resetExercises, // Use reset exercises with draft status
              createdAt: createdAtDate,
              completedAt: undefined,
              status: 'draft', // Explicitly set to draft - assigned workouts should not be completed
              // @ts-ignore - Extended properties for assigned workouts
              isAssignedWorkout: true, // Flag to indicate this is an assigned workout
              // @ts-ignore - Extended properties for assigned workouts
              assignmentId: assignedWorkout.id, // Store the assignment ID for deletion
            };
            
            // Update selectedDate to match the assigned date so it appears on the correct day
            if (workoutDateString !== dateString && assignedWorkout.assignedDate) {
              try {
                const assignedDate = assignedWorkout.assignedDate as any;
                let assignedDateObj: Date | null = null;
                
                if (assignedDate?.toDate && typeof assignedDate.toDate === 'function') {
                  assignedDateObj = assignedDate.toDate();
                } else if (typeof assignedDate === 'string') {
                  assignedDateObj = new Date(assignedDate);
                } else if (assignedDate instanceof Date) {
                  assignedDateObj = assignedDate;
                }
                
                // Set selected date to match assigned date if we successfully parsed it
                if (assignedDateObj && !isNaN(assignedDateObj.getTime())) {
                  setSelectedDate(assignedDateObj);
                }
              } catch (error) {
                console.error('❌ Error updating selectedDate:', error);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error loading assigned workout from inbox:', error);
        }
      }
      
      
      let workoutForCard: any = workout;
      let viewingExisting = false;

      if (workout && workout.exercises && workout.exercises.length > 0) {
        if (!isCoach && (workout as any).status === 'saved' && !(workout as any).isAssignedWorkout) {
          hydrateDraftWorkout(workout as any);
          workoutForCard = workout;
          viewingExisting = false;
        } else {
          // For assigned workouts:
          // - Coaches: view-only (they're viewing what they assigned)
          // - Players: editable (they need to fill it out)
          // For completed workouts: always view-only
          const isAssignedWorkout = (workout as any).isAssignedWorkout;
          const isCompleted = (workout as any).status === 'completed';
          
          if (isAssignedWorkout && !isCoach) {
            // Player viewing assigned workout - make it editable
            // Hydrate the workout into currentWorkout state so player can edit it
            hydrateDraftWorkout(workout as any);
            
            // After hydrating, get the currentWorkout state to use for display
            const hydratedWorkout = useWorkoutStore.getState().currentWorkout;
            
            // Update workoutForCard to reflect the hydrated state with draft status
            workoutForCard = {
              ...workout,
              status: 'draft', // Ensure status is draft
              exercises: hydratedWorkout.exercises || workout.exercises,
            } as any;
            
            viewingExisting = false;
          } else {
            // Coach viewing assigned workout OR completed workout - make it view-only
            viewingExisting = Boolean(
              isCoach ||
              isCompleted ||
              (isAssignedWorkout && isCoach) // Redundant but explicit
            );
            if (viewingExisting) {
            }
          }
        }
      } else {
        // Preserve draft workout if:
        // 1. currentWorkout has exercises
        // 2. Either currentKey matches selectedKey OR currentKey is null (new draft without date set yet)
        if (currentWorkout?.exercises?.length) {
          const shouldPreserveDraft = 
            !currentKey || // New draft without date set yet
            currentKey === selectedKey; // Existing draft for this date
          
          if (shouldPreserveDraft) {
            const workoutStatus = (currentWorkout as any).status;
            setTodaysWorkout({
              id: currentWorkout.id || generateUniqueId('draft'),
              title:
                currentWorkout.title ||
                `Workout – ${selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()) ? selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }) : new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}`,
              date: selectedKey,
              exercises: currentWorkout.exercises,
              createdAt: currentWorkout.createdAt || new Date(),
              completedAt: undefined,
              status: workoutStatus || 'draft',
            });
            viewingExisting = workoutStatus === 'completed';
          } else {
            // Different date - clear the workout
            clearCurrentWorkout();
            workoutForCard = null;
            viewingExisting = false;
          }
        } else {
          // No exercises - clear the workout
          clearCurrentWorkout();
          workoutForCard = null;
          viewingExisting = false;
        }
      }

      setTodaysWorkout(workoutForCard);
      setIsViewingExistingWorkout(viewingExisting);
      setIsEditingCompletedWorkout(false);
      } catch (error) {
        console.error('❌ Error in loadWorkoutForDate:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'No stack trace';
        console.error('❌ Error message:', errorMessage);
        console.error('❌ Error stack:', errorStack);
        // Set safe defaults to prevent crash
        try {
          setTodaysWorkout(null);
          setIsViewingExistingWorkout(false);
          setIsEditingCompletedWorkout(false);
        } catch (setStateError) {
          console.error('❌ Error setting state in error handler:', setStateError);
        }
        
        // Log error to Firebase for debugging
        logErrorToFirebase(error as Error, {
          component: 'WorkoutScreen.loadWorkoutForDate',
          userId: user?.uid,
          metadata: {
            selectedDate: selectedDate?.toISOString(),
            hasSelectedDate: !!selectedDate,
          },
        }).catch((logErr) => {
          console.error('❌ Failed to log error to Firebase:', logErr);
        });
      }
    };
    
    // Safely call loadWorkoutForDate with error handling
    try {
    loadWorkoutForDate();
    } catch (error) {
      console.error('❌ Fatal error calling loadWorkoutForDate:', error);
      // Continue - the error is already logged
    }
  }, [getWorkoutForDate, selectedDate, clearCurrentWorkout, workoutHistory, user?.uid, isCoach, profile?.teamId, isDeletingWorkout]);

  const handleSaveExerciseCard = useCallback((exerciseId: string) => {
    markExerciseAsSaved(exerciseId);
    const savedWorkout = useWorkoutStore.getState().currentWorkout;
    const allExercisesSaved = savedWorkout.exercises?.every(
      (exercise: any) => exercise.status === 'saved' || exercise.status === 'completed'
    );

    // Only set viewing existing workout if we're editing a completed workout AND the workout status is actually 'completed'
    // This prevents the post-workout card from appearing when coaches just save exercises
    if (isEditingCompletedWorkout && allExercisesSaved && savedWorkout && (savedWorkout as any).status === 'completed') {
      setTodaysWorkout(savedWorkout);
      setIsViewingExistingWorkout(true);
      setIsEditingCompletedWorkout(false);
    }

    Alert.alert('Exercise Saved', 'Your updates to this exercise are locked in.');
  }, [markExerciseAsSaved, isEditingCompletedWorkout]);

  const handleFinishWorkout = async () => {
    setValidationErrors({});
    
    if (!currentWorkout.exercises || currentWorkout.exercises.length === 0) {
      Alert.alert('Incomplete Workout', 'Please add at least one exercise or cardio activity.');
      return;
    }

    const errors: Record<string, boolean> = {};
    currentWorkout.exercises.forEach((exercise: any) => {
      if (exercise.type === 'cardio') {
        return; // Skip set validation for cardio
      }
      
      // Check if exercise has sets before iterating
      if (exercise.sets && Array.isArray(exercise.sets)) {
        exercise.sets.forEach((set: any) => {
          if (set && (set.reps === null || set.weight === null)) {
            errors[`${exercise.id}-${set.id}`] = true;
          }
        });
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      Alert.alert('Incomplete Sets', 'Please complete all set fields for strength exercises.');
      return;
    }

    // For coaches: Don't finish workouts, just prepare for assignment
    if (isCoach) {
      // Coaches don't finish workouts - they assign them
      // Just set the workout to be ready for assignment
      const workoutToAssign = {
        ...currentWorkout,
        id: currentWorkout.id || generateUniqueId('workout'),
        title: currentWorkout.title || `Workout – ${selectedDate.toLocaleDateString()}`,
        date: getLocalDateKey(selectedDate),
        exercises: currentWorkout.exercises || [],
        createdAt: currentWorkout.createdAt || new Date(),
        status: 'draft' as const,
      };
      setTodaysWorkout(workoutToAssign);
      setIsViewingExistingWorkout(true);
      setIsEditingCompletedWorkout(false);
      
      // Automatically open the share modal for coaches
      setCompletedWorkoutToShare(workoutToAssign);
      setAssignedDateForShare(selectedDate);
      setShowDatePickerForShare(true);
      return;
    }
    
    const completedWorkout = finishWorkout();

    if (completedWorkout) {
      setTodaysWorkout(completedWorkout);
      setIsViewingExistingWorkout(true);
      setIsEditingCompletedWorkout(false);
    }
    
    if (completedWorkout && user?.uid && !isCoach) {
      // Only add points for personal users (not coaches)
      const pointType = workoutType === 'cardio' ? 'cardio' : 'workout';
      const pointAmount = workoutType === 'cardio' ? 50 : 100;
      const existingPointEvent = usePointsStore
        .getState()
        .pointEvents.find(
          (event) => event.referenceId === completedWorkout.id && event.type === pointType
        );
      const completionLabel = workoutType === 'cardio' ? 'Cardio' : 'Workout';
      let pointsAwarded = false;
      
      if (!existingPointEvent) {
        // Add points with workout ID as reference for potential deletion
        try {
          await addPoints(
            {
              type: pointType,
              amount: pointAmount,
              description: `Completed ${workoutType} workout`,
              referenceId: completedWorkout.id, // Store workout ID for tracking/deletion
            },
            user.uid
          );
          pointsAwarded = true;
        } catch (error) {
          console.error('❌ Error adding points for workout:', error);
        }
      }
      
      // Check if this was an assigned workout that needs to be marked as completed
      // Use state variable first, then fallback to global (for backwards compatibility)
      const sharedWorkoutId = currentSharedWorkoutId || global.sharedWorkoutId;
      
      if (sharedWorkoutId && user?.uid) {
        workoutSharingService.markWorkoutCompleted(sharedWorkoutId, user.uid)
          .then((success) => {
            if (success) {
              // Clear both the state and global shared workout ID since it's been marked complete
              setCurrentSharedWorkoutId(null);
              global.sharedWorkoutId = null as any;
            } else {
            }
          })
          .catch((error) => {
            console.error('❌ Error marking assigned workout as completed:', error);
          });
      }
      
      // Only show share button for coaches/trainers, not for clients/players
      const alertButtons = [];
      if (!isClient && isCoach) {
        alertButtons.push({ 
          text: '📤 Assign to Players', 
          onPress: () => {
            setCompletedWorkoutToShare(completedWorkout);
            setAssignedDateForShare(new Date());
            setShowDatePickerForShare(true);
          }
        });
      }
      alertButtons.push({ 
        text: 'OK', 
        onPress: () => {
          clearCurrentWorkout();
          // Also clear the shared workout ID when clearing workout
          setCurrentSharedWorkoutId(null);
          global.sharedWorkoutId = null as any;
        }
      });
      
      Alert.alert(
        'Workout Complete!',
        pointsAwarded
          ? `${completionLabel} logged and saved! +${pointAmount} V.`
          : `${completionLabel} logged and saved!`,
        alertButtons
      );
    }
  };

  const unlockSavedWorkout = useCallback(() => {
    const workoutState = useWorkoutStore.getState().currentWorkout;
    workoutState.exercises?.forEach((exercise: any) => {
      if (exercise.status === 'saved') {
        setExerciseStatus(exercise.id, 'draft');
      }
    });

    setTodaysWorkout(null);
    setIsViewingExistingWorkout(false);
    setIsEditingCompletedWorkout(false);
  }, [setExerciseStatus]);

  const reopenCompletedWorkoutForEditing = useCallback((workoutToEdit: any) => {
    if (!workoutToEdit) {
      return;
    }

    const reopenedWorkout = {
      ...workoutToEdit,
      status: 'draft' as const,
      completedAt: undefined,
      exercises: (workoutToEdit.exercises || []).map((exercise: any) => ({
        ...exercise,
        status: 'draft' as const,
      })),
    };

    hydrateDraftWorkout(reopenedWorkout);
    setTodaysWorkout(null);
    setIsViewingExistingWorkout(false);
    setIsEditingCompletedWorkout(true);
  }, [hydrateDraftWorkout]);

  // Test function to verify workout sharing
  const testWorkoutSharing = async () => {
    
    // Create a simple test workout
    const testWorkout = {
      id: generateUniqueId('test'),
      title: 'Test Workout',
      exercises: [
        {
          name: 'Bench Press',
          equipment: 'Barbell',
          sets: [
            { weight: '135', reps: '10', completed: true },
            { weight: '155', reps: '8', completed: true },
            { weight: '175', reps: '6', completed: true }
          ]
        },
        {
          name: 'Squats',
          equipment: 'Barbell',
          sets: [
            { weight: '185', reps: '12', completed: true },
            { weight: '205', reps: '10', completed: true }
          ]
        }
      ]
    };
    
    
    // Test sharing with a dummy community and players
    const testCommunity = {
      id: 'test_community',
      name: 'Test Team',
      firebaseTeam: { id: 'test_team_id', name: 'Test Team' }
    };
    
    const testPlayers = ['test_player_1', 'test_player_2'];
    
    try {
      const success = await workoutSharingService.shareWorkoutWithPlayers(
        testWorkout,
        user?.uid || 'test_coach',
        'Test Coach',
        'test_team_id',
        'Test Team',
        testPlayers,
        ['Test Player 1', 'Test Player 2'],
        'medium'
      );
      
    } catch (error) {
      console.error('🧪 Test sharing error:', error);
    }
  };

  const handleShareWorkoutWithTeam = async (workout: any, community: any, players: string[], assignedDate?: Date) => {
    try {
      if (!user?.uid || !profile) {
        Alert.alert('Error', 'User information not available. Please try again.');
        return;
      }

      // Check if user is a coach
      const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
      
      // Coaches assign workouts directly (no points to revoke since they don't finish workouts)

      // Get player names from the selected players
      const playerNames: string[] = [];
      for (const playerId of players) {
        try {
          const playerDoc = await userService.getUser(playerId);
          // Use firstName from Firebase, fallback to 'Player'
          const playerName = playerDoc?.firstName || 'Player';
          playerNames.push(playerName);
        } catch (error) {
          console.error('❌ Error fetching player name:', playerId, error);
          playerNames.push('Player');
        }
      }

      // Update workout date if assigned date is provided (for future assignments)
      const workoutToShare = assignedDate ? {
        ...workout,
        date: assignedDate.toISOString().split('T')[0],
        assignedDate: assignedDate.toISOString(),
      } : workout;

      // Share the workout using the sharing service with assigned date
      const success = await workoutSharingService.shareWorkoutWithPlayers(
        workoutToShare,
        user.uid,
        profile.firstName || 'Coach',
        community.firebaseTeam?.id || community.teamId || '',
        community.firebaseTeam?.name || community.name,
        players,
        playerNames,
        'medium',
        assignedDate // Pass the assigned date
      );

      if (success) {
        // For coaches: Update the assigned workouts state and reload the workout to display
        if (isCoach && assignedDate) {
          const assignedDateString = assignedDate.toISOString().split('T')[0];
          const selectedDateString = selectedDate.toISOString().split('T')[0];
          
          // Update the state
          setHasAssignedWorkoutsForDate(true);
          
          // If assignment is for a different date, switch to that date
          if (assignedDateString !== selectedDateString) {
            setSelectedDate(assignedDate);
          }
          
          // Reload the workout for the assigned date to display it
          setTimeout(async () => {
            try {
              if (!user?.uid || !profile?.teamId) {
                console.error('❌ Missing user or teamId for reloading workout');
                return;
              }
              const dateString = getLocalDateKey(assignedDate);
              const teamId = profile.teamId; // TypeScript guard
              const coachAssignments = await workoutSharingService.getCoachAssignments(user.uid, teamId);
              
              const assignmentsForDate = coachAssignments.filter((assignment: any) => {
                try {
                  let assignmentDateString = null;
                  if (assignment.assignedDate) {
                    let assignedDateObj: Date | null = null;
                    if (assignment.assignedDate.toDate && typeof assignment.assignedDate.toDate === 'function') {
                      assignedDateObj = assignment.assignedDate.toDate();
                    } else if (typeof assignment.assignedDate === 'string') {
                      assignedDateObj = new Date(assignment.assignedDate);
                    } else if (assignment.assignedDate instanceof Date) {
                      assignedDateObj = assignment.assignedDate;
                    }
                    if (assignedDateObj) {
                      assignmentDateString = getLocalDateKey(assignedDateObj);
                    }
                  }
                  
                  let workoutDate = null;
                  if (assignment.workoutData?.date) {
                    if (typeof assignment.workoutData.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(assignment.workoutData.date)) {
                      workoutDate = assignment.workoutData.date;
                    } else {
                      let workoutDateObj: Date | null = null;
                      if (typeof assignment.workoutData.date === 'string') {
                        workoutDateObj = new Date(assignment.workoutData.date);
                      } else if (assignment.workoutData.date instanceof Date) {
                        workoutDateObj = assignment.workoutData.date;
                      } else if (assignment.workoutData.date.toDate && typeof assignment.workoutData.date.toDate === 'function') {
                        workoutDateObj = assignment.workoutData.date.toDate();
                      }
                      if (workoutDateObj) {
                        workoutDate = getLocalDateKey(workoutDateObj);
                      }
                    }
                  }
                  
                  return assignmentDateString === dateString || workoutDate === dateString;
                } catch (error) {
                  return false;
                }
              });
              
              if (assignmentsForDate.length > 0) {
                const firstAssignment = assignmentsForDate[0];
                const workoutData = firstAssignment.workoutData || firstAssignment;
                
                let workoutDateString = dateString;
                let createdAtDate = new Date();
                
                if (firstAssignment.assignedDate) {
                  try {
                    const assignedDate = firstAssignment.assignedDate as any;
                    let assignedDateObj: Date;
                    
                    if (assignedDate?.toDate && typeof assignedDate.toDate === 'function') {
                      assignedDateObj = assignedDate.toDate();
                    } else if (typeof assignedDate === 'string') {
                      assignedDateObj = new Date(assignedDate);
                    } else if (assignedDate instanceof Date) {
                      assignedDateObj = assignedDate;
                    } else {
                      assignedDateObj = new Date();
                    }
                    
                    workoutDateString = getLocalDateKey(assignedDateObj);
                    createdAtDate = assignedDateObj;
                  } catch (error) {
                    console.error('❌ Error parsing assignedDate:', error);
                  }
                }
                
                const workout = {
                  id: firstAssignment.id || generateUniqueId('workout'),
                  title: workoutData.title || firstAssignment.workoutName || 'Assigned Workout',
                  date: workoutDateString,
                  exercises: (workoutData.exercises || []).map((ex: any) => ({
                    ...ex,
                    status: 'draft',
                  })),
                  createdAt: createdAtDate,
                  completedAt: undefined,
                  status: 'draft',
                  isAssignedWorkout: true,
                  assignmentId: firstAssignment.id,
                };
                
                setTodaysWorkout(workout);
                setIsViewingExistingWorkout(true);
              }
            } catch (error) {
              console.error('❌ Error reloading assigned workout:', error);
            }
          }, 500); // Small delay to ensure Firebase has updated
        }
        
        Alert.alert(
          isCoach ? 'Workout Assigned! 🏋️' : 'Workout Shared! 🏋️',
          isCoach 
            ? `Your workout has been assigned to ${players.length} player${players.length !== 1 ? 's' : ''} for ${assignedDate ? assignedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'the selected date'}. They can find it in their inbox.`
            : `Your workout has been sent to ${players.length} player${players.length !== 1 ? 's' : ''} in ${community.name}. They can find it in their inbox.`,
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', `Failed to ${isCoach ? 'assign' : 'share'} workout. Please try again.`);
      }
    } catch (error) {
      console.error('❌ Error sharing workout:', error);
      Alert.alert('Error', 'Failed to share workout with team. Please try again.');
    }
  };

  const handleAddCardio = () => {
    if (!selectedCardioActivity) {
      Alert.alert('Incomplete Cardio', 'Please select an activity.');
      return;
    }

    const requiresDuration = customCardioMetrics?.duration !== false;
    const requiresDistance = customCardioMetrics?.distance === true;

    if (requiresDuration && !cardioDuration) {
      Alert.alert('Duration Required', 'Enter the session duration to continue.');
      return;
    }

    if (requiresDistance && !cardioDistance) {
      Alert.alert('Distance Required', 'Enter the distance covered to continue.');
      return;
    }

    const cardioExercise = {
      name: selectedCardioActivity,
      duration: cardioDuration ? parseFloat(cardioDuration) : null,
      speed: cardioSpeed ? parseFloat(cardioSpeed) : null,
      distance: cardioDistance ? parseFloat(cardioDistance) : null,
      intensity: cardioIntensity,
      caloriesBurned: cardioCaloriesBurned ? parseFloat(cardioCaloriesBurned) : null,
      type: 'cardio' as const,
      customExerciseId: activeCustomCardioExerciseId || undefined,
      isCustom: Boolean(activeCustomCardioExerciseId),
      cardioMetrics: customCardioMetrics || undefined,
      trackingStyle: customCardioMetrics
        ? customCardioMetrics.distance && customCardioMetrics.duration !== false
          ? 'time_distance'
          : customCardioMetrics.distance
            ? 'distance'
            : 'time'
        : 'time',
    };

    addExercise(cardioExercise);

    // Reset form
    setSelectedCardioActivity('');
    setCardioDuration('');
    setCardioSpeed('');
    setCardioDistance('');
    setCardioIntensity('moderate');
    setCardioCaloriesBurned('');
    setCustomCardioMetrics(null);
    setActiveCustomCardioExerciseId(null);
    setShowCardioModal(false);
  };

  const handleShareWithCommunity = async () => {
    // Check feature flag - show "Coming Soon" if share is disabled
    const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
    if (!checkFeatureOrShowComingSoon('shareWorkout', 'Share Workout')) {
      return;
    }

    if (!isFeatureUnlocked('community_challenges')) {
      setShowUnlockModal(true);
      return;
    }

    const personalCommunity = communities.find(
      (community) => community.id === activeCommunityId && community.type !== 'sports'
    );

    if (!isCoach && personalCommunity && user?.uid) {
      try {
        const displayName =
          profile?.firstName ||
          profile?.institutionName ||
          user?.displayName ||
          'Member';
        await createFeedEntry(personalCommunity.id, {
          userId: user.uid,
          displayName,
          message: `${displayName} finished a workout!`,
          workoutId: todaysWorkout?.id,
        });
        Alert.alert('Shared!', 'Your community feed has been updated.');
      } catch (error) {
        console.error('❌ Error creating community feed entry:', error);
        Alert.alert('Error', 'Unable to share with your community right now.');
      }
      return;
    }

    const fetchTeamData = async () => {

      if (!user?.uid) {
        return;
      }

      try {
        const { fetchUserDoc } = useUserStore.getState();
        await fetchUserDoc(user.uid);
        const updatedProfile = useUserStore.getState().profile;

        if (updatedProfile?.teamId) {
          const team = await teamService.getTeamById(updatedProfile.teamId);
          if (team) {
            setFirebaseTeamData(team);
          }
        } else {
          const coachCommunity = communities.find(
            (community) => community.type === 'sports' && community.role === 'coach'
          );
          if (coachCommunity?.inviteCode) {
            try {
              const team = await teamService.getTeamByInviteCode(coachCommunity.inviteCode);
              if (team) {
                setFirebaseTeamData(team);
              }
            } catch (error) {
              console.error('❌ Error fetching team by invite code:', error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error prepping team data for share:', error);
      }
    };

    fetchTeamData();

    if (!isCoach) {
      setShowShareModal(true);
    }
  };

  // Legacy render functions removed - components extracted to:
  // - WeekPicker: @/components/workout/WeekPicker.tsx
  // - WorkoutTypeToggle: @/components/workout/WorkoutTypeToggle.tsx
  // - WorkoutMetadata: @/components/workout/WorkoutMetadata.tsx
  // - ExerciseSearch: @/components/workout/ExerciseSearch.tsx
  // - CardioCard: @/components/workout/CardioCard.tsx
  // - ExerciseCard: @/components/workout/ExerciseCard.tsx
  // - EditTodaysWorkoutModal: @/components/workout/modals/EditTodaysWorkoutModal.tsx
  // - ShareModal: @/components/workout/modals/ShareModal.tsx
  // - TodaysWorkout: @/components/workout/TodaysWorkout.tsx
  // - SegmentedControl: @/components/workout/SegmentedControl.tsx
  // - FavoritesList: @/components/workout/FavoritesList.tsx

  // All legacy render functions removed - using extracted components instead

  // Add error boundary for rendering
  try {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View style={styles.container}>
          <View style={styles.segmentedControlWrapper}>
            <SegmentedControl
              activeSegment={activeSegment}
              onSegmentChange={setActiveSegment}
            />
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: isKeyboardVisible ? actionBarPaddingBottom + 24 : 100,
              },
            ]}
            keyboardShouldPersistTaps="handled"
          >
        {activeSegment === 'all' ? (
          <>
            <WeekPicker
              selectedDate={selectedDate}
              weekOffset={weekOffset}
              onDateSelect={setSelectedDate}
              onWeekOffsetChange={setWeekOffset}
            />
            
            <LightningSeparator />

            {/* Only show post-workout card if workout is completed (for personal use) or if it's an assigned workout (for coaches) */}
            {isViewingExistingWorkout && todaysWorkout && 
              ((todaysWorkout as any).status === 'completed' || (isCoach && todaysWorkout.isAssignedWorkout)) && (
              <TodaysWorkout
                workout={todaysWorkout}
                selectedDate={selectedDate}
                favorites={favorites}
                onEdit={
                  canEditTodaysWorkout
                    ? () => {
                        const isAssignedWorkout = Boolean(todaysWorkout.isAssignedWorkout);
                        const isCompletedWorkout = (todaysWorkout as any).status === 'completed';

                        if (isCoach || isAssignedWorkout) {
                          setEditingTodaysWorkout({ ...todaysWorkout });
                          setShowEditTodaysWorkout(true);
                          return;
                        }

                        if (isCompletedWorkout) {
                          reopenCompletedWorkoutForEditing(todaysWorkout);
                          return;
                        }

                        unlockSavedWorkout();
                      }
                    : undefined
                }
                onShare={isClient ? undefined : () => {
                  // Check feature flag - show "Coming Soon" if share is disabled
                  const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
                  if (!checkFeatureOrShowComingSoon('shareWorkout', 'Share Workout')) {
                    return;
                  }
                  
                  // Only coaches/trainers can assign/share workouts
                  if (isCoach) {
                    setCompletedWorkoutToShare(todaysWorkout);
                    setAssignedDateForShare(selectedDate);
                    setShowShareModal(true);
                  }
                }}
                onDelete={async () => {
                  if (!todaysWorkout?.id) {
                    Alert.alert('Error', 'Cannot delete workout: No workout ID found.');
                    return;
                  }
                  
                  Alert.alert(
                    'Delete Workout',
                    'Are you sure you want to delete this workout? This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          setIsDeletingWorkout(true);
                          try {
                            // CRITICAL: Immediately clear UI state BEFORE any async operations
                            // This makes the workout banner disappear instantly
                            const workoutToDelete = { ...todaysWorkout }; // Save copy before clearing
                            clearCurrentWorkout();
                            setTodaysWorkout(null);
                            setIsViewingExistingWorkout(false);
                            setEditingTodaysWorkout(null);
                            
                            // Check if this is an assigned workout or a completed workout
                            const isAssignedWorkout = workoutToDelete.isAssignedWorkout || workoutToDelete.assignmentId;
                            const workoutIdToDelete = workoutToDelete.assignmentId || workoutToDelete.id;
                            
                            // IMPORTANT: Use the workout.id (the original ID used for points), not the Firebase document ID
                            // The workout.id is what was used as referenceId when points were added
                            const workoutIdForPoints = workoutToDelete.id;
                            
                            
                            if (isAssignedWorkout) {
                              // Delete assigned workout from inbox/sharedWorkouts
                              
                              // For players: remove from their inbox
                              if (!isCoach && user?.uid) {
                                // Deduct points for assigned workout
                                // Use the workout.id (not assignmentId) because that's what was used for points
                                if (workoutIdForPoints) {
                                  try {
                                    const { usePointsStore } = await import('@/stores/pointsStore');
                                    await usePointsStore.getState().deductPoints(workoutIdForPoints, user.uid);
                                  } catch (pointsError) {
                                    console.error('❌ Error deducting points for assigned workout:', pointsError);
                                  }
                                }
                                
                                const inboxWorkouts = await workoutSharingService.getPlayerInbox(user.uid);
                                const inboxQuery = query(
                                  collection(db, 'userInbox'),
                                  where('userId', '==', user.uid)
                                );
                                const inboxSnapshot = await getDocs(inboxQuery);
                                
                                if (!inboxSnapshot.empty) {
                                  const inboxDoc = inboxSnapshot.docs[0];
                                  const inboxData = inboxDoc.data();
                                  const updatedWorkouts = (inboxData.sharedWorkouts || []).filter(
                                    (w: any) => w.id !== workoutIdToDelete
                                  );
                                  
                                  await updateDoc(inboxDoc.ref, {
                                    sharedWorkouts: updatedWorkouts
                                  });
                                }
                              }
                              
                              // For coaches: delete the assigned workout entirely
                              if (isCoach) {
                                await workoutSharingService.deleteAssignedWorkout(workoutIdToDelete);
                              }
                            } else {
                              // Delete completed workout from history
                              
                              // Deduct points BEFORE deleting using the workout.id (not Firebase document ID)
                              // The workout.id is what was stored as referenceId when points were added
                              if (user?.uid && !isCoach && workoutIdForPoints) {
                                try {
                                  const { usePointsStore } = await import('@/stores/pointsStore');
                                  await usePointsStore.getState().deductPoints(workoutIdForPoints, user.uid);
                                } catch (pointsError) {
                                  console.error('❌ Error deducting points for workout:', pointsError);
                                  console.error('❌ Workout ID used:', workoutIdForPoints);
                                  // Continue with deletion even if point deduction fails
                                }
                              }
                              
                              // Now delete the workout (this uses workoutIdToDelete which might be Firebase doc ID)
                              await deleteWorkoutFromHistory(workoutIdToDelete);
                            }
                            
                            // Reload workouts from Firebase in background (workout display already cleared)
                            if (user?.uid) {
                              await loadWorkoutsFromFirebase(user.uid);
                            }
                            
                            // Update hasAssignedWorkoutsForDate for coaches
                            if (isCoach && user?.uid && profile?.teamId) {
                              workoutSharingService.getCoachAssignments(user.uid, profile.teamId).then((coachAssignments) => {
                                const dateString = selectedDate.toISOString().split('T')[0];
                                const assignmentsForDate = coachAssignments.filter((assignment: any) => {
                                  try {
                                    let assignedDate = null;
                                    if (assignment.assignedDate) {
                                      if (assignment.assignedDate.toDate && typeof assignment.assignedDate.toDate === 'function') {
                                        assignedDate = assignment.assignedDate.toDate().toISOString().split('T')[0];
                                      } else if (typeof assignment.assignedDate === 'string') {
                                        assignedDate = new Date(assignment.assignedDate).toISOString().split('T')[0];
                                      } else if (assignment.assignedDate instanceof Date) {
                                        assignedDate = assignment.assignedDate.toISOString().split('T')[0];
                                      }
                                    }
                                    let workoutDate = null;
                                    if (assignment.workoutData?.date) {
                                      if (typeof assignment.workoutData.date === 'string') {
                                        workoutDate = new Date(assignment.workoutData.date).toISOString().split('T')[0];
                                      } else if (assignment.workoutData.date instanceof Date) {
                                        workoutDate = assignment.workoutData.date.toISOString().split('T')[0];
                                      } else if (assignment.workoutData.date.toDate && typeof assignment.workoutData.date.toDate === 'function') {
                                        workoutDate = assignment.workoutData.date.toDate().toISOString().split('T')[0];
                                      }
                                    }
                                    return assignedDate === dateString || workoutDate === dateString;
                                  } catch (error) {
                                    return false;
                                  }
                                });
                                setHasAssignedWorkoutsForDate(assignmentsForDate.length > 0);
                              }).catch((error) => {
                                console.error('❌ Error updating assigned workouts state:', error);
                              });
                            }
                            
                            Alert.alert('Success', 'Workout deleted successfully.');
                          } catch (error) {
                            console.error('❌ Error deleting workout:', error);
                            Alert.alert('Error', 'Failed to delete workout. Please try again.');
                          } finally {
                            setIsDeletingWorkout(false);
                          }
                        },
                      },
                    ]
                  );
                }}
                onAddFavorite={addFavorite}
                onRemoveFavorite={removeFavorite}
              />
            )}

            {/* Action row stays directly beneath the builder */}
              {/* For coaches: Always show creation interface. For players: only show when not viewing existing workout */}
              <View style={{ marginTop: -4 }}>
              {(!isViewingExistingWorkout || isCoach || todaysWorkout?.status === 'saved') && (
                <>
                  {/* Show separator for coaches when viewing assigned workout */}
                  {isCoach && isViewingExistingWorkout && todaysWorkout && (
                    <View style={{ marginVertical: 20, paddingHorizontal: 16 }}>
                      <Text style={[{ fontSize: 16, fontWeight: '600', marginBottom: 8 }, { color: BrandColors.text }]}>
                        Create New Workout for This Date
                      </Text>
                      <View style={{ height: 1, backgroundColor: BrandColors.gray800 }} />
                    </View>
                  )}
                  {!showCardioModal && (
                    <WorkoutTypeToggle
                      workoutType={workoutType}
                      onTypeChange={setWorkoutType}
                    />
                  )}
                  <WorkoutMetadata
                    title={currentWorkout?.title || ''}
                    onTitleChange={setWorkoutTitle}
                  />
                  <ExerciseSearch
                    workoutType={workoutType}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchFocus={handleSearchFocus}
                    onSearchLayout={handleSearchLayout}
                    onExerciseSelect={handleExerciseSelection}
                    isKeyboardVisible={isKeyboardVisible}
                    onCardioSelect={(activity) => {
                      setSelectedCardioActivity(activity);
                      setCustomCardioMetrics(null);
                      setActiveCustomCardioExerciseId(null);
                      setShowCardioModal(true);
                      setSearchQuery('');
                    }}
                    onAddCardioPress={() => {
                      setCustomCardioMetrics(null);
                      setActiveCustomCardioExerciseId(null);
                      setShowCardioModal(true);
                    }}
                    hasExercises={!!(currentWorkout?.exercises && currentWorkout.exercises.length > 0)}
                    customExercises={customExercises}
                    onCustomExerciseSelect={handleCustomExerciseSelect}
                    onCreateCustomExercise={handleCreateCustomExercisePress}
                  />
                  
                  {currentWorkout?.exercises && Array.isArray(currentWorkout.exercises) ? 
                    currentWorkout.exercises
                      .filter((exercise) => exercise && exercise.id) // Filter out null/undefined exercises
                      .map((exercise, index) => {
                        // Clean exercise with filtered sets (don't mutate original)
                        const cleanExercise = {
                          ...exercise,
                          sets: exercise.sets && Array.isArray(exercise.sets) 
                            ? exercise.sets.filter((set: any) => set && set.id)
                            : exercise.sets || []
                        };
                        return (
                          <Fragment key={`exercise-${cleanExercise.id || 'ex-' + index}-idx-${index}-workout-${currentWorkout?.id || 'current'}-setCount-${cleanExercise.sets?.length || 0}`}>
                        <ExerciseCard
                              exercise={cleanExercise}
                          validationErrors={validationErrors}
                          onUpdateSet={updateSet}
                          onRemoveExercise={removeExercise}
                          onRemoveSet={removeSet}
                          onSetCountChange={handleSetCountChange}
                          onSetStatus={setExerciseStatus}
                          onSaveExercise={handleSaveExerciseCard}
                          focusRequest={pendingSetFocus}
                          onFocusHandled={() => setPendingSetFocus(null)}
                          onInputFocus={handleSetInputFocus}
                          onWeightFocus={handleWeightInputFocus}
                        />
                        {/* AI Suggest Next Exercise Button - HIDDEN for v1.0 to avoid "Coming Soon" in screenshots */}
                        {false && cleanExercise.type !== 'cardio' && (
                          <AISuggestExerciseButton
                            currentExercises={currentWorkout?.exercises || []}
                            workoutType={workoutType}
                            onExerciseSuggested={(exerciseName) => {
                              handleExerciseSelection(exerciseName);
                            }}
                          />
                        )}
                      </Fragment>
                        );
                      }) : null}
                </>
              )}
              </View>
            </>
          ) : (
            <FavoritesList
              favorites={favorites}
              onUpdateFavorite={updateFavorite}
              onRemoveFavorite={removeFavorite}
              onSegmentChange={setActiveSegment}
              favoriteToApply={favoriteToApply}
              onAppliedFavorite={() => setFavoriteToApply(null)}
            />
          )}
        </ScrollView>
        
        {/* For coaches: Always show action bar even when viewing assigned workout, so they can create new ones */}
        {(!isViewingExistingWorkout || isCoach || todaysWorkout?.status === 'saved') && (
          <View
            style={[
              styles.actionBar,
              {
                backgroundColor: BrandColors.background + '95',
                borderTopColor: BrandColors.gray800,
                paddingBottom: actionBarPaddingBottom,
              },
            ]}
          >
            {/* For coaches: Show "Assign to Players" and conditionally "New Workout" button */}
            {isCoach ? (
              <>
                {/* Only show "New Workout" button if there are already assigned workouts for this date */}
                {hasAssignedWorkoutsForDate && (
                  <TouchableOpacity
                    style={[
                      styles.newWorkoutButton,
                      { 
                        backgroundColor: BrandColors.gray700,
                        opacity: 1
                      }
                    ]}
                    onPress={() => {
                      // Don't clear current workout - just indicate they can create a new one
                      // The workout creation interface is already visible below for creating new workouts
                      // This button is informational - they can use the interface below to create a new workout
                      // without clearing anything
                    }}
                  >
                    <Text style={[styles.newWorkoutButtonText, { color: BrandColors.textSecondary }]}>
                      New Workout
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Only show "Assign to Players" button when exercises have been recorded */}
                {currentWorkout.exercises && currentWorkout.exercises.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.assignButton,
                      { 
                        backgroundColor: BrandColors.accent,
                        opacity: 1
                      }
                    ]}
                    onPress={async () => {
                      if (!currentWorkout.exercises || currentWorkout.exercises.length === 0) {
                        Alert.alert('No Workout', 'Please add some exercises before assigning to players.');
                        return;
                      }
                      
                      // Ensure communities are loaded before opening modal
                      const { loadCommunityData } = useCommunityStore.getState();
                      if (loadCommunityData) {
                        await loadCommunityData();
                      }
                      
                      // Set the workout to share with the selected date
                      const workoutToShare = {
                        ...currentWorkout,
                        exercises: currentWorkout.exercises,
                        date: selectedDate.toISOString().split('T')[0],
                        title: currentWorkout.title || `Workout - ${selectedDate.toLocaleDateString()}`
                      };
                      setCompletedWorkoutToShare(workoutToShare);
                      setAssignedDateForShare(selectedDate);
                      setShowShareModal(true);
                    }}
                  >
                    <Text style={[styles.assignButtonText, { color: BrandColors.text }]}>
                      Assign to Players
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {/* Share button - HIDDEN for v1.0 to avoid "Coming Soon" in screenshots */}
                {false && !isViewingExistingWorkout && !isEditingCompletedWorkout && (
                    <TouchableOpacity
                      style={[
                        styles.shareButton,
                        { 
                          backgroundColor: isFeatureUnlocked('community_challenges') ? BrandColors.accent : BrandColors.gray700,
                          opacity: isFeatureUnlocked('community_challenges') ? 1 : 0.6
                        }
                      ]}
                      onPress={handleShareWithCommunity}
                    >
                      <Text style={[
                        styles.shareButtonText,
                        { color: isFeatureUnlocked('community_challenges') ? BrandColors.text : BrandColors.textSecondary }
                      ]}>
                        Share with Community
                      </Text>
                    </TouchableOpacity>
                )}
                    
                {/* Finish Workout button - VISIBLE */}
                {!isViewingExistingWorkout && !isEditingCompletedWorkout && (
                    <TouchableOpacity
                      style={[styles.finishButton, { backgroundColor: BrandColors.accent }]}
                      onPress={handleFinishWorkout}
                    >
                      <Text style={[styles.finishButtonText, { color: BrandColors.text }] }>
                        Finish Workout
                      </Text>
                    </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
        
        <UnlockModal
          visible={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          onWatchVideos={() => {
            setShowUnlockModal(false);
            setShowVideoModal(true);
          }}
        />
        <VideoModal
          visible={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          onBrowseVideos={() => {
            setShowVideoModal(false);
            // TODO: Navigate to video screen
          }}
        />
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onReview={() => setShowReviewModal(false)}
        />
        <AnalysisModal
          visible={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
          onViewAnalysis={() => setShowAnalysisModal(false)}
        />
        <CustomExerciseModal
          visible={showCustomExerciseModal}
          onClose={() => {
            setShowCustomExerciseModal(false);
          }}
          onSubmit={handleCustomExerciseSubmit}
        />
        <CardioModal
          visible={showCardioModal}
          selectedActivity={selectedCardioActivity}
          duration={cardioDuration}
          speed={cardioSpeed}
          distance={cardioDistance}
          intensity={cardioIntensity}
          caloriesBurned={cardioCaloriesBurned}
          onClose={() => {
            setShowCardioModal(false);
            setCustomCardioMetrics(null);
            setActiveCustomCardioExerciseId(null);
          }}
          onSelectActivity={setSelectedCardioActivity}
          onDurationChange={setCardioDuration}
          onSpeedChange={setCardioSpeed}
          onDistanceChange={setCardioDistance}
          onIntensityChange={setCardioIntensity}
          onCaloriesBurnedChange={setCardioCaloriesBurned}
          onAdd={handleAddCardio}
          metricConfig={customCardioMetrics || undefined}
        />
        <EquipmentModal
          visible={showEquipmentModal}
          selectedExercise={selectedExercise}
          availableEquipment={availableEquipment}
          onClose={() => setShowEquipmentModal(false)}
          onSelectEquipment={handleEquipmentSelection}
        />
        <Modal
          visible={showMachineLoadModal}
          transparent
          animationType="fade"
          onRequestClose={resetMachineSelectionState}
        >
          <Pressable style={styles.modalOverlay} onPress={resetMachineSelectionState}>
            <Pressable
              style={[styles.gripModalContent, { backgroundColor: BrandColors.surface, borderColor: BrandColors.gray700 }]}
              onPress={() => {}}
            >
              <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
                How is this machine loaded?
              </Text>
              <Text style={[styles.gripModalSubtitle, { color: BrandColors.textSecondary }]}>
                Select the loading style to track the right weight.
              </Text>
              <View style={styles.gripOptionsContainer}>
                <TouchableOpacity
                  style={[styles.gripOptionButton, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.gray700 }]}
                  onPress={() => handleMachineLoadSelection('pin')}
                >
                  <Text style={[styles.gripOptionText, { color: BrandColors.text }]}>Pin Loaded</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.gripOptionButton, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.gray700 }]}
                  onPress={() => handleMachineLoadSelection('plate')}
                >
                  <Text style={[styles.gripOptionText, { color: BrandColors.text }]}>Plate Loaded</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[ComponentStyles.button.primary, styles.modalCloseButton]}
                onPress={resetMachineSelectionState}
                activeOpacity={0.8}
              >
                <Text style={ComponentStyles.button.primaryText}>
                  Close
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
        <Modal
          visible={showPlateSelectionModal}
          animationType="slide"
          onRequestClose={handleCancelPlateSelection}
        >
          <View style={[styles.plateModalContainer, { backgroundColor: BrandColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
                Plate Loaded Machine
              </Text>
              <TouchableOpacity onPress={handleCancelPlateSelection}>
                <Text style={[styles.closeButton, { color: BrandColors.accent }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.plateModalContent}
              contentContainerStyle={styles.plateModalContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.plateModalSubtitle, { color: BrandColors.textSecondary }]}>
                Track how many plates you loaded. Adjust the machine's starting weight with the pencil button.
              </Text>
              <View style={styles.plateOptionList}>
                {MACHINE_PLATE_WEIGHTS.map((weight) => (
                  <View
                    key={`plate-${weight}`}
                    style={[styles.plateOptionRow, { borderColor: BrandColors.gray700 }]}
                  >
                    <Text style={[styles.plateWeightLabel, { color: BrandColors.text }]}>
                      {weight} lb
                    </Text>
                    <View style={styles.plateCounter}>
                      <TouchableOpacity
                        style={[styles.plateCounterButton, { borderColor: BrandColors.gray700 }]}
                        onPress={() => handlePlateCountChange(weight, -1)}
                      >
                        <Text style={[styles.plateCounterButtonText, { color: BrandColors.text }]}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.plateCountValue, { color: BrandColors.text }]}>
                        {plateCounts[String(weight)] || 0}
                      </Text>
                      <TouchableOpacity
                        style={[styles.plateCounterButton, { borderColor: BrandColors.gray700 }]}
                        onPress={() => handlePlateCountChange(weight, 1)}
                      >
                        <Text style={[styles.plateCounterButtonText, { color: BrandColors.text }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
              <View
                style={[
                  styles.baseWeightContainer,
                  {
                    borderColor: BrandColors.gray700,
                    backgroundColor: BrandColors.gray800,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.baseWeightEditButton,
                    {
                      borderColor: BrandColors.gray700,
                      backgroundColor: BrandColors.background,
                    },
                  ]}
                  onPress={toggleBaseWeightEditing}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <IconSymbol
                    name={isEditingBaseWeight ? 'checkmark.circle.fill' : 'pencil'}
                    size={18}
                    color={BrandColors.text}
                    style={styles.baseWeightEditIcon}
                  />
                </TouchableOpacity>
                <Text style={[styles.baseWeightLabel, { color: BrandColors.text }]}>
                  Machine starting weight
                </Text>
                {isEditingBaseWeight ? (
                  <TextInput
                    ref={baseWeightInputRef}
                    style={[
                      styles.baseWeightInputField,
                      {
                        color: BrandColors.text,
                        borderColor: BrandColors.gray700,
                        backgroundColor: BrandColors.gray900,
                      },
                    ]}
                    value={plateBaseWeightText}
                    onChangeText={handleBaseWeightChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={BrandColors.textSecondary}
                    returnKeyType="done"
                    onSubmitEditing={() => toggleBaseWeightEditing()}
                  />
                ) : (
                  <Text style={[styles.baseWeightValue, { color: BrandColors.text }]}>
                    {plateBaseWeight} lb
                  </Text>
                )}
                <Text style={[styles.baseWeightHint, { color: BrandColors.textSecondary }]}>
                  Tap the pencil to edit the carriage weight for this machine.
                </Text>
              </View>
              <View style={[styles.estimatedWeightContainer, { borderColor: BrandColors.gray700 }]}>
                <Text style={[styles.estimatedWeightLabel, { color: BrandColors.textSecondary }]}>
                  Estimated starting weight
                </Text>
                <Text style={[styles.estimatedWeightValue, { color: BrandColors.text }]}>
                  {estimatedPlateLoadedWeight} lb
                </Text>
              </View>
            </ScrollView>
            <View style={styles.plateModalActions}>
              <TouchableOpacity
                style={[styles.plateModalCancelButton, { borderColor: BrandColors.gray700 }]}
                onPress={handleCancelPlateSelection}
              >
                <Text style={[styles.modalCancelText, { color: BrandColors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.plateModalConfirmButton, { backgroundColor: BrandColors.accent }]}
                onPress={handleConfirmPlateSelection}
              >
                <Text style={[styles.plateModalConfirmText, { color: '#000' }]}>
                  Use These Plates
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          visible={showCableGripModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowCableGripModal(false);
            setPendingCableSelection(null);
          }}
        >
          <Pressable style={styles.modalOverlay} onPress={() => {
            setShowCableGripModal(false);
            setPendingCableSelection(null);
          }}>
            <Pressable style={[styles.gripModalContent, { backgroundColor: BrandColors.surface, borderColor: BrandColors.gray700 }]} onPress={() => {}}>
              <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
                Select Cable Grip
              </Text>
              <Text style={[styles.gripModalSubtitle, { color: BrandColors.textSecondary }]}>
                How do you want to perform this cable movement?
              </Text>
              <View style={styles.gripOptionsContainer}>
                {(() => {
                  // Check if this is a triceps exercise
                  const isTriceps = pendingCableSelection?.exerciseName.toLowerCase().includes('triceps') || 
                                    pendingCableSelection?.exerciseName.toLowerCase().includes('tricep');
                  
                  // For triceps: show attachment options, for others: show grip width options
                  const options = isTriceps 
                    ? ['V Bar', 'Rope', 'Straight Bar']
                    : ['narrow', 'neutral', 'wide'];
                  
                  return options.map((option) => (
                    <TouchableOpacity
                      key={`cable-grip-${option}`}
                      style={[styles.gripOptionButton, { backgroundColor: BrandColors.gray800, borderColor: BrandColors.gray700 }]}
                      onPress={() => handleCableGripSelection(option.toLowerCase())}
                    >
                      <Text style={[styles.gripOptionText, { color: BrandColors.text }]}>
                        {isTriceps ? option : `${option.charAt(0).toUpperCase() + option.slice(1)} Grip`}
                      </Text>
                    </TouchableOpacity>
                  ));
                })()}
              </View>
              <TouchableOpacity
                style={[styles.modalCancelButton, { 
                  backgroundColor: 'rgba(0, 229, 255, 0.15)',
                  borderColor: BrandColors.accent,
                }]}
                onPress={() => {
                  setShowCableGripModal(false);
                  setPendingCableSelection(null);
                }}
              >
                <Text style={[styles.modalCancelText, { color: BrandColors.accent }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
        <EditTodaysWorkoutModal
          visible={showEditTodaysWorkout}
          workout={editingTodaysWorkout}
          onClose={() => setShowEditTodaysWorkout(false)}
          onWorkoutChange={setEditingTodaysWorkout}
          onSave={async (workout: any) => {
            if (user?.uid) {
              await saveWorkoutToFirebase(workout);
              setTodaysWorkout(workout);
              // Only set viewing existing if it's completed OR if it's a coach viewing an assigned workout
              setIsViewingExistingWorkout(Boolean(workout?.status === 'completed' || (workout?.isAssignedWorkout && isCoach)));
            }
          }}
          onDelete={async (workoutId: string) => {
            try {
              // Set deleting flag to prevent useEffect from reloading
              setIsDeletingWorkout(true);
              
              // Get the workout to find the original ID for point deduction
              const workoutToDelete = editingTodaysWorkout || todaysWorkout;
              const workoutIdForPoints = workoutToDelete?.id || workoutId;
              
              // Deduct points BEFORE deleting (for personal users only)
              if (user?.uid && !isCoach) {
                try {
                  console.log('💰 Deducting points for workout ID:', workoutIdForPoints);
                  const { usePointsStore } = await import('@/stores/pointsStore');
                  await usePointsStore.getState().deductPoints(workoutIdForPoints, user.uid);
                  console.log('✅ Points deducted for deleted workout, ID:', workoutIdForPoints);
                } catch (pointsError) {
                  console.error('❌ Error deducting points for workout:', pointsError);
                  console.error('❌ Workout ID used:', workoutIdForPoints);
                  // Continue with deletion even if point deduction fails
                }
              }
              
              // Delete from both local state and Firebase
              await deleteWorkoutFromHistory(workoutId);
              
              // Immediately clear current workout and update state
              clearCurrentWorkout();
              setTodaysWorkout(null);
              setIsViewingExistingWorkout(false);
              
              // Reload workouts from Firebase to ensure consistency across the app
              if (user?.uid) {
                await loadWorkoutsFromFirebase(user.uid);
              }
              
              // Reset deleting flag after reload
              setIsDeletingWorkout(false);
              
              // Check if there's another workout for this date after reload
              const updatedWorkout = getWorkoutForDate(selectedDate);
              
              // Also check assigned workouts if no workout in history (for players)
              if (!updatedWorkout && !isCoach && user?.uid) {
                try {
                  const inboxWorkouts = await workoutSharingService.getPlayerInbox(user.uid);
                  const dateString = selectedDate.toISOString().split('T')[0];
                  const assignedWorkout = inboxWorkouts.find((w: any) => {
                    try {
                      let assignedDate = null;
                      if (w.assignedDate) {
                        if (w.assignedDate.toDate && typeof w.assignedDate.toDate === 'function') {
                          assignedDate = w.assignedDate.toDate().toISOString().split('T')[0];
                        } else if (typeof w.assignedDate === 'string') {
                          assignedDate = new Date(w.assignedDate).toISOString().split('T')[0];
                        } else if (w.assignedDate instanceof Date) {
                          assignedDate = w.assignedDate.toISOString().split('T')[0];
                        }
                      }
                      let workoutDate = null;
                      if (w.workoutData?.date) {
                        if (typeof w.workoutData.date === 'string') {
                          workoutDate = new Date(w.workoutData.date).toISOString().split('T')[0];
                        } else if (w.workoutData.date instanceof Date) {
                          workoutDate = w.workoutData.date.toISOString().split('T')[0];
                        } else if (w.workoutData.date.toDate && typeof w.workoutData.date.toDate === 'function') {
                          workoutDate = w.workoutData.date.toDate().toISOString().split('T')[0];
                        }
                      }
                      return (assignedDate === dateString || workoutDate === dateString) && w.status !== 'completed';
                    } catch (error) {
                      return false;
                    }
                  });
                  
                  if (assignedWorkout) {
                    setTodaysWorkout({
                      ...assignedWorkout.workoutData,
                      isAssignedWorkout: true,
                      assignmentId: assignedWorkout.id,
                    });
                  }
                } catch (error) {
                  console.error('❌ Error reloading assigned workout:', error);
                }
              } else if (updatedWorkout) {
                setTodaysWorkout(updatedWorkout);
              }
            } catch (error) {
              console.error('❌ Error deleting workout:', error);
              throw error; // Re-throw to let the modal handle the error alert
            }
          }}
        />
        <ShareModal
          visible={showShareModal}
          communities={communities || []}
          selectedCommunity={selectedCommunity}
          selectedPlayers={selectedPlayers}
          firebaseTeamData={firebaseTeamData}
          communityTeamNames={communityTeamNames}
          firebasePlayerNames={firebasePlayerNames}
          completedWorkout={completedWorkoutToShare}
          onClose={() => {
            setShowShareModal(false);
          }}
          onCommunitySelect={() => {}}
          onPlayerToggle={(playerId) => {
            if (selectedPlayers.includes(playerId)) {
              setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
            } else {
              setSelectedPlayers([...selectedPlayers, playerId]);
            }
          }}
          onShare={async (workout, community, players, assignedDate) => {
            await handleShareWorkoutWithTeam(workout, community, players, assignedDate);
            // Close the modal after assignment
            setShowShareModal(false);
            // For coaches: keep workout after assignment so they can assign it again for the same day
            // For players: keep workout after sharing (they still finished it)
            // Coaches can manually clear the workout if they want to create a new one
          }}
          onSetSelectedCommunity={setSelectedCommunity}
          onSetFirebaseTeamData={setFirebaseTeamData}
          onSetFirebasePlayerNames={setFirebasePlayerNames}
          onSetSelectedPlayers={setSelectedPlayers}
          initialAssignedDate={assignedDateForShare}
          isCoach={isCoach}
        />
        <Modal
          visible={showWorkoutPlanGenerator}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <WorkoutPlanGenerator 
            isInitialGeneration={false}
            onClose={() => setShowWorkoutPlanGenerator(false)}
          />
        </Modal>
        
        {/* Date Picker Modal for Coach Assignment Date */}
        <DatePickerModal
          visible={showDatePickerForShare}
          onClose={() => {
            setShowDatePickerForShare(false);
            // Clear the workout to share if user cancels
            if (!showShareModal) {
              setCompletedWorkoutToShare(null);
            }
          }}
          onDateSelect={(date) => {
            setAssignedDateForShare(date);
            setShowDatePickerForShare(false);
            // Small delay to ensure state is updated before opening share modal
            setTimeout(() => {
              setShowShareModal(true);
            }, 100);
          }}
          initialDate={assignedDateForShare}
          minDate={new Date()}
        />
        </View>
      </KeyboardAvoidingView>
    );
  } catch (error) {
    console.error('❌ Error rendering workout screen:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    console.error('❌ Error message:', errorMessage);
    console.error('❌ Error stack:', errorStack);
    
    // Return a simple error screen
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BrandColors.background }}>
        <Text style={{ color: BrandColors.text, fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Workout</Text>
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 50, paddingHorizontal: 20 }}>
          Error loading workout screen. Please try again or restart the app.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  segmentedControlWrapper: {
    paddingHorizontal: 16,
    paddingTop: 60, // Move down to be visible on screen
    paddingBottom: 0, // Reduced from 8 to eliminate extra space
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 4, // Reduced from 16 to eliminate extra space between calendar and titles
    paddingBottom: 100, // Add bottom padding to ensure content is visible above action bar
  },
  weekPickerContainer: {
    marginBottom: 4,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  weekHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  weekNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.gray800,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: BrandColors.accent + '20',
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekPicker: {
    marginBottom: 0,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 6,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 45,
    flex: 1,
    position: 'relative',
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  workoutTypeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: BrandColors.gray800,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  metadataSection: {
    marginBottom: 16,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  searchResults: {
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
  },
  searchResultItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  searchResultText: {
    fontSize: 16,
  },
  addCardioButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryActionButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardioDetails: {
    marginTop: 12,
  },
  cardioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  cardioLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardioValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  setsContainer: {
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNotesRow: {
    marginBottom: 12,
    paddingLeft: 60, // Align with set inputs
  },
  setNotesInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 50,
    maxHeight: 80,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '500',
    width: 60,
  },
  setInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginHorizontal: 4,
    fontSize: 14,
  },
  removeSetButton: {
    padding: 4,
    marginLeft: 8,
  },
  removeSetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  newWorkoutButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    minWidth: 100,
  },
  newWorkoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  assignButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  finishButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  gripModalContent: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  gripModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  gripOptionsContainer: {
    width: '100%',
    gap: 12,
  },
  gripOptionButton: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  gripOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  plateModalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  plateModalContent: {
    flex: 1,
  },
  plateModalContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 100, // Extra padding to prevent overlap with buttons
  },
  plateModalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  baseWeightContainer: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderRadius: 14,
    position: 'relative',
    gap: 10,
  },
  baseWeightEditButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseWeightEditIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  baseWeightLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  baseWeightValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  baseWeightHint: {
    fontSize: 12,
  },
  baseWeightInputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  plateOptionList: {
    gap: 12,
  },
  plateOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  plateWeightLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  plateCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  plateCounterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateCounterButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  plateCountValue: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  estimatedWeightContainer: {
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  estimatedWeightLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  estimatedWeightValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  plateModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  plateModalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 12,
  },
  plateModalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCancelButton: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  activityScroll: {
    marginBottom: 8,
  },
  activityChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  activityChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BrandColors.text,
    textAlign: 'center',
    paddingVertical: 20,
  },
  todaysWorkoutCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  todaysWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todaysWorkoutTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  todaysWorkoutTime: {
    fontSize: 14,
  },
  todaysWorkoutStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  todaysWorkoutExercises: {
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray700,
    paddingTop: 12,
  },
  todaysExerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todaysExerciseName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  todaysExerciseSets: {
    fontSize: 12,
  },
  moreExercises: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  todaysWorkoutTitleContainer: {
    flex: 1,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shareButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  shareButtonTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 8,
  },
  cardioDetailsText: {
    fontSize: 14,
  },
  editModalContent: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
    padding: 4,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray700,
  },
  addExerciseButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editModalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray700,
    gap: 12,
  },
  editModalScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  editModalScrollContent: {
    paddingBottom: 16,
  },
  editExerciseCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  editExerciseHeader: {
    marginBottom: 12,
  },
  equipmentModalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  equipmentOption: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  equipmentOptionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Segmented Control Styles
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 60,
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Favorites Styles
  favoritesList: {
    paddingHorizontal: 16,
  },
  favoriteCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  favoriteHeader: {
    marginBottom: 12,
  },
  favoriteName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  favoriteMuscleGroups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleTag: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  favoriteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastUsed: {
    fontSize: 12,
    fontWeight: '500',
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
  // Star Button Styles
  todaysWorkoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButtonText: {
    fontSize: 16,
  },
  // Empty State Styles
  emptyState: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 40,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Swipe Actions Styles
  swipeActionsRightContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  swipeActionsLeftContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  editAction: {
    width: 64,
    height: '85%',
    marginVertical: 6,
    marginRight: 6,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    width: 64,
    height: '85%',
    marginVertical: 6,
    marginLeft: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  
  // Share Modal Styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  communityType: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    marginTop: 4,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  playerRole: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    marginTop: 4,
  },
  selectedIndicator: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Onboarding-style buttons
  onboardingButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  onboardingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: BrandColors.textSecondary + '20',
    gap: 12,
  },
});

