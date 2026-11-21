import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Button, Input, OtpInput, Badge, Toast } from '@/components/ui';
import { useAuthStore } from '@/store/auth.store';
import { isValidBdPhone } from '@/utils/validators';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();

  const {
    requestOtp,
    login,
    isLoading,
    error,
    clearError,
    pendingPhone,
    setPendingPhone,
  } = useAuthStore();

  const [step, setStep] = useState<'phone' | 'otp'>(pendingPhone ? 'otp' : 'phone');
  const [phoneNumber, setPhoneNumber] = useState(pendingPhone || '');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  // Countdown timer for OTP expiry and resend cooldown
  useEffect(() => {
    if (step === 'otp') {
      setCountdown(120);
      setCanResend(false);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setCanResend(true);
            return 0;
          }
          if (prev <= 60) {
            setCanResend(true);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleRequestOtp = async () => {
    clearError();
    const cleanPhone = phoneNumber.trim();

    if (!isValidBdPhone(cleanPhone)) {
      return;
    }

    try {
      await requestOtp(cleanPhone);
      setStep('otp');
      setToastMessage(`Verification code dispatched to ${cleanPhone}`);
    } catch {
      // Error is caught and surfaced by the store
    }
  };

  const handleVerifyOtp = async (otpToVerify?: string) => {
    clearError();
    const code = otpToVerify || otp;

    if (code.length !== 6) return;

    try {
      const result = await login(phoneNumber.trim(), code);

      if (result.isNewDeviceChallengeRequired) {
        router.replace('/(auth)/new-device-challenge' as any);
        return;
      }

      const currentUser = useAuthStore.getState().user;
      if (currentUser?.isNidVerified) {
        router.replace('/(tabs)/home' as any);
      } else {
        router.replace('/(auth)/kyc' as any);
      }
    } catch {
      // Error is caught and surfaced by the store
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || isLoading) return;
    setOtp('');
    await handleRequestOtp();
  };

  const isPhoneValid = isValidBdPhone(phoneNumber);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          {toastMessage && (
            <Toast
              visible={!!toastMessage}
              message={toastMessage}
              variant="success"
              onDismiss={() => setToastMessage(null)}
            />
          )}

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View
              style={[
                styles.logoIconCircle,
                { backgroundColor: colors.primaryLight, borderRadius: borderRadius.full },
              ]}
            >
              <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.primary }]}>Becha-Kena</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Bangladesh's First NID-Verified Resale Marketplace
            </Text>
            <Badge variant="verified" label="Closed-Loop Citizen Security" style={{ marginTop: 8 }} />
          </View>

          {/* Error Banner */}
          {error && (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: colors.dangerLight,
                  borderColor: colors.dangerBorder,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {/* Step 1: Phone Number Input */}
          {step === 'phone' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                Login or Create Account
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Enter your Bangladeshi mobile number to receive a secure 6-digit one-time PIN.
              </Text>

              <Input
                label="Mobile Phone Number"
                placeholder="01XXXXXXXXX"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text.replace(/[^0-9+]/g, ''));
                  if (error) clearError();
                }}
                keyboardType="phone-pad"
                maxLength={14}
                leftIcon={
                  <View style={styles.countryPrefix}>
                    <Text style={styles.flagEmoji}>🇧🇩</Text>
                    <Text style={[styles.prefixText, { color: colors.textPrimary }]}>+880</Text>
                  </View>
                }
                helperText="Format: 017XXXXXXXX or +88017XXXXXXXX"
              />

              <Button
                title="Get 6-Digit Verification PIN"
                variant="primary"
                size="lg"
                onPress={handleRequestOtp}
                loading={isLoading}
                disabled={!isPhoneValid || isLoading}
                style={{ marginTop: 12 }}
                fullWidth
              />

              <Button
                title="Continue as Guest (Browse Feed)"
                variant="ghost"
                onPress={() => router.replace('/(public)' as any)}
                style={{ marginTop: 16 }}
                fullWidth
              />

              <TouchableOpacity
                onPress={() => router.push('/(auth)/recover-account' as any)}
                style={{ marginTop: 14, alignItems: 'center' }}
              >
                <Text style={{ color: colors.secondary, fontSize: 13, fontWeight: '600' }}>
                  Lost your registered phone number?
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <View style={styles.stepContainer}>
              <View style={styles.otpHeaderRow}>
                <TouchableOpacity
                  onPress={() => {
                    setStep('phone');
                    setPendingPhone(null);
                    clearError();
                  }}
                  style={styles.backButton}
                >
                  <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Verify Mobile PIN</Text>
              </View>

              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Enter the 6-digit verification code sent to{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{phoneNumber}</Text>
              </Text>

              <OtpInput
                value={otp}
                onChange={(code) => {
                  setOtp(code);
                  if (error) clearError();
                }}
                onComplete={(code) => handleVerifyOtp(code)}
                error={!!error}
                disabled={isLoading}
              />

              <Button
                title="Verify & Authenticate"
                variant="primary"
                size="lg"
                onPress={() => handleVerifyOtp()}
                loading={isLoading}
                disabled={otp.length !== 6 || isLoading}
                style={{ marginTop: 12 }}
                fullWidth
              />

              {/* Countdown & Resend Option */}
              <View style={styles.resendContainer}>
                {countdown > 0 ? (
                  <Text style={[styles.countdownText, { color: colors.textSecondary }]}>
                    Resend code available in{' '}
                    <Text style={{ fontWeight: '700', color: colors.primary }}>
                      {formatTimer(countdown)}
                    </Text>
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                    <Text style={[styles.resendLink, { color: colors.primary }]}>
                      Didn't receive code? Resend SMS OTP
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setStep('phone');
                    setOtp('');
                    clearError();
                  }}
                  style={{ marginTop: 14 }}
                >
                  <Text style={[styles.editPhoneText, { color: colors.secondary }]}>
                    Edit Phone Number
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoIconCircle: {
    width: 68,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  stepContainer: {
    width: '100%',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 10,
    padding: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  stepSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 20,
  },
  countryPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    marginRight: 10,
  },
  flagEmoji: {
    fontSize: 18,
    marginRight: 4,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  countdownText: {
    fontSize: 13,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  editPhoneText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
