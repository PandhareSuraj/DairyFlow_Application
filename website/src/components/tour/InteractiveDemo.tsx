import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment, PresentationControls } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Truck, MapPin, Users, Package, Clock, Star } from 'lucide-react';
import * as THREE from 'three';
import { useIsMobile } from '@/hooks/use-mobile';

function DeliveryTruck() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.3;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Truck body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 1.2, 1]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.4} metalness={0.3} />
      </mesh>
      
      {/* Truck cabin */}
      <mesh position={[1.2, 0.6, 0]}>
        <boxGeometry args={[0.8, 1, 0.9]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.4} metalness={0.3} />
      </mesh>
      
      {/* Wheels */}
      {[[-0.6, -0.2, 0.5], [-0.6, -0.2, -0.5], [1, -0.2, 0.5], [1, -0.2, -0.5]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.15, 16]} />
          <meshStandardMaterial color="#1f2937" roughness={0.8} />
        </mesh>
      ))}
      
      {/* Milk crates on top */}
      {[[-0.5, 1.2, 0], [0.2, 1.2, 0]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.5, 0.3, 0.4]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function RoutePoints() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Create stable route points
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      pts.push({
        x: Math.cos(angle) * 2.5,
        y: (i * 0.1 - 0.35),
        z: Math.sin(angle) * 2.5
      });
    }
    return pts;
  }, []);

  return (
    <group ref={groupRef}>
      {/* Delivery points as spheres */}
      {points.map((point, i) => (
        <mesh key={i} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial 
            color={i === 0 ? "#22c55e" : "#3b82f6"} 
            emissive={i === 0 ? "#22c55e" : "#3b82f6"}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      
      {/* Connecting lines between points using Tube or cylinders */}
      {points.map((point, i) => {
        const nextPoint = points[(i + 1) % points.length];
        const midX = (point.x + nextPoint.x) / 2;
        const midY = (point.y + nextPoint.y) / 2;
        const midZ = (point.z + nextPoint.z) / 2;
        const dx = nextPoint.x - point.x;
        const dy = nextPoint.y - point.y;
        const dz = nextPoint.z - point.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        return (
          <mesh 
            key={`line-${i}`} 
            position={[midX, midY, midZ]}
            rotation={[
              Math.atan2(Math.sqrt(dx * dx + dz * dz), dy) - Math.PI / 2,
              Math.atan2(dz, dx),
              0
            ]}
          >
            <cylinderGeometry args={[0.02, 0.02, length, 8]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function Scene3D() {
  return (
    <Canvas camera={{ position: [4, 3, 5], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      
      <Suspense fallback={null}>
        <PresentationControls
          global
          rotation={[0.2, 0.2, 0]}
          polar={[-0.3, 0.3]}
          azimuth={[-0.5, 0.5]}
          config={{ mass: 2, tension: 400 }}
        >
          <Float floatIntensity={0.3} rotationIntensity={0.2}>
            <DeliveryTruck />
          </Float>
          <RoutePoints />
        </PresentationControls>
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}

const featureIcons = [Truck, MapPin, Users, Package, Clock, Star];

export function InteractiveDemo() {
  const { t } = useTranslation('tour');
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const isMobile = useIsMobile();
  
  const features = t('demo.features', { returnObjects: true }) as Array<{ label: string; description: string }>;

  return (
    <section 
      ref={ref as React.RefObject<HTMLDivElement>}
      className="py-24 px-4"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className={cn(
          'text-center mb-12 transition-all duration-700',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('demo.title')} <span className="text-primary">{t('demo.titleHighlight')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('demo.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* 3D Scene */}
          <div className={cn(
            'h-[400px] lg:h-[500px] rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50',
            'transition-all duration-700 delay-200',
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
          )}>
            {isMobile ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-8">
                <Truck className="w-20 h-20 text-primary/40" />
                <p className="text-muted-foreground text-center text-sm">{t('demo.subtitle')}</p>
              </div>
            ) : (
              <Scene3D />
            )}
          </div>

          {/* Feature grid */}
          <div className={cn(
            'grid grid-cols-2 gap-4',
            'transition-all duration-700 delay-400',
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          )}>
            {features.map((feature, index) => {
              const FeatureIcon = featureIcons[index] || Truck;
              return (
                <div
                  key={index}
                  className={cn(
                    'p-5 rounded-2xl bg-card border border-border/50',
                    'hover:border-primary/30 hover:shadow-medium',
                    'transition-all duration-300',
                    'opacity-0 animate-fade-in'
                  )}
                  style={{ animationDelay: `${600 + index * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <FeatureIcon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.label}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
