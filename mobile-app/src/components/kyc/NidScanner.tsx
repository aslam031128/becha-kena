import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { useCamera } from '@/hooks/useCamera';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useImagePicker } from '@/hooks/useImagePicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_WIDTH = SCREEN_WIDTH * 0.88;
const FRAME_HEIGHT = FRAME_WIDTH / 1.586; // Standard ID-1 card aspect ratio (85.60 mm × 53.98 mm)

export interface NidScannerProps {
  side: 'front' | 'back';
  capturedUri?: string | null;
  onCapture: (uri: string) => void;
  onRetake: () => void;
}

export const NidScanner: React.FC<NidScannerProps> = ({
  side,
  capturedUri,
  onCapture,
  onRetake,
}) => {
  const { colors, borderRadius } = useTheme();
  const cameraRef = useRef<any>(null);
  const { isPermissionGranted, requestPermission, flash, toggleFlash } = useCamera();
  const { pickImage } = useImagePicker();
  const [isCapturing, setIsCapturing] = useState(false);

  if (!isPermissionGranted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="camera-outline" size={54} color={colors.textSecondary} />
        <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
          Camera Access Required
        </Text>
        <Text style={[styles.permissionSubtitle, { color: colors.textSecondary }]}>
          Becha-Kena requires camera permission to capture clear photos of your National ID card for official verification.
        </Text>
        <Button
          title="Grant Camera Permission"
          variant="primary"
          onPress={requestPermission}
          style={{ marginTop: 18 }}
        />
      </View>
    );
  }

  // Preview Mode
  if (capturedUri) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />
        <View style={styles.previewOverlay}>
          <View style={[styles.previewBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.previewBadgeText}>
              {side === 'front' ? 'Front Side Captured' : 'Back Side Captured'}
            </Text>
          </View>
          <Button
            title="Retake Photo"
            variant="secondary"
            size="sm"
            onPress={onRetake}
            leftIcon={<Ionicons name="refresh" size={16} color={colors.primary} />}
          />
        </View>
      </View>
    );
  }

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } catch (e) {
      console.warn('[NidScanner] Capture error:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    const uri = await pickImage({ allowsEditing: true, aspect: [158, 100] });
    if (uri) {
      onCapture(uri);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        enableTorch={flash === 'on'}
      >
        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={toggleFlash}
          >
            <Ionicons
              name={flash === 'on' ? 'flash' : 'flash-off'}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={handlePickFromGallery}
          >
            <Ionicons name="images-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Card Overlay Frame */}
        <View style={styles.frameContainer}>
          <View
            style={[
              styles.cardFrame,
              {
                width: FRAME_WIDTH,
                height: FRAME_HEIGHT,
                borderColor: colors.primary,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            {/* Corner Indicators */}
            <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
          </View>
          <Text style={styles.instructionText}>
            {side === 'front'
              ? 'Position FRONT of your NID inside the frame'
              : 'Position BACK of your NID inside the frame'}
          </Text>
        </View>

        {/* Bottom Shutter Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.shutterButton, { borderColor: colors.primary }]}
            onPress={handleTakePhoto}
            disabled={isCapturing}
          >
            <View style={[styles.shutterInner, { backgroundColor: colors.primary }]} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 380,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    height: 320,
    width: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  permissionSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  previewContainer: {
    height: 280,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  previewBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFrame: {
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  shutterButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
});
