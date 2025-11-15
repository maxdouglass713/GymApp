import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthProvider';
import { useCommunityStore } from '@/stores/communityStore';
import { teamService } from '@/services/teamService';
import { useUserStore } from '@/stores/userStore';

export default function CreateTeamScreen() {
  const { user } = useAuth();
  const { createCommunity } = useCommunityStore();
  const { updateUserDoc, profile } = useUserStore();
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const sports = [
    'Basketball', 'Football', 'Soccer', 'Baseball', 'Tennis', 'Volleyball', 
    'Hockey', 'Swimming', 'Track & Field', 'Gymnastics', 'Wrestling', 'Boxing',
    'Martial Arts', 'Cycling', 'Running', 'Other'
  ];
  
  // Generate a random team code
  const generateTeamCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Error', 'Please enter a team name');
      return;
    }
    
    if (!teamDescription.trim()) {
      Alert.alert('Error', 'Please enter a team description');
      return;
    }
    
    if (!selectedSport) {
      Alert.alert('Error', 'Please select a sport');
      return;
    }
    
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a team');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Generate team code using teamService
      const code = teamService.generateInviteCode();
      setTeamCode(code);
      
      console.log('🏫 Creating team in Firebase:', {
        name: teamName.trim(),
        sport: selectedSport,
        code: code
      });
      
      // Create team in Firebase
      const coachName = profile?.firstName || user?.displayName || 'Coach';
      const teamId = await teamService.createTeam({
        name: teamName.trim(),
        description: `${selectedSport} team: ${teamDescription.trim()}`,
        sport: selectedSport,
        inviteCode: code,
        coachId: user.uid,
        coachName: coachName,
        settings: {
          isPublic: false,
          maxMembers: parseInt(profile?.teamSize?.split('-')[1] || '50'),
        },
      });
      
      console.log('✅ Team created successfully in Firebase:', teamId);
      
      // Update user profile with team information
      await updateUserDoc(user.uid, {
        teamId: teamId,
        teamInviteCode: code,
        institutionName: teamName.trim()
      });
      
      console.log('✅ User profile updated with team info');
      
      // Also create community for local state management
      const team = createCommunity({
        name: teamName.trim(),
        type: 'sports',
        description: `${selectedSport} team: ${teamDescription.trim()}`,
        inviteCode: code,
        role: 'coach',
        ownerId: user.uid,
      });
      
      console.log('✅ Local community created:', team);
      
      Alert.alert(
        'Team Created Successfully! 🎉',
        `Your ${selectedSport} team "${teamName}" has been created!\n\nTeam Code: ${code}\n\nShare this code with your players so they can join your team.`,
        [
          {
            text: 'Share Team Code',
            onPress: () => handleShareCode(code),
          },
          {
            text: 'Go to Team Management',
            onPress: () => router.push('/community/team-management'),
          },
        ]
      );
      
    } catch (error) {
      console.error('❌ Error creating team:', error);
      Alert.alert('Error', 'Failed to create team. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: `Join my sports team "${teamName}" on KINETIC FLOW AI!\n\nTeam Code: ${code}\n\nDownload the app and enter this code to join the team.`,
        title: 'Join My Sports Team',
      });
    } catch (error) {
      console.error('Error sharing:', error);
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
          Create Team
        </Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: BrandColors.text }]}>
              Team Name *
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: BrandColors.background, 
                borderColor: BrandColors.textSecondary + '20',
                color: BrandColors.text 
              }]}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Enter team name"
              placeholderTextColor={BrandColors.textSecondary}
              maxLength={50}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: BrandColors.text }]}>
              Team Description *
            </Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: BrandColors.background, 
                borderColor: BrandColors.textSecondary + '20',
                color: BrandColors.text 
              }]}
              value={teamDescription}
              onChangeText={setTeamDescription}
              placeholder="Describe your team, goals, and what players can expect"
              placeholderTextColor={BrandColors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: BrandColors.text }]}>
              Sport *
            </Text>
            <View style={styles.sportGrid}>
              {sports.map((sport) => (
                <TouchableOpacity
                  key={sport}
                  style={[
                    styles.sportButton,
                    { 
                      backgroundColor: selectedSport === sport ? BrandColors.accent : BrandColors.background,
                      borderColor: selectedSport === sport ? BrandColors.accent : BrandColors.textSecondary + '20',
                    }
                  ]}
                  onPress={() => setSelectedSport(sport)}
                >
                  <Text style={[
                    styles.sportButtonText,
                    { color: selectedSport === sport ? '#000' : BrandColors.text }
                  ]}>
                    {sport}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.infoCard}>
            <IconSymbol name="info.circle" size={20} color={BrandColors.accent} />
            <Text style={[styles.infoText, { color: BrandColors.textSecondary }]}>
              A unique team code will be generated for your players to join. You can share this code via message, email, or social media.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton, 
            { 
              backgroundColor: teamName.trim() && teamDescription.trim() && selectedSport ? BrandColors.accent : BrandColors.textSecondary + '20',
              opacity: teamName.trim() && teamDescription.trim() && selectedSport ? 1 : 0.5
            }
          ]}
          onPress={handleCreateTeam}
          disabled={!teamName.trim() || !teamDescription.trim() || !selectedSport || isCreating}
        >
          <Text style={[
            styles.createButtonText, 
            { color: teamName.trim() && teamDescription.trim() ? '#000' : BrandColors.textSecondary }
          ]}>
            {isCreating ? 'Creating...' : 'Create Team'}
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
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'ui-rounded',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'ui-rounded',
    height: 100,
    textAlignVertical: 'top',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: BrandColors.accent + '10',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  createButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  sportButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'ui-rounded',
  },
});
