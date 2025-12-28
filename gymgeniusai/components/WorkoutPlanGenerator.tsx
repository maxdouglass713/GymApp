/**
 * Workout Plan Generator Component
 * 
 * Allows users to generate personalized workout plans using V
 */

import React, { useState, useEffect, useRef } from 'react';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { useAuth } from './AuthProvider';
import { useUserStore } from '@/stores/userStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useWorkoutPlanStore, loadWorkoutPlansFromStorage } from '@/stores/workoutPlanStore';
import { useCommunityStore } from '@/stores/communityStore';
import { generateWorkoutPlanWithAI } from '@/services/workoutGenerationService';
import { WorkoutPlanGenerationRequest, GeneratedWorkout, WorkoutBatch, PastWorkoutData } from '@/types/workoutPlan';
import { format } from 'date-fns';
import { useWorkoutStore } from '@/stores/workoutStore';
import { router } from 'expo-router';
import { teamService } from '@/services/teamService';
import { userService } from '@/services/firestoreService';
import { workoutSharingService } from '@/services/workoutSharingService';

interface WorkoutPlanGeneratorProps {
  isInitialGeneration?: boolean;
  onClose: () => void;
}

const normalizeWorkoutGoal = (goal: string): string => {
  switch (goal) {
    case 'lose_fat':
      return 'lose_weight';
    case 'gain_strength':
    case 'increase_power':
      return 'build_muscle';
    case 'improve_endurance':
      return 'improve_endurance';
    case 'improve_flexibility':
    case 'general_health':
      return 'stay_fit';
    default:
      return goal || 'stay_fit';
  }
};

export function WorkoutPlanGenerator({ isInitialGeneration = false, onClose }: WorkoutPlanGeneratorProps) {
  const { user } = useAuth();
  const profile = useUserStore((state) => state.profile);
  
  // Check if AI features are enabled - show "Coming Soon" if disabled
  useEffect(() => {
    if (!checkFeatureOrShowComingSoon('workoutPlans', 'AI Workout Plan Generator')) {
      onClose();
      return;
    }
  }, [onClose]);
  const { workoutBatches, currentBatch, isGenerating, setIsGenerating, setCurrentBatch, addWorkoutBatch } = useWorkoutPlanStore();
  const { communities } = useCommunityStore();
  
  // Check if user is a personal user - if so, never show coach/trainer controls
  const isPersonalUser = profile?.userType === 'personal' || profile?.appUseType === 'personal';
  
  // Only check for coach/trainer if NOT a personal user
  const isCoach = !isPersonalUser && profile?.userType === 'institution' && profile?.institutionRole !== 'player';
  const isTrainer = !isPersonalUser && profile?.appUseType === 'gym_trainer' && profile?.institutionRole !== 'player';
  const isCoachOrTrainer = !isPersonalUser && (isCoach || isTrainer);

  type ClientOption = { id: string; name: string };
  const [teamMembers, setTeamMembers] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [teamName, setTeamName] = useState(profile?.institutionName || 'Team');
  const [isSharingWorkout, setIsSharingWorkout] = useState(false);
  const [coachForm, setCoachForm] = useState({
    focus: '',
    sessionLength: '',
    intensity: '',
    trainingSplit: '',
    areasOfImprovement: [] as string[],
    notes: '',
  });
  const [showFocusDropdown, setShowFocusDropdown] = useState(false);
  const [showTrainingSplitDropdown, setShowTrainingSplitDropdown] = useState(false);
  const [showAreasOfImprovementModal, setShowAreasOfImprovementModal] = useState(false);
  const [showSessionLengthDropdown, setShowSessionLengthDropdown] = useState(false);
  const [showIntensityDropdown, setShowIntensityDropdown] = useState(false);
  const updateCoachForm = (field: keyof typeof coachForm, value: string | string[]) => {
    setCoachForm((prev) => ({ ...prev, [field]: value }));
  };
  
  // Training split options
  const TRAINING_SPLIT_OPTIONS = [
    { value: 'push_pull_legs', label: 'Push/Pull/Legs (PPL)' },
    { value: 'upper_lower', label: 'Upper/Lower Split' },
    { value: 'full_body', label: 'Full Body' },
    { value: 'body_part_split', label: 'Body Part Split (Chest/Back/Shoulders/etc)' },
    { value: 'athletic_performance', label: 'Athletic Performance' },
  ];
  
  // Session length options
  const SESSION_LENGTH_OPTIONS = [
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '60 minutes' },
    { value: '75', label: '75 minutes' },
    { value: '90', label: '90 minutes' },
    { value: 'custom', label: 'Custom / Other' },
  ];
  
  // Intensity options
  const INTENSITY_OPTIONS = [
    { value: 'deload', label: 'Deload / Recovery' },
    { value: 'light', label: 'Light / Easy' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'high', label: 'High Effort' },
    { value: 'max', label: 'Maximum Intensity' },
    { value: 'rehab', label: 'Rehabilitation' },
  ];
  
  // Areas of improvement options
  const AREAS_OF_IMPROVEMENT_OPTIONS = [
    'Upper Chest',
    'Lower Chest',
    'Back Width',
    'Back Thickness',
    'Shoulders',
    'Front Delts',
    'Side Delts',
    'Rear Delts',
    'Biceps',
    'Triceps',
    'Quads',
    'Hamstrings',
    'Glutes',
    'Calves',
    'Core Stability',
    'Lower Back',
    'Mobility',
    'Strength',
    'Power',
    'Endurance',
  ];
  
  // Focus options for dropdown
  const FOCUS_OPTIONS = [
    { value: 'strength_block', label: 'Strength Block', muscleGroups: ['Chest', 'Back', 'Shoulders', 'Legs'] },
    { value: 'hypertrophy', label: 'Hypertrophy / Muscle Building', muscleGroups: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'] },
    { value: 'upper_body', label: 'Upper Body', muscleGroups: ['Chest', 'Back', 'Shoulders', 'Arms', 'Biceps', 'Triceps'] },
    { value: 'lower_body', label: 'Lower Body', muscleGroups: ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'] },
    { value: 'push_day', label: 'Push Day', muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
    { value: 'pull_day', label: 'Pull Day', muscleGroups: ['Back', 'Biceps'] },
    { value: 'leg_day', label: 'Leg Day', muscleGroups: ['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves'] },
    { value: 'glute_day', label: 'Glute Day', muscleGroups: ['Glutes', 'Legs', 'Hamstrings'] },
    { value: 'conditioning', label: 'Conditioning / Cardio', muscleGroups: ['Full Body'] },
    { value: 'full_body', label: 'Full Body', muscleGroups: ['Full Body'] },
    { value: 'core_focus', label: 'Core Focus', muscleGroups: ['Core', 'Full Body'] },
    { value: 'rehab', label: 'Rehabilitation / Recovery', muscleGroups: ['Full Body'] },
  ];
  
  // Helper functions
  const deriveGoalFromFocus = (focusValue: string): string => {
    if (!focusValue) return 'general_health';
    // Map focus values to goals
    const focusGoalMap: Record<string, string> = {
      'strength_block': 'build_muscle',
      'hypertrophy': 'build_muscle',
      'upper_body': 'build_muscle',
      'lower_body': 'build_muscle',
      'push_day': 'build_muscle',
      'pull_day': 'build_muscle',
      'leg_day': 'build_muscle',
      'glute_day': 'build_muscle',
      'conditioning': 'improve_endurance',
      'full_body': 'build_muscle',
      'core_focus': 'stay_fit',
      'rehab': 'stay_fit',
    };
    return focusGoalMap[focusValue] || 'build_muscle';
  };
  
  const deriveExperienceFromInput = (intensity: string, defaultExperience: string): string => {
    if (!intensity) return defaultExperience;
    const intensityLower = intensity.toLowerCase();
    if (intensityLower.includes('beginner') || intensityLower.includes('easy') || intensityLower.includes('light')) return 'beginner';
    if (intensityLower.includes('advanced') || intensityLower.includes('hard') || intensityLower.includes('intense')) return 'advanced';
    if (intensityLower.includes('deload') || intensityLower.includes('recovery')) return 'beginner';
    return 'intermediate'; // Default
  };
  
  // Get muscle groups based on selected focus
  const getMuscleGroupsFromFocus = (focusValue: string): string[] => {
    const focusOption = FOCUS_OPTIONS.find(opt => opt.value === focusValue);
    return focusOption?.muscleGroups || ['Full Body'];
  };
  
  
  const [selectedWorkout, setSelectedWorkout] = useState<GeneratedWorkout | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const detailModalScrollRef = useRef<ScrollView>(null);
  const hasScrolledToTopRef = useRef(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showMuscleGroupSelection, setShowMuscleGroupSelection] = useState(false);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [showDaySelection, setShowDaySelection] = useState(false);
  const { workoutHistory, setSelectedDate, setWorkoutTitle, addExercise, clearCurrentWorkout, saveWorkoutToFirebase } = useWorkoutStore();
  
  // Muscle group options
  const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Arms', 'Biceps', 'Triceps',
    'Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves',
    'Core', 'Full Body'
  ];

  useEffect(() => {
    // For coaches/trainers: don't auto-generate, they need to select focus first
    // For personal users: show muscle group selection
    if (isInitialGeneration && user && profile && !isCoachOrTrainer) {
      setShowMuscleGroupSelection(true);
    }
  }, [isInitialGeneration, isCoachOrTrainer]);

  // Scroll to top when detail modal opens or workout changes
  useEffect(() => {
    if (showDetailModal && selectedWorkout) {
      // Reset the flag when modal opens
      hasScrolledToTopRef.current = false;
      
      // Reset scroll position with multiple attempts to ensure it works
      const resetScroll = () => {
        if (detailModalScrollRef.current && !hasScrolledToTopRef.current) {
          detailModalScrollRef.current.scrollTo({ y: 0, animated: false });
          hasScrolledToTopRef.current = true;
        }
      };
      
      // Immediate reset
      resetScroll();
      
      // Use requestAnimationFrame for next frame
      requestAnimationFrame(() => {
        resetScroll();
        // Then multiple timeouts
        setTimeout(resetScroll, 0);
        setTimeout(resetScroll, 10);
        setTimeout(resetScroll, 50);
        setTimeout(resetScroll, 100);
        setTimeout(resetScroll, 150);
        setTimeout(resetScroll, 250);
        setTimeout(resetScroll, 400);
      });
    } else {
      // Reset flag when modal closes
      hasScrolledToTopRef.current = false;
    }
  }, [showDetailModal, selectedWorkout?.id]);

  // Load workout plans from storage when component mounts
  useEffect(() => {
    loadWorkoutPlansFromStorage().catch((error) => {
      console.error('❌ Error loading workout plans from storage:', error);
    });
  }, []);

  useEffect(() => {
    if (!isCoachOrTrainer || !profile?.teamId) return;
    const unsubscribe = teamService.subscribeToTeam(profile.teamId, async (team) => {
      if (!team) return;
      setTeamName(team.name || profile?.institutionName || 'Team');
      
      // Get player members
      const playerMembers = team.members?.filter((member) => member.role === 'player') || [];
      
      // Fetch actual user profiles to get correct names
      const clientsWithNames = await Promise.all(
        playerMembers.map(async (member) => {
          try {
            // Fetch the user's profile to get their actual name
            const userProfile = await userService.getUser(member.userId);
            const clientName = userProfile?.firstName 
              ? userProfile.firstName 
              : userProfile?.name 
              ? userProfile.name 
              : member.name 
              ? member.name 
              : 'Player';
            
            return {
              id: member.userId,
              name: clientName,
            };
          } catch (error) {
            console.error(`⚠️ Failed to fetch profile for client ${member.userId}:`, error);
            // Fallback to member.name or 'Player'
            return {
              id: member.userId,
              name: member.name || 'Player',
            };
          }
        })
      );
      
      setTeamMembers(clientsWithNames);
      
      if (clientsWithNames.length === 0) {
        setSelectedClient(null);
      } else if (
        selectedClient &&
        !clientsWithNames.some((client) => client.id === selectedClient.id)
      ) {
        setSelectedClient(null);
      } else if (selectedClient) {
        // Update selected client name if it changed
        const updatedClient = clientsWithNames.find((client) => client.id === selectedClient.id);
        if (updatedClient && updatedClient.name !== selectedClient.name) {
          setSelectedClient(updatedClient);
        }
      }
    });
    return () => unsubscribe();
  }, [isCoachOrTrainer, profile?.teamId, profile?.institutionName, selectedClient]);

  // Extract past workout data for AI personalization
  // If clientId is provided, fetch that client's workout history; otherwise use current user's
  const getPastWorkoutData = async (clientId?: string): Promise<PastWorkoutData[]> => {
    let workoutsToAnalyze = workoutHistory || [];
    
    // If a client is selected, fetch their workout history
    if (clientId && clientId !== user?.uid) {
      try {
        const { dataService } = await import('@/services/dataService');
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90); // Last 90 days
        const clientWorkouts = await dataService.getWorkouts(clientId, startDate.toISOString().split('T')[0], endDate);
        workoutsToAnalyze = clientWorkouts || [];
      } catch (error) {
        console.error('⚠️ Failed to fetch client workout history:', error);
        // Fallback to empty array if fetch fails
        workoutsToAnalyze = [];
      }
    }
    
    if (!workoutsToAnalyze || workoutsToAnalyze.length === 0) {
      return [];
    }
    
    const pastData: PastWorkoutData[] = [];
    
    // Get last 10 completed workouts
    const recentWorkouts = workoutsToAnalyze
      .filter(w => w.status === 'completed' && w.exercises && w.exercises.length > 0)
      .slice(-10);
    
    recentWorkouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        if (exercise.sets && exercise.sets.length > 0) {
          // Get average reps and weight from sets
          const completedSets = exercise.sets.filter(s => s.completed);
          if (completedSets.length === 0) return;
          
          const totalReps = completedSets.reduce((sum, s) => sum + (parseInt(s.reps?.toString() || '0') || 0), 0);
          const avgReps = Math.round(totalReps / completedSets.length);
          
          const totalWeight = completedSets.reduce((sum, s) => sum + (parseFloat(s.weight?.toString() || '0') || 0), 0);
          const avgWeight = completedSets.length > 0 ? totalWeight / completedSets.length : undefined;
          
          pastData.push({
            exerciseName: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: completedSets.length,
            reps: avgReps,
            weight: avgWeight,
            date: workout.date,
            completed: true,
          });
        }
      });
    });
    
    return pastData;
  };
  
  const handleMuscleGroupToggle = (muscleGroup: string) => {
    setSelectedMuscleGroups(prev => {
      if (prev.includes(muscleGroup)) {
        return prev.filter(m => m !== muscleGroup);
      } else {
        return [...prev, muscleGroup];
      }
    });
  };
  
  const handleStartGeneration = () => {
    if (selectedMuscleGroups.length === 0) {
      Alert.alert('Select Muscle Groups', 'Please select at least one muscle group to target.');
      return;
    }
    setShowMuscleGroupSelection(false);
    generateNewWorkoutPlan();
  };
  
  // Wrapper function that accepts muscle groups directly (for coaches/trainers using focus)
  const generateNewWorkoutPlanWithMuscleGroups = async (muscleGroups: string[]) => {
    // Temporarily set muscle groups in state, then call generation
    setSelectedMuscleGroups(muscleGroups);
    // Use the existing function but ensure muscle groups are used
    await generateNewWorkoutPlanInternal(muscleGroups);
  };
  
  const generateNewWorkoutPlan = async () => {
    await generateNewWorkoutPlanInternal();
  };
  
  const generateNewWorkoutPlanInternal = async (providedMuscleGroups?: string[]) => {
    if (!user || !profile) {
      console.error('❌ Missing user or profile data');
      Alert.alert('Error', 'Please complete your profile first');
      return;
    }

    if (isCoachOrTrainer) {
      if (!profile.teamId) {
        Alert.alert('Team Required', 'Join or create a team before building workouts for clients.');
        return;
      }
      if (!selectedClient) {
        Alert.alert('Select Client', 'Choose a client before generating a workout.');
        return;
      }
    }
    
    setIsGenerating(true);
    
    try {
      let generationProfile: any = profile;
      let assignedClientId: string | undefined;
      let assignedClientName: string | undefined;
      if (isCoachOrTrainer && selectedClient) {
        assignedClientId = selectedClient.id;
        assignedClientName = selectedClient.name;
        try {
          const clientDocument = await userService.getUser(selectedClient.id);
          if (clientDocument) {
            generationProfile = {
              ...generationProfile,
              ...clientDocument,
            };
          }
        } catch (error) {
          console.error('⚠️ Failed to load client profile:', error);
        }
      }

      // Get the goal from the profile (client's goal if client is selected, otherwise coach's goal)
      const primaryGoal =
        (generationProfile.goals && generationProfile.goals.length > 0
          ? generationProfile.goals[0]
          : generationProfile.primaryGoal) || 'general_health';
      
      // Use client's goal if client is selected, otherwise derive from focus for personal use
      let normalizedGoal = normalizeWorkoutGoal(primaryGoal);
      
      // Only override goal with focus if it's personal use (no client selected)
      // When a client is selected, their goal should be respected
      if (!isCoachOrTrainer || !selectedClient) {
        // Personal use: can derive goal from focus
        if (coachForm.focus) {
          normalizedGoal = normalizeWorkoutGoal(deriveGoalFromFocus(coachForm.focus));
        }
      }
      // For coaches/trainers with a client selected: use client's goal, focus only determines muscle groups
      
      
      // Fetch past workout data - use client's ID if client is selected
      const pastWorkouts = await getPastWorkoutData(assignedClientId);
      const experienceLevel = coachForm.intensity
        ? deriveExperienceFromInput(coachForm.intensity, generationProfile.exerciseExperience || 'beginner')
        : generationProfile.exerciseExperience || 'beginner';
      
      // Map equipment preference from profile format to AI-expected format
      const normalizeEquipment = (equipment: string | undefined): string => {
        if (!equipment) {
          console.warn('⚠️ No equipment preference found, defaulting to bodyweight');
          return 'bodyweight';
        }
        const equipmentLower = equipment.toLowerCase();
        if (equipmentLower === 'gym_access' || equipmentLower === 'gym' || equipmentLower === 'full_gym') {
          return 'full_gym';
        } else if (equipmentLower === 'home_only' || equipmentLower === 'home' || equipmentLower === 'home_basic') {
          return 'home_basic';
        } else if (equipmentLower === 'both') {
          return 'full_gym'; // If they have both, prioritize gym access for better workouts
        }
        // If already in expected format, return as is
        return equipment;
      };
      
      // Use client's equipment preference if client is selected, otherwise use coach's
      const rawEquipmentPreference = generationProfile.equipment || profile.equipment;
      const equipmentPreference = normalizeEquipment(rawEquipmentPreference);
      const schedule = generationProfile.weeklySchedule || profile.weeklySchedule || 3;

      // For coaches/trainers: use provided muscle groups, or from focus, or from state
      const finalMuscleGroups = providedMuscleGroups && providedMuscleGroups.length > 0
        ? providedMuscleGroups
        : selectedMuscleGroups.length > 0 
        ? selectedMuscleGroups 
        : (isCoachOrTrainer && coachForm.focus 
            ? getMuscleGroupsFromFocus(coachForm.focus) 
            : selectedMuscleGroups);
      
      // Ensure we have muscle groups
      if (finalMuscleGroups.length === 0) {
        throw new Error('No muscle groups selected. Please select a focus or muscle groups.');
      }

      const request: WorkoutPlanGenerationRequest = {
        userId: assignedClientId || user.uid,
        firstName: assignedClientName || generationProfile.firstName || 'there',
        goal: normalizedGoal,
        experience: experienceLevel,
        equipment: equipmentPreference,
        weeklySchedule: schedule,
        injuries: generationProfile.injuries,
        targetMuscleGroups: finalMuscleGroups,
        pastWorkouts: pastWorkouts.length > 0 ? pastWorkouts : undefined,
        assignedClientId,
        assignedClientName,
        coachNotes: coachForm.notes || undefined,
        customFocus: coachForm.focus || undefined,
        sessionLength: coachForm.sessionLength || undefined,
        trainingSplit: coachForm.trainingSplit || undefined,
        areasOfImprovement: coachForm.areasOfImprovement.length > 0 ? coachForm.areasOfImprovement : undefined,
      };

      // Generate workout plan
      const batch = await generateWorkoutPlanWithAI(request);
      
      // Add to store
      addWorkoutBatch(batch);
      setCurrentBatch(batch);
      
      
      // Reset muscle groups for next generation
      setSelectedMuscleGroups([]);
    } catch (error) {
      console.error('❌ Error generating workout plan:', error);
      Alert.alert(
        'Error',
        `Failed to generate workout plan: ${error.message || 'Unknown error'}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWorkoutPress = (workout: GeneratedWorkout) => {
    // Close modal first if open, then open with new workout
    // This ensures a clean state
    if (showDetailModal) {
      setShowDetailModal(false);
      // Wait a moment for the modal to close, then open with new workout
      setTimeout(() => {
        setSelectedWorkout(workout);
        setShowDetailModal(true);
      }, 50);
    } else {
      setSelectedWorkout(workout);
      setShowDetailModal(true);
    }
  };

  const handleAddWorkout = async (workout: GeneratedWorkout) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add workouts.');
      return;
    }
    
    // Show day selection modal
    setShowDaySelection(true);
  };

  const handleDaySelected = async (selectedDay: Date) => {
    if (!selectedWorkout || !user) {
      return;
    }

    try {
      setShowDaySelection(false);
      setShowDetailModal(false);

      // Clear current workout and set up new one
      clearCurrentWorkout();
      setSelectedDate(selectedDay);
      setWorkoutTitle(selectedWorkout.name);

      // Convert AI workout exercises to workout store format
      for (const aiExercise of selectedWorkout.exercises) {
        // Parse reps (could be "8-12", "15", etc.)
        const repsMatch = aiExercise.reps.match(/(\d+)/);
        const defaultReps = repsMatch ? parseInt(repsMatch[1]) : 10;
        
        // Determine exercise type
        const exerciseType = selectedWorkout.workoutType === 'cardio' ? 'cardio' : 'strength';
        
        // Add exercise to workout
        const addedExercise = addExercise({
          name: aiExercise.name,
          type: exerciseType,
          muscleGroup: aiExercise.muscleGroup,
          equipment: aiExercise.equipment ? [aiExercise.equipment] : [],
          notes: aiExercise.notes,
        });

        if (!addedExercise) continue;

        // Get current state to work with
        const { setExerciseSetCount, updateSet } = useWorkoutStore.getState();
        
        // Set the number of sets (this will create/remove sets as needed)
        setExerciseSetCount(addedExercise.id, aiExercise.sets);
        
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Update all sets with reps
        const currentState = useWorkoutStore.getState();
        const exercise = currentState.currentWorkout.exercises?.find(e => e.id === addedExercise.id);
        
        if (exercise && exercise.sets) {
          exercise.sets.forEach((set) => {
            updateSet(addedExercise.id, set.id, 'reps', defaultReps.toString());
            
            // For strength exercises, set a default weight
            if (exerciseType === 'strength') {
              updateSet(addedExercise.id, set.id, 'weight', '0');
            }
          });
        }
      }

      // Save workout to Firebase
      const currentWorkout = useWorkoutStore.getState().currentWorkout;
      if (currentWorkout.exercises && currentWorkout.exercises.length > 0) {
        const workoutToSave = {
          id: `workout_${Date.now()}`,
          title: selectedWorkout.name,
          date: selectedDay.toISOString().split('T')[0],
          exercises: currentWorkout.exercises,
          status: 'saved' as const,
        };
        
        await saveWorkoutToFirebase(workoutToSave);
      }

      // Navigate to workout tab
      router.push('/(tabs)/workout');

      Alert.alert(
        '✅ Workout Saved!',
        `${selectedWorkout.name} has been added to ${selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };

  const handleShareWithClient = async (workout: GeneratedWorkout) => {
    if (!user || !profile?.teamId || !selectedClient) {
      Alert.alert('Select Client', 'Choose a client before sending the workout.');
      return;
    }
    setIsSharingWorkout(true);
    try {
      const success = await workoutSharingService.shareWorkoutWithPlayers(
        workout,
        user.uid,
        profile.firstName || 'Coach',
        profile.teamId,
        teamName || profile.institutionName || 'Team',
        [selectedClient.id],
        [selectedClient.name]
      );
      if (success) {
        Alert.alert('Shared!', `Workout sent to ${selectedClient.name}'s inbox.`);
        setShowDetailModal(false);
      } else {
        Alert.alert('Error', 'Failed to send workout. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error sharing workout:', error);
      Alert.alert('Error', 'Failed to send workout. Please try again.');
    } finally {
      setIsSharingWorkout(false);
    }
  };

  const getExerciseDescription = (exerciseName: string): string => {
    const descriptions: Record<string, string> = {
      // Compound Movements
      'Barbell Squat': 'Stand with feet shoulder-width apart, bar on upper back. Lower hips back and down until thighs are parallel to ground. Drive through heels to return to start.',
      'Bench Press': 'Lie on bench, grip bar slightly wider than shoulders. Lower bar to mid-chest with control. Press back up, extending arms fully.',
      'Deadlift': 'Stand with feet hip-width, bar over mid-foot. Hinge at hips, grip bar. Drive through heels, extending hips and knees simultaneously. Keep back straight throughout.',
      'Overhead Press': 'Stand with bar at shoulder height. Press bar overhead in a straight line. Lock out arms at top. Lower with control.',
      
      // Bodyweight
      'Push-ups': 'Start in plank position, hands shoulder-width. Lower chest to ground, keeping elbows at 45°. Push back up to start.',
      'Bodyweight Squats': 'Stand with feet shoulder-width. Lower hips back and down, keeping chest up. Drive through heels to stand.',
      'Pike Push-ups': 'Start in downward dog position. Bend elbows, lowering head toward ground. Press back up. Targets shoulders.',
      'Bulgarian Split Squats': 'Place rear foot on bench behind you. Lower front knee until back knee nearly touches ground. Drive through front heel to return.',
      
      // Back Exercises
      'Dumbbell Rows': 'Hinge at hips, one hand on bench for support. Pull dumbbell to hip, leading with elbow. Squeeze shoulder blade. Lower with control.',
      'Inverted Rows': 'Hang under bar at waist height, body straight. Pull chest to bar, squeezing shoulder blades. Lower with control.',
      'Pull-ups/Chin-ups': 'Hang from bar with full arm extension. Pull body up until chin clears bar. Lower with control.',
      'Lat Pulldown': 'Grip bar wider than shoulders. Pull bar to upper chest, squeezing lats. Control return to start.',
      
      // Core
      'Plank': 'Rest on forearms and toes, body in straight line. Engage core, squeeze glutes. Hold position without sagging or piking.',
      
      // Cardio
      'Treadmill Run': 'Maintain steady pace at 60-70% max heart rate. Focus on breathing rhythm and consistent stride.',
      'Outdoor Run': 'Run at conversational pace. Focus on posture, landing mid-foot, and rhythmic breathing.',
      'Jump Rope': 'Jump with feet together, turning rope with wrists. Stay on balls of feet. Keep jumps low and controlled.',
      'Stationary Bike': 'Maintain steady cadence at moderate resistance. Keep core engaged and shoulders relaxed.',
      'Cycling': 'Pedal at steady pace, maintaining good posture. Adjust gears to keep consistent effort level.',
      
      // HIIT Exercises
      'Burpees': 'Start standing. Drop to pushup, kick feet back. Do pushup. Jump feet forward. Explode up with arms overhead.',
      'Mountain Climbers': 'Start in plank. Drive knees to chest alternately in rapid succession. Keep hips level and core tight.',
      'Jump Squats': 'Perform squat, then explode upward jumping as high as possible. Land softly and immediately go into next rep.',
      'High Knees': 'Run in place, driving knees up to hip height. Pump arms. Maintain quick tempo.',
      'Plank Jacks': 'Start in plank position. Jump feet out wide, then back together. Keep core tight and hips stable.',
      
      // Flexibility
      'Cat-Cow Stretch': 'On hands and knees, alternate between arching back (cow) and rounding spine (cat). Move slowly with breath.',
      'Hip Flexor Stretch': 'Kneel on one knee, other foot forward. Push hips forward gently. Feel stretch in front of rear hip.',
      'Hamstring Stretch': 'Sit with one leg extended, other bent. Reach toward extended foot, keeping back straight. Hold stretch.',
      'Shoulder Stretch': 'Pull one arm across chest with other hand. Keep shoulders down. Hold and breathe.',
      'Child\'s Pose': 'Sit on heels, extend arms forward on ground. Rest forehead down. Breathe deeply and relax.',
      'Quad Stretch': 'Stand on one leg, grab other foot behind you. Pull heel to glutes. Keep knees together.',
      'Pigeon Pose': 'From hands and knees, bring one knee forward behind wrist. Extend back leg straight behind you. Lower hips toward ground. Deep hip stretch.',
      'Cobra Stretch': 'Lie face down. Place hands under shoulders. Press upper body up, keeping hips on ground. Arch back gently.',
      'Seated Forward Fold': 'Sit with legs extended. Hinge at hips, reach toward toes. Keep back straight. Feel stretch in hamstrings and lower back.',
      'Thread the Needle': 'On hands and knees, thread one arm under body, lowering shoulder to ground. Hold stretch. Repeat other side.',
      
      // New Strength Exercises
      'Leg Press': 'Sit in machine, feet shoulder-width on platform. Push platform away by extending legs. Lower with control. Don\'t lock knees at top.',
      'Front Squat': 'Hold bar at shoulder height in front. Keep elbows high. Squat down keeping torso upright. Drive through heels to stand.',
      'Dumbbell Bench Press': 'Lie on bench with dumbbells. Press dumbbells up until arms extended. Lower with control to chest level.',
      'Incline Bench Press': 'Set bench to 30-45° incline. Lower bar to upper chest. Press up in straight line. Targets upper chest.',
      'Romanian Deadlift': 'Hold bar at hip height. Hinge at hips, lowering bar along legs. Feel stretch in hamstrings. Drive hips forward to return.',
      'Barbell Rows': 'Hinge at hips, bar hanging at arms length. Pull bar to lower chest/upper abs. Squeeze shoulder blades. Lower with control.',
      'Dumbbell Shoulder Press': 'Sit or stand with dumbbells at shoulder height. Press overhead until arms extended. Lower with control.',
      'Arnold Press': 'Start with palms facing you, dumbbells at shoulder height. As you press up, rotate palms forward. Reverse on way down.',
      
      // New Bodyweight Exercises
      'Diamond Push-ups': 'Form diamond shape with hands under chest. Lower body keeping elbows close. Push back up. Emphasizes triceps.',
      'Wide Push-ups': 'Place hands wider than shoulders. Lower chest to ground. Push back up. Emphasizes chest.',
      'Lunges': 'Step forward, lower back knee toward ground. Keep front knee over ankle. Push through front heel to return.',
      'Handstand Push-ups': 'Kick up to handstand against wall. Lower head to ground. Press back up. Advanced shoulder exercise.',
      'Single Leg Deadlift': 'Stand on one leg. Hinge at hip, extending other leg behind. Touch ground with hand. Return to start. Balance and hamstring exercise.',
      'Cable Flyes': 'Set cables at chest height. Bring handles together in front of chest in hugging motion. Control return to start.',
      'Dips': 'On parallel bars or bench. Lower body by bending elbows to 90°. Push back up. Targets chest and triceps.',
      'Leg Curl': 'Lie face down on machine. Curl heels toward glutes. Squeeze hamstrings. Lower with control.',
      'Nordic Curls': 'Kneel with feet anchored. Lower body forward with control, resisting with hamstrings. Advanced hamstring exercise.',
      'Russian Twists': 'Sit with knees bent, lean back slightly. Twist torso side to side, touching ground beside hips. Core rotation exercise.',
      'Bicycle Crunches': 'Lie on back, hands behind head. Bring opposite elbow to knee in cycling motion. Keep lower back pressed to ground.',
      
      // New Cardio Exercises
      'Elliptical': 'Step naturally on elliptical, using handles for full body motion. Maintain steady pace and resistance.',
      'Jogging': 'Light jog at comfortable pace. Focus on breathing and maintaining rhythm. Lower impact than running.',
      'Rowing Machine': 'Push with legs, lean back, pull handles to chest. Extend arms, hinge forward, bend knees. Smooth flowing motion.',
      'Shadow Boxing': 'Throw punches in combination - jabs, crosses, hooks, uppercuts. Stay light on feet. Great cardio workout.',
      'Walking': 'Brisk walk maintaining good posture. Swing arms naturally. Easy recovery cardio.',
      'Light Jog': 'Very easy jog at conversational pace. Good for active recovery and cool down.',
      'Jumping Jacks': 'Jump feet out while raising arms overhead. Jump feet together while lowering arms. Classic cardio move.',
      
      // New HIIT Exercises
      'Box Jumps': 'Stand facing box. Jump onto box, landing softly with both feet. Step down. Explosive leg power.',
      'Tuck Jumps': 'Jump up, bringing knees to chest. Land softly. Explosive and demanding.',
      'Broad Jumps': 'Jump forward as far as possible. Land softly in squat position. Step back to start. Power exercise.',
    };
    
    return descriptions[exerciseName] || 'Perform this exercise with proper form, focusing on the target muscle group. Maintain control throughout the movement.';
  };

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onClose} 
          style={[styles.backButton, { backgroundColor: BrandColors.surface }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.backText, { color: BrandColors.accent }]}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {/* Hero Header Section */}
        <View style={[styles.heroHeader, { backgroundColor: BrandColors.accent + '15' }]}>
          <View style={[styles.heroIconContainer, { backgroundColor: BrandColors.accent + '25' }]}>
            <IconSymbol name="dumbbell.fill" size={40} color={BrandColors.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: BrandColors.text }]}>Custom Workout Ideas</Text>
          <Text style={[styles.heroSubtitle, { color: BrandColors.textSecondary }]}>
            AI-powered workouts tailored to your goals, experience, and performance
          </Text>
          <View style={styles.heroFeatures}>
            <View style={[styles.featureBadge, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="target" size={14} color={BrandColors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.featureBadgeText, { color: BrandColors.accent }]}>Goal-Based</Text>
            </View>
            <View style={[styles.featureBadge, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="chart.bar.fill" size={14} color={BrandColors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.featureBadgeText, { color: BrandColors.accent }]}>Performance Data</Text>
            </View>
            <View style={[styles.featureBadge, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="bolt.fill" size={14} color={BrandColors.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.featureBadgeText, { color: BrandColors.accent }]}>Personalized</Text>
            </View>
          </View>
        </View>

        {isCoachOrTrainer && (
          <View style={[styles.coachPanel, { backgroundColor: BrandColors.surface, borderColor: BrandColors.accent + '30' }]}>
            <View style={styles.coachPanelHeader}>
              <View style={[styles.coachPanelIconContainer, { backgroundColor: BrandColors.accent + '20' }]}>
                <IconSymbol name="person.badge.plus" size={24} color={BrandColors.accent} />
              </View>
              <View style={styles.coachPanelHeaderText}>
                <Text style={[styles.coachPanelTitle, { color: BrandColors.text }]}>
                  Coach / Trainer Controls
                </Text>
                <Text style={[styles.coachPanelSubtitle, { color: BrandColors.textSecondary }]}>
                  Create personalized workouts for your clients
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.clientSelector,
                { borderColor: BrandColors.accent },
                teamMembers.length === 0 && { opacity: 0.5 },
              ]}
              onPress={() => {
                if (teamMembers.length === 0) return;
                setShowClientModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.clientSelectorText, { color: BrandColors.text }]}>
                {teamMembers.length === 0
                  ? 'No clients available'
                  : selectedClient
                  ? `Client: ${selectedClient.name}`
                  : 'Select client'}
              </Text>
              <Text style={[styles.clientSelectorChevron, { color: BrandColors.accent }]}>▾</Text>
            </TouchableOpacity>
            <View style={styles.coachInputGroup}>
              {/* Focus Dropdown */}
              <TouchableOpacity
                style={[
                  styles.focusDropdown,
                  { borderColor: BrandColors.accent },
                ]}
                onPress={() => setShowFocusDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.focusDropdownText, { color: coachForm.focus ? BrandColors.text : BrandColors.textSecondary }]}>
                  {coachForm.focus 
                    ? FOCUS_OPTIONS.find(opt => opt.value === coachForm.focus)?.label || 'Select focus'
                    : 'Select focus'}
                </Text>
                <Text style={[styles.focusDropdownChevron, { color: BrandColors.accent }]}>▾</Text>
              </TouchableOpacity>
              {/* Session Length Dropdown */}
              <TouchableOpacity
                style={[
                  styles.focusDropdown,
                  { borderColor: BrandColors.accent },
                ]}
                onPress={() => setShowSessionLengthDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.focusDropdownText, { color: coachForm.sessionLength ? BrandColors.text : BrandColors.textSecondary }]}>
                  {coachForm.sessionLength 
                    ? SESSION_LENGTH_OPTIONS.find(opt => opt.value === coachForm.sessionLength)?.label || coachForm.sessionLength
                    : 'Session Length (Optional)'}
                </Text>
                <Text style={[styles.focusDropdownChevron, { color: BrandColors.accent }]}>▾</Text>
              </TouchableOpacity>
              
              {/* Intensity Dropdown */}
              <TouchableOpacity
                style={[
                  styles.focusDropdown,
                  { borderColor: BrandColors.accent },
                ]}
                onPress={() => setShowIntensityDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.focusDropdownText, { color: coachForm.intensity ? BrandColors.text : BrandColors.textSecondary }]}>
                  {coachForm.intensity 
                    ? INTENSITY_OPTIONS.find(opt => opt.value === coachForm.intensity)?.label || coachForm.intensity
                    : 'Intensity / Readiness (Optional)'}
                </Text>
                <Text style={[styles.focusDropdownChevron, { color: BrandColors.accent }]}>▾</Text>
              </TouchableOpacity>
              
              {/* Training Split Dropdown */}
              <TouchableOpacity
                style={[
                  styles.focusDropdown,
                  { borderColor: BrandColors.accent },
                ]}
                onPress={() => setShowTrainingSplitDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.focusDropdownText, { color: coachForm.trainingSplit ? BrandColors.text : BrandColors.textSecondary }]}>
                  {coachForm.trainingSplit 
                    ? TRAINING_SPLIT_OPTIONS.find(opt => opt.value === coachForm.trainingSplit)?.label || 'Select training split'
                    : 'Training Split (Optional)'}
                </Text>
                <Text style={[styles.focusDropdownChevron, { color: BrandColors.accent }]}>▾</Text>
              </TouchableOpacity>
              
              {/* Areas of Improvement */}
              <TouchableOpacity
                style={[
                  styles.focusDropdown,
                  { borderColor: BrandColors.accent },
                ]}
                onPress={() => setShowAreasOfImprovementModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.focusDropdownText, { color: coachForm.areasOfImprovement.length > 0 ? BrandColors.text : BrandColors.textSecondary }]}>
                  {coachForm.areasOfImprovement.length > 0 
                    ? `${coachForm.areasOfImprovement.length} area${coachForm.areasOfImprovement.length > 1 ? 's' : ''} selected`
                    : 'Areas of Improvement (Optional)'}
                </Text>
                <Text style={[styles.focusDropdownChevron, { color: BrandColors.accent }]}>▾</Text>
              </TouchableOpacity>
              
              <TextInput
                style={[
                  styles.coachInput,
                  styles.coachInputMultiline,
                  { borderColor: BrandColors.gray700, color: BrandColors.text },
                ]}
                placeholder="Any other instructions?"
                placeholderTextColor={BrandColors.textSecondary}
                multiline
                value={coachForm.notes}
                onChangeText={(text) => updateCoachForm('notes', text)}
              />
            </View>
          </View>
        )}

        {/* History Button */}
        {workoutBatches.length > 0 && (
          <TouchableOpacity
            style={[styles.historyButton, { backgroundColor: BrandColors.surface }]}
            onPress={() => {
              // Toggle between current batch and history view
              if (currentBatch) {
                setCurrentBatch(null);
              } else {
                // Show the most recent batch
                const mostRecent = workoutBatches[0];
                setCurrentBatch(mostRecent);
              }
            }}
          >
            <Text style={[styles.historyButtonText, { color: BrandColors.accent }]}>
              {currentBatch ? '📚 View History' : '🏋️ View Current Batch'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Generate Button */}
        {!isGenerating && (
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: BrandColors.accent }]}
            onPress={async () => {
              // For coaches/trainers: go straight to generation (muscle groups auto-selected from focus)
              if (isCoachOrTrainer) {
                if (!coachForm.focus) {
                  Alert.alert('Select Focus', 'Please select a focus before generating workouts.');
                  return;
                }
                // Auto-select muscle groups based on focus and generate immediately
                const muscleGroups = getMuscleGroupsFromFocus(coachForm.focus);
                setSelectedMuscleGroups(muscleGroups);
                // Call generation directly with the calculated muscle groups
                await generateNewWorkoutPlanWithMuscleGroups(muscleGroups);
              } else {
                // For personal users: show muscle group selection
                setShowMuscleGroupSelection(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.generateButtonText, { color: BrandColors.background }]}>
              {currentBatch ? '🎲 Generate New Workouts' : '🎲 Generate Workouts'}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Focus Dropdown Modal */}
        <Modal
          visible={showFocusDropdown}
          animationType="slide"
          transparent
          onRequestClose={() => setShowFocusDropdown(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.focusModalContent, { backgroundColor: BrandColors.background }]}>
              <Text style={[styles.focusModalTitle, { color: BrandColors.text }]}>Select Focus</Text>
              <ScrollView style={styles.focusList} showsVerticalScrollIndicator={false}>
                {FOCUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.focusListItem,
                      coachForm.focus === option.value && { borderColor: BrandColors.accent },
                    ]}
                    onPress={() => {
                      updateCoachForm('focus', option.value);
                      setShowFocusDropdown(false);
                    }}
                  >
                    <Text style={[styles.focusListText, { color: BrandColors.text }]}>
                      {option.label}
                    </Text>
                    {coachForm.focus === option.value && (
                      <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.closeFocusModalButton, { backgroundColor: BrandColors.accent }]}
                onPress={() => setShowFocusDropdown(false)}
              >
                <Text style={[styles.closeFocusModalText, { color: '#000' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Training Split Dropdown Modal */}
        <Modal
          visible={showTrainingSplitDropdown}
          animationType="slide"
          transparent
          onRequestClose={() => setShowTrainingSplitDropdown(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.focusModalContent, { backgroundColor: BrandColors.background }]}>
              <Text style={[styles.focusModalTitle, { color: BrandColors.text }]}>Select Training Split</Text>
              <ScrollView style={styles.focusList} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.focusListItem,
                    !coachForm.trainingSplit && { borderColor: BrandColors.accent },
                  ]}
                  onPress={() => {
                    updateCoachForm('trainingSplit', '');
                    setShowTrainingSplitDropdown(false);
                  }}
                >
                  <Text style={[styles.focusListText, { color: BrandColors.text }]}>None (Let AI decide)</Text>
                  {!coachForm.trainingSplit && (
                    <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
                {TRAINING_SPLIT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.focusListItem,
                      coachForm.trainingSplit === option.value && { borderColor: BrandColors.accent },
                    ]}
                    onPress={() => {
                      updateCoachForm('trainingSplit', option.value);
                      setShowTrainingSplitDropdown(false);
                    }}
                  >
                    <Text style={[styles.focusListText, { color: BrandColors.text }]}>
                      {option.label}
                    </Text>
                    {coachForm.trainingSplit === option.value && (
                      <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.closeFocusModalButton, { backgroundColor: BrandColors.accent }]}
                onPress={() => setShowTrainingSplitDropdown(false)}
              >
                <Text style={[styles.closeFocusModalText, { color: '#000' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Areas of Improvement Modal */}
        <Modal
          visible={showAreasOfImprovementModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAreasOfImprovementModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.focusModalContent, { backgroundColor: BrandColors.background }]}>
              <Text style={[styles.focusModalTitle, { color: BrandColors.text }]}>Select Areas of Improvement</Text>
              <Text style={[styles.focusModalSubtitle, { color: BrandColors.textSecondary }]}>
                Select areas the client needs to focus on. The AI will prioritize exercises targeting these areas.
              </Text>
              <ScrollView style={styles.focusList} showsVerticalScrollIndicator={false}>
                {AREAS_OF_IMPROVEMENT_OPTIONS.map((area) => {
                  const isSelected = coachForm.areasOfImprovement.includes(area);
                  return (
                    <TouchableOpacity
                      key={area}
                      style={[
                        styles.focusListItem,
                        isSelected && { borderColor: BrandColors.accent },
                      ]}
                      onPress={() => {
                        const current = coachForm.areasOfImprovement;
                        const updated = isSelected
                          ? current.filter(a => a !== area)
                          : [...current, area];
                        updateCoachForm('areasOfImprovement', updated);
                      }}
                    >
                      <Text style={[styles.focusListText, { color: BrandColors.text }]}>
                        {area}
                      </Text>
                      {isSelected && (
                        <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.closeFocusModalButton, { backgroundColor: BrandColors.accent }]}
                onPress={() => setShowAreasOfImprovementModal(false)}
              >
                <Text style={[styles.closeFocusModalText, { color: '#000' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Session Length Dropdown Modal */}
        <Modal
          visible={showSessionLengthDropdown}
          animationType="slide"
          transparent
          onRequestClose={() => setShowSessionLengthDropdown(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.focusModalContent, { backgroundColor: BrandColors.background }]}>
              <Text style={[styles.focusModalTitle, { color: BrandColors.text }]}>Select Session Length</Text>
              <ScrollView style={styles.focusList} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.focusListItem,
                    !coachForm.sessionLength && { borderColor: BrandColors.accent },
                  ]}
                  onPress={() => {
                    updateCoachForm('sessionLength', '');
                    setShowSessionLengthDropdown(false);
                  }}
                >
                  <Text style={[styles.focusListText, { color: BrandColors.text }]}>None (Let AI decide)</Text>
                  {!coachForm.sessionLength && (
                    <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
                {SESSION_LENGTH_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.focusListItem,
                      coachForm.sessionLength === option.value && { borderColor: BrandColors.accent },
                    ]}
                    onPress={() => {
                      updateCoachForm('sessionLength', option.value);
                      setShowSessionLengthDropdown(false);
                    }}
                  >
                    <Text style={[styles.focusListText, { color: BrandColors.text }]}>
                      {option.label}
                    </Text>
                    {coachForm.sessionLength === option.value && (
                      <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.closeFocusModalButton, { backgroundColor: BrandColors.accent }]}
                onPress={() => setShowSessionLengthDropdown(false)}
              >
                <Text style={[styles.closeFocusModalText, { color: '#000' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Intensity Dropdown Modal */}
        <Modal
          visible={showIntensityDropdown}
          animationType="slide"
          transparent
          onRequestClose={() => setShowIntensityDropdown(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.focusModalContent, { backgroundColor: BrandColors.background }]}>
              <Text style={[styles.focusModalTitle, { color: BrandColors.text }]}>Select Intensity / Readiness</Text>
              <ScrollView style={styles.focusList} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.focusListItem,
                    !coachForm.intensity && { borderColor: BrandColors.accent },
                  ]}
                  onPress={() => {
                    updateCoachForm('intensity', '');
                    setShowIntensityDropdown(false);
                  }}
                >
                  <Text style={[styles.focusListText, { color: BrandColors.text }]}>None (Let AI decide)</Text>
                  {!coachForm.intensity && (
                    <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                  )}
                </TouchableOpacity>
                {INTENSITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.focusListItem,
                      coachForm.intensity === option.value && { borderColor: BrandColors.accent },
                    ]}
                    onPress={() => {
                      updateCoachForm('intensity', option.value);
                      setShowIntensityDropdown(false);
                    }}
                  >
                    <Text style={[styles.focusListText, { color: BrandColors.text }]}>
                      {option.label}
                    </Text>
                    {coachForm.intensity === option.value && (
                      <Text style={[styles.focusListCheck, { color: BrandColors.accent }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.closeFocusModalButton, { backgroundColor: BrandColors.accent }]}
                onPress={() => setShowIntensityDropdown(false)}
              >
                <Text style={[styles.closeFocusModalText, { color: '#000' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Muscle Group Selection Modal - Only for personal users */}
        <Modal
          visible={showMuscleGroupSelection}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowMuscleGroupSelection(false);
            setSelectedMuscleGroups([]);
          }}
        >
          <View style={[styles.muscleGroupModalContainer, { backgroundColor: BrandColors.background }]}>
            <View style={styles.muscleGroupHeader}>
              <Text style={[styles.muscleGroupTitle, { color: BrandColors.text }]}>
                Select Muscle Groups to Target
              </Text>
              <Text style={[styles.muscleGroupSubtitle, { color: BrandColors.textSecondary }]}>
                AI will create a personalized workout based on your past performance
              </Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setShowMuscleGroupSelection(false);
                  setSelectedMuscleGroups([]);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeModalText, { color: BrandColors.accent }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.muscleGroupGrid} showsVerticalScrollIndicator={false}>
              {MUSCLE_GROUPS.map((muscleGroup) => {
                const isSelected = selectedMuscleGroups.includes(muscleGroup);
                return (
                  <TouchableOpacity
                    key={muscleGroup}
                    style={[
                      styles.muscleGroupChip,
                      {
                        backgroundColor: isSelected ? BrandColors.accent : BrandColors.surface,
                        borderColor: isSelected ? BrandColors.accent : BrandColors.gray700,
                      },
                    ]}
                    onPress={() => handleMuscleGroupToggle(muscleGroup)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.muscleGroupChipText,
                        { color: isSelected ? BrandColors.background : BrandColors.text },
                      ]}
                    >
                      {muscleGroup}
                      {isSelected && ' ✓'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            <View style={styles.muscleGroupActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: BrandColors.gray800 }]}
                onPress={() => {
                  setShowMuscleGroupSelection(false);
                  setSelectedMuscleGroups([]);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: BrandColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  {
                    backgroundColor: selectedMuscleGroups.length > 0 ? BrandColors.accent : BrandColors.gray700,
                    opacity: selectedMuscleGroups.length > 0 ? 1 : 0.5,
                  },
                ]}
                onPress={handleStartGeneration}
                activeOpacity={0.8}
                disabled={selectedMuscleGroups.length === 0}
              >
                <Text
                  style={[
                    styles.generateButtonText,
                    { color: BrandColors.background },
                  ]}
                >
                  Generate Workout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Loading State */}
        {isGenerating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BrandColors.accent} />
            <Text style={[styles.loadingText, { color: BrandColors.text }]}>
              Generating personalized workouts...
            </Text>
          </View>
        )}

        {/* History View */}
        {!currentBatch && workoutBatches.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={[styles.historyTitle, { color: BrandColors.text }]}>Workout History</Text>
            {workoutBatches.map((batch) => (
              <TouchableOpacity
                key={batch.id}
                style={[styles.historyItem, { backgroundColor: BrandColors.surface }]}
                onPress={() => setCurrentBatch(batch)}
                activeOpacity={0.7}
              >
                <Text style={[styles.historyDate, { color: BrandColors.text }]}>
                  {format(new Date(batch.generatedAt), 'MMM d, yyyy')}
                </Text>
                <Text style={[styles.historyGoal, { color: BrandColors.textSecondary }]}>
                  {batch.goal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {batch.experience}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Current Batch Workouts */}
        {currentBatch && !isGenerating && (
          <View style={styles.workoutsContainer}>
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
              Your Personalized Workouts
            </Text>
            <Text style={[styles.sectionSubtitle, { color: BrandColors.textSecondary }]}>
              Tap any workout to view details and save to your calendar
            </Text>
            
            {/* Strength Workout - Only show if it has exercises */}
            {!currentBatch.workouts.strength.addedToWorkouts && 
             currentBatch.workouts.strength.exercises.length > 0 && (
              <TouchableOpacity
                style={[styles.workoutCard, styles.workoutCardElevated, { backgroundColor: BrandColors.surface }]}
                onPress={() => handleWorkoutPress(currentBatch.workouts.strength)}
                activeOpacity={0.8}
              >
                <View style={[styles.workoutIconContainer, { backgroundColor: BrandColors.accent + '20' }]}>
                  <IconSymbol name="dumbbell.fill" size={24} color={BrandColors.accent} />
                </View>
                <View style={styles.workoutContent}>
                  <View style={styles.workoutHeader}>
                    <Text style={[styles.workoutName, { color: BrandColors.text }]}>
                      {currentBatch.workouts.strength.name}
                    </Text>
                    <View style={[styles.difficultyBadge, { backgroundColor: BrandColors.accent + '15' }]}>
                      <Text style={[styles.difficultyText, { color: BrandColors.accent }]}>
                        {currentBatch.workouts.strength.difficulty}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.workoutDescription, { color: BrandColors.textSecondary }]} numberOfLines={2}>
                    {currentBatch.workouts.strength.description}
                  </Text>
                  <View style={styles.workoutStats}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statText, { color: BrandColors.textSecondary }]}>
                        {currentBatch.workouts.strength.duration}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statText, { color: BrandColors.textSecondary }]}>
                        {currentBatch.workouts.strength.exercises.length} exercises
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.workoutArrow}>
                  <Text style={[styles.arrowText, { color: BrandColors.textSecondary }]}>›</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Cardio Workout - Only show if it has exercises (when explicitly generated) */}
            {!currentBatch.workouts.cardio.addedToWorkouts && 
             currentBatch.workouts.cardio.exercises.length > 0 && (
              <TouchableOpacity
                style={[styles.workoutCard, styles.workoutCardElevated, { backgroundColor: BrandColors.surface }]}
                onPress={() => handleWorkoutPress(currentBatch.workouts.cardio)}
                activeOpacity={0.8}
              >
                <View style={[styles.workoutIconContainer, { backgroundColor: '#3b82f6' + '20' }]}>
                  <IconSymbol name="figure.run" size={24} color="#3b82f6" />
                </View>
                <View style={styles.workoutContent}>
                  <View style={styles.workoutHeader}>
                    <Text style={[styles.workoutName, { color: BrandColors.text }]}>
                      {currentBatch.workouts.cardio.name}
                    </Text>
                    <View style={[styles.difficultyBadge, { backgroundColor: '#3b82f6' + '15' }]}>
                      <Text style={[styles.difficultyText, { color: '#3b82f6' }]}>
                        {currentBatch.workouts.cardio.difficulty}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.workoutDescription, { color: BrandColors.textSecondary }]} numberOfLines={2}>
                    {currentBatch.workouts.cardio.description}
                  </Text>
                  <View style={styles.workoutStats}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statText, { color: BrandColors.textSecondary }]}>
                        {currentBatch.workouts.cardio.duration}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statText, { color: BrandColors.textSecondary }]}>
                        {currentBatch.workouts.cardio.exercises.length} exercises
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.workoutArrow}>
                  <Text style={[styles.arrowText, { color: BrandColors.textSecondary }]}>›</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* HIIT Workout - Only show if it has exercises (when explicitly generated) */}
            {!currentBatch.workouts.hiit.addedToWorkouts && 
             currentBatch.workouts.hiit.exercises.length > 0 && (
              <TouchableOpacity
                style={[styles.workoutCard, styles.workoutCardElevated, { backgroundColor: BrandColors.surface }]}
                onPress={() => handleWorkoutPress(currentBatch.workouts.hiit)}
                activeOpacity={0.8}
              >
                <View style={[styles.workoutIconContainer, { backgroundColor: '#ef4444' + '20' }]}>
                  <IconSymbol name="flame.fill" size={24} color="#ef4444" />
                </View>
                <View style={styles.workoutContent}>
                  <View style={styles.workoutHeader}>
                    <Text style={[styles.workoutName, { color: BrandColors.text }]}>
                      {currentBatch.workouts.hiit.name}
                    </Text>
                    <View style={[styles.difficultyBadge, { backgroundColor: '#ef4444' + '15' }]}>
                      <Text style={[styles.difficultyText, { color: '#ef4444' }]}>
                        {currentBatch.workouts.hiit.difficulty}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.workoutDescription, { color: BrandColors.textSecondary }]} numberOfLines={2}>
                    {currentBatch.workouts.hiit.description}
                  </Text>
                  <View style={styles.workoutStats}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statText, { color: BrandColors.textSecondary }]}>
                        {currentBatch.workouts.hiit.duration}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statText, { color: BrandColors.textSecondary }]}>
                        {currentBatch.workouts.hiit.exercises.length} exercises
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.workoutArrow}>
                  <Text style={[styles.arrowText, { color: BrandColors.textSecondary }]}>›</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Flexibility Workout - Only show if it has exercises (when explicitly generated) */}
            {!currentBatch.workouts.flexibility.addedToWorkouts && 
             currentBatch.workouts.flexibility.exercises.length > 0 && (
              <TouchableOpacity
                style={[styles.workoutCard, styles.workoutCardElevated, { backgroundColor: BrandColors.surface }]}
                onPress={() => handleWorkoutPress(currentBatch.workouts.flexibility)}
                activeOpacity={0.8}
              >
                <View style={[styles.workoutIconContainer, { backgroundColor: '#a855f7' + '20' }]}>
                  <IconSymbol name="dumbbell.fill" size={24} color="#a855f7" />
                </View>
                <View style={styles.workoutContent}>
                  <View style={styles.workoutHeader}>
                    <Text style={[styles.workoutName, { color: BrandColors.text }]}>
                      {currentBatch.workouts.flexibility.name}
                    </Text>
                    <View style={[styles.difficultyBadge, { backgroundColor: '#a855f7' + '15' }]}>
                      <Text style={[styles.difficultyText, { color: '#a855f7' }]}>
                        {currentBatch.workouts.flexibility.difficulty}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.workoutDescription, { color: BrandColors.textSecondary }]} numberOfLines={2}>
                    {currentBatch.workouts.flexibility.description}
                  </Text>
                  <View style={styles.workoutStats}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statText, { color: BrandColors.textSecondary }]}>
                        {currentBatch.workouts.flexibility.duration}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={[styles.statText, { color: BrandColors.textSecondary }]}>
                        {currentBatch.workouts.flexibility.exercises.length} exercises
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.workoutArrow}>
                  <Text style={[styles.arrowText, { color: BrandColors.textSecondary }]}>›</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Show message if strength workout has been added */}
            {currentBatch.workouts.strength.addedToWorkouts && (
              <View style={[styles.allAddedCard, { backgroundColor: BrandColors.gray900 }]}>
                <Text style={[styles.allAddedText, { color: BrandColors.text }]}>
                  Workout has been saved!
                </Text>
                <Text style={[styles.allAddedSubtext, { color: BrandColors.textSecondary }]}>
                  Generate a new workout plan or view your history.
                </Text>
              </View>
            )}
          </View>
        )}

        <Modal
          visible={showClientModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowClientModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.clientModalContent, { backgroundColor: BrandColors.background }]}>
              <Text style={[styles.clientModalTitle, { color: BrandColors.text }]}>Select Client</Text>
              <ScrollView style={styles.clientList} showsVerticalScrollIndicator={false}>
                {teamMembers.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientListItem,
                      selectedClient?.id === client.id && { borderColor: BrandColors.accent },
                    ]}
                    onPress={() => {
                      setSelectedClient(client);
                      setShowClientModal(false);
                    }}
                  >
                    <Text style={[styles.clientListText, { color: BrandColors.text }]}>{client.name}</Text>
                  </TouchableOpacity>
                ))}
                {teamMembers.length === 0 && (
                  <Text style={[styles.emptyClientText, { color: BrandColors.textSecondary }]}>
                    Invite clients to your team to begin sharing workouts.
                  </Text>
                )}
              </ScrollView>
              <TouchableOpacity
                style={[styles.closeClientModalButton, { backgroundColor: BrandColors.accent }]}
                onPress={() => setShowClientModal(false)}
              >
                <Text style={[styles.closeClientModalText, { color: '#000' }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Workout Detail Modal */}
        {selectedWorkout && showDetailModal && (
          <View style={[styles.detailModal, { backgroundColor: BrandColors.surface }]}>
            <ScrollView
              key={`workout-detail-${selectedWorkout.id}`}
              ref={(ref) => {
                detailModalScrollRef.current = ref;
                // Immediately scroll to top when ref is set
                if (ref) {
                  // Use multiple attempts to ensure scroll happens
                  const scrollToTop = () => {
                    if (ref) {
                      ref.scrollTo({ y: 0, animated: false });
                    }
                  };
                  // Immediate
                  scrollToTop();
                  // After frame
                  requestAnimationFrame(scrollToTop);
                  // With delays
                  setTimeout(scrollToTop, 0);
                  setTimeout(scrollToTop, 10);
                  setTimeout(scrollToTop, 50);
                  setTimeout(scrollToTop, 100);
                  setTimeout(scrollToTop, 200);
                }
              }}
              style={styles.detailModalScroll}
              contentContainerStyle={styles.detailModalContent}
              showsVerticalScrollIndicator={true}
              scrollEventThrottle={16}
              automaticallyAdjustContentInsets={false}
              contentInsetAdjustmentBehavior="never"
              nestedScrollEnabled={true}
              onLayout={() => {
                // Only scroll to top on initial layout, not on every layout change
                if (!hasScrolledToTopRef.current) {
                  const scrollToTop = () => {
                    if (detailModalScrollRef.current && !hasScrolledToTopRef.current) {
                      detailModalScrollRef.current.scrollTo({ y: 0, animated: false });
                      hasScrolledToTopRef.current = true;
                    }
                  };
                  // Immediate
                  scrollToTop();
                  // After a frame
                  requestAnimationFrame(scrollToTop);
                  // With delays
                  setTimeout(scrollToTop, 10);
                  setTimeout(scrollToTop, 50);
                  setTimeout(scrollToTop, 100);
                }
              }}
            >
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleContainer}>
                  <Text style={[styles.detailTitle, { color: BrandColors.text }]}>
                    {selectedWorkout.name}
                  </Text>
                  <View style={[styles.detailDifficultyBadge, { backgroundColor: BrandColors.accent + '15' }]}>
                    <Text style={[styles.detailDifficultyText, { color: BrandColors.accent }]}>
                      {selectedWorkout.difficulty}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeButtonContainer}>
                  <Text style={[styles.closeButton, { color: BrandColors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.detailDescription, { color: BrandColors.textSecondary }]}>
                {selectedWorkout.description}
              </Text>

              <View style={[styles.detailMetaContainer, { backgroundColor: BrandColors.background }]}>
                <View style={styles.detailMetaItem}>
                  <View>
                    <Text style={[styles.detailMetaLabel, { color: BrandColors.textSecondary }]}>Duration</Text>
                    <Text style={[styles.detailMetaValue, { color: BrandColors.text }]}>{selectedWorkout.duration}</Text>
                  </View>
                </View>
                <View style={styles.detailMetaDivider} />
                <View style={styles.detailMetaItem}>
                  <View>
                    <Text style={[styles.detailMetaLabel, { color: BrandColors.textSecondary }]}>Exercises</Text>
                    <Text style={[styles.detailMetaValue, { color: BrandColors.text }]}>{selectedWorkout.exercises.length}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.exercisesSectionHeader}>
                <Text style={[styles.exercisesTitle, { color: BrandColors.text }]}>Workout Exercises</Text>
                <Text style={[styles.exercisesSubtitle, { color: BrandColors.textSecondary }]}>
                  Tap any exercise for detailed instructions
                </Text>
              </View>
              
              <View style={styles.exercisesList}>
                {selectedWorkout.exercises.map((exercise, index) => (
                  <TouchableOpacity
                    key={exercise.id}
                    style={[styles.exerciseItem, styles.exerciseItemElevated, { 
                      backgroundColor: BrandColors.background,
                      borderColor: BrandColors.gray800 
                    }]}
                    onPress={() => {
                      setSelectedExercise(exercise);
                      setShowExerciseModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.exerciseNumberBadge, { backgroundColor: BrandColors.accent + '20' }]}>
                      <Text style={[styles.exerciseNumber, { color: BrandColors.accent }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.exerciseDetails}>
                      <Text style={[styles.exerciseName, { color: BrandColors.text }]}>
                        {exercise.name}
                      </Text>
                      {exercise.muscleGroup && (
                        <View style={[styles.muscleGroupTag, { backgroundColor: BrandColors.gray800 }]}>
                          <Text style={[styles.muscleGroupTagText, { color: BrandColors.textSecondary }]}>
                            {exercise.muscleGroup}
                          </Text>
                        </View>
                      )}
                      <View style={styles.exerciseSpecs}>
                        <View style={[styles.specBadge, { backgroundColor: BrandColors.accent + '10' }]}>
                          <Text style={[styles.specText, { color: BrandColors.accent }]}>
                            {exercise.sets} sets
                          </Text>
                        </View>
                        <View style={[styles.specBadge, { backgroundColor: BrandColors.accent + '10' }]}>
                          <Text style={[styles.specText, { color: BrandColors.accent }]}>
                            {exercise.reps}
                          </Text>
                        </View>
                        <View style={[styles.specBadge, { backgroundColor: BrandColors.accent + '10' }]}>
                          <Text style={[styles.specText, { color: BrandColors.accent }]}>
                            Rest {exercise.rest}
                          </Text>
                        </View>
                      </View>
                      {exercise.notes && (
                        <View style={[styles.exerciseNotesContainer, { backgroundColor: BrandColors.accent + '08' }]}>
                          <Text style={[styles.exerciseNotes, { color: BrandColors.textSecondary }]}>
                            {exercise.notes}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.exerciseArrow}>
                      <Text style={[styles.arrowText, { color: BrandColors.textSecondary }]}>›</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: BrandColors.accent }]}
                onPress={() => handleAddWorkout(selectedWorkout)}
                activeOpacity={0.8}
              >
                <Text style={[styles.saveButtonText, { color: BrandColors.background }]}>
                  Save as Template
                </Text>
              </TouchableOpacity>

              {/* Show Share with Team button only if user is coach or trainer */}
              {isCoachOrTrainer && (
                <TouchableOpacity
                  style={[
                    styles.shareButton,
                    { backgroundColor: '#f59e0b' },
                    (!selectedClient || isSharingWorkout) && { opacity: 0.6 },
                  ]}
                  onPress={() => handleShareWithClient(selectedWorkout)}
                  activeOpacity={0.8}
                  disabled={!selectedClient || isSharingWorkout}
                >
                  <Text style={[styles.shareButtonText, { color: '#000' }]}>
                    {isSharingWorkout
                      ? 'Sending...'
                      : selectedClient
                      ? `Send to ${selectedClient.name}`
                      : 'Select client'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Day Selection Modal */}
        <Modal
          visible={showDaySelection}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDaySelection(false)}
        >
          <View style={styles.daySelectionOverlay}>
            <View style={[styles.daySelectionContent, { backgroundColor: BrandColors.surface }]}>
              <View style={styles.daySelectionHeader}>
                <Text style={[styles.daySelectionTitle, { color: BrandColors.text }]}>
                  Select Day for Workout
                </Text>
                <TouchableOpacity onPress={() => setShowDaySelection(false)}>
                  <Text style={[styles.closeButton, { color: BrandColors.accent }]}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.daySelectionSubtitle, { color: BrandColors.textSecondary }]}>
                Choose which day to add "{selectedWorkout?.name}"
              </Text>

              <ScrollView style={styles.daySelectionList} showsVerticalScrollIndicator={false}>
                {(() => {
                  const days = [];
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Show next 14 days
                  for (let i = 0; i < 14; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() + i);
                    days.push(date);
                  }
                  
                  return days.map((day, index) => {
                    const isToday = index === 0;
                    const isTomorrow = index === 1;
                    const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                    
                    return (
                      <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                          styles.dayOption,
                          { 
                            backgroundColor: BrandColors.background,
                            borderColor: BrandColors.gray800,
                          }
                        ]}
                        onPress={() => handleDaySelected(day)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dayOptionText, { color: BrandColors.text }]}>
                          {dayLabel}
                        </Text>
                        <Text style={[styles.dayOptionDate, { color: BrandColors.textSecondary }]}>
                          {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Exercise Detail Modal */}
        {selectedExercise && (
          <Modal
            visible={showExerciseModal}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setShowExerciseModal(false)}
          >
            <View style={styles.exerciseModalOverlay}>
              <View style={[styles.exerciseModalContent, { backgroundColor: BrandColors.surface }]}>
                <View style={styles.exerciseModalHeader}>
                  <Text style={[styles.exerciseModalTitle, { color: BrandColors.text }]}>
                    {selectedExercise.name}
                  </Text>
                  <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
                    <Text style={[styles.closeButton, { color: BrandColors.accent }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.exerciseModalBadge, { backgroundColor: BrandColors.accent + '20' }]}>
                  <Text style={[styles.exerciseModalMuscle, { color: BrandColors.accent }]}>
                    {selectedExercise.muscleGroup}
                  </Text>
                </View>

                <View style={styles.exerciseModalStats}>
                  <View style={styles.exerciseModalStat}>
                    <Text style={[styles.exerciseModalStatLabel, { color: BrandColors.textSecondary }]}>Sets</Text>
                    <Text style={[styles.exerciseModalStatValue, { color: BrandColors.text }]}>{selectedExercise.sets}</Text>
                  </View>
                  <View style={styles.exerciseModalStat}>
                    <Text style={[styles.exerciseModalStatLabel, { color: BrandColors.textSecondary }]}>Reps</Text>
                    <Text style={[styles.exerciseModalStatValue, { color: BrandColors.text }]}>{selectedExercise.reps}</Text>
                  </View>
                  <View style={styles.exerciseModalStat}>
                    <Text style={[styles.exerciseModalStatLabel, { color: BrandColors.textSecondary }]}>Rest</Text>
                    <Text style={[styles.exerciseModalStatValue, { color: BrandColors.text }]}>{selectedExercise.rest}</Text>
                  </View>
                </View>

                <Text style={[styles.exerciseModalInstructionTitle, { color: BrandColors.text }]}>
                  How to Perform:
                </Text>
                <Text style={[styles.exerciseModalDescription, { color: BrandColors.textSecondary }]}>
                  {getExerciseDescription(selectedExercise.name)}
                </Text>

                {selectedExercise.notes && (
                  <View style={[styles.exerciseModalTip, { backgroundColor: BrandColors.accent + '10', borderColor: BrandColors.accent }]}>
                    <Text style={[styles.exerciseModalTipTitle, { color: BrandColors.accent }]}>Tip</Text>
                    <Text style={[styles.exerciseModalTipText, { color: BrandColors.text }]}>
                      {selectedExercise.notes}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.exerciseModalButton, { backgroundColor: BrandColors.accent }]}
                  onPress={() => setShowExerciseModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.exerciseModalButtonText, { color: BrandColors.background }]}>
                    Got it!
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  heroHeader: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.accent + '30',
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  heroFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  featureBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 4,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  historyButton: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'center',
    borderWidth: 1.5,
    minWidth: 200,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  generateButton: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: BrandColors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  generateButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  historyItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BrandColors.gray800,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyGoal: {
    fontSize: 12,
    fontWeight: '500',
  },
  workoutsContainer: {
    gap: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  workoutCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  workoutCardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  workoutIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workoutIcon: {
    fontSize: 28,
  },
  workoutContent: {
    flex: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  workoutDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  workoutStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: BrandColors.gray800,
    marginHorizontal: 12,
  },
  workoutArrow: {
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: '300',
  },
  allAddedCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  allAddedText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  allAddedSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  detailModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  detailModalScroll: {
    flex: 1,
    height: '100%',
  },
  detailModalContent: {
    padding: 16,
    paddingBottom: 60,
    paddingTop: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  detailDifficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailDifficultyText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  closeButtonContainer: {
    padding: 4,
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '300',
  },
  detailDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  detailMetaContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailMetaIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  detailMetaLabel: {
    fontSize: 11,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailMetaValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  detailMetaDivider: {
    width: 1,
    height: 40,
    backgroundColor: BrandColors.gray800,
    marginHorizontal: 16,
  },
  exercisesSectionHeader: {
    marginBottom: 12,
  },
  exercisesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exercisesSubtitle: {
    fontSize: 13,
  },
  exercisesList: {
    marginBottom: 12,
  },
  exerciseItem: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  exerciseItemElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  muscleGroupTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  muscleGroupTagText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseSpecs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  specBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  specText: {
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseNotesContainer: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  exerciseNotesIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 2,
  },
  exerciseNotes: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  exerciseArrow: {
    marginLeft: 8,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareButton: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Exercise Detail Modal Styles
  exerciseModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exerciseModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  exerciseModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  exerciseModalBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  exerciseModalMuscle: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseModalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BrandColors.gray800,
  },
  exerciseModalStat: {
    alignItems: 'center',
  },
  exerciseModalStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  exerciseModalStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseModalInstructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exerciseModalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  exerciseModalTip: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  exerciseModalTipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  exerciseModalTipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  exerciseModalButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  exerciseModalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  daySelectionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  daySelectionContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  daySelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  daySelectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  daySelectionSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  daySelectionList: {
    maxHeight: 400,
  },
  dayOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayOptionDate: {
    fontSize: 14,
  },
  muscleGroupModalContainer: {
    flex: 1,
    paddingTop: 60,
    padding: 20,
  },
  muscleGroupHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  muscleGroupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  muscleGroupSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  closeModalButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
  },
  closeModalText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  muscleGroupGrid: {
    flex: 1,
    marginBottom: 20,
  },
  muscleGroupChip: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  muscleGroupChipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  muscleGroupActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray800,
  },
  coachPanel: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 24,
    shadowColor: BrandColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  coachPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coachPanelIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coachPanelHeaderText: {
    flex: 1,
  },
  coachPanelTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  coachPanelSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  clientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: BrandColors.background,
  },
  clientSelectorText: {
    fontSize: 15,
    fontWeight: '600',
  },
  clientSelectorChevron: {
    fontSize: 18,
    fontWeight: '700',
  },
  coachInputGroup: {
    gap: 10,
  },
  coachInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: BrandColors.background,
  },
  coachInputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  clientModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  clientModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  clientList: {
    marginBottom: 16,
  },
  clientListItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.gray800,
    marginBottom: 10,
  },
  clientListText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyClientText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  closeClientModalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeClientModalText: {
    fontSize: 16,
    fontWeight: '700',
  },
  focusDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: BrandColors.background,
  },
  focusDropdownText: {
    fontSize: 15,
    fontWeight: '600',
  },
  focusDropdownChevron: {
    fontSize: 18,
    fontWeight: '700',
  },
  focusModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  focusModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  focusModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  focusList: {
    marginBottom: 16,
  },
  focusListItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.gray800,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusListText: {
    fontSize: 16,
    fontWeight: '600',
  },
  focusListCheck: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeFocusModalButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeFocusModalText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

