import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius } from './spacing';

export * from './colors';
export * from './typography';
export * from './spacing';

export interface Theme {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  isDark: boolean;
}

export function useTheme(): Theme {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    typography,
    spacing,
    borderRadius,
    isDark,
  };
}
