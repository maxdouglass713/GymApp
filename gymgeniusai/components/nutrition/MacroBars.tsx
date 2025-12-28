import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface MacroBarsProps {
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targetMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  colors: typeof BrandColors;
}

interface CircularProgressProps {
  size: number;
  strokeWidth: number;
  percentage: number;
  color: string;
  backgroundColor: string;
  value: number;
  unit: string;
  isOverTarget: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  size,
  strokeWidth,
  percentage,
  color,
  backgroundColor,
  value,
  unit,
  isOverTarget,
}) => {
  const radius = (size - strokeWidth - 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;
  const center = size / 2;
  const outlineRadius = size / 2 - 1;

  return (
    <View style={styles.circleContainer}>
      <Svg width={size} height={size} style={styles.circleSvg}>
        {/* Outline circle in macro color */}
        <Circle
          cx={center}
          cy={center}
          r={outlineRadius}
          stroke={isOverTarget ? '#FF4D6D' : color}
          strokeWidth={2}
          fill="none"
        />
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle - rotated to start from top */}
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isOverTarget ? '#FF4D6D' : color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {/* Value text in center */}
      <View style={styles.circleTextContainer}>
        <Text style={[styles.circleValueText, { color: isOverTarget ? '#FF4D6D' : color }]}>
          {Math.round(value)}
        </Text>
        <Text style={[styles.circleUnitText, { color: backgroundColor }]}>
          {unit}
        </Text>
      </View>
    </View>
  );
};

export const MacroBars: React.FC<MacroBarsProps> = ({
  totalMacros,
  targetMacros,
  colors,
}) => {
  const macroData = [
    { 
      key: 'calories', 
      label: 'Calories', 
      current: totalMacros.calories, 
      target: targetMacros.calories, 
      unit: 'cal',
      color: '#FF6B35', // Orange-red for calories
      bgColor: '#FF6B3520',
    },
    { 
      key: 'protein', 
      label: 'Protein', 
      current: totalMacros.protein, 
      target: targetMacros.protein, 
      unit: 'g',
      color: '#DC143C', // Red for meat
      bgColor: '#DC143C20',
    },
    { 
      key: 'carbs', 
      label: 'Carbs', 
      current: totalMacros.carbs, 
      target: targetMacros.carbs, 
      unit: 'g',
      color: '#FFD700', // Gold for bread/toast
      bgColor: '#FFD70020',
    },
    { 
      key: 'fat', 
      label: 'Fat', 
      current: totalMacros.fat, 
      target: targetMacros.fat, 
      unit: 'g',
      color: '#00FF88', // Green for avocado
      bgColor: '#00FF8820',
    },
  ];

  const circleSize = 60; // Balanced size to prevent overlap
  const strokeWidth = 5;

  // Split macros into two rows
  const firstRow = macroData.slice(0, 2); // Calories and Protein
  const secondRow = macroData.slice(2, 4); // Carbs and Fat

  const renderCircle = (macro: typeof macroData[0]) => {
    const percentage = (macro.current / macro.target) * 100;
    const isOverTarget = macro.current > macro.target;
    
    return (
      <View key={macro.key} style={styles.circleWrapper}>
        <CircularProgress
          size={circleSize}
          strokeWidth={strokeWidth}
          percentage={isOverTarget ? 100 : percentage}
          color={macro.color}
          backgroundColor={colors.gray800}
          value={macro.target}
          unit={macro.unit}
          isOverTarget={isOverTarget}
        />
        <Text style={[styles.circleLabel, { color: macro.color }]}>
          {macro.label}
        </Text>
      </View>
    );
  };

  return (
      <View style={styles.circlesGrid}>
        <View style={styles.circlesRow}>
          {firstRow.map(renderCircle)}
        </View>
        <View style={styles.circlesRow}>
          {secondRow.map(renderCircle)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  circlesGrid: {
    gap: Spacing.xl, // More vertical spacing between rows
  },
  circlesRow: {
    flexDirection: 'row',
    justifyContent: 'center', // Center the circles
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xl, // Explicit gap between circles
  },
  circleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSvg: {
    transform: [{ rotate: '0deg' }],
  },
  circleTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circleValueText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  circleUnitText: {
    fontSize: 8,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginTop: -1,
  },
  circleLabel: {
    fontSize: 9,
    fontFamily: Typography.fontFamily,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 4,
    textAlign: 'center',
  },
});

