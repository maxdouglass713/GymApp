/**
 * AI Generation Card Component
 * 
 * Futuristic card component for displaying AI-generated content
 * Features glassmorphism, glowing borders, and smooth animations
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { BrandColors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AIGenerationCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  loading?: boolean;
  children?: React.ReactNode;
  onPress?: () => void;
  glowColor?: string;
}

export function AIGenerationCard({
  title,
  subtitle,
  icon = 'sparkles',
  loading = false,
  children,
  onPress,
  glowColor = BrandColors.accent,
}: AIGenerationCardProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      // Pulsing animation for loading state
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  useEffect(() => {
    // Continuous glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const scale = pulseAnim;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <View style={[styles.gradient, { backgroundColor: BrandColors.surface }]}>
        {/* Glowing border */}
        <Animated.View
          style={[
            styles.glowBorder,
            {
              borderColor: glowColor,
              opacity: glowOpacity,
              shadowColor: glowColor,
            },
          ]}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconGradient, { backgroundColor: glowColor + '30' }]}>
                <IconSymbol name={icon as any} size={24} color={glowColor} />
              </View>
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {loading && (
              <View style={styles.loadingIndicator}>
                <View style={[styles.loadingDot, { backgroundColor: glowColor }]} />
                <View style={[styles.loadingDot, styles.loadingDotDelay, { backgroundColor: glowColor }]} />
                <View style={[styles.loadingDot, styles.loadingDotDelay2, { backgroundColor: glowColor }]} />
              </View>
            )}
          </View>

          {/* Children content */}
          {children && <View style={styles.childrenContainer}>{children}</View>}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
  },
  gradient: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: BrandColors.gray700 + '60',
  },
  glowBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: BorderRadius.lg + 2,
    borderWidth: 2,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  loadingIndicator: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
  loadingDotDelay: {
    // Animation delay handled in useEffect
  },
  loadingDotDelay2: {
    // Animation delay handled in useEffect
  },
  childrenContainer: {
    marginTop: Spacing.md,
  },
});

