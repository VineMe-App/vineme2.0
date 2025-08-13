// Design tokens and theme system for VineMe

export const Colors = {
  // Primary colors
  primary: '#007AFF',
  primaryLight: '#4DA3FF',
  primaryDark: '#0056CC',
  
  // Secondary colors
  secondary: '#5856D6',
  secondaryLight: '#7B7AE8',
  secondaryDark: '#3F3EA3',
  
  // Semantic colors
  success: '#34C759',
  successLight: '#5ED77A',
  successDark: '#248A3D',
  
  warning: '#FF9500',
  warningLight: '#FFB340',
  warningDark: '#CC7700',
  
  error: '#FF3B30',
  errorLight: '#FF6B62',
  errorDark: '#CC2E25',
  
  info: '#5AC8FA',
  infoLight: '#7DD3FB',
  infoDark: '#48A0C8',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Background colors
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundTertiary: '#F3F4F6',
  
  // Surface colors
  surface: '#FFFFFF',
  surfaceSecondary: '#F9FAFB',
  
  // Text colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
} as const;

export const Typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Line heights
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 36,
    '3xl': 42,
    '4xl': 48,
    '5xl': 60,
  },
  
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
  '7xl': 96,
} as const;

export const BorderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  md: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  lg: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  xl: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
} as const;

export const Layout = {
  // Container widths
  container: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  
  // Common dimensions
  touchTarget: 44,
  iconSize: {
    xs: 12,
    sm: 16,
    base: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
  },
  
  // Z-index values
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1100,
    banner: 1200,
    overlay: 1300,
    modal: 1400,
    popover: 1500,
    skipLink: 1600,
    toast: 1700,
    tooltip: 1800,
  },
} as const;

// Theme object combining all design tokens
export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  layout: Layout,
} as const;

// Type definitions for theme
export type ThemeColors = typeof Colors;
export type ThemeTypography = typeof Typography;
export type ThemeSpacing = typeof Spacing;
export type ThemeBorderRadius = typeof BorderRadius;
export type ThemeShadows = typeof Shadows;
export type ThemeLayout = typeof Layout;
export type Theme = typeof Theme;