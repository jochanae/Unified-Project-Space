/**
 * LocationSettings Component
 * 
 * Allows users to set home and work addresses for accurate location detection.
 * Geocodes addresses to coordinates and saves them to the profile.
 * Includes live address autocomplete via Nominatim.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { MapPin, Home, Briefcase, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LocationSettingsUpdate {
  homeAddress?: string;
  homeCity?: string;
  homeLat?: number;
  homeLon?: number;
  workAddress?: string;
  workHubCity?: string;
  workLat?: number;
  workLon?: number;
}

interface LocationSettingsProps {
  userId: string;
  currentHomeAddress?: string;
  currentWorkAddress?: string;
  homeLat?: number;
  homeLon?: number;
  workLat?: number;
  workLon?: number;
  onUpdate: (updates: LocationSettingsUpdate) => void;
}

interface GeocodedLocation {
  lat: number;
  lon: number;
  displayName: string;
  city?: string;
  region?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    hamlet?: string;
    state?: string;
    county?: string;
  };
}

async function geocodeAddress(address: string): Promise<GeocodedLocation | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': 'CompaniApp/1.0' } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data || data.length === 0) return null;
    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || result.address?.municipality || result.address?.hamlet || undefined,
      region: result.address?.state || result.address?.county || undefined,
    };
  } catch (e) {
    logger.warn('[LocationSettings] Geocoding failed:', e);
    return null;
  }
}

async function searchAddresses(query: string): Promise<NominatimResult[]> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=us`,
      { headers: { 'User-Agent': 'CompaniApp/1.0' } }
    );
    if (!resp.ok) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── AddressInput with autocomplete ── */
function AddressInput({
  icon: Icon,
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  onSave,
  onClear,
  loading,
  status,
  savedAddress,
  hasSaved,
}: {
  icon: typeof Home;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (result: NominatimResult) => void;
  onSave: () => void;
  onClear: () => void;
  loading: boolean;
  status: 'idle' | 'success' | 'error';
  savedAddress?: string;
  hasSaved: boolean;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounce(value, 400);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions on debounced input
  useEffect(() => {
    if (debouncedQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchAddresses(debouncedQuery.trim()).then((results) => {
      if (!cancelled) {
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSearching(false);
      }
    });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <label className="text-xs font-medium text-foreground">{label}</label>
      </div>

      <div ref={wrapperRef} className="relative">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            className="flex-1 text-sm"
            disabled={loading}
          />
          <Button
            onClick={onSave}
            disabled={loading || !value.trim()}
            size="sm"
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              'Save'
            )}
          </Button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border/50 bg-card shadow-xl max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={`${s.lat}-${s.lon}-${i}`}
                onClick={() => {
                  onSelect(s);
                  setShowSuggestions(false);
                  setSuggestions([]);
                }}
                className="w-full text-left px-3 py-2.5 text-xs text-foreground/80 hover:bg-primary/10 border-b border-border/20 last:border-0 transition-colors"
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}

        {/* Searching indicator */}
        {searching && value.trim().length >= 3 && (
          <div className="absolute right-14 top-2.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/40" />
          </div>
        )}
      </div>

      {hasSaved && (
        <div className="flex items-center justify-between p-2 rounded bg-muted/50">
          <p className="text-xs text-muted-foreground">
            Saved: {savedAddress || 'Location set'}
          </p>
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default function LocationSettings({
  userId,
  currentHomeAddress,
  currentWorkAddress,
  homeLat,
  homeLon,
  workLat,
  workLon,
  onUpdate,
}: LocationSettingsProps) {
  const [homeInput, setHomeInput] = useState(currentHomeAddress || '');
  const [workInput, setWorkInput] = useState(currentWorkAddress || '');
  const [homeLoading, setHomeLoading] = useState(false);
  const [workLoading, setWorkLoading] = useState(false);
  const [homeStatus, setHomeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [workStatus, setWorkStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Track if user picked from suggestions (pre-geocoded)
  const homeGeoRef = useRef<GeocodedLocation | null>(null);
  const workGeoRef = useRef<GeocodedLocation | null>(null);

  useEffect(() => { setHomeInput(currentHomeAddress || ''); }, [currentHomeAddress]);
  useEffect(() => { setWorkInput(currentWorkAddress || ''); }, [currentWorkAddress]);

  const saveLocation = useCallback(async (
    type: 'home' | 'work',
    address: string,
    preGeo: GeocodedLocation | null,
  ) => {
    const setLoading = type === 'home' ? setHomeLoading : setWorkLoading;
    const setStatus = type === 'home' ? setHomeStatus : setWorkStatus;

    setLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const location = preGeo || await geocodeAddress(address);
      if (!location) {
        setErrorMessage('Could not find this address. Try selecting a suggestion from the dropdown, or be more specific.');
        setStatus('error');
        setLoading(false);
        return;
      }

      const dbFields = type === 'home'
        ? { home_address: address, home_city: location.city ?? null, home_lat: location.lat, home_lon: location.lon }
        : { work_address: address, work_hub_city: location.city ?? null, work_lat: location.lat, work_lon: location.lon };

      const { error } = await supabase.from('profiles').update(dbFields as any).eq('user_id', userId);
      if (error) throw error;

      setStatus('success');
      const updates = type === 'home'
        ? { homeAddress: address, homeCity: location.city, homeLat: location.lat, homeLon: location.lon }
        : { workAddress: address, workHubCity: location.city, workLat: location.lat, workLon: location.lon };
      onUpdate(updates);
      logger.log(`[LocationSettings] ${type} saved: ${location.lat}, ${location.lon}`);
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      logger.error(`[LocationSettings] Failed to save ${type}:`, error);
      setErrorMessage(`Failed to save ${type} address. Please try again.`);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [userId, onUpdate]);

  const clearLocation = useCallback(async (type: 'home' | 'work') => {
    try {
      const dbFields = type === 'home'
        ? { home_address: null, home_city: null, home_lat: null, home_lon: null }
        : { work_address: null, work_hub_city: null, work_lat: null, work_lon: null };

      const { error } = await supabase.from('profiles').update(dbFields as any).eq('user_id', userId);
      if (error) throw error;

      if (type === 'home') {
        setHomeInput('');
        setHomeStatus('idle');
        homeGeoRef.current = null;
        onUpdate({ homeAddress: undefined, homeCity: undefined, homeLat: undefined, homeLon: undefined });
      } else {
        setWorkInput('');
        setWorkStatus('idle');
        workGeoRef.current = null;
        onUpdate({ workAddress: undefined, workHubCity: undefined, workLat: undefined, workLon: undefined });
      }
    } catch (error) {
      logger.error(`[LocationSettings] Failed to clear ${type}:`, error);
    }
  }, [userId, onUpdate]);

  const handleHomeSelect = useCallback((result: NominatimResult) => {
    setHomeInput(result.display_name);
    homeGeoRef.current = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || result.address?.municipality || result.address?.hamlet || undefined,
    };
  }, []);

  const handleWorkSelect = useCallback((result: NominatimResult) => {
    setWorkInput(result.display_name);
    workGeoRef.current = {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      displayName: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || result.address?.municipality || result.address?.hamlet || undefined,
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-primary mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-foreground">Location Settings</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Set your home and work addresses for accurate passport stamp detection. 
            Start typing and select from the suggestions.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      )}

      {/* Home Address */}
      <AddressInput
        icon={Home}
        label="Home Address"
        placeholder="Start typing your address…"
        value={homeInput}
        onChange={(v) => { setHomeInput(v); homeGeoRef.current = null; }}
        onSelect={handleHomeSelect}
        onSave={() => saveLocation('home', homeInput.trim(), homeGeoRef.current)}
        onClear={() => clearLocation('home')}
        loading={homeLoading}
        status={homeStatus}
        savedAddress={currentHomeAddress}
        hasSaved={!!(homeLat && homeLon)}
      />

      {/* Work Address */}
      <AddressInput
        icon={Briefcase}
        label="Work Address"
        placeholder="Start typing your work address…"
        value={workInput}
        onChange={(v) => { setWorkInput(v); workGeoRef.current = null; }}
        onSelect={handleWorkSelect}
        onSave={() => saveLocation('work', workInput.trim(), workGeoRef.current)}
        onClear={() => clearLocation('work')}
        loading={workLoading}
        status={workStatus}
        savedAddress={currentWorkAddress}
        hasSaved={!!(workLat && workLon)}
      />

      {/* How It Works */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">How it works:</span> When you're within 5km of your saved home or work location, 
          passport stamps will be classified correctly — even if GPS shows "Unknown." 
        </p>
      </div>
    </div>
  );
}
