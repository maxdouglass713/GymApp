/**
 * AI Loading Indicator Component
 * 
 * Futuristic loading indicator for AI generation processes
 * Features animated particles and glowing effects
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { BrandColors, Spacing, Typography } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AILoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export function AILoadingIndicator({ 
  message = 'AI is thinking...', 
  size = 'medium' 
}: AILoadingIndicatorProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const particleAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Rotating ring animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing center animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particle animations
    particleAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [rotateAnim, pulseAnim, particleAnims]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sizeMap = {
    small: { container: 40, icon: 16 },
    medium: { container: 64, icon: 24 },
    large: { container: 96, icon: 32 },
  };

  const dimensions = sizeMap[size];

  return (
    <View style={styles.container}>
      <View style={[styles.loaderContainer, { width: dimensions.container, height: dimensions.container }]}>
        {/* Rotating ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: dimensions.container,
              height: dimensions.container,
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View style={[styles.ringSegment, styles.ringSegment1]} />
          <View style={[styles.ringSegment, styles.ringSegment2]} />
          <View style={[styles.ringSegment, styles.ringSegment3]} />
        </Animated.View>

        {/* Pulsing center */}
        <Animated.View
          style={[
            styles.center,
            {
              width: dimensions.container * 0.6,
              height: dimensions.container * 0.6,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <IconSymbol name="sparkles" size={dimensions.icon} color={BrandColors.accent} />
        </Animated.View>

        {/* Floating particles */}
        {particleAnims.map((anim, index) => {
          const angle = (index * 360) / particleAnims.length;
          const radius = dimensions.container * 0.5;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;

          const opacity = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 1, 0],
          });

          const scale = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.5, 1, 0.5],
          });

          const translateX = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, x, 0],
          });

          const translateY = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, y, 0],
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  left: dimensions.container / 2 - 4,
                  top: dimensions.container / 2 - 4,
                  opacity,
                  transform: [
                    { translateX },
                    { translateY },
                    { scale },
                  ],
                },
              ]}
            />
          );
        })}
      </View>

      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  loaderContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: BrandColors.accent,
    borderRightColor: BrandColors.accent + '80',
  },
  ringSegment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringSegment1: {
    borderTopColor: BrandColors.accent,
  },
  ringSegment2: {
    borderRightColor: BrandColors.accent + '60',
    transform: [{ rotate: '120deg' }],
  },
  ringSegment3: {
    borderBottomColor: BrandColors.accent + '40',
    transform: [{ rotate: '240deg' }],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.accent + '20',
    borderRadius: 9999,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.accent,
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  message: {
    marginTop: Spacing.md,
    color: BrandColors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
});

