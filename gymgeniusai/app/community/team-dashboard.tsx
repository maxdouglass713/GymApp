import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthProvider';
import { useUserStore } from '@/stores/userStore';
import { teamService } from '@/services/teamService';
import { TeamDocument } from '@/types/firestore';
import { workoutSharingService, SharedWorkout } from '@/services/workoutSharingService';
import { mealPlanSharingService, SharedMealPlan } from '@/services/mealPlanSharingService';
import { useWorkoutStore } from '@/stores/workoutStore';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

// Global variable declarations for workout sharing
declare global {
  var sharedWorkoutData: any;
  var sharedWorkoutId: string;
  var sharedWorkoutName: string;
}

export default function TeamDashboardScreen() {
  const [activeTab, setActiveTab] = useState<'assignments' | 'progress' | 'team' | 'chat'>('assignments');
  const { user } = useAuth();
  const { profile } = useUserStore();
  const { workoutHistory } = useWorkoutStore();
  const [teamData, setTeamData] = useState<TeamDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<SharedWorkout[]>([]);
  const [mealPlans, setMealPlans] = useState<SharedMealPlan[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'completed'>('all');
  
  // Load real-time team data from Firebase
  useEffect(() => {
    if (!user?.uid || !profile?.teamId) {
      console.log('⚠️ No team ID found for user');
      setLoading(false);
      return;
    }

    console.log('📊 Loading team dashboard data for team:', profile.teamId);
    
    // Set up real-time listener for team data
    const unsubscribe = teamService.subscribeToTeam(profile.teamId, (team) => {
      if (team) {
        console.log('✅ Team dashboard data loaded:', team.name);
        console.log('👥 Team members:', team.members?.length || 0);
        setTeamData(team);
      } else {
        console.log('⚠️ Team not found');
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up team dashboard listener');
      unsubscribe();
    };
  }, [user?.uid, profile?.teamId]);

  // Set up real-time listener for all assignments (pending + completed) from sharedWorkouts collection
  useEffect(() => {
    if (!user?.uid) return;

    console.log('📋 Setting up real-time listener for all assignments (team dashboard)');
    
    const unsubscribe = workoutSharingService.subscribeToPlayerAssignments(
      user.uid, 
      profile?.teamId, 
      (workouts) => {
        console.log('📋 Real-time assignments update:', workouts.length, 'assignments');
        setAssignments(workouts);
        setLoadingAssignments(false);
      }
    );

    // Set up real-time listener for meal plans
    const unsubscribeMealPlans = mealPlanSharingService.subscribeToPlayerMealPlans(
      user.uid,
      (mealPlans) => {
        console.log('🍽️ Real-time meal plans update:', mealPlans.length, 'meal plans');
        setMealPlans(mealPlans);
      }
    );

    setLoadingAssignments(true);

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🧹 Cleaning up assignments and meal plans listeners');
      unsubscribe();
      unsubscribeMealPlans();
    };
  }, [user?.uid, profile?.teamId]);
  
  // Calculate team stats from real data
  const totalAssignments = assignments.length;
  const completedAssignmentsCount = assignments.filter(a => a.completedBy?.includes(user?.uid || '') || false).length;
  const totalWorkouts = workoutHistory.length;
  const completedWorkouts = workoutHistory.filter(w => w.completedAt).length;
  
  // Calculate streak (consecutive days with workouts)
  const calculateStreak = () => {
    if (workoutHistory.length === 0) return 0;
    
    const sortedWorkouts = [...workoutHistory]
      .filter(w => w.completedAt)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt) : new Date(a.date);
        const dateB = b.completedAt ? new Date(b.completedAt) : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
    
    if (sortedWorkouts.length === 0) return 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedWorkouts.length; i++) {
      const workoutDate = sortedWorkouts[i].completedAt 
        ? new Date(sortedWorkouts[i].completedAt!)
        : new Date(sortedWorkouts[i].date);
      workoutDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (i === 0 && daysDiff === 0) {
        streak = 1;
      } else if (i === 0 && daysDiff === 1) {
        streak = 1;
        today.setDate(today.getDate() - 1);
      } else if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const teamStats = {
    totalAssignments,
    completedAssignments: completedAssignmentsCount,
    totalWorkouts,
    completedWorkouts,
    streak: calculateStreak(),
  };
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BrandColors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.accent} />
          <Text style={[styles.loadingText, { color: BrandColors.textSecondary }]}>
            Loading team data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!teamData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BrandColors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: BrandColors.textSecondary + '20' }]}
            onPress={() => {
              // Navigate to community tab where players can access quick actions
              // Pass a param to prevent auto-redirect
              router.push({
                pathname: '/(tabs)/community',
                params: { fromTeamDashboard: 'true' }
              });
            }}
          >
            <IconSymbol name="chevron.left" size={20} color={BrandColors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: BrandColors.text }]}>
            Team Dashboard
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={BrandColors.textSecondary} />
          <Text style={[styles.emptyText, { color: BrandColors.textSecondary }]}>
            No team data found
          </Text>
          <Text style={[styles.emptySubtext, { color: BrandColors.textSecondary }]}>
            Please join a team to view the dashboard
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Filter assignments based on selected filter and current user
  // Status is determined by whether the current player is in completedBy array
  const filteredAssignments = assignments.filter(assignment => {
    const isCompleted = assignment.completedBy?.includes(user?.uid || '') || false;
    
    if (assignmentFilter === 'completed') {
      return isCompleted;
    } else if (assignmentFilter === 'pending') {
      return !isCompleted;
    }
    return true; // 'all' shows everything
  });

  // Filter meal plans - for now, treat all meal plans as pending (we'll add completion tracking later)
  const filteredMealPlans = mealPlans.filter(mealPlan => {
    // TODO: Add completion tracking for meal plans
    if (assignmentFilter === 'completed') {
      return false; // No completed meal plans yet
    } else if (assignmentFilter === 'pending') {
      return true; // All meal plans are pending
    }
    return true; // 'all' shows everything
  });

  const completedAssignments = filteredAssignments.filter(a => {
    return a.completedBy?.includes(user?.uid || '') || false;
  });
  const pendingAssignments = filteredAssignments.filter(a => {
    return !a.completedBy?.includes(user?.uid || '');
  });

  const renderAssignments = () => (
    <View style={styles.tabContent}>
      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            assignmentFilter === 'all' && styles.filterTabActive
          ]}
          onPress={() => setAssignmentFilter('all')}
        >
          <Text style={[
            styles.filterTabText,
            { color: assignmentFilter === 'all' ? BrandColors.accent : BrandColors.textSecondary }
          ]}>
            All ({assignments.length + mealPlans.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            assignmentFilter === 'pending' && styles.filterTabActive
          ]}
          onPress={() => setAssignmentFilter('pending')}
        >
          <Text style={[
            styles.filterTabText,
            { color: assignmentFilter === 'pending' ? BrandColors.accent : BrandColors.textSecondary }
          ]}>
            Pending ({pendingAssignments.length + filteredMealPlans.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            assignmentFilter === 'completed' && styles.filterTabActive
          ]}
          onPress={() => setAssignmentFilter('completed')}
        >
          <Text style={[
            styles.filterTabText,
            { color: assignmentFilter === 'completed' ? BrandColors.accent : BrandColors.textSecondary }
          ]}>
            Completed ({completedAssignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loadingAssignments ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={BrandColors.accent} />
          <Text style={[styles.emptyText, { color: BrandColors.textSecondary }]}>
            Loading assignments...
          </Text>
        </View>
      ) : filteredAssignments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="list.bullet" size={48} color={BrandColors.textSecondary} />
          <Text style={[styles.emptyText, { color: BrandColors.textSecondary }]}>
            No assignments found
          </Text>
          <Text style={[styles.emptySubtext, { color: BrandColors.textSecondary }]}>
            {assignmentFilter === 'completed' 
              ? 'You haven\'t completed any assignments yet'
              : assignmentFilter === 'pending'
              ? 'No pending assignments'
              : 'Assignments will appear here when your coach creates them'}
          </Text>
        </View>
      ) : (
        <>
          {/* Pending Meal Plans Section */}
          {filteredMealPlans.length > 0 && (assignmentFilter === 'all' || assignmentFilter === 'pending') && (
            <>
              <Text style={[styles.sectionTitle, { color: BrandColors.text, marginTop: 0 }]}>
                Meal Plans
              </Text>
              {filteredMealPlans.map((mealPlan) => (
                <TouchableOpacity
                  key={mealPlan.id || mealPlan.mealPlanId}
                  style={[styles.assignmentCard, styles.mealPlanCard]}
                  onPress={() => {
                    // Navigate to nutrition tab with meal plan data
                    Alert.alert(
                      'Meal Plan',
                      `View meal plan for ${mealPlan.date ? new Date(mealPlan.date).toLocaleDateString() : 'today'}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'View',
                          onPress: () => {
                            // Store meal plan data globally for nutrition tab
                            (global as any).sharedMealPlanData = mealPlan.mealPlanData;
                            (global as any).sharedMealPlanId = mealPlan.id;
                            router.push('/(tabs)/nutrition');
                          }
                        }
                      ]
                    );
                  }}
                >
                  <View style={styles.assignmentHeader}>
                    <View style={styles.assignmentIcon}>
                      <IconSymbol 
                        name="fork.knife" 
                        size={20} 
                        color={BrandColors.accent} 
                      />
                    </View>
                    <View style={styles.assignmentInfo}>
                      <Text style={[styles.assignmentTitle, { color: BrandColors.text }]}>
                        {mealPlan.mealPlanName || 'Meal Plan'}
                      </Text>
                      <Text style={[styles.assignmentDescription, { color: BrandColors.textSecondary }]}>
                        From {mealPlan.coachName} • {mealPlan.date ? new Date(mealPlan.date).toLocaleDateString() : 'Today'}
                      </Text>
                      {mealPlan.mealPlanData?.totalMacros && (
                        <Text style={[styles.assignmentDescription, { color: BrandColors.textSecondary, fontSize: 12 }]}>
                          {Math.round(mealPlan.mealPlanData.totalMacros.calories)} cal • {Math.round(mealPlan.mealPlanData.totalMacros.protein)}g protein
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.assignmentFooter}>
                    <View style={styles.pendingBadge}>
                      <Text style={[styles.pendingBadgeText, { color: BrandColors.textSecondary }]}>
                        Pending
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Pending Workout Assignments Section */}
          {pendingAssignments.length > 0 && (assignmentFilter === 'all' || assignmentFilter === 'pending') && (
            <>
              <Text style={[styles.sectionTitle, { color: BrandColors.text, marginTop: filteredMealPlans.length > 0 ? 20 : 0 }]}>
                Pending Workouts
              </Text>
              {pendingAssignments.map((assignment) => (
                <TouchableOpacity
                  key={assignment.id || assignment.workoutId}
                  style={styles.assignmentCard}
                  onPress={() => {
                    if (assignment.workoutData) {
                      global.sharedWorkoutData = assignment.workoutData;
                      global.sharedWorkoutId = assignment.id || '';
                      global.sharedWorkoutName = assignment.workoutName;
                      router.push('/(tabs)/workout');
                    } else {
                      Alert.alert('Error', 'Workout data not available');
                    }
                  }}
                >
                  <View style={styles.assignmentHeader}>
                    <View style={styles.assignmentIcon}>
                      <IconSymbol 
                        name="figure.strengthtraining.traditional" 
                        size={20} 
                        color={BrandColors.accent} 
                      />
                    </View>
                    <View style={styles.assignmentInfo}>
                      <Text style={[styles.assignmentTitle, { color: BrandColors.text }]}>
                        {assignment.workoutName}
                      </Text>
                      <Text style={[styles.assignmentDescription, { color: BrandColors.textSecondary }]}>
                        From: {assignment.coachName} • {assignment.teamName}
                      </Text>
                    </View>
                    <View style={styles.assignmentStatus}>
                      <View style={[styles.priorityBadge, { 
                        backgroundColor: assignment.priority === 'high' ? '#ef4444' : 
                                        assignment.priority === 'medium' ? '#f59e0b' : '#22c55e'
                      }]}>
                        <Text style={styles.priorityText}>
                          {assignment.priority?.toUpperCase() || 'MEDIUM'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.assignmentFooter}>
                    {assignment.dueDate && (
                      <Text style={[styles.dueDate, { color: BrandColors.textSecondary }]}>
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </Text>
                    )}
                    <TouchableOpacity 
                      style={styles.startButton}
                      onPress={() => {
                        if (assignment.workoutData) {
                          global.sharedWorkoutData = assignment.workoutData;
                          global.sharedWorkoutId = assignment.id || '';
                          global.sharedWorkoutName = assignment.workoutName;
                          router.push('/(tabs)/workout');
                        } else {
                          Alert.alert('Error', 'Workout data not available');
                        }
                      }}
                    >
                      <Text style={[styles.startButtonText, { color: BrandColors.accent }]}>
                        Start
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Completed Assignments Section */}
          {completedAssignments.length > 0 && (assignmentFilter === 'all' || assignmentFilter === 'completed') && (
            <>
              <Text style={[styles.sectionTitle, { color: BrandColors.text, marginTop: pendingAssignments.length > 0 ? 20 : 0 }]}>
                Completed Assignments
              </Text>
              {completedAssignments.map((assignment) => (
                <View key={assignment.id || assignment.workoutId} style={[styles.assignmentCard, styles.completedAssignmentCard]}>
                  <View style={styles.assignmentHeader}>
                    <View style={[styles.assignmentIcon, styles.completedIcon]}>
                      <IconSymbol 
                        name="figure.strengthtraining.traditional" 
                        size={20} 
                        color="#22c55e" 
                      />
                    </View>
                    <View style={styles.assignmentInfo}>
                      <Text style={[styles.assignmentTitle, { color: BrandColors.text }]}>
                        {assignment.workoutName}
                      </Text>
                      <Text style={[styles.assignmentDescription, { color: BrandColors.textSecondary }]}>
                        From: {assignment.coachName} • {assignment.teamName}
                      </Text>
                    </View>
                    <View style={styles.assignmentStatus}>
                      <IconSymbol name="checkmark.circle.fill" size={24} color="#22c55e" />
                    </View>
                  </View>
                  
                  <View style={styles.assignmentFooter}>
                    {assignment.dueDate && (
                      <Text style={[styles.dueDate, { color: BrandColors.textSecondary }]}>
                        Completed • Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </Text>
                    )}
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>COMPLETED</Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
  
  const renderProgress = () => {
    // Get recent completed workouts (last 7 days)
    const recentWorkouts = workoutHistory
      .filter(w => w.completedAt)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt) : new Date(a.date);
        const dateB = b.completedAt ? new Date(b.completedAt) : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10);

    // Count workouts this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const workoutsThisWeek = workoutHistory.filter(w => {
      const workoutDate = w.completedAt ? new Date(w.completedAt!) : new Date(w.date);
      return workoutDate >= startOfWeek;
    }).length;

    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
          Your Progress
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: BrandColors.accent }]}>
              {teamStats.completedAssignments}/{teamStats.totalAssignments}
            </Text>
            <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>
              Assignments Completed
            </Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { 
                  width: teamStats.totalAssignments > 0 ? `${(teamStats.completedAssignments / teamStats.totalAssignments) * 100}%` : '0%',
                  backgroundColor: BrandColors.accent 
                }
              ]} />
            </View>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: BrandColors.accent }]}>
              {teamStats.completedWorkouts}
            </Text>
            <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>
              Total Workouts
            </Text>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { 
                  width: '100%',
                  backgroundColor: BrandColors.accent 
                }
              ]} />
            </View>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: BrandColors.accent }]}>
              {teamStats.streak}
            </Text>
            <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>
              Day Streak
            </Text>
            <IconSymbol name="flame.fill" size={20} color="#f59e0b" />
          </View>
        </View>
        
        {/* Recent Workouts */}
        {recentWorkouts.length > 0 && (
          <View style={styles.recentWorkoutsCard}>
            <Text style={[styles.achievementsTitle, { color: BrandColors.text }]}>
              Recent Workouts
            </Text>
            {recentWorkouts.map((workout) => {
              const workoutDate = workout.completedAt 
                ? new Date(workout.completedAt) 
                : new Date(workout.date);
              const isAssigned = assignments.some(a => 
                a.workoutName === workout.title || 
                (a.workoutData && a.workoutData.title === workout.title)
              );
              
              return (
                <View key={workout.id} style={styles.workoutItem}>
                  <View style={styles.workoutItemHeader}>
                    <IconSymbol 
                      name={isAssigned ? "figure.strengthtraining.traditional" : "dumbbell.fill"} 
                      size={16} 
                      color={isAssigned ? BrandColors.accent : BrandColors.textSecondary} 
                    />
                    <Text style={[styles.workoutItemTitle, { color: BrandColors.text }]}>
                      {workout.title}
                    </Text>
                    {isAssigned && (
                      <View style={styles.assignedBadge}>
                        <Text style={styles.assignedBadgeText}>ASSIGNED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.workoutItemDate, { color: BrandColors.textSecondary }]}>
                    {workoutDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: workoutDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    })}
                  </Text>
                  <Text style={[styles.workoutItemExercises, { color: BrandColors.textSecondary }]}>
                    {workout.exercises?.length || 0} exercises
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Achievements */}
        <View style={styles.achievementsCard}>
          <Text style={[styles.achievementsTitle, { color: BrandColors.text }]}>
            Achievements
          </Text>
          {workoutsThisWeek >= 5 && (
            <View style={styles.achievementItem}>
              <IconSymbol name="trophy.fill" size={20} color="#f59e0b" />
              <Text style={[styles.achievementText, { color: BrandColors.textSecondary }]}>
                Completed {workoutsThisWeek} workouts this week
              </Text>
            </View>
          )}
          {teamStats.streak >= 7 && (
            <View style={styles.achievementItem}>
              <IconSymbol name="flame.fill" size={20} color="#f59e0b" />
              <Text style={[styles.achievementText, { color: BrandColors.textSecondary }]}>
                {teamStats.streak} day streak! 🔥
              </Text>
            </View>
          )}
          {teamStats.completedAssignments === teamStats.totalAssignments && teamStats.totalAssignments > 0 && (
            <View style={styles.achievementItem}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#22c55e" />
              <Text style={[styles.achievementText, { color: BrandColors.textSecondary }]}>
                Completed all assignments!
              </Text>
            </View>
          )}
          {workoutsThisWeek < 5 && teamStats.streak < 7 && teamStats.completedAssignments !== teamStats.totalAssignments && (
            <Text style={[styles.achievementText, { color: BrandColors.textSecondary, fontStyle: 'italic' }]}>
              Keep working out to unlock achievements!
            </Text>
          )}
        </View>
      </View>
    );
  };
  
  const renderTeam = () => (
    <View style={styles.tabContent}>
      <View style={styles.teamInfoCard}>
        <View style={styles.teamHeader}>
          <View style={styles.teamIcon}>
            <IconSymbol name="sportscourt" size={32} color={BrandColors.accent} />
          </View>
          <View style={styles.teamDetails}>
            <Text style={[styles.teamName, { color: BrandColors.text }]}>
              {teamData.name}
            </Text>
            <Text style={[styles.coachName, { color: BrandColors.textSecondary }]}>
              Coach: {teamData.coachName || 'N/A'}
            </Text>
            {teamData.sport && (
              <Text style={[styles.teamSport, { color: BrandColors.textSecondary }]}>
                {teamData.sport}
              </Text>
            )}
          </View>
        </View>
      </View>
      
      <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
        Team Members ({teamData.members?.length || 0})
      </Text>
      
      {/* Show coach */}
      {(() => {
        // Deduplicate members by userId to prevent duplicate keys
        const uniqueMembers = new Map<string, any>();
        (teamData.members || []).forEach((member) => {
          if ((member.role === 'coach' || member.role === 'admin') && member.userId) {
            if (!uniqueMembers.has(member.userId)) {
              uniqueMembers.set(member.userId, member);
            }
          }
        });
        return Array.from(uniqueMembers.values());
      })().map((member, index) => {
        const memberKey = member.userId || `${member.name || 'coach'}-${index}`;
        return (
        <View key={memberKey} style={styles.memberCard}>
          <View style={styles.memberInfo}>
            <View style={styles.memberAvatar}>
              <Text style={[styles.memberInitial, { color: BrandColors.text }]}>
                {member.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'CO'}
              </Text>
            </View>
            <View style={styles.memberDetails}>
              <Text style={[styles.memberName, { color: BrandColors.text }]}>
                {member.name || 'Unknown'}
              </Text>
              <Text style={[styles.memberRole, { color: BrandColors.accent }]}>
                {member.role === 'admin' ? 'Admin' : 'Coach'}
              </Text>
            </View>
          </View>
          <IconSymbol name="crown.fill" size={20} color="#f59e0b" />
        </View>
      );
      })}
      
      {/* Show players */}
      {(() => {
        // Deduplicate members by userId to prevent duplicate keys
        const uniqueMembers = new Map<string, any>();
        (teamData.members || []).forEach((member) => {
          if (member.role === 'player' && member.userId) {
            if (!uniqueMembers.has(member.userId)) {
              uniqueMembers.set(member.userId, member);
            }
          }
        });
        return Array.from(uniqueMembers.values());
      })().length > 0 ? (
        (() => {
          // Deduplicate members by userId
          const uniqueMembers = new Map<string, any>();
          (teamData.members || []).forEach((member) => {
            if (member.role === 'player' && member.userId) {
              if (!uniqueMembers.has(member.userId)) {
                uniqueMembers.set(member.userId, member);
              }
            }
          });
          return Array.from(uniqueMembers.values());
        })().map((member, index) => {
          const memberKey = member.userId || `${member.name || 'player'}-${index}`;
          return (
          <View key={memberKey} style={styles.memberCard}>
            <View style={styles.memberInfo}>
              <View style={styles.memberAvatar}>
                <Text style={[styles.memberInitial, { color: BrandColors.text }]}>
                  {member.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'PL'}
                </Text>
              </View>
              <View style={styles.memberDetails}>
                <Text style={[styles.memberName, { color: BrandColors.text }]}>
                  {member.name || 'Unknown Player'}
                </Text>
                <Text style={[styles.memberRole, { color: BrandColors.textSecondary }]}>
                  Player
                </Text>
              </View>
            </View>
            <View style={styles.memberStatus}>
              <IconSymbol 
                name={member.status === 'active' ? "checkmark.circle.fill" : "xmark.circle.fill"} 
                size={16} 
                color={member.status === 'active' ? "#22c55e" : BrandColors.textSecondary} 
              />
              <Text style={[styles.statusText, { color: BrandColors.textSecondary }]}>
                {member.status === 'active' ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        );
        })
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: BrandColors.textSecondary }]}>
            No players yet
          </Text>
        </View>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BrandColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: BrandColors.textSecondary + '20' }]}
          onPress={() => {
            // Navigate to community tab where players can access quick actions
            // Pass a param to prevent auto-redirect
            router.push({
              pathname: '/(tabs)/community',
              params: { fromTeamDashboard: 'true' }
            });
          }}
        >
          <IconSymbol name="chevron.left" size={20} color={BrandColors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: BrandColors.text }]}>
          Team Dashboard
        </Text>
      </View>
      
      <View style={styles.tabBar}>
        {[
          { key: 'assignments', label: 'Assignments', icon: 'list.bullet' },
          { key: 'progress', label: 'Progress', icon: 'chart.bar' },
          { key: 'team', label: 'Team', icon: 'person.2' },
          { key: 'chat', label: 'Chat', icon: 'message' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && { backgroundColor: BrandColors.accent + '20' }
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <IconSymbol 
              name={tab.icon as any} 
              size={16} 
              color={activeTab === tab.key ? BrandColors.accent : BrandColors.textSecondary} 
            />
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.key ? BrandColors.accent : BrandColors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'assignments' && renderAssignments()}
        {activeTab === 'progress' && renderProgress()}
        {activeTab === 'team' && renderTeam()}
        {activeTab === 'chat' && (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
              Team Chat
            </Text>
            <TouchableOpacity
              onPress={() => checkFeatureOrShowComingSoon('teamChat', 'Team Chat')}
              style={{ padding: 8 }}
            >
              <Text style={[styles.comingSoon, { color: BrandColors.textSecondary }]}>
                Team chat feature coming soon! (Tap for details)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'ui-rounded',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContent: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  mealPlanCard: {
    borderLeftWidth: 4,
    borderLeftColor: BrandColors.accent,
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
  assignmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  assignmentDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
  assignmentStatus: {
    alignItems: 'center',
  },
  priorityBadge: {
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
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDate: {
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
  statsGrid: {
    gap: 16,
  },
  statCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: BrandColors.textSecondary + '20',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  achievementsCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
    gap: 12,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  teamInfoCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BrandColors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    marginBottom: 2,
  },
  coachName: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
  comingSoon: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    marginTop: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  teamSport: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginTop: 2,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '30',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
  },
  filterTabActive: {
    backgroundColor: BrandColors.accent + '20',
    borderColor: BrandColors.accent,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  completedAssignmentCard: {
    opacity: 0.7,
    backgroundColor: BrandColors.background,
  },
  completedIcon: {
    backgroundColor: '#22c55e' + '20',
  },
  completedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#22c55e' + '20',
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#22c55e',
    fontFamily: 'ui-rounded',
  },
  recentWorkoutsCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
    gap: 12,
  },
  workoutItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.textSecondary + '10',
  },
  workoutItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  workoutItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  assignedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: BrandColors.accent + '20',
  },
  assignedBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: BrandColors.accent,
    fontFamily: 'ui-rounded',
  },
  workoutItemDate: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginBottom: 2,
  },
  workoutItemExercises: {
    fontSize: 11,
    fontFamily: 'ui-rounded',
  },
});
