/**
 * Haversine distance in kilometers between two lat/lon points.
 * Accurate for short distances (< 500 km).
 */
export function haversineKm(a, b) {
  const R = 6371 // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Road distance approximation: straight-line × 1.3 (accounts for curves).
 * For precise routing, use OSRM or Google Maps Directions API.
 */
export function roadKm(a, b) {
  return haversineKm(a, b) * 1.3
}

/**
 * Travel time estimate in minutes, assuming:
 * - City: 25 km/h avg (traffic)
 * - Highway: 60 km/h avg
 */
export function travelMinutes(km, mode = 'city') {
  const speed = mode === 'highway' ? 60 : 25
  return Math.round((km / speed) * 60)
}

/**
 * Fair meeting point: geographic center (average lat, average lon) of all participant locations.
 * Used for movie/dinner/short plans where everyone meets at one spot.
 */
export function meetingPoint(locations = []) {
  const valid = locations.filter((p) => p && p.lat && p.lon)
  if (!valid.length) return null
  const avgLat = valid.reduce((sum, p) => sum + p.lat, 0) / valid.length
  const avgLon = valid.reduce((sum, p) => sum + p.lon, 0) / valid.length
  return { lat: avgLat, lon: avgLon }
}

/**
 * Sort places by distance from a reference point, nearest first.
 */
export function sortByDistance(places, ref) {
  if (!ref || !ref.lat || !ref.lon) return places
  return places
    .map((p) => ({
      ...p,
      distance_km: p.lat && p.lon ? haversineKm(ref, { lat: p.lat, lon: p.lon }) : 9999,
    }))
    .sort((a, b) => a.distance_km - b.distance_km)
}

/**
 * Bounding box for a given center + radius (km).
 * Returns { minLat, maxLat, minLon, maxLon } for Overpass queries.
 */
export function boundingBox(center, radiusKm) {
  const latPerKm = 1 / 110.574
  const lonPerKm = 1 / (111.32 * Math.cos((center.lat * Math.PI) / 180))
  return {
    minLat: center.lat - radiusKm * latPerKm,
    maxLat: center.lat + radiusKm * latPerKm,
    minLon: center.lon - radiusKm * lonPerKm,
    maxLon: center.lon + radiusKm * lonPerKm,
  }
}
