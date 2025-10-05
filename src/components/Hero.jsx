import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import SpaceViewer from './SpaceViewer';

const Hero = () => {
  const heroTextRef = useRef(null);
  const hero3dRef = useRef(null);

  useEffect(() => {
    // Add animation classes after component mounts
    const timer = setTimeout(() => {
      if (heroTextRef.current) {
        heroTextRef.current.classList.add('animate-in');
      }
      if (hero3dRef.current) {
        hero3dRef.current.classList.add('animate-in');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='hero-container'>
      <div className='hero-content'>
        {/* LEFT SIDE - Text */}
        <div ref={heroTextRef} className='hero-text'>
          <h1 className='head-title'>
            Defend Earth from Asteroid Impacts
          </h1>
          <p className='hero-description'>
            Join us in our mission to track and mitigate asteroid threats. Explore our interactive map to see potential impact zones and learn how you can help protect our planet.
          </p>
          <div className="button-container">
            <button className='cta-button'>
              Explore Threats
            </button>
            <a
              className='cta-button'
              id='generateGamePage'
              href='/game/game/game.html'
              target='_blank'
              rel='noopener noreferrer'
            >
              Game & Simulation
            </a>
          </div>
        </div>
        
        {/* RIGHT SIDE - 3D Model */}
        <div ref={hero3dRef} className='hero-3d'>
          <Canvas camera={{ position: [0, 0, 8] }}>
            <SpaceViewer />
          </Canvas>
        </div>
      </div>
    </div>
  );
};

export default Hero;