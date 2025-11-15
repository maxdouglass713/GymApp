import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthProvider';
import { useCommunityStore } from '@/stores/communityStore';
import { teamService } from '@/services/teamService';
import { useUserStore } from '@/stores/userStore';

export default function JoinTeamScreen() {
  const { user } = useAuth();
  const { joinCommunity } = useCommunityStore();
  const { updateUserDoc, profile, fetchUserDoc } = useUserStore();
  const [teamCode, setTeamCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  
  const handleJoinTeam = async () => {
    if (!teamCode.trim()) {
      Alert.alert('Error', 'Please enter a team code');
      return;
    }
    
    if (teamCode.trim().length !== 6) {
      Alert.alert('Error', 'Team code must be 6 characters long');
      return;
    }
    
    if (!user) {
      Alert.alert('Error', 'You must be logged in to join a team');
      return;
    }
    
    setIsJoining(true);
    
    try {
      console.log('🔍 Looking up team with code:', teamCode.trim().toUpperCase());
      
      // First, ensure we have the latest profile data
      console.log('👤 Current profile before fetch:', profile);
      console.log('👤 Profile firstName before fetch:', profile?.firstName);
      await fetchUserDoc(user.uid);
      const updatedProfile = useUserStore.getState().profile;
      console.log('👤 Updated profile after fetch:', updatedProfile);
      console.log('👤 Updated profile firstName after fetch:', updatedProfile?.firstName);
      console.log('👤 Updated profile keys:', Object.keys(updatedProfile || {}));
      
      // Get the user's Firebase document directly to ensure we have the firstName
      const userDoc = useUserStore.getState().userDoc;
      console.log('👤 UserDoc from store:', userDoc);
      console.log('👤 UserDoc firstName:', userDoc?.firstName);
      
      // Find the team by invite code
      const team = await teamService.getTeamByInviteCode(teamCode.trim().toUpperCase());
      
      if (!team) {
        Alert.alert('Team Not Found', 'No team found with this code. Please check the code and try again.');
        return;
      }
      
      console.log('✅ Found team:', team.name);
      console.log('🏆 Team ID:', team.id);
      console.log('🏆 Team invite code:', team.inviteCode);
      console.log('👥 Current team members:', team.members);
      
      // Join the team in Firebase
      // Try multiple sources for the player name in order of reliability
      const playerName =
        userDoc?.firstName ||
        updatedProfile?.firstName ||
        user?.displayName ||
        'Player';
      console.log('👤 Profile data:', updatedProfile);
      console.log('👤 User data:', user);
      console.log('👤 UserDoc data:', userDoc);
      console.log('👤 Attempting to join team as user:', user.uid, 'with name:', playerName);
      console.log('👤 UserDoc firstName:', userDoc?.firstName);
      console.log('👤 Profile firstName:', updatedProfile?.firstName);
      console.log('👤 User displayName:', user?.displayName);
      const success = await teamService.joinTeam(team.id, user.uid, playerName);
      
      if (!success) {
        console.log('❌ Failed to join team - joinTeam returned false');
        Alert.alert('Error', 'Failed to join team. You may already be a member of this team.');
        return;
      }
      
      console.log('✅ Successfully joined team in Firebase');
      
      // Update user profile with team information
      console.log('👤 Updating user profile with team info...');
      await updateUserDoc(user.uid, {
        teamId: team.id,
        teamInviteCode: team.inviteCode,
        institutionName: team.name
      });
      
      console.log('✅ User profile updated with team info');
      
      // Verify the team was updated correctly
      console.log('🔍 Verifying team was updated...');
      const updatedTeam = await teamService.getTeamById(team.id);
      console.log('👥 Team members after joining:', updatedTeam?.members);
      console.log('👥 Player count after joining:', updatedTeam?.members?.filter(m => m.role === 'player').length);
      
      // Also join the community for local state management
      const communitySuccess = joinCommunity({
        name: team.name,
        type: 'sports',
        description: team.description,
        inviteCode: team.inviteCode,
        membersCount: team.members?.length || 1,
        role: 'player',
        ownerId: team.coachId,
        memberNames: team.members
          ?.filter((member) => member.role !== 'coach')
          .map((member) => member.name || 'Player'),
      });
      
      if (communitySuccess) {
        console.log('✅ Local community joined');
      }
      
      Alert.alert(
        'Successfully Joined Team! 🎉',
        `Welcome to ${team.name}! You're now part of the team and can start receiving workouts and meal plans from your coach.`,
        [
          {
            text: 'Go to Community',
            onPress: () => router.push('/(tabs)/community'),
          },
        ]
      );
      
    } catch (error) {
      console.error('❌ Error joining team:', error);
      Alert.alert('Error', 'Failed to join team. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BrandColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: BrandColors.textSecondary + '20' }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color={BrandColors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: BrandColors.text }]}>
          Join Team
        </Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol name="person.2" size={64} color={BrandColors.accent} />
        </View>
        
        <Text style={[styles.subtitle, { color: BrandColors.text }]}>
          Enter Team Code
        </Text>
        
        <Text style={[styles.description, { color: BrandColors.textSecondary }]}>
          Ask your coach for the 6-character team code to join their team
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            value={teamCode}
            onChangeText={(text) => setTeamCode(text.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={BrandColors.textSecondary}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="center"
            style={[
              styles.codeInput,
              {
                backgroundColor: BrandColors.background,
                borderColor: BrandColors.textSecondary + '20',
                color: BrandColors.text,
                fontSize: 24,
                letterSpacing: 4,
              }
            ]}
          />
        </View>
        <View style={styles.infoCard}>
          <IconSymbol name="info.circle" size={20} color={BrandColors.accent} />
          <Text style={[styles.infoText, { color: BrandColors.textSecondary }]}>
            The team code is case-insensitive. Your coach can share this code via message, email, or in person.
          </Text>
        </View>
        
        <View style={styles.featuresList}>
          <Text style={[styles.featuresTitle, { color: BrandColors.text }]}>
            What you'll get as a team member:
          </Text>
          
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#22c55e" />
            <Text style={[styles.featureText, { color: BrandColors.textSecondary }]}>
              Receive assigned workouts from your coach
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#22c55e" />
            <Text style={[styles.featureText, { color: BrandColors.textSecondary }]}>
              Get personalized meal plans
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#22c55e" />
            <Text style={[styles.featureText, { color: BrandColors.textSecondary }]}>
              Share progress with your team
            </Text>
          </View>
          
          <View style={styles.featureItem}>
            <IconSymbol name="checkmark.circle.fill" size={16} color="#22c55e" />
            <Text style={[styles.featureText, { color: BrandColors.textSecondary }]}>
              Participate in team challenges
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.joinButton, 
            { 
              backgroundColor: teamCode.trim().length === 6 ? BrandColors.accent : BrandColors.textSecondary + '20',
              opacity: teamCode.trim().length === 6 ? 1 : 0.5
            }
          ]}
          onPress={handleJoinTeam}
          disabled={teamCode.trim().length !== 6 || isJoining}
        >
          <Text style={[
            styles.joinButtonText, 
            { color: teamCode.trim().length === 6 ? '#000' : BrandColors.textSecondary }
          ]}>
            {isJoining ? 'Joining...' : 'Join Team'}
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: BrandColors.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontFamily: 'ui-rounded',
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BrandColors.accent + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 32,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
    flex: 1,
  },
  featuresList: {
    width: '100%',
    gap: 16,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  joinButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
});
