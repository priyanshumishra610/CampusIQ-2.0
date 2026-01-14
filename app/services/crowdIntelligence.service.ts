/**
 * 🔒 Crowd Intelligence Service
 * 
 * STATUS: DISABLED - Backend API not yet implemented
 * 
 * Privacy-first location pinging for crowd heatmap generation.
 * 
 * Security Features (when implemented):
 * - Anonymous location pings (no PII)
 * - Coarse location only (geohash-based, ~150m accuracy)
 * - Rate-limited (60 pings/hour)
 * - Aggregated server-side (minimum 3 devices per cell)
 * 
 * To enable this feature:
 * 1. Implement backend /api/crowd-intelligence/ping endpoint
 * 2. Implement backend /api/crowd-intelligence/heatmap endpoint
 * 3. Update this service to call the backend APIs
 */

import apiClient from './api.client';
import {getCurrentLocation} from './maps.service';

let locationTrackingInterval: NodeJS.Timeout | null = null;
const PING_INTERVAL_MS = 60 * 1000; // 1 minute between pings

/**
 * Submit an anonymous location ping
 * 
 * Privacy: Location is geohashed server-side, no exact coordinates stored
 */
export const submitLocationPing = async (): Promise<boolean> => {
  // Feature is disabled - fail explicitly
  console.warn('[CrowdIntelligence] Feature disabled - backend API not implemented');
  return false;
};

/**
 * Start periodic location tracking
 * 
 * Note: This should be called when user opens the app
 * and has granted location permissions.
 */
export const startLocationTracking = (): void => {
  if (locationTrackingInterval) {
    console.warn('[CrowdIntelligence] Location tracking already started');
    return;
  }
  
  // Submit initial ping
  submitLocationPing();
  
  // Set up periodic pings
  locationTrackingInterval = setInterval(() => {
    submitLocationPing();
  }, PING_INTERVAL_MS);
  
  console.log('[CrowdIntelligence] Location tracking started');
};

/**
 * Stop periodic location tracking
 */
export const stopLocationTracking = (): void => {
  if (locationTrackingInterval) {
    clearInterval(locationTrackingInterval);
    locationTrackingInterval = null;
    console.log('[CrowdIntelligence] Location tracking stopped');
  }
};

/**
 * Get heatmap data for admin dashboard
 * 
 * @param timeWindow - '15min' | '1hr' | 'today'
 */
export const getHeatmapData = async (
  timeWindow: '15min' | '1hr' | 'today' = '15min'
): Promise<{
  cells: Array<{
    geohash: string;
    lat: number;
    lng: number;
    count: number;
    lastUpdated: any;
  }>;
  timestamp: number;
  degraded: boolean;
  error?: string;
}> => {
  // Feature is disabled - return degraded state
  const error = 'Crowd Intelligence feature is not yet implemented. Backend API required.';
  console.warn('[CrowdIntelligence] Feature disabled:', error);
  return {
    cells: [],
    timestamp: Date.now(),
    degraded: true,
    error,
  };
};
