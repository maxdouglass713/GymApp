/**
 * AI Goal Recalibration Component
 * 
 * Analyzes user goals and provides realistic timelines, adaptive targets, and PR predictions
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { BrandColors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { AILoadingIndicator } from '@/components/ai/AILoadingIndicator';
import { analyzeGoals, AIGoalAnalysis } from '@/services/aiProgressService';
import { PersonalRecord, TrendData } from '@/stores/progressStore';
import { router } from 'expo-router';
import { eventBus } from '@/lib/eventBus';

interface AIGoalRecalibrationProps {
  userGoals: string[];
  personalRecords: PersonalRecord[];
  trendData: TrendData;
  weightHistory?: Array<{ date: string; weight: number }>;
}

export function AIGoalRecalibration({
  userGoals,
  personalRecords,
  trendData,
  weightHistory,
}: AIGoalRecalibrationProps) {
  const { tier, canUseAI } = useSubscriptionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [goalAnalysis, setGoalAnalysis] = useState<AIGoalAnalysis | null>(null);

  const handleAnalyzeGoals = async () => {
    if (!canUseAI('coachFeatures')) {
      if (tier === 'free') {
        Alert.alert(
          'AI Feature Locked',
          'Upgrade to Basic, Pro, or Elite to unlock AI goal analysis!',
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
        const cost = getCost('workoutTips');
        Alert.alert(
          'Insufficient Volts',
          `AI goal analysis costs ${cost.toLocaleString()} Volts.\n\nBuy more Volts or upgrade to Pro for monthly AI access.`,
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
      const analysis = await analyzeGoals(userGoals, {
        workouts: trendData.workoutSummaries.length,
        personalRecords,
        trendData,
        weightHistory,
      });
      setGoalAnalysis(analysis);
      setShowAnalysis(true);
    } catch (error: any) {
      console.error('Error analyzing goals:', error);
      if (!error.message?.includes('Upgrade') && !error.message?.includes('Insufficient')) {
        Alert.alert('AI Analysis Unavailable', 'Unable to analyze goals at this time.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (userGoals.length === 0) {
    return null; // Don't show if no goals set
  }

  return (
    <>
      {/* HIDDEN for v1.0 to avoid "Coming Soon" in screenshots */}
      {false && (
      <TouchableOpacity
        style={[styles.button, {
          backgroundColor: BrandColors.accent + '15',
          borderColor: BrandColors.accent,
        }]}
        onPress={handleAnalyzeGoals}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={BrandColors.accent} />
        ) : (
          <>
            <IconSymbol name="sparkles" size={18} color={BrandColors.accent} />
            <Text style={[styles.buttonText, { color: BrandColors.accent }]}>
              Re-evaluate my goals
            </Text>
          </>
        )}
      </TouchableOpacity>
      )}

      <Modal
        visible={showAnalysis}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: BrandColors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAnalysis(false)}
              activeOpacity={0.7}
            >
              <IconSymbol name="xmark.circle.fill" size={24} color={BrandColors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
              AI Goal Analysis
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {goalAnalysis && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Current Goal */}
              <View style={[styles.section, { backgroundColor: BrandColors.surface }]}>
                <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                  Current Goal
                </Text>
                <Text style={[styles.goalText, { color: BrandColors.textSecondary }]}>
                  {goalAnalysis.currentGoal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>

              {/* Realistic Timeline */}
              <View style={[styles.section, { backgroundColor: BrandColors.surface }]}>
                <View style={styles.iconHeader}>
                  <IconSymbol name="calendar" size={20} color={BrandColors.accent} />
                  <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                    Realistic Timeline
                  </Text>
                </View>
                <Text style={[styles.timelineText, { color: BrandColors.text }]}>
                  {goalAnalysis.realisticTimeline}
                </Text>
                <Text style={[styles.timelineSubtext, { color: BrandColors.textSecondary }]}>
                  Projected completion: {goalAnalysis.projectedCompletion}
                </Text>
              </View>

              {/* Adjustments */}
              {goalAnalysis.adjustments && goalAnalysis.adjustments.length > 0 && (
                <View style={[styles.section, { backgroundColor: BrandColors.surface }]}>
                  <View style={styles.iconHeader}>
                    <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={BrandColors.info} />
                    <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                      Recommendations
                    </Text>
                  </View>
                  {goalAnalysis.adjustments.map((adjustment, index) => (
                    <View key={index} style={styles.adjustmentCard}>
                      <Text style={[styles.adjustmentTitle, { color: BrandColors.text }]}>
                        {adjustment.recommendation}
                      </Text>
                      <Text style={[styles.adjustmentReasoning, { color: BrandColors.textSecondary }]}>
                        {adjustment.reasoning}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* PR Predictions */}
              {goalAnalysis.prPredictions && goalAnalysis.prPredictions.length > 0 && (
                <View style={[styles.section, { backgroundColor: BrandColors.surface }]}>
                  <View style={styles.iconHeader}>
                    <IconSymbol name="chart.line.uptrend.xyaxis" size={20} color={BrandColors.accent} />
                    <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
                      PR Predictions
                    </Text>
                  </View>
                  {goalAnalysis.prPredictions.map((prediction, index) => {
                    const confidenceColor = 
                      prediction.confidence === 'high' ? BrandColors.accent :
                      prediction.confidence === 'medium' ? BrandColors.info :
                      BrandColors.textSecondary;
                    
                    return (
                      <View key={index} style={styles.prCard}>
                        <View style={styles.prHeader}>
                          <Text style={[styles.prExercise, { color: BrandColors.text }]}>
                            {prediction.exercise}
                          </Text>
                          <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
                            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                              {prediction.confidence === 'high' ? 'High' :
                               prediction.confidence === 'medium' ? 'Medium' : 'Low'} confidence
                            </Text>
                          </View>
                        </View>
                        <View style={styles.prStats}>
                          <View style={styles.prStat}>
                            <Text style={[styles.prStatLabel, { color: BrandColors.textSecondary }]}>
                              Current
                            </Text>
                            <Text style={[styles.prStatValue, { color: BrandColors.text }]}>
                              {prediction.currentPR} lbs
                            </Text>
                          </View>
                          <View style={styles.prArrow}>
                            <IconSymbol name="arrow.right" size={16} color={BrandColors.textSecondary} />
                          </View>
                          <View style={styles.prStat}>
                            <Text style={[styles.prStatLabel, { color: BrandColors.textSecondary }]}>
                              Projected
                            </Text>
                            <Text style={[styles.prStatValue, { color: BrandColors.accent }]}>
                              {prediction.projectedPR} lbs
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.prTimeframe, { color: BrandColors.textSecondary }]}>
                          In {prediction.timeframe}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
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
  buttonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray700,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: BrandColors.gray700,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.md,
  },
  iconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  goalText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
  },
  timelineText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  timelineSubtext: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
  adjustmentCard: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray700,
  },
  adjustmentTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
  },
  adjustmentReasoning: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
  },
  prCard: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray700,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  prExercise: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  confidenceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  prStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  prStat: {
    flex: 1,
  },
  prStatLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    marginBottom: 2,
  },
  prStatValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  prArrow: {
    marginTop: 12,
  },
  prTimeframe: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    fontStyle: 'italic',
  },
});

