import React, { useEffect, useRef } from 'react';
import * as turf from '@turf/turf';
import L from 'leaflet';

export default function MapPane({ active }) {
  const mapRef = useRef(null);

  useEffect(() => {
    const map = L.map('map', { center: [20, 0], zoom: 2 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e) => {
      if (!active) return;
      const pt = turf.point([e.latlng.lng, e.latlng.lat]);
      const circle = turf.circle(pt, active.radius_km, { steps: 128, units: 'kilometers' });
      L.geoJSON(circle).addTo(map);
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [active]);

  return <div id="map" style={{ height: '80vh', width: '100%' }} />;
}
