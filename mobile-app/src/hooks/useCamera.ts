import { useState } from 'react';
import { useCameraPermissions } from 'expo-camera';

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');

  const toggleFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash((current) => (current === 'off' ? 'on' : current === 'on' ? 'auto' : 'off'));
  };

  return {
    permission,
    requestPermission,
    facing,
    setFacing,
    toggleFacing,
    flash,
    setFlash,
    toggleFlash,
    isPermissionGranted: permission?.granted ?? false,
  };
}
