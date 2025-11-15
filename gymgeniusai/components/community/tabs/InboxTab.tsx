import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';
import { SharedWorkout } from '@/services/workoutSharingService';
import { SharedMealPlan } from '@/services/mealPlanSharingService';
import { router } from 'expo-router';

// Global variable declarations for workout sharing
declare global {
  var sharedWorkoutData: any;
  var sharedWorkoutId: string;
  var sharedWorkoutName: string;
  var sharedMealPlanData: any;
  var sharedMealPlanId: string;
  var sharedMealPlanDocId: string;
}

interface InboxTabProps {
  sharedWorkouts: SharedWorkout[];
  sharedMealPlans: SharedMealPlan[];
  loadingInbox: boolean;
}

export const InboxTab: React.FC<InboxTabProps> = ({
  sharedWorkouts,
  sharedMealPlans,
  loadingInbox,
}) => {
  const handleMealPlanAccept = (mealPlan: SharedMealPlan) => {
    console.log('🍽️ Accepting meal plan:', mealPlan.mealPlanName);
    console.log('🍽️ Meal plan data:', mealPlan.mealPlanData);
    
    if (mealPlan.mealPlanData || mealPlan.mealPlanId || mealPlan.id) {
      console.log('🍽️ Storing meal plan data for navigation');
      console.log('🍽️ Meal plan object:', {
        id: mealPlan.id,
        mealPlanId: mealPlan.mealPlanId,
        hasMealPlanData: !!mealPlan.mealPlanData
      });
      
      (global as any).sharedMealPlanData = mealPlan.mealPlanData || mealPlan;
      (global as any).sharedMealPlanId = mealPlan.mealPlanId || '';
      (global as any).sharedMealPlanDocId = mealPlan.id || '';
      
      console.log('🍽️ Global meal plan data stored:', {
        sharedMealPlanData: (global as any).sharedMealPlanData ? 'exists' : 'null',
        sharedMealPlanId: (global as any).sharedMealPlanId,
        sharedMealPlanDocId: (global as any).sharedMealPlanDocId,
        originalMealPlanId: mealPlan.mealPlanId,
        originalDocId: mealPlan.id,
        mealPlanDataKeys: mealPlan.mealPlanData ? Object.keys(mealPlan.mealPlanData) : []
      });
      
      router.push('/(tabs)/nutrition');
    } else {
      console.error('❌ Meal plan data is null or undefined');
      Alert.alert('Error', 'Meal plan data not available. Please try again.');
    }
  };

  const handleWorkoutAccept = (workout: SharedWorkout) => {
    console.log('🎯 Starting workout:', workout.workoutName);
    console.log('🎯 Full workout object:', workout);
    console.log('🎯 Workout data:', workout.workoutData);
    console.log('🎯 Assigned date:', workout.assignedDate);
    console.log('🎯 Workout data type:', typeof workout.workoutData);
    console.log('🎯 Workout data keys:', workout.workoutData ? Object.keys(workout.workoutData) : 'null');
    
    if (workout.workoutData) {
      console.log('🎯 Storing workout data for navigation');
      // Ensure assigned date is included in workout data
      const workoutDataWithDate = {
        ...workout.workoutData,
        assignedDate: workout.assignedDate || workout.workoutData.assignedDate,
        date: workout.assignedDate ? new Date(workout.assignedDate).toISOString().split('T')[0] : (workout.workoutData.date || new Date().toISOString().split('T')[0])
      };
      global.sharedWorkoutData = workoutDataWithDate;
      global.sharedWorkoutId = workout.id || '';
      global.sharedWorkoutName = workout.workoutName;
      
      console.log('🎯 Global data stored:', {
        sharedWorkoutData: global.sharedWorkoutData,
        sharedWorkoutId: global.sharedWorkoutId,
        sharedWorkoutName: global.sharedWorkoutName
      });
      
      router.push('/(tabs)/workout');
    } else {
      console.error('❌ Workout data is null or undefined');
      Alert.alert('Error', 'Workout data not available. Please try again.');
    }
  };

  return (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
        Coach Assignments
      </Text>
      
      <View style={styles.inboxContainer}>
        {loadingInbox ? (
          <View style={styles.emptyInboxContainer}>
            <Text style={[styles.emptyInboxTitle, { color: BrandColors.text }]}>
              Loading assignments...
            </Text>
          </View>
        ) : (sharedWorkouts.length > 0 || sharedMealPlans.length > 0) ? (
          <>
            {/* Meal Plans */}
            {sharedMealPlans.map((mealPlan) => (
              <View key={mealPlan.id || mealPlan.mealPlanId} style={styles.assignmentCard}>
                <View style={styles.assignmentHeader}>
                  <IconSymbol name="fork.knife" size={20} color={BrandColors.accent} />
                  <Text style={[styles.assignmentTitle, { color: BrandColors.text }]}>
                    {mealPlan.mealPlanName || 'Meal Plan'}
                  </Text>
                </View>
                <Text style={[styles.assignmentDescription, { color: BrandColors.textSecondary }]}>
                  From: {mealPlan.coachName} • Team: {mealPlan.teamName}
                </Text>
                {mealPlan.date && (
                  <Text style={[styles.assignmentDescription, { color: BrandColors.textSecondary, fontSize: 12 }]}>
                    Date: {new Date(mealPlan.date).toLocaleDateString()}
                  </Text>
                )}
                <View style={styles.assignmentFooter}>
                  <TouchableOpacity 
                    style={styles.startButton}
                    onPress={() => handleMealPlanAccept(mealPlan)}
                  >
                    <Text style={[styles.startButtonText, { color: BrandColors.accent }]}>
                      View Meal Plan
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {/* Workouts */}
            {sharedWorkouts.map((workout) => (
              <View key={workout.id} style={styles.assignmentCard}>
                <View style={styles.assignmentHeader}>
                  <IconSymbol name="figure.strengthtraining.traditional" size={20} color={BrandColors.accent} />
                  <Text style={[styles.assignmentTitle, { color: BrandColors.text }]}>
                    {workout.workoutName}
                  </Text>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: workout.priority === 'high' ? '#ef4444' : workout.priority === 'medium' ? '#f59e0b' : '#22c55e' }
                  ]}>
                    <Text style={styles.priorityText}>{workout.priority.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={[styles.assignmentDescription, { color: BrandColors.textSecondary }]}>
                  From: {workout.coachName} • Team: {workout.teamName}
                </Text>
                {workout.assignedDate && (
                  <Text style={[styles.assignmentDescription, { color: BrandColors.textSecondary, fontSize: 12 }]}>
                    Assigned for: {new Date(workout.assignedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                )}
                <View style={styles.assignmentFooter}>
                  <Text style={[styles.assignmentDue, { color: BrandColors.textSecondary }]}>
                    Status: {workout.status.charAt(0).toUpperCase() + workout.status.slice(1)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.startButton}
                    onPress={() => handleWorkoutAccept(workout)}
                  >
                    <Text style={[styles.startButtonText, { color: BrandColors.accent }]}>
                      Start Workout
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyInboxContainer}>
            <IconSymbol name="tray" size={48} color={BrandColors.textSecondary} />
            <Text style={[styles.emptyInboxTitle, { color: BrandColors.text }]}>
              No assignments yet
            </Text>
            <Text style={[styles.emptyInboxDescription, { color: BrandColors.textSecondary }]}>
              Your coach will send you workouts and meal plans here
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    marginBottom: 12,
  },
  inboxContainer: {
    gap: 16,
  },
  emptyInboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyInboxTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyInboxDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  assignmentCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
    gap: 12,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  priorityBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: 'ui-rounded',
  },
  assignmentDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentDue: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
  startButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BrandColors.accent,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
});

