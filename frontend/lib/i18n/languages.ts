export interface Language {
  code: string;
  name: string;
  englishName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const TOP_LANGUAGES: Language[] = [
  { code: 'bn', name: 'বাংলা', englishName: 'Bengali (Bangla)', flag: '🇧🇩' },
  { code: 'en', name: 'English', englishName: 'English (US/UK)', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', englishName: 'Arabic', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳' },
  { code: 'es', name: 'Español', englishName: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', englishName: 'French', flag: '🇫🇷' },
  { code: 'zh', name: '中文', englishName: 'Chinese (Mandarin)', flag: '🇨🇳' },
  { code: 'ms', name: 'Bahasa Melayu', englishName: 'Malay / Indonesian', flag: '🇲🇾' },
  { code: 'de', name: 'Deutsch', englishName: 'German', flag: '🇩🇪' },
  { code: 'ur', name: 'اردو', englishName: 'Urdu', flag: '🇵🇰', dir: 'rtl' },
];

