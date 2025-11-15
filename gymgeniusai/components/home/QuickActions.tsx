import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors, Typography, Spacing, ComponentStyles } from '@/constants/theme';

interface QuickAction {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={`quick-action-${action.title}-${index}`}
            style={[
              ComponentStyles.card,
              styles.quickActionCard,
              { 
                borderColor: BrandColors.accent,
                opacity: 1
              }
            ]}
            onPress={action.onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={[
              styles.actionSubtitle, 
              { color: BrandColors.accent }
            ]}>
              {action.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quickActionsSection: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    padding: Spacing.md,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  actionSubtitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },
});

