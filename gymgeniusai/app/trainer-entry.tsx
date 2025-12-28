import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BrandColors, ComponentStyles } from '@/constants/theme';

type EntryOption = 'trainer' | 'client';

export default function TrainerEntryScreen() {
  // V1.0: Block trainer features - redirect immediately
  useEffect(() => {
    const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
    checkFeatureOrShowComingSoon('teamManagement', 'Trainer Features');
    // Redirect back after showing alert
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 500);
  }, []);

  const [selectedOption, setSelectedOption] = useState<EntryOption | null>(null);

  const handleSelect = (option: EntryOption) => {
    const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
    checkFeatureOrShowComingSoon('teamManagement', 'Trainer Features');
    return; // Block all selection
  };

  const handleContinue = () => {
    const { checkFeatureOrShowComingSoon } = require('@/utils/features/featureFlags');
    checkFeatureOrShowComingSoon('teamManagement', 'Trainer Features');
    return; // Block continuation
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
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>How are you using Trainer Mode?</Text>
            <Text style={styles.subtitle}>
              Pick the option that best describes your role so we can set things up correctly.
            </Text>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={[
                styles.card,
                selectedOption === 'trainer' && styles.cardSelected,
              ]}
              activeOpacity={0.85}
              onPress={() => handleSelect('trainer')}
            >
              <Text style={styles.emoji}>🧑‍🏫</Text>
              <Text
                style={[
                  styles.cardTitle,
                  selectedOption === 'trainer' && styles.cardTitleSelected,
                ]}
              >
                I'm the Trainer
              </Text>
              <Text
                style={[
                  styles.cardDescription,
                  selectedOption === 'trainer' && styles.cardDescriptionSelected,
                ]}
              >
                Manage clients, build custom programs, and run everything from one dashboard.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.card,
                selectedOption === 'client' && styles.cardSelected,
              ]}
              activeOpacity={0.85}
              onPress={() => handleSelect('client')}
            >
              <Text style={styles.emoji}>🙋‍♂️</Text>
              <Text
                style={[
                  styles.cardTitle,
                  selectedOption === 'client' && styles.cardTitleSelected,
                ]}
              >
                I'm a Client
              </Text>
              <Text
                style={[
                  styles.cardDescription,
                  selectedOption === 'client' && styles.cardDescriptionSelected,
                ]}
              >
                Joining a trainer? Enter their invite code next to sync plans and messages.
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                ComponentStyles.button.primary,
                !selectedOption && styles.buttonDisabled,
              ]}
              disabled={!selectedOption}
              onPress={handleContinue}
            >
              <Text style={ComponentStyles.button.primaryText}>Continue</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: BrandColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: BrandColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  options: {
    gap: 16,
  },
  card: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.cardBackground,
  },
  cardSelected: {
    borderColor: BrandColors.accent,
    backgroundColor: BrandColors.accent + '15',
  },
  emoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.text,
    marginBottom: 8,
  },
  cardTitleSelected: {
    color: BrandColors.accent,
  },
  cardDescription: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    lineHeight: 20,
  },
  cardDescriptionSelected: {
    color: BrandColors.text,
  },
  buttonContainer: {
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});


