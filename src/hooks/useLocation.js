import { useState, useEffect, useCallback } from 'react';
import {
  detectLocation,
  clearLocationCache,
  saveLocationPreference
} from '../services/locationService';

/**
 * Custom hook for managing user location detection and state
 * @returns {{
 *   location: {countryCode: string, countryName: string, region: string, regionCode: string, latitude: number | null, longitude: number | null} | null,
 *   loading: boolean,
 *   error: string | null,
 *   source: 'geolocation' | 'cache' | 'preference' | 'default' | null,
 *   refresh: () => Promise<void>,
 *   setManualLocation: (countryCode: string, regionCode?: string, countryName?: string, region?: string, latitude?: number | null, longitude?: number | null) => void
 * }}
 */
export function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null);

  const loadLocation = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      if (forceRefresh) {
        clearLocationCache();
      }
      const result = await detectLocation();
      setLocation({
        countryCode: result.countryCode,
        countryName: result.countryName,
        region: result.region,
        regionCode: result.regionCode,
        latitude: result.latitude,
        longitude: result.longitude
      });
      setSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect location');
      // Set default location on error
      setLocation({
        countryCode: 'US',
        countryName: 'United States',
        region: '',
        regionCode: '',
        latitude: 37.0902,
        longitude: -95.7129
      });
      setSource('default');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  const refresh = useCallback(async () => {
    await loadLocation(true);
  }, [loadLocation]);

  const setManualLocation = useCallback((countryCode, regionCode = '', countryName = '', region = '', latitude = null, longitude = null) => {
    saveLocationPreference({ countryCode, regionCode, countryName, region, latitude, longitude });
    setLocation((prev) => ({
      ...prev,
      countryCode,
      regionCode,
      countryName: countryName || prev?.countryName || '',
      region: region || prev?.region || '',
      latitude: Number.isFinite(latitude) ? latitude : prev?.latitude ?? null,
      longitude: Number.isFinite(longitude) ? longitude : prev?.longitude ?? null
    }));
    setSource('preference');
  }, []);

  return {
    location,
    loading,
    error,
    source,
    refresh,
    setManualLocation
  };
}
