import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useUserStore } from '@/stores/userStore';
import { useCommunityStore, initializeCommunityStore } from '@/stores/communityStore';
import { teamService } from '@/services/teamService';
import { communityService } from '@/services/firestoreService';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { generateInviteCode } from '@/utils/community/communityHelpers';

export const useCommunityData = () => {
  const { user } = useAuth();
  const { profile } = useUserStore();
  const {
    loadCommunityData,
    clearCommunityData,
    joinCommunity,
    loadPersonalCommunitiesFromFirebase,
    loadCommunityChallenges,
    subscribeToCommunityFeed,
    loadCommunityFeed,
  } = useCommunityStore();
  const [firebaseTeamData, setFirebaseTeamData] = useState<any>(null);
  const [personalCommunityUnsub, setPersonalCommunityUnsub] = useState<(() => void) | null>(null);
  const [personalFeedUnsub, setPersonalFeedUnsub] = useState<(() => void) | null>(null);
  const activeCommunityId = useCommunityStore((state) => state.activeCommunityId);

  useEffect(() => {
    let teamUnsubscribe: (() => void) | null = null;

    const subscribeToTeamUpdates = (teamId: string, role: 'coach' | 'player') => {
      if (!teamId) {
        return;
      }

      if (teamUnsubscribe) {
        teamUnsubscribe();
        teamUnsubscribe = null;
      }

      teamUnsubscribe = teamService.subscribeToTeam(teamId, (team) => {
        if (!team) {
          return;
        }

        setFirebaseTeamData(team);

        const { joinCommunity } = useCommunityStore.getState();
        const inviteCode = team.inviteCode?.toLowerCase();
        const derivedId = inviteCode ? `community-${inviteCode}` : `team-${team.id}`;

        joinCommunity({
          id: derivedId,
          name: team.name,
          type: 'sports',
          description: team.description,
          inviteCode: team.inviteCode,
          role,
          membersCount: team.members?.length || 1,
          ownerId: team.coachId,
          memberNames: (team.members || [])
            .filter((member: any) => member.role !== 'coach')
            .map((member: any) => member.name || 'Player'),
        });

        useCommunityStore.setState((state) => ({
          communities: state.communities.map((c) =>
            c.id === derivedId
              ? {
                  ...c,
                  firebaseTeam: team,
                  membersCount: team.members?.length || c.membersCount,
                  memberNames: (team.members || [])
                    .filter((member: any) => member.role !== 'coach')
                    .map((member: any) => member.name || 'Player'),
                }
              : c
          ),
        }));
        useCommunityStore.getState().loadCommunityChallenges(derivedId);
      });
    };

    const loadData = async () => {
      console.log('🔄 Loading community data...');
      console.log('👤 Profile data:', {
        userType: profile?.userType,
        institutionName: profile?.institutionName,
        institutionRole: profile?.institutionRole,
        teamId: profile?.teamId,
        teamInviteCode: profile?.teamInviteCode
      });
      
      if (!profile) {
        console.log('❌ Profile is null - this is the problem!');
        return;
      }
      
      if (!profile.teamId && !profile.teamInviteCode) {
        console.log('❌ Profile has no team information - this suggests the profile was not saved correctly after team creation');
        console.log('🔍 This is why new teams keep being created');
      }
      
      // For institutional users (coaches/admins), check if team already exists
      if (profile?.userType === 'institution' && profile?.institutionName && profile?.institutionRole !== 'player') {
        console.log('🏫 Institutional coach/admin detected');
        console.log('👤 Profile teamId:', profile?.teamId);
        console.log('👤 Profile teamInviteCode:', profile?.teamInviteCode);
        
        // Check if user already has a team
        if (profile?.teamId) {
          console.log('✅ User already has a team:', profile.teamId);
          try {
            const existingTeam = await teamService.getTeamById(profile.teamId);
            if (existingTeam) {
              console.log('✅ Found existing team:', existingTeam.name, 'Code:', existingTeam.inviteCode);
              subscribeToTeamUpdates(existingTeam.id, 'coach');
              return;
            }
          } catch (error) {
            console.error('❌ Error loading existing team:', error);
          }
        }
        
        console.log('🏫 No existing team found, creating new team...');
        
        // Force clear all community data and reset store completely
        const { clearCommunityData, joinCommunity } = useCommunityStore.getState();
        await clearCommunityData();
        
        useCommunityStore.setState({
          communities: [],
          activeCommunityId: null,
          challenges: [],
          leaderboard: [],
          unlockedSlots: 1,
        });
        
        // Also clear from AsyncStorage directly with multiple keys
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem('community_data');
          await AsyncStorage.removeItem('communityData');
          await AsyncStorage.removeItem('communities');
          console.log('🗑️ Cleared all community data from AsyncStorage');
        } catch (error) {
          console.error('❌ Error clearing AsyncStorage:', error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create team in Firebase
        try {
          console.log('🏫 Creating team with data:', {
            name: profile.institutionName,
            sport: profile.institutionSport,
            coachId: user?.uid,
            coachName: profile.firstName
          });
          
          const inviteCode = teamService.generateInviteCode();
          console.log('🔑 Generated invite code:', inviteCode);
          
          const teamId = await teamService.createTeam({
            name: profile.institutionName,
            description: `${profile.institutionSport || 'Sports'} team`,
            sport: profile.institutionSport,
            inviteCode: inviteCode,
            coachId: user?.uid || '',
            coachName: profile.firstName || 'Coach',
            settings: {
              maxMembers: parseInt(profile.teamSize?.split('-')[1] || '50'),
              isPublic: false,
            },
          });
          
          console.log('✅ Created team in Firebase:', teamId, 'with invite code:', inviteCode);
          
          // Save teamId to user's profile in Firestore
          if (user?.uid) {
            try {
              await updateDoc(doc(db, 'users', user.uid), {
                teamId: teamId,
                teamInviteCode: inviteCode,
                updatedAt: new Date(),
              });
              console.log('✅ Saved teamId to user profile:', teamId);
            } catch (error) {
              console.error('❌ Error saving teamId to profile:', error);
            }
          }
          
          // Reload user profile to get updated teamId
          try {
            const { fetchUserDoc } = useUserStore.getState();
            if (user?.uid) {
              await fetchUserDoc(user.uid);
              console.log('✅ Profile reloaded with teamId:', teamId);
            }
          } catch (error) {
            console.error('❌ Error reloading profile:', error);
          }
          
          subscribeToTeamUpdates(teamId, 'coach');
        } catch (error) {
          console.error('❌ Error creating team in Firebase:', error);
          // Fallback to local community creation
          const institutionCommunity = {
            name: profile.institutionName,
            type: 'sports' as const,
            description: `${profile.institutionSport || 'Sports'} team`,
            role: (profile.institutionRole === 'admin' ? 'coach' : profile.institutionRole) || 'coach',
            membersCount: 1,
            inviteCode: generateInviteCode(),
            ownerId: user?.uid,
            memberNames: [profile.firstName || 'Coach'],
          };
          
          const success = joinCommunity(institutionCommunity);
          if (success) {
            console.log('✅ Created fallback local community:', institutionCommunity.name);
          }
        }
      } else if (profile?.userType === 'institution' && profile?.institutionRole === 'player') {
        // For players, load team data from Firebase
        console.log('👤 Player detected - loading team from Firebase');
        
        if (profile.teamId) {
          subscribeToTeamUpdates(profile.teamId, 'player');
        }
      } else {
        // Personal users - load communities from Firebase and reset local cache
        if (user?.uid) {
          console.log('👥 Personal user detected - syncing communities from Firebase');
          await clearCommunityData();
          await loadPersonalCommunitiesFromFirebase(user.uid);
        } else {
          await loadCommunityData();
        }
      }
    };
    
    loadData();

    return () => {
      if (teamUnsubscribe) {
        teamUnsubscribe();
      }
    };
  }, [
    user?.uid,
    loadCommunityData,
    clearCommunityData,
    loadPersonalCommunitiesFromFirebase,
    profile?.userType,
    profile?.institutionName,
    profile?.teamId,
    profile?.institutionRole,
  ]);

  useEffect(() => {
    if (profile?.userType !== 'personal') {
      if (personalCommunityUnsub) {
        personalCommunityUnsub();
        setPersonalCommunityUnsub(null);
      }
      if (personalFeedUnsub) {
        personalFeedUnsub();
        setPersonalFeedUnsub(null);
      }
      return;
    }

    const state = useCommunityStore.getState();
    const activeCommunity = state.communities.find((c) => c.id === activeCommunityId);

    if (!activeCommunity?.id) {
      if (personalCommunityUnsub) {
        personalCommunityUnsub();
        setPersonalCommunityUnsub(null);
      }
      if (personalFeedUnsub) {
        personalFeedUnsub();
        setPersonalFeedUnsub(null);
      }
      return;
    }

    loadCommunityFeed(activeCommunity.id);

    const unsubscribe = communityService.subscribeToCommunity(
      activeCommunity.id,
      (communityDoc, members) => {
        const memberNames = members.map((member) => member.displayName || 'Friend');
        const memberProfiles = members.map((member) => ({
          uid: member.uid,
          displayName: member.displayName,
        }));
        useCommunityStore.setState((currentState) => ({
          communities: currentState.communities.map((c) =>
            c.id === communityDoc.id
              ? {
                  ...c,
                  name: communityDoc.name,
                  description: communityDoc.description,
                  inviteCode: communityDoc.inviteCode,
                  membersCount: communityDoc.membersCount,
                  ownerId: communityDoc.ownerId,
                  memberNames,
                  memberProfiles,
                }
              : c
          ),
        }));
        useCommunityStore.getState().loadCommunityChallenges(communityDoc.id);
      }
    );

    const feedUnsub = subscribeToCommunityFeed(activeCommunity.id);

    setPersonalCommunityUnsub(() => unsubscribe);
    setPersonalFeedUnsub(() => feedUnsub);

    return () => {
      unsubscribe();
      feedUnsub();
      setPersonalCommunityUnsub(null);
      setPersonalFeedUnsub(null);
    };
  }, [profile?.userType, activeCommunityId, subscribeToCommunityFeed, loadCommunityFeed]);

  return { firebaseTeamData };
};

