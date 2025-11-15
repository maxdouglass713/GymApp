import { useState, useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import { useProgressStore } from '@/stores/progressStore';
import { teamService } from '@/services/teamService';
import { workoutService, userService } from '@/services/firestoreService';
import { convertWorkoutDocumentToWorkout } from '@/utils/community/workoutConverter';
import { Workout } from '@/stores/workoutStore';

interface PlayerStat {
  playerId: string;
  playerName: string;
  workoutsThisWeek: number;
  consistencyScore: number;
  currentStreak: number;
  lastWorkoutDate: Date | null;
  totalWorkouts: number;
  status: 'active' | 'inactive' | 'needs_attention';
}

export const usePlayerStats = (teamId: string | undefined, activeTab: string) => {
  const { profile } = useUserStore();
  const { calculateConsistencyScore, getStreakData } = useProgressStore();
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  useEffect(() => {
    const isInstitutionUser = profile?.userType === 'institution';
    const validTabs = ['overview', 'leaderboard'];
    
    if (!teamId || !validTabs.includes(activeTab) || !isInstitutionUser) {
      return;
    }

    console.log('📊 Loading player stats for coach overview');
    setLoadingOverview(true);

    // Subscribe to team updates
    const unsubscribeTeam = teamService.subscribeToTeam(teamId, async (team) => {
      if (!team || !team.members) {
        setLoadingOverview(false);
        return;
      }

      const players = team.members.filter(m => m.role === 'player');
      console.log('👥 Found', players.length, 'players on team');

      // Calculate stats for each player
      const statsPromises = players.map(async (player) => {
        try {
          // Fetch player's name from Firebase
          let playerName = player.name || 'Friend';
          try {
            const playerDoc = await userService.getUser(player.userId);
            playerName = playerDoc?.displayName || playerDoc?.firstName || player.name || 'Friend';
            console.log('✅ Loaded player name from Firebase:', player.userId, '->', playerName);
          } catch (error) {
            console.error(`❌ Error fetching player name for ${player.userId}:`, error);
            // Fallback to team member name if Firebase fetch fails
            playerName = player.name || 'Friend';
          }

          const workouts = await workoutService.getUserWorkouts(player.userId, 100);
          const convertedWorkouts = workouts
            .filter(w => w.completedAt)
            .map(convertWorkoutDocumentToWorkout)
            .filter((w): w is Workout => w !== null);

          // Calculate workouts this week
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const workoutsThisWeek = convertedWorkouts.filter(w => {
            const workoutDate = new Date(w.date);
            return workoutDate >= weekAgo;
          }).length;

          // Calculate consistency and streak
          const consistencyScore = convertedWorkouts.length > 0 
            ? calculateConsistencyScore(convertedWorkouts).score 
            : 0;
          const streakData = convertedWorkouts.length > 0 
            ? getStreakData(convertedWorkouts) 
            : { current: 0, longest: 0 };

          // Get last workout date
          const lastWorkout = convertedWorkouts.length > 0 
            ? convertedWorkouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
            : null;
          const lastWorkoutDate = lastWorkout ? new Date(lastWorkout.date) : null;

          // Determine status
          let status: 'active' | 'inactive' | 'needs_attention' = 'active';
          if (workoutsThisWeek === 0 && streakData.current === 0) {
            status = 'inactive';
          } else if (workoutsThisWeek < 2 || consistencyScore < 50) {
            status = 'needs_attention';
          }

          return {
            playerId: player.userId,
            playerName,
            workoutsThisWeek,
            consistencyScore,
            currentStreak: streakData.current,
            lastWorkoutDate,
            totalWorkouts: convertedWorkouts.length,
            status,
          };
        } catch (error) {
          console.error(`Error loading stats for player ${player.userId}:`, error);
          
          // Try to get player name even if stats fail
          let playerName = player.name || 'Friend';
          try {
            const playerDoc = await userService.getUser(player.userId);
            playerName = playerDoc?.displayName || playerDoc?.firstName || player.name || 'Friend';
          } catch (nameError) {
            console.error(`❌ Error fetching player name for ${player.userId}:`, nameError);
          }
          
          return {
            playerId: player.userId,
            playerName,
            workoutsThisWeek: 0,
            consistencyScore: 0,
            currentStreak: 0,
            lastWorkoutDate: null,
            totalWorkouts: 0,
            status: 'inactive' as const,
          };
        }
      });

      const stats = await Promise.all(statsPromises);
      setPlayerStats(stats);
      setLoadingOverview(false);
    });

    return () => {
      unsubscribeTeam();
    };
  }, [teamId, activeTab, profile?.userType, profile?.institutionRole, calculateConsistencyScore, getStreakData]);

  return { playerStats, loadingOverview };
};

