import React from 'react';

export default function AsteroidList({ items, activeId, onSelect }) {
  return (
    <div className="list">
      {items.map(a => (
        <button
          key={a.id}
          className={`row ${a.id === activeId ? 'row-active' : ''}`}
          onClick={() => onSelect(a.id)}
          title="Select, then click on the map to place the impact circle"
        >
          <div className="name">{a.name}</div>
          <div className="cell">{Math.round(a.diameter_m)} m</div>
          <div className="cell">{a.relVel_kms.toFixed(2)} km/s</div>
          <div className="cell">{a.radius_km.toFixed(2)} km</div>
        </button>
      ))}
    </div>
  );
}
