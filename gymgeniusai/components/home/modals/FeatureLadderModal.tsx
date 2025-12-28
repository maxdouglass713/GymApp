/**
 * AI Features Showcase
 * 
 * Displays all AI-powered features, their unlock requirements, and usage status
 * Completely AI-oriented - no Volt-based features
 */

import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface FeatureLadderModalProps {
  visible: boolean;
  onClose: () => void;
  onViewPlans?: () => void; // Callback to open AIInfoModal with plans tab
}

interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'pro' | 'elite';
  featureKey: 'mealPlan' | 'macroEstimation' | 'workoutPlan' | 'workoutTips' | 'coachFeatures';
  location: string;
  usage?: {
    used: number;
    limit: number;
    resetDate: Date;
  };
}

const AI_FEATURES: AIFeature[] = [
  {
    id: 'meal-plans',
    name: 'AI Meal Plans',
    description: 'Generate personalized meal plans tailored to your goals and preferences',
    icon: 'fork.knife',
    tier: 'pro',
    featureKey: 'mealPlan',
    location: 'Nutrition tab → Meal Plan Generator',
  },
  {
    id: 'macro-estimation',
    name: 'AI Macro Estimation',
    description: 'Get instant macro estimates for custom meals by name and serving size',
    icon: 'chart.bar.fill',
    tier: 'pro',
    featureKey: 'macroEstimation',
    location: 'Nutrition tab → Create Custom Meal',
  },
  {
    id: 'photo-detection',
    name: 'AI Photo Detection',
    description: 'Snap a photo of your meal and let AI detect the food and estimate macros',
    icon: 'camera.fill',
    tier: 'pro',
    featureKey: 'macroEstimation',
    location: 'Nutrition tab → Search Foods → Auto-detect',
  },
  {
    id: 'workout-plans',
    name: 'AI Workout Plans',
    description: 'Create custom workout programs based on your goals, experience, and past workouts',
    icon: 'dumbbell.fill',
    tier: 'pro',
    featureKey: 'workoutPlan',
    location: 'Workout tab → Workout Plan Generator',
  },
  {
    id: 'exercise-suggestions',
    name: 'AI Exercise Suggestions',
    description: 'Get smart exercise recommendations as you build your workout',
    icon: 'figure.strengthtraining.traditional',
    tier: 'pro',
    featureKey: 'workoutTips',
    location: 'Workout tab → Exercise Builder',
  },
  {
    id: 'progress-insights',
    name: 'AI Progress Insights',
    description: 'Get personalized analysis of your training trends and weak points',
    icon: 'chart.line.uptrend.xyaxis',
    tier: 'pro',
    featureKey: 'workoutTips',
    location: 'Progress tab → Trends/Insights',
  },
  {
    id: 'goal-analysis',
    name: 'AI Goal Recalibration',
    description: 'Analyze your progress and get realistic timelines, PR predictions, and goal adjustments',
    icon: 'target',
    tier: 'pro',
    featureKey: 'workoutTips',
    location: 'Profile/Progress → Re-evaluate Goals',
  },
];

export const FeatureLadderModal: React.FC<FeatureLadderModalProps> = ({
  visible,
  onClose,
  onViewPlans,
}) => {
  const { tier, canUseAI, getRemainingUsage } = useSubscriptionStore();
  
  const handleFeaturePress = (feature: AIFeature) => {
    if (!canUseAI(feature.featureKey)) {
      Alert.alert(
        '🔒 AI Feature Locked',
        `${feature.name} requires a ${feature.tier === 'elite' ? 'Elite' : 'Pro'} subscription.\n\n${feature.tier === 'elite' ? 'Upgrade to Elite for unlimited AI access!' : 'Upgrade to Pro for monthly AI limits, or Elite for unlimited access!'}`,
        [
          {
            text: '🚀 View Plans',
            onPress: () => {
              onClose();
              if (onViewPlans) {
                onViewPlans();
              }
            },
            style: 'default' as const,
          },
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
      return;
    }
    
    // Feature is unlocked - could navigate to the feature or just close
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={[styles.headerIconContainer, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="sparkles" size={24} color={BrandColors.accent} />
            </View>
            <Text style={styles.modalTitle}>AI Features</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView 
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Current Tier Badge */}
          <View style={[styles.tierBadge, {
            backgroundColor: 
              tier === 'elite' ? BrandColors.accent + '20' :
              tier === 'pro' ? BrandColors.info + '20' :
              BrandColors.gray800,
            borderColor:
              tier === 'elite' ? BrandColors.accent :
              tier === 'pro' ? BrandColors.info :
              BrandColors.gray700,
          }]}>
            <IconSymbol 
              name={tier === 'elite' ? 'crown.fill' : tier === 'pro' ? 'star.fill' : 'bolt.fill'} 
              size={18} 
              color={
                tier === 'elite' ? BrandColors.accent :
                tier === 'pro' ? BrandColors.info :
                BrandColors.textSecondary
              } 
            />
            <Text style={[styles.tierBadgeText, {
              color:
                tier === 'elite' ? BrandColors.accent :
                tier === 'pro' ? BrandColors.info :
                BrandColors.textSecondary
            }]}>
              {tier === 'elite' ? 'Elite - Unlimited AI' :
               tier === 'pro' ? 'Pro - Monthly Limits' :
               'Basic - No AI Features'}
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: BrandColors.textSecondary }]}>
            AI powers every aspect of your fitness journey. Select a feature to see where it's used in the app.
          </Text>

          {/* AI Features List */}
          {AI_FEATURES.map((feature) => {
            const isUnlocked = canUseAI(feature.featureKey);
            const remaining = isUnlocked ? getRemainingUsage(feature.featureKey) : 0;
            const isElite = tier === 'elite';
            const isPro = tier === 'pro' && isUnlocked;

            return (
              <TouchableOpacity
                key={feature.id}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: isUnlocked ? BrandColors.surface : BrandColors.gray900,
                    borderColor: isUnlocked 
                      ? (tier === 'elite' ? BrandColors.accent : BrandColors.info)
                      : BrandColors.gray700,
                    borderWidth: isUnlocked ? 2 : 1,
                    opacity: isUnlocked ? 1 : 0.7,
                  },
                ]}
                onPress={() => handleFeaturePress(feature)}
                activeOpacity={0.7}
              >
                <View style={styles.featureHeader}>
                  <View style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isUnlocked
                        ? (tier === 'elite' ? BrandColors.accent + '20' : BrandColors.info + '20')
                        : BrandColors.gray800,
                    },
                  ]}>
                    {isUnlocked ? (
                      <IconSymbol 
                        name={feature.icon as any} 
                        size={24} 
                        color={tier === 'elite' ? BrandColors.accent : BrandColors.info} 
                      />
                    ) : (
                      <IconSymbol name="lock.fill" size={24} color={BrandColors.textSecondary} />
                    )}
                    {isUnlocked && (
                      <View style={[styles.sparkleBadge, { backgroundColor: BrandColors.accent }]}>
                        <IconSymbol name="sparkles" size={10} color={BrandColors.background} />
                      </View>
                    )}
                  </View>

                  <View style={styles.featureInfo}>
                    <View style={styles.featureTitleRow}>
                      <Text style={[
                        styles.featureName,
                        { color: isUnlocked ? BrandColors.text : BrandColors.textSecondary },
                      ]}>
                        {feature.name}
                      </Text>
                      {isUnlocked && (
                        <View style={[
                          styles.unlockedBadge,
                          { backgroundColor: tier === 'elite' ? BrandColors.accent + '20' : BrandColors.info + '20' },
                        ]}>
                          <Text style={[
                            styles.unlockedBadgeText,
                            { color: tier === 'elite' ? BrandColors.accent : BrandColors.info },
                          ]}>
                            {isElite ? '∞ Unlimited' : `${remaining} left`}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.featureDescription, { color: BrandColors.textSecondary }]}>
                      {feature.description}
                    </Text>
                    <View style={styles.featureLocation}>
                      <IconSymbol name="location.fill" size={12} color={BrandColors.textSecondary} />
                      <Text style={[styles.locationText, { color: BrandColors.textSecondary }]}>
                        {feature.location}
                      </Text>
                    </View>
                  </View>
                </View>

                {!isUnlocked && (
                  <View style={[styles.lockedFooter, { backgroundColor: BrandColors.gray900 }]}>
                    <IconSymbol name="lock.fill" size={14} color={BrandColors.textSecondary} />
                    <Text style={[styles.lockedText, { color: BrandColors.textSecondary }]}>
                      Requires {feature.tier === 'elite' ? 'Elite' : 'Pro'} tier
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Upgrade CTA */}
          {(tier === 'basic' || tier === 'free') && (
            <TouchableOpacity
              style={[styles.upgradeCard, { backgroundColor: BrandColors.accent + '20', borderColor: BrandColors.accent }]}
              onPress={() => {
                onClose();
                if (onViewPlans) {
                  onViewPlans();
                }
              }}
              activeOpacity={0.8}
            >
              <IconSymbol name="sparkles" size={32} color={BrandColors.accent} />
              <Text style={[styles.upgradeTitle, { color: BrandColors.accent }]}>
                Unlock All AI Features
              </Text>
              <Text style={[styles.upgradeDescription, { color: BrandColors.textSecondary }]}>
                Upgrade to Pro or Elite to access all AI-powered features and transform your fitness journey
              </Text>
              <View style={[styles.upgradeButton, { backgroundColor: BrandColors.accent }]}>
                <Text style={[styles.upgradeButtonText, { color: BrandColors.background }]}>
                  View Plans & Pricing
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelButtonText: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  headerSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.lg,
    alignSelf: 'center',
  },
  tierBadgeText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  featureCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  featureHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sparkleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BrandColors.background,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  featureName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  unlockedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  unlockedBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  featureDescription: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  featureLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  locationText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    fontStyle: 'italic',
  },
  lockedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  lockedText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  upgradeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.lg,
    borderWidth: 2,
  },
  upgradeTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  upgradeDescription: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  upgradeButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  upgradeButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
});
