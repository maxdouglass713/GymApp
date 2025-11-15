import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Share,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useCommunityStore } from '@/stores/communityStore';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/components/AuthProvider';
import { teamService } from '@/services/teamService';
import { userService, workoutService, mealService } from '@/services/firestoreService';
import { workoutSharingService, SharedWorkout } from '@/services/workoutSharingService';
import { mealPlanSharingService, SharedMealPlan } from '@/services/mealPlanSharingService';
import { chatService, ChatMessage } from '@/services/chatService';
import { TeamDocument, UserDocument, WorkoutDocument, MealDocument } from '@/types/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { useProgressStore } from '@/stores/progressStore';
import { Workout } from '@/stores/workoutStore';
import { DatePickerModal } from '@/components/shared/DatePickerModal';
import { useWorkoutStore } from '@/stores/workoutStore';

export default function TeamManagementScreen() {
  const { communities, activeCommunityId } = useCommunityStore();
  const { profile, fetchUserDoc } = useUserStore();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'assignments' | 'chat'>('overview');
  const [teamData, setTeamData] = useState<TeamDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<SharedWorkout[]>([]);
  const [mealPlanAssignments, setMealPlanAssignments] = useState<SharedMealPlan[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'completed'>('all');
  
  // Date picker for workout assignment
  const [showWorkoutDatePicker, setShowWorkoutDatePicker] = useState(false);
  const { setSelectedDate } = useWorkoutStore();
  
  // Player menu state
  const [selectedPlayer, setSelectedPlayer] = useState<{id: string, name: string} | null>(null);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWorkoutsModal, setShowWorkoutsModal] = useState(false);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [playerProfile, setPlayerProfile] = useState<UserDocument | null>(null);
  const [playerWorkouts, setPlayerWorkouts] = useState<WorkoutDocument[]>([]);
  const [playerMeals, setPlayerMeals] = useState<MealDocument[]>([]);
  const [loadingPlayerData, setLoadingPlayerData] = useState(false);
  
  // Progress calculations
  const { 
    calculateConsistencyScore, 
    calculatePersonalRecords, 
    calculateTrendData,
    getStreakData 
  } = useProgressStore();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Set up real-time listener for workout assignments
  React.useEffect(() => {
    if (!user?.uid || !profile?.teamId) {
      return;
    }

    console.log('📋 Setting up real-time listener for coach workout assignments');
    
    let workoutsLoaded = false;
    let mealPlansLoaded = false;
    
    const unsubscribeWorkouts = workoutSharingService.subscribeToCoachAssignments(
      user.uid,
      profile.teamId,
      (workouts) => {
        console.log('📋 Real-time workout assignments update:', workouts.length, 'assignments');
        setAssignments(workouts);
        workoutsLoaded = true;
        // Only set loading to false after both workouts and meal plans have loaded
        if (workoutsLoaded && mealPlansLoaded) {
          setLoadingAssignments(false);
        }
      }
    );

    // Set up real-time listener for meal plan assignments
    console.log('🍽️ Setting up real-time listener for coach meal plan assignments');
    
    const unsubscribeMealPlans = mealPlanSharingService.subscribeToCoachMealPlanAssignments(
      user.uid,
      profile.teamId,
      (mealPlans) => {
        console.log('🍽️ Real-time meal plan assignments update:', mealPlans.length, 'assignments');
        setMealPlanAssignments(mealPlans);
        mealPlansLoaded = true;
        // Only set loading to false after both workouts and meal plans have loaded
        if (workoutsLoaded && mealPlansLoaded) {
          setLoadingAssignments(false);
        }
      }
    );

    setLoadingAssignments(true);
    
    // Fallback: set loading to false after 3 seconds if listeners haven't fired
    const timeoutId = setTimeout(() => {
      if (workoutsLoaded || mealPlansLoaded) {
        setLoadingAssignments(false);
      }
    }, 3000);

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🧹 Cleaning up coach assignments listeners');
      clearTimeout(timeoutId);
      unsubscribeWorkouts();
      unsubscribeMealPlans();
    };
  }, [user?.uid, profile?.teamId]);

  // Legacy function kept for manual refresh if needed
  const loadAssignments = async () => {
    if (!user?.uid || !profile?.teamId) return;
    
    setLoadingAssignments(true);
    try {
      console.log('👨‍💼 Loading assignments for coach:', user.uid, 'team:', profile.teamId);
      
      // Load both workout and meal plan assignments
      const [coachAssignments, coachMealPlans] = await Promise.all([
        workoutSharingService.getCoachAssignments(user.uid, profile.teamId),
        mealPlanSharingService.getCoachMealPlanAssignments(user.uid, profile.teamId)
      ]);
      
      setAssignments(coachAssignments);
      setMealPlanAssignments(coachMealPlans);
      
      console.log('👨‍💼 Loaded assignments:', {
        workouts: coachAssignments.length,
        mealPlans: coachMealPlans.length,
        total: coachAssignments.length + coachMealPlans.length
      });
    } catch (error) {
      console.error('❌ Error loading assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Function to fetch actual player names from Firebase
  const fetchPlayerNames = async (members: any[]) => {
    const names: Record<string, string> = {};
    
    for (const member of members) {
      if (member.role === 'player' && member.userId) {
        try {
          console.log('🔍 Fetching name for player:', member.userId);
          const userDoc = await userService.getUser(member.userId);
          if (userDoc?.firstName) {
            names[member.userId] = userDoc.firstName;
            console.log('✅ Found name for player:', member.userId, '->', userDoc.firstName);
          } else {
            console.log('❌ No firstName found for player:', member.userId);
            names[member.userId] = member.name || 'Player';
          }
        } catch (error) {
          console.error('❌ Error fetching name for player:', member.userId, error);
          names[member.userId] = member.name || 'Player';
        }
      }
    }
    
    setPlayerNames(names);
    return names;
  };
  
  // Set up real-time listener for team data
  React.useEffect(() => {
    console.log('🔍 Team Management - Setting up real-time listener...');
    console.log('👤 User:', user?.uid);
    console.log('👤 Profile:', profile);
    
    let unsubscribe: (() => void) | null = null;
    
    // Wait for user and profile to be available
    if (!user?.uid) {
      console.log('⏳ Waiting for user authentication...');
      setLoading(false);
      return;
    }
    
    if (!profile) {
      console.log('⏳ Waiting for profile to load...');
      setLoading(false);
      return;
    }
    
    // First, make sure we have the latest user profile from Firebase
    console.log('🔄 Refreshing user profile from Firebase...');
    fetchUserDoc(user.uid).then(() => {
      const updatedProfile = useUserStore.getState().profile;
      const teamId = updatedProfile?.teamId;
      
      if (!teamId) {
        console.log('❌ No teamId found');
        setLoading(false);
        return;
      }
      
      console.log('👂 Setting up real-time listener for team:', teamId);
      
      // Set up real-time listener for team data
      unsubscribe = teamService.subscribeToTeam(teamId, (team) => {
        if (team) {
          console.log('✅ Real-time team update received:', team.name);
          console.log('👥 Team members:', team.members?.length || 0);
          setTeamData(team);
          
          // Fetch player names when team data updates
          if (team.members) {
            fetchPlayerNames(team.members);
          }
        } else {
          console.log('⚠️ Team not found');
        }
        setLoading(false);
      });
    }).catch((error) => {
      console.error('❌ Error fetching user profile:', error);
      setLoading(false);
    });
    
    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        console.log('🧹 Cleaning up team listener');
        unsubscribe();
      }
    };
  }, [user?.uid, profile?.teamId]);

  // Auto-refresh team data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused - refreshing team data...');
      if (user?.uid && profile?.teamId) {
        const refreshTeamData = async () => {
          try {
            // Refresh profile first
            await fetchUserDoc(user.uid);
            const updatedProfile = useUserStore.getState().profile;
            
            if (updatedProfile?.teamId) {
              const team = await teamService.getTeamById(updatedProfile.teamId);
              console.log('🔄 Refreshed team data:', team);
              console.log('👥 Refreshed team members:', team?.members);
              setTeamData(team);
            }
          } catch (error) {
            console.error('❌ Error refreshing team data:', error);
          }
        };
        refreshTeamData();
      }
    }, [user?.uid, profile?.teamId])
  );
  
  // If no team found, show placeholder data
  const teamInfo = teamData ? {
    name: teamData.name,
    description: teamData.description || 'Sports team',
    code: teamData.inviteCode,
    players: (teamData.members || []).filter(member => member.role === 'player').map(member => {
      // Safe date handling
      let joinedAtString = 'Unknown';
      try {
        if (member.joinedAt) {
          if (member.joinedAt instanceof Date) {
            joinedAtString = member.joinedAt.toLocaleDateString();
          } else if (typeof member.joinedAt === 'string') {
            joinedAtString = new Date(member.joinedAt).toLocaleDateString();
          } else if (member.joinedAt && typeof member.joinedAt === 'object' && 'toDate' in member.joinedAt && typeof (member.joinedAt as any).toDate === 'function') {
            // Firestore timestamp
            joinedAtString = (member.joinedAt as any).toDate().toLocaleDateString();
          } else {
            // Try to convert to Date
            joinedAtString = new Date(member.joinedAt).toLocaleDateString();
          }
        }
      } catch (error) {
        console.error('❌ Error converting joinedAt date:', error, 'for member:', member);
        joinedAtString = 'Unknown';
      }
      
      // Use the fetched player name if available, otherwise fall back to stored name
      const displayName = playerNames[member.userId] || member.name || 'Player';
      
      console.log('👤 Processing member:', {
        userId: member.userId,
        storedName: member.name,
        fetchedName: playerNames[member.userId],
        displayName: displayName,
        role: member.role
      });
      
      return {
        id: member.userId,
        name: displayName,
        position: 'Athlete',
        joinedAt: joinedAtString,
      };
    }),
    totalMembers: (teamData.members || []).length, // Total team members (including coach)
    playerCount: (teamData.members || []).filter(member => member.role === 'player').length, // Just players
    recentAssignments: assignments, // Real-time assignments from Firebase
  } : {
    name: 'No Team Found',
    description: 'Create a team to get started',
    code: 'N/A',
    players: [],
    totalMembers: 0,
    playerCount: 0,
    recentAssignments: [],
  };
  
  console.log('🏆 Team Management - Team Info:', {
    hasTeamData: !!teamData,
    teamName: teamInfo.name,
    teamCode: teamInfo.code,
    playerCount: teamInfo.playerCount,
    totalMembers: teamInfo.totalMembers,
    players: teamInfo.players,
    teamData: teamData,
    teamMembers: teamData?.members,
    filteredPlayers: (teamData?.members || []).filter(member => member.role === 'player')
  });
  
  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my sports team "${teamInfo.name}" on KINETIC FLOW AI!\n\nTeam Code: ${teamInfo.code}\n\nDownload the app and enter this code to join the team.`,
        title: 'Join My Sports Team',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Load player profile data
  // Handle sending chat message
  const handleSendChatMessage = async () => {
    if (!newMessage.trim() || !user?.uid || !profile?.teamId) return;
    
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    
    try {
      await chatService.sendMessage(
        profile.teamId,
        user.uid,
        profile?.firstName || user.displayName || 'User',
        messageText
      );
      console.log('✅ Message sent successfully');
      // Message will appear automatically via real-time listener
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Restore message if send failed
      setNewMessage(messageText);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 24) {
      return date.toLocaleDateString();
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return `${minutes}m ago`;
    }
  };

  const loadPlayerProfile = async (playerId: string) => {
    setLoadingPlayerData(true);
    try {
      const profile = await userService.getUser(playerId);
      setPlayerProfile(profile);
      setShowProfileModal(true);
    } catch (error) {
      console.error('❌ Error loading player profile:', error);
      Alert.alert('Error', 'Failed to load player profile');
    } finally {
      setLoadingPlayerData(false);
    }
  };

  // Helper to convert Firestore timestamp to Date
  const convertToDate = (value: any): Date | null => {
    if (!value) return null;
    
    // Already a Date object
    if (value instanceof Date) {
      return value;
    }
    
    // Firestore Timestamp (has toDate method)
    if (value && typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch (e) {
        console.warn('Error converting Firestore timestamp:', e);
        return null;
      }
    }
    
    // ISO string or number (milliseconds)
    try {
      return new Date(value);
    } catch (e) {
      console.warn('Error creating Date from value:', value, e);
      return null;
    }
  };

  // Convert WorkoutDocument to Workout format for progress calculations
  const convertWorkoutDocumentToWorkout = (workoutDoc: any): Workout | null => {
    try {
      if (!workoutDoc || !workoutDoc.id) {
        return null;
      }

      // Safely get date - handle various date formats
      let workoutDate: string;
      let createdAt: Date;
      let completedAt: Date | undefined;
      
      try {
        const completedDate = workoutDoc.completedAt ? convertToDate(workoutDoc.completedAt) : null;
        const createdDate = workoutDoc.createdAt ? convertToDate(workoutDoc.createdAt) : null;
        
        if (completedDate) {
          workoutDate = completedDate.toISOString().split('T')[0];
          completedAt = completedDate;
        } else if (createdDate) {
          workoutDate = createdDate.toISOString().split('T')[0];
        } else {
          workoutDate = new Date().toISOString().split('T')[0];
        }
        
        createdAt = createdDate || new Date();
      } catch (dateError) {
        console.warn('Date conversion error:', dateError);
        workoutDate = new Date().toISOString().split('T')[0];
        createdAt = new Date();
        completedAt = undefined;
      }

      // Safely convert exercises - handle missing or malformed data
      let exercises: any[] = [];
      
      try {
        if (Array.isArray(workoutDoc.exercises)) {
          exercises = workoutDoc.exercises
            .map((ex: any, exIndex: number) => {
              try {
                if (!ex || typeof ex !== 'object') {
                  return null;
                }
                
                const exId = ex.id || `ex-${exIndex}`;
                const exName = ex.name || 'Unknown Exercise';
                
                let sets: any[] = [];
                if (Array.isArray(ex.sets)) {
                  sets = ex.sets
                    .map((set: any, setIndex: number) => {
                      try {
                        if (!set || typeof set !== 'object') {
                          return null;
                        }
                        
                        const setId = set.id || `set-${setIndex}`;
                        const reps = (set.reps !== null && set.reps !== undefined && !isNaN(Number(set.reps))) 
                          ? Number(set.reps) 
                          : null;
                        const weight = (set.weight !== null && set.weight !== undefined && !isNaN(Number(set.weight))) 
                          ? Number(set.weight) 
                          : null;
                        
                        return {
                          id: String(setId),
                          reps,
                          weight,
                          style: 'normal' as const,
                        };
                      } catch (setError) {
                        return null;
                      }
                    })
                    .filter((set: any) => set !== null);
                }
                
                return {
                  id: String(exId),
                  name: String(exName),
                  sets,
                  type: 'strength' as const,
                };
              } catch (exError) {
                return null;
              }
            })
            .filter((ex: any) => ex !== null);
        }
      } catch (exercisesError) {
        console.warn('Error converting exercises:', exercisesError);
        exercises = [];
      }

      return {
        id: String(workoutDoc.id),
        title: String(workoutDoc.name || workoutDoc.title || 'Untitled Workout'),
        date: workoutDate,
        exercises,
        createdAt,
        completedAt,
      };
    } catch (error) {
      // Silently return null - don't log to avoid console spam
      return null;
    }
  };

  // Load player workouts
  const loadPlayerWorkouts = async (playerId: string) => {
    setLoadingPlayerData(true);
    try {
      const workouts = await workoutService.getUserWorkouts(playerId, 100);
      setPlayerWorkouts(workouts);
      setShowWorkoutsModal(true);
    } catch (error) {
      console.error('❌ Error loading player workouts:', error);
      Alert.alert('Error', 'Failed to load player workouts');
    } finally {
      setLoadingPlayerData(false);
    }
  };

  // Load player nutrition/meals
  const loadPlayerNutrition = async (playerId: string) => {
    setLoadingPlayerData(true);
    try {
      const meals = await mealService.getUserMeals(playerId, 100);
      setPlayerMeals(meals);
      setShowNutritionModal(true);
    } catch (error) {
      console.error('❌ Error loading player nutrition:', error);
      Alert.alert('Error', 'Failed to load player nutrition data');
    } finally {
      setLoadingPlayerData(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 Refreshing team data...');
    setLoading(true);
    
    // Reload profile first
    try {
      if (user?.uid) {
        await fetchUserDoc(user.uid);
        console.log('✅ Profile reloaded from Firebase');
      }
    } catch (error) {
      console.error('❌ Error reloading profile:', error);
    }
    
    // Then reload team data
    if (profile?.teamId) {
      try {
        const team = await teamService.getTeamById(profile.teamId);
        setTeamData(team);
        console.log('✅ Team data refreshed:', team);
      } catch (error) {
        console.error('❌ Error refreshing team data:', error);
      }
    }
    
    setLoading(false);
  };
  
  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.teamInfoCard}>
        <View style={styles.teamHeader}>
          <View style={styles.teamIcon}>
            <IconSymbol name="sportscourt" size={32} color={BrandColors.accent} />
          </View>
          <View style={styles.teamDetails}>
            <Text style={[styles.teamName, { color: BrandColors.text }]}>
              {teamInfo.name}
            </Text>
            <Text style={[styles.teamDescription, { color: BrandColors.textSecondary }]}>
              {teamInfo.description}
            </Text>
          </View>
        </View>
        
        <View style={styles.codeSection}>
          <Text style={[styles.codeLabel, { color: BrandColors.text }]}>
            Team Code
          </Text>
          <View style={styles.codeContainer}>
            <Text style={[styles.codeText, { color: BrandColors.accent }]}>
              {teamInfo.code}
            </Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareCode}
            >
              <IconSymbol name="square.and.arrow.up" size={16} color={BrandColors.accent} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.codeInstructions, { color: BrandColors.textSecondary }]}>
            Share this code with players so they can join your team
          </Text>
        </View>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: BrandColors.accent }]}>
            {teamInfo.playerCount}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>
            Players
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: BrandColors.accent }]}>
            {(() => {
              // Count assignments with at least one pending player
              const activeCount = assignments.filter(assignment => {
                const assignedCount = assignment.assignedPlayers?.length || 0;
                const completedCount = assignment.completedBy?.length || 0;
                return assignedCount > completedCount; // Has players who haven't completed
              }).length;
              return activeCount;
            })()}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>
            Active Assignments
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: BrandColors.accent }]}>
            {(() => {
              // Calculate overall completion rate across all assignments
              if (assignments.length === 0 || teamInfo.playerCount === 0) {
                return '--';
              }
              
              let totalPossibleCompletions = 0;
              let totalActualCompletions = 0;
              
              assignments.forEach(assignment => {
                const assignedCount = assignment.assignedPlayers?.length || 0;
                const completedCount = assignment.completedBy?.length || 0;
                totalPossibleCompletions += assignedCount;
                totalActualCompletions += completedCount;
              });
              
              if (totalPossibleCompletions === 0) {
                return '0%';
              }
              
              const completionRate = Math.round((totalActualCompletions / totalPossibleCompletions) * 100);
              return `${completionRate}%`;
            })()}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>
            Completion Rate
          </Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: BrandColors.accent }]}>
            {(() => {
              // Calculate days active from team creation or first assignment
              if (!teamData?.createdAt) {
                return '0';
              }
              
              try {
                const createdDate = teamData.createdAt instanceof Date 
                  ? teamData.createdAt 
                  : (teamData.createdAt && typeof teamData.createdAt === 'object' && 'toDate' in teamData.createdAt && typeof (teamData.createdAt as any).toDate === 'function')
                    ? (teamData.createdAt as any).toDate() 
                    : new Date(teamData.createdAt as any);
                
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays > 0 ? diffDays : 1;
              } catch (error) {
                console.error('Error calculating days active:', error);
                return '0';
              }
            })()}
          </Text>
          <Text style={[styles.statLabel, { color: BrandColors.textSecondary }]}>
            Days Active
          </Text>
        </View>
      </View>
      
      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
          Quick Actions
        </Text>
        
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowWorkoutDatePicker(true)}
          >
            <IconSymbol name="plus.circle" size={24} color={BrandColors.accent} />
            <Text style={[styles.actionText, { color: BrandColors.text }]}>
              Assign Workout
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/nutrition')}
          >
            <IconSymbol name="fork.knife" size={24} color={BrandColors.accent} />
            <Text style={[styles.actionText, { color: BrandColors.text }]}>
              Create Meal Plan
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => Alert.alert('Coming Soon', 'Team challenges feature coming soon!')}
          >
            <IconSymbol name="trophy" size={24} color={BrandColors.accent} />
            <Text style={[styles.actionText, { color: BrandColors.text }]}>
              Create Challenge
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => Alert.alert('Coming Soon', 'Team chat feature coming soon!')}
          >
            <IconSymbol name="message" size={24} color={BrandColors.accent} />
            <Text style={[styles.actionText, { color: BrandColors.text }]}>
              Team Chat
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  const renderPlayers = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
        Team Players ({teamInfo.playerCount})
      </Text>
      
      {teamInfo.playerCount === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2" size={48} color={BrandColors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: BrandColors.text }]}>
            No Players Yet
          </Text>
          <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
            Share your team code with players to get started
          </Text>
        </View>
      ) : (
        teamInfo.players.map((player) => (
          <View key={player.id} style={styles.playerCard}>
            <View style={styles.playerInfo}>
              <View style={styles.playerAvatar}>
                <Text style={[styles.playerInitial, { color: BrandColors.text }]}>
                  {player.name.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.playerDetails}>
                <Text style={[styles.playerName, { color: BrandColors.text }]}>
                  {player.name}
                </Text>
                <Text style={[styles.playerPosition, { color: BrandColors.textSecondary }]}>
                  {player.position}
                </Text>
                <Text style={[styles.playerJoined, { color: BrandColors.textSecondary }]}>
                  Joined: {player.joinedAt}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.playerActions}
              onPress={() => {
                setSelectedPlayer({ id: player.id, name: player.name });
                setShowPlayerMenu(true);
              }}
            >
              <IconSymbol name="ellipsis" size={20} color={BrandColors.textSecondary} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
  
  const renderAssignments = () => {
    // Filter meal plans from coach's perspective
    // Completed = all assigned players have completed all 4 meals
    // Pending = at least one player hasn't completed all 4 meals
    const filteredMealPlans = mealPlanAssignments.filter(mealPlan => {
      const assignedCount = mealPlan.assignedPlayers?.length || 0;
      const completedCount = mealPlan.completedBy?.length || 0;
      const isFullyCompleted = assignedCount > 0 && completedCount >= assignedCount;

      if (assignmentFilter === 'completed') {
        return isFullyCompleted;
      } else if (assignmentFilter === 'pending') {
        return !isFullyCompleted && assignedCount > 0;
      }
      return true; // 'all' shows everything
    });
    
    // Filter workout assignments from coach's perspective
    // Completed = all assigned players have completed it
    // Pending = at least one player hasn't completed it
    const filteredAssignments = assignments.filter(assignment => {
      const assignedCount = assignment.assignedPlayers?.length || 0;
      const completedCount = assignment.completedBy?.length || 0;
      const isFullyCompleted = assignedCount > 0 && completedCount >= assignedCount;

      if (assignmentFilter === 'completed') {
        return isFullyCompleted;
      } else if (assignmentFilter === 'pending') {
        return !isFullyCompleted && assignedCount > 0;
      }
      return true; // 'all' shows everything
    });

    const completedMealPlans = mealPlanAssignments.filter(mp => {
      const assignedCount = mp.assignedPlayers?.length || 0;
      const completedCount = mp.completedBy?.length || 0;
      return assignedCount > 0 && completedCount >= assignedCount;
    }).length;
    
    const completedCount = assignments.filter(a => {
      const assignedCount = a.assignedPlayers?.length || 0;
      const completedCount = a.completedBy?.length || 0;
      return assignedCount > 0 && completedCount >= assignedCount;
    }).length;

    const pendingMealPlans = mealPlanAssignments.filter(mp => {
      const assignedCount = mp.assignedPlayers?.length || 0;
      const completedCount = mp.completedBy?.length || 0;
      return !(assignedCount > 0 && completedCount >= assignedCount) && assignedCount > 0;
    }).length;
    
    const pendingCount = assignments.filter(a => {
      const assignedCount = a.assignedPlayers?.length || 0;
      const completedCount = a.completedBy?.length || 0;
      return !(assignedCount > 0 && completedCount >= assignedCount) && assignedCount > 0;
    }).length;

    return (
      <View style={styles.tabContent}>
        <View style={styles.assignmentsHeader}>
          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
            Assigned Workouts & Meal Plans
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={loadAssignments}
            disabled={loadingAssignments}
          >
            <IconSymbol 
              name="arrow.clockwise" 
              size={20} 
              color={loadingAssignments ? BrandColors.textSecondary : BrandColors.accent} 
            />
          </TouchableOpacity>
        </View>

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
              All ({assignments.length + mealPlanAssignments.length})
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
              Pending ({pendingCount + pendingMealPlans})
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
              Completed ({completedCount + completedMealPlans})
            </Text>
          </TouchableOpacity>
        </View>
      
      {loadingAssignments ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateTitle, { color: BrandColors.text }]}>
            Loading assignments...
          </Text>
        </View>
      ) : assignments.length === 0 && mealPlanAssignments.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="list.bullet" size={48} color={BrandColors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: BrandColors.text }]}>
            No Assignments Yet
          </Text>
          <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
            Create and share workouts or meal plans with your players to see them here
          </Text>
        </View>
      ) : filteredAssignments.length === 0 && mealPlanAssignments.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="list.bullet" size={48} color={BrandColors.textSecondary} />
          <Text style={[styles.emptyStateTitle, { color: BrandColors.text }]}>
            No {assignmentFilter === 'all' ? '' : assignmentFilter} Assignments
          </Text>
          <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
            {assignmentFilter === 'all' 
              ? 'Create and share workouts with your players to see them here'
              : assignmentFilter === 'completed'
              ? 'No assignments have been fully completed by all players yet'
              : 'All assignments have been completed by all players'}
          </Text>
        </View>
      ) : (
        <>
          {/* Meal Plan Assignments Section */}
          {filteredMealPlans.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: BrandColors.text, marginTop: 0, marginBottom: 8 }]}>
                Meal Plans ({filteredMealPlans.length})
              </Text>
              {filteredMealPlans.map((mealPlan) => {
                const assignedCount = mealPlan.assignedPlayers?.length || 0;
                const completedCount = mealPlan.completedBy?.length || 0;
                const isFullyCompleted = assignedCount > 0 && completedCount >= assignedCount;
                
                return (
                <View key={mealPlan.id || mealPlan.mealPlanId} style={[styles.assignmentCard, { borderLeftWidth: 4, borderLeftColor: BrandColors.accent }]}>
                  <View style={styles.assignmentHeader}>
                    <View style={styles.assignmentInfo}>
                      <View style={styles.assignmentIcon}>
                        <IconSymbol name="fork.knife" size={20} color={BrandColors.accent} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 0 }}>
                        <Text 
                          style={[styles.assignmentTitle, { color: BrandColors.text }]}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {mealPlan.mealPlanName || 'Meal Plan'}
                        </Text>
                        <Text style={[styles.assignmentDetails, { color: BrandColors.textSecondary, marginTop: 2 }]}>
                          Assigned to {mealPlan.assignedPlayers?.length || 0} player{(mealPlan.assignedPlayers?.length || 0) !== 1 ? 's' : ''}
                        </Text>
                        <Text style={[styles.assignmentDue, { color: BrandColors.textSecondary, marginTop: 2 }]}>
                          {mealPlan.date ? new Date(mealPlan.date).toLocaleDateString() : 'No date'}
                        </Text>
                        {mealPlan.mealPlanData?.totalMacros && (
                          <Text style={[styles.assignmentDetails, { color: BrandColors.textSecondary, fontSize: 12, marginTop: 4 }]}>
                            {Math.round(mealPlan.mealPlanData.totalMacros.calories)} cal • {Math.round(mealPlan.mealPlanData.totalMacros.protein)}g protein
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.assignmentActions}>
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => {
                          if (!mealPlan.id && !mealPlan.mealPlanId) {
                            Alert.alert('Error', 'Meal plan ID not found. Cannot delete.');
                            return;
                          }
                          
                          Alert.alert(
                            'Delete Meal Plan',
                            'Are you sure you want to delete this meal plan assignment? This will remove it from all players.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Delete', 
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    const mealPlanIdToDelete = mealPlan.mealPlanId || mealPlan.id;
                                    if (!mealPlanIdToDelete) {
                                      Alert.alert('Error', 'Meal plan ID not found. Cannot delete.');
                                      return;
                                    }
                                    const success = await mealPlanSharingService.deleteMealPlanAssignment(mealPlanIdToDelete);
                                    if (success) {
                                      Alert.alert('Success', 'Meal plan assignment deleted successfully!');
                                      await loadAssignments();
                                    } else {
                                      Alert.alert('Error', 'Failed to delete meal plan assignment. Please try again.');
                                    }
                                  } catch (error) {
                                    Alert.alert('Error', 'An error occurred while deleting the assignment.');
                                  }
                                }
                              }
                            ]
                          );
                        }}
                      >
                        <IconSymbol name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.assignmentFooter}>
                    <Text style={[styles.assignmentDue, { color: BrandColors.textSecondary }]}>
                      Created: {mealPlan.createdAt ? new Date(mealPlan.createdAt).toLocaleDateString() : 'Unknown'}
                    </Text>
                    <View style={styles.pendingBadge}>
                      <Text style={[styles.pendingBadgeText, { color: BrandColors.textSecondary }]}>
                        Meal Plan
                      </Text>
                    </View>
                  </View>
                  
                  {/* Completion Status */}
                  {mealPlan.completedBy && mealPlan.completedBy.length > 0 && (
                    <View style={styles.completedBadge}>
                      <IconSymbol name="checkmark.circle.fill" size={16} color="#22c55e" />
                      <Text style={[styles.completedBadgeText, { color: '#22c55e' }]}>
                        {mealPlan.completedBy.length} of {mealPlan.assignedPlayers?.length || 0} Players Completed
                      </Text>
                    </View>
                  )}
                  
                  {/* Show individual player completion status if available */}
                  {mealPlan.completionStatus && Object.keys(mealPlan.completionStatus).length > 0 && (
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BrandColors.textSecondary + '20' }}>
                      <Text style={[styles.assignmentDetails, { color: BrandColors.textSecondary, fontSize: 11, marginBottom: 4 }]}>
                        Player Status:
                      </Text>
                      {Object.entries(mealPlan.completionStatus).map(([playerId, status]: [string, any]) => {
                        const playerName = mealPlan.assignedPlayerNames?.[mealPlan.assignedPlayers?.indexOf(playerId) || 0] || 'Player';
                        const isCompleted = status.completed || false;
                        const hasEdits = mealPlan.playerEdits?.[playerId] ? true : false;
                        
                        return (
                          <View key={playerId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text style={[styles.assignmentDetails, { color: BrandColors.text, fontSize: 12 }]}>
                              {playerName}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              {hasEdits && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <IconSymbol name="pencil" size={12} color={BrandColors.accent} />
                                  <Text style={[styles.assignmentDetails, { color: BrandColors.accent, fontSize: 10 }]}>
                                    Edited
                                  </Text>
                                </View>
                              )}
                              {isCompleted ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <IconSymbol name="checkmark.circle.fill" size={14} color="#22c55e" />
                                  <Text style={[styles.assignmentDetails, { color: '#22c55e', fontSize: 11 }]}>
                                    Complete
                                  </Text>
                                </View>
                              ) : (
                                <Text style={[styles.assignmentDetails, { color: BrandColors.textSecondary, fontSize: 11 }]}>
                                  Pending
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  
                  {/* Show player edits if available */}
                  {mealPlan.playerEdits && Object.keys(mealPlan.playerEdits).length > 0 && (
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BrandColors.textSecondary + '20' }}>
                      <Text style={[styles.assignmentDetails, { color: BrandColors.textSecondary, fontSize: 11, marginBottom: 4 }]}>
                        Player Edits:
                      </Text>
                      {Object.entries(mealPlan.playerEdits).map(([playerId, edit]: [string, any]) => {
                        const playerName = edit.playerName || 'Player';
                        const editDate = edit.editedAt ? new Date(edit.editedAt).toLocaleDateString() : 'Unknown';
                        
                        return (
                          <View key={playerId} style={{ marginTop: 4 }}>
                            <Text style={[styles.assignmentDetails, { color: BrandColors.text, fontSize: 12 }]}>
                              {playerName} edited on {editDate}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
                );
              })}
            </>
          )}

          {/* Workout Assignments Section */}
          {filteredAssignments.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: BrandColors.text, marginTop: mealPlanAssignments.length > 0 ? 12 : 0, marginBottom: 8 }]}>
                Workouts ({filteredAssignments.length})
              </Text>
              {filteredAssignments.map((assignment) => {
          const assignedCount = assignment.assignedPlayers?.length || 0;
          const completedCount = assignment.completedBy?.length || 0;
          const isFullyCompleted = assignedCount > 0 && completedCount >= assignedCount;
          
          return (
          <View key={assignment.id} style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <View style={styles.assignmentInfo}>
                <Text 
                  style={[styles.assignmentTitle, { color: BrandColors.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {assignment.workoutName}
                </Text>
                <Text style={[styles.assignmentDetails, { color: BrandColors.textSecondary, marginTop: 2 }]}>
                  Assigned to {assignment.assignedPlayers.length} player{assignment.assignedPlayers.length !== 1 ? 's' : ''}
                </Text>
                <Text style={[styles.assignmentDue, { color: BrandColors.textSecondary, marginTop: 2 }]}>
                  {new Date(assignment.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.assignmentActions}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => {
                    // Navigate to workout screen with assignment loaded for editing
                    if (!assignment.id) {
                      Alert.alert('Error', 'Assignment ID not found. Cannot edit.');
                      return;
                    }
                    
                    // Load the workout data into the workout store and navigate
                    const workoutData = assignment.workoutData;
                    if (workoutData) {
                      // Convert dates properly
                      let workoutDate: string;
                      const assignedDateObj = assignment.assignedDate ? convertToDate(assignment.assignedDate) : null;
                      const createdDateObj = assignment.createdAt ? convertToDate(assignment.createdAt) : null;
                      
                      if (assignedDateObj) {
                        workoutDate = assignedDateObj.toISOString().split('T')[0];
                      } else if (createdDateObj) {
                        workoutDate = createdDateObj.toISOString().split('T')[0];
                      } else {
                        workoutDate = new Date().toISOString().split('T')[0];
                      }
                      
                      // Convert assignment to workout format
                      const workoutToEdit: Workout = {
                        id: assignment.id,
                        title: assignment.workoutName,
                        date: workoutDate,
                        exercises: workoutData.exercises || [],
                        status: 'draft',
                      };
                      
                      // Use the workout store to set the workout
                      const { hydrateDraftWorkout, setSelectedDate } = useWorkoutStore.getState();
                      
                      // Set the date
                      if (assignedDateObj) {
                        setSelectedDate(assignedDateObj);
                      } else if (createdDateObj) {
                        setSelectedDate(createdDateObj);
                      }
                      
                      // Load the workout
                      hydrateDraftWorkout(workoutToEdit);
                      
                      // Navigate to workout screen
                      router.push({
                        pathname: '/(tabs)/workout',
                        params: { 
                          editAssignment: assignment.id,
                          assignmentId: assignment.id 
                        }
                      });
                    } else {
                      Alert.alert('Error', 'Workout data not found. Cannot edit.');
                    }
                  }}
                >
                  <IconSymbol name="pencil" size={16} color={BrandColors.accent} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => {
                    if (!assignment.id) {
                      Alert.alert('Error', 'Assignment ID not found. Cannot delete.');
                      return;
                    }
                    
                    Alert.alert(
                      'Delete Assignment',
                      'Are you sure you want to delete this workout assignment? This will remove it from all players.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Delete', 
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              const success = await workoutSharingService.deleteAssignedWorkout(assignment.id || '');
                              if (success) {
                                Alert.alert('Success', 'Workout assignment deleted successfully!');
                                await loadAssignments();
                              } else {
                                Alert.alert('Error', 'Failed to delete workout assignment. Please try again.');
                              }
                            } catch (error) {
                              Alert.alert('Error', 'An error occurred while deleting the assignment.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <IconSymbol name="trash" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.assignmentExercises}>
              <Text style={[styles.exercisesLabel, { color: BrandColors.textSecondary }]}>
                Exercises:
              </Text>
              {assignment.workoutData?.exercises?.slice(0, 3).map((exercise: any, index: number) => (
                <Text key={index} style={[styles.exerciseItem, { color: BrandColors.text }]}>
                  • {exercise.name} ({exercise.sets?.length || 0} sets)
                </Text>
              ))}
              {assignment.workoutData?.exercises?.length > 3 && (
                <Text style={[styles.moreExercises, { color: BrandColors.textSecondary }]}>
                  +{assignment.workoutData.exercises.length - 3} more exercises
                </Text>
              )}
            </View>
            
            {/* Completion status badge */}
            {isFullyCompleted && (
              <View style={styles.completedBadge}>
                <IconSymbol name="checkmark.circle.fill" size={16} color="#22c55e" />
                <Text style={[styles.completedBadgeText, { color: '#22c55e' }]}>
                  All Players Completed ({completedCount}/{assignedCount})
                </Text>
              </View>
            )}
            {!isFullyCompleted && assignedCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={[styles.pendingBadgeText, { color: BrandColors.textSecondary }]}>
                  {completedCount}/{assignedCount} Players Completed
                </Text>
              </View>
            )}
          </View>
          );
        })}
            </>
          )}
        </>
      )}
    </View>
    );
  };
  
  return (
    <>
    <SafeAreaView style={[styles.container, { backgroundColor: BrandColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: BrandColors.textSecondary + '20' }]}
          onPress={() => {
            // Navigate to community tab where coaches can access quick actions
            // Pass a param to prevent auto-redirect
            router.push({
              pathname: '/(tabs)/community',
              params: { fromTeamManagement: 'true' }
            });
          }}
        >
          <IconSymbol name="chevron.left" size={20} color={BrandColors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: BrandColors.text }]}>
          Team Management
        </Text>
        
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: BrandColors.textSecondary + '20' }]}
          onPress={handleRefresh}
        >
          <IconSymbol name="arrow.clockwise" size={20} color={BrandColors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.tabBar}>
        {[
          { key: 'overview', label: 'Overview', icon: 'chart.bar' },
          { key: 'players', label: 'Players', icon: 'person.2' },
          { key: 'assignments', label: 'Assignments', icon: 'list.bullet' },
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
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'players' && renderPlayers()}
        {activeTab === 'assignments' && renderAssignments()}
        {activeTab === 'chat' && (
          <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {chatLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={BrandColors.accent} />
                <Text style={[styles.emptyStateTitle, { color: BrandColors.text }]}>
                  Loading messages...
                </Text>
              </View>
            ) : chatMessages.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="message" size={48} color={BrandColors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: BrandColors.text }]}>
                  No messages yet
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: BrandColors.textSecondary }]}>
                  Be the first to start a conversation in your team!
                </Text>
              </View>
            ) : (
              <FlatList
                data={chatMessages}
                keyExtractor={(item) => item.id}
                style={styles.prScrollView}
                renderItem={({ item }) => (
                  <View style={[
                    styles.assignmentCard,
                    item.userId === user?.uid && { backgroundColor: BrandColors.accent + '20' }
                  ]}>
                    <View style={[
                      styles.assignmentInfo,
                      { 
                        backgroundColor: item.userId === user?.uid 
                          ? BrandColors.accent 
                          : BrandColors.gray800 
                      }
                    ]}>
                      <Text style={[
                        styles.assignmentTitle,
                        { color: '#FFFFFF' }
                      ]}>
                        {item.message}
                      </Text>
                    </View>
                    <Text style={[styles.assignmentDue, { color: BrandColors.textSecondary }]}>
                      {item.userName} • {formatTime(item.timestamp)}
                    </Text>
                  </View>
                )}
              />
            )}
            
            <View style={styles.menuContainer}>
              <TextInput
                style={[styles.codeText, { 
                  backgroundColor: BrandColors.gray800, 
                  color: BrandColors.text,
                  borderColor: BrandColors.textSecondary + '20'
                }]}
                placeholder="Type a message..."
                placeholderTextColor={BrandColors.textSecondary}
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: BrandColors.accent }]}
                onPress={handleSendChatMessage}
                disabled={!newMessage.trim()}
              >
                <IconSymbol 
                  name="paperplane.fill" 
                  size={16} 
                  color="#FFFFFF" 
                />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </ScrollView>

      {/* Player Menu Modal */}
      <Modal
        visible={showPlayerMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPlayerMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPlayerMenu(false)}
        >
          <View style={styles.menuContainer}>
            <Text style={[styles.menuTitle, { color: BrandColors.text }]}>
              {selectedPlayer?.name}
            </Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowPlayerMenu(false);
                if (selectedPlayer) {
                  loadPlayerProfile(selectedPlayer.id);
                }
              }}
            >
              <IconSymbol name="person.fill" size={20} color={BrandColors.accent} />
              <Text style={[styles.menuItemText, { color: BrandColors.text }]}>
                View Profile
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowPlayerMenu(false);
                if (selectedPlayer) {
                  loadPlayerWorkouts(selectedPlayer.id);
                }
              }}
            >
              <IconSymbol name="dumbbell.fill" size={20} color={BrandColors.accent} />
              <Text style={[styles.menuItemText, { color: BrandColors.text }]}>
                View Workouts
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowPlayerMenu(false);
                if (selectedPlayer) {
                  loadPlayerNutrition(selectedPlayer.id);
                }
              }}
            >
              <IconSymbol name="fork.knife" size={20} color={BrandColors.accent} />
              <Text style={[styles.menuItemText, { color: BrandColors.text }]}>
                View Nutrition
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.menuItem, styles.menuCancel]}
              onPress={() => setShowPlayerMenu(false)}
            >
              <Text style={[styles.menuItemText, { color: BrandColors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Player Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { backgroundColor: BrandColors.background }]}>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
              {selectedPlayer?.name}'s Profile
            </Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <IconSymbol name="xmark" size={24} color={BrandColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
            {loadingPlayerData ? (
              <ActivityIndicator size="large" color={BrandColors.accent} />
            ) : playerProfile ? (
              <View style={styles.profileSection}>
                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                    First Name:
                  </Text>
                  <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                    {playerProfile.firstName || 'N/A'}
                  </Text>
                </View>
                <View style={styles.profileRow}>
                  <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                    Email:
                  </Text>
                  <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                    {playerProfile.email || 'N/A'}
                  </Text>
                </View>
                {playerProfile.birthday && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Birthday:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.birthday instanceof Date 
                        ? playerProfile.birthday.toLocaleDateString() 
                        : new Date(playerProfile.birthday).toLocaleDateString()}
                    </Text>
                  </View>
                )}
                {playerProfile.height && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Height:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {typeof playerProfile.height === 'object' && playerProfile.height.value !== undefined
                        ? `${playerProfile.height.value} ${playerProfile.height.unit || ''}`
                        : String(playerProfile.height || 'N/A')}
                    </Text>
                  </View>
                )}
                {playerProfile.weight && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Weight:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {typeof playerProfile.weight === 'object' && playerProfile.weight.value !== undefined
                        ? `${playerProfile.weight.value} ${playerProfile.weight.unit || ''}`
                        : String(playerProfile.weight || 'N/A')}
                    </Text>
                  </View>
                )}
                {playerProfile.sex && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Sex:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.sex}
                    </Text>
                  </View>
                )}
                {playerProfile.primaryGoal && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Primary Goal:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.primaryGoal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                )}
                {playerProfile.exerciseExperience && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Experience Level:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.exerciseExperience.charAt(0).toUpperCase() + playerProfile.exerciseExperience.slice(1)}
                    </Text>
                  </View>
                )}
                {playerProfile.equipment && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Equipment Access:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.equipment.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                )}
                {playerProfile.weeklySchedule && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Days Per Week:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.weeklySchedule}
                    </Text>
                  </View>
                )}
                {playerProfile.injuries && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Injuries:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.injuries}
                    </Text>
                  </View>
                )}
                {playerProfile.institutionName && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Institution:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.institutionName}
                    </Text>
                  </View>
                )}
                {playerProfile.institutionSport && (
                  <View style={styles.profileRow}>
                    <Text style={[styles.profileLabel, { color: BrandColors.textSecondary }]}>
                      Sport:
                    </Text>
                    <Text style={[styles.profileValue, { color: BrandColors.text }]}>
                      {playerProfile.institutionSport}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                No profile data available
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Player Workouts Modal */}
      <Modal
        visible={showWorkoutsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWorkoutsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { backgroundColor: BrandColors.background }]}>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
              {selectedPlayer?.name}'s Progress
            </Text>
            <TouchableOpacity onPress={() => setShowWorkoutsModal(false)}>
              <IconSymbol name="xmark" size={24} color={BrandColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
            {loadingPlayerData ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BrandColors.accent} />
              </View>
            ) : playerWorkouts.length > 0 ? (
              <>
                {/* Progress Summary Section */}
                {(() => {
                  try {
                    const convertedWorkouts = playerWorkouts
                      .filter(w => w && w.completedAt)
                      .map(convertWorkoutDocumentToWorkout)
                      .filter((w): w is Workout => w !== null && w !== undefined);
                    
                    if (convertedWorkouts.length === 0) {
                      return (
                        <View style={styles.emptyState}>
                          <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                            No completed workouts yet
                          </Text>
                        </View>
                      );
                    }
                    
                    const consistencyScore = calculateConsistencyScore(convertedWorkouts);
                    const personalRecords = calculatePersonalRecords(convertedWorkouts);
                    const streakData = getStreakData(convertedWorkouts);
                    const trendData = calculateTrendData(convertedWorkouts, '4W');
                    
                    // Calculate volume trend by comparing recent vs older workouts
                    let volumeTrend = 0;
                    if (convertedWorkouts.length >= 4) {
                      const recentWorkouts = convertedWorkouts.slice(0, Math.ceil(convertedWorkouts.length / 2));
                      const olderWorkouts = convertedWorkouts.slice(Math.ceil(convertedWorkouts.length / 2));
                      
                      const recentVolume = recentWorkouts.reduce((total, w) => {
                        return total + w.exercises.reduce((exTotal, ex) => {
                          return exTotal + ex.sets.reduce((setTotal, set) => {
                            return setTotal + ((set.weight || 0) * (set.reps || 0));
                          }, 0);
                        }, 0);
                      }, 0);
                      
                      const olderVolume = olderWorkouts.reduce((total, w) => {
                        return total + w.exercises.reduce((exTotal, ex) => {
                          return exTotal + ex.sets.reduce((setTotal, set) => {
                            return setTotal + ((set.weight || 0) * (set.reps || 0));
                          }, 0);
                        }, 0);
                      }, 0);
                      
                      if (olderVolume > 0) {
                        volumeTrend = ((recentVolume - olderVolume) / olderVolume) * 100;
                      }
                    }
                    
                    // Calculate workout frequency
                    const totalWorkouts = convertedWorkouts.length;
                    const workoutsThisWeek = convertedWorkouts.filter(w => {
                      const workoutDate = new Date(w.date);
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return workoutDate >= weekAgo;
                    }).length;
                    
                    const workoutsThisMonth = convertedWorkouts.filter(w => {
                      const workoutDate = new Date(w.date);
                      const monthAgo = new Date();
                      monthAgo.setDate(monthAgo.getDate() - 30);
                      return workoutDate >= monthAgo;
                    }).length;
                    
                    // Calculate average workout frequency per week
                    const oldestWorkout = convertedWorkouts.length > 0 
                      ? new Date(convertedWorkouts[convertedWorkouts.length - 1].date)
                      : new Date();
                    const daysSinceFirst = Math.max(1, Math.floor((new Date().getTime() - oldestWorkout.getTime()) / (1000 * 60 * 60 * 24)));
                    const weeksSinceFirst = daysSinceFirst / 7;
                    const avgWorkoutsPerWeek = weeksSinceFirst > 0 ? totalWorkouts / weeksSinceFirst : 0;
                    
                    // Analyze strength progression
                    const strengthProgress = personalRecords.length > 0 ? 'positive' : 
                      convertedWorkouts.length >= 4 ? 'developing' : 'insufficient_data';
                    
                    // Calculate activity level
                    let activityLevel = 'Low';
                    let activityColor = BrandColors.textSecondary;
                    if (workoutsThisWeek >= 4) {
                      activityLevel = 'Excellent';
                      activityColor = '#22c55e';
                    } else if (workoutsThisWeek >= 3) {
                      activityLevel = 'Good';
                      activityColor = BrandColors.accent;
                    } else if (workoutsThisWeek >= 2) {
                      activityLevel = 'Moderate';
                      activityColor = '#fbbf24';
                    } else if (workoutsThisWeek >= 1) {
                      activityLevel = 'Low';
                      activityColor = '#f59e0b';
                    } else {
                      activityLevel = 'Inactive';
                      activityColor = '#ef4444';
                    }
                    
                    // Determine overall performance status
                    let performanceStatus = 'Maintaining';
                    let performanceColor = BrandColors.textSecondary;
                    let performanceMessage = 'Player is maintaining their activity level.';
                    
                    if (volumeTrend > 10 && workoutsThisWeek >= 3) {
                      performanceStatus = 'Improving';
                      performanceColor = '#22c55e';
                      performanceMessage = 'Player is showing strong improvement in both volume and consistency.';
                    } else if (volumeTrend > 5 && personalRecords.length > 0) {
                      performanceStatus = 'Progressing';
                      performanceColor = BrandColors.accent;
                      performanceMessage = 'Player is making steady progress with new personal records.';
                    } else if (volumeTrend > 0) {
                      performanceStatus = 'Improving';
                      performanceColor = '#22c55e';
                      performanceMessage = 'Player is increasing training volume.';
                    } else if (volumeTrend < -10) {
                      performanceStatus = 'Declining';
                      performanceColor = '#ef4444';
                      performanceMessage = 'Player training volume has decreased significantly. Consider checking in.';
                    } else if (workoutsThisWeek === 0 && streakData.current === 0) {
                      performanceStatus = 'Inactive';
                      performanceColor = '#ef4444';
                      performanceMessage = 'Player has not worked out recently. May need motivation.';
                    } else if (consistencyScore.score < 50) {
                      performanceStatus = 'Inconsistent';
                      performanceColor = '#f59e0b';
                      performanceMessage = 'Player needs to improve workout consistency.';
                    }
                    
                    // Determine if player is progressing
                    const isProgressing = volumeTrend > 0 || personalRecords.length > 0;
                    const progressIndicator = volumeTrend > 0 ? '📈' : volumeTrend < 0 ? '📉' : '➡️';
                    
                    return (
                    <>
                      <View style={[styles.progressSummaryCard, { backgroundColor: BrandColors.surface, borderColor: BrandColors.accent }]}>
                        <Text style={[styles.progressSummaryTitle, { color: BrandColors.text }]}>
                          Performance Analysis
                        </Text>
                        
                        {/* Overall Performance Status */}
                        <View style={[styles.performanceStatusCard, { backgroundColor: performanceColor + '20', borderColor: performanceColor }]}>
                          <View style={styles.performanceStatusHeader}>
                            <Text style={[styles.performanceStatusIcon]}>
                              {performanceStatus === 'Improving' || performanceStatus === 'Progressing' ? '🚀' :
                               performanceStatus === 'Declining' || performanceStatus === 'Inactive' ? '⚠️' :
                               performanceStatus === 'Inconsistent' ? '📊' : '➡️'}
                            </Text>
                            <View style={styles.performanceStatusContent}>
                              <Text style={[styles.performanceStatusTitle, { color: performanceColor }]}>
                                {performanceStatus}
                              </Text>
                              <Text style={[styles.performanceStatusMessage, { color: BrandColors.text }]}>
                                {performanceMessage}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        {/* Key Metrics Grid */}
                        <View style={styles.metricsGrid}>
                          <View style={[styles.metricCard, { backgroundColor: BrandColors.background }]}>
                            <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
                              Consistency Score
                            </Text>
                            <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
                              {consistencyScore.score}/100
                            </Text>
                            <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
                              {consistencyScore.score >= 80 ? 'Excellent' :
                               consistencyScore.score >= 60 ? 'Good' :
                               consistencyScore.score >= 40 ? 'Fair' : 'Needs Improvement'}
                            </Text>
                          </View>
                          
                          <View style={[styles.metricCard, { backgroundColor: BrandColors.background }]}>
                            <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
                              Current Streak
                            </Text>
                            <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
                              {streakData.current} days
                            </Text>
                            <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
                              Best: {streakData.longest} days
                            </Text>
                          </View>
                          
                          <View style={[styles.metricCard, { backgroundColor: BrandColors.background }]}>
                            <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
                              This Week
                            </Text>
                            <Text style={[styles.metricValue, { color: activityColor }]}>
                              {workoutsThisWeek} workouts
                            </Text>
                            <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
                              {activityLevel} Activity
                            </Text>
                          </View>
                          
                          <View style={[styles.metricCard, { backgroundColor: BrandColors.background }]}>
                            <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
                              Avg/Week
                            </Text>
                            <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
                              {Math.round(avgWorkoutsPerWeek * 10) / 10}
                            </Text>
                            <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
                              {totalWorkouts} total workouts
                            </Text>
                          </View>
                        </View>
                        
                        {/* Volume Trend */}
                        <View style={[styles.trendCard, { backgroundColor: BrandColors.background }]}>
                          <View style={styles.trendHeader}>
                            <Text style={[styles.trendLabel, { color: BrandColors.text }]}>
                              Training Volume Trend
                            </Text>
                            <Text style={[styles.trendIcon]}>
                              {progressIndicator}
                            </Text>
                          </View>
                          <Text style={[styles.trendValue, { 
                            color: volumeTrend > 0 ? '#22c55e' : 
                                   volumeTrend < 0 ? '#ef4444' : 
                                   BrandColors.textSecondary 
                          }]}>
                            {volumeTrend > 0 
                              ? `+${Math.round(volumeTrend)}% increase` 
                              : volumeTrend < 0
                              ? `${Math.round(volumeTrend)}% decrease`
                              : 'Volume stable'}
                          </Text>
                          <Text style={[styles.trendDescription, { color: BrandColors.textSecondary }]}>
                            {volumeTrend > 10 
                              ? 'Significant volume increase - player is pushing harder'
                              : volumeTrend > 0
                              ? 'Gradual volume increase - steady progress'
                              : volumeTrend < -10
                              ? 'Volume decreased - may indicate fatigue or reduced motivation'
                              : volumeTrend < 0
                              ? 'Slight volume decrease - monitor closely'
                              : 'Volume is consistent - maintaining current level'}
                          </Text>
                        </View>
                        
                        {/* Insights & Recommendations */}
                        <View style={[styles.insightsCard, { backgroundColor: BrandColors.background }]}>
                          <Text style={[styles.insightsTitle, { color: BrandColors.text }]}>
                            Insights & Recommendations
                          </Text>
                          
                          <View style={styles.insightsList}>
                            {workoutsThisWeek === 0 && (
                              <View style={styles.insightItem}>
                                <Text style={[styles.insightIcon]}>⚠️</Text>
                                <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                  No workouts this week - player may need motivation or support
                                </Text>
                              </View>
                            )}
                            
                            {consistencyScore.score < 50 && (
                              <View style={styles.insightItem}>
                                <Text style={[styles.insightIcon]}>📊</Text>
                                <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                  Low consistency - recommend setting a weekly workout schedule
                                </Text>
                              </View>
                            )}
                            
                            {volumeTrend > 15 && (
                              <View style={styles.insightItem}>
                                <Text style={[styles.insightIcon]}>💪</Text>
                                <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                  Strong volume increase - ensure proper recovery and nutrition
                                </Text>
                              </View>
                            )}
                            
                            {personalRecords.length > 0 && (
                              <View style={styles.insightItem}>
                                <Text style={[styles.insightIcon]}>🏆</Text>
                                <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                  {personalRecords.length} personal record{personalRecords.length !== 1 ? 's' : ''} set - player is getting stronger
                                </Text>
                              </View>
                            )}
                            
                            {streakData.current >= 7 && (
                              <View style={styles.insightItem}>
                                <Text style={[styles.insightIcon]}>🔥</Text>
                                <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                  {streakData.current}-day streak - excellent momentum!
                                </Text>
                              </View>
                            )}
                            
                            {avgWorkoutsPerWeek >= 4 && (
                              <View style={styles.insightItem}>
                                <Text style={[styles.insightIcon]}>✅</Text>
                                <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                  Consistent weekly training - maintaining good habits
                                </Text>
                              </View>
                            )}
                            
                            {volumeTrend < -10 && workoutsThisWeek > 0 && (
                              <View style={styles.insightItem}>
                                <Text style={[styles.insightIcon]}>📉</Text>
                                <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                  Volume decreased - may need deload week or injury check
                                </Text>
                              </View>
                            )}
                            
                            {convertedWorkouts.length > 0 && personalRecords.length === 0 && avgWorkoutsPerWeek >= 3 && (
                              <View style={styles.insightItem}>
                                <Text style={[styles.insightIcon]}>💡</Text>
                                <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                  Consistent training but no PRs - consider progressive overload focus
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        
                        {/* Personal Records */}
                        {personalRecords.length > 0 && (
                          <View style={styles.personalRecordsSection}>
                            <Text style={[styles.personalRecordsTitle, { color: BrandColors.text }]}>
                              Personal Records ({personalRecords.length})
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prScrollView}>
                              {personalRecords.slice(0, 8).map((pr) => (
                                <View key={pr.id} style={[styles.prBadge, { backgroundColor: BrandColors.accent + '20', borderColor: BrandColors.accent + '40' }]}>
                                  <Text style={[styles.prExercise, { color: BrandColors.accent }]} numberOfLines={1}>
                                    {pr.exercise}
                                  </Text>
                                  <Text style={[styles.prWeight, { color: BrandColors.text }]}>
                                    {pr.weight}lbs × {pr.reps}
                                  </Text>
                                  <Text style={[styles.prDate, { color: BrandColors.textSecondary }]}>
                                    {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </Text>
                                </View>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                      
                      {/* Workouts List */}
                      <View style={styles.workoutsSection}>
                        <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                          All Workouts ({playerWorkouts.length})
                        </Text>
                        {playerWorkouts
                          .sort((a, b) => {
                            const dateA = a.completedAt || a.createdAt;
                            const dateB = b.completedAt || b.createdAt;
                            return new Date(dateB).getTime() - new Date(dateA).getTime();
                          })
                          .map((workout) => (
                            <View key={workout.id} style={[styles.workoutCard, { backgroundColor: BrandColors.surface }]}>
                              <View style={styles.workoutCardHeader}>
                                <Text style={[styles.workoutTitle, { color: BrandColors.text }]}>
                                  {workout.name || 'Untitled Workout'}
                                </Text>
                                {workout.completedAt && (
                                  <View style={[styles.completedBadge, { backgroundColor: '#22c55e' + '20' }]}>
                                    <IconSymbol name="checkmark.circle.fill" size={14} color="#22c55e" />
                                    <Text style={[styles.completedText, { color: '#22c55e' }]}>
                                      Completed
                                    </Text>
                                  </View>
                                )}
                              </View>
                              
                              <Text style={[styles.workoutDate, { color: BrandColors.textSecondary }]}>
                                {workout.completedAt 
                                  ? new Date(workout.completedAt).toLocaleDateString('en-US', { 
                                      weekday: 'short', 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                                  : workout.createdAt
                                  ? new Date(workout.createdAt).toLocaleDateString()
                                  : 'No date'}
                              </Text>
                              
                              {workout.exercises && workout.exercises.length > 0 && (
                                <View style={styles.workoutDetails}>
                                  <Text style={[styles.workoutExercises, { color: BrandColors.textSecondary }]}>
                                    {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
                                  </Text>
                                  {workout.duration && (
                                    <Text style={[styles.workoutDuration, { color: BrandColors.textSecondary }]}>
                                      • {workout.duration} min
                                    </Text>
                                  )}
                                </View>
                              )}
                              
                              {workout.notes && (
                                <Text style={[styles.workoutNotes, { color: BrandColors.textSecondary }]}>
                                  {workout.notes}
                                </Text>
                              )}
                            </View>
                          ))}
                      </View>
                    </>
                    );
                  } catch (error) {
                    console.error('Error calculating progress:', error);
                    return (
                      <View style={styles.emptyState}>
                        <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                          Error calculating progress data
                        </Text>
                      </View>
                    );
                  }
                })()}
              </>
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="dumbbell" size={48} color={BrandColors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                  No workouts found
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: BrandColors.textSecondary }]}>
                  This player hasn't logged any workouts yet
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Player Nutrition Modal */}
      <Modal
        visible={showNutritionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNutritionModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { backgroundColor: BrandColors.background }]}>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
              {selectedPlayer?.name}'s Nutrition Progress
            </Text>
            <TouchableOpacity onPress={() => setShowNutritionModal(false)}>
              <IconSymbol name="xmark" size={24} color={BrandColors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
            {loadingPlayerData ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BrandColors.accent} />
              </View>
            ) : playerMeals.length > 0 ? (
              <>
                {/* Nutrition Progress Summary Section */}
                {(() => {
                  try {
                    // Group meals by date
                    const mealsByDate: Record<string, MealDocument[]> = {};
                    playerMeals.forEach(meal => {
                      const date = meal.createdAt 
                        ? new Date(meal.createdAt).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0];
                      if (!mealsByDate[date]) {
                        mealsByDate[date] = [];
                      }
                      mealsByDate[date].push(meal);
                    });

                    // Calculate daily totals
                    const dailyTotals = Object.entries(mealsByDate).map(([date, meals]) => {
                      const total = meals.reduce((acc, meal) => {
                        const macros = (meal as any).totalMacros || {
                          calories: (meal as any).calories || 0,
                          protein: (meal as any).protein || 0,
                          carbs: (meal as any).carbs || 0,
                          fat: (meal as any).fat || 0,
                        };
                        return {
                          calories: acc.calories + (macros.calories || 0),
                          protein: acc.protein + (macros.protein || 0),
                          carbs: acc.carbs + (macros.carbs || 0),
                          fat: acc.fat + (macros.fat || 0),
                        };
                      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

                      return { date, ...total, mealCount: meals.length };
                    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (dailyTotals.length === 0) {
                      return (
                        <View style={styles.emptyState}>
                          <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                            No nutrition data available
                          </Text>
                        </View>
                      );
                    }

                    // Calculate averages
                    const avgCalories = dailyTotals.reduce((sum, day) => sum + day.calories, 0) / dailyTotals.length;
                    const avgProtein = dailyTotals.reduce((sum, day) => sum + day.protein, 0) / dailyTotals.length;
                    const avgCarbs = dailyTotals.reduce((sum, day) => sum + day.carbs, 0) / dailyTotals.length;
                    const avgFat = dailyTotals.reduce((sum, day) => sum + day.fat, 0) / dailyTotals.length;

                    // Calculate consistency (days with meals logged)
                    const now = new Date();
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    
                    const daysThisWeek = dailyTotals.filter(d => new Date(d.date) >= weekAgo).length;
                    const daysThisMonth = dailyTotals.filter(d => new Date(d.date) >= monthAgo).length;
                    
                    // Calculate streak (consecutive days with meals)
                    let currentStreak = 0;
                    let longestStreak = 0;
                    let tempStreak = 0;
                    const sortedDates = dailyTotals.map(d => d.date).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                    
                    for (let i = 0; i < sortedDates.length; i++) {
                      const date = new Date(sortedDates[i]);
                      const yesterday = new Date(date);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const yesterdayStr = yesterday.toISOString().split('T')[0];
                      
                      if (i === 0) {
                        // Check if today or yesterday
                        const today = new Date().toISOString().split('T')[0];
                        const yesterdayToday = yesterday.toISOString().split('T')[0];
                        if (sortedDates[0] === today || sortedDates[0] === yesterdayToday) {
                          tempStreak = 1;
                          if (i === 0) currentStreak = 1;
                        }
                      } else {
                        const prevDate = sortedDates[i - 1];
                        const expectedDate = new Date(date);
                        expectedDate.setDate(expectedDate.getDate() + 1);
                        const expectedDateStr = expectedDate.toISOString().split('T')[0];
                        
                        if (prevDate === expectedDateStr) {
                          tempStreak++;
                          if (i === 0) currentStreak = tempStreak;
                        } else {
                          longestStreak = Math.max(longestStreak, tempStreak);
                          tempStreak = 1;
                        }
                      }
                    }
                    longestStreak = Math.max(longestStreak, tempStreak);

                    // Calculate trend (recent vs older)
                    const recentDays = dailyTotals.slice(0, Math.ceil(dailyTotals.length / 2));
                    const olderDays = dailyTotals.slice(Math.ceil(dailyTotals.length / 2));
                    
                    const recentAvgCalories = recentDays.length > 0 
                      ? recentDays.reduce((sum, d) => sum + d.calories, 0) / recentDays.length 
                      : 0;
                    const olderAvgCalories = olderDays.length > 0 
                      ? olderDays.reduce((sum, d) => sum + d.calories, 0) / olderDays.length 
                      : 0;
                    
                    const calorieTrend = olderAvgCalories > 0 
                      ? ((recentAvgCalories - olderAvgCalories) / olderAvgCalories) * 100 
                      : 0;

                    // Calculate consistency score
                    const targetDaysPerWeek = 7;
                    const consistencyScore = Math.min(100, Math.round((daysThisWeek / targetDaysPerWeek) * 100));

                    // Determine activity level
                    let activityLevel = 'Low';
                    let activityColor = BrandColors.textSecondary;
                    if (daysThisWeek >= 7) {
                      activityLevel = 'Excellent';
                      activityColor = '#22c55e';
                    } else if (daysThisWeek >= 5) {
                      activityLevel = 'Good';
                      activityColor = BrandColors.accent;
                    } else if (daysThisWeek >= 3) {
                      activityLevel = 'Moderate';
                      activityColor = '#fbbf24';
                    } else if (daysThisWeek >= 1) {
                      activityLevel = 'Low';
                      activityColor = '#f59e0b';
                    } else {
                      activityLevel = 'Inactive';
                      activityColor = '#ef4444';
                    }

                    // Determine performance status
                    let performanceStatus = 'Maintaining';
                    let performanceColor = BrandColors.textSecondary;
                    let performanceMessage = 'Player is maintaining their nutrition logging.';
                    
                    if (daysThisWeek >= 6 && consistencyScore >= 80) {
                      performanceStatus = 'Excellent';
                      performanceColor = '#22c55e';
                      performanceMessage = 'Player is consistently logging meals and maintaining good nutrition habits.';
                    } else if (daysThisWeek >= 4 && calorieTrend > -5) {
                      performanceStatus = 'Good';
                      performanceColor = BrandColors.accent;
                      performanceMessage = 'Player is maintaining regular meal logging.';
                    } else if (daysThisWeek < 3) {
                      performanceStatus = 'Needs Improvement';
                      performanceColor = '#f59e0b';
                      performanceMessage = 'Player needs to log meals more consistently.';
                    } else if (daysThisWeek === 0) {
                      performanceStatus = 'Inactive';
                      performanceColor = '#ef4444';
                      performanceMessage = 'Player has not logged meals recently. May need encouragement.';
                    }

                    return (
                      <>
                        <View style={[styles.progressSummaryCard, { backgroundColor: BrandColors.surface, borderColor: BrandColors.accent }]}>
                          <Text style={[styles.progressSummaryTitle, { color: BrandColors.text }]}>
                            Nutrition Analysis
                          </Text>
                          
                          {/* Overall Performance Status */}
                          <View style={[styles.performanceStatusCard, { backgroundColor: performanceColor + '20', borderColor: performanceColor }]}>
                            <View style={styles.performanceStatusHeader}>
                              <Text style={[styles.performanceStatusIcon]}>
                                {performanceStatus === 'Excellent' ? '🌟' :
                                 performanceStatus === 'Good' ? '✅' :
                                 performanceStatus === 'Needs Improvement' ? '📊' :
                                 performanceStatus === 'Inactive' ? '⚠️' : '➡️'}
                              </Text>
                              <View style={styles.performanceStatusContent}>
                                <Text style={[styles.performanceStatusTitle, { color: performanceColor }]}>
                                  {performanceStatus}
                                </Text>
                                <Text style={[styles.performanceStatusMessage, { color: BrandColors.text }]}>
                                  {performanceMessage}
                                </Text>
                              </View>
                            </View>
                          </View>
                          
                          {/* Key Metrics Grid */}
                          <View style={styles.metricsGrid}>
                            <View style={[styles.metricCard, { backgroundColor: BrandColors.background }]}>
                              <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
                                Consistency Score
                              </Text>
                              <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
                                {consistencyScore}/100
                              </Text>
                              <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
                                {daysThisWeek} days this week
                              </Text>
                            </View>
                            
                            <View style={[styles.metricCard, { backgroundColor: BrandColors.background }]}>
                              <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
                                Logging Streak
                              </Text>
                              <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
                                {currentStreak} days
                              </Text>
                              <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
                                Best: {longestStreak} days
                              </Text>
                            </View>
                            
                            <View style={[styles.metricCard, { backgroundColor: BrandColors.background }]}>
                              <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
                                This Week
                              </Text>
                              <Text style={[styles.metricValue, { color: activityColor }]}>
                                {daysThisWeek} days
                              </Text>
                              <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
                                {activityLevel} Activity
                              </Text>
                            </View>
                            
                            <View style={[styles.metricCard, { backgroundColor: BrandColors.background }]}>
                              <Text style={[styles.metricLabel, { color: BrandColors.textSecondary }]}>
                                Total Days Logged
                              </Text>
                              <Text style={[styles.metricValue, { color: BrandColors.accent }]}>
                                {dailyTotals.length}
                              </Text>
                              <Text style={[styles.metricSubtext, { color: BrandColors.textSecondary }]}>
                                {daysThisMonth} this month
                              </Text>
                            </View>
                          </View>
                          
                          {/* Average Macros */}
                          <View style={[styles.trendCard, { backgroundColor: BrandColors.background }]}>
                            <Text style={[styles.trendLabel, { color: BrandColors.text }]}>
                              Average Daily Macros
                            </Text>
                            <View style={styles.macroRow}>
                              <Text style={[styles.macroText, { color: BrandColors.text }]}>
                                Calories: {Math.round(avgCalories)}
                              </Text>
                              <Text style={[styles.macroText, { color: BrandColors.text }]}>
                                Protein: {Math.round(avgProtein)}g
                              </Text>
                            </View>
                            <View style={styles.macroRow}>
                              <Text style={[styles.macroText, { color: BrandColors.text }]}>
                                Carbs: {Math.round(avgCarbs)}g
                              </Text>
                              <Text style={[styles.macroText, { color: BrandColors.text }]}>
                                Fat: {Math.round(avgFat)}g
                              </Text>
                            </View>
                          </View>
                          
                          {/* Calorie Trend */}
                          <View style={[styles.trendCard, { backgroundColor: BrandColors.background }]}>
                            <View style={styles.trendHeader}>
                              <Text style={[styles.trendLabel, { color: BrandColors.text }]}>
                                Calorie Trend
                              </Text>
                              <Text style={[styles.trendIcon]}>
                                {calorieTrend > 0 ? '📈' : calorieTrend < 0 ? '📉' : '➡️'}
                              </Text>
                            </View>
                            <Text style={[styles.trendValue, { 
                              color: calorieTrend > 5 ? '#22c55e' : 
                                     calorieTrend < -5 ? '#ef4444' : 
                                     BrandColors.textSecondary 
                            }]}>
                              {calorieTrend > 0 
                                ? `+${Math.round(calorieTrend)}% increase` 
                                : calorieTrend < 0
                                ? `${Math.round(calorieTrend)}% decrease`
                                : 'Calories stable'}
                            </Text>
                            <Text style={[styles.trendDescription, { color: BrandColors.textSecondary }]}>
                              {calorieTrend > 10 
                                ? 'Significant calorie increase - monitor for goal alignment'
                                : calorieTrend > 0
                                ? 'Gradual calorie increase - steady progress'
                                : calorieTrend < -10
                                ? 'Calorie decrease - may indicate reduced intake or logging'
                                : calorieTrend < 0
                                ? 'Slight calorie decrease'
                                : 'Calorie intake is consistent'}
                            </Text>
                          </View>
                          
                          {/* Insights & Recommendations */}
                          <View style={[styles.insightsCard, { backgroundColor: BrandColors.background }]}>
                            <Text style={[styles.insightsTitle, { color: BrandColors.text }]}>
                              Insights & Recommendations
                            </Text>
                            
                            <View style={styles.insightsList}>
                              {daysThisWeek === 0 && (
                                <View style={styles.insightItem}>
                                  <Text style={[styles.insightIcon]}>⚠️</Text>
                                  <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                    No meals logged this week - player may need encouragement or reminders
                                  </Text>
                                </View>
                              )}
                              
                              {consistencyScore < 50 && (
                                <View style={styles.insightItem}>
                                  <Text style={[styles.insightIcon]}>📊</Text>
                                  <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                    Low consistency - recommend setting daily meal logging reminders
                                  </Text>
                                </View>
                              )}
                              
                              {currentStreak >= 7 && (
                                <View style={styles.insightItem}>
                                  <Text style={[styles.insightIcon]}>🔥</Text>
                                  <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                    {currentStreak}-day logging streak - excellent habit formation!
                                  </Text>
                                </View>
                              )}
                              
                              {daysThisWeek >= 6 && (
                                <View style={styles.insightItem}>
                                  <Text style={[styles.insightIcon]}>✅</Text>
                                  <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                    Consistent meal logging - player is maintaining good nutrition tracking habits
                                  </Text>
                                </View>
                              )}
                              
                              {avgProtein < 100 && avgProtein > 0 && (
                                <View style={styles.insightItem}>
                                  <Text style={[styles.insightIcon]}>💪</Text>
                                  <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                    Average protein intake is {Math.round(avgProtein)}g - consider protein-focused recommendations
                                  </Text>
                                </View>
                              )}
                              
                              {calorieTrend > 15 && (
                                <View style={styles.insightItem}>
                                  <Text style={[styles.insightIcon]}>📈</Text>
                                  <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                    Significant calorie increase - verify alignment with goals
                                  </Text>
                                </View>
                              )}
                              
                              {calorieTrend < -15 && (
                                <View style={styles.insightItem}>
                                  <Text style={[styles.insightIcon]}>📉</Text>
                                  <Text style={[styles.insightText, { color: BrandColors.text }]}>
                                    Significant calorie decrease - check for potential issues or goal changes
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        
                        {/* Recent Meals List */}
                        <View style={styles.workoutsSection}>
                          <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                            Recent Meals ({playerMeals.length})
                          </Text>
                          {playerMeals
                            .sort((a, b) => {
                              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                              return dateB - dateA;
                            })
                            .slice(0, 20)
                            .map((meal) => (
                              <View key={meal.id} style={[styles.mealCard, { backgroundColor: BrandColors.surface }]}>
                                <View style={styles.workoutCardHeader}>
                                  <Text style={[styles.mealTitle, { color: BrandColors.text }]}>
                                    {meal.name || 'Meal'}
                                  </Text>
                                  {meal.type && (
                                    <View style={[styles.completedBadge, { backgroundColor: BrandColors.accent + '20' }]}>
                                      <Text style={[styles.completedText, { color: BrandColors.accent }]}>
                                        {meal.type === 'breakfast' ? '🌅' : 
                                         meal.type === 'lunch' ? '☀️' : 
                                         meal.type === 'dinner' ? '🌙' : '🍎'} {meal.type}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                
                                <Text style={[styles.mealDate, { color: BrandColors.textSecondary }]}>
                                  {meal.createdAt 
                                    ? new Date(meal.createdAt).toLocaleDateString('en-US', { 
                                        weekday: 'short', 
                                        month: 'short', 
                                        day: 'numeric',
                                        year: 'numeric'
                                      })
                                    : 'No date'}
                                </Text>
                                
                                <View style={styles.macroRow}>
                                  <Text style={[styles.macroText, { color: BrandColors.textSecondary }]}>
                                    Calories: {(meal as any).calories || (meal as any).totalMacros?.calories || 0}
                                  </Text>
                                  <Text style={[styles.macroText, { color: BrandColors.textSecondary }]}>
                                    Protein: {(meal as any).protein || (meal as any).totalMacros?.protein || 0}g
                                  </Text>
                                </View>
                                <View style={styles.macroRow}>
                                  <Text style={[styles.macroText, { color: BrandColors.textSecondary }]}>
                                    Carbs: {(meal as any).carbs || (meal as any).totalMacros?.carbs || 0}g
                                  </Text>
                                  <Text style={[styles.macroText, { color: BrandColors.textSecondary }]}>
                                    Fat: {(meal as any).fat || (meal as any).totalMacros?.fat || 0}g
                                  </Text>
                                </View>
                              </View>
                            ))}
                        </View>
                      </>
                    );
                  } catch (error) {
                    console.error('Error calculating nutrition progress:', error);
                    return (
                      <View style={styles.emptyState}>
                        <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                          Error calculating nutrition data
                        </Text>
                      </View>
                    );
                  }
                })()}
              </>
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol name="fork.knife" size={48} color={BrandColors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                  No nutrition data found
                </Text>
                <Text style={[styles.emptyStateSubtext, { color: BrandColors.textSecondary }]}>
                  This player hasn't logged any meals yet
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    
    {/* Date Picker Modal for Workout Assignment */}
    <DatePickerModal
      visible={showWorkoutDatePicker}
      onClose={() => setShowWorkoutDatePicker(false)}
      onDateSelect={(date) => {
        console.log('📅 Date selected for workout assignment:', date);
        // Set the selected date in the workout store
        setSelectedDate(date);
        // Close the date picker
        setShowWorkoutDatePicker(false);
        // Navigate to workout tab
        router.push('/(tabs)/workout');
      }}
      initialDate={new Date()}
      minDate={new Date()}
    />
    </>
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
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
  teamInfoCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  teamIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BrandColors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  teamDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
  codeSection: {
    gap: 8,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.accent + '10',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    letterSpacing: 2,
    flex: 1,
  },
  codeInstructions: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginTop: 4,
    textAlign: 'center',
  },
  shareButton: {
    padding: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  quickActions: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginBottom: 2,
  },
  playerJoined: {
    fontSize: 10,
    fontFamily: 'ui-rounded',
  },
  playerActions: {
    padding: 8,
  },
  assignmentCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
    gap: 6,
    marginBottom: 10,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    flex: 1,
    lineHeight: 20,
    marginBottom: 4,
  },
  assignmentDetails: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  assignmentDue: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
  comingSoon: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    lineHeight: 20,
  },
  assignmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: BrandColors.gray800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: BrandColors.accent + '20',
    borderWidth: 1,
    borderColor: BrandColors.accent,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  refreshButtonSecondary: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: BrandColors.textSecondary + '10',
  },
  assignmentInfo: {
    flex: 1,
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
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BrandColors.textSecondary + '10',
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: BrandColors.accent + '20',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ef444420',
  },
  assignmentExercises: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BrandColors.textSecondary + '20',
  },
  exercisesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseItem: {
    fontSize: 14,
    marginBottom: 2,
    fontFamily: 'ui-rounded',
  },
  moreExercises: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: BrandColors.background,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: BrandColors.gray800,
    gap: 12,
  },
  menuCancel: {
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.textSecondary + '20',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    gap: 16,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.textSecondary + '10',
  },
  profileLabel: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    fontWeight: '500',
  },
  profileValue: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    flex: 1,
    textAlign: 'right',
  },
  workoutCard: {
    backgroundColor: BrandColors.gray800,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginBottom: 8,
  },
  workoutExercises: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginTop: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
  },
  completedBadgeText: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    fontWeight: '500',
  },
  completedText: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  progressSummaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
  },
  progressSummaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 16,
  },
  progressMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressMetric: {
    flex: 1,
    marginHorizontal: 8,
  },
  progressMetricLabel: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  progressMetricValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  progressMetricTip: {
    fontSize: 11,
    fontFamily: 'ui-rounded',
  },
  progressStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: BrandColors.accent + '10',
    marginBottom: 12,
  },
  progressStatusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  progressStatusText: {
    flex: 1,
  },
  progressStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  progressStatusSubtitle: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
  personalRecordsSection: {
    marginTop: 12,
  },
  personalRecordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 8,
  },
  prBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: BrandColors.accent + '40',
  },
  prExercise: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 2,
  },
  prWeight: {
    fontSize: 11,
    fontFamily: 'ui-rounded',
  },
  workoutsSection: {
    marginTop: 8,
  },
  sectionTitleSecondary: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 12,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  workoutDuration: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginLeft: 8,
  },
  workoutNotes: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyStateSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    marginTop: 8,
    textAlign: 'center',
  },
  performanceStatusCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  performanceStatusHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  performanceStatusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  performanceStatusContent: {
    flex: 1,
  },
  performanceStatusTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  performanceStatusMessage: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'ui-rounded',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  metricSubtext: {
    fontSize: 11,
    fontFamily: 'ui-rounded',
  },
  trendCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  trendIcon: {
    fontSize: 24,
  },
  trendValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  trendDescription: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    lineHeight: 18,
  },
  insightsCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 12,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'ui-rounded',
    lineHeight: 18,
  },
  prScrollView: {
    marginTop: 8,
  },
  prDate: {
    fontSize: 10,
    fontFamily: 'ui-rounded',
    marginTop: 2,
  },
  mealCard: {
    backgroundColor: BrandColors.gray800,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  mealDate: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
    marginBottom: 8,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  macroText: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
});
