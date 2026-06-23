import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';

function MilkBottle() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.8, 1, 2.5, 32]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.9} roughness={0.1} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.4, 0.6, 0.8, 32]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 0.3, 32]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.75, 0.95, 1.8, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.9} />
      </mesh>
    </group>
  );
}

export default function Scene3D() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />
      
      <Suspense fallback={null}>
        <PresentationControls
          global
          rotation={[0.1, 0.2, 0]}
          polar={[-0.4, 0.4]}
          azimuth={[-0.6, 0.6]}
          config={{ mass: 2, tension: 400 }}
          snap={{ mass: 4, tension: 400 }}
        >
          <Float rotationIntensity={0.4} floatIntensity={0.5}>
            <MilkBottle />
          </Float>
        </PresentationControls>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
