// src/services/nasa.js
const API = 'https://api.nasa.gov';
const KEY = import.meta.env.VITE_NASA_KEY || 'cymcV7cL6T24TchfTEhlE5xSjXOAvbmasVFNfNBI';

// converts a date to yyyy-mm-dd
const formatDate = (d) => d.toISOString().split('T')[0];

// fetch asteroid data from NASA NeoWs
export async function fetchNeoFeed({ start = new Date(), days = 1 } = {}) {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  const url = `${API}/neo/rest/v1/feed?start_date=${formatDate(start)}&end_date=${formatDate(end)}&api_key=${KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    // provide a clearer message for common rate-limit status
    if (res.status === 429) throw new Error(`NeoWs error 429: rate limit exceeded`);
    throw new Error(`NeoWs error ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  // flatten + normalize
  return Object.values(data.near_earth_objects)
    .flat()
    .map((a) => {
      const d = a.estimated_diameter.meters;
      const v = a?.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second;
      const relVel_kms = v ? parseFloat(v) : 0;
      return {
        id: a.id,
        name: a.name,
        diameter_m: (d.estimated_diameter_min + d.estimated_diameter_max) / 2,
        relVel_kms,
      };
    })
    .filter(x => x.relVel_kms > 0);
}

// fetch detailed NEO object by id (includes orbital_data and close_approach_data)
export async function fetchNeoDetails(id) {
  if (!id) throw new Error('missing neo id');
  const url = `${API}/neo/rest/v1/neo/${encodeURIComponent(id)}?api_key=${KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NeoWs lookup error ${res.status}`);
  const data = await res.json();
  return data;
}
