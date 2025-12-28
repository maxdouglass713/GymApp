import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BrandColors, Typography, Spacing, ComponentStyles } from '@/constants/theme';
import { usePointsStore } from '@/stores/pointsStore';
import { useCommunityStore } from '@/stores/communityStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import type { FeedEntry } from '@/stores/communityStore';
import { useAuth } from '@/components/AuthProvider';
import { useUserStore } from '@/stores/userStore';
import { UnlockModal } from '@/components/UnlockModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { chatService } from '@/services/chatService';
import { useCommunityData } from '@/hooks/useCommunity/useCommunityData';
import { useTeamChat } from '@/hooks/useCommunity/useTeamChat';
import { usePlayerStats } from '@/hooks/useCommunity/usePlayerStats';
import { useInbox } from '@/hooks/useCommunity/useInbox';
import { CommunityCard } from '@/components/community/CommunityCard';
import { OverviewTab } from '@/components/community/tabs/OverviewTab';
import { LeaderboardTab } from '@/components/community/tabs/LeaderboardTab';
import { ChallengesTab } from '@/components/community/tabs/ChallengesTab';
import { FeedTab } from '@/components/community/tabs/FeedTab';
import { ChatTab } from '@/components/community/tabs/ChatTab';
import { InboxTab } from '@/components/community/tabs/InboxTab';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

export default function CommunityScreen() {
  const { isFeatureUnlocked } = usePointsStore();
  const { user } = useAuth();
  const { profile } = useUserStore();
  
  // Check feature flag - show "Coming Soon" if community is disabled
  // Use useFocusEffect so it runs every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!checkFeatureOrShowComingSoon('communityChallenges', 'Community Features')) {
        // Navigate back after showing alert
        setTimeout(() => {
          router.back();
        }, 500);
      }
    }, [])
  );
  const params = useLocalSearchParams();
  const {
    communities,
    activeCommunityId,
    challenges,
    leaderboard,
    feedEntriesByCommunity,
    switchActiveCommunity,
    leaveCommunity,
    joinChallenge,
    createChallenge,
    loadCommunityChallenges,
    createFeedEntry,
    deleteChallenge,
  } = useCommunityStore();
  
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  
  // Determine initial tab based on user role
  const isTrainer = profile?.appUseType === 'gym_trainer' && profile?.institutionRole !== 'player';
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player' && !isTrainer;
  const isCoachOrTrainer = isCoach || isTrainer;
  const isPlayer = profile?.userType === 'institution' && profile?.institutionRole === 'player';
  const initialTab = isCoachOrTrainer ? 'overview' : 'leaderboard';
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'inbox' | 'leaderboard' | 'feed' | 'chat'>(initialTab);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [challengeTarget, setChallengeTarget] = useState('');
  const [challengeDuration, setChallengeDuration] = useState('');
  const [selectedMemberFeed, setSelectedMemberFeed] = useState<{ name: string; entries: FeedEntry[] } | null>(null);
  
  // Ensure players can't access overview tab
  React.useEffect(() => {
    if (isPlayer && activeTab === 'overview') {
      setActiveTab('leaderboard');
    }
  }, [isPlayer, activeTab]);

  // Ensure trainers can access overview tab
  React.useEffect(() => {
    if (isTrainer && activeTab !== 'overview') {
      setActiveTab('overview');
    }
  }, [isTrainer, activeTab]);

  // Custom hooks for data management
  const { firebaseTeamData } = useCommunityData();
  const { 
    chatMessages, 
    newMessage, 
    setNewMessage, 
    chatLoading,
    chatError,
    chatListRef 
  } = useTeamChat(profile?.teamId, activeTab);
  const { playerStats, loadingOverview } = usePlayerStats(profile?.teamId, activeTab);
  const { sharedWorkouts, sharedMealPlans, loadingInbox } = useInbox(user?.uid, activeTab);

  // Auto-navigate coaches to team-management when they access the community tab
  React.useEffect(() => {
    if (!profile || !user?.uid) return;
    
    const isCoachCheck = profile?.userType === 'institution' && 
                    profile?.institutionName && 
                    profile?.institutionRole !== 'player' &&
                    profile?.appUseType !== 'gym_trainer';
    const isTrainerCheck = profile?.appUseType === 'gym_trainer' && profile?.institutionRole !== 'player';
    
    const cameFromTeamManagement = params.fromTeamManagement === 'true';
    
    if (isCoachCheck && !cameFromTeamManagement) {
      console.log('👨‍💼 Coach detected - auto-navigating to team-management');
      const timer = setTimeout(() => {
        router.replace('/community/team-management');
      }, 200);
      return () => clearTimeout(timer);
    } else if (isCoachCheck && cameFromTeamManagement) {
      console.log('👨‍💼 Coach returned from team-management - showing quick actions on community tab');
    } else if (isTrainerCheck) {
      console.log('💪 Trainer detected - showing client overview');
    }
  }, [profile?.userType, profile?.institutionRole, profile?.institutionName, profile?.appUseType, user?.uid, params.fromTeamManagement]);

  const activeCommunity = communities.find(c => c.id === activeCommunityId);
  const isSportsCommunity = activeCommunity?.type === 'sports';
  // Only coaches/trainers can be community leaders (not players/clients)
  const isCommunityLeader = Boolean(
    activeCommunity &&
    user?.uid &&
    isCoachOrTrainer && // Must be a coach or trainer, not a player
    (
      activeCommunity.ownerId === user.uid ||
      (isSportsCommunity && (activeCommunity.role === 'coach' || isCoachOrTrainer || (!activeCommunity.ownerId && isCoachOrTrainer)))
    )
  );
  const showFeedTab = !isSportsCommunity;
  const showChatTab = false; // Removed chat tab for teams/institutions
  const showInboxTab = isSportsCommunity && activeCommunity?.type === 'sports' && (
    activeCommunity?.role === 'player' || (profile?.userType === 'institution' && profile?.institutionRole === 'player')
  );

  const displayChallenges = useMemo(() => {
    if (!activeCommunity) {
      return [];
    }

    return challenges.filter((challenge) => {
      if (challenge.communityId) {
        return challenge.communityId === activeCommunity.id;
      }
      return isSportsCommunity;
    });
  }, [challenges, activeCommunity?.id, isSportsCommunity]);

  const feedEntries = useMemo(() => {
    if (!activeCommunity?.id) {
      return [] as FeedEntry[];
    }
    return feedEntriesByCommunity[activeCommunity.id] || [];
  }, [feedEntriesByCommunity, activeCommunity?.id]);

  const memberProfiles = activeCommunity?.memberProfiles || [];

  const friendStats = useMemo(
    () =>
      memberProfiles.map((profile) => ({
        playerId: profile.uid,
        playerName: profile.displayName,
        workoutsThisWeek: 0,
        consistencyScore: 0,
        currentStreak: 0,
        lastWorkoutDate: null,
        totalWorkouts: feedEntries.filter((entry) => entry.userId === profile.uid).length,
        status: 'active' as const,
      })),
    [memberProfiles, feedEntries]
  );

  const overviewStats = isSportsCommunity ? playerStats : friendStats;

  const leaderboardEntries = useMemo(() => {
    if (isSportsCommunity && firebaseTeamData?.members?.length) {
      const statsMap = new Map(
        playerStats.map((stat) => [stat.playerId, stat])
      );

      // Deduplicate members by userId to prevent duplicate keys
      const uniqueMembers = new Map<string, any>();
      firebaseTeamData.members.forEach((member: any) => {
        if (member.role !== 'coach' && member.userId) {
          // Keep the first occurrence of each userId
          if (!uniqueMembers.has(member.userId)) {
            uniqueMembers.set(member.userId, member);
          }
        }
      });

      const playerMembers = Array.from(uniqueMembers.values());

      const entries: Array<{
        id: string;
        name: string;
        score: number;
        subtitle: string;
      }> = playerMembers.map((member: any) => {
        const stat = statsMap.get(member.userId);
        const name =
          stat?.playerName ||
          member.name ||
          member.displayName ||
          'Player';
        const score = stat?.workoutsThisWeek ?? 0;
        const totalWorkouts = stat?.totalWorkouts ?? 0;

        return {
          id: member.userId,
          name,
          score,
          subtitle: `${totalWorkouts} total workouts`,
        };
      });

      const sorted = entries
        .sort((a, b) => {
          const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
          if (scoreDiff !== 0) {
            return scoreDiff;
          }
          return a.name.localeCompare(b.name);
        })
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      return sorted;
    }

    if (!isSportsCommunity && activeCommunity) {
      const stats = new Map<
        string,
        {
          id: string;
          name: string;
          count: number;
        }
      >();

      feedEntries.forEach((entry) => {
        const key = entry.userId || entry.displayName;
        if (!stats.has(key)) {
          stats.set(key, {
            id: entry.userId || key,
            name: entry.displayName,
            count: 0,
          });
        }
        const stat = stats.get(key)!;
        stat.count += 1;
      });

      if (!stats.size && activeCommunity.memberNames?.length) {
        activeCommunity.memberNames.forEach((name, index) => {
          const key = `${activeCommunity.id}_member_${index}`;
          stats.set(key, {
            id: key,
            name,
            count: 0,
          });
        });
      }

      const array = Array.from(stats.values())
        .sort((a, b) => {
          const diff = b.count - a.count;
          if (diff !== 0) {
            return diff;
          }
          return a.name.localeCompare(b.name);
        })
        .map((entry, index) => ({
          id: entry.id,
          name: entry.name,
          score: entry.count,
          subtitle: `${entry.count} shared workout${entry.count === 1 ? '' : 's'}`,
          rank: index + 1,
        }));

      return array;
    }

    return [];
  }, [
    isSportsCommunity,
    firebaseTeamData?.members,
    playerStats,
    activeCommunity,
    feedEntries,
  ]);

  const leaderboardMetricLabel = isSportsCommunity
    ? 'workouts this week'
    : 'friends';

  useEffect(() => {
    if (!isSportsCommunity && activeCommunity?.id) {
      loadCommunityChallenges(activeCommunity.id);
    }
  }, [isSportsCommunity, activeCommunity?.id, loadCommunityChallenges]);
  
  // Import subscription store to check tier
  const { tier } = useSubscriptionStore();
  
  // Check if community is unlocked
  // Pro and Elite tiers automatically unlock community features
  const isCommunityUnlocked = isFeatureUnlocked('community_challenges') || 
    (profile?.communityUnlocked === true) || 
    (profile?.userType === 'institution') ||
    (tier === 'pro' || tier === 'elite');
  
  const handleJoinCommunity = () => {
    if (!isCommunityUnlocked) {
      setShowUnlockModal(true);
      return;
    }
    router.push('/community/select-type');
  };
  
  const handleCreateCommunity = () => {
    if (!isCommunityUnlocked) {
      setShowUnlockModal(true);
      return;
    }
    router.push('/community/join-friends-work');
  };
  
  const handleSwitchCommunity = () => {
    if (communities.length <= 1) {
      Alert.alert('No Other Communities', 'You need to join more communities to switch.');
      return;
    }
    router.push('/community/switch');
  };
  
  const handleLeaveCommunity = () => {
    if (!activeCommunity) return;
    
    Alert.alert(
      'Leave Community',
      `Are you sure you want to leave ${activeCommunity.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            leaveCommunity(activeCommunity.id);
            Alert.alert('Left Community', `You've left ${activeCommunity.name}.`);
          },
        },
      ]
    );
  };

  const handleInviteMembers = async () => {
    if (!activeCommunity?.inviteCode) {
      Alert.alert(
        'Invite Code Unavailable',
        'Generate an invite code first to start inviting members.'
      );
      return;
    }

    try {
      const shareMessage = `Join my ${activeCommunity.type === 'sports' ? 'team' : 'community'} "${activeCommunity.name}" on KINETIC FLOW AI!\n\nUse invite code: ${activeCommunity.inviteCode}`;
      await Share.share({
        title: `Join ${activeCommunity.name}`,
        message: shareMessage,
      });
    } catch (error: any) {
      console.error('❌ Error sharing invite code:', error);
      Alert.alert('Error', 'Unable to open the share dialog. Please try again.');
    }
  };

  const resetChallengeForm = () => {
    setChallengeTitle('');
    setChallengeDescription('');
    setChallengeTarget('');
    setChallengeDuration('');
  };

  const openCreateChallengeModal = () => {
    resetChallengeForm();
    setShowCreateChallengeModal(true);
  };

  const handleSaveChallenge = async () => {
    if (!challengeTitle.trim()) {
      Alert.alert('Missing Title', 'Please enter a challenge name.');
      return;
    }

    const parsedTarget = parseInt(challengeTarget, 10);
    const parsedDuration = parseInt(challengeDuration, 10);

    await createChallenge({
      title: challengeTitle,
      description: challengeDescription,
      target: isNaN(parsedTarget) ? 0 : parsedTarget,
      duration: isNaN(parsedDuration) ? 7 : Math.max(parsedDuration, 1),
      createdBy: user?.uid,
      createdByName: profile?.firstName || user?.displayName || 'Commissioner',
      communityId: !isSportsCommunity && activeCommunity ? activeCommunity.id : undefined,
    });

    if (!isSportsCommunity && activeCommunity?.id) {
      await loadCommunityChallenges(activeCommunity.id);
    }

    Alert.alert('Challenge Created', `"${challengeTitle.trim()}" has been added to your community.`);
    setShowCreateChallengeModal(false);
    resetChallengeForm();
  };

  const openMemberFeedModal = (userId: string | undefined, name: string) => {
    const entries = feedEntries.filter((entry) => {
      if (entry.userId && userId) {
        return entry.userId === userId;
      }
      return entry.displayName === name;
    });

    if (!entries.length) {
      Alert.alert('No Activity', `${name} has not shared any workouts yet.`);
      return;
    }

    setSelectedMemberFeed({ name, entries });
  };

  const handleSelectLeaderboardMember = (entry: { id: string; name: string }) => {
    openMemberFeedModal(entry.id, entry.name);
  };

  const handleSelectOverviewMember = (player: { playerId: string; playerName: string }) => {
    openMemberFeedModal(player.playerId, player.playerName);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      return;
    }
    
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to send messages.');
      return;
    }
    
    if (!profile?.teamId) {
      Alert.alert('Error', 'No team ID available. Please ensure you are part of a team.');
      return;
    }
    
    const messageText = newMessage.trim();
    setNewMessage('');
    
    try {
      await chatService.sendMessage(
        profile.teamId,
        user.uid,
        profile?.firstName || user.displayName || 'User',
        messageText
      );
      console.log('✅ Message sent successfully');
      
      // Auto-scroll to bottom after sending
      setTimeout(() => {
        chatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      
      // Restore message text
      setNewMessage(messageText);
      
      // Show user-friendly error message
      const errorMessage = error?.message || 'Failed to send message. Please check your connection and try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user?.uid) return;
    
    try {
      await joinChallenge(challengeId, user.uid);
      Alert.alert('Challenge Joined!', 'You\'ve successfully joined this challenge. Good luck! 🎉');
    } catch (error) {
      Alert.alert('Error', 'Failed to join challenge. Please try again.');
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!activeCommunity?.id) {
      return;
    }

    try {
      await deleteChallenge(challengeId, activeCommunity.id);
      Alert.alert('Challenge Removed', 'The challenge has been deleted for the community.');
    } catch (error) {
      console.error('❌ Error deleting challenge:', error);
      Alert.alert('Error', 'Failed to delete the challenge. Please try again.');
                }
  };

  const renderHeaderSection = () => (
    <View>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Community
          </Text>
          {(activeCommunity || firebaseTeamData) ? (
            <Text style={styles.communityName}>
              {firebaseTeamData?.name || activeCommunity?.name}
            </Text>
          ) : (
            <Text style={styles.noCommunityText}>
              No community yet
            </Text>
          )}
        </View>
        
        {!activeCommunity ? (
          <View style={styles.noCommunityContainer}>
            <IconSymbol name="person.3.fill" size={80} color={BrandColors.textSecondary} />
            <Text style={[styles.noCommunityTitle, { color: BrandColors.text }]}>
              Join Your Community
            </Text>
            <Text style={[styles.noCommunityDescription, { color: BrandColors.textSecondary }]}>
              Connect with like-minded fitness enthusiasts, join challenges, and climb the leaderboards!
            </Text>
            
            <View style={styles.communityButtons}>
              <TouchableOpacity
                style={[styles.primaryCTA, { backgroundColor: BrandColors.accent }]}
                onPress={handleJoinCommunity}
              >
                <IconSymbol name="person.badge.plus" size={20} color="white" />
                <Text style={styles.primaryCTAText}>Join Community</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.secondaryCTA, { borderColor: BrandColors.accent }]}
                onPress={handleCreateCommunity}
              >
                <IconSymbol name="plus" size={20} color={BrandColors.accent} />
                <Text style={[styles.secondaryCTAText, { color: BrandColors.accent }]}>
                  Create Community
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.communityContent}>
            <CommunityCard
              community={activeCommunity}
              firebaseTeamData={firebaseTeamData}
              onSwitchCommunity={handleSwitchCommunity}
              onLeaveCommunity={handleLeaveCommunity}
            />

            {/* Tabs moved up for better visibility */}
            {isSportsCommunity && (
              <View style={styles.tabContainer}>
                {(isCoachOrTrainer || isCommunityLeader) && (
                  <TouchableOpacity
                    style={[
                      styles.tabButton,
                      activeTab === 'overview' && styles.activeTabButton,
                      { backgroundColor: activeTab === 'overview' ? BrandColors.accent : 'transparent' }
                    ]}
                    onPress={() => setActiveTab('overview')}
                  >
                    <IconSymbol 
                      name="chart.bar.fill" 
                      size={18} 
                      color={activeTab === 'overview' ? '#FFFFFF' : BrandColors.textSecondary} 
                    />
                    <Text style={[
                      styles.tabText,
                      { color: activeTab === 'overview' ? '#FFFFFF' : BrandColors.textSecondary }
                    ]}>
                      Overview
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'leaderboard' && styles.activeTabButton,
                    { backgroundColor: activeTab === 'leaderboard' ? BrandColors.accent : 'transparent' }
                  ]}
                  onPress={() => setActiveTab('leaderboard')}
                >
                  <IconSymbol 
                    name="chart.bar.fill" 
                    size={18} 
                    color={activeTab === 'leaderboard' ? '#FFFFFF' : BrandColors.textSecondary} 
                  />
                  <Text style={[
                    styles.tabText,
                    { color: activeTab === 'leaderboard' ? '#FFFFFF' : BrandColors.textSecondary }
                  ]}>
                    Leaderboard
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'challenges' && styles.activeTabButton,
                    { backgroundColor: activeTab === 'challenges' ? BrandColors.accent : 'transparent' }
                  ]}
                  onPress={() => setActiveTab('challenges')}
                >
                  <IconSymbol 
                    name="trophy.fill" 
                    size={18} 
                    color={activeTab === 'challenges' ? '#FFFFFF' : BrandColors.textSecondary} 
                  />
                  <Text style={[
                    styles.tabText,
                    { color: activeTab === 'challenges' ? '#FFFFFF' : BrandColors.textSecondary }
                  ]}>
                    Challenges
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          {isSportsCommunity ? (
            isCommunityLeader ? (
              <View style={styles.teamManagementSection}>
                <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                  {isTrainer ? 'Client Management' : 'Team Management'}
                </Text>
                <View style={styles.teamActionGrid}>
                      <TouchableOpacity 
                        style={styles.teamActionCard}
                        onPress={() => router.push('/community/team-management')}
                      >
                        <IconSymbol name="person.badge.plus" size={24} color={BrandColors.accent} />
                        <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                          {isTrainer ? 'Manage Clients' : 'Manage Team'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.teamActionCard}
                        onPress={() => router.push('/(tabs)/workout')}
                      >
                        <IconSymbol name="figure.strengthtraining.traditional" size={24} color={BrandColors.accent} />
                        <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                          Assign Workout
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.teamActionCard}
                        onPress={() => router.push('/(tabs)/nutrition')}
                      >
                        <IconSymbol name="fork.knife" size={24} color={BrandColors.accent} />
                        <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                          Create Meal Plan
                        </Text>
                      </TouchableOpacity>
                </View>
              </View>
                  ) : (
              <View style={styles.teamManagementSection}>
                <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                  Team Shortcuts
                </Text>
                <View style={styles.teamActionGrid}>
                      <TouchableOpacity 
                        style={styles.teamActionCard}
                        onPress={() => router.push('/community/team-dashboard')}
                      >
                        <IconSymbol name="chart.bar" size={24} color={BrandColors.accent} />
                        <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                          View Progress
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.teamActionCard}
                        onPress={() => router.push('/(tabs)/workout')}
                      >
                        <IconSymbol name="figure.strengthtraining.traditional" size={24} color={BrandColors.accent} />
                        <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                          Log Workout
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.teamActionCard}
                        onPress={() => router.push('/(tabs)/nutrition')}
                      >
                        <IconSymbol name="fork.knife" size={24} color={BrandColors.accent} />
                        <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                          Log Meal
                        </Text>
                      </TouchableOpacity>
                </View>
              </View>
            )
          ) : (
            isCommunityLeader && (
              <View style={styles.teamManagementSection}>
                <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                  Community Control Panel
                </Text>
                <View style={styles.teamActionGrid}>
                  <TouchableOpacity
                    style={styles.teamActionCard}
                    onPress={() => setActiveTab('leaderboard')}
                  >
                    <IconSymbol name="chart.bar.fill" size={24} color={BrandColors.accent} />
                    <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                      View Leaderboard
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.teamActionCard}
                    onPress={() => setActiveTab('challenges')}
                  >
                    <IconSymbol name="trophy.fill" size={24} color={BrandColors.accent} />
                    <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                      Manage Challenges
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.teamActionCard}
                    onPress={handleInviteMembers}
                  >
                    <IconSymbol name="person.badge.plus" size={24} color={BrandColors.accent} />
                    <Text style={[styles.teamActionText, { color: BrandColors.text }]}>
                      Invite Members
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}

            {!isSportsCommunity && (
              <View style={styles.tabContainer}>
            {(isCoach || isCommunityLeader) && (
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'overview' && styles.activeTabButton,
                    { backgroundColor: activeTab === 'overview' ? BrandColors.accent : 'transparent' }
                  ]}
                  onPress={() => setActiveTab('overview')}
                >
                  <IconSymbol 
                    name="chart.bar.fill" 
                    size={16} 
                    color={activeTab === 'overview' ? '#FFFFFF' : BrandColors.textSecondary} 
                  />
                  <Text style={[
                    styles.tabText,
                    { color: activeTab === 'overview' ? '#FFFFFF' : BrandColors.textSecondary }
                  ]}>
                    Overview
                  </Text>
                </TouchableOpacity>
            )}

                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'leaderboard' && styles.activeTabButton,
                    { backgroundColor: activeTab === 'leaderboard' ? BrandColors.accent : 'transparent' }
                  ]}
                  onPress={() => setActiveTab('leaderboard')}
                >
                  <IconSymbol 
                    name="chart.bar.fill" 
                    size={16} 
                    color={activeTab === 'leaderboard' ? '#FFFFFF' : BrandColors.textSecondary} 
                  />
                  <Text style={[
                    styles.tabText,
                    { color: activeTab === 'leaderboard' ? '#FFFFFF' : BrandColors.textSecondary }
                  ]}>
                    Leaderboard
                  </Text>
                </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'challenges' && styles.activeTabButton,
                  { backgroundColor: activeTab === 'challenges' ? BrandColors.accent : 'transparent' }
                ]}
                onPress={() => setActiveTab('challenges')}
              >
                <IconSymbol 
                  name="trophy.fill" 
                  size={16} 
                  color={activeTab === 'challenges' ? '#FFFFFF' : BrandColors.textSecondary} 
                />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'challenges' ? '#FFFFFF' : BrandColors.textSecondary }
                ]}>
                  Challenges
                </Text>
              </TouchableOpacity>

            {showFeedTab && (
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'feed' && styles.activeTabButton,
                  { backgroundColor: activeTab === 'feed' ? BrandColors.accent : 'transparent' }
                ]}
                onPress={() => setActiveTab('feed')}
              >
                <IconSymbol
                  name="megaphone.fill"
                  size={16}
                  color={activeTab === 'feed' ? '#FFFFFF' : BrandColors.textSecondary}
                />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'feed' ? '#FFFFFF' : BrandColors.textSecondary }
                ]}>
                  Feed
                </Text>
              </TouchableOpacity>
            )}

            {showChatTab && (
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'chat' && styles.activeTabButton,
                  { backgroundColor: activeTab === 'chat' ? BrandColors.accent : 'transparent' }
                ]}
                onPress={() => setActiveTab('chat')}
              >
                <IconSymbol 
                  name="message.fill" 
                  size={16} 
                  color={activeTab === 'chat' ? '#FFFFFF' : BrandColors.textSecondary} 
                />
                <Text style={[
                  styles.tabText,
                  { color: activeTab === 'chat' ? '#FFFFFF' : BrandColors.textSecondary }
                ]}>
                  Chat
                </Text>
              </TouchableOpacity>
            )}

            {showInboxTab && (
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    activeTab === 'inbox' && styles.activeTabButton,
                    { backgroundColor: activeTab === 'inbox' ? BrandColors.accent : 'transparent' }
                  ]}
                  onPress={() => setActiveTab('inbox')}
                >
                  <IconSymbol 
                    name="tray.fill" 
                    size={16} 
                    color={activeTab === 'inbox' ? '#FFFFFF' : BrandColors.textSecondary} 
                  />
                  <Text style={[
                    styles.tabText,
                    { color: activeTab === 'inbox' ? '#FFFFFF' : BrandColors.textSecondary }
                  ]}>
                    Inbox
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            )}
          </View>
        )}
    </View>
  );

  const renderTabContent = () => {
    if (!activeCommunity) {
      return null;
    }

    if (activeTab === 'overview' && (isCoachOrTrainer || isCommunityLeader || showFeedTab)) {
      return (
              <OverviewTab
          playerStats={overviewStats}
                loadingOverview={loadingOverview}
          title={isTrainer ? 'Client Overview' : (isSportsCommunity ? 'Team Overview' : 'Friends Overview')}
          memberLabel={isTrainer ? 'Clients' : (isSportsCommunity ? 'Players' : 'Friends')}
          emptyTitle={isTrainer ? 'No clients yet' : (isSportsCommunity ? 'No players yet' : 'No friends yet')}
          emptyDescription={
            isTrainer
              ? 'Clients will appear here once they join your training program.'
              : isSportsCommunity
              ? 'Players will appear here once they join your team.'
              : 'Invite friends to your community to see them here.'
          }
          onSelectPlayer={
            showFeedTab
              ? (player) =>
                  handleSelectLeaderboardMember({
                    id: player.playerId,
                    name: player.playerName,
                  })
              : undefined
          }
              />
      );
    }
            
    if (activeTab === 'leaderboard') {
      return (
        <LeaderboardTab
          entries={leaderboardEntries}
          metricLabel={leaderboardMetricLabel}
          emptyTitle={isSportsCommunity ? 'No workouts logged yet' : 'No friends on the board yet'}
          emptyDescription={
            isSportsCommunity
              ? 'Players will appear once workouts are logged this week.'
              : 'Invite friends to your community to start the leaderboard.'
          }
          onSelectMember={showFeedTab ? handleSelectLeaderboardMember : undefined}
        />
      );
    }

    if (activeTab === 'challenges') {
      return (
              <ChallengesTab
          challenges={displayChallenges}
                onJoinChallenge={handleJoinChallenge}
          canManageChallenges={isCommunityLeader}
          onCreateChallenge={isCommunityLeader ? openCreateChallengeModal : undefined}
          onDeleteChallenge={isCommunityLeader ? handleDeleteChallenge : undefined}
              />
      );
    }

    if (activeTab === 'chat' && showChatTab) {
      return (
              <ChatTab
                chatMessages={chatMessages}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                chatLoading={chatLoading}
                chatError={chatError}
                chatListRef={chatListRef}
                userId={user?.uid}
                onSendMessage={handleSendMessage}
              />
      );
    }

    if (activeTab === 'inbox' && showInboxTab) {
      return (
              <InboxTab
                sharedWorkouts={sharedWorkouts}
                sharedMealPlans={sharedMealPlans}
                loadingInbox={loadingInbox}
              />
      );
    }

    return null;
  };

  if (!isCommunityUnlocked) {
    return (
      <View style={ComponentStyles.screen}>
        <View style={styles.lockedContainer}>
          <IconSymbol name="lock.fill" size={64} color={BrandColors.textSecondary} />
          <Text style={styles.lockedTitle}>
            Community Locked
          </Text>
          <Text style={styles.lockedDescription}>
            Unlock Community Challenges for 3,000 V to join challenges, leaderboards, and connect with others!
            {'\n\n'}Or sign up as an institution to get instant access to team management features.
          </Text>
          
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.unlockButton]}
            onPress={() => setShowUnlockModal(true)}
          >
            <Text style={ComponentStyles.button.primaryText}>Unlock Community Challenges (3,000 V)</Text>
          </TouchableOpacity>
          </View>
        
        <UnlockModal
          visible={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          featureKey="community_challenges"
          onUnlocked={() => {
            setShowUnlockModal(false);
            Alert.alert(
              'Community Unlocked! 🎉',
              'Welcome to the community! Connect with others, join challenges, and climb the leaderboards.',
              [{ 
                text: 'Get Started',
                onPress: () => {
                  router.push('/community/select-type');
                }
              }]
            );
          }}
        />
      </View>
    );
  }

  const headerSection = renderHeaderSection();

  return (
    <View style={ComponentStyles.screen}>
      {activeTab === 'feed' && showFeedTab ? (
        <FeedTab entries={feedEntries} header={headerSection} />
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {headerSection}
          {renderTabContent()}
        </ScrollView>
      )}

      <Modal
        visible={showCreateChallengeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateChallengeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: BrandColors.gray900 }]}>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
              Create New Challenge
            </Text>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: BrandColors.textSecondary }]}>
                Challenge Name
              </Text>
              <TextInput
                style={[styles.modalInput, { borderColor: BrandColors.accent, color: BrandColors.text }]}
                placeholder="e.g. 5-Workout Streak"
                placeholderTextColor={BrandColors.textSecondary}
                value={challengeTitle}
                onChangeText={setChallengeTitle}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: BrandColors.textSecondary }]}>
                Description
              </Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextarea, { borderColor: BrandColors.textSecondary + '40', color: BrandColors.text }]}
                placeholder="Describe the challenge goals..."
                placeholderTextColor={BrandColors.textSecondary}
                value={challengeDescription}
                onChangeText={setChallengeDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalRow}>
              <View style={styles.modalFieldHalf}>
                <Text style={[styles.modalLabel, { color: BrandColors.textSecondary }]}>
                  Target (optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: BrandColors.textSecondary + '40', color: BrandColors.text }]}
                  placeholder="Number"
                  keyboardType="number-pad"
                  placeholderTextColor={BrandColors.textSecondary}
                  value={challengeTarget}
                  onChangeText={setChallengeTarget}
                />
              </View>
              <View style={styles.modalFieldHalf}>
                <Text style={[styles.modalLabel, { color: BrandColors.textSecondary }]}>
                  Duration (days)
                </Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: BrandColors.textSecondary + '40', color: BrandColors.text }]}
                  placeholder="7"
                  keyboardType="number-pad"
                  placeholderTextColor={BrandColors.textSecondary}
                  value={challengeDuration}
                  onChangeText={setChallengeDuration}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: BrandColors.textSecondary + '30' }]}
                onPress={() => {
                  setShowCreateChallengeModal(false);
                  resetChallengeForm();
                }}
              >
                <Text style={[styles.modalButtonText, { color: BrandColors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: BrandColors.accent }]}
                onPress={handleSaveChallenge}
              >
                <Text style={[styles.modalButtonText, { color: '#000' }]}>Save Challenge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedMemberFeed}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedMemberFeed(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: BrandColors.gray900 }]}
          >
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
              {selectedMemberFeed?.name}'s Shared Workouts
            </Text>

            <ScrollView style={{ maxHeight: 400 }}>
              {selectedMemberFeed?.entries.map((entry) => (
                <View
                  key={entry.id}
                  style={[
                    styles.feedCard,
                    {
                      backgroundColor: BrandColors.background,
                      borderColor: BrandColors.textSecondary + '20',
                    },
                  ]}
                >
                  <Text style={[styles.feedMessage, { color: BrandColors.text }]}>
                    {entry.message}
                  </Text>
                  <Text style={[styles.feedTimestamp, { color: BrandColors.textSecondary + '80' }]}>
                    {entry.createdAt.toLocaleString()}
                  </Text>
                </View>
              ))}
      </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: BrandColors.accent }]}
              onPress={() => setSelectedMemberFeed(null)}
            >
              <Text style={[styles.modalButtonText, { color: '#000' }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  lockedTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  lockedDescription: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    marginBottom: Spacing.xl,
  },
  unlockButton: {
    minWidth: 200,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize['4xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  communityName: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
  },
  noCommunityText: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
  },
  noCommunityContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  noCommunityTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  noCommunityDescription: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    marginBottom: Spacing.xl,
  },
  primaryCTA: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  secondaryCTA: {
    width: '100%',
    borderColor: BrandColors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  communityButtons: {
    width: '100%',
    gap: Spacing.md,
  },
  primaryCTAText: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },
  secondaryCTAText: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },
  communityContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: BrandColors.gray800,
    borderRadius: 16,
    padding: 6,
    marginBottom: 20,
    marginTop: 8,
    shadowColor: BrandColors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 44,
  },
  activeTabButton: {
    // Active state handled by backgroundColor in component
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
    letterSpacing: 0.3,
  },
  teamManagementSection: {
    marginBottom: 24,
  },
  teamActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  teamActionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
    gap: 8,
  },
  teamActionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'ui-rounded',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: 'ui-rounded',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  modalTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalFieldHalf: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  feedCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  feedMessage: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    marginBottom: 6,
  },
  feedTimestamp: {
    fontSize: 12,
    fontFamily: 'ui-rounded',
  },
});
