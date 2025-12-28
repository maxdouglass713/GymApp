import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';

interface LightningBoltProgressProps {
  progress: number; // 0-100
  size?: number;
}

export function LightningBoltProgress({ progress, size = 60 }: LightningBoltProgressProps) {
  // Create multiple spark animations with different timings
  const sparkAnimations = Array.from({ length: 8 }, () => ({
    opacity: useSharedValue(0),
    scale: useSharedValue(0.5),
    x: useSharedValue(0),
    y: useSharedValue(0),
  }));

  useEffect(() => {
    // Animate each spark independently with random timings
    sparkAnimations.forEach((spark, i) => {
      const delay = i * 150;
      const duration = 400 + Math.random() * 200;
      
      spark.opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: duration / 2, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: duration / 2, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );

      spark.scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: duration / 2, easing: Easing.out(Easing.ease) }),
          withTiming(0.5, { duration: duration / 2, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );

      // Random positions around the bolt
      const angle = (i * 45) * (Math.PI / 180) + Math.random() * 0.5;
      const distance = size * 0.3 + Math.random() * size * 0.2;
      spark.x.value = Math.cos(angle) * distance;
      spark.y.value = Math.sin(angle) * distance;
    });
  }, []);

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const fillHeight = (clampedProgress / 100) * size;

  // Create animated styles for each spark
  const sparkStyles = sparkAnimations.map((spark) =>
    useAnimatedStyle(() => ({
      opacity: spark.opacity.value,
      transform: [
        { translateX: spark.x.value },
        { translateY: spark.y.value },
        { scale: spark.scale.value },
      ],
    }))
  );

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Flickering sparks around the bolt */}
      {sparkAnimations.map((spark, i) => (
        <Animated.View
          key={i}
          style={[
            styles.spark,
            {
              backgroundColor: BrandColors.accent,
              shadowColor: BrandColors.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: 3,
              elevation: 5,
            },
            sparkStyles[i],
          ]}
        />
      ))}

      {/* Lightning bolt container with fill effect */}
      <View style={[styles.boltContainer, { width: size, height: size }]}>
        {/* Background bolt (unfilled) */}
        <View style={styles.boltBackground}>
          <IconSymbol name="bolt.fill" size={size * 0.7} color={BrandColors.gray800} />
        </View>

        {/* Filled bolt overlay - fills from bottom to top */}
        <View style={[styles.boltFillContainer, { width: size, height: size }]}>
          <View style={[styles.boltFillMask, { 
            height: fillHeight,
            bottom: 0,
            overflow: 'hidden',
          }]}>
            <View style={styles.boltFill}>
              <IconSymbol name="bolt.fill" size={size * 0.7} color={BrandColors.accent} />
            </View>
          </View>
        </View>

        {/* Glow effect */}
        <View style={[styles.glowContainer, { width: size, height: size }]} pointerEvents="none">
          <View style={[styles.glow, { 
            width: size * 0.85, 
            height: size * 0.85,
            shadowColor: BrandColors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: clampedProgress > 0 ? 0.5 : 0.1,
            shadowRadius: 15,
            elevation: 10,
          }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  boltContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltBackground: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltFillContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boltFillMask: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  boltFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  glow: {
    borderRadius: 100,
    backgroundColor: 'transparent',
  },
});

