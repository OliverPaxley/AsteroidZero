// src/pages/ImpactMapPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { fetchNeoFeed, fetchNeoDetails } from '../services/nasa';
import { energyMegatons, radiusKmFromEnergyMt } from '../lib/impact';

// parse possible epoch fields from close_approach_data entries
const parseEpoch = cadEntry => {
  if (!cadEntry) return NaN
  if (cadEntry.epoch_date_close_approach) return Number(cadEntry.epoch_date_close_approach)
  if (cadEntry.close_approach_date_full) {
    const p = Date.parse(cadEntry.close_approach_date_full)
    return Number.isFinite(p) ? p : NaN
  }
  if (cadEntry.close_approach_date) {
    const p = Date.parse(cadEntry.close_approach_date)
    return Number.isFinite(p) ? p : NaN
  }
  return NaN
}

export default function ImpactMapPage() {
  // data state
  const [asteroids, setAsteroids] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(new Set());

  // map refs
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const impactLayerRef = useRef(null); // our circle layer group
  
  // Cache and request management
  const detailsCache = useRef(new Map());
  const ongoingRequests = useRef(new Map());
  // 1) Fetch asteroids — keep only objects with explicit or estimated future approaches
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        if (!mounted) return;
        const raw = await fetchNeoFeed({ days: 1 });
        const now = Date.now()

        // Avoid fetching details for every feed item. First try to resolve using feed's own close_approach_data.
        const needsDetails = []
        const preprocessed = (raw || []).map(a => {
          const feedCad = Array.isArray(a.close_approach_data) ? a.close_approach_data : []
          const future = feedCad.map(parseEpoch).filter(e => Number.isFinite(e) && e > now)
          if (future.length > 0) return { ...a, details: null, nextEpoch: Math.min(...future), estimated: false }
          // mark for details-only fetch
          needsDetails.push(a)
          return { ...a, details: null, nextEpoch: null }
        })

        // cap concurrent fetches to avoid rate limits (small pool)
        const CONCURRENCY = 4
        const enriched = [...preprocessed]
        for (let i = 0; i < needsDetails.length; i += CONCURRENCY) {
          const batch = needsDetails.slice(i, i + CONCURRENCY)
          const results = await Promise.all(batch.map(async a => {
            try {
              const d = await fetchNeoDetails(a.id)
              const detailsCad = Array.isArray(d.close_approach_data) ? d.close_approach_data : []
              const combined = detailsCad
              const future = combined.map(parseEpoch).filter(e => Number.isFinite(e) && e > now)
              if (future.length > 0) return { ...a, details: d, nextEpoch: Math.min(...future), estimated: false }

              // estimate using orbital_period (days)
              const orbitalPeriodDays = Number(d.orbital_data?.orbital_period)
              const knownEpochs = combined.map(parseEpoch).filter(e => Number.isFinite(e))
              if (orbitalPeriodDays && knownEpochs.length > 0 && Number.isFinite(orbitalPeriodDays)) {
                const periodMs = orbitalPeriodDays * 24 * 60 * 60 * 1000
                const latest = Math.max(...knownEpochs)
                let est = latest
                let iter = 0
                while (est <= now && iter < 1000) { est += periodMs; iter += 1 }
                if (est > now) return { ...a, details: d, nextEpoch: est, estimated: true }
              }

              return { ...a, details: d, nextEpoch: null }
            } catch (err) {
              // surface 429 to console for debugging
              console.warn('fetchNeoDetails failed for', a.id, err && err.message)
              return { ...a, details: null, nextEpoch: null }
            }
          }))

          // merge batch results into enriched list
          for (const r of results) {
            const idx = enriched.findIndex(x => x.id === r.id)
            if (idx >= 0) enriched[idx] = r
          }
        }

        const upcoming = enriched
          .filter(x => x.nextEpoch && x.nextEpoch > now)
          .map(a => {
            const E_mt = energyMegatons(a.diameter_m, a.relVel_kms, 3000);
            const radius_km = radiusKmFromEnergyMt(E_mt, 0.012);
            return { ...a, E_mt, radius_km }
          })
          .sort((a, b) => b.E_mt - a.E_mt)
          .slice(0, 12)

        if (mounted) {
          setAsteroids(upcoming)
          setActive(null)
        }
      } catch (e) {
        if (mounted) {
          console.error('NeoWs fetch failed:', e)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Init Leaflet with black page bg but transparent map bg
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [25, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      worldCopyJump: true,
      zoomControl: false,
    });

    // Base tiles (stable)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      detectRetina: true,
      maxZoom: 19,
      keepBuffer: 4,
      crossOrigin: '',
    }).addTo(map);

    // IMPORTANT: map container background should be transparent, not black
    const containerEl = map.getContainer();
    containerEl.style.background = 'transparent';

    // Dedicated overlay pane for the circle (won’t interfere with tiles)
    const pane = map.createPane('impact');
    pane.style.zIndex = 450;               // above tiles, below popups
    pane.style.pointerEvents = 'none';     // overlay never captures mouse
    pane.style.background = 'transparent'; // ensure no bg color
    pane.style.mixBlendMode = 'normal';    // avoid weird blends on dark bg

    impactLayerRef.current = L.layerGroup([], { pane: 'impact' }).addTo(map);

    mapRef.current = map;

    // size fixes
    const fixSize = () => map.invalidateSize();
    setTimeout(fixSize, 0);
    requestAnimationFrame(fixSize);
    window.addEventListener('resize', fixSize);

    return () => {
      window.removeEventListener('resize', fixSize);
      map.remove();
      mapRef.current = null;
      impactLayerRef.current = null;
    };
  }, []);

  // 3) Draw/replace the impact circle and zoom to asteroid location
  useEffect(() => {
    const map = mapRef.current;
    const group = impactLayerRef.current;
    if (!map || !group) return;

    // clear previous circle
    group.clearLayers();

    if (!active) return;

    // Use asteroid's lat/lng if available, else fallback to map center
    const lat = active.lat ?? map.getCenter().lat;
    const lng = active.lng ?? map.getCenter().lng;

    // Zoom and pan to asteroid location. After the move ends, resize map and redraw
    const targetZoom = 6; // zoom level for closeup
    map.flyTo([lat, lng], targetZoom, { duration: 1.0 });

    const redraw = () => {
      // ensure map redraws tiles and internal size
      map.invalidateSize();

      // Scale circle radius based on final zoom level
      const baseRadiusMeters = Math.min(Math.max((active.radius_km || 0) * 1000, 50), 500_000);
      const zoom = map.getZoom();
      const scaleFactor = 1 + (zoom - 2) * 0.7;
      const rMeters = baseRadiusMeters * scaleFactor;

      // Draw impact circle at asteroid location
      L.circle([lat, lng], {
        radius: rMeters,
        pane: 'impact',
        color: '#0ea5e9',
        weight: 2,
        fillColor: '#0ea5e9',
        fillOpacity: 0.15,
        interactive: false,
        bubblingMouseEvents: false,
      }).addTo(group);

      // Draw blue dot at asteroid location sized for current zoom
      L.circleMarker([lat, lng], {
        radius: 6 + (zoom - 2) * 2,
        pane: 'impact',
        weight: 0,
        fillColor: '#0ea5e9',
        fillOpacity: 0.9,
        interactive: false,
        bubblingMouseEvents: false,
      }).addTo(group);
    };

    // If the map is already at/near the target zoom, redraw immediately; otherwise wait for fly animation
    if (Math.abs(map.getZoom() - targetZoom) < 0.1) {
      redraw();
    } else {
      map.once('moveend', () => {
        redraw();
      });
    }
  }, [active]);

  return (
    <div className="impact-page">
      {/* MAP CARD (dark) */}
      <section className="impact-map-card">
        <div ref={mapDivRef} className="impact-map-container" />
      </section>

      {/* LIST CARD (dark) */}
      <aside className="impact-list-card">
        <header className="impact-list-header">
          <h2>{loading ? 'Loading asteroids…' : 'Select an asteroid'}</h2>
          <p>The map shows an estimated impact radius.</p>
        </header>

        {active && !loading && (
          <div className="impact-active-info">
            <div><strong>{active.name}</strong></div>
            <div className="metrics">
              {Math.round(active.diameter_m)} m • {active.relVel_kms.toFixed(2)} km/s
              {' '}• Radius ≈ {active.radius_km.toFixed(2)} km
            </div>
            {active.lat != null && active.lng != null && (
              <div className="coords">
                Approx. ground point: {active.lat.toFixed(4)}°, {active.lng.toFixed(4)}° (prototype)
              </div>
            )}
          </div>
        )}

        {/* make the list area take remaining space and be independently scrollable */}
        <div className="impact-list-scroll">
          <div className="impact-list-grid">
            {!loading && asteroids.map((a) => {
              const isActive = active?.id === a.id;
              return (
                <button
                  key={a.id}
                  disabled={loadingDetails.has(a.id)}
                  onClick={async () => {
                    // Prevent multiple clicks
                    if (loadingDetails.has(a.id)) return;
                    
                    // Set active immediately
                    setActive(a);
                    
                    // Check cache first
                    if (detailsCache.current.has(a.id)) {
                      const cachedDetails = detailsCache.current.get(a.id);
                      const cad = cachedDetails.close_approach_data?.[0];
                      if (cad && cad.epoch_date_close_approach) {
                        const epochMs = parseInt(cad.epoch_date_close_approach, 10);
                        const jd = epochMs / 86400000 + 2440587.5;
                        const T = (jd - 2451545.0) / 36525;
                        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
                        gmst = ((gmst % 360) + 360) % 360;
                        const lon = ((gmst + 180) % 360) - 180;
                        const lat = 0;
                        setActive(prev => ({ ...prev, lat, lng: lon }));
                      }
                      return;
                    }
                    
                    // Check if request is already ongoing
                    if (ongoingRequests.current.has(a.id)) {
                      try {
                        const details = await ongoingRequests.current.get(a.id);
                        const cad = details.close_approach_data?.[0];
                        if (cad && cad.epoch_date_close_approach) {
                          const epochMs = parseInt(cad.epoch_date_close_approach, 10);
                          const jd = epochMs / 86400000 + 2440587.5;
                          const T = (jd - 2451545.0) / 36525;
                          let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
                          gmst = ((gmst % 360) + 360) % 360;
                          const lon = ((gmst + 180) % 360) - 180;
                          const lat = 0;
                          setActive(prev => ({ ...prev, lat, lng: lon }));
                        }
                      } catch (err) {
                        console.warn('failed to fetch neo details from ongoing request', err);
                      }
                      return;
                    }
                    
                    // Start new request
                    setLoadingDetails(prev => new Set([...prev, a.id]));
                    
                    try {
                      const requestPromise = fetchNeoDetails(a.id);
                      ongoingRequests.current.set(a.id, requestPromise);
                      
                      const details = await requestPromise;
                      
                      // Cache the result
                      detailsCache.current.set(a.id, details);
                      
                      // Process coordinates
                      const cad = details.close_approach_data?.[0];
                      if (cad && cad.epoch_date_close_approach) {
                        const epochMs = parseInt(cad.epoch_date_close_approach, 10);
                        const jd = epochMs / 86400000 + 2440587.5;
                        const T = (jd - 2451545.0) / 36525;
                        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000;
                        gmst = ((gmst % 360) + 360) % 360;
                        const lon = ((gmst + 180) % 360) - 180;
                        const lat = 0;
                        setActive(prev => ({ ...prev, lat, lng: lon }));
                      }
                    } catch (err) {
                      console.warn('failed to fetch neo details', err);
                    } finally {
                      setLoadingDetails(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(a.id);
                        return newSet;
                      });
                      ongoingRequests.current.delete(a.id);
                    }
                  }}
                title="Set active asteroid"
                className={`asteroid-button ${isActive ? 'asteroid-button--active' : ''}`}
              >
                <span style={{ fontWeight: 600 }}>{a.name}</span>
                <span
                  style={{
                    fontSize: '.85rem',
                    padding: '2px 8px',
                    borderRadius: 999,
                    border: '1px solid #1b2a3a',
                    background: '#0b1520',
                    color: '#cbd5e1',
                  }}
                >
                  {Math.round(a.diameter_m)} m
                </span>
              </button>
            );
          })}
          </div>
        </div>
      </aside>
    </div>
  );
}
