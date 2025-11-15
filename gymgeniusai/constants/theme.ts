/**
 * KINETIC FLOW AI - Brand Theme
 * Global colors, spacing, typography, and component styles
 */

import { Platform, Dimensions } from 'react-native';

// Brand Colors
export const BrandColors = {
  // Primary colors (Futuristic / Robotic)
  background: '#0a0f1f',      // Deep navy background
  surface: '#0f1529',         // Darker navy for cards/dividers
  text: '#E6F1FF',            // Crisp off-white
  textSecondary: '#9CC4FF',   // Soft blue for secondary text
  accent: '#00E5FF',          // Neon cyan (primary accent)
  
  // Interactive states
  accentHover: '#33ECFF',     // Lighter glow cyan
  accentDisabled: '#0A4D59',  // Muted cyan for disabled
  accentDisabledOpacity: 0.6, // 60% opacity for disabled
  
  // Semantic colors (shifted to cool tones)
  success: '#33E6A6',
  warning: '#66D1FF',
  error: '#FF4D6D',
  info: '#3BA7FF',
  
  // Icon and tint colors
  icon: '#9CC4FF',            // Icon color
  tint: '#00E5FF',            // Tint color for active states
  
  // Neutral cool grays/blues for borders
  gray100: '#ECF4FF',
  gray200: '#D7E8FF',
  gray300: '#B8D4FF',
  gray400: '#8FB7E6',
  gray500: '#6A91BF',
  gray600: '#42638A',
  gray700: '#2E4563',
  gray800: '#1B2A40',
  gray900: '#0F1A2B',
};

// Spacing scale (8pt grid system)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

// Border radius scale
export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Typography scale
export const Typography = {
  // Font families
  fontFamily: Platform.select({
    ios: 'ui-rounded',
    android: 'sans-serif',
    default: 'system-ui',
  }),
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },
  
  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
};

// Component styles
export const ComponentStyles = {
  // Button styles
  button: {
    primary: {
      backgroundColor: BrandColors.accent,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: BrandColors.accent,
      shadowOpacity: 0.45,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    },
    primaryText: {
      color: '#00121F',
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily,
    },
    disabled: {
      backgroundColor: BrandColors.accentDisabled,
      opacity: BrandColors.accentDisabledOpacity,
    },
    secondary: {
      backgroundColor: 'rgba(0,229,255,0.06)',
      borderWidth: 1,
      borderColor: BrandColors.accent,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      shadowColor: BrandColors.accent,
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    secondaryText: {
      color: BrandColors.accent,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily,
    },
  },
  
  // Input styles
  input: {
    backgroundColor: BrandColors.surface,
    borderColor: BrandColors.gray700,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: BrandColors.text,
    fontFamily: Typography.fontFamily,
    shadowColor: BrandColors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  inputFocused: {
    borderColor: BrandColors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  
  // Card styles
  card: {
    backgroundColor: BrandColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: BrandColors.gray800,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  
  // Screen styles
  screen: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  
  // Header styles
  header: {
    backgroundColor: BrandColors.background,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  headerTitle: {
    color: BrandColors.text,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.fontFamily,
  },
} as const;

// Legacy compatibility - keeping the old Colors export for existing components
export const Colors = {
  light: {
    text: BrandColors.text,
    background: BrandColors.background,
    tint: BrandColors.accent,
    icon: BrandColors.textSecondary,
    tabIconDefault: BrandColors.textSecondary,
    tabIconSelected: BrandColors.accent,
  },
  dark: {
    text: BrandColors.text,
    background: BrandColors.background,
    tint: BrandColors.accent,
    icon: BrandColors.textSecondary,
    tabIconDefault: BrandColors.textSecondary,
    tabIconSelected: BrandColors.accent,
  },
};

// Screen dimensions
export const ScreenDimensions = {
  width: Dimensions.get('window').width,
  height: Dimensions.get('window').height,
  isSmallScreen: Dimensions.get('window').width < 375,
  isLargeScreen: Dimensions.get('window').width > 414,
};

// Font exports for compatibility
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
