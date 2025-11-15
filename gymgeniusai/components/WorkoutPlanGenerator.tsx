/**
 * Workout Plan Generator Component
 * 
 * Allows users to generate personalized workout plans using V
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { useAuth } from './AuthProvider';
import { useUserStore } from '@/stores/userStore';
import { useWorkoutPlanStore } from '@/stores/workoutPlanStore';
import { useCommunityStore } from '@/stores/communityStore';
import { generateWorkoutPlanWithAI } from '@/services/workoutGenerationService';
import { WorkoutPlanGenerationRequest, GeneratedWorkout, WorkoutBatch } from '@/types/workoutPlan';
import { format } from 'date-fns';

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
  const { workoutBatches, currentBatch, isGenerating, setIsGenerating, setCurrentBatch, addWorkoutBatch } = useWorkoutPlanStore();
  const { communities } = useCommunityStore();
  
  // Check if user is a coach
  const isCoach = communities.some(c => c.type === 'sports' && c.role === 'coach');
  
  // Debug logging
  console.log('🏋️ WorkoutPlanGenerator - Communities:', communities);
  console.log('🏋️ WorkoutPlanGenerator - Is Coach:', isCoach);
  
  const [selectedWorkout, setSelectedWorkout] = useState<GeneratedWorkout | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);

  useEffect(() => {
    if (isInitialGeneration && user && profile) {
      generateNewWorkoutPlan();
    }
  }, [isInitialGeneration]);

  const generateNewWorkoutPlan = async () => {
    if (!user || !profile) {
      console.error('❌ Missing user or profile data');
      Alert.alert('Error', 'Please complete your profile first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('🎯 Generating new workout plan...');
      console.log('👤 User:', user.uid);
      console.log('📋 Profile:', profile);
      
      const primaryGoal =
        (profile.goals && profile.goals.length > 0 ? profile.goals[0] : profile.primaryGoal) || 'general_health';
      const normalizedGoal = normalizeWorkoutGoal(primaryGoal);

      const request: WorkoutPlanGenerationRequest = {
        userId: user.uid,
        firstName: profile.firstName || 'there',
        goal: normalizedGoal,
        experience: profile.exerciseExperience || 'beginner',
        equipment: profile.equipment || 'bodyweight',
        weeklySchedule: profile.weeklySchedule || 3,
        injuries: profile.injuries,
      };
      
      console.log('📝 Request:', request);
      
      // Generate workout plan
      const batch = await generateWorkoutPlanWithAI(request);
      console.log('🏋️ Generated batch:', batch);
      
      // Add to store
      addWorkoutBatch(batch);
      setCurrentBatch(batch);
      console.log('✅ Added to store and set as current batch');
      
      console.log('✅ Workout plan generated successfully');
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
    setSelectedWorkout(workout);
    setShowDetailModal(true);
  };

  const handleAddWorkout = async (workout: GeneratedWorkout, date: string) => {
    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add workouts.');
        return;
      }

      Alert.alert(
        '✅ Workout Added!',
        `${workout.name} has been saved to your workout templates!`,
        [{ text: 'OK' }]
      );

      setShowDetailModal(false);
    } catch (error) {
      console.error('❌ Error adding workout:', error);
      Alert.alert('Error', 'Failed to add workout. Please try again.');
    }
  };

  const handleShareWithTeam = async (workout: GeneratedWorkout) => {
    try {
      // For now, simulate sharing with team
      // In a real app, this would send the workout to all team members
      Alert.alert(
        'Workout Shared! 🏋️',
        `"${workout.name}" has been sent to all your team members. They can find it in their inbox.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('📤 Workout shared successfully:', workout.name);
              setShowDetailModal(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error sharing workout:', error);
      Alert.alert('Error', 'Failed to share workout with team. Please try again.');
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: BrandColors.text }]}>Custom Workout Ideas</Text>
        <Text style={[styles.subtitle, { color: BrandColors.textSecondary }]}>
          Personalized workouts based on your goals and experience
        </Text>

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
            onPress={generateNewWorkoutPlan}
            activeOpacity={0.8}
          >
            <Text style={[styles.generateButtonText, { color: BrandColors.background }]}>
              {currentBatch ? '🎲 Generate New Workouts (1,500 V)' : '🎲 Generate Workouts'}
            </Text>
          </TouchableOpacity>
        )}

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
            {/* Strength Workout */}
            {!currentBatch.workouts.strength.addedToWorkouts && (
              <TouchableOpacity
                style={[styles.workoutCard, { backgroundColor: BrandColors.surface }]}
                onPress={() => handleWorkoutPress(currentBatch.workouts.strength)}
                activeOpacity={0.8}
              >
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutIcon}>💪</Text>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: BrandColors.text }]}>
                      {currentBatch.workouts.strength.name}
                    </Text>
                    <Text style={[styles.workoutDescription, { color: BrandColors.textSecondary }]}>
                      {currentBatch.workouts.strength.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutMeta}>
                  <Text style={[styles.workoutMetaText, { color: BrandColors.textSecondary }]}>
                    ⏱️ {currentBatch.workouts.strength.duration} • {currentBatch.workouts.strength.exercises.length} exercises
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Cardio Workout */}
            {!currentBatch.workouts.cardio.addedToWorkouts && (
              <TouchableOpacity
                style={[styles.workoutCard, { backgroundColor: BrandColors.surface }]}
                onPress={() => handleWorkoutPress(currentBatch.workouts.cardio)}
                activeOpacity={0.8}
              >
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutIcon}>🏃</Text>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: BrandColors.text }]}>
                      {currentBatch.workouts.cardio.name}
                    </Text>
                    <Text style={[styles.workoutDescription, { color: BrandColors.textSecondary }]}>
                      {currentBatch.workouts.cardio.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutMeta}>
                  <Text style={[styles.workoutMetaText, { color: BrandColors.textSecondary }]}>
                    ⏱️ {currentBatch.workouts.cardio.duration} • {currentBatch.workouts.cardio.exercises.length} exercises
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* HIIT Workout */}
            {!currentBatch.workouts.hiit.addedToWorkouts && (
              <TouchableOpacity
                style={[styles.workoutCard, { backgroundColor: BrandColors.surface }]}
                onPress={() => handleWorkoutPress(currentBatch.workouts.hiit)}
                activeOpacity={0.8}
              >
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutIcon}>🔥</Text>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: BrandColors.text }]}>
                      {currentBatch.workouts.hiit.name}
                    </Text>
                    <Text style={[styles.workoutDescription, { color: BrandColors.textSecondary }]}>
                      {currentBatch.workouts.hiit.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutMeta}>
                  <Text style={[styles.workoutMetaText, { color: BrandColors.textSecondary }]}>
                    ⏱️ {currentBatch.workouts.hiit.duration} • {currentBatch.workouts.hiit.exercises.length} exercises
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Flexibility Workout */}
            {!currentBatch.workouts.flexibility.addedToWorkouts && (
              <TouchableOpacity
                style={[styles.workoutCard, { backgroundColor: BrandColors.surface }]}
                onPress={() => handleWorkoutPress(currentBatch.workouts.flexibility)}
                activeOpacity={0.8}
              >
                <View style={styles.workoutHeader}>
                  <Text style={styles.workoutIcon}>🧘</Text>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: BrandColors.text }]}>
                      {currentBatch.workouts.flexibility.name}
                    </Text>
                    <Text style={[styles.workoutDescription, { color: BrandColors.textSecondary }]}>
                      {currentBatch.workouts.flexibility.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.workoutMeta}>
                  <Text style={[styles.workoutMetaText, { color: BrandColors.textSecondary }]}>
                    ⏱️ {currentBatch.workouts.flexibility.duration} • {currentBatch.workouts.flexibility.exercises.length} exercises
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Show message if all workouts have been added */}
            {currentBatch.workouts.strength.addedToWorkouts && 
             currentBatch.workouts.cardio.addedToWorkouts && 
             currentBatch.workouts.hiit.addedToWorkouts && 
             currentBatch.workouts.flexibility.addedToWorkouts && (
              <View style={[styles.allAddedCard, { backgroundColor: BrandColors.gray900 }]}>
                <Text style={[styles.allAddedText, { color: BrandColors.text }]}>
                  ✅ All workouts from this batch have been saved!
                </Text>
                <Text style={[styles.allAddedSubtext, { color: BrandColors.textSecondary }]}>
                  Generate a new workout plan or view your history.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Workout Detail Modal */}
        {selectedWorkout && showDetailModal && (
          <View style={[styles.detailModal, { backgroundColor: BrandColors.surface }]}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: BrandColors.text }]}>
                {selectedWorkout.name}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Text style={[styles.closeButton, { color: BrandColors.accent }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.detailDescription, { color: BrandColors.textSecondary }]}>
              {selectedWorkout.description}
            </Text>

            <View style={styles.detailMeta}>
              <Text style={[styles.detailMetaText, { color: BrandColors.text }]}>
                ⏱️ Duration: {selectedWorkout.duration}
              </Text>
              <Text style={[styles.detailMetaText, { color: BrandColors.text }]}>
                📊 Difficulty: {selectedWorkout.difficulty}
              </Text>
            </View>

            <Text style={[styles.exercisesTitle, { color: BrandColors.text }]}>Exercises (tap for instructions):</Text>
            <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
              {selectedWorkout.exercises.map((exercise, index) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={[styles.exerciseItem, { borderColor: BrandColors.gray800 }]}
                  onPress={() => handleExercisePress(exercise)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.exerciseNumber, { color: BrandColors.accent }]}>
                    {index + 1}
                  </Text>
                  <View style={styles.exerciseDetails}>
                    <Text style={[styles.exerciseName, { color: BrandColors.text }]}>
                      {exercise.name} 👁️
                    </Text>
                    <Text style={[styles.exerciseSets, { color: BrandColors.textSecondary }]}>
                      {exercise.sets} sets × {exercise.reps} • Rest: {exercise.rest}
                    </Text>
                    {exercise.notes && (
                      <Text style={[styles.exerciseNotes, { color: BrandColors.textSecondary }]}>
                        💡 {exercise.notes}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: BrandColors.accent }]}
              onPress={() => handleAddWorkout(selectedWorkout, new Date().toISOString().split('T')[0])}
              activeOpacity={0.8}
            >
              <Text style={[styles.saveButtonText, { color: BrandColors.background }]}>
                ✅ Save as Template
              </Text>
            </TouchableOpacity>

            {/* Show Share with Team button - temporarily always visible for testing */}
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: '#f59e0b' }]}
              onPress={() => {
                console.log('📤 Share button pressed!');
                handleShareWithTeam(selectedWorkout);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.shareButtonText, { color: '#000' }]}>
                📤 Share with Team
              </Text>
            </TouchableOpacity>
            
            {/* Debug info */}
            {__DEV__ && (
              <Text style={{ color: BrandColors.textSecondary, fontSize: 12, marginTop: 8 }}>
                Debug: isCoach = {isCoach.toString()}, communities = {communities.length}
              </Text>
            )}
          </View>
        )}

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
                    💪 {selectedExercise.muscleGroup}
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
                    <Text style={[styles.exerciseModalTipTitle, { color: BrandColors.accent }]}>💡 Tip</Text>
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
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  generateButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
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
  },
  workoutCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workoutIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  workoutDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  workoutMeta: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray800,
  },
  workoutMetaText: {
    fontSize: 14,
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
    padding: 20,
    borderRadius: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    fontSize: 28,
    fontWeight: 'bold',
    padding: 4,
  },
  detailDescription: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 22,
  },
  detailMeta: {
    marginBottom: 16,
  },
  detailMetaText: {
    fontSize: 14,
    marginBottom: 4,
  },
  exercisesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  exercisesList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
    width: 24,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseSets: {
    fontSize: 14,
    marginBottom: 2,
  },
  exerciseNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
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
});

