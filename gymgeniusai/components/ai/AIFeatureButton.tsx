/**
 * AI Feature Button Component
 * 
 * A visible button that shows AI features with lock/unlock status
 * Makes it easy for users to access AI features
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BrandColors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { usePointsStore } from '@/stores/pointsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { eventBus } from '@/lib/eventBus';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

export type AIFeatureType = 'mealPlan' | 'macroEstimation' | 'workoutPlan' | 'workoutTips' | 'coachFeatures';

interface AIFeatureButtonProps {
  feature: AIFeatureType;
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  onNavigateToPlans?: () => void; // Callback to open AI Info Modal with Plans tab
  onNavigateToStore?: () => void; // Callback to navigate to store
}

export function AIFeatureButton({
  feature,
  title,
  description,
  icon,
  onPress,
  size = 'medium',
  onNavigateToPlans,
  onNavigateToStore,
}: AIFeatureButtonProps) {
  const { tier, canUseAI, getRemainingUsage, getCost, AI_COSTS } = useSubscriptionStore();
  const { totalPoints } = usePointsStore();

  const hasAccess = canUseAI(feature);
  const remaining = getRemainingUsage(feature);
  const cost = getCost(feature);
  const isLocked = !hasAccess;

  const handlePress = () => {
    // Check feature flag first - show "Coming Soon" if AI is disabled
    const featureMap: Record<AIFeatureType, keyof typeof import('@/utils/features/featureFlags').FeatureFlags> = {
      mealPlan: 'mealPlans',
      workoutPlan: 'workoutPlans',
      macroEstimation: 'aiMacroEstimation',
      workoutTips: 'basicAI',
      coachFeatures: 'basicAI',
    };
    
    const featureFlag = featureMap[feature];
    if (featureFlag && !checkFeatureOrShowComingSoon(featureFlag, title)) {
      return;
    }
    
    if (!hasAccess) {
      if (tier === 'free') {
        Alert.alert(
          'AI Feature Locked',
          `${title} requires a subscription.\n\nUpgrade to Basic, Pro, or Elite to unlock AI-powered features!`,
          [
            {
              text: 'View Plans',
              onPress: () => {
                onNavigateToPlans?.() || eventBus.emit('openAIPlans');
              },
              style: 'default' as const,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      } else if (tier === 'basic') {
        Alert.alert(
          'Insufficient Volts',
          `${title} costs ${cost.toLocaleString()} Volts.\n\nYou have ${totalPoints.toLocaleString()} Volts.\n\nBuy more Volts or upgrade to Pro for monthly AI access.`,
          [
            {
              text: 'Buy Volts',
              onPress: () => {
                if (onNavigateToStore) {
                  onNavigateToStore();
                } else {
                  router.push('/(tabs)/store');
                }
              },
              style: 'default' as const,
            },
            {
              text: 'Upgrade to Pro',
              onPress: () => {
                if (onNavigateToPlans) {
                  onNavigateToPlans();
                } else {
                  eventBus.emit('openAIPlans');
                }
              },
              style: 'default' as const,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      } else if (tier === 'pro') {
        Alert.alert(
          'Monthly Limit Reached',
          `You've used all ${feature === 'mealPlan' ? 'meal plan' : feature === 'workoutPlan' ? 'workout plan' : 'macro estimation'} generations this month.\n\nUpgrade to Elite for unlimited AI access.`,
          [
            {
              text: 'Upgrade to Elite',
              onPress: () => {
                if (onNavigateToPlans) {
                  onNavigateToPlans();
                } else {
                  eventBus.emit('openAIPlans');
                }
              },
              style: 'default' as const,
            },
            { text: 'Cancel', style: 'cancel' as const },
          ]
        );
      }
      return;
    }

    onPress();
  };

  const sizeStyles = {
    small: {
      padding: Spacing.sm,
      iconSize: 20,
      titleSize: Typography.fontSize.sm,
      descSize: Typography.fontSize.xs,
    },
    medium: {
      padding: Spacing.md,
      iconSize: 24,
      titleSize: Typography.fontSize.base,
      descSize: Typography.fontSize.sm,
    },
    large: {
      padding: Spacing.lg,
      iconSize: 28,
      titleSize: Typography.fontSize.lg,
      descSize: Typography.fontSize.base,
    },
  };

  const currentSize = sizeStyles[size];
  const accentColor = tier === 'elite' ? BrandColors.accent :
                      tier === 'pro' ? BrandColors.info :
                      tier === 'basic' ? BrandColors.success :
                      BrandColors.textSecondary;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          backgroundColor: isLocked
            ? BrandColors.gray800 + '80'
            : accentColor + '15',
          borderColor: isLocked
            ? BrandColors.gray700
            : accentColor,
          borderWidth: isLocked ? 1 : 2,
          opacity: isLocked ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[
          styles.iconContainer,
          {
            backgroundColor: isLocked
              ? BrandColors.gray700 + '40'
              : accentColor + '30',
          }
        ]}>
          {isLocked ? (
            <IconSymbol name="lock.fill" size={currentSize.iconSize} color={BrandColors.textSecondary} />
          ) : (
            <>
              <IconSymbol name={icon as any} size={currentSize.iconSize} color={accentColor} />
              {/* Magic AI sparkle indicator */}
              <View style={styles.sparkleIndicator}>
                <IconSymbol name="sparkles" size={10} color={BrandColors.accent} />
              </View>
            </>
          )}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            {
              fontSize: currentSize.titleSize,
              color: isLocked ? BrandColors.textSecondary : BrandColors.text,
            }
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.description,
            {
              fontSize: currentSize.descSize,
              color: isLocked ? BrandColors.textSecondary : BrandColors.textSecondary,
            }
          ]} numberOfLines={2}>
            {description}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          {isLocked ? (
            <View style={[styles.statusBadge, { backgroundColor: BrandColors.gray700 }]}>
              <IconSymbol name="lock.fill" size={12} color={BrandColors.textSecondary} />
            </View>
          ) : tier === 'pro' && remaining !== undefined && remaining < 5 ? (
            <View style={[styles.statusBadge, { backgroundColor: BrandColors.accent + '20' }]}>
              <Text style={[styles.statusText, { color: BrandColors.accent, fontSize: 10 }]}>
                {remaining}
              </Text>
            </View>
          ) : tier === 'elite' ? (
            <View style={[styles.statusBadge, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="sparkles" size={12} color={BrandColors.accent} />
            </View>
          ) : tier === 'basic' && cost ? (
            <View style={[styles.statusBadge, { backgroundColor: BrandColors.success + '20' }]}>
              <Text style={[styles.statusText, { color: BrandColors.success, fontSize: 9 }]}>
                {cost.toLocaleString().slice(0, -3)}K V
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  sparkleIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BrandColors.accent + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: BrandColors.background,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs / 2,
  },
  description: {
    fontFamily: Typography.fontFamily,
    lineHeight: 16,
  },
  statusContainer: {
    marginLeft: Spacing.sm,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
});

