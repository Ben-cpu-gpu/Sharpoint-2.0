import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeParticleCount,
  createCosmicParticles,
  stepCosmicParticles,
  computeConstellationEdges,
  CosmicPointer,
  CosmicPulse,
  DEFAULT_COSMIC_CONFIG,
} from './cosmicParticles';

function seededRng(seed = 42): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('computeParticleCount scales cleanly for mobile and desktop with hundreds of luminous spheres', () => {
  const mobileCount = computeParticleCount(390, 844);
  const desktopCount = computeParticleCount(1440, 900);

  assert.ok(mobileCount >= 180 && mobileCount <= 240, `Expected 180-240 on mobile, got ${mobileCount}`);
  assert.ok(desktopCount >= 260 && desktopCount <= 420, `Expected 260-420 on desktop, got ${desktopCount}`);
});

test('createCosmicParticles builds varied sizes, alphas, and palette colors inside viewport bounds', () => {
  const particles = createCosmicParticles(1280, 720, seededRng(123));
  assert.ok(particles.length >= 250);

  const uniqueColors = new Set(particles.map(p => p.colorIdx));
  assert.ok(uniqueColors.size >= 5, 'Expected multiple gradient colors including blue/violet/cyan/magenta/amber');

  const constellationNodes = particles.filter(p => p.isConstellationNode);
  assert.ok(constellationNodes.length >= 70, `Expected >= 70 constellation anchor nodes, got ${constellationNodes.length}`);

  const minR = Math.min(...particles.map(p => p.radius));
  const maxR = Math.max(...particles.map(p => p.radius));
  assert.ok(maxR > minR + 1, 'Expected varied particle sizes');
});

test('stepCosmicParticles produces collective wave motion, circular repulsion, and smooth spring return', () => {
  const particles = createCosmicParticles(1000, 800, seededRng(7));
  // Pick a particle directly near pointer (500, 400)
  const target = particles[0];
  target.homeX = 520;
  target.homeY = 400;
  target.x = 520;
  target.y = 400;
  target.vx = 0;
  target.vy = 0;

  const farParticle = particles[1];
  farParticle.homeX = 950;
  farParticle.homeY = 750;
  farParticle.x = 950;
  farParticle.y = 750;
  farParticle.vx = 0;
  farParticle.vy = 0;

  const pointers: CosmicPointer[] = [
    { id: 1, x: 500, y: 400, vx: 0, vy: 0, active: true, isPressed: true },
  ];
  const pulses: CosmicPulse[] = [
    { x: 500, y: 400, radius: 15, maxRadius: 260, speed: 6, strength: 1.5, alpha: 1 },
  ];

  // Step 15 frames with active pointer repulsion
  for (let frame = 0; frame < 15; frame++) {
    stepCosmicParticles(particles, pointers, pulses, 1 / 60, frame / 60, DEFAULT_COSMIC_CONFIG);
  }

  assert.ok(target.x > 525, `Expected near particle to be pushed radially right, got x=${target.x}`);
  assert.ok(Number.isFinite(farParticle.x) && Number.isFinite(farParticle.y));

  // Deactivate pointer and let spring return + damping bring particle smoothly back toward equilibrium
  pointers[0].active = false;
  const displacedDist = Math.hypot(target.x - target.homeX, target.y - target.homeY);

  for (let frame = 15; frame < 195; frame++) {
    stepCosmicParticles(particles, pointers, pulses, 1 / 60, frame / 60, DEFAULT_COSMIC_CONFIG);
  }

  const settledDist = Math.hypot(target.x - target.homeX, target.y - target.homeY);
  assert.ok(
    settledDist < displacedDist,
    `Expected spring return to reduce displacement (${settledDist} vs ${displacedDist})`
  );
  assert.ok(settledDist < 32, `Expected particle to settle near organic home wave (${settledDist})`);
});

test('computeConstellationEdges connects nearby nodes and builds interactive pointer filaments', () => {
  const particles = createCosmicParticles(1000, 800, seededRng(99)).slice(0, 4);
  particles[0].isConstellationNode = true;
  particles[0].x = 100;
  particles[0].y = 100;
  particles[1].isConstellationNode = true;
  particles[1].x = 160;
  particles[1].y = 140;
  particles[2].isConstellationNode = true;
  particles[2].x = 800;
  particles[2].y = 700;
  particles[3].isConstellationNode = false;
  particles[3].x = 110;
  particles[3].y = 110;

  const pointers: CosmicPointer[] = [
    { id: 1, x: 130, y: 120, vx: 0, vy: 0, active: true, isPressed: false },
  ];

  const { edges, pointerFilaments } = computeConstellationEdges(particles, pointers, 130, 1.5);
  assert.equal(edges.length, 1, 'Only particles[0] and particles[1] should link');
  assert.ok(edges[0].alpha > 0 && edges[0].alpha <= 0.28);
  assert.equal(pointerFilaments.length, 2, 'Both near constellation nodes should link to pointer');
});
