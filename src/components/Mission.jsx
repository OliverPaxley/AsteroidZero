import React from 'react';

const Mission = () => {
  const missions = [
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

  const missionStats = [
    { number: "150+", label: "Active Missions", icon: "📡" },
    { number: "40+", label: "Years in Space", icon: "⏳" },
    { number: "500+", label: "Astronauts Launched", icon: "👨‍🚀" },
    { number: "1000+", label: "Discoveries", icon: "🔬" }
  ];

  return (
    <div className="missionSection" id='mission'>
      <div className="missionContainer">
        {/* Header */}
        <div className="missionHeader">
          <div className="missionBadge">NASA Missions</div>
          <h1 className="missionTitle">Space Exploration Grid</h1>
          <p className="missionSubtitle">
            A comprehensive overview of NASA's ongoing and completed missions across the solar system and beyond.
          </p>
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