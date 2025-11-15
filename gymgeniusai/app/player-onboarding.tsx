import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useCommunityStore } from '@/stores/communityStore';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/components/AuthProvider';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { teamService } from '@/services/teamService';

export default function PlayerOnboardingScreen() {
  const { updateData, data } = useOnboardingStore();
  const { joinCommunity } = useCommunityStore();
  const { completeOnboarding } = useUserStore();
  const { user } = useAuth();
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
    
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    
    setIsJoining(true);
    
    try {
      // Look up team in Firebase
      const team = await teamService.getTeamByInviteCode(teamCode.trim());
      
      if (!team) {
        Alert.alert('Error', 'No team found with this invite code. Please check the code and try again.');
        return;
      }
      
      // Join the team in Firebase
      const success = await teamService.joinTeam(team.id, user.uid, data.firstName || 'Player');
      
      if (success) {
        // Update onboarding data with team info
        updateData({
          userType: 'institution',
          institutionRole: 'player',
          institutionName: team.name,
          communityUnlocked: true,
          teamInviteCode: teamCode.trim().toUpperCase(),
          teamId: team.id, // Store Firebase team ID
        });
        
        Alert.alert(
          'Success!',
          `You've successfully joined ${team.name}! Welcome to the team.`,
          [
            {
              text: 'Continue',
              onPress: () => {
                // Go to regular onboarding to complete personal fitness questions
                router.replace('/onboarding');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to join team. You may already be a member of this team.');
      }
      
    } catch (error) {
      console.error('Error joining team:', error);
      Alert.alert('Error', 'Failed to join team. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: BrandColors.textSecondary + '20' }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={20} color={BrandColors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.title, { color: BrandColors.text }]}>
            Join Your Team
          </Text>
        </View>
        
        <View style={styles.form}>
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
              style={[styles.codeInput, { 
                backgroundColor: BrandColors.background, 
                borderColor: BrandColors.textSecondary + '20',
                color: BrandColors.text 
              }]}
              value={teamCode}
              onChangeText={(text) => setTeamCode(text.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor={BrandColors.textSecondary}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
              textAlign="center"
              fontSize={24}
              letterSpacing={4}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    width: '100%',
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
  form: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
