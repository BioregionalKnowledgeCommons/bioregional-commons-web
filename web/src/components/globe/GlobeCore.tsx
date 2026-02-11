'use client';

import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { assetPath } from '@/lib/constants';

// ─── Real-Time Solar Position ────────────────────────────────────────
// Computes the subsolar point (lat/lng where the sun is directly
// overhead) from the current UTC time, then converts to a 3D direction
// vector using the same coordinate convention as latLngToVector3.

// Time multiplier: 1x = real-time, 144x ≈ 10 minute day/night cycle.
// We use real time as the starting point but accelerate the Earth's
// rotation so the terminator visibly sweeps across the globe.
const SUN_TIME_MULTIPLIER = 144;

function getSunDirection(elapsedSeconds: number): THREE.Vector3 {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);

  // ── Solar declination ──
  // Accurate to real date: +23.44° at Jun solstice, -23.44° Dec solstice.
  const declinationDeg = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));

  // ── Subsolar longitude ──
  // Start from actual UTC time, then accelerate rotation using elapsed time.
  const utcHours =
    now.getUTCHours() +
    now.getUTCMinutes() / 60 +
    now.getUTCSeconds() / 3600;
  const baseAngle = utcHours * 15; // degrees from midnight
  const accelAngle = (elapsedSeconds * SUN_TIME_MULTIPLIER * 15) / 3600; // extra degrees
  const subsolarLngDeg = 180 - (baseAngle + accelAngle) % 360;

  // ── Convert to 3D vector ──
  // Same convention as latLngToVector3 in geo-utils.ts
  const phi = (90 - declinationDeg) * (Math.PI / 180);
  const theta = (subsolarLngDeg + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -(Math.sin(phi) * Math.cos(theta)),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ).normalize();
}

// ─── Day/Night Blending Shader ───────────────────────────────────────
// Blends satellite day texture with night city-lights based on the
// real-time sun direction, creating an accurate living earth.
const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const earthFragmentShader = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform vec3 uSunDirection;
  uniform float uNightIntensity;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 sunDir = normalize(uSunDirection);

    // Sunlight factor: 1.0 on lit hemisphere, 0.0 on dark side
    float sunDot = dot(normal, sunDir);

    // Smooth transition at the terminator (dawn/dusk band)
    float dayFactor = smoothstep(-0.15, 0.25, sunDot);

    // Sample textures
    vec4 dayColor = texture2D(uDayMap, vUv);
    vec4 nightColor = texture2D(uNightMap, vUv);

    // Day texture with sunlight shading
    vec3 lit = dayColor.rgb * (0.6 + 0.5 * max(sunDot, 0.0));

    // Night lights glow with warm tone
    vec3 nightGlow = nightColor.rgb * uNightIntensity * 2.5;
    // Warm amber tint on city lights
    nightGlow *= vec3(1.0, 0.85, 0.6);

    // Blend: day in sunlight, night lights in shadow
    vec3 color = mix(nightGlow, lit, dayFactor);

    // Subtle blue ambient to prevent pure black on oceans
    color += vec3(0.008, 0.012, 0.025);

    gl_FragColor = vec4(color, 1.0);
  }
`;

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
  uniform vec3 uSunDirection;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, 3.0) * uIntensity;

    // Warm the atmosphere rim on the sun side, cool on the dark side
    vec3 sunDir = normalize(uSunDirection);
    float sunInfluence = max(dot(vNormal, sunDir), 0.0);
    vec3 atmColor = mix(uColor, vec3(0.55, 0.75, 1.0), sunInfluence * 0.35);

    gl_FragColor = vec4(atmColor, fresnel);
  }
`;

// ─── Sun Glow Shader ──────────────────────────────────────────────────
// A bright billboard sprite at the sun position with soft falloff.
const sunGlowVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunGlowFragmentShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);

    // Multi-layer glow: bright core + soft halo
    float core = smoothstep(0.15, 0.0, dist);
    float halo = smoothstep(0.5, 0.05, dist) * 0.4;
    float outerHalo = smoothstep(0.5, 0.1, dist) * 0.15;

    float intensity = core + halo + outerHalo;

    // Warm white-yellow color
    vec3 color = mix(
      vec3(1.0, 0.95, 0.8),   // outer: warm white
      vec3(1.0, 1.0, 0.98),   // core: near white
      core
    );

    gl_FragColor = vec4(color * intensity, intensity);
  }
`;

// ─── Globe Core Component ─────────────────────────────────────────────
export default function GlobeCore({ showSatellite = true }: { showSatellite?: boolean }) {
  const globeRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const sunSpriteRef = useRef<THREE.Mesh>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);

  // Load satellite textures
  const [dayMap, nightMap] = useLoader(THREE.TextureLoader, [
    assetPath('/textures/earth-day-4k.jpg'),
    assetPath('/textures/earth-night-4k.jpg'),
  ]);

  // Configure textures for best quality
  useMemo(() => {
    [dayMap, nightMap].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
    });
  }, [dayMap, nightMap]);

  // Initial sun direction from current time (elapsed = 0 at start)
  const initialSunDir = useMemo(() => getSunDirection(0), []);

  // Uniforms for the earth shader
  const earthUniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uSunDirection: { value: initialSunDir.clone() },
      uNightIntensity: { value: 1.2 },
    }),
    [dayMap, nightMap, initialSunDir],
  );

  // Uniforms for the atmosphere shader
  const atmosphereUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#4fc3f7') },
      uIntensity: { value: 1.4 },
      uSunDirection: { value: initialSunDir.clone() },
    }),
    [initialSunDir],
  );

  // Uniforms for the sun glow
  const sunGlowUniforms = useMemo(() => ({}), []);

  // ── Animate: update sun position ────────────────────────────────────
  // Uses real UTC time as the starting point, accelerated by
  // SUN_TIME_MULTIPLIER so the terminator sweeps visibly (~10 min cycle).
  useFrame(({ clock }) => {
    const sunDir = getSunDirection(clock.elapsedTime);
    const t = clock.elapsedTime;

    // Update earth shader sun direction
    if (globeRef.current) {
      const mat = globeRef.current.material as THREE.ShaderMaterial;
      if (mat.uniforms?.uSunDirection) {
        mat.uniforms.uSunDirection.value.copy(sunDir);
      }
    }

    // Update atmosphere shader sun direction + gentle pulse
    if (atmosphereRef.current) {
      const mat = atmosphereRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uSunDirection.value.copy(sunDir);
      mat.uniforms.uIntensity.value = 1.3 + Math.sin(t * 0.5) * 0.1;
    }

    // Position the sun glow sprite far away in the sun direction
    if (sunSpriteRef.current) {
      const sunPos = sunDir.clone().multiplyScalar(40);
      sunSpriteRef.current.position.copy(sunPos);
      // Make the sprite always face the camera (billboard)
      sunSpriteRef.current.lookAt(0, 0, 0);
      sunSpriteRef.current.rotateY(Math.PI); // face outward
    }

    // Move directional light to match sun position
    if (directionalLightRef.current) {
      directionalLightRef.current.position.copy(sunDir.clone().multiplyScalar(10));
    }
  });

  return (
    <group>
      {/* Lighting — directional light tracks the real sun position */}
      <ambientLight intensity={0.12} />
      <directionalLight
        ref={directionalLightRef}
        position={[initialSunDir.x * 10, initialSunDir.y * 10, initialSunDir.z * 10]}
        intensity={0.35}
        color="#fff5e6"
      />

      {/* Earth — satellite imagery or plain dark sphere */}
      {/* Higher segment count (256) for smooth appearance at neighborhood zoom */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[1.0, 256, 256]} />
        {showSatellite ? (
          <shaderMaterial
            vertexShader={earthVertexShader}
            fragmentShader={earthFragmentShader}
            uniforms={earthUniforms}
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

      {/* Sun glow — visible disc at the real sun position */}
      <mesh ref={sunSpriteRef} position={[initialSunDir.x * 40, initialSunDir.y * 40, initialSunDir.z * 40]}>
        <planeGeometry args={[6, 6]} />
        <shaderMaterial
          vertexShader={sunGlowVertexShader}
          fragmentShader={sunGlowFragmentShader}
          uniforms={sunGlowUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
