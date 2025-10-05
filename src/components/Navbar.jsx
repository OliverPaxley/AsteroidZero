import React, { useState } from 'react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const smoothScrollTo = (targetY, duration = 2000) => {
    const startY = window.scrollY;
    const diff = targetY - startY;
    const startTime = performance.now();

    const easeInOutQuad = (t) =>
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutQuad(progress);
      window.scrollTo(0, startY + diff * eased);

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  };

  const handleScroll = (id, event) => {
    event.preventDefault(); // Prevent default anchor behavior
    const target = document.getElementById(id);
    if (target) {
      const targetY = target.offsetTop - 80; // Adjust for fixed nav offset
      smoothScrollTo(targetY, 2000); // 2000ms = 2s
    }
    // Close menu when a link is clicked
    setIsMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav>
      <div className="Heading">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/81/DART_Mission_Patch.png" alt="logo" className="logo" />
        
        {/* Hamburger Menu Button */}
        <div 
          className={`hamburger ${isMenuOpen ? 'active' : ''}`} 
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Navigation Links */}
        <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <a href="#home" onClick={(e) => handleScroll('home', e)} className="nav-link"> Home </a>
          <a href="#asteroid" onClick={(e) => handleScroll('asteroid', e)} className="nav-link"> Asteroid </a>
          <a href="#mission" onClick={(e) => handleScroll('mission', e)} className="nav-link"> Missions </a>
          <a href="#map" onClick={(e) => handleScroll('map', e)} className="nav-link">Map </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;