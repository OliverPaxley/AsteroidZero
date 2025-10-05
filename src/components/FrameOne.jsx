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

  // Ref for the Three.js canvas and controls
  const viewerRef = useRef(null);
  const viewerMountRef = useRef(null);
  const controlsRef = useRef(null); // New ref to store controls

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
        const d = asteroid.details || (asteroid.id ? await fetchNeoDetails(asteroid.id) : null);
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

  // Dynamic Three.js Setup for Interactive Space Viewer
  useEffect(() => {
    let mounted = true;
    let scene, camera, renderer, asteroidsGroup, starsGroup;
    let animationId;

    const initViewer = async () => {
      if (!viewerMountRef.current || !mounted) return;

      // Dynamically import Three.js and OrbitControls
      const { default: THREE } = await import('https://unpkg.com/three@0.128.0/build/three.module.js');
      const { OrbitControls } = await import('https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js');

      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000011);

      // Camera
      camera = new THREE.PerspectiveCamera(75, viewerMountRef.current.clientWidth / viewerMountRef.current.clientHeight, 0.1, 1000);
      camera.position.set(0, 50, 100);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(viewerMountRef.current.clientWidth, viewerMountRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      viewerMountRef.current.innerHTML = '';
      viewerMountRef.current.appendChild(renderer.domElement);

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controlsRef.current = controls; // Store controls in ref

      // Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
      scene.add(ambientLight);
      const pointLight = new THREE.PointLight(0xffffff, 1, 1000);
      pointLight.position.set(0, 0, 0);
      scene.add(pointLight);

      // Stars Background
      starsGroup = new THREE.Group();
      for (let i = 0; i < 1000; i++) {
        const starGeometry = new THREE.SphereGeometry(0.1, 4, 4);
        const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const star = new THREE.Mesh(starGeometry, starMaterial);
        star.position.set(
          (Math.random() - 0.5) * 2000,
          (Math.random() - 0.5) * 2000,
          (Math.random() - 0.5) * 2000
        );
        starsGroup.add(star);
      }
      scene.add(starsGroup);

      // Asteroid Belt
      asteroidsGroup = new THREE.Group();
      const asteroidGeometry = new THREE.SphereGeometry(1, 6, 6);
      for (let i = 0; i < 500; i++) {
        const asteroidMaterial = new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.5, 0.3)
        });
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        const radius = 50 + Math.random() * 30;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 10;
        asteroid.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );
        asteroid.scale.setScalar(0.5 + Math.random() * 2);
        asteroidsGroup.add(asteroid);
      }
      scene.add(asteroidsGroup);

      // Animate
      const animate = () => {
        if (!mounted) return;
        animationId = requestAnimationFrame(animate);
        asteroidsGroup.rotation.y += 0.001;
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Resize handler
      const handleResize = () => {
        if (!mounted || !viewerMountRef.current) return;
        camera.aspect = viewerMountRef.current.clientWidth / viewerMountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewerMountRef.current.clientWidth, viewerMountRef.current.clientHeight);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (animationId) cancelAnimationFrame(animationId);
        if (renderer) renderer.dispose();
      };
    };

    initViewer().catch(console.error);

    return () => {
      mounted = false;
      if (viewerMountRef.current) viewerMountRef.current.innerHTML = '';
    };
  }, []);

  const assessRisk = (ast) => {
    const mag = ast.absolute_magnitude_h || 22;
    const missDist = ast.close_approach_data?.[0]?.miss_distance?.kilometers || 1000000;
    const size = ast.diameter_m || 100;
    const hazard = mag < 20 && missDist < 100000 ? 'High' : mag < 25 && missDist < 500000 ? 'Medium' : 'Low';
    alert(`Hazard Level: ${hazard}\nSize: ${size.toFixed(2)}m\nMiss Distance: ${missDist.toLocaleString()}km`);
  };

  const launchSimulator = () => {
    alert('Launching Solar System Simulator - Full screen view coming soon!');
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
    <div className="sectionContainer" id="frameOne">
      <div className="fade-in-text" ref={containerRef}>
        {error && <div className="error-message" role="alert">Error: {error}</div>}

        

        <h3>Discover</h3>

        <section className="discover-showcase" aria-labelledby="discover-heading">
          <div className="discover-grid">
            <article className="discover-card" tabIndex={0}>
              <figure className="card-visual" aria-hidden="true">
                {loading && <div className="placeholder">Loading…</div>}
                {!loading && asteroid && (
                  <svg width="100%" height="100%" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#23243a"/>
                    <circle cx="240" cy="160" r="80" fill="#ff4444" opacity="0.5"/>
                    <text x="50%" y="50%" fill="#3a7bff" fontFamily="Arial" fontSize="20" textAnchor="middle" dy=".3em">Threat Analyzer</text>
                  </svg>
                )}
                {!loading && !asteroid && <div className="placeholder">No data</div>}
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
                <button className="btn" onClick={() => asteroid && assessRisk(asteroid)} disabled={loading || !asteroid}>Assess Risk</button>
                <button className="btn" onClick={switchAsteroid} disabled={loading || !asteroid || asteroids.length <= 1}>Next</button>
              </div>
            </article>

            {/* Interactive Space Viewer Card */}
            <article className="discover-card" tabIndex={0} ref={viewerRef}>
              <figure className="card-visual">
                <div ref={viewerMountRef} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }} />
              </figure>
              <h4 className="card-title">Interactive Space Viewer</h4>
              <p className="card-desc">Pan, zoom, and inspect the asteroid belt with smooth controls and real-time rendering. Perfect for visual analysis and presentations.</p>
              <div className="card-actions">
                <button className="btn" onClick={() => { controlsRef.current?.reset(); }}>Reset View</button>
                <button className="btn" onClick={launchSimulator}>Launch Simulator</button>
              </div>
            </article>

            <article className="discover-card" tabIndex={0}>
              <figure className="card-visual">
                <svg width="100%" height="100%" viewBox="0 0 480 320" xmlns="http://www.w3.org/2000/svg">
                  <rect width="100%" height="100%" fill="#23243a"/>
                  <rect x="200" y="120" width="80" height="80" fill="#6bc9ff" opacity="0.5"/>
                  <text x="50%" y="50%" fill="#b2b6c8" fontFamily="Arial" fontSize="20" textAnchor="middle" dy=".3em">Mining Prospects</text>
                </svg>
              </figure>
              <h4 className="card-title">Asteroid Mining Prospects</h4>
              <p className="card-desc">Explore valuable asteroids ripe for mining. Discover resources that could fuel future space economies, with insights from real missions.</p>
              <div className="card-actions">
                <button className="btn" onClick={() => asteroid && calculateValue(asteroid)} disabled={loading || !asteroid}>Calculate Value</button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FrameOne;