import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors, Typography, Spacing, ComponentStyles, BorderRadius } from '@/constants/theme';

interface QuickAction {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  containerStyle?: any;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, containerStyle }) => {
  // Separate actions: first two go on top, rest go below
  const topActions = actions.slice(0, 2);
  const bottomActions = actions.slice(2);

  return (
    <View style={[styles.quickActionsSection, containerStyle]}>
      {/* Top row: 2 small square buttons */}
      {topActions.length > 0 && (
        <View style={styles.quickActionsTopRow}>
          {topActions.map((action, index) => (
            <TouchableOpacity
              key={`quick-action-${action.title}-${index}`}
              style={[
                ComponentStyles.card,
                styles.quickActionCardSmall,
                { 
                  borderColor: BrandColors.accent,
                  backgroundColor: BrandColors.accent + '08',
                }
              ]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.actionTitleSmall}>{action.title}</Text>
              <Text style={[
                styles.actionSubtitleSmall, 
                { color: BrandColors.accent }
              ]}>
                {action.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* Bottom row: wider button(s) */}
      {bottomActions.length > 0 && (
        <View style={styles.quickActionsBottomRow}>
          {bottomActions.map((action, index) => (
            <TouchableOpacity
              key={`quick-action-${action.title}-${index + topActions.length}`}
              style={[
                ComponentStyles.card,
                styles.quickActionCardWide,
                { 
                  borderColor: BrandColors.accent,
                  backgroundColor: BrandColors.accent + '08',
                }
              ]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.actionTitleSmall}>{action.title}</Text>
              <Text style={[
                styles.actionSubtitleSmall, 
                { color: BrandColors.accent }
              ]}>
                {action.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsSection: {
    marginBottom: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
    flex: 1,
  },
  quickActionsTopRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  quickActionsBottomRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionCardSmall: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    minHeight: 50,
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    shadowColor: BrandColors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  quickActionCardWide: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    minHeight: 40,
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    shadowColor: BrandColors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  actionTitleSmall: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginBottom: 2,
  },
  actionSubtitleSmall: {
    fontSize: 10,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.medium,
  },
});

