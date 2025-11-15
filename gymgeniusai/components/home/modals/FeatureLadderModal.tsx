import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { FEATURE_CATALOG } from '@/stores/pointsStore';
import { getFeatureDisplayName } from '@/utils/features/featureHelpers';

interface FeatureLadderModalProps {
  visible: boolean;
  totalPoints: number;
  isFeatureUnlocked: (key: string) => boolean;
  nextUnlock: [string, number] | undefined;
  onClose: () => void;
  onFeatureClick: (featureKey: string, points: number) => void;
  isCoach?: boolean;
}

export const FeatureLadderModal: React.FC<FeatureLadderModalProps> = ({
  visible,
  totalPoints,
  isFeatureUnlocked,
  nextUnlock,
  onClose,
  onFeatureClick,
  isCoach = false,
}) => {
  // For coaches: only show the 3 specified features (custom meal ideas, workout ideas, advanced AI insights)
  // For players: show all features (but these 3 are auto-unlocked)
  const coachOnlyFeatures = ['nutrition_meal_ideas', 'workout_ideas', 'advanced_insights'];
  
  const getFeaturesToShow = () => {
    if (isCoach) {
      // Only show the 3 features for coaches
      return Object.entries(FEATURE_CATALOG).filter(([feature]) => 
        coachOnlyFeatures.includes(feature)
      );
    }
    // For players, show all features
    return Object.entries(FEATURE_CATALOG);
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
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
          <Text style={styles.modalTitle}>Feature Ladder</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <ScrollView 
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
        >
          <View style={styles.ladderContainer}>
            <Text style={styles.ladderTitle}>Unlock Features with V</Text>
            <Text style={styles.ladderSubtitle}>Your current balance: {totalPoints.toLocaleString()} V</Text>
            {isCoach && (
              <Text style={[styles.ladderSubtitle, { marginTop: 8, fontStyle: 'italic', color: BrandColors.accent }]}>
                Coach features - All unlocked automatically
              </Text>
            )}
            
            {getFeaturesToShow()
              .sort(([, a], [, b]) => a - b)
              .map(([feature, points]) => {
                const isUnlocked = isFeatureUnlocked(feature);
                const isNext = nextUnlock && nextUnlock[0] === feature;
                const pointsNeeded = Math.max(0, points - totalPoints);
                const progressPercentage = Math.min((totalPoints / points) * 100, 100);
                
                return (
                  <TouchableOpacity 
                    key={feature} 
                    style={[
                      styles.ladderItem,
                      { 
                        borderColor: isUnlocked ? BrandColors.success : isNext ? BrandColors.accent : BrandColors.gray700,
                        backgroundColor: isUnlocked ? BrandColors.success + '20' : isNext ? BrandColors.accent + '20' : 'transparent'
                      }
                    ]}
                    onPress={() => onFeatureClick(feature, points)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.ladderItemHeader}>
                      <Text style={[
                        styles.ladderFeatureName,
                        { color: isUnlocked ? BrandColors.success : BrandColors.text }
                      ]}>
                        {getFeatureDisplayName(feature)}
                      </Text>
                      <Text style={[
                        styles.ladderPoints,
                        { color: isUnlocked ? BrandColors.success : BrandColors.accent }
                      ]}>
                        {points.toLocaleString()} V
                      </Text>
                    </View>
                    
                    {/* Progress Bar */}
                    {!isUnlocked && (
                      <View style={styles.progressBarContainer}>
                        <View style={styles.ladderProgressBar}>
                          <View 
                            style={[
                              styles.ladderProgressFill, 
                              { 
                                backgroundColor: BrandColors.accent,
                                width: `${progressPercentage}%`
                              }
                            ]} 
                          />
                        </View>
                        <Text style={styles.ladderProgressText}>
                          {Math.round(progressPercentage)}% complete
                        </Text>
                      </View>
                    )}
                    
                    <Text style={[
                      styles.ladderStatus,
                      { color: isUnlocked ? BrandColors.success : BrandColors.textSecondary }
                    ]}>
                      {isUnlocked ? '✓ Unlocked - Tap to View' : isNext ? '→ Next to unlock' : `${pointsNeeded.toLocaleString()} V to go`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
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
  headerSpacer: {
    width: 60,
  },
  modalTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  ladderContainer: {
    padding: Spacing.lg,
  },
  ladderTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  ladderSubtitle: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  ladderItem: {
    borderWidth: 2,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  ladderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ladderFeatureName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    flex: 1,
  },
  ladderPoints: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
  progressBarContainer: {
    marginVertical: Spacing.sm,
  },
  ladderProgressBar: {
    height: 8,
    backgroundColor: BrandColors.gray800,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  ladderProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  ladderProgressText: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },
  ladderStatus: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily,
  },
});

