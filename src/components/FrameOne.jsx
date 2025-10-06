import React, { useEffect, useRef, useState } from 'react';
import { fetchNeoFeed, fetchNeoDetails } from '../services/nasa';

const parseEpoch = (cadEntry) => {
  if (!cadEntry) return NaN;
  if (cadEntry.epoch_date_close_approach) return Number(cadEntry.epoch_date_close_approach);
  if (cadEntry.close_approach_date_full) {
    const p = Date.parse(cadEntry.close_approach_date_full);
    return Number.isFinite(p) ? p : NaN;
  }
  if (cadEntry.close_approach_date) {
    const p = Date.parse(cadEntry.close_approach_date);
    return Number.isFinite(p) ? p : NaN;
  }
  return NaN;
};

const FrameOne = () => {
  const [asteroids, setAsteroids] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const [_details, setDetails] = useState(null);
  const [closeApproachTime, setCloseApproachTime] = useState(null);
  
  // Cache for asteroid details to prevent duplicate requests
  const detailsCache = useRef(new Map());
  const ongoingRequests = useRef(new Map());



  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchNeoFeed({ days: 1 })
      .then(async (list) => {
        if (!mounted) return;
        const now = Date.now();

        const needsDetails = [];
        const pre = (list || []).map((ast) => {
          const feedCad = Array.isArray(ast.close_approach_data) ? ast.close_approach_data : [];
          const future = feedCad.map(parseEpoch).filter((e) => Number.isFinite(e) && e > now);
          if (future.length > 0) return { ...ast, details: null, nextEpoch: Math.min(...future), estimated: false };
          needsDetails.push(ast);
          return { ...ast, details: null, nextEpoch: null };
        });

        const CONCURRENCY = 4;
        const results = [...pre];
        for (let i = 0; i < needsDetails.length; i += CONCURRENCY) {
          const batch = needsDetails.slice(i, i + CONCURRENCY);
          const batchRes = await Promise.all(
            batch.map(async (ast) => {
              try {
                const d = await fetchNeoDetails(ast.id);
                const detailsCad = Array.isArray(d.close_approach_data) ? d.close_approach_data : [];
                const future = detailsCad.map(parseEpoch).filter((e) => Number.isFinite(e) && e > now);
                if (future.length > 0) return { ...ast, details: d, nextEpoch: Math.min(...future), estimated: false };

                const orbitalPeriodDays = Number(d.orbital_data?.orbital_period);
                const knownEpochs = detailsCad.map(parseEpoch).filter((e) => Number.isFinite(e));
                if (orbitalPeriodDays && knownEpochs.length > 0 && Number.isFinite(orbitalPeriodDays)) {
                  const periodMs = orbitalPeriodDays * 24 * 60 * 60 * 1000;
                  let est = Math.max(...knownEpochs);
                  let iter = 0;
                  while (est <= now && iter < 1000) { est += periodMs; iter += 1; }
                  if (est > now) return { ...ast, details: d, nextEpoch: est, estimated: true };
                }
                return { ...ast, details: d, nextEpoch: null };
              } catch (err) {
                console.warn('fetchNeoDetails failed for', ast.id, err && err.message);
                const feedCad = Array.isArray(ast.close_approach_data) ? ast.close_approach_data : [];
                const future = feedCad.map(parseEpoch).filter((e) => Number.isFinite(e) && e > now);
                if (future.length > 0) return { ...ast, details: null, nextEpoch: Math.min(...future), estimated: false };
                return { ...ast, details: null, nextEpoch: null };
              }
            })
          );
          for (const r of batchRes) {
            const idx = results.findIndex((x) => x.id === r.id);
            if (idx >= 0) results[idx] = r;
          }
        }

        const upcoming = results.filter((a) => a.nextEpoch && a.nextEpoch > now).sort((a, b) => a.nextEpoch - b.nextEpoch);
        setAsteroids(upcoming);
        setIndex(0);
        if (upcoming.length === 0) setError('No upcoming close approaches found or estimatable.');
      })
      .catch((err) => {
        if (!mounted) return;
        const msg = err?.message || String(err);
        console.error('fetchNeoFeed error:', msg);
        setError(msg);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const t = setTimeout(() => {
      if (containerRef.current) requestAnimationFrame(() => containerRef.current.classList.add('visible'));
    }, 50);

    return () => { mounted = false; clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cards = Array.from(document.querySelectorAll('.discover-card'));
    if (!cards || cards.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.18 }
    );

    cards.forEach((c) => observerRef.current.observe(c));
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, []);

  const switchAsteroid = () => {
    if (!asteroids || asteroids.length === 0 || loading) return;
    setIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % asteroids.length;
      return newIndex;
    });
  };

  const asteroid = asteroids[index] || null;

  useEffect(() => {
    let mounted = true;
    setDetails(null);
    setCloseApproachTime(null);
    if (!asteroid) return;

    (async () => {
      try {
        let d = asteroid.details;
        
        // If no details in asteroid object, try to fetch them with caching
        if (!d && asteroid.id) {
          // Check cache first
          if (detailsCache.current.has(asteroid.id)) {
            d = detailsCache.current.get(asteroid.id);
          } else if (ongoingRequests.current.has(asteroid.id)) {
            // Wait for ongoing request
            d = await ongoingRequests.current.get(asteroid.id);
          } else {
            // Start new request
            const requestPromise = fetchNeoDetails(asteroid.id);
            ongoingRequests.current.set(asteroid.id, requestPromise);
            
            try {
              d = await requestPromise;
              detailsCache.current.set(asteroid.id, d);
            } finally {
              ongoingRequests.current.delete(asteroid.id);
            }
          }
        }
        
        if (!mounted) return;
        setDetails(d);

        if (asteroid.nextEpoch) {
          const label = new Date(asteroid.nextEpoch).toLocaleString();
          setCloseApproachTime(label + (asteroid.estimated ? ' (estimated)' : ''));
          return;
        }

        const rawCad = d?.close_approach_data || [];
        const now = Date.now();
        const future = rawCad.map((entry) => ({ entry, epoch: parseEpoch(entry) }))
          .filter((x) => Number.isFinite(x.epoch) && x.epoch > now)
          .sort((a, b) => a.epoch - b.epoch);
        if (future.length > 0) {
          const chosen = future[0];
          setCloseApproachTime(chosen.entry.close_approach_date_full || new Date(chosen.epoch).toLocaleString());
        }
      } catch (err) {
        console.warn('failed to fetch neo details', err);
      }
    })();

    return () => { mounted = false; };
  }, [asteroid]);



  const assessRisk = (ast) => {
    const mag = ast.absolute_magnitude_h || 22;
    const missDist = ast.close_approach_data?.[0]?.miss_distance?.kilometers || 1000000;
    const size = ast.diameter_m || 100;
    const hazard = mag < 20 && missDist < 100000 ? 'High' : mag < 25 && missDist < 500000 ? 'Medium' : 'Low';
    alert(`Hazard Level: ${hazard}\nSize: ${size.toFixed(2)}m\nMiss Distance: ${missDist.toLocaleString()}km`);
  };



  const calculateValue = (ast) => {
    const iron = 0.3;
    const nickel = 0.2;
    const mass = (ast.diameter_m || 100) ** 3 * Math.PI * 4 / 3 * 1000;
    const valuePerKg = 5;
    const totalValue = (iron + nickel) * mass * valuePerKg;
    alert(`Estimated Value: $${totalValue.toLocaleString()} USD (based on ${((iron + nickel) * 100).toFixed(1)}% metal content)`);
  };

  return (
    <div className="sectionContainer" id="discover">
      <div className="fade-in-text" ref={containerRef}>
        {error && <div className="error-message" role="alert">Error: {error}</div>}
        <h3>Discover</h3>
        <section className="discover-showcase" aria-labelledby="discover-heading">
          <div className="discover-grid" style={{gridTemplateColumns: '1fr 1fr', gap: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
            <article className="discover-card" tabIndex={0} style={{ padding: '2rem', minHeight: '400px' }}>
              <figure className="card-visual" aria-hidden="true" style={{ height: '200px', marginBottom: '1.5rem' }}>
                {loading && <div className="placeholder" style={{ fontSize: '1.2rem' }}>Loading…</div>}
                {!loading && asteroid && (
                  <svg width="100%" height="100%" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#23243a"/>
                    <circle cx="240" cy="160" r="100" fill="#ff4444" opacity="0.5"/>
                    <text x="50%" y="50%" fill="#3a7bff" fontFamily="Arial" fontSize="24" textAnchor="middle" dy=".3em">Threat Analyzer</text>
                  </svg>
                )}
                {!loading && !asteroid && <div className="placeholder" style={{ fontSize: '1.2rem' }}>No data</div>}
              </figure>
              <h4 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{asteroid ? asteroid.name : 'Unknown Object'}</h4>
              <p className="card-desc" style={{ fontSize: '1rem', marginBottom: '1rem' }}>
                {asteroid
                  ? `Diameter ≈ ${asteroid.diameter_m ? Math.round(asteroid.diameter_m) + ' m' : 'N/A'} • ${asteroid.relVel_kms ? Number(asteroid.relVel_kms).toFixed(2) + ' km/s' : 'N/A'}`
                  : 'No asteroid data available at the moment.'}
              </p>
              {closeApproachTime ? (
                <p className="card-desc" style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Next close approach: {closeApproachTime}</p>
              ) : (
                <p className="card-desc" style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>No upcoming approach data available</p>
              )}
              <div className="card-actions" style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                <button className="btn" style={{ padding: '0.75rem 1.5rem' }} onClick={() => asteroid && assessRisk(asteroid)} disabled={loading || !asteroid}>Assess Risk</button>
                <button className="btn" style={{ padding: '0.75rem 1.5rem' }} onClick={switchAsteroid} disabled={loading || !asteroid || asteroids.length <= 1}>Next</button>
              </div>
            </article>

            <article className="discover-card" tabIndex={0} style={{ padding: '2rem', minHeight: '400px' }}>
              <figure className="card-visual" style={{ height: '200px', marginBottom: '1.5rem' }}>
                <svg width="100%" height="100%" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100%" height="100%" fill="#23243a"/>
                  <rect x="180" y="100" width="120" height="120" fill="#6bc9ff" opacity="0.5"/>
                  <text x="50%" y="50%" fill="#b2b6c8" fontFamily="Arial" fontSize="24" textAnchor="middle" dy=".3em">Mining Prospects</text>
                </svg>
              </figure>
              <h4 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Asteroid Mining Prospects</h4>
              <p className="card-desc" style={{ fontSize: '1rem', marginBottom: '1rem' }}>Explore valuable asteroids ripe for mining. Discover resources that could fuel future space economies, with insights from real missions.</p>
              <div className="card-actions" style={{ marginTop: 'auto' }}>
                <button className="btn" style={{ padding: '0.75rem 1.5rem' }} onClick={() => asteroid && calculateValue(asteroid)} disabled={loading || !asteroid}>Calculate Value</button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FrameOne;