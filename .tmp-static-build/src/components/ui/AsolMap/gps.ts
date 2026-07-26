import type { AsolMapLocation, GpsProvider } from './types';

type NativePosition = { coords: { latitude: number; longitude: number; accuracy: number; heading?: number | null; speed?: number | null }; timestamp: number };
type NativeBridge = { getCurrentPosition(options?: PositionOptions): Promise<NativePosition>; watchPosition?(options: PositionOptions, callback: (position: NativePosition | null, error?: unknown) => void): Promise<string>; clearWatch?(options: { id: string }): Promise<void> };

const toLocation = (position: NativePosition, source: AsolMapLocation['source']): AsolMapLocation => ({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, heading: position.coords.heading ?? null, speed: position.coords.speed ?? null, timestamp: position.timestamp, source });

export function createBrowserGpsProvider(): GpsProvider {
  return {
    id: 'browser', isAvailable: () => typeof navigator !== 'undefined' && 'geolocation' in navigator,
    getCurrentPosition: (options) => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition((p) => resolve(toLocation(p, 'browser')), reject, options)),
    watchPosition: (onLocation, onError, options) => { const id = navigator.geolocation.watchPosition((p) => onLocation(toLocation(p, 'browser')), onError, options); return () => navigator.geolocation.clearWatch(id); },
  };
}

export function createAdaptiveGpsProvider(nativeBridge?: NativeBridge): GpsProvider {
  const browser = createBrowserGpsProvider();
  if (!nativeBridge) return browser;
  return {
    id: 'adaptive', isAvailable: () => true,
    getCurrentPosition: async (options) => toLocation(await nativeBridge.getCurrentPosition(options), 'capacitor'),
    watchPosition: nativeBridge.watchPosition ? async (onLocation, onError, options = {}) => {
      const id = await nativeBridge.watchPosition!(options, (position, error) => position ? onLocation(toLocation(position, 'capacitor')) : onError(error));
      return () => { void nativeBridge.clearWatch?.({ id }); };
    } : undefined,
  };
}
