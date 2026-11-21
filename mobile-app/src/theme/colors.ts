export const lightColors = {
  // Brand colors
  primary: '#16A34A', // Emerald Green - NID verified, primary buttons
  primaryLight: '#DCFCE7',
  primaryDark: '#15803D',
  
  secondary: '#2563EB', // Royal Blue - links, secondary highlights
  secondaryLight: '#DBEAFE',
  secondaryDark: '#1D4ED8',
  
  // Semantic colors
  warning: '#F59E0B', // Amber - pending review, cautious notifications
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  
  danger: '#DC2626', // Crimson Red - scam alert, errors, banned states
  dangerLight: '#FEF2F2',
  dangerBorder: '#FCA5A5',
  dangerDark: '#B91C1C',
  
  success: '#16A34A',
  successLight: '#DCFCE7',
  
  // Neutral surfaces & backgrounds
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  card: '#FFFFFF',
  
  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  
  // Borders & Dividers
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  divider: '#F1F5F9',
  
  // Custom badges
  verifiedBadge: '#16A34A',
  verifiedBadgeBg: '#DCFCE7',
  scamWarningBg: '#FEF2F2',
  scamWarningText: '#991B1B',
  scamWarningBorder: '#F87171',
  
  // Modals & Overlays
  overlay: 'rgba(15, 23, 42, 0.6)',
};

export const darkColors: typeof lightColors = {
  // Brand colors
  primary: '#22C55E',
  primaryLight: '#14532D',
  primaryDark: '#16A34A',
  
  secondary: '#3B82F6',
  secondaryLight: '#1E3A8A',
  secondaryDark: '#2563EB',
  
  // Semantic colors
  warning: '#FBBF24',
  warningLight: '#78350F',
  warningDark: '#D97706',
  
  danger: '#EF4444',
  dangerLight: '#450A0A',
  dangerBorder: '#7F1D1D',
  dangerDark: '#DC2626',
  
  success: '#22C55E',
  successLight: '#14532D',
  
  // Neutral surfaces & backgrounds
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',
  card: '#1E293B',
  
  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',
  
  // Borders & Dividers
  border: '#334155',
  borderStrong: '#475569',
  divider: '#1E293B',
  
  // Custom badges
  verifiedBadge: '#22C55E',
  verifiedBadgeBg: '#14532D',
  scamWarningBg: '#450A0A',
  scamWarningText: '#FCA5A5',
  scamWarningBorder: '#7F1D1D',
  
  // Modals & Overlays
  overlay: 'rgba(0, 0, 0, 0.75)',
};

export type ThemeColors = typeof lightColors;
