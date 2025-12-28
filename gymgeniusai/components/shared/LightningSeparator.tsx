import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { BrandColors } from '@/constants/theme';

interface LightningSeparatorProps {
  color?: string;
}

export const LightningSeparator: React.FC<LightningSeparatorProps> = ({
  color = BrandColors.accent,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const width = screenWidth - 32; // Account for padding (16 on each side)
  const height = 20;
  const centerY = height / 2;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} style={styles.svg}>
        {/* Glow effect - multiple layers for stronger glow */}
        <Line
          x1={0}
          y1={centerY}
          x2={width}
          y2={centerY}
          stroke={color}
          strokeWidth={6}
          opacity={0.4}
          strokeLinecap="round"
        />
        <Line
          x1={0}
          y1={centerY}
          x2={width}
          y2={centerY}
          stroke={color}
          strokeWidth={4}
          opacity={0.5}
          strokeLinecap="round"
        />
        {/* Main line */}
        <Line
          x1={0}
          y1={centerY}
          x2={width}
          y2={centerY}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 4,
  },
  svg: {
    width: '100%',
  },
});

