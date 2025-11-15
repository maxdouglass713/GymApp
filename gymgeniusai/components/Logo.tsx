import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { BrandColors, Typography, Spacing } from '@/constants/theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  style?: any;
  useImage?: boolean; // Set to true to use image file instead of generated logo
}

export function Logo({ size = 'medium', showText = true, style, useImage = true }: LogoProps) {
  const sizeStyles = {
    small: { container: 50, text: 12, icon: 16 },
    medium: { container: 75, text: 16, icon: 24 },
    large: { container: 100, text: 20, icon: 32 },
  };
  
  const currentSize = sizeStyles[size];
  
  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.logoContainer,
        { 
          width: currentSize.container,
          height: currentSize.container,
          borderRadius: currentSize.container / 2,
        }
      ]}>
        {useImage ? (
          /* Use Image File */
          <Image
            source={require('@/assets/images/logo.png')}
            style={{
              width: currentSize.container * 1.0,
              height: currentSize.container * 1.0,
            }}
            resizeMode="contain"
          />
        ) : (
          /* Generated Brain + Dumbbell Icon */
          <View style={styles.iconContainer}>
            {/* Brain */}
            <View style={[styles.brain, { width: currentSize.icon * 0.6, height: currentSize.icon * 0.4 }]}>
              <View style={[styles.brainLeft, { width: currentSize.icon * 0.3, height: currentSize.icon * 0.4 }]} />
              <View style={[styles.brainRight, { width: currentSize.icon * 0.3, height: currentSize.icon * 0.4 }]} />
            </View>
            
            {/* Dumbbell */}
            <View style={[styles.dumbbell, { width: currentSize.icon * 0.8, height: currentSize.icon * 0.15 }]}>
              <View style={[styles.weight, { width: currentSize.icon * 0.2, height: currentSize.icon * 0.15 }]} />
              <View style={[styles.bar, { width: currentSize.icon * 0.4, height: currentSize.icon * 0.05 }]} />
              <View style={[styles.weight, { width: currentSize.icon * 0.2, height: currentSize.icon * 0.15 }]} />
            </View>
          </View>
        )}
      </View>
      {showText && (
        <Text style={[styles.brandText, { fontSize: currentSize.text + 4 }]}>
          KINETIC FLOW AI
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    backgroundColor: 'transparent', // Transparent to show your logo's black background
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowColor: BrandColors.accent,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  brain: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  brainLeft: {
    backgroundColor: BrandColors.text,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    opacity: 0.9,
  },
  brainRight: {
    backgroundColor: BrandColors.text,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    opacity: 0.7,
  },
  dumbbell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weight: {
    backgroundColor: BrandColors.text,
    borderRadius: 2,
  },
  bar: {
    backgroundColor: BrandColors.text,
    borderRadius: 1,
  },
  brandText: {
    color: BrandColors.text,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },
});
