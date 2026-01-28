"use client";

import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";

// ============================================================================
// SCALES OF JUSTICE 3D MODEL (Geometric/Abstract)
// ============================================================================

function ScalesGeometry() {
  const groupRef = useRef<THREE.Group>(null);
  const leftPanRef = useRef<THREE.Mesh>(null);
  const rightPanRef = useRef<THREE.Mesh>(null);
  const prefersReducedMotion = useReducedMotion();
  const { pointer } = useThree();

  // Subtle animation - rotation and gentle sway
  useFrame((state) => {
    if (!groupRef.current || prefersReducedMotion) return;

    const time = state.clock.elapsedTime;

    // Gentle rotation following mouse
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      pointer.x * 0.2,
      0.02
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.y * 0.1,
      0.02
    );

    // Subtle balance sway
    if (leftPanRef.current && rightPanRef.current) {
      const sway = Math.sin(time * 0.5) * 0.05;
      leftPanRef.current.position.y = -0.8 + sway;
      rightPanRef.current.position.y = -0.8 - sway;
    }
  });

  // Material with subtle metallic look
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#3b82f6"), // Primary blue
        metalness: 0.3,
        roughness: 0.4,
      }),
    []
  );

  const goldMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#fbbf24"), // Gold accent
        metalness: 0.5,
        roughness: 0.3,
      }),
    []
  );

  return (
    <Float
      speed={prefersReducedMotion ? 0 : 2}
      rotationIntensity={prefersReducedMotion ? 0 : 0.2}
      floatIntensity={prefersReducedMotion ? 0 : 0.5}
    >
      <group ref={groupRef} scale={0.8}>
        {/* Center pillar */}
        <mesh position={[0, 0, 0]} material={material}>
          <cylinderGeometry args={[0.08, 0.12, 2, 16]} />
        </mesh>

        {/* Top beam */}
        <mesh position={[0, 1, 0]} material={material}>
          <boxGeometry args={[2.4, 0.08, 0.08]} />
        </mesh>

        {/* Center ornament */}
        <mesh position={[0, 1.15, 0]} material={goldMaterial}>
          <octahedronGeometry args={[0.15, 0]} />
        </mesh>

        {/* Left chain */}
        <mesh position={[-1, 0.5, 0]} material={material}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        </mesh>

        {/* Right chain */}
        <mesh position={[1, 0.5, 0]} material={material}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        </mesh>

        {/* Left pan */}
        <mesh ref={leftPanRef} position={[-1, -0.8, 0]} material={goldMaterial}>
          <cylinderGeometry args={[0.4, 0.35, 0.1, 24]} />
        </mesh>

        {/* Right pan */}
        <mesh ref={rightPanRef} position={[1, -0.8, 0]} material={goldMaterial}>
          <cylinderGeometry args={[0.4, 0.35, 0.1, 24]} />
        </mesh>

        {/* Base */}
        <mesh position={[0, -1, 0]} material={material}>
          <cylinderGeometry args={[0.5, 0.6, 0.15, 24]} />
        </mesh>
      </group>
    </Float>
  );
}

// ============================================================================
// CANVAS WRAPPER
// ============================================================================

interface FloatingScalesProps {
  className?: string;
}

export function FloatingScales({ className }: FloatingScalesProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={0.8}
            castShadow={false}
          />
          <directionalLight
            position={[-3, 3, -3]}
            intensity={0.4}
            color="#60a5fa"
          />

          {/* Environment for reflections */}
          <Environment preset="city" />

          {/* The scales */}
          <ScalesGeometry />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ============================================================================
// LAZY LOADED VERSION (for performance)
// ============================================================================

import dynamic from "next/dynamic";

export const FloatingScalesLazy = dynamic(
  () => Promise.resolve(FloatingScales),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        {/* Static SVG fallback */}
        <svg
          viewBox="0 0 100 100"
          className="h-32 w-32 text-primary/20"
          fill="currentColor"
        >
          <path d="M50 10 L50 30 M30 30 L70 30 M30 30 L30 50 L20 50 L20 55 L40 55 L40 50 L30 50 M70 30 L70 50 L60 50 L60 55 L80 55 L80 50 L70 50 M50 30 L50 85 M35 85 L65 85 L60 90 L40 90 L35 85" />
        </svg>
      </div>
    ),
  }
);

// ============================================================================
// STATIC FALLBACK (for reduced motion / low-power devices)
// ============================================================================

export function ScalesStaticFallback({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        className="h-48 w-48 text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Center pillar */}
        <line x1="60" y1="20" x2="60" y2="95" />

        {/* Top beam */}
        <line x1="20" y1="30" x2="100" y2="30" />

        {/* Top ornament */}
        <circle cx="60" cy="20" r="5" fill="currentColor" />

        {/* Left chain */}
        <line x1="30" y1="30" x2="30" y2="60" />

        {/* Right chain */}
        <line x1="90" y1="30" x2="90" y2="60" />

        {/* Left pan */}
        <ellipse cx="30" cy="65" rx="18" ry="5" />
        <line x1="12" y1="65" x2="18" y2="60" />
        <line x1="48" y1="65" x2="42" y2="60" />

        {/* Right pan */}
        <ellipse cx="90" cy="65" rx="18" ry="5" />
        <line x1="72" y1="65" x2="78" y2="60" />
        <line x1="108" y1="65" x2="102" y2="60" />

        {/* Base */}
        <ellipse cx="60" cy="100" rx="25" ry="8" />
        <line x1="35" y1="100" x2="40" y2="95" />
        <line x1="85" y1="100" x2="80" y2="95" />
      </svg>
    </div>
  );
}
