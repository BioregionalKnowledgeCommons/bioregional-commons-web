'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { assetPath } from '@/lib/constants';

// ─── Atmosphere Glow Shader ───────────────────────────────────────────
const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, 3.0) * uIntensity;
    gl_FragColor = vec4(uColor, fresnel);
  }
`;

// ─── Globe Core Component ─────────────────────────────────────────────
export default function GlobeCore({ showSatellite = true }: { showSatellite?: boolean }) {
  const atmosphereRef = useRef<THREE.Mesh>(null);

  // Load satellite day texture only
  const dayMap = useLoader(THREE.TextureLoader, assetPath('/textures/earth-day-4k.jpg'));

  // Configure texture for best quality — must mutate the loaded texture object
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 8;
    dayMap.minFilter = THREE.LinearMipmapLinearFilter;
    dayMap.magFilter = THREE.LinearFilter;
  }, [dayMap]);
  /* eslint-enable react-hooks/immutability */

  // Uniforms for the atmosphere shader
  const atmosphereUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#4fc3f7') },
      uIntensity: { value: 1.4 },
    }),
    [],
  );

  // Gentle atmosphere pulse animation
  useFrame(({ clock }) => {
    if (atmosphereRef.current) {
      const mat = atmosphereRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uIntensity.value = 1.3 + Math.sin(clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group>
      {/* Lighting — uniform daylight */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} color="#ffffff" />

      {/* Earth — satellite imagery or plain dark sphere */}
      {/* Higher segment count (256) for smooth appearance at neighborhood zoom */}
      <mesh>
        <sphereGeometry args={[1.0, 256, 256]} />
        {showSatellite ? (
          <meshStandardMaterial
            map={dayMap}
            roughness={0.8}
            metalness={0.1}
          />
        ) : (
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.9}
            metalness={0.1}
          />
        )}
      </mesh>

      {/* Atmosphere glow (slightly larger transparent sphere with Fresnel) */}
      <mesh ref={atmosphereRef} scale={1.025}>
        <sphereGeometry args={[1.0, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={atmosphereUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Subtle inner rim glow */}
      <mesh scale={1.002}>
        <sphereGeometry args={[1.0, 64, 64]} />
        <meshBasicMaterial
          color="#1a3a5c"
          transparent
          opacity={0.04}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
