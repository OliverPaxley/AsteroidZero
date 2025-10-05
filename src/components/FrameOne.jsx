import React, { useEffect, useRef, useState } from 'react'
import { fetchNeoFeed, fetchNeoDetails } from '../services/nasa'
import AsteroidArt from './AsteroidArt'

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

const FrameOne = () => {
  const [asteroids, setAsteroids] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const containerRef = useRef(null)
  const observerRef = useRef(null)

  const [_details, setDetails] = useState(null)
  const [closeApproachTime, setCloseApproachTime] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    fetchNeoFeed({ days: 1 })
      .then(async list => {
        if (!mounted) return
        const now = Date.now()

        // Use feed's close_approach_data first and only fetch details for items that lack future approach info.
        const needsDetails = []
        const pre = (list || []).map(ast => {
          const feedCad = Array.isArray(ast.close_approach_data) ? ast.close_approach_data : []
          const future = feedCad.map(parseEpoch).filter(e => Number.isFinite(e) && e > now)
          if (future.length > 0) return { ...ast, details: null, nextEpoch: Math.min(...future), estimated: false }
          needsDetails.push(ast)
          return { ...ast, details: null, nextEpoch: null }
        })

        // cap concurrent detail fetches
        const CONCURRENCY = 4
        const results = [...pre]
        for (let i = 0; i < needsDetails.length; i += CONCURRENCY) {
          const batch = needsDetails.slice(i, i + CONCURRENCY)
          const batchRes = await Promise.all(batch.map(async ast => {
            try {
              const d = await fetchNeoDetails(ast.id)
              const detailsCad = Array.isArray(d.close_approach_data) ? d.close_approach_data : []
              const combined = detailsCad
              const future = combined.map(parseEpoch).filter(e => Number.isFinite(e) && e > now)
              if (future.length > 0) return { ...ast, details: d, nextEpoch: Math.min(...future), estimated: false }

              const orbitalPeriodDays = Number(d.orbital_data?.orbital_period)
              const knownEpochs = combined.map(parseEpoch).filter(e => Number.isFinite(e))
              if (orbitalPeriodDays && knownEpochs.length > 0 && Number.isFinite(orbitalPeriodDays)) {
                const periodMs = orbitalPeriodDays * 24 * 60 * 60 * 1000
                const latest = Math.max(...knownEpochs)
                let est = latest
                let iter = 0
                while (est <= now && iter < 1000) { est += periodMs; iter += 1 }
                if (est > now) return { ...ast, details: d, nextEpoch: est, estimated: true }
              }

              return { ...ast, details: d, nextEpoch: null }
            } catch (err) {
              console.warn('fetchNeoDetails failed for', ast.id, err && err.message)
              const feedCad = Array.isArray(ast.close_approach_data) ? ast.close_approach_data : []
              const future = feedCad.map(parseEpoch).filter(e => Number.isFinite(e) && e > now)
              if (future.length > 0) return { ...ast, details: null, nextEpoch: Math.min(...future), estimated: false }
              return { ...ast, details: null, nextEpoch: null }
            }
          }))

          for (const r of batchRes) {
            const idx = results.findIndex(x => x.id === r.id)
            if (idx >= 0) results[idx] = r
          }
        }

        const upcoming = results.filter(a => a.nextEpoch && a.nextEpoch > now).sort((a, b) => a.nextEpoch - b.nextEpoch)

        setAsteroids(upcoming)
        setIndex(0)
        if (upcoming.length === 0) setError('No upcoming close approaches found or estimatable.')
      })
      .catch(err => {
        if (!mounted) return
        const msg = err?.message || String(err)
        console.error('fetchNeoFeed error:', msg)
        setError(msg)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const t = setTimeout(() => {
      if (containerRef.current) requestAnimationFrame(() => containerRef.current.classList.add('visible'))
    }, 50)

    return () => { mounted = false; clearTimeout(t) }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const cards = Array.from(document.querySelectorAll('.discover-card'))
    if (!cards || cards.length === 0) return

    observerRef.current = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.18 })

    cards.forEach(c => observerRef.current.observe(c))
    return () => { if (observerRef.current) observerRef.current.disconnect() }
  }, [asteroids])

  const switchAsteroid = () => {
    if (!asteroids || asteroids.length === 0) return
    setIndex(i => (i + 1) % asteroids.length)
  }

  const asteroid = asteroids[index] || null

  useEffect(() => {
    let mounted = true
    setDetails(null)
    setCloseApproachTime(null)
    if (!asteroid) return

    // if we've attached details/nextEpoch earlier, use them. Otherwise fetch details on demand.
    (async () => {
      try {
        const d = asteroid.details || (asteroid.id ? await fetchNeoDetails(asteroid.id) : null)
        if (!mounted) return
        setDetails(d)

        if (asteroid.nextEpoch) {
          const label = new Date(asteroid.nextEpoch).toLocaleString()
          setCloseApproachTime(label + (asteroid.estimated ? ' (estimated)' : ''))
          return
        }

        // fallback: check details for explicit future approach
        const rawCad = d?.close_approach_data || []
        const now = Date.now()
        const future = rawCad.map(entry => ({ entry, epoch: parseEpoch(entry) })).filter(x => Number.isFinite(x.epoch) && x.epoch > now).sort((a,b)=>a.epoch-b.epoch)
        if (future.length > 0) {
          const chosen = future[0]
          setCloseApproachTime(chosen.entry.close_approach_date_full || new Date(chosen.epoch).toLocaleString())
        }
      } catch (err) {
        console.warn('failed to fetch neo details', err)
      }
    })()

    return () => { mounted = false }
  }, [asteroid])

  return (
    <div className="sectionContainer" id="frameOne">
      <div className="fade-in-text" ref={containerRef}>
        {error && <div className="error-message" role="alert">Error: {error}</div>}

        <h2>Asteroids</h2>

        <div id="frameOneIntroText">
          <p>Asteroids are tracked continuously. The list here only includes objects with an upcoming approach (explicit or estimated).</p>
        </div>

        <h3>Discover</h3>

        <section className="discover-showcase" aria-labelledby="discover-heading">
          <div className="discover-grid">
            <article className="discover-card" tabIndex={0}>
              <figure className="card-visual" aria-hidden="true">
                {loading && <div className="placeholder">Loading…</div>}
                {!loading && asteroid && (
                  <AsteroidArt />
                )}
                {!loading && !asteroid && (
                  <div className="placeholder">No data</div>
                )}
              </figure>
              <h4 className="card-title">{asteroid ? asteroid.name : 'Unknown Object'}</h4>
              <p className="card-desc">
                {asteroid
                  ? `Diameter ≈ ${asteroid.diameter_m ? Math.round(asteroid.diameter_m) + ' m' : 'N/A'} • ${asteroid.relVel_kms ? Number(asteroid.relVel_kms).toFixed(2) + ' km/s' : 'N/A'}`
                  : 'No asteroid data available at the moment.'}
              </p>

              {closeApproachTime ? (
                <p className="card-desc">Next close approach: {closeApproachTime}</p>
              ) : (
                <p className="card-desc">No upcoming approach data available</p>
              )}

              <div className="card-actions">
                <button className="btn" onClick={switchAsteroid} disabled={loading || asteroids.length === 0}>Next</button>
              </div>
            </article>

            <article className="discover-card" tabIndex={0}>
                <figure className="card-visual">
                  <img
                    src="https://via.placeholder.com/480x320/23243a/3a7bff?text=Space+Viewer"
                    alt="Space viewer placeholder"
                    onError={e => {
                      // simple fallback: use inline SVG data URI to avoid external DNS failure
                      e.currentTarget.onerror = null
                      e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="100%" height="100%" fill="%2323243a"/><text x="50%" y="50%" fill="%233a7bff" font-family="Arial" font-size="20" text-anchor="middle" dy=".3em">Space Viewer</text></svg>'
                    }}
                  />
                </figure>
              <h4 className="card-title">Interactive Space Viewer</h4>
              <p className="card-desc">Pan, zoom, and inspect the asteroid belt with smooth controls and real-time rendering. Perfect for visual analysis and presentations.</p>
            </article>

            <article className="discover-card" tabIndex={0}>
              <figure className="card-visual">
                <img
                  src="https://via.placeholder.com/480x320/23243a/6bc9ff?text=Mission+Insights"
                  alt="Mission insights placeholder"
                  onError={e => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="100%" height="100%" fill="%2323243a"/><text x="50%" y="50%" fill="%236bc9ff" font-family="Arial" font-size="20" text-anchor="middle" dy=".3em">Mission Insights</text></svg>'
                  }}
                />
              </figure>
              <h4 className="card-title">Mission Insights</h4>
              <p className="card-desc">Access curated mission data, trajectories, and scientific summaries—designed for clarity and quick decision-making.</p>
            </article>
          </div>
        </section>
      </div>

      
    </div>
  )
}

export default FrameOne