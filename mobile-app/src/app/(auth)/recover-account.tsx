import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Button, Input, OtpInput, Card, Badge, Toast } from '@/components/ui';
import { LivenessCamera } from '@/components/kyc';
import { authApi } from '@/services/api/auth.api';
import { kycApi } from '@/services/api/kyc.api';
import { uploadApi } from '@/services/api/upload.api';
import { useAuthStore } from '@/store/auth.store';
import { saveTokens } from '@/utils/storage';
import { isValidBdPhone, isValidNid } from '@/utils/validators';
import { LivenessMeta } from '@/types/kyc.types';
import { Ionicons } from '@expo/vector-icons';
import { parseApiError } from '@/services/api/client';

type RecoveryStep = 'new_phone' | 'otp_verify' | 'nid_details' | 'liveness' | 'submitting';

export default function RecoverAccountScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();
  const { checkAuthState } = useAuthStore();

  const [step, setStep] = useState<RecoveryStep>('new_phone');
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [dob, setDob] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Step 1: Request OTP on new phone
  const handleRequestNewPhoneOtp = async () => {
    setErrorMessage(null);
    if (!isValidBdPhone(newPhone)) {
      setErrorMessage('Please enter a valid 11-digit Bangladeshi mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.requestOtp(newPhone);
      setStep('otp_verify');
      setToastMessage(`OTP sent to new phone: ${newPhone}`);
    } catch (err: any) {
      setErrorMessage(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm OTP
  const handleConfirmOtp = () => {
    if (phoneOtp.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    setErrorMessage(null);
    setStep('nid_details');
  };

  // Step 3: Confirm NID info
  const handleConfirmNidDetails = () => {
    if (!isValidNid(nidNumber)) {
      setErrorMessage('Please provide a valid 10, 13, or 17-digit National ID number.');
      return;
    }
    if (!dob || dob.length < 10) {
      setErrorMessage('Please enter Date of Birth in YYYY-MM-DD format.');
      return;
    }
    setErrorMessage(null);
    setStep('liveness');
  };

  // Step 4: Liveness match & final atomic rebind
  const handleLivenessComplete = async (uri: string, meta: LivenessMeta) => {
    setStep('submitting');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Upload biometric selfie to S3
      const uploadRes = await uploadApi.uploadFileToStorage(uri, 'avatar', 'recovery_selfie.jpg');

      // 2. Call rebind-phone API
      const rebindRes = await kycApi.rebindPhone({
        newPhone: newPhone.trim(),
        phoneOtp: phoneOtp.trim(),
        nidNumber: nidNumber.trim(),
        dob: dob.trim(),
        liveSelfieKey: uploadRes.objectKey,
      });

      // 3. Persist new session token and hydrate auth state
      await saveTokens(rebindRes.data.accessToken);
      await checkAuthState();

      setToastMessage('Mobile number changed successfully! All sessions on your old SIM have been terminated.');
      setTimeout(() => {
        router.replace('/(tabs)/home' as any);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(parseApiError(err));
      setStep('nid_details');
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
          {toastMessage && (
            <Toast
              visible={!!toastMessage}
              message={toastMessage}
              variant="success"
              onDismiss={() => setToastMessage(null)}
            />
          )}

          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.warningLight, borderRadius: borderRadius.full },
              ]}
            >
              <Ionicons name="key-outline" size={36} color={colors.warningDark} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Lost SIM Account Recovery
            </Text>
            <Badge variant="warning" label="Biometric-First Rebinding" style={{ marginTop: 8 }} />
          </View>

          {/* Security Notice */}
          <Card style={styles.securityCard}>
            <View style={styles.securityNoticeRow}>
              <Ionicons name="shield-outline" size={20} color={colors.warningDark} style={{ marginRight: 8 }} />
              <Text style={[styles.securityTitle, { color: colors.warningDark }]}>
                Security Protection Policy
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 }}>
              Rebinding your account requires proving your biometric identity. Upon success, all existing sessions and devices linked to your lost SIM will be immediately revoked.
            </Text>
          </Card>

          {/* Error Banner */}
          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.dangerLight,
                  borderColor: colors.dangerBorder,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
            </View>
          )}

          {/* STEP 1: NEW PHONE NUMBER */}
          {step === 'new_phone' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                Step 1: Enter Your New Mobile Number
              </Text>
              <Input
                label="New Mobile Phone Number"
                placeholder="01XXXXXXXXX"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                helperText="Enter the new SIM number you wish to bind to your NID"
              />
              <Button
                title="Send Verification Code"
                variant="primary"
                size="lg"
                onPress={handleRequestNewPhoneOtp}
                loading={isLoading}
                disabled={!isValidBdPhone(newPhone) || isLoading}
                fullWidth
              />
            </View>
          )}

          {/* STEP 2: VERIFY OTP ON NEW PHONE */}
          {step === 'otp_verify' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                Step 2: Verify Code on New Mobile
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Enter the 6-digit code sent to {newPhone}
              </Text>

              <OtpInput
                value={phoneOtp}
                onChange={setPhoneOtp}
                onComplete={handleConfirmOtp}
              />

              <Button
                title="Confirm & Proceed to NID Proof"
                variant="primary"
                size="lg"
                onPress={handleConfirmOtp}
                disabled={phoneOtp.length !== 6}
                style={{ marginTop: 12 }}
                fullWidth
              />
            </View>
          )}

          {/* STEP 3: NID IDENTITY DETAILS */}
          {step === 'nid_details' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                Step 3: Enter Your Registered NID Details
              </Text>
              <Input
                label="Registered National ID Number"
                placeholder="10, 13, or 17 digits"
                value={nidNumber}
                onChangeText={setNidNumber}
                keyboardType="number-pad"
              />
              <Input
                label="Date of Birth (YYYY-MM-DD)"
                placeholder="1994-05-18"
                value={dob}
                onChangeText={setDob}
              />
              <Button
                title="Proceed to Biometric Selfie Match"
                variant="primary"
                size="lg"
                onPress={handleConfirmNidDetails}
                style={{ marginTop: 12 }}
                fullWidth
              />
            </View>
          )}

          {/* STEP 4: LIVENESS CHALLENGE */}
          {step === 'liveness' && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                Step 4: Biometric Facial Liveness
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
                Position your face inside the oval frame. A confidence match of ≥95% is required.
              </Text>

              <LivenessCamera
                onLivenessComplete={handleLivenessComplete}
                onCancel={() => setStep('nid_details')}
              />
            </View>
          )}

          <Button
            title="Cancel & Back to Login"
            variant="ghost"
            onPress={() => router.replace('/(auth)/login' as any)}
            style={{ marginTop: 20 }}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  securityCard: {
    marginBottom: 20,
    padding: 14,
  },
  securityNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
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
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
});
