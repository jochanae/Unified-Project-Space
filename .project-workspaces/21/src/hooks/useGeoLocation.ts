/**
 * useGeoLocation — Address-Based Location Detection
 * 
 * Detects location changes using coordinate-based matching:
 * - Home: Within 5km of saved home coordinates
 * - Work: Within 5km of saved work coordinates  
 * - Destination: Everything else (creates stamps with photo option)
 * 
 * Perfect for flight attendants and suburban users where GPS 
 * may not accurately resolve city names.
 */
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const GEO_STORAGE_KEY = 'compani-last-city';
const GEO_COORDS_KEY = 'compani-last-coords';
const GEO_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
const GEO_MIGRATION_KEY = 'compani-geo-v2-migrated';

// One-time cleanup of old cached geo data so the new coordinate system starts fresh
if (!localStorage.getItem(GEO_MIGRATION_KEY)) {
  localStorage.removeItem(GEO_STORAGE_KEY);
  localStorage.removeItem(GEO_COORDS_KEY);
  localStorage.setItem(GEO_MIGRATION_KEY, '1');
  logger.log('[GeoLocation] Migrated to v2 — cleared old cache');
}

interface GeoCity {
  city: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}

export interface ProfileLocation {
  homeCity?: string;
  homeLat?: number;
  homeLon?: number;
  workCity?: string;
  workLat?: number;
  workLon?: number;
}

async function reverseGeocode(lat: number, lon: number): Promise<GeoCity | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'CompaniApp/1.0' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const addr = data.address || {};
    return {
      city: addr.city || addr.town || addr.village || addr.municipality || 'Unknown',
      region: addr.state || addr.county || '',
      country: addr.country_code?.toUpperCase() || 'US',
      lat,
      lon,
    };
  } catch (e) {
    logger.warn('[GeoLocation] Reverse geocode failed:', e);
    return null;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Haversine formula for distance in kilometers
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function classifyLocationByCoordinates(
  lat: number,
  lon: number,
  profileLocation: ProfileLocation
): 'home' | 'work' | 'destination' {
  const HOME_RADIUS_KM = 5; // 5km radius for home
  const WORK_RADIUS_KM = 5; // 5km radius for work

  // Check if within home radius
  if (profileLocation.homeLat != null && profileLocation.homeLon != null) {
    const distanceFromHome = calculateDistance(
      lat,
      lon,
      profileLocation.homeLat,
      profileLocation.homeLon
    );
    if (distanceFromHome <= HOME_RADIUS_KM) {
      logger.log(`[GeoLocation] Within ${distanceFromHome.toFixed(1)}km of home`);
      return 'home';
    }
  }

  // Check if within work radius
  if (profileLocation.workLat != null && profileLocation.workLon != null) {
    const distanceFromWork = calculateDistance(
      lat,
      lon,
      profileLocation.workLat,
      profileLocation.workLon
    );
    if (distanceFromWork <= WORK_RADIUS_KM) {
      logger.log(`[GeoLocation] Within ${distanceFromWork.toFixed(1)}km of work`);
      return 'work';
    }
  }

  // Everything else is a destination
  return 'destination';
}

function resolveStampedGeo(
  geo: GeoCity,
  locationType: 'home' | 'work' | 'destination',
  profileLocation: ProfileLocation
): GeoCity {
  if (geo.city !== 'Unknown') return geo;

  if (locationType === 'home' && profileLocation.homeCity) {
    return { ...geo, city: profileLocation.homeCity };
  }

  if (locationType === 'work' && profileLocation.workCity) {
    return { ...geo, city: profileLocation.workCity };
  }

  return geo;
}

export function useGeoLocation(
  userId: string | undefined,
  companionName?: string,
  profileLocation?: ProfileLocation
) {
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkLocation = useCallback(async () => {
    if (!userId || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (!geo) return;

        // Classify location based on coordinates
        const locationType = classifyLocationByCoordinates(
          geo.lat,
          geo.lon,
          profileLocation || {}
        );
        const stampedGeo = resolveStampedGeo(geo, locationType, profileLocation || {});

        // For home/work: Check if we should skip (to prevent spam)
        if (locationType === 'home' || locationType === 'work') {
          const lastCoords = localStorage.getItem(GEO_COORDS_KEY);
          
          if (lastCoords) {
            try {
              const [lastLat, lastLon] = lastCoords.split(',').map(Number);
               const distance = calculateDistance(lastLat, lastLon, stampedGeo.lat, stampedGeo.lon);
              
              // If within 5km of last stamp and it's home/work, skip
              if (distance < 5) {
                logger.log(`[GeoLocation] Still at ${locationType}, skipping stamp`);
                return;
              }
            } catch (e) {
              // Invalid coords, continue
            }
          }
        }

        // For destinations: Only create stamp if city name changed OR moved >5km
        if (locationType === 'destination') {
          // Skip if city is "Unknown" for destinations
          if (stampedGeo.city === 'Unknown') {
            logger.log('[GeoLocation] Skipping Unknown destination');
            return;
          }

          const lastCity = localStorage.getItem(GEO_STORAGE_KEY);
          const lastCoords = localStorage.getItem(GEO_COORDS_KEY);
          const currentKey = `${stampedGeo.city}|${stampedGeo.country}`;

          // Check if same city name
          if (lastCity === currentKey) {
            logger.log('[GeoLocation] Same destination city, skipping');
            return;
          }

          // Check distance from last stamp
          if (lastCoords) {
            try {
              const [lastLat, lastLon] = lastCoords.split(',').map(Number);
               const distance = calculateDistance(lastLat, lastLon, stampedGeo.lat, stampedGeo.lon);
              
              if (distance < 5) {
                logger.log(`[GeoLocation] Within 5km of last stamp (${distance.toFixed(1)}km), skipping`);
                return;
              }
            } catch (e) {
              // Invalid coords, continue
            }
          }
        }

        // New location detected — inscribe travel log entry
        const currentKey = `${stampedGeo.city}|${stampedGeo.country}`;
        localStorage.setItem(GEO_STORAGE_KEY, currentKey);
        localStorage.setItem(GEO_COORDS_KEY, `${stampedGeo.lat},${stampedGeo.lon}`);

        const notePrefix = locationType === 'home'
          ? '🏠 Home base'
          : locationType === 'work'
          ? '✈️ Work location'
          : '📍 Destination';

        const { error } = await supabase.from('travel_log').insert({
          user_id: userId,
          city_name: stampedGeo.city,
          region: stampedGeo.region || null,
          country: stampedGeo.country,
          latitude: stampedGeo.lat,
          longitude: stampedGeo.lon,
          companion_name: companionName || null,
          mode_used: locationType,
          note: `${notePrefix} — auto-inscribed`,
        });

        if (error) {
          logger.warn('[GeoLocation] Failed to inscribe:', error);
          return;
        }

        logger.log(`[GeoLocation] Inscribed: ${stampedGeo.city} (${locationType})`);

        // Dispatch custom event for PassportStamp to pick up
        window.dispatchEvent(
          new CustomEvent('compani:city-change', {
            detail: {
                cityName: stampedGeo.city,
                region: stampedGeo.region,
                country: stampedGeo.country,
              companionName: companionName || undefined,
              locationType,
              date: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
            },
          })
        );
      },
      (err) => {
        // Permission denied or unavailable — fail silently
        logger.log('[GeoLocation] Position unavailable:', err.message);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 }
    );
  }, [userId, companionName, profileLocation]);

  useEffect(() => {
    // Initial check on mount
    const timer = setTimeout(checkLocation, 3000); // slight delay after page load
    intervalRef.current = setInterval(checkLocation, GEO_CHECK_INTERVAL);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalRef.current);
    };
  }, [checkLocation]);
}