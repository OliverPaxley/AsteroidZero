import React, { useRef, Suspense, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Stars, Html, useProgress } from '@react-three/drei';

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{ color: 'white' }}>Loading... {Math.round(progress)}%</div>
    </Html>
  );
}

const ParticleRing = () => {
  const ringRef = useRef();
  const particlesCount = 500;
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i++) {
      const angle = (i / particlesCount) * Math.PI * 2;
      const radius = 7 + Math.random() * 2; // Random between 7-9
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1; // Slight vertical spread
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
  }, [particlesCount]);

  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.rotation.y += 0.003;
    }
  });

  return (
    <points ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#0ea5e9" transparent opacity={0.8} />
    </points>
  );
};

const MilkyWayModel = () => {
  const { scene } = useGLTF('/MilkyWay.glb');
  const groupRef = useRef();
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef} scale={[0.5, 0.5, 0.5]}>
      <primitive object={scene} />
      <ParticleRing />
    </group>
  );
};

const SpaceViewer = () => {
  return (
    <>
      <OrbitControls enableZoom={true} enableRotate={true} />
      <Suspense fallback={<Loader />}>
        <MilkyWayModel />
      </Suspense>
      <Stars />
      <ambientLight intensity={0.6} />
    </>
  );
};

export default SpaceViewer;