export interface CosmicColorSpec {
  id: string;
  coreRgb: string;
  haloRgb: string;
}

export const COSMIC_PALETTE: CosmicColorSpec[] = [
  { id: 'electric-blue', coreRgb: '96, 165, 250', haloRgb: '37, 99, 235' },
  { id: 'violet', coreRgb: '196, 181, 253', haloRgb: '139, 92, 246' },
  { id: 'cyan', coreRgb: '165, 243, 252', haloRgb: '34, 211, 238' },
  { id: 'magenta', coreRgb: '249, 168, 212', haloRgb: '236, 72, 153' },
  { id: 'indigo-violet', coreRgb: '167, 139, 250', haloRgb: '124, 58, 237' },
  { id: 'amber-starlight', coreRgb: '253, 230, 138', haloRgb: '245, 158, 11' },
];

export interface CosmicParticle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  colorIdx: number;
  phase: number;
  freqX: number;
  freqY: number;
  ampX: number;
  ampY: number;
  twinkleSpeed: number;
  depth: number;
  isConstellationNode: boolean;
}

export interface CosmicPointer {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  isPressed: boolean;
}

export interface CosmicPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  strength: number;
  alpha: number;
}

export interface CosmicPhysicsConfig {
  repulsionRadius: number;
  repulsionStrength: number;
  neighborBandMultiplier: number;
  springStiffness: number;
  damping: number;
  waveAmplitude: number;
  connectionDistance: number;
  pointerLinkMultiplier: number;
}

export const DEFAULT_COSMIC_CONFIG: CosmicPhysicsConfig = {
  repulsionRadius: 165,
  repulsionStrength: 2.35,
  neighborBandMultiplier: 1.75,
  springStiffness: 0.042,
  damping: 0.9,
  waveAmplitude: 13,
  connectionDistance: 135,
  pointerLinkMultiplier: 1.5,
};

/**
 * Computes a responsive particle count: hundreds of particles on desktop,
 * scaled gracefully on smaller screens to preserve steady 60 FPS.
 */
export function computeParticleCount(width: number, height: number): number {
  const safeW = Math.max(320, width);
  const safeH = Math.max(320, height);
  const area = safeW * safeH;
  if (safeW < 640) {
    return Math.max(180, Math.min(240, Math.round(area / 1800)));
  }
  return Math.max(260, Math.min(420, Math.round(area / 3200)));
}

/**
 * Generates an organic cosmic dust distribution of luminous particles
 * across the viewport with subtle galactic-band clustering and varied sizes.
 */
export function createCosmicParticles(
  width: number,
  height: number,
  rng: () => number = Math.random
): CosmicParticle[] {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const count = computeParticleCount(safeW, safeH);
  const particles: CosmicParticle[] = [];

  for (let i = 0; i < count; i++) {
    // 55% concentrated softly along an organic diagonal cosmic ribbon, 45% ambient field
    let homeX: number;
    let homeY: number;
    if (i % 9 < 5) {
      const t = rng();
      const spread = (rng() - 0.5) * 0.52 + (rng() - 0.5) * 0.28;
      homeX = t * safeW;
      const bandCenterY = safeH * (0.78 - t * 0.56);
      homeY = Math.max(8, Math.min(safeH - 8, bandCenterY + spread * safeH));
    } else {
      homeX = rng() * safeW;
      homeY = rng() * safeH;
    }

    // Color biases slightly along coordinates; keep ~10% warm amber starlight accents matching ESTACA Observatory DA
    const diagRatio = (homeX / safeW) * 0.65 + (1 - homeY / safeH) * 0.35;
    const colorIdx =
      i % 10 === 0
        ? COSMIC_PALETTE.length - 1
        : Math.floor((diagRatio * 3.4 + rng() * 1.9) % (COSMIC_PALETTE.length - 1));

    const isConstellationNode = i % 5 < 2;
    const depth = 0.55 + rng() * 0.7;
    const radius = isConstellationNode
      ? 1.7 + Math.pow(rng(), 1.3) * 2.5
      : 1.2 + Math.pow(rng(), 1.45) * 2.1;
    const baseAlpha = isConstellationNode ? 0.62 + rng() * 0.34 : 0.44 + rng() * 0.42;

    particles.push({
      x: homeX,
      y: homeY,
      homeX,
      homeY,
      vx: 0,
      vy: 0,
      radius,
      baseAlpha,
      colorIdx,
      phase: rng() * Math.PI * 2,
      freqX: 0.42 + rng() * 0.55,
      freqY: 0.36 + rng() * 0.52,
      ampX: 4 + rng() * 9,
      ampY: 4 + rng() * 9,
      twinkleSpeed: 1.1 + rng() * 1.8,
      depth,
      isConstellationNode,
    });
  }

  return particles;
}

/**
 * Advances particle physics (weightless drift, collective synchronized waves,
 * progressive circular repulsion, soft neighbor wave propagation, inertia, and spring return)
 * and updates active expanding pulses in-place.
 */
export function stepCosmicParticles(
  particles: CosmicParticle[],
  pointers: CosmicPointer[],
  pulses: CosmicPulse[],
  dtSec: number,
  timeSec: number,
  config: CosmicPhysicsConfig = DEFAULT_COSMIC_CONFIG
): void {
  const clampedDt = Math.max(0.001, Math.min(0.05, dtSec));
  const dtNorm = clampedDt * 60;
  const dampingFactor = Math.pow(config.damping, dtNorm);

  // Advance expanding radial wave pulses
  for (let i = pulses.length - 1; i >= 0; i--) {
    const pulse = pulses[i];
    pulse.radius += pulse.speed * dtNorm;
    const progress = pulse.radius / Math.max(1, pulse.maxRadius);
    pulse.alpha = Math.max(0, 1 - progress);
    if (pulse.radius >= pulse.maxRadius) {
      pulses.splice(i, 1);
    }
  }

  const neighborMaxR = config.repulsionRadius * config.neighborBandMultiplier;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // 1. Collective synchronized organic wave + weightless individual float
    const waveX =
      Math.sin(timeSec * 0.78 + p.homeX * 0.0052 + p.homeY * 0.0034) *
      config.waveAmplitude *
      p.depth;
    const waveY =
      Math.cos(timeSec * 0.64 - p.homeX * 0.0031 + p.homeY * 0.0056) *
      (config.waveAmplitude * 0.85) *
      p.depth;

    const targetX = p.homeX + Math.sin(timeSec * p.freqX + p.phase) * p.ampX + waveX;
    const targetY = p.homeY + Math.cos(timeSec * p.freqY + p.phase * 1.23) * p.ampY + waveY;

    // 2. Spring return force (Hooke's law toward living wave equilibrium)
    let ax = (targetX - p.x) * config.springStiffness;
    let ay = (targetY - p.y) * config.springStiffness;

    // 3. Progressive circular repulsion + gentle fluid propagation to neighbor ring
    for (let j = 0; j < pointers.length; j++) {
      const ptr = pointers[j];
      if (!ptr.active) continue;

      const dx = p.x - ptr.x;
      const dy = p.y - ptr.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > neighborMaxR * neighborMaxR) continue;

      const dist = Math.sqrt(distSq);
      const nx = dist > 0.001 ? dx / dist : Math.cos(p.phase);
      const ny = dist > 0.001 ? dy / dist : Math.sin(p.phase);
      const pressMult = ptr.isPressed ? 1.45 : 1;

      if (dist < config.repulsionRadius) {
        const ratio = 1 - dist / config.repulsionRadius;
        const smoothFalloff = ratio * ratio * (3 - 2 * ratio);
        const push = config.repulsionStrength * smoothFalloff * pressMult * (0.75 + p.depth * 0.45);
        ax += nx * push + ptr.vx * 0.04 * smoothFalloff;
        ay += ny * push + ptr.vy * 0.04 * smoothFalloff;

        // Subtle tangential vortex swirl for liquid cosmic dust feel
        const swirl = push * 0.22;
        ax += -ny * swirl;
        ay += nx * swirl;
      } else {
        // Gentle wave propagation in outer neighbor ring
        const outerSpan = Math.max(1, neighborMaxR - config.repulsionRadius);
        const outerRatio = 1 - (dist - config.repulsionRadius) / outerSpan;
        const rippleWave = Math.sin((dist - config.repulsionRadius) * 0.045 - timeSec * 4.2);
        const neighborPush = config.repulsionStrength * 0.24 * outerRatio * Math.max(0, rippleWave) * pressMult;
        ax += nx * neighborPush;
        ay += ny * neighborPush;
      }
    }

    // 4. Expanding pulse ring propagation (triggered on pointer press / rapid sweep)
    for (let k = 0; k < pulses.length; k++) {
      const pulse = pulses[k];
      const dx = p.x - pulse.x;
      const dy = p.y - pulse.y;
      const dist = Math.hypot(dx, dy);
      const bandWidth = 54;
      const delta = Math.abs(dist - pulse.radius);
      if (delta < bandWidth && dist > 0.5) {
        const bandFactor = Math.cos((delta / bandWidth) * (Math.PI * 0.5));
        const waveForce = pulse.strength * pulse.alpha * bandFactor;
        ax += (dx / dist) * waveForce;
        ay += (dy / dist) * waveForce;
      }
    }

    // 5. Natural inertia & damping integration
    p.vx = (p.vx + ax * dtNorm) * dampingFactor;
    p.vy = (p.vy + ay * dtNorm) * dampingFactor;
    p.x += p.vx * dtNorm;
    p.y += p.vy * dtNorm;
  }
}

export interface ConstellationEdge {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  alpha: number;
  colorIdx: number;
}

export interface PointerFilament {
  px: number;
  py: number;
  tx: number;
  ty: number;
  alpha: number;
  colorIdx: number;
}

/**
 * Computes deterministic constellation filaments between close anchor particles
 * and interactive rays toward active pointer/touch coordinates (inspired by neural/starfield mesh).
 */
export function computeConstellationEdges(
  particles: CosmicParticle[],
  pointers: CosmicPointer[],
  connectionDistance = DEFAULT_COSMIC_CONFIG.connectionDistance,
  pointerLinkMultiplier = DEFAULT_COSMIC_CONFIG.pointerLinkMultiplier
): { edges: ConstellationEdge[]; pointerFilaments: PointerFilament[] } {
  const edges: ConstellationEdge[] = [];
  const pointerFilaments: PointerFilament[] = [];
  const maxDistSq = connectionDistance * connectionDistance;
  const pointerMaxDist = connectionDistance * pointerLinkMultiplier;
  const pointerMaxDistSq = pointerMaxDist * pointerMaxDist;

  for (let i = 0; i < particles.length; i++) {
    const a = particles[i];
    if (!a.isConstellationNode) continue;

    for (let j = i + 1; j < particles.length; j++) {
      const b = particles[j];
      if (!b.isConstellationNode) continue;

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < maxDistSq) {
        const dist = Math.sqrt(distSq);
        edges.push({
          ax: a.x,
          ay: a.y,
          bx: b.x,
          by: b.y,
          alpha: 0.28 * (1 - dist / connectionDistance),
          colorIdx: a.colorIdx,
        });
      }
    }

    for (let p = 0; p < pointers.length; p++) {
      const ptr = pointers[p];
      if (!ptr.active) continue;
      const dx = a.x - ptr.x;
      const dy = a.y - ptr.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < pointerMaxDistSq) {
        const dist = Math.sqrt(distSq);
        pointerFilaments.push({
          px: a.x,
          py: a.y,
          tx: ptr.x,
          ty: ptr.y,
          alpha: 0.48 * (1 - dist / pointerMaxDist),
          colorIdx: a.colorIdx,
        });
      }
    }
  }

  return { edges, pointerFilaments };
}

