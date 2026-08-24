export function googleMapsSearchUrl(latitude: number, longitude: number): string;
export function googleMapsSearchUrl(query: string): string;
export function googleMapsSearchUrl(
  latitudeOrQuery: number | string,
  longitude?: number,
) {
  const query =
    typeof latitudeOrQuery === "number"
      ? `${latitudeOrQuery},${longitude}`
      : latitudeOrQuery.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

export function geoLocationUrl(latitude: number, longitude: number) {
  return `geo:${latitude},${longitude}`;
}

export function openDeviceMaps(latitude: number, longitude: number) {
  const encoded = encodeURIComponent(`${latitude},${longitude}`);
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    window.location.href = `maps://maps.apple.com/?q=${encoded}&ll=${encoded}`;
    return;
  }
  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = `${geoLocationUrl(latitude, longitude)}?q=${encoded}`;
    return;
  }
  window.open(googleMapsSearchUrl(latitude, longitude), "_blank", "noopener,noreferrer");
}
