/**
 * AI Info Modal
 * 
 * Shows users how AI is integrated throughout the app and allows subscription management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { router } from 'expo-router';
import { Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/components/AuthProvider';

interface AIInfoModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'features' | 'plans'; // Allow setting initial tab
}

interface AIFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  location: string;
  benefits: string[];
  requiredTier: 'pro' | 'elite'; // Minimum tier required
  featureKey: 'mealPlan' | 'macroEstimation' | 'workoutPlan' | 'workoutTips' | 'coachFeatures';
}

const AI_FEATURES: AIFeature[] = [
  {
    id: 'meal-plans',
    title: 'AI Meal Plans',
    description: 'Generate personalized meal plans tailored to your goals, dietary preferences, and macros.',
    icon: 'fork.knife',
    location: 'Nutrition tab → Meal Plan Generator',
    benefits: ['Saves meal prep time', 'Perfect macro balance', 'Dietary preference support'],
    requiredTier: 'pro',
    featureKey: 'mealPlan',
  },
  {
    id: 'macro-estimation',
    title: 'AI Macro Estimation',
    description: 'Get instant macro estimates for custom meals just by entering the name and serving size.',
    icon: 'chart.bar.fill',
    location: 'Nutrition tab → Create Custom Meal',
    benefits: ['No more guessing', 'Instant accuracy', 'Faster logging'],
    requiredTier: 'pro',
    featureKey: 'macroEstimation',
  },
  {
    id: 'photo-detection',
    title: 'AI Photo Detection',
    description: 'Snap a photo of your meal and let AI detect the food and estimate macros automatically.',
    icon: 'camera.fill',
    location: 'Nutrition tab → Search Foods → Auto-detect',
    benefits: ['Quick logging', 'Visual meal tracking', 'No manual entry'],
    requiredTier: 'pro',
    featureKey: 'macroEstimation',
  },
  {
    id: 'workout-plans',
    title: 'AI Workout Plans',
    description: 'Create custom workout programs based on your goals, experience, and available equipment.',
    icon: 'dumbbell.fill',
    location: 'Workout tab → Workout Plan Generator',
    benefits: ['Personalized programs', 'Progressive overload', 'Equipment-specific'],
    requiredTier: 'pro',
    featureKey: 'workoutPlan',
  },
  {
    id: 'exercise-suggestions',
    title: 'AI Exercise Suggestions',
    description: 'Get smart exercise recommendations as you build your workout for optimal muscle targeting.',
    icon: 'figure.strengthtraining.traditional',
    location: 'Workout tab → Exercise Builder',
    benefits: ['Better muscle balance', 'Workout variety', 'Injury prevention'],
    requiredTier: 'pro',
    featureKey: 'workoutTips',
  },
  {
    id: 'progress-insights',
    title: 'AI Progress Insights',
    description: 'Get personalized analysis of your training trends, volume spikes, and weak points.',
    icon: 'chart.line.uptrend.xyaxis',
    location: 'Progress tab → Trends/Insights',
    benefits: ['Data-driven decisions', 'Plateau prevention', 'Optimal recovery'],
    requiredTier: 'pro',
    featureKey: 'workoutTips',
  },
  {
    id: 'goal-analysis',
    title: 'AI Goal Recalibration',
    description: 'Analyze your progress and get realistic timelines, PR predictions, and goal adjustments.',
    icon: 'target',
    location: 'Profile/Progress → Re-evaluate Goals',
    benefits: ['Realistic expectations', 'PR predictions', 'Adaptive targets'],
    requiredTier: 'pro',
    featureKey: 'workoutTips',
  },
];

const SUBSCRIPTION_TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 'Free',
    period: '',
    description: 'Manual logging without AI assistance',
    features: [
      'Log workouts manually',
      'Track nutrition manually',
      'Progress tracking',
      'No AI features',
    ],
    color: BrandColors.success,
    icon: 'bolt.fill',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    description: 'Monthly AI usage limits',
    features: [
      '10 AI Meal Plans/month',
      '50 Macro Estimations/month',
      '10 Workout Plans/month',
      '100 Workout Tips/month',
      'No ads',
    ],
    color: BrandColors.info,
    icon: 'star.fill',
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '$19.99',
    period: '/month',
    description: 'Unlimited AI access',
    features: [
      'Unlimited AI Meal Plans',
      'Unlimited Macro Estimations',
      'Unlimited Workout Plans',
      'Unlimited Insights & Tips',
      'Priority support',
      'No ads',
    ],
    color: BrandColors.accent,
    icon: 'crown.fill',
  },
];

export function AIInfoModal({ visible, onClose, initialTab = 'features' }: AIInfoModalProps) {
  const { user } = useAuth();
  const { tier, updateTier, canUseAI } = useSubscriptionStore();
  const [activeSection, setActiveSection] = useState<'features' | 'plans'>(initialTab);
  
  // Update active section when initialTab prop changes
  React.useEffect(() => {
    if (visible && initialTab) {
      setActiveSection(initialTab);
    }
  }, [visible, initialTab]);
  const [isUpdating, setIsUpdating] = useState(false);
  const currentTier = SUBSCRIPTION_TIERS.find(t => t.id === tier) || 
                      (tier === 'free' ? SUBSCRIPTION_TIERS[0] : SUBSCRIPTION_TIERS[0]);
  
  // Check if a feature is unlocked based on tier
  const isFeatureUnlocked = (feature: AIFeature): boolean => {
    if (tier === 'elite') return true; // Elite unlocks everything
    if (tier === 'pro' && feature.requiredTier === 'pro') return canUseAI(feature.featureKey);
    return false; // Basic and free don't unlock AI features
  };
  
  const handleTierChange = async (newTierId: string) => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to change your subscription tier.');
      return;
    }
    
    if (!updateTier) {
      Alert.alert('Error', 'Subscription update feature is not available. Please restart the app.');
      console.error('updateTier is undefined');
      return;
    }
    
    const newTier = newTierId as 'basic' | 'pro' | 'elite';
    
    // Confirm the change
    const isUpgrade = 
      (tier === 'basic' && (newTier === 'pro' || newTier === 'elite')) ||
      (tier === 'pro' && newTier === 'elite') ||
      (tier === 'free' && newTier !== 'free');
    const isDowngrade =
      (tier === 'elite' && newTier !== 'elite') ||
      (tier === 'pro' && newTier === 'basic');
    
    const tierName = SUBSCRIPTION_TIERS.find(t => t.id === newTierId)?.name || newTierId;
    
    Alert.alert(
      `${isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Change'} to ${tierName}`,
      isUpgrade 
        ? `You'll gain access to ${tierName === 'Pro' ? 'monthly AI limits' : 'unlimited AI features'}.`
        : isDowngrade
        ? `You'll lose access to ${tier === 'elite' ? 'unlimited features' : tier === 'pro' ? 'Pro features' : ''}. Your subscription will change to ${tierName}.`
        : `Change your subscription to ${tierName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await updateTier(user.uid, newTier);
              Alert.alert(
                '✅ Success',
                `Your subscription has been ${isUpgrade ? 'upgraded' : isDowngrade ? 'downgraded' : 'changed'} to ${tierName}!`,
                [{ text: 'OK', onPress: onClose }]
              );
            } catch (error: any) {
              console.error('Error updating tier:', error);
              Alert.alert(
                'Error',
                `Failed to update subscription: ${error.message || 'Unknown error'}. Please try again.`
              );
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: BrandColors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: BrandColors.accent + '20' }]}>
              <IconSymbol name="sparkles" size={24} color={BrandColors.accent} />
            </View>
            <Text style={[styles.headerTitle, { color: BrandColors.text }]}>
              AI Features
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <IconSymbol name="xmark.circle.fill" size={28} color={BrandColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'features' && [
                styles.activeTab,
                { backgroundColor: BrandColors.accent + '20', borderColor: BrandColors.accent },
              ],
            ]}
            onPress={() => setActiveSection('features')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeSection === 'features' ? BrandColors.accent : BrandColors.textSecondary,
                  fontWeight: activeSection === 'features' ? Typography.fontWeight.bold : Typography.fontWeight.regular,
                },
              ]}
            >
              AI Features
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === 'plans' && [
                styles.activeTab,
                { backgroundColor: BrandColors.accent + '20', borderColor: BrandColors.accent },
              ],
            ]}
            onPress={() => setActiveSection('plans')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: activeSection === 'plans' ? BrandColors.accent : BrandColors.textSecondary,
                  fontWeight: activeSection === 'plans' ? Typography.fontWeight.bold : Typography.fontWeight.regular,
                },
              ]}
            >
              Plans & Pricing
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {activeSection === 'features' ? (
            <View style={styles.featuresSection}>
              <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                How AI Powers Your Fitness Journey
              </Text>
              <Text style={[styles.sectionDescription, { color: BrandColors.textSecondary }]}>
                AI is seamlessly integrated throughout Kinetic Flow to make your fitness journey smarter and more efficient.
              </Text>

              {AI_FEATURES.map((feature) => {
                const isUnlocked = isFeatureUnlocked(feature);
                const isLocked = !isUnlocked;
                
                return (
                  <View
                    key={feature.id}
                    style={[
                      styles.featureCard, 
                      { 
                        backgroundColor: isUnlocked ? BrandColors.surface : BrandColors.gray900,
                        borderColor: isUnlocked ? BrandColors.success : BrandColors.gray700,
                        borderWidth: isUnlocked ? 2 : 1,
                        opacity: isLocked ? 0.6 : 1,
                      }
                    ]}
                  >
                    <View style={styles.featureHeader}>
                      <View style={[
                        styles.featureIconContainer, 
                        { 
                          backgroundColor: isUnlocked 
                            ? BrandColors.accent + '20' 
                            : BrandColors.gray700 + '40'
                        }
                      ]}>
                        {isLocked ? (
                          <IconSymbol name="lock.fill" size={24} color={BrandColors.textSecondary} />
                        ) : (
                          <IconSymbol name={feature.icon as any} size={24} color={BrandColors.accent} />
                        )}
                      </View>
                      <View style={styles.featureTitleContainer}>
                        <Text style={[styles.featureTitle, { color: isUnlocked ? BrandColors.text : BrandColors.textSecondary }]}>
                          {feature.title}
                        </Text>
                        <View style={styles.featureBadge}>
                          {isUnlocked ? (
                            <>
                              <IconSymbol name="sparkles" size={12} color={BrandColors.accent} />
                              <Text style={[styles.featureBadgeText, { color: BrandColors.accent }]}>
                                AI-Powered
                              </Text>
                            </>
                          ) : (
                            <>
                              <IconSymbol name="lock.fill" size={12} color={BrandColors.textSecondary} />
                              <Text style={[styles.featureBadgeText, { color: BrandColors.textSecondary }]}>
                                {feature.requiredTier === 'elite' ? 'Elite Only' : 'Pro+ Required'}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.featureDescription, { color: BrandColors.textSecondary }]}>
                      {feature.description}
                    </Text>

                    <View style={styles.featureLocation}>
                      <IconSymbol name="location.fill" size={14} color={BrandColors.textSecondary} />
                      <Text style={[styles.featureLocationText, { color: BrandColors.textSecondary }]}>
                        {feature.location}
                      </Text>
                    </View>

                    <View style={styles.benefitsContainer}>
                      {feature.benefits.map((benefit, index) => (
                        <View key={index} style={styles.benefitItem}>
                          <View style={[styles.benefitDot, { backgroundColor: isUnlocked ? BrandColors.accent : BrandColors.textSecondary }]} />
                          <Text style={[styles.benefitText, { color: BrandColors.text }]}>
                            {benefit}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {isLocked && (
                      <View style={[styles.lockedOverlay, { backgroundColor: BrandColors.gray900 + 'CC' }]}>
                        <IconSymbol name="lock.fill" size={20} color={BrandColors.textSecondary} />
                        <Text style={[styles.lockedText, { color: BrandColors.textSecondary }]}>
                          Unlock with {feature.requiredTier === 'elite' ? 'Elite' : 'Pro'} tier
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.plansSection}>
              <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                Choose Your Plan
              </Text>
              <Text style={[styles.sectionDescription, { color: BrandColors.textSecondary }]}>
                Unlock AI-powered features with a subscription that fits your needs.
              </Text>

              {/* Current Tier Badge - Only show if user has a paid tier */}
              {(tier === 'basic' || tier === 'pro' || tier === 'elite') && (
                <View style={[styles.currentTierBadge, { backgroundColor: currentTier.color + '20', borderColor: currentTier.color }]}>
                  <IconSymbol name={currentTier.icon as any} size={18} color={currentTier.color} />
                  <Text style={[styles.currentTierText, { color: currentTier.color }]}>
                    Current: {currentTier.name} Plan
                  </Text>
                </View>
              )}

              {SUBSCRIPTION_TIERS.map((plan) => {
                const isCurrentTier = plan.id === tier;
                const isUpgrade = 
                  (tier === 'basic' && (plan.id === 'pro' || plan.id === 'elite')) ||
                  (tier === 'pro' && plan.id === 'elite') ||
                  (tier === 'free' && plan.id !== 'free'); // Handle free tier users
                const isDowngrade =
                  (tier === 'elite' && plan.id !== 'elite') ||
                  (tier === 'pro' && plan.id === 'basic');

                return (
                  <View
                    key={plan.id}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: BrandColors.surface,
                        borderColor: isCurrentTier ? plan.color : BrandColors.gray700,
                        borderWidth: isCurrentTier ? 2 : 1,
                      },
                    ]}
                  >
                    {isCurrentTier && (
                      <View style={[styles.currentBadge, { backgroundColor: plan.color + '20' }]}>
                        <Text style={[styles.currentBadgeText, { color: plan.color }]}>
                          Current Plan
                        </Text>
                      </View>
                    )}

                    <View style={styles.planHeader}>
                      <View style={styles.planHeaderLeft}>
                        <View style={[styles.planIconContainer, { backgroundColor: plan.color + '20' }]}>
                          <IconSymbol name={plan.icon as any} size={28} color={plan.color} />
                        </View>
                        <View>
                          <Text style={[styles.planName, { color: BrandColors.text }]}>
                            {plan.name}
                          </Text>
                          <View style={styles.planPriceContainer}>
                            <Text style={[styles.planPrice, { color: plan.color }]}>
                              {plan.price}
                            </Text>
                            <Text style={[styles.planPeriod, { color: BrandColors.textSecondary }]}>
                              {plan.period}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.planDescription, { color: BrandColors.textSecondary }]}>
                      {plan.description}
                    </Text>

                    <View style={styles.planFeatures}>
                      {plan.features.map((feature, index) => (
                        <View key={index} style={styles.planFeatureItem}>
                          <IconSymbol
                            name="checkmark.circle.fill"
                            size={18}
                            color={plan.color}
                          />
                          <Text style={[styles.planFeatureText, { color: BrandColors.text }]}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {!isCurrentTier && (
                      <TouchableOpacity
                        style={[
                          styles.planButton,
                          {
                            backgroundColor: isUpgrade
                              ? plan.color
                              : BrandColors.gray700,
                            borderColor: plan.color,
                            opacity: isUpdating ? 0.6 : 1,
                          },
                        ]}
                        onPress={() => handleTierChange(plan.id)}
                        activeOpacity={0.7}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator 
                            size="small" 
                            color={isUpgrade ? '#000' : plan.color} 
                          />
                        ) : (
                          <Text
                            style={[
                              styles.planButtonText,
                              { color: isUpgrade ? '#000' : plan.color },
                            ]}
                          >
                            {isUpgrade ? 'Upgrade' : 'Downgrade'} to {plan.name}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray700,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: BrandColors.gray700,
    alignItems: 'center',
  },
  activeTab: {
    borderWidth: 2,
  },
  tabText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  featuresSection: {
    gap: Spacing.md,
  },
  plansSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  featureCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  featureHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitleContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs / 2,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  featureDescription: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  featureLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray700,
  },
  featureLocationText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    fontStyle: 'italic',
  },
  benefitsContainer: {
    gap: Spacing.xs,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  benefitDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  benefitText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  currentTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.lg,
  },
  currentTierText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  planCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
    position: 'relative',
  },
  currentBadge: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  planHeader: {
    marginBottom: Spacing.md,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  planIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  planPrice: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  planPeriod: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
  },
  planDescription: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  planFeatures: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  planFeatureText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  planButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  planButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  lockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  lockedText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
});

