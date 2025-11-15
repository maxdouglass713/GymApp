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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router, useLocalSearchParams } from 'expo-router';
import { useCommunityStore } from '@/stores/communityStore';
import { UnlockModal } from '@/components/UnlockModal';
import { useAuth } from '@/components/AuthProvider';
import { useUserStore } from '@/stores/userStore';

export default function JoinFriendsWorkScreen() {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const {
    createPersonalCommunity,
    joinPersonalCommunityByCode,
    validateInviteCode,
    getAvailableSlots,
  } = useCommunityStore();
  const { type } = useLocalSearchParams();
  const { user } = useAuth();
  const { profile, userDoc } = useUserStore();
  
  const [mode, setMode] = useState<'select' | 'join' | 'create'>('select');
  const [inviteCode, setInviteCode] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [description, setDescription] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const communityType = (type as 'friends' | 'work') || 'friends'; // Default to 'friends' if type is undefined
  const typeLabel = communityType === 'friends' ? 'Friends' : 'Work';
  
  const resolveDisplayName = () =>
    userDoc?.firstName ||
    profile?.firstName ||
    user?.displayName ||
    'Friend';

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Enter Code', 'Please enter an invite code.');
      return;
    }
    
    if (!validateInviteCode(inviteCode.trim())) {
      Alert.alert('Invalid Code', 'The invite code you entered is not valid. Please check and try again.');
      return;
    }
    
    if (!user?.uid) {
      Alert.alert('Sign In Required', 'Please sign in before joining a community.');
      return;
    }

    try {
      setIsProcessing(true);
      const community = await joinPersonalCommunityByCode({
        inviteCode: inviteCode.trim().toUpperCase(),
        uid: user.uid,
        displayName: resolveDisplayName(),
      });

      if (community) {
      Alert.alert(
        'Welcome to the Community! 🎉',
          `You've successfully joined ${community.name}! You can now participate in challenges, view the leaderboard, and connect with other members.`,
        [
          {
            text: 'Let\'s Go!',
            onPress: () => {
              router.push('/(tabs)/community');
            },
          },
        ]
      );
    } else {
        Alert.alert('Community Not Found', 'We could not find a community with that invite code.');
      }
    } catch (error) {
      console.error('❌ Error joining community by code:', error);
      Alert.alert('Error', 'Unable to join this community. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleCreateCommunity = async () => {
    if (!communityName.trim()) {
      Alert.alert('Enter Name', 'Please enter a community name.');
      return;
    }
    
    const availableSlots = getAvailableSlots();
    
    if (availableSlots <= 0) {
      setShowUnlockModal(true);
      return;
    }
    
    if (!user?.uid) {
      Alert.alert('Sign In Required', 'Please sign in before creating a community.');
      return;
    }

    try {
      setIsProcessing(true);
      const community = await createPersonalCommunity({
      name: communityName.trim(),
      type: communityType,
      description: description.trim() || undefined,
        ownerId: user.uid,
        ownerName: resolveDisplayName(),
    });

      if (!community) {
        Alert.alert('Error', 'Unable to create the community. Please try again.');
        return;
      }
    
    Alert.alert(
      'Community Created! 🎊',
        `Your ${typeLabel.toLowerCase()} community "${community.name}" has been created!\n\nInvite Code: ${community.inviteCode}\n\nShare this code with others to let them join your community and start competing together!`,
      [
        {
          text: 'Share Invite Code',
          onPress: () => {
              Alert.alert(
                'Share Invite Code',
                `Invite Code: ${community.inviteCode}\n\nShare this code with your ${typeLabel.toLowerCase()} to get them started!`
              );
          },
        },
        {
          text: 'Let\'s Go!',
          onPress: () => {
            router.push('/(tabs)/community');
          },
        },
      ]
    );
    } catch (error) {
      console.error('❌ Error creating personal community:', error);
      Alert.alert('Error', 'Unable to create the community. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const renderSelectMode = () => (
    <View style={styles.modeContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        What would you like to do?
      </Text>
      
      <TouchableOpacity
        style={[styles.modeCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
        onPress={() => setMode('join')}
      >
        <View style={styles.modeHeader}>
          <IconSymbol name="person.badge.plus" size={24} color={colors.tint} />
          <View style={styles.modeInfo}>
            <Text style={[styles.modeTitle, { color: colors.text }]}>
              Join with Code
            </Text>
            <Text style={[styles.modeDescription, { color: colors.icon }]}>
              Enter an invite code to join an existing community
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.icon} />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.modeCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
        onPress={() => setMode('create')}
      >
        <View style={styles.modeHeader}>
          <IconSymbol name="plus.circle" size={24} color={colors.tint} />
          <View style={styles.modeInfo}>
            <Text style={[styles.modeTitle, { color: colors.text }]}>
              Create New
            </Text>
            <Text style={[styles.modeDescription, { color: colors.icon }]}>
              Create a new community and invite others
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.icon} />
        </View>
      </TouchableOpacity>
    </View>
  );
  
  const renderJoinMode = () => (
    <View style={styles.formContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Join {typeLabel} Community
      </Text>
      
      <Text style={[styles.sectionDescription, { color: colors.icon }]}>
        Ask a member of the community for their invite code
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Invite Code
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.icon + '20', color: colors.text }]}
          placeholder="Enter 6-character code..."
          placeholderTextColor={colors.icon}
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          maxLength={6}
        />
      </View>
      
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: isProcessing ? colors.icon : colors.tint },
        ]}
        onPress={handleJoinWithCode}
        disabled={isProcessing}
      >
        <Text style={styles.primaryButtonText}>
          {isProcessing ? 'Joining...' : 'Join Community'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.backToSelect}
        onPress={() => setMode('select')}
      >
        <Text style={[styles.backToSelectText, { color: colors.icon }]}>
          ← Back to options
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderCreateMode = () => (
    <View style={styles.formContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Create {typeLabel} Community
      </Text>
      
      <Text style={[styles.sectionDescription, { color: colors.icon }]}>
        Set up a new community for your {typeLabel.toLowerCase()}
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Community Name
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.icon + '20', color: colors.text }]}
          placeholder={`Enter ${typeLabel.toLowerCase()} community name...`}
          placeholderTextColor={colors.icon}
          value={communityName}
          onChangeText={setCommunityName}
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          Description (Optional)
        </Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.background, borderColor: colors.icon + '20', color: colors.text }]}
          placeholder="Describe your community..."
          placeholderTextColor={colors.icon}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
      
      <TouchableOpacity
        style={[
          styles.primaryButton,
          { backgroundColor: isProcessing ? colors.icon : colors.tint },
        ]}
        onPress={handleCreateCommunity}
        disabled={isProcessing}
      >
        <Text style={styles.primaryButtonText}>
          {isProcessing ? 'Creating...' : 'Create Community'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.backToSelect}
        onPress={() => setMode('select')}
      >
        <Text style={[styles.backToSelectText, { color: colors.icon }]}>
          ← Back to options
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.icon + '20' }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.text }]}>
          {typeLabel} Community
        </Text>
      </View>
      
      <View style={styles.content}>
        {mode === 'select' && renderSelectMode()}
        {mode === 'join' && renderJoinMode()}
        {mode === 'create' && renderCreateMode()}
      </View>
      
      <UnlockModal
        visible={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        featureKey="community_challenges"
        onUnlocked={() => {
          // Community feature unlocked, user can join communities
        }}
      />
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
  modeContainer: {
    flex: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
    marginBottom: 24,
  },
  modeCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeInfo: {
    flex: 1,
    marginLeft: 16,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
  formContainer: {
    flex: 1,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'ui-rounded',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'ui-rounded',
  },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'ui-rounded',
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  backToSelect: {
    alignItems: 'center',
  },
  backToSelectText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
});
