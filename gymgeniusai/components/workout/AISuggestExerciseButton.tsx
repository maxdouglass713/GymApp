/**
 * AI Suggest Next Exercise Button
 * 
 * Inline button that appears after exercises to suggest the next exercise
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BrandColors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { AILoadingIndicator } from '@/components/ai/AILoadingIndicator';
import { router } from 'expo-router';
import { eventBus } from '@/lib/eventBus';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';
import type { WorkoutExercise } from '@/stores/workoutStore';
import {
  buildWorkoutSuggestionContext,
  requestAISuggestion,
  buildFallbackSuggestion,
  type ExerciseSuggestion,
  type WorkoutSuggestionContext,
} from '@/services/exerciseSuggestionService';

interface AISuggestExerciseButtonProps {
  currentExercises: WorkoutExercise[];
  workoutType: 'strength' | 'cardio';
  onExerciseSuggested: (exerciseName: string) => void;
}

export function AISuggestExerciseButton({
  currentExercises,
  workoutType,
  onExerciseSuggested,
}: AISuggestExerciseButtonProps) {
  const { tier, canUseAI } = useSubscriptionStore();
  const [isSuggesting, setIsSuggesting] = useState(false);

  const presentSuggestionAlert = (
    suggestion: ExerciseSuggestion,
    context: WorkoutSuggestionContext,
    usedFallback: boolean = false
  ) => {
    const metadata: string[] = [];
    if (suggestion.muscleGroup) {
      metadata.push(`Target: ${suggestion.muscleGroup}`);
    }
    if (suggestion.sets) {
      metadata.push(`${suggestion.sets} sets`);
    }
    if (suggestion.reps) {
      metadata.push(`${suggestion.reps} reps`);
    }

    let message = metadata.join(' • ');
    if (suggestion.rationale) {
      message = `${message ? `${message}\n\n` : ''}${suggestion.rationale}`;
    }

    if (suggestion.cues && suggestion.cues.length > 0) {
      const cuesText = suggestion.cues.map((cue) => `• ${cue}`).join('\n');
      message = `${message}\n\nCues:\n${cuesText}`;
    }

    if (usedFallback) {
      message = `AI servers are busy, so here’s a smart suggestion based on your current workout.\n\n${message}`;
    }

    if (context.summary.lastExercise && !usedFallback) {
      message = `You just finished ${context.summary.lastExercise}. Here's what complements it best:\n\n${message}`;
    }

    Alert.alert('✨ AI Suggestion', message.trim(), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add Exercise',
        onPress: () => onExerciseSuggested(suggestion.exercise),
        style: 'default',
      },
    ]);
  };

  const handleSuggest = async () => {
    // Check feature flag - show "Coming Soon" if AI is disabled
    if (!checkFeatureOrShowComingSoon('aiExerciseSuggestions', 'AI Exercise Suggestions')) {
      return;
    }
    
    if (!canUseAI('workoutPlan')) {
      if (tier === 'free') {
        Alert.alert(
          'AI Feature Locked',
          'Upgrade to Basic, Pro, or Elite to unlock AI exercise suggestions!',
          [
            {
              text: 'View Plans',
              onPress: () => eventBus.emit('openAIPlans'),
              style: 'default' as const,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      } else if (tier === 'basic') {
        const { getCost } = useSubscriptionStore.getState();
        const cost = getCost('workoutPlan');
        Alert.alert(
          'Insufficient Volts',
          `AI exercise suggestions cost ${cost.toLocaleString()} Volts.\n\nBuy more Volts or upgrade to Pro for monthly AI access.`,
          [
            {
              text: 'Buy Volts',
              onPress: () => router.push('/(tabs)/store'),
              style: 'default' as const,
            },
            {
              text: 'Upgrade to Pro',
              onPress: () => eventBus.emit('openAIPlans'),
              style: 'default' as const,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      } else if (tier === 'pro') {
        Alert.alert(
          'Monthly Limit Reached',
          'You\'ve used all AI workout features this month. Upgrade to Elite for unlimited access.',
          [
            {
              text: 'Upgrade to Elite',
              onPress: () => eventBus.emit('openAIPlans'),
              style: 'default' as const,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      }
      return;
    }

    if (!currentExercises || currentExercises.length === 0) {
      Alert.alert(
        'Add an Exercise First',
        'Start your workout with at least one exercise so AI can build a relevant recommendation.'
      );
      return;
    }

    setIsSuggesting(true);
    const context = buildWorkoutSuggestionContext(currentExercises);

    try {
      const suggestion = await requestAISuggestion(workoutType, context);
      
      // Trust AI's analysis - it should have correctly analyzed the workout pattern
      // No forced overrides - let the AI's pattern recognition work
      
      presentSuggestionAlert(suggestion, context);
    } catch (error: any) {
      console.warn('⚠️ AI exercise suggestion failed, using fallback.', error);
      const fallbackSuggestion = buildFallbackSuggestion(workoutType, context);
      presentSuggestionAlert(fallbackSuggestion, context, true);
    } finally {
      setIsSuggesting(false);
    }
  };

  if (isSuggesting) {
    return (
      <View style={styles.loadingContainer}>
        <AILoadingIndicator message="Analyzing workout..." size="small" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.suggestButton, {
        backgroundColor: BrandColors.accent + '15',
        borderColor: BrandColors.accent,
      }]}
      onPress={handleSuggest}
      activeOpacity={0.7}
    >
      <IconSymbol name="sparkles" size={16} color={BrandColors.accent} />
      <Text style={[styles.suggestButtonText, { color: BrandColors.accent }]}>
        Suggest next exercise
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  suggestButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  loadingContainer: {
    marginVertical: Spacing.sm,
    alignItems: 'center',
  },
});

