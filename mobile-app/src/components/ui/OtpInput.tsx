import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '@/theme';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  error = false,
  disabled = false,
}) => {
  const { colors, borderRadius } = useTheme();
  const inputRefs = useRef<Array<any>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  useEffect(() => {
    // Focus first empty slot or first slot on mount
    const firstEmpty = digits.findIndex((d) => !d);
    const targetIndex = firstEmpty === -1 ? length - 1 : firstEmpty;
    inputRefs.current[targetIndex]?.focus();
  }, []);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');
    if (!cleaned) return;

    if (cleaned.length > 1) {
      // User pasted full OTP
      const pasted = cleaned.slice(0, length);
      onChange(pasted);
      if (pasted.length === length && onComplete) {
        onComplete(pasted);
      }
      inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned[cleaned.length - 1];
    const newOtp = newDigits.join('');
    onChange(newOtp);

    if (newOtp.length === length && onComplete) {
      onComplete(newOtp);
    } else if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<{ key: string }>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => {
        const isFocused = focusedIndex === index;
        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(-1)}
            keyboardType="number-pad"
            maxLength={length} // Allow paste in any cell
            editable={!disabled}
            selectTextOnFocus
            style={[
              styles.cell,
              {
                backgroundColor: colors.surface,
                borderColor: error
                  ? colors.danger
                  : isFocused
                  ? colors.primary
                  : digit
                  ? colors.primaryDark
                  : colors.border,
                borderWidth: isFocused || error ? 2 : 1.5,
                borderRadius: borderRadius.md,
                color: colors.textPrimary,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 18,
  },
  cell: {
    width: 48,
    height: 54,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
