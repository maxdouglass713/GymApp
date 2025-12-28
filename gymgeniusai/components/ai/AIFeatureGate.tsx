/**
 * AI Feature Gate Component
 * 
 * Futuristic component that gates AI features based on subscription tier
 * Shows upgrade prompts with modern AI aesthetic
 */

import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { BrandColors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { usePointsStore } from '@/stores/pointsStore';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { eventBus } from '@/lib/eventBus';

interface AIFeatureGateProps {
  feature: 'mealPlan' | 'macroEstimation' | 'workoutPlan';
  onProceed: () => void;
  children: React.ReactNode;
  showUsageInfo?: boolean;
  onNavigateToPlans?: () => void; // Callback to open AI Info Modal with Plans tab
  onNavigateToStore?: () => void; // Callback to navigate to store
}

export function AIFeatureGate({ 
  feature, 
  onProceed, 
  children, 
  showUsageInfo = true,
  onNavigateToPlans,
  onNavigateToStore,
}: AIFeatureGateProps) {
  const { tier, canUseAI, getRemainingUsage, getCost, AI_COSTS } = useSubscriptionStore();
  const { totalPoints } = usePointsStore();
  
  const hasAccess = canUseAI(feature);
  const remaining = getRemainingUsage(feature);
  const cost = getCost(feature);
  
  const handlePress = () => {
    if (!hasAccess) {
      if (tier === 'basic') {
        Alert.alert(
          'Insufficient Volts',
          `This AI feature costs ${cost.toLocaleString()} Volts.\n\nYou have ${totalPoints.toLocaleString()} Volts.\n\nBuy more Volts or upgrade to Pro for monthly AI access.`,
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
          `You've used all ${feature} generations this month.\n\nUpgrade to Elite for unlimited AI access.`,
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
      } else {
        Alert.alert(
          'Upgrade Required',
          'AI features require a subscription.\n\nChoose Basic, Pro, or Elite to unlock AI-powered features.',
          [{ text: 'OK', style: 'default' as const }]
        );
      }
      return;
    }
    
    onProceed();
  };
  
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.container}>
        {children}
        
        {/* Usage indicator for Pro tier */}
        {tier === 'pro' && showUsageInfo && remaining < 3 && remaining > 0 && (
          <View style={[styles.usageBanner, { backgroundColor: BrandColors.accent + '15' }]}>
            <View style={styles.usageGradient}>
              <IconSymbol name="sparkles" size={16} color={BrandColors.accent} />
              <Text style={styles.usageText}>
                {remaining} {feature === 'mealPlan' ? 'meal plan' : 
                            feature === 'macroEstimation' ? 'macro estimation' : 
                            'workout plan'} generation{remaining !== 1 ? 's' : ''} remaining this month
              </Text>
            </View>
          </View>
        )}
        
        {/* Access denied overlay for free tier */}
        {tier === 'free' && (
          <View style={styles.overlay}>
            <View style={styles.lockIcon}>
              <IconSymbol name="lock.fill" size={24} color={BrandColors.accent} />
            </View>
            <Text style={styles.overlayText}>AI Feature</Text>
            <Text style={styles.overlaySubtext}>Upgrade to unlock</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  usageBanner: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  usageGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  usageText: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 15, 31, 0.85)',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BrandColors.accent + '40',
  },
  lockIcon: {
    marginBottom: Spacing.sm,
    opacity: 0.8,
  },
  overlayText: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  overlaySubtext: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
});

