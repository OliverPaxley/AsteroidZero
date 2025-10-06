import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-content">
          {/* Brand Section */}
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="logo-icon">🚀</div>
              <span className="logo-text">AsteroidZero</span>
            </div>
            <p className="footer-description">
              Defending Earth from asteroid impacts through advanced tracking, 
              simulation, and public awareness. Join us in protecting our planet's future.
            </p>
            <div className="footer-social">
              <a href="https://github.com/OliverPaxley/AsteroidZero" className="social-link" aria-label="GitHub Repository">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-links">
            <div className="link-group">
              <h4>Explore</h4>
              <ul>
                <li><a href="https://asteroidzero.netlify.app">Home</a></li>
                <li><a href="#asteroid">Asteroids</a></li>
                <li><a href="#mission">Missions</a></li>
                <li><a href="#map">Impact Map</a></li>
              </ul>
            </div>

            <div className="link-group">
              <h4>Resources</h4>
              <ul>
                <li><a href="#simulation">Simulations</a></li>
                <li><a href="#data">Live Data</a></li>
                <li><a href="">Research</a></li>
                <li><a href="https://www.w3schools.com/react/default.asp">Education</a></li>
              </ul>
            </div>

            <div className="link-group">
              <h4>About</h4>
              <ul>
                <li><a href="https://www.spaceappschallenge.org/2025/find-a-team/asiantitan/">Our Team</a></li>
                <li><a href="https://www.apple.com/ca/macbook-pro/?afid=p240%7Cgo~cmp-21288248387~adg-164301472922~ad-737385317167_kwd-987394769~dev-c~ext-~prd-~mca-~nt-search&cid=aos-ca-kwgo-mac-caen-postmactradeinpromo-evergreen-040225-">Technology</a></li>
              </ul>
            </div>
          </div>

          {/* Team Section */}
          <div className="footer-team">
            <h4>Development Team</h4>
            <div className="team-members">
              <div className="team-group link-group">
                <h5>Programmers</h5>
                <ul>
                  <li><a href="https://www.linkedin.com/in/sovanndara-rin-151b87360/">Sovanndara Rin</a></li>
                  <li><a href="https://www.linkedin.com/in/serey-vaddh-savy-5b43342b0/">Serey Vaddh Savy</a></li>
                  <li><a href="https://www.linkedin.com/in/amirhossein-mohammadi-3530ba268/">Amir Hossen</a></li>
                  <li><a href="https://www.linkedin.com/in/an-đinh-93b853383/">John Long</a></li>
                </ul>
              </div>
              <div className="team-group link-group">
                <h5>Product Manager</h5>
                <ul>
                  <li><a href="https://www.linkedin.com/in/arunachalampalaniappan04/edit/forms/next-action/after-connect-add-position/">Arunachalam Palaniappan</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-legal">
            <p>&copy; {currentYear} AsteroidZero. All rights reserved.</p>
            <p>Protecting Earth's future through space technology and awareness.</p>
          </div>
          <div className="footer-credits">
            <p>
              Data powered by <a href="https://api.nasa.gov" target="_blank" rel="noopener noreferrer">NASA API</a> • 
              Built with passion for planetary defense
            </p>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="footer-background">
        <div className="stars"></div>
        <div className="asteroid-small"></div>
        <div className="asteroid-medium"></div>
      </div>
    </footer>
  );
};

export default Footer;