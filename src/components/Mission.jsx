import React, { useState, useEffect } from 'react';
import { fetchNeoFeed, fetchNeoDetails } from '../services/nasa';
import { energyMegatons, radiusKmFromEnergyMt } from '../lib/impact';

const Mission = () => {
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to parse epoch from close approach data
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

  // Fetch asteroid data on component mount
  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    const fetchAsteroids = async () => {
      try {
        const raw = await fetchNeoFeed({ days: 1 });
        const now = Date.now();

        // Process asteroids similar to ImpactMapPage but focused on threat assessment
        const needsDetails = [];
        const preprocessed = (raw || []).map(a => {
          const feedCad = Array.isArray(a.close_approach_data) ? a.close_approach_data : [];
          const future = feedCad.map(parseEpoch).filter(e => Number.isFinite(e) && e > now);
          if (future.length > 0) return { ...a, details: null, nextEpoch: Math.min(...future), estimated: false };
          needsDetails.push(a);
          return { ...a, details: null, nextEpoch: null };
        });

        // Fetch details for asteroids that need them
        const CONCURRENCY = 4;
        const enriched = [...preprocessed];
        
        for (let i = 0; i < needsDetails.length; i += CONCURRENCY) {
          const batch = needsDetails.slice(i, i + CONCURRENCY);
          const results = await Promise.all(batch.map(async a => {
            try {
              const d = await fetchNeoDetails(a.id);
              const detailsCad = Array.isArray(d.close_approach_data) ? d.close_approach_data : [];
              const future = detailsCad.map(parseEpoch).filter(e => Number.isFinite(e) && e > now);
              if (future.length > 0) return { ...a, details: d, nextEpoch: Math.min(...future), estimated: false };
              return { ...a, details: d, nextEpoch: null };
            } catch (err) {
              console.warn('fetchNeoDetails failed for', a.id, err && err.message);
              return { ...a, details: null, nextEpoch: null };
            }
          }));

          // Merge batch results
          for (const r of results) {
            const idx = enriched.findIndex(x => x.id === r.id);
            if (idx >= 0) enriched[idx] = r;
          }
        }

        // Calculate threat levels and sort by energy
        const threatening = enriched
          .filter(x => x.nextEpoch && x.nextEpoch > now)
          .map(a => {
            const E_mt = energyMegatons(a.diameter_m, a.relVel_kms, 3000);
            const radius_km = radiusKmFromEnergyMt(E_mt, 0.012);
            return { ...a, E_mt, radius_km };
          })
          .sort((a, b) => b.E_mt - a.E_mt)
          .slice(0, 9); // Get top 9 most threatening

        if (mounted) {
          setAsteroids(threatening);
          setLoading(false);
        }
      } catch (err) {
        if (!mounted) return;
        const msg = err?.message || String(err);
        console.error('fetchNeoFeed error:', msg);
        setError(msg);
        setLoading(false);
      }
    };

    fetchAsteroids();

    return () => {
      mounted = false;
      abortController.abort();
    };
  }, []);

  // Function to generate threat description for each asteroid
  const getThreatDescription = (asteroid) => {
    const { diameter_m, relVel_kms, E_mt, radius_km } = asteroid;
    
    // Size categories
    const sizeCategory = diameter_m > 1000 ? 'massive' : 
                        diameter_m > 500 ? 'large' : 
                        diameter_m > 100 ? 'significant' : 'moderate';
    
    // Speed categories
    const speedCategory = relVel_kms > 20 ? 'extremely fast' :
                         relVel_kms > 15 ? 'high-speed' :
                         relVel_kms > 10 ? 'fast-moving' : 'moderate-speed';
    
    // Energy-based threat level
    if (E_mt > 1000000) {
      return `${sizeCategory.charAt(0).toUpperCase() + sizeCategory.slice(1)} asteroid with ${speedCategory} approach generating ${E_mt.toLocaleString()} megatons of energy - potential global catastrophe.`;
    } else if (E_mt > 100000) {
      return `${sizeCategory.charAt(0).toUpperCase() + sizeCategory.slice(1)} ${speedCategory} asteroid with ${E_mt.toLocaleString()} MT energy - regional devastation threat.`;
    } else if (E_mt > 10000) {
      return `${sizeCategory.charAt(0).toUpperCase() + sizeCategory.slice(1)} asteroid traveling at ${relVel_kms.toFixed(1)} km/s with ${E_mt.toLocaleString()} MT impact energy.`;
    } else if (E_mt > 1000) {
      return `${diameter_m.toFixed(0)}m ${speedCategory} asteroid with ${E_mt.toLocaleString()} MT energy - city-level destruction potential.`;
    } else if (E_mt > 100) {
      return `${diameter_m.toFixed(0)}m diameter object at ${relVel_kms.toFixed(1)} km/s - ${radius_km.toFixed(1)}km destruction radius.`;
    } else {
      return `${diameter_m.toFixed(0)}m asteroid approaching at ${relVel_kms.toFixed(1)} km/s with ${E_mt.toFixed(0)} MT energy equivalent.`;
    }
  };

  // Function to get status based on approach timing and threat level
  const getAsteroidStatus = (asteroid) => {
    const { nextEpoch, E_mt } = asteroid;
    const now = Date.now();
    const daysUntilApproach = (nextEpoch - now) / (1000 * 60 * 60 * 24);
    
    if (daysUntilApproach < 30) return 'Critical';
    if (E_mt > 100000) return 'High Risk';
    if (daysUntilApproach < 365) return 'Monitoring';
    return 'Tracked';
  };

  // Static fallback missions (used when loading or error)
  const staticMissions = [
    {
      id: 1,
      name: "DART Mission",
      status: "Completed",
      year: "2022",
      description: "First planetary defense test that successfully altered an asteroid's orbit.",
      achievement: "Changed Dimorphos orbit by 32 minutes",
      icon: "🛡️",
      color: "#3B82F6"
    },
    {
      id: 2,
      name: "Artemis Program",
      status: "Active",
      year: "2025+",
      description: "Return humans to the Moon and establish sustainable exploration.",
      achievement: "First woman and next man on lunar surface",
      icon: "🌙",
      color: "#8B5CF6"
    },
    {
      id: 3,
      name: "James Webb Telescope",
      status: "Active",
      year: "2021",
      description: "Revolutionary infrared telescope exploring the early universe.",
      achievement: "Deepest infrared images of the universe",
      icon: "🔭",
      color: "#F59E0B"
    },
    {
      id: 4,
      name: "Mars Perseverance",
      status: "Active",
      year: "2021",
      description: "Rover searching for signs of ancient life and collecting samples.",
      achievement: "Producing oxygen from Martian atmosphere",
      icon: "🤖",
      color: "#EF4444"
    },
    {
      id: 5,
      name: "OSIRIS-REx",
      status: "Completed",
      year: "2023",
      description: "Asteroid sample return mission from Bennu.",
      achievement: "Collected 250g+ of asteroid material",
      icon: "💎",
      color: "#10B981"
    },
    {
      id: 6,
      name: "Voyager Program",
      status: "Active",
      year: "1977",
      description: "Interstellar missions exploring outer solar system and beyond.",
      achievement: "First in interstellar space",
      icon: "🚀",
      color: "#6366F1"
    },
    {
      id: 7,
      name: "International Space Station",
      status: "Active",
      year: "1998",
      description: "Orbiting laboratory for scientific research in microgravity.",
      achievement: "Continuous human presence since 2000",
      icon: "🛰️",
      color: "#06B6D4"
    },
    {
      id: 8,
      name: "Hubble Telescope",
      status: "Active",
      year: "1990",
      description: "Iconic space telescope that revolutionized astronomy.",
      achievement: "1.5M+ observations and 19,000+ papers",
      icon: "⭐",
      color: "#EC4899"
    },
    {
      id: 9,
      name: "ICESat-2",
      status: "Active",
      year: "2018",
      description: "Laser altimeter measuring Earth's ice sheets, glaciers, and sea ice.",
      achievement: "Revealed rapid ice loss from polar regions",
      icon: "🧊",
      color: "#06B6D4"
    }
  ];

  // Convert asteroids to mission format
  const asteroidMissions = asteroids.map((asteroid, index) => {
    const colors = ['#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4'];
    const approachDate = new Date(asteroid.nextEpoch);
    
    return {
      id: asteroid.id,
      name: asteroid.name?.replace(/[()]/g, '') || `Asteroid ${asteroid.id}`,
      status: getAsteroidStatus(asteroid),
      year: approachDate.getFullYear().toString(),
      description: getThreatDescription(asteroid),
      achievement: `Impact energy: ${asteroid.E_mt.toLocaleString()} megatons`,
      icon: "☄️",
      color: colors[index % colors.length]
    };
  });

  // Use asteroid data if available and loaded, otherwise fall back to static missions
  const missions = (!loading && !error && asteroids.length > 0) ? asteroidMissions : staticMissions;

  const missionStats = [
    { number: "150+", label: "Active Missions", icon: "📡" },
    { number: "40+", label: "Years in Space", icon: "⏳" },
    { number: "500+", label: "Astronauts Launched", icon: "👨‍🚀" },
    { number: "1000+", label: "Discoveries", icon: "🔬" }
  ];

  return (
    <div className="missionSection" id='asteroid'>
      <div className="missionContainer">
        {/* Header */}
        <div className="missionHeader">
          <div className="missionBadge">
            {(!loading && !error && asteroids.length > 0) ? 'Threat Assessment' : 'NASA Missions'}
          </div>
          <h1 className="missionTitle">
            {(!loading && !error && asteroids.length > 0) ? 'Most Threatening Asteroids' : 'Space Exploration Grid'}
          </h1>
          <p className="missionSubtitle">
            {(!loading && !error && asteroids.length > 0) 
              ? 'Real-time monitoring of the 9 most dangerous near-Earth asteroids based on energy potential and approach timing.'
              : 'A comprehensive overview of NASA\'s ongoing and completed missions across the solar system and beyond.'
            }
          </p>
          {loading && (
            <div style={{ color: '#06B6D4', marginTop: '10px' }}>
              Loading real-time asteroid threat data...
            </div>
          )}
          {error && (
            <div style={{ color: '#EF4444', marginTop: '10px' }}>
              Failed to load asteroid data. Showing static missions instead.
            </div>
          )}
        </div>

        {/* Mission Grid */}
        <div className="missionGrid">
          {missions.map((mission, index) => (
            <div 
              key={mission.id} 
              className="missionCard"
              style={{ 
                '--accent-color': mission.color,
                animationDelay: `${index * 0.1}s` 
              }}
            >
              <div className="cardHeader">
                <div className="missionIcon" style={{ backgroundColor: mission.color }}>
                  {mission.icon}
                </div>
                <div className="missionMeta">
                  <span className={`status ${mission.status.toLowerCase()}`}>
                    {mission.status}
                  </span>
                  <span className="year">{mission.year}</span>
                </div>
              </div>
              
              <h3 className="missionName">{mission.name}</h3>
              <p className="missionDescription">{mission.description}</p>
              
              <div className="missionAchievement">
                <span className="achievementIcon">✅</span>
                <span>{mission.achievement}</span>
              </div>

              <div className="cardHoverEffect"></div>
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="statsGrid">
          {missionStats.map((stat, index) => (
            <div key={index} className="statCard">
              <div className="statIcon">{stat.icon}</div>
              <div className="statNumber">{stat.number}</div>
              <div className="statLabel">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="missionFooter">
          <p>Want to explore more NASA missions and real-time data?</p>
          <button className="ctaButton">
            Explore Mission Dashboard
            <span className="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Mission;