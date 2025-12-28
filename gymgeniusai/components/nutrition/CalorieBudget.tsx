import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface CalorieBudgetProps {
  consumed: number;
  target: number;
  colors: typeof BrandColors;
}

export const CalorieBudget: React.FC<CalorieBudgetProps> = ({
  consumed,
  target,
  colors,
}) => {
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const percentage = useMemo(() => {
    if (target === 0) return 0;
    return Math.min((consumed / target) * 100, 100);
  }, [consumed, target]);

  const remaining = Math.max(target - consumed, 0);
  const isOverTarget = consumed > target;
  const isNearTarget = percentage >= 90 && percentage <= 100;
  const isHalfway = percentage >= 50 && percentage < 90;

  // Color logic: cyan → yellow → green → red
  const getRingColor = () => {
    if (isOverTarget) return '#FF4D6D'; // Red when over
    if (isNearTarget) return '#00FF88'; // Green when near target
    if (isHalfway) return '#FFD700'; // Yellow/orange when halfway
    return BrandColors.accent; // Cyan (electric blue) when under 50%
  };

  const ringColor = getRingColor();
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={styles.circleWrapper}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.gray800}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle - rotated to start from top */}
          <G rotation="-90" origin={`${center}, ${center}`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={ringColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        
        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[styles.remainingValue, { color: colors.text }]}>
            {Math.round(remaining).toLocaleString()}
          </Text>
          <Text style={[styles.remainingLabel, { color: colors.textSecondary }]}>
            REMAINING
          </Text>
        </View>
      </View>

      {/* Bottom stats */}
      <View style={styles.statsContainer}>
        <Text style={[styles.statsText, { color: colors.text }]}>
          {Math.round(consumed).toLocaleString()} / {Math.round(target).toLocaleString()} cal
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  circleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  remainingValue: {
    fontSize: 36,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 42,
  },
  remainingLabel: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  statsContainer: {
    marginTop: Spacing.sm,
  },
  statsText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
});

