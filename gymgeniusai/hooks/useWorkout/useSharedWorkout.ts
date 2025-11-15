import { useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useWorkoutStore } from '@/stores/workoutStore';

export const useSharedWorkout = () => {
  const { clearCurrentWorkout, setWorkoutTitle, addExercise, addSet, updateSet, setSelectedDate } = useWorkoutStore();
  const sharedWorkoutLoadedRef = useRef(false);

  const loadSharedWorkout = useCallback(async () => {
    // Add a small delay to ensure global data is set after navigation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (!global.sharedWorkoutData || !global.sharedWorkoutName) {
      console.log('⚠️ No shared workout data available yet');
      return false;
    }
    
    // Check if we've already loaded this workout to prevent duplicate alerts
    if (sharedWorkoutLoadedRef.current) {
      console.log('⚠️ Workout already loaded, skipping duplicate load');
      return false;
    }

    console.log('🎯 Loading shared workout:', global.sharedWorkoutName);
    console.log('🎯 Shared workout data:', global.sharedWorkoutData);
    console.log('🎯 Shared workout data type:', typeof global.sharedWorkoutData);
    console.log('🎯 Shared workout data structure:', JSON.stringify(global.sharedWorkoutData, null, 2));
    
    try {
      // Clear current workout first
      clearCurrentWorkout();
      
      // Check if workout has an assigned date and set selected date to it
      const workoutData = global.sharedWorkoutData;
      let workoutDateToUse: Date | null = null;
      
      if (workoutData?.assignedDate) {
        const assignedDate = new Date(workoutData.assignedDate);
        if (!isNaN(assignedDate.getTime())) {
          workoutDateToUse = assignedDate;
          console.log('📅 Using assigned date:', assignedDate);
        }
      } else if (workoutData?.date) {
        // Fallback to workout date if assignedDate not available
        const workoutDate = new Date(workoutData.date);
        if (!isNaN(workoutDate.getTime())) {
          workoutDateToUse = workoutDate;
          console.log('📅 Using workout date:', workoutDate);
        }
      }
      
      // Set selected date to the determined date (this ensures the workout appears on the correct date in calendar)
      if (workoutDateToUse) {
        setSelectedDate(workoutDateToUse);
        console.log('📅 Setting selected date to:', workoutDateToUse.toISOString().split('T')[0]);
        
        // Also ensure currentWorkout.date is set to the assigned date
        const currentState = useWorkoutStore.getState();
        useWorkoutStore.setState({
          currentWorkout: {
            ...currentState.currentWorkout,
            date: workoutDateToUse.toISOString().split('T')[0],
          }
        });
        console.log('📅 Set currentWorkout.date to:', workoutDateToUse.toISOString().split('T')[0]);
      }
      
      // Set the workout title
      setWorkoutTitle(global.sharedWorkoutName);
      
      // Handle different data structures
      let exercises;
      if (Array.isArray(workoutData)) {
        // If workoutData is directly an array
        exercises = workoutData;
      } else if (workoutData.exercises && Array.isArray(workoutData.exercises)) {
        // If workoutData has an exercises property
        exercises = workoutData.exercises;
      } else if (workoutData && typeof workoutData === 'object') {
        // Try to extract exercises from any nested structure
        exercises = workoutData.exercises || workoutData.workout?.exercises || Object.values(workoutData).find((val: any) => Array.isArray(val));
      } else {
        exercises = [];
      }
      
      if (!Array.isArray(exercises)) {
        console.error('❌ Exercises data is not an array:', exercises);
        return false;
      }

      console.log('🎯 Found', exercises.length, 'exercises to load');
      
      // Load exercises one by one with proper sequencing
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i];
        const exerciseName = exercise.name || exercise.exerciseName || 'Unknown Exercise';
        
        console.log(`🎯 Loading exercise ${i + 1}/${exercises.length}:`, exerciseName);
        
        // Add the exercise
        addExercise(exerciseName);
        
        // Wait a bit for the state to update, then add sets
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Get the current workout state after adding the exercise
        const currentState = useWorkoutStore.getState();
        const currentExercises = currentState.currentWorkout.exercises || [];
        
        // Find the exercise we just added (the last one with matching name)
        const addedExercise = currentExercises
          .slice()
          .reverse()
          .find((ex: any) => ex.name === exerciseName);
        
        if (addedExercise && addedExercise.id) {
          console.log(`✅ Found added exercise with ID:`, addedExercise.id);
          
          // Get the sets from the shared workout
          const sets = exercise.sets || [];
          console.log(`🎯 Exercise has ${sets.length} sets to load`);
          console.log(`🎯 Sets data:`, JSON.stringify(sets, null, 2));
          
          // Add additional sets if needed (first set is already added by addExercise)
          // If we have sets in the data, we need to add (sets.length - 1) more sets
          // because addExercise already creates one set
          const setsToAdd = Math.max(0, sets.length - 1);
          console.log(`🎯 Adding ${setsToAdd} additional sets`);
          
          for (let setIndex = 0; setIndex < setsToAdd; setIndex++) {
            addSet(addedExercise.id);
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          // Wait a bit more for all sets to be added
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Get updated state with all sets
          const updatedState = useWorkoutStore.getState();
          const updatedExercises = updatedState.currentWorkout.exercises || [];
          const updatedExercise = updatedExercises.find((ex: any) => ex.id === addedExercise.id);
          
          if (updatedExercise && updatedExercise.sets) {
            console.log(`✅ Found ${updatedExercise.sets.length} sets in workout store`);
            console.log(`✅ Updating sets with workout data (${sets.length} sets from shared data)`);
            
            // Update each set with the coach's data (weight, reps, etc.)
            sets.forEach((setData: any, setIndex: number) => {
              if (updatedExercise.sets[setIndex]) {
                const targetSet = updatedExercise.sets[setIndex];
                
                console.log(`🎯 Updating set ${setIndex + 1}:`, {
                  setData: setData,
                  targetSetId: targetSet.id,
                  weight: setData.weight,
                  reps: setData.reps
                });
                
                // Update weight if provided (check for 0 as valid value)
                if (setData.weight !== null && setData.weight !== undefined) {
                  updateSet(addedExercise.id, targetSet.id, 'weight', setData.weight);
                  console.log(`✅ Set weight to ${setData.weight}`);
                }
                
                // Update reps if provided (check for 0 as valid value)
                if (setData.reps !== null && setData.reps !== undefined) {
                  updateSet(addedExercise.id, targetSet.id, 'reps', setData.reps);
                  console.log(`✅ Set reps to ${setData.reps}`);
                }
                
                // Update notes if provided
                if (setData.notes) {
                  // Note: There's no updateSetNotes function, but we can store it in the notes field if needed
                }
              } else {
                console.warn(`⚠️ Set ${setIndex + 1} not found in workout store`);
              }
            });
          } else {
            console.error(`❌ Could not find exercise or sets in workout store after adding`);
          }
        } else {
          console.warn(`⚠️ Could not find added exercise:`, exerciseName);
        }
      }
      
      // Store the workout name and ID for later use when finishing workout
      const workoutName = global.sharedWorkoutName || '';
      const workoutId = global.sharedWorkoutId || '';
      
      // Clear the global data after loading (but keep the ID in state)
      global.sharedWorkoutData = null;
      global.sharedWorkoutName = null as any;
      // DON'T clear sharedWorkoutId here - we need it when finishing the workout
      
      console.log('✅ Workout loaded successfully:', workoutName);
      
      // Mark as loaded to prevent duplicate alerts
      sharedWorkoutLoadedRef.current = true;
      
      // Show success alert (only once)
      Alert.alert(
        'Workout Loaded! 🏋️',
        `Your assigned workout "${workoutName}" has been loaded. Fill in your weights and reps!`,
        [{ text: 'OK' }]
      );
      
      return true;
    } catch (error) {
      console.error('❌ Error loading shared workout:', error);
      Alert.alert(
        'Error',
        'Failed to load the assigned workout. Please try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }, [clearCurrentWorkout, setWorkoutTitle, addExercise, addSet, updateSet, setSelectedDate]);

  // Check for shared workout when component mounts
  useEffect(() => {
    // Small delay to ensure global data is available after navigation
    const timer = setTimeout(() => {
      if (!sharedWorkoutLoadedRef.current) {
        loadSharedWorkout();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []); // Run once when component mounts
  
  // Check for shared workout when screen comes into focus (for navigation from community tab)
  useFocusEffect(
    useCallback(() => {
      // Small delay to ensure global data is available after navigation
      const timer = setTimeout(() => {
        if (!sharedWorkoutLoadedRef.current) {
          loadSharedWorkout();
        }
      }, 200);
      
      // Reset the flag when screen loses focus (user navigates away)
      // This allows loading a new workout next time they navigate here
      return () => {
        clearTimeout(timer);
        sharedWorkoutLoadedRef.current = false;
      };
    }, [loadSharedWorkout])
  );

  return {
    sharedWorkoutLoadedRef,
  };
};

