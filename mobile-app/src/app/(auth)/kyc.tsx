import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Button, Input, Badge, Toast } from '@/components/ui';
import { NidScanner, LivenessCamera } from '@/components/kyc';
import { kycApi } from '@/services/api/kyc.api';
import { uploadApi } from '@/services/api/upload.api';
import { useAuthStore } from '@/store/auth.store';
import { isValidNid } from '@/utils/validators';
import { LivenessMeta } from '@/types/kyc.types';
import { Ionicons } from '@expo/vector-icons';
import { parseApiError } from '@/services/api/client';

type KycStep = 'document_front' | 'document_back' | 'ocr_review' | 'liveness' | 'submitting';

export default function KycScreen() {
  const { colors, spacing, borderRadius } = useTheme();
  const router = useRouter();
  const { setUser, user } = useAuthStore();

  const [step, setStep] = useState<KycStep>('document_front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);

  // Extracted OCR fields
  const [nidNumber, setNidNumber] = useState('');
  const [dob, setDob] = useState('');
  const [extractedName, setExtractedName] = useState('');

  // Selfie vector
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [livenessMeta, setLivenessMeta] = useState<LivenessMeta | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(3);

  // Step 1: Front captured -> go to back
  const handleFrontCaptured = (uri: string) => {
    setFrontUri(uri);
    setStep('document_back');
    setToastMessage('Front side recorded! Now capture the back side of your NID card.');
  };

  // Back captured -> trigger OCR
  const handleBackCaptured = async (uri: string) => {
    setBackUri(uri);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!frontUri) {
        throw new Error('Front image is required.');
      }

      // Execute OCR pre-check
      const ocrRes = await kycApi.ocrExtract(frontUri, uri);
      const data = ocrRes.data;

      setNidNumber(data.nidNumber || '');
      setDob(data.dob || '');
      setExtractedName(data.extractedName || '');

      setStep('ocr_review');
      setToastMessage('NID details extracted! Please verify your information.');
    } catch (err: any) {
      // Fallback: let user input details manually if OCR fails
      setStep('ocr_review');
      setErrorMessage('OCR extraction could not detect all text clearly. Please review or enter details manually.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm OCR -> go to selfie
  const handleConfirmOcr = () => {
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

  // Step 3: Liveness completed -> submit full verification
  const handleLivenessComplete = async (uri: string, meta: LivenessMeta) => {
    setSelfieUri(uri);
    setLivenessMeta(meta);
    setStep('submitting');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!frontUri || !backUri) {
        throw new Error('Missing card photos.');
      }

      // 1. Direct upload front, back, and selfie to S3
      const frontUpload = await uploadApi.uploadFileToStorage(frontUri, 'nid_front', 'nid_front.jpg');
      const backUpload = await uploadApi.uploadFileToStorage(backUri, 'nid_back', 'nid_back.jpg');
      const selfieUpload = await uploadApi.uploadFileToStorage(uri, 'avatar', 'live_selfie.jpg');

      // 2. Execute composite verification
      const verifyRes = await kycApi.verifyNid({
        nidNumber: nidNumber.trim(),
        dob: dob.trim(),
        frontImageKey: frontUpload.objectKey,
        backImageKey: backUpload.objectKey,
        liveSelfieKey: selfieUpload.objectKey,
        livenessMeta: meta,
      });

      // 3. Update auth store
      if (user) {
        setUser({
          ...user,
          isNidVerified: true,
          kycStatus: 'verified',
        });
      }

      setToastMessage('NID verification approved! Green trust badge activated.');
      setTimeout(() => {
        router.replace('/(tabs)/home' as any);
      }, 1200);
    } catch (err: any) {
      const errorStr = parseApiError(err);
      setIsLoading(false);

      if (errorStr.includes('BIOMETRIC_FACE_MISMATCH') || remainingAttempts > 1) {
        const nextAttempts = remainingAttempts - 1;
        setRemainingAttempts(nextAttempts);
        setErrorMessage(`Facial match failed. Retake selfie in good lighting. (${nextAttempts} attempts remaining)`);
        setStep('liveness');
      } else {
        // Attempts exhausted or conflict -> route to manual review
        router.replace('/(auth)/kyc-status' as any);
      }
    }
  };

  const getStepProgressNumber = () => {
    switch (step) {
      case 'document_front':
      case 'document_back':
        return 1;
      case 'ocr_review':
        return 2;
      case 'liveness':
      case 'submitting':
        return 3;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {toastMessage && (
          <Toast
            visible={!!toastMessage}
            message={toastMessage}
            variant="success"
            onDismiss={() => setToastMessage(null)}
          />
        )}

        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.stepBadgeRow}>
            <Badge variant="verified" label={`Step ${getStepProgressNumber()} of 3`} />
            <Text style={[styles.slaText, { color: colors.textSecondary }]}>
              Verification SLA: ~90s
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Verify Your National ID
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Becha-Kena requires mandatory dual-sided NID and live selfie verification to permanently exclude scammers.
          </Text>
        </View>

        {/* Error Notification */}
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
            <Ionicons name="alert-circle" size={20} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
          </View>
        )}

        {/* STEP 1: DOCUMENT SCANNER */}
        {(step === 'document_front' || step === 'document_back') && (
          <View style={styles.stepBox}>
            <View style={styles.scannerHeader}>
              <Text style={[styles.stepInstruction, { color: colors.textPrimary }]}>
                {step === 'document_front'
                  ? 'Step 1A: Capture NID Front Side'
                  : 'Step 1B: Capture NID Back Side'}
              </Text>
              {step === 'document_back' && (
                <Button
                  title="Retake Front"
                  variant="ghost"
                  size="sm"
                  onPress={() => setStep('document_front')}
                />
              )}
            </View>

            <NidScanner
              side={step === 'document_front' ? 'front' : 'back'}
              capturedUri={step === 'document_front' ? frontUri : backUri}
              onCapture={step === 'document_front' ? handleFrontCaptured : handleBackCaptured}
              onRetake={() => {
                if (step === 'document_front') setFrontUri(null);
                else setBackUri(null);
              }}
            />

            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
                  Extracting NID details via OCR...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* STEP 2: OCR CONFIRMATION */}
        {step === 'ocr_review' && (
          <View style={styles.stepBox}>
            <Text style={[styles.stepInstruction, { color: colors.textPrimary }]}>
              Step 2: Confirm Extracted Details
            </Text>
            <Text style={[styles.ocrHint, { color: colors.textSecondary }]}>
              Verify that the OCR accurately read your card before biometric face matching.
            </Text>

            {extractedName ? (
              <Input
                label="Extracted Legal Name"
                value={extractedName}
                editable={false}
                helperText="Official name on Election Commission database"
              />
            ) : null}

            <Input
              label="National ID Number"
              placeholder="e.g. 19942691234567890"
              value={nidNumber}
              onChangeText={(text) => {
                setNidNumber(text.replace(/[^0-9]/g, ''));
                if (errorMessage) setErrorMessage(null);
              }}
              keyboardType="number-pad"
              helperText="10-digit Smart Card or 13/17-digit classic NID"
            />

            <Input
              label="Date of Birth (YYYY-MM-DD)"
              placeholder="1994-05-18"
              value={dob}
              onChangeText={(text) => {
                setDob(text);
                if (errorMessage) setErrorMessage(null);
              }}
              helperText="Format: YYYY-MM-DD"
            />

            <Button
              title="Confirm & Proceed to Live Selfie"
              variant="primary"
              size="lg"
              onPress={handleConfirmOcr}
              style={{ marginTop: 12 }}
              fullWidth
            />

            <Button
              title="Retake Document Photos"
              variant="ghost"
              onPress={() => {
                setFrontUri(null);
                setBackUri(null);
                setStep('document_front');
              }}
              style={{ marginTop: 8 }}
              fullWidth
            />
          </View>
        )}

        {/* STEP 3: LIVENESS CAMERA */}
        {step === 'liveness' && (
          <View style={styles.stepBox}>
            <Text style={[styles.stepInstruction, { color: colors.textPrimary }]}>
              Step 3: Biometric Liveness Challenge
            </Text>
            <Text style={[styles.ocrHint, { color: colors.textSecondary }]}>
              Follow the on-screen prompts (look straight, blink, turn head) to prove physical presence.
            </Text>

            <LivenessCamera
              onLivenessComplete={handleLivenessComplete}
              onCancel={() => setStep('ocr_review')}
            />
          </View>
        )}

        {/* SUBMITTING STATE */}
        {step === 'submitting' && (
          <View style={styles.submittingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.submittingTitle, { color: colors.textPrimary }]}>
              Verifying Identity With Election Database
            </Text>
            <Text style={[styles.submittingSubtitle, { color: colors.textSecondary }]}>
              Performing zero-knowledge cryptographic hashing, demographic validation, and 3D facial matching...
            </Text>
          </View>
        )}

        {/* Exit to Home */}
        {step !== 'submitting' && (
          <Button
            title="Complete Verification Later (Limited Access)"
            variant="ghost"
            onPress={() => router.replace('/(public)' as any)}
            style={{ marginTop: 24 }}
            fullWidth
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  stepBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
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
  stepBox: {
    width: '100%',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepInstruction: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  ocrHint: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  submittingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  submittingSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 20,
  },
});
