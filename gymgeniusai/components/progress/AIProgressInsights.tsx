/**
 * AI Progress Insights Component
 * 
 * Displays AI-generated insights, alerts, and action items for user progress
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { BrandColors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { AILoadingIndicator } from '@/components/ai/AILoadingIndicator';
import { generateProgressInsights, AIProgressInsight } from '@/services/aiProgressService';
import { TrendData, InsightsData } from '@/stores/progressStore';
import { router } from 'expo-router';
import { eventBus } from '@/lib/eventBus';
import { checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

interface AIProgressInsightsProps {
  trendData: TrendData;
  insightsData: InsightsData;
  exerciseProgress: any[];
  personalRecords: any[];
}

export function AIProgressInsights({
  trendData,
  insightsData,
  exerciseProgress,
  personalRecords,
}: AIProgressInsightsProps) {
  const { tier, canUseAI, getCost } = useSubscriptionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AIProgressInsight[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadInsights = async () => {
    // Check feature flag - show "Coming Soon" if AI is disabled
    if (!checkFeatureOrShowComingSoon('advancedAI', 'AI Progress Insights')) {
      return;
    }
    if (!canUseAI('coachFeatures')) {
      if (tier === 'free') {
        Alert.alert(
          'AI Feature Locked',
          'Upgrade to Basic, Pro, or Elite to unlock AI progress insights!',
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
        const cost = getCost('workoutTips');
        if (cost !== undefined) {
          Alert.alert(
            'Insufficient Volts',
            `AI progress insights cost ${cost.toLocaleString()} Volts.\n\nBuy more Volts or upgrade to Pro for monthly AI access.`,
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
        }
      } else if (tier === 'pro') {
        Alert.alert(
          'Monthly Limit Reached',
          'You\'ve used all AI coach features this month. Upgrade to Elite for unlimited access.',
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

    setIsLoading(true);
    try {
      const generatedInsights = await generateProgressInsights(
        trendData,
        insightsData,
        exerciseProgress,
        personalRecords
      );
      setInsights(generatedInsights);
      setIsExpanded(true);
    } catch (error: any) {
      console.error('Error loading insights:', error);
      if (!error.message?.includes('Upgrade') && !error.message?.includes('Insufficient')) {
        Alert.alert('AI Insights Unavailable', 'Unable to generate insights at this time.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'positive':
        return BrandColors.accent;
      case 'warning':
        return '#FF6B35';
      case 'info':
        return BrandColors.info;
      default:
        return BrandColors.textSecondary;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return 'chart.line.uptrend.xyaxis';
      case 'alert':
        return 'exclamationmark.triangle.fill';
      case 'action':
        return 'list.bullet';
      case 'achievement':
        return 'trophy.fill';
      default:
        return 'sparkles';
    }
  };

  if (!isExpanded && insights.length === 0) {
    // HIDDEN for v1.0 to avoid "Coming Soon" in screenshots
    return null;
    // return (
    //   <TouchableOpacity
    //     style={[styles.triggerButton, {
    //       backgroundColor: BrandColors.accent + '15',
    //       borderColor: BrandColors.accent,
    //     }]}
    //     onPress={loadInsights}
    //     activeOpacity={0.7}
    //     disabled={isLoading}
    //   >
    //     {isLoading ? (
    //       <ActivityIndicator size="small" color={BrandColors.accent} />
    //     ) : (
    //       <>
    //         <IconSymbol name="sparkles" size={18} color={BrandColors.accent} />
    //         <Text style={[styles.triggerButtonText, { color: BrandColors.accent }]}>
    //           Get AI insights
    //         </Text>
    //       </>
    //     )}
    //   </TouchableOpacity>
    // );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: BrandColors.accent + '20' }]}>
            <IconSymbol name="sparkles" size={20} color={BrandColors.accent} />
          </View>
          <Text style={[styles.title, { color: BrandColors.text }]}>AI Progress Insights</Text>
        </View>
        {insights.length > 0 && (
          <TouchableOpacity
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <IconSymbol 
              name={isExpanded ? "chevron.up" : "chevron.down"} 
              size={20} 
              color={BrandColors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <AILoadingIndicator message="Analyzing your progress..." size="small" />
        </View>
      )}

      {isExpanded && insights.length > 0 && (
        <ScrollView style={styles.insightsList} showsVerticalScrollIndicator={false}>
          {insights.map((insight, index) => (
            <View
              key={index}
              style={[styles.insightCard, {
                backgroundColor: BrandColors.surface,
                borderColor: getSeverityColor(insight.severity),
                borderLeftWidth: 4,
              }]}
            >
              <View style={styles.insightHeader}>
                <View style={[styles.insightIconContainer, {
                  backgroundColor: getSeverityColor(insight.severity) + '20',
                }]}>
                  <IconSymbol 
                    name={getTypeIcon(insight.type) as any} 
                    size={18} 
                    color={getSeverityColor(insight.severity)} 
                  />
                </View>
                <View style={styles.insightContent}>
                  <Text style={[styles.insightTitle, { color: BrandColors.text }]}>
                    {insight.title}
                  </Text>
                  <Text style={[styles.insightMessage, { color: BrandColors.textSecondary }]}>
                    {insight.message}
                  </Text>
                </View>
              </View>
              
              {insight.actionItems && insight.actionItems.length > 0 && (
                <View style={styles.actionItemsContainer}>
                  {insight.actionItems.map((item, itemIndex) => (
                    <View key={itemIndex} style={styles.actionItem}>
                      <Text style={styles.actionItemBullet}>•</Text>
                      <Text style={[styles.actionItemText, { color: BrandColors.textSecondary }]}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {isExpanded && insights.length === 0 && !isLoading && (
        <TouchableOpacity
          style={[styles.refreshButton, {
            backgroundColor: BrandColors.accent + '15',
            borderColor: BrandColors.accent,
          }]}
          onPress={loadInsights}
          activeOpacity={0.7}
        >
          <IconSymbol name="arrow.clockwise" size={16} color={BrandColors.accent} />
          <Text style={[styles.refreshButtonText, { color: BrandColors.accent }]}>
            Refresh insights
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  triggerButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  insightsList: {
    maxHeight: 400,
  },
  insightCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  insightMessage: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
  },
  actionItemsContainer: {
    marginTop: Spacing.sm,
    paddingLeft: Spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  actionItemBullet: {
    color: BrandColors.accent,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  actionItemText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 18,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  refreshButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
});

