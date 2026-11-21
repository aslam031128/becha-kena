import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation {
  coords: LocationCoords;
  division?: string;
  thana?: string;
}

export function useLocation() {
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocationPermission = async (): Promise<LocationCoords | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setIsPermissionGranted(granted);

      if (!granted) {
        setError('Location permission was denied. You can select your division manually.');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const currentCoords: LocationCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setCoords(currentCoords);

      // Attempt reverse geocoding
      try {
        const reverse = await Location.reverseGeocodeAsync(currentCoords);
        if (reverse && reverse.length > 0) {
          const place = reverse[0];
          setResolvedLocation({
            coords: currentCoords,
            division: place.region || place.city || undefined,
            thana: place.subregion || place.district || place.name || undefined,
          });
        } else {
          setResolvedLocation({ coords: currentCoords });
        }
      } catch {
        setResolvedLocation({ coords: currentCoords });
      }

      return currentCoords;
    } catch (err: any) {
      setError(err.message || 'Failed to obtain current GPS location.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      setIsPermissionGranted(status === 'granted');
    });
  }, []);

  return {
    coords,
    resolvedLocation,
    isPermissionGranted,
    isLoading,
    error,
    requestLocationPermission,
  };
}
