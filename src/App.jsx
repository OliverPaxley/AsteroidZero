import React from 'react'
import './index.css'
import ImpactMapPage from './pages/ImpactMapPage.jsx';
import Navbar from './components/Navbar'
import FrameOne from './components/FrameOne' 
import Hero from './components/Hero'
import Mission from './components/Mission'

const App = () => {
  return (
    <main>
      <Navbar />
      <Hero />
      <FrameOne />
      <ImpactMapPage />
      <Mission />
    </main>
  )
}

export default App 

