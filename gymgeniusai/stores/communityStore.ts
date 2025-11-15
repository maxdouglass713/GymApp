import { create } from 'zustand';
import { communityService } from '../services/firestoreService';
import { persistenceService } from '@/services/persistenceService';
import { useUserStore } from './userStore';

export interface Community {
  id: string;
  name: string;
  type: 'friends' | 'sports' | 'work';
  description?: string;
  membersCount: number;
  inviteCode?: string;
  location?: {
    city: string;
    gymName?: string;
  };
  joinedAt: Date;
  role?: 'coach' | 'player' | 'owner';
  ownerId?: string; // Creator/leader of the community
  firebaseTeam?: any;
  memberNames?: string[];
  memberProfiles?: { uid: string; displayName: string }[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'workouts' | 'steps' | 'streak' | 'points';
  target: number;
  duration: number; // days
  isJoined: boolean;
  progress: number; // 0-100
  endDate: Date;
  createdBy?: string;
  createdAt?: Date;
  communityId?: string;
  createdByName?: string;
}

export interface FeedEntry {
  id: string;
  communityId: string;
  userId: string;
  displayName: string;
  message: string;
  workoutId?: string;
  challengeId?: string;
  createdAt: Date;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
}

export interface CommunityStore {
  // State
  communities: Community[];
  activeCommunityId: string | null;
  challenges: Challenge[];
  leaderboard: LeaderboardEntry[];
  feedEntriesByCommunity: Record<string, FeedEntry[]>;
  
  // Community slot management
  unlockedSlots: number; // starts at 1, max 3
  
  // Actions
  joinCommunity: (community: Omit<Community, 'id' | 'joinedAt'>) => boolean;
  leaveCommunity: (communityId: string) => void;
  switchActiveCommunity: (communityId: string) => void;
  createCommunity: (community: Omit<Community, 'id' | 'membersCount' | 'joinedAt'>) => Community;
  createChallenge: (challenge: {
    title: string;
    description: string;
    target?: number;
    duration?: number;
    createdBy?: string;
    createdByName?: string;
    communityId?: string;
  }) => Promise<Challenge | null>;
  createFeedEntry: (communityId: string, entry: {
    userId: string;
    displayName: string;
    message: string;
    workoutId?: string;
    challengeId?: string;
  }) => Promise<void>;
  createPersonalCommunity: (input: {
    name: string;
    description?: string;
    type: 'friends' | 'work';
    ownerId: string;
    ownerName: string;
  }) => Promise<Community | null>;
  joinPersonalCommunityByCode: (input: {
    inviteCode: string;
    uid: string;
    displayName: string;
  }) => Promise<Community | null>;
  loadPersonalCommunitiesFromFirebase: (uid: string) => Promise<void>;
  loadCommunityChallenges: (communityId: string) => Promise<void>;
  loadCommunityFeed: (communityId: string) => Promise<void>;
  subscribeToCommunityFeed: (communityId: string) => () => void;
  
  // Slot management
  unlockSlot: () => boolean;
  getAvailableSlots: () => number;
  
  // Challenges
  joinChallenge: (challengeId: string, uid: string) => Promise<void>;
  updateChallengeProgress: (challengeId: string, progress: number) => void;
  deleteChallenge: (challengeId: string, communityId: string) => Promise<void>;
  
  // Leaderboard
  updateLeaderboard: (entries: LeaderboardEntry[]) => void;
  
  // Mock data generation
  generateMockCommunities: (city: string) => Community[];
  validateInviteCode: (code: string) => boolean;
  
  // Firebase integration
  loadUserChallengesFromFirebase: (uid: string) => Promise<void>;
  loadActiveChallengesFromFirebase: () => Promise<void>;
  
  // Persistence methods
  saveCommunityData: () => Promise<void>;
  loadCommunityData: () => Promise<void>;
  clearCommunityData: () => Promise<void>;
}

export const useCommunityStore = create<CommunityStore>((set, get) => ({
  communities: [],
  activeCommunityId: null,
  challenges: [],
  leaderboard: [],
  feedEntriesByCommunity: {},
  unlockedSlots: 1, // Default: 1 slot available
  
  joinCommunity: (communityData) => {
    const { communities, unlockedSlots } = get();

    const normalizedInviteCode = communityData.inviteCode?.toUpperCase();
    const normalizedId =
      communityData.id ||
      (normalizedInviteCode ? `community-${normalizedInviteCode.toLowerCase()}` : undefined) ||
      (communityData as any).teamId ||
      `community-${Date.now()}`;

    let existingCommunity =
      communities.find((c) => c.id === normalizedId) ||
      (normalizedInviteCode
        ? communities.find((c) => c.inviteCode?.toUpperCase() === normalizedInviteCode)
        : undefined);

    const hasMembersCount = typeof communityData.membersCount === 'number';

    const mergedCommunity: Community = {
      ...(existingCommunity || {}),
      ...communityData,
      id: normalizedId as string,
      inviteCode: normalizedInviteCode || communityData.inviteCode,
      membersCount: hasMembersCount
        ? (communityData.membersCount as number)
        : existingCommunity?.membersCount || 1,
      joinedAt: existingCommunity?.joinedAt || communityData.joinedAt || new Date(),
      ownerId: communityData.ownerId ?? existingCommunity?.ownerId,
      memberNames:
        (communityData.memberNames && Array.isArray(communityData.memberNames)
          ? communityData.memberNames
          : existingCommunity?.memberNames) || [],
      memberProfiles:
        (communityData.memberProfiles && Array.isArray(communityData.memberProfiles)
          ? communityData.memberProfiles
          : existingCommunity?.memberProfiles) || [],
    };

    if (existingCommunity) {
      set((state) => {
        const updatedState = {
          ...state,
          communities: state.communities.map((c) =>
            c.id === existingCommunity!.id ? mergedCommunity : c
          ),
          activeCommunityId: mergedCommunity.id,
        };

        persistenceService.saveCommunityData(updatedState);
        return updatedState;
      });
      return true;
    }

    if (communities.length >= unlockedSlots) {
      return false;
    }

    set((state) => {
      const updatedState = {
        ...state,
        communities: [...state.communities, mergedCommunity],
        activeCommunityId: mergedCommunity.id,
      };

      persistenceService.saveCommunityData(updatedState);
      return updatedState;
    });

    return true;
  },
  
  leaveCommunity: (communityId) => {
    set((state) => {
      const updatedState = {
        communities: state.communities.filter(c => c.id !== communityId),
        activeCommunityId: state.activeCommunityId === communityId 
          ? (state.communities.find(c => c.id !== communityId)?.id || null)
          : state.activeCommunityId,
      };
      
      // Auto-save community data
      persistenceService.saveCommunityData(updatedState);
      
      return updatedState;
    });
  },
  
  switchActiveCommunity: (communityId) => {
    const { communities } = get();
    const community = communities.find(c => c.id === communityId);
    if (community) {
      set((state) => {
        const updatedState = { ...state, activeCommunityId: communityId };
        // Auto-save community data
        persistenceService.saveCommunityData(updatedState);
        return updatedState;
      });
    }
  },
  
  createCommunity: (communityData) => {
    // If communityData already has an inviteCode, use it (from Firebase)
    // Otherwise generate a new one for local communities
    let inviteCode = communityData.inviteCode;
    
    if (!inviteCode) {
      // Generate a unique 6-character alphanumeric code for local communities
      const generateUniqueCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      // Ensure the code is unique by checking against existing communities
      inviteCode = generateUniqueCode();
      const { communities } = get();
      while (communities.some(c => c.inviteCode === inviteCode)) {
        inviteCode = generateUniqueCode();
      }
    }
    
    // Create consistent ID based on invite code for demo purposes
    const communityId = `community-${inviteCode.toLowerCase()}`;
    
    const newCommunity: Community = {
      ...communityData,
      id: communityId,
      membersCount: 1,
      inviteCode,
      joinedAt: new Date(),
      ownerId: communityData.ownerId,
    };
    
    set((state) => {
      const updatedState = {
        communities: [...state.communities, newCommunity],
        activeCommunityId: newCommunity.id,
        challenges: state.challenges,
        leaderboard: state.leaderboard.length ? state.leaderboard : [],
      };
      
      // Auto-save community data
      persistenceService.saveCommunityData(updatedState);
      
      return updatedState;
    });
    
    return newCommunity;
  },

  createChallenge: async ({
    title,
    description,
    target = 0,
    duration = 7,
    createdBy,
    createdByName,
    communityId,
  }) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return null;
    }

    const baseChallenge: Challenge = {
      id: `challenge-${Date.now()}`,
      title: trimmedTitle,
      description: description.trim(),
      type: 'workouts',
      target,
      duration,
      isJoined: false,
      progress: 0,
      endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
      createdBy,
      createdAt: new Date(),
      communityId,
      createdByName,
    };

    let challengeToStore = baseChallenge;

    if (communityId && createdBy) {
      try {
        const firebaseChallenge = await communityService.createCommunityChallenge({
          communityId,
          title: trimmedTitle,
          description: description.trim(),
          target,
          createdBy,
          createdByName,
        });

        challengeToStore = {
          id: firebaseChallenge.id,
          title: firebaseChallenge.name,
          description: firebaseChallenge.description,
          type: 'workouts',
          target: firebaseChallenge.target,
          duration: Math.ceil(
            (firebaseChallenge.endDate.getTime() - firebaseChallenge.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          isJoined: false,
          progress: 0,
          endDate: firebaseChallenge.endDate,
          createdBy: firebaseChallenge.createdBy,
          createdByName: firebaseChallenge.createdByName,
          createdAt: firebaseChallenge.createdAt,
          communityId,
        };
      } catch (error) {
        console.error('❌ Error creating challenge in Firebase:', error);
        // fall back to local creation if Firebase fails
      }
    }

    set((state) => ({
      ...state,
      challenges: [...state.challenges, challengeToStore],
    }));

    await persistenceService.saveCommunityData(get());

    if (challengeToStore.communityId && challengeToStore.createdBy && challengeToStore.createdByName) {
      await get().createFeedEntry(challengeToStore.communityId, {
        userId: challengeToStore.createdBy,
        displayName: challengeToStore.createdByName,
        message: `${challengeToStore.createdByName} created a new challenge: "${challengeToStore.title}"`,
        challengeId: challengeToStore.id,
      });
    }

    return challengeToStore;
  },
  
  createFeedEntry: async (communityId, { userId, displayName, message, workoutId, challengeId }) => {
    try {
      const feedDoc = await communityService.addCommunityFeedEntry({
        communityId,
        userId,
        displayName,
        message,
        workoutId,
        challengeId,
      });

      set((state) => {
        const existing = state.feedEntriesByCommunity[communityId] || [];
        const updatedEntries = [feedDoc, ...existing].sort((a, b) =>
          (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        );

        const updatedState = {
          ...state,
          feedEntriesByCommunity: {
            ...state.feedEntriesByCommunity,
            [communityId]: updatedEntries,
          },
        };

        persistenceService.saveCommunityData(updatedState);
        return updatedState;
      });
    } catch (error) {
      console.error('❌ Error creating community feed entry:', error);
    }
  },

  loadCommunityFeed: async (communityId) => {
    try {
      if (!communityId) {
        return;
      }

      const entries = await communityService.getCommunityFeedEntries(communityId);

      set((state) => {
        const updatedState = {
          ...state,
          feedEntriesByCommunity: {
            ...state.feedEntriesByCommunity,
            [communityId]: entries,
          },
        };
        persistenceService.saveCommunityData(updatedState);
        return updatedState;
      });
    } catch (error) {
      console.error('❌ Error loading community feed:', error);
    }
  },

  subscribeToCommunityFeed: (communityId) => {
    if (!communityId) {
      return () => {};
    }

    const unsubscribe = communityService.subscribeToCommunityFeed(
      communityId,
      (entries) => {
        set((state) => ({
          ...state,
          feedEntriesByCommunity: {
            ...state.feedEntriesByCommunity,
            [communityId]: entries,
          },
        }));
      }
    );

    return unsubscribe;
  },
  
  createPersonalCommunity: async ({ name, description, type, ownerId, ownerName }) => {
    try {
      if (!ownerId) {
        console.error('❌ createPersonalCommunity requires ownerId');
        return null;
      }

      const community = await communityService.createPersonalCommunity({
        name,
        description,
        type,
        ownerId,
        ownerName,
      });

      const { joinCommunity } = get();
      joinCommunity({
        id: community.id,
        name: community.name,
        type: community.type as Community['type'],
        description: community.description,
        inviteCode: community.inviteCode,
        membersCount: community.membersCount,
        ownerId: community.ownerId,
        role: 'owner',
        memberNames: [community.ownerName],
        memberProfiles: [{ uid: ownerId, displayName: ownerName }],
      });

      await get().createFeedEntry(community.id, {
        userId: ownerId,
        displayName: ownerName,
        message: `${ownerName} created this community!`,
      });

      set({ activeCommunityId: community.id });
      return get().communities.find((c) => c.id === community.id) || null;
    } catch (error) {
      console.error('❌ Error creating personal community:', error);
      return null;
    }
  },

  joinPersonalCommunityByCode: async ({ inviteCode, uid, displayName }) => {
    try {
      if (!uid) {
        console.error('❌ joinPersonalCommunityByCode requires uid');
        return null;
      }

      const normalizedCode = inviteCode.trim().toUpperCase();
      const community = await communityService.getCommunityByInviteCode(normalizedCode);

      if (!community) {
        return null;
      }

      const result = await communityService.joinPersonalCommunity({
        communityId: community.id,
        uid,
        displayName,
      });

      if (!result) {
        return null;
      }

      const memberNames = result.members.map((member) => member.displayName || 'Friend');
      const { joinCommunity } = get();

      joinCommunity({
        id: result.community.id,
        name: result.community.name,
        type: result.community.type as Community['type'],
        description: result.community.description,
        inviteCode: result.community.inviteCode,
        membersCount: result.community.membersCount,
        ownerId: result.community.ownerId,
        role: result.membership.role === 'owner' ? 'owner' : 'player',
        memberNames,
        memberProfiles: result.members.map((member) => ({
          uid: member.uid,
          displayName: member.displayName,
        })),
      });

      await get().createFeedEntry(result.community.id, {
        userId: uid,
        displayName,
        message: `${displayName} joined the community!`,
      });

      set({ activeCommunityId: result.community.id });
      return get().communities.find((c) => c.id === result.community.id) || null;
    } catch (error) {
      console.error('❌ Error joining personal community:', error);
      return null;
    }
  },

  loadPersonalCommunitiesFromFirebase: async (uid: string) => {
    try {
      if (!uid) {
        return;
      }

      const results = await communityService.getUserCommunities(uid);
      const { joinCommunity, loadCommunityChallenges } = get();

      for (const { community, membership, members } of results) {
        const memberNames = members.map((member) => member.displayName || 'Friend');
        joinCommunity({
          id: community.id,
          name: community.name,
          type: community.type as Community['type'],
          description: community.description,
          inviteCode: community.inviteCode,
          membersCount: community.membersCount,
          ownerId: community.ownerId,
          role: membership.role === 'owner' ? 'owner' : 'player',
          memberNames,
          memberProfiles: members.map((member) => ({
            uid: member.uid,
            displayName: member.displayName,
          })),
        });
        await loadCommunityChallenges(community.id);
        await get().loadCommunityFeed(community.id);
      }
    } catch (error) {
      console.error('❌ Error loading personal communities from Firebase:', error);
    }
  },

  loadCommunityChallenges: async (communityId: string) => {
    try {
      if (!communityId) {
        return;
      }

      const firebaseChallenges = await communityService.getCommunityChallenges(communityId);

      set((state) => {
        const filtered = state.challenges.filter(
          (challenge) => challenge.communityId !== communityId
        );

        const mapped = firebaseChallenges.map((challenge) => ({
          id: challenge.id,
          title: challenge.name,
          description: challenge.description,
          type: 'workouts' as const,
          target: challenge.target,
          duration: Math.ceil(
            (challenge.endDate.getTime() - challenge.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          isJoined: false,
          progress: 0,
          endDate: challenge.endDate,
          createdBy: challenge.createdBy,
          createdByName: challenge.createdByName,
          createdAt: challenge.createdAt,
          communityId,
        }));

        const updatedState = {
          ...state,
          challenges: [...filtered, ...mapped],
        };

        persistenceService.saveCommunityData(updatedState);
        return updatedState;
      });

    } catch (error) {
      console.error('❌ Error loading community challenges:', error);
    }
  },
  
  loadCommunityFeed: async (communityId: string) => {
    try {
      if (!communityId) {
        return;
      }

      const feedEntries = await communityService.getCommunityFeedEntries(communityId);

      set((state) => {
        const updatedState = {
          ...state,
          feedEntriesByCommunity: {
            ...state.feedEntriesByCommunity,
            [communityId]: feedEntries.map(entry => ({
              id: entry.id,
              communityId: entry.communityId,
              userId: entry.userId,
              displayName: entry.displayName,
              message: entry.message,
              workoutId: entry.workoutId,
              challengeId: entry.challengeId,
              createdAt: entry.createdAt,
            })),
          },
        };
        persistenceService.saveCommunityData(updatedState);
        return updatedState;
      });
    } catch (error) {
      console.error('❌ Error loading community feed:', error);
    }
  },

  subscribeToCommunityFeed: (communityId: string) => {
    if (!communityId) {
      return () => {};
    }

    const unsubscribe = communityService.subscribeToCommunityFeed(
      communityId,
      (entries) => {
        set((state) => ({
          ...state,
          feedEntriesByCommunity: {
            ...state.feedEntriesByCommunity,
            [communityId]: entries,
          },
        }));
      }
    );

    return unsubscribe;
  },
  
  unlockSlot: () => {
    const { unlockedSlots } = get();
    if (unlockedSlots < 3) {
      set({ unlockedSlots: unlockedSlots + 1 });
      return true;
    }
    return false;
  },
  
  getAvailableSlots: () => {
    const { communities, unlockedSlots } = get();
    return unlockedSlots - communities.length;
  },
  
  joinChallenge: async (challengeId, uid) => {
    try {
      if (!uid) {
        console.log('No UID provided, skipping challenge join');
        return;
      }

      console.log('🏆 Joining challenge for user:', uid);
      console.log('📋 Challenge ID:', challengeId);

      // Save to Firebase first
      await communityService.joinChallenge({
        uid,
        challengeId,
        progress: 0,
        completed: false,
      });

      const challenge = get().challenges.find((c) => c.id === challengeId);

      // Update local state
      set((state) => ({
        challenges: state.challenges.map(challenge =>
          challenge.id === challengeId
            ? { ...challenge, isJoined: true, progress: 0 }
            : challenge
        ),
      }));

      if (challenge?.communityId) {
        const { userDoc } = useUserStore.getState();
        const displayName =
          userDoc?.firstName ||
          userDoc?.displayName ||
          useUserStore.getState().profile?.firstName ||
          'Member';
        await get().createFeedEntry(challenge.communityId, {
          userId: uid,
          displayName,
          message: `${displayName} joined the challenge "${challenge.title}"`,
          challengeId: challenge.id,
        });
      }

      console.log('✅ Challenge joined successfully');
    } catch (error: any) {
      console.error('❌ Error joining challenge:', error);
      console.error('❌ Error details:', error.message);
    }
  },
  
  updateChallengeProgress: (challengeId, progress) => {
    set((state) => ({
      challenges: state.challenges.map(challenge =>
        challenge.id === challengeId
          ? { ...challenge, progress: Math.min(100, Math.max(0, progress)) }
          : challenge
      ),
    }));
  },

  deleteChallenge: async (challengeId, communityId) => {
    try {
      if (!challengeId || !communityId) {
        return;
      }

      await communityService.deleteCommunityChallenge(challengeId);
      await communityService.deleteCommunityFeedEntriesByChallengeId(challengeId);

      set((state) => {
        const updatedChallenges = state.challenges.filter(
          (challenge) => challenge.id !== challengeId
        );

        const updatedFeedEntries = {
          ...state.feedEntriesByCommunity,
        };

        if (updatedFeedEntries[communityId]) {
          updatedFeedEntries[communityId] = updatedFeedEntries[communityId].filter(
            (entry) => entry.challengeId !== challengeId
          );
        }

        const updatedState = {
          ...state,
          challenges: updatedChallenges,
          feedEntriesByCommunity: updatedFeedEntries,
        };

        persistenceService.saveCommunityData(updatedState);
        return updatedState;
      });
    } catch (error) {
      console.error('❌ Error deleting challenge:', error);
    }
  },
  
  updateLeaderboard: (entries) => {
    set({ leaderboard: entries });
  },
  
  generateMockCommunities: (city) => {
    const communityNames = [
      'FitZone Community', 'PowerHouse Friends', 'Elite Sports Team',
      'Iron Paradise Squad', 'Flex Fitness Group', 'Muscle Factory Team',
      'Stronghold Community', 'Peak Performance', 'BodyWorks Squad',
      'FitLife Center'
    ];
    
    return communityNames.map((name, index) => ({
      id: `community-${city.toLowerCase()}-${index}`,
      name,
      type: index % 2 === 0 ? 'friends' as const : 'sports' as const,
      membersCount: Math.floor(Math.random() * 20) + 5,
      location: { city },
      joinedAt: new Date(),
    }));
  },
  
  validateInviteCode: (code) => {
    // Mock validation - in real app, this would check against backend
    return code.length === 6 && /^[A-Z0-9]+$/.test(code);
  },

  // Firebase integration methods
  loadUserChallengesFromFirebase: async (uid: string) => {
    try {
      console.log('🏆 Loading user challenges from Firebase for user:', uid);
      
      if (!uid) {
        console.error('❌ No UID provided for challenges loading');
        return;
      }

      const userChallenges = await communityService.getUserChallenges(uid);
      console.log('📊 Raw Firebase user challenges received:', userChallenges.length);

      if (!userChallenges || userChallenges.length === 0) {
        console.log('ℹ️ No user challenges found in Firebase for this user');
        return;
      }

      // Update local challenges with user's progress
      set((state) => ({
        challenges: state.challenges.map(challenge => {
          const userChallenge = userChallenges.find(uc => uc.challengeId === challenge.id);
          if (userChallenge) {
            return {
              ...challenge,
              isJoined: true,
              progress: userChallenge.progress,
            };
          }
          return challenge;
        }),
      }));

      console.log('✅ Successfully loaded user challenges from Firebase!');
      console.log('📋 User challenges summary:', userChallenges.map(uc => ({
        challengeId: uc.challengeId,
        progress: uc.progress,
        joinedAt: uc.joinedAt
      })));

    } catch (error: any) {
      console.error('❌ Error loading user challenges from Firebase:', error);
      console.error('❌ Error details:', error.message);
    }
  },

  loadActiveChallengesFromFirebase: async () => {
    try {
      console.log('🏆 Loading active challenges from Firebase');

      const activeChallenges = await communityService.getActiveChallenges();
      console.log('📊 Raw Firebase active challenges received:', activeChallenges.length);

      if (!activeChallenges || activeChallenges.length === 0) {
        console.log('ℹ️ No active challenges found in Firebase');
        return;
      }

      // Convert to local format
      const challenges: Challenge[] = activeChallenges.map(challenge => ({
        id: challenge.id,
        title: challenge.name, // Use 'name' instead of 'title'
        description: challenge.description,
        type: challenge.type as 'workouts' | 'steps' | 'streak' | 'points',
        target: challenge.target,
        duration: Math.ceil((challenge.endDate.getTime() - challenge.startDate.getTime()) / (1000 * 60 * 60 * 24)), // Calculate duration
        isJoined: false, // Will be updated by loadUserChallengesFromFirebase
        progress: 0,
        endDate: challenge.endDate,
      }));

      set({ challenges });
      console.log('✅ Successfully loaded active challenges from Firebase!');
      console.log('📋 Active challenges summary:', challenges.map(c => ({
        title: c.title,
        type: c.type,
        target: c.target,
        duration: c.duration
      })));

    } catch (error: any) {
      console.error('❌ Error loading active challenges from Firebase:', error);
      console.error('❌ Error details:', error.message);
    }
  },

  // Persistence methods
  saveCommunityData: async () => {
    try {
      const { communities, activeCommunityId, challenges, leaderboard, unlockedSlots, feedEntriesByCommunity } = get();
      const communityData = {
        communities,
        activeCommunityId,
        challenges,
        leaderboard,
        unlockedSlots,
        feedEntriesByCommunity,
      };
      
      await persistenceService.saveCommunityData(communityData);
      console.log('✅ Community data saved to local storage');
    } catch (error) {
      console.error('❌ Failed to save community data:', error);
    }
  },

  loadCommunityData: async () => {
    try {
      console.log('📱 Loading community data from local storage...');
      const communityData = await persistenceService.loadCommunityData();
      
      if (communityData) {
        console.log(`📱 Restored community data: ${communityData.communities?.length || 0} communities`);
        set({
          communities: communityData.communities || [],
          activeCommunityId: communityData.activeCommunityId || null,
          challenges: communityData.challenges || [],
          leaderboard: communityData.leaderboard || [],
          unlockedSlots: communityData.unlockedSlots || 1,
          feedEntriesByCommunity: communityData.feedEntriesByCommunity || {},
        });
      }
      
      console.log('📱 Community data loaded from local storage');
    } catch (error) {
      console.error('❌ Failed to load community data:', error);
    }
  },

  clearCommunityData: async () => {
    try {
      await persistenceService.clearCommunityData();
      set({
        communities: [],
        activeCommunityId: null,
        challenges: [],
        leaderboard: [],
        unlockedSlots: 1,
        feedEntriesByCommunity: {},
      });
      console.log('✅ Community data cleared from local storage');
    } catch (error) {
      console.error('❌ Failed to clear community data:', error);
    }
  },
}));

// Initialize with mock data ONLY for demo users
export const initializeCommunityStore = (userId?: string) => {
  const store = useCommunityStore.getState();
  
  // Only initialize with mock data for demo/test users
  if (!userId || (!userId.includes('bruce') && !userId.includes('demo') && !userId.includes('test'))) {
    console.log('🆕 New user detected - skipping mock data initialization');
    return;
  }
  
  // Only initialize if not already initialized
  if (store.challenges.length > 0) {
    return;
  }
  
  // Add mock challenges
  const mockChallenges: Challenge[] = [
    {
      id: 'challenge-1',
      title: '12 Workouts in 30 Days',
      description: 'Complete 12 workouts within the next 30 days',
      type: 'workouts',
      target: 12,
      duration: 30,
      isJoined: false,
      progress: 0,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'challenge-2',
      title: '20,000 Steps This Week',
      description: 'Walk 20,000 steps by the end of the week',
      type: 'steps',
      target: 20000,
      duration: 7,
      isJoined: false,
      progress: 0,
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'challenge-3',
      title: '7-Day Streak',
      description: 'Maintain a 7-day workout streak',
      type: 'streak',
      target: 7,
      duration: 7,
      isJoined: false,
      progress: 0,
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
  
  // Start with empty leaderboard - users will populate it as they join
  const mockLeaderboard: LeaderboardEntry[] = [];
  
  store.updateLeaderboard(mockLeaderboard);
  useCommunityStore.setState({ challenges: mockChallenges });
};
