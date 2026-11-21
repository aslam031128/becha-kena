import * as ImagePicker from 'expo-image-picker';

export function useImagePicker() {
  const [isPicking, setIsPicking] = useState(false);

  const pickImage = async (options?: ImagePicker.ImagePickerOptions) => {
    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      return null;
    } finally {
      setIsPicking(false);
    }
  };

  const takePhoto = async (options?: ImagePicker.ImagePickerOptions) => {
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Camera permission is required to capture photos.');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      return null;
    } finally {
      setIsPicking(false);
    }
  };

  return {
    pickImage,
    takePhoto,
    isPicking,
  };
}
import { useState } from 'react';
