import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { teamService } from '@/services/teamService';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function ClientTrainerCodeScreen() {
  const { updateData } = useOnboardingStore();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      Alert.alert('Invalid Code', 'Trainer invite codes are 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const team = await teamService.getTeamByInviteCode(trimmed);
      if (!team) {
        Alert.alert('Not Found', 'We could not find a trainer with that code. Double-check with your coach.');
        return;
      }

      updateData({
        appUseType: 'gym_trainer',
        userType: 'institution',
        institutionRole: 'player',
        institutionName: team.name,
        institutionSport: team.sport,
        teamInviteCode: trimmed,
        teamId: team.id,
        communityUnlocked: true,
      });

      Alert.alert('Success', `Connected to ${team.name}!`, [
        {
          text: 'Continue',
          onPress: () => router.replace('/onboarding'),
        },
      ]);
    } catch (error: any) {
      console.error('❌ Error joining trainer team:', error);
      Alert.alert('Error', error?.message || 'Unable to verify that code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Enter Your Trainer's Code</Text>
          <Text style={styles.subtitle}>
            Your trainer or gym will give you a 6-character invite code. Enter it below to sync your plans, messages, and progress.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g., 9F2KLM"
            placeholderTextColor={BrandColors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            value={code}
            onChangeText={setCode}
            keyboardType="ascii-capable"
          />

          <TouchableOpacity
            style={[
              ComponentStyles.button.primary,
              styles.joinButton,
              (isLoading || code.trim().length !== 6) && styles.joinButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={isLoading || code.trim().length !== 6}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={ComponentStyles.button.primaryText}>Join Trainer</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[ComponentStyles.button.secondary, styles.backButton]}
            onPress={() => router.replace('/trainer-entry')}
            activeOpacity={0.85}
          >
            <Text style={ComponentStyles.button.secondaryText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: BrandColors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: BrandColors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    color: BrandColors.text,
    marginBottom: 20,
  },
  joinButton: {
    width: '100%',
    marginBottom: 12,
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  backButton: {
    width: '100%',
  },
});


