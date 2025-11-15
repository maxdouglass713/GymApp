import { useState, useEffect } from 'react';
import { workoutSharingService, SharedWorkout } from '@/services/workoutSharingService';
import { mealPlanSharingService, SharedMealPlan } from '@/services/mealPlanSharingService';

export const useInbox = (userId: string | undefined, activeTab: string) => {
  const [sharedWorkouts, setSharedWorkouts] = useState<SharedWorkout[]>([]);
  const [sharedMealPlans, setSharedMealPlans] = useState<SharedMealPlan[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);

  // Set up real-time listener for inbox (workouts and meal plans)
  useEffect(() => {
    if (!userId || activeTab !== 'inbox') {
      return;
    }

    console.log('📬 Setting up real-time listener for inbox');
    
    const unsubscribeWorkouts = workoutSharingService.subscribeToPlayerInbox(userId, (workouts) => {
      console.log('📬 Real-time inbox update:', workouts.length, 'workouts');
      // Only show pending assignments in inbox (completed ones are removed from inbox)
      const pendingWorkouts = workouts.filter(w => w.status !== 'completed' && (!w.status || w.status === 'pending'));
      setSharedWorkouts(pendingWorkouts);
    });
    
    const unsubscribeMealPlans = mealPlanSharingService.subscribeToPlayerMealPlans(userId, (mealPlans) => {
      console.log('🍽️ Real-time meal plans update:', mealPlans.length, 'meal plans');
      // Only show pending/uncompleted meal plans in inbox (completed ones are removed from inbox)
      const pendingMealPlans = mealPlans.filter(mealPlan => {
        const completionStatus = mealPlan.completionStatus || {};
        const playerStatus = completionStatus[userId];
        // Show if not completed or if completion status doesn't exist
        return !playerStatus?.completed;
      });
      console.log('🍽️ Filtered meal plans (pending only):', pendingMealPlans.length, 'meal plans');
      setSharedMealPlans(pendingMealPlans);
      setLoadingInbox(false);
    });

    setLoadingInbox(true);

    // Cleanup subscriptions on unmount or tab change
    return () => {
      console.log('🧹 Cleaning up inbox listeners');
      unsubscribeWorkouts();
      unsubscribeMealPlans();
    };
  }, [userId, activeTab]);

  return {
    sharedWorkouts,
    sharedMealPlans,
    loadingInbox,
  };
};

