// Edge Function: places
// Fetches real place data from OpenStreetMap (Nominatim + Overpass) and Open-Meteo weather.
// Caches results in place_cache table to avoid hitting rate limits.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USER_AGENT = 'ChaloPlan/1.0 (HackOnVibe Nov 2026)'

interface PlacesInput {
  place: string
  mode: 'trip' | 'short'
  lat?: number
  lon?: number
}

// Geocode a place name to lat/lon using Nominatim
async function geocode(placeName: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`
  
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) return null

  const results = await response.json()
  if (!results || results.length === 0) return null

  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
  }
}

// Haversine distance in km
function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Fetch places from Overpass API
async function fetchOverpass(lat: number, lon: number, mode: 'trip' | 'short'): Promise<any[]> {
  const radiusStay = mode === 'trip' ? 5000 : 2000
  const radiusFood = mode === 'trip' ? 2000 : 1000
  const radiusAttraction = mode === 'trip' ? 15000 : 5000

  const query = `
[out:json][timeout:25];
(
  nwr["tourism"~"hotel|hostel|guest_house|apartment"](around:${radiusStay},${lat},${lon});
  nwr["amenity"~"restaurant|cafe|fast_food"](around:${radiusFood},${lat},${lon});
  nwr["tourism"~"attraction|viewpoint|museum|gallery"](around:${radiusAttraction},${lat},${lon});
  nwr["historic"](around:${radiusAttraction},${lat},${lon});
  nwr["leisure"~"park|garden"](around:${radiusAttraction},${lat},${lon});
  nwr["natural"~"peak|waterfall|beach"](around:${radiusAttraction},${lat},${lon});
  nwr["amenity"~"hospital|police"](around:10000,${lat},${lon});
);
out center 300;
`

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) {
    throw new Error(`Overpass API failed: ${response.status}`)
  }

  const result = await response.json()
  return result.elements || []
}

// Categorize Overpass elements
function categorize(elements: any[], center: { lat: number; lon: number }) {
  const stays: any[] = []
  const food: any[] = []
  const places: any[] = []
  const safety: any[] = []

  elements.forEach((el) => {
    const tags = el.tags || {}
    const elLat = el.lat || el.center?.lat
    const elLon = el.lon || el.center?.lon
    if (!elLat || !elLon) return

    const distance = haversine(center, { lat: elLat, lon: elLon })
    const name = tags.name || tags['name:en'] || 'Unnamed'

    const item = {
      name,
      lat: elLat,
      lon: elLon,
      distance_km: Math.round(distance * 10) / 10,
      tags,
    }

    if (tags.tourism === 'hotel' || tags.tourism === 'hostel' || tags.tourism === 'guest_house' || tags.tourism === 'apartment') {
      stays.push({ ...item, type: tags.tourism })
    } else if (tags.amenity === 'restaurant' || tags.amenity === 'cafe' || tags.amenity === 'fast_food') {
      food.push({ ...item, type: tags.amenity, cuisine: tags.cuisine })
    } else if (tags.tourism || tags.historic || tags.leisure || tags.natural) {
      places.push({ ...item, type: tags.tourism || tags.historic || tags.leisure || tags.natural })
    } else if (tags.amenity === 'hospital' || tags.amenity === 'police') {
      safety.push({ ...item, type: tags.amenity })
    }
  })

  // Sort by distance and limit
  stays.sort((a, b) => a.distance_km - b.distance_km)
  food.sort((a, b) => a.distance_km - b.distance_km)
  places.sort((a, b) => a.distance_km - b.distance_km)
  safety.sort((a, b) => a.distance_km - b.distance_km)

  return {
    stays: stays.slice(0, mode === 'trip' ? 12 : 5),
    food: food.slice(0, mode === 'trip' ? 15 : 8),
    places: places.slice(0, mode === 'trip' ? 20 : 10),
    hospital: safety.find((s) => s.type === 'hospital') || null,
    police: safety.find((s) => s.type === 'police') || null,
  }
}

// Fetch weather from Open-Meteo
async function fetchWeather(lat: number, lon: number): Promise<any> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`
  
  const response = await fetch(url)
  if (!response.ok) return null

  const data = await response.json()
  return data.daily || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const input: PlacesInput = await req.json()
    const { place, mode, lat: inputLat, lon: inputLon } = input

    // Cache key
    const cacheKey = mode === 'short' && inputLat && inputLon
      ? `short:${inputLat.toFixed(2)},${inputLon.toFixed(2)}`
      : `trip:${place.toLowerCase()}`

    // Check cache first
    const { data: cached } = await supabase
      .from('place_cache')
      .select('data')
      .eq('key', cacheKey)
      .maybeSingle()

    if (cached && cached.data) {
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Geocode if needed
    let center = inputLat && inputLon ? { lat: inputLat, lon: inputLon } : null
    if (!center) {
      center = await geocode(place)
      if (!center) {
        return new Response(
          JSON.stringify({ error: `Could not geocode: ${place}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fetch data in parallel
    const [elements, weather] = await Promise.all([
      fetchOverpass(center.lat, center.lon, mode),
      fetchWeather(center.lat, center.lon),
    ])

    const categorized = categorize(elements, center, mode as any)

    const result = {
      center,
      ...categorized,
      weather,
    }

    // Save to cache
    await supabase
      .from('place_cache')
      .upsert({ key: cacheKey, data: result }, { onConflict: 'key' })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Places function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Places function failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
