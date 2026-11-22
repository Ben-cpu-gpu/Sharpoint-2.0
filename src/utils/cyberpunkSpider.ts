export interface Point2D {
  x: number;
  y: number;
}

export interface SpiderLegSpec {
  id: string;
  side: 'left' | 'right';
  mount: Point2D;
  len1: number;
  len2: number;
  len3: number;
  baseA1: number;
  baseA2: number;
  baseA3: number;
  amp1: number;
  amp2: number;
  amp3: number;
  freq: number;
  phase: number;
  subFreq: number;
  subPhase: number;
}

export interface ComputedSpiderLeg {
  id: string;
  side: 'left' | 'right';
  root: Point2D;
  knee: Point2D;
  ankle: Point2D;
  tip: Point2D;
  polylinePoints: string;
}

export interface ComputedSpiderPose {
  bodyCenter: Point2D;
  bodyRotationDeg: number;
  cephalothoraxPoints: string;
  abdomenPoints: string;
  legs: ComputedSpiderLeg[];
}

export const SPIDER_VIEWBOX_SIZE = 160;
const BASE_CX = 80;
const BASE_CY = 78;

// Solid black geometric prosoma (cephalothorax) and opisthosoma (abdomen) in local coordinates
const CEPHALOTHORAX_LOCAL: Point2D[] = [
  { x: 0, y: -11 },
  { x: 5.5, y: -6.5 },
  { x: 7, y: 1 },
  { x: 4.5, y: 6.5 },
  { x: 0, y: 7.5 },
  { x: -4.5, y: 6.5 },
  { x: -7, y: 1 },
  { x: -5.5, y: -6.5 },
];

const ABDOMEN_LOCAL: Point2D[] = [
  { x: 0, y: 6.5 },
  { x: 5.2, y: 10.5 },
  { x: 6.2, y: 18.5 },
  { x: 2.8, y: 24.5 },
  { x: 0, y: 26 },
  { x: -2.8, y: 24.5 },
  { x: -6.2, y: 18.5 },
  { x: -5.2, y: 10.5 },
];

/**
 * 8 asymmetrical articulated legs (4 left, 4 right) with sharp angular bends
 * and distinct lengths, rest angles, and organic phase offsets.
 */
export const SPIDER_LEG_SPECS: SpiderLegSpec[] = [
  // Left legs (L1 front-left -> L4 rear-left)
  {
    id: 'L1',
    side: 'left',
    mount: { x: -4.6, y: -5.2 },
    len1: 23,
    len2: 24,
    len3: 19,
    baseA1: -2.42,
    baseA2: -1.76,
    baseA3: -2.28,
    amp1: 0.11,
    amp2: 0.17,
    amp3: 0.14,
    freq: 1.55,
    phase: 0.15,
    subFreq: 0.72,
    subPhase: 0.8,
  },
  {
    id: 'L2',
    side: 'left',
    mount: { x: -6.2, y: -1.6 },
    len1: 26.5,
    len2: 27,
    len3: 21,
    baseA1: -2.86,
    baseA2: 2.66,
    baseA3: 2.12,
    amp1: 0.1,
    amp2: 0.16,
    amp3: 0.13,
    freq: 1.42,
    phase: 3.1,
    subFreq: 0.63,
    subPhase: 2.1,
  },
  {
    id: 'L3',
    side: 'left',
    mount: { x: -5.9, y: 2.3 },
    len1: 24.5,
    len2: 26,
    len3: 20,
    baseA1: 2.94,
    baseA2: 2.2,
    baseA3: 1.68,
    amp1: 0.09,
    amp2: 0.15,
    amp3: 0.13,
    freq: 1.48,
    phase: 0.65,
    subFreq: 0.68,
    subPhase: 4.0,
  },
  {
    id: 'L4',
    side: 'left',
    mount: { x: -4.2, y: 5.5 },
    len1: 22.5,
    len2: 28.5,
    len3: 24,
    baseA1: 2.54,
    baseA2: 1.94,
    baseA3: 1.42,
    amp1: 0.1,
    amp2: 0.18,
    amp3: 0.15,
    freq: 1.36,
    phase: 3.55,
    subFreq: 0.59,
    subPhase: 1.3,
  },

  // Right legs (R1 front-right -> R4 rear-right) intentionally asymmetrical vs left
  {
    id: 'R1',
    side: 'right',
    mount: { x: 4.8, y: -4.8 },
    len1: 24.5,
    len2: 22.5,
    len3: 20.5,
    baseA1: -0.68,
    baseA2: -1.34,
    baseA3: -0.78,
    amp1: 0.12,
    amp2: 0.16,
    amp3: 0.15,
    freq: 1.61,
    phase: 3.25,
    subFreq: 0.77,
    subPhase: 2.7,
  },
  {
    id: 'R2',
    side: 'right',
    mount: { x: 6.4, y: -1.1 },
    len1: 25.5,
    len2: 28,
    len3: 22,
    baseA1: -0.24,
    baseA2: 0.46,
    baseA3: 1.04,
    amp1: 0.1,
    amp2: 0.15,
    amp3: 0.14,
    freq: 1.39,
    phase: 0.35,
    subFreq: 0.61,
    subPhase: 5.1,
  },
  {
    id: 'R3',
    side: 'right',
    mount: { x: 6.0, y: 2.7 },
    len1: 23.5,
    len2: 27,
    len3: 19.5,
    baseA1: 0.26,
    baseA2: 0.96,
    baseA3: 1.44,
    amp1: 0.11,
    amp2: 0.16,
    amp3: 0.12,
    freq: 1.52,
    phase: 3.65,
    subFreq: 0.71,
    subPhase: 0.4,
  },
  {
    id: 'R4',
    side: 'right',
    mount: { x: 4.4, y: 5.8 },
    len1: 23.5,
    len2: 27,
    len3: 25,
    baseA1: 0.62,
    baseA2: 1.18,
    baseA3: 1.68,
    amp1: 0.09,
    amp2: 0.17,
    amp3: 0.15,
    freq: 1.33,
    phase: 0.85,
    subFreq: 0.56,
    subPhase: 3.3,
  },
];

function rotatePoint(p: Point2D, rad: number, cx: number, cy: number): Point2D {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  };
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function pointsToAttr(pts: Point2D[]): string {
  return pts.map(p => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
}

/**
 * Pure planar rigid-link forward kinematics for a minimalist articulated cyberpunk spider.
 * Guarantees invariant bone lengths at every timestamp while legs flex, extend, and contract organically.
 */
export function computeSpiderPose(timeSec: number, animated = true): ComputedSpiderPose {
  const t = animated ? timeSec : 0;

  // Subtle weightless hover/breathing body micro-motion
  const bodyDx = animated ? 1.15 * Math.sin(t * 0.82) : 0;
  const bodyDy = animated ? 1.45 * Math.cos(t * 1.14) : 0;
  const bodyRotationDeg = animated ? 1.6 * Math.sin(t * 0.64) : 0;
  const bodyRad = (bodyRotationDeg * Math.PI) / 180;

  const cx = BASE_CX + bodyDx;
  const cy = BASE_CY + bodyDy;

  const cephalothoraxPoints = pointsToAttr(
    CEPHALOTHORAX_LOCAL.map(p => rotatePoint(p, bodyRad, cx, cy))
  );
  const abdomenPoints = pointsToAttr(
    ABDOMEN_LOCAL.map(p => rotatePoint(p, bodyRad, cx, cy))
  );

  const legs: ComputedSpiderLeg[] = SPIDER_LEG_SPECS.map(spec => {
    const primary = Math.sin(t * spec.freq + spec.phase);
    const organic = Math.sin(t * spec.subFreq + spec.subPhase);
    const flexSignal = animated ? primary * 0.72 + organic * 0.28 : 0;
    const extSignal = animated ? Math.cos(t * spec.freq + spec.phase + 0.55) * 0.75 + organic * 0.25 : 0;
    const tipSignal = animated ? Math.sin(t * (spec.freq * 1.18) + spec.phase + 1.1) : 0;

    // Mirror swing polarity subtly between left/right so extension moves legs outward symmetrically in feel
    const dir = spec.side === 'left' ? -1 : 1;
    const a1 = spec.baseA1 + bodyRad + dir * spec.amp1 * flexSignal;
    const a2 = spec.baseA2 + bodyRad - dir * spec.amp2 * extSignal;
    const a3 = spec.baseA3 + bodyRad + dir * spec.amp3 * tipSignal;

    const root = rotatePoint(spec.mount, bodyRad, cx, cy);
    const knee: Point2D = {
      x: root.x + Math.cos(a1) * spec.len1,
      y: root.y + Math.sin(a1) * spec.len1,
    };
    const ankle: Point2D = {
      x: knee.x + Math.cos(a2) * spec.len2,
      y: knee.y + Math.sin(a2) * spec.len2,
    };
    const tip: Point2D = {
      x: ankle.x + Math.cos(a3) * spec.len3,
      y: ankle.y + Math.sin(a3) * spec.len3,
    };

    return {
      id: spec.id,
      side: spec.side,
      root,
      knee,
      ankle,
      tip,
      polylinePoints: pointsToAttr([root, knee, ankle, tip]),
    };
  });

  return {
    bodyCenter: { x: cx, y: cy },
    bodyRotationDeg,
    cephalothoraxPoints,
    abdomenPoints,
    legs,
  };
}
