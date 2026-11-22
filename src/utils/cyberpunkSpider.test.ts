import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPIDER_LEG_SPECS,
  SPIDER_VIEWBOX_SIZE,
  computeSpiderPose,
} from './cyberpunkSpider.ts';

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

test('computeSpiderPose produces 8 articulated legs (4 left, 4 right) inside viewBox bounds', () => {
  const pose = computeSpiderPose(0);
  assert.equal(pose.legs.length, 8);
  assert.equal(pose.legs.filter(l => l.side === 'left').length, 4);
  assert.equal(pose.legs.filter(l => l.side === 'right').length, 4);

  for (const leg of pose.legs) {
    for (const pt of [leg.root, leg.knee, leg.ankle, leg.tip]) {
      assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y));
      assert.ok(pt.x > 0 && pt.x < SPIDER_VIEWBOX_SIZE);
      assert.ok(pt.y > 0 && pt.y < SPIDER_VIEWBOX_SIZE);
    }
  }
});

test('left and right legs are genuinely asymmetrical in proportions and timing', () => {
  const left = SPIDER_LEG_SPECS.filter(l => l.side === 'left');
  const right = SPIDER_LEG_SPECS.filter(l => l.side === 'right');

  let anyDiff = false;
  for (let i = 0; i < 4; i++) {
    if (
      left[i].len1 !== right[i].len1 ||
      left[i].len2 !== right[i].len2 ||
      left[i].freq !== right[i].freq
    ) {
      anyDiff = true;
    }
  }
  assert.equal(anyDiff, true);
});

test('rigid-link forward kinematics preserve exact bone lengths and smooth continuous motion', () => {
  const samples = [0, 0.25, 0.75, 1.5, 3.1, 6.4, 9.8];
  const poses = samples.map(t => computeSpiderPose(t, true));

  for (const pose of poses) {
    pose.legs.forEach((leg, idx) => {
      const spec = SPIDER_LEG_SPECS[idx];
      assert.ok(Math.abs(dist(leg.root, leg.knee) - spec.len1) < 1e-6);
      assert.ok(Math.abs(dist(leg.knee, leg.ankle) - spec.len2) < 1e-6);
      assert.ok(Math.abs(dist(leg.ankle, leg.tip) - spec.len3) < 1e-6);
    });
  }

  // Verify legs actually move over time without abrupt jumps between small dt steps
  const pA = computeSpiderPose(1.0, true);
  const pB = computeSpiderPose(1.016, true);
  let maxTipStep = 0;
  let totalTipDelta = 0;

  for (let i = 0; i < 8; i++) {
    const step = dist(pA.legs[i].tip, pB.legs[i].tip);
    maxTipStep = Math.max(maxTipStep, step);
    totalTipDelta += dist(poses[0].legs[i].tip, poses[2].legs[i].tip);
  }

  assert.ok(maxTipStep < 1.5, `Tip moved too abruptly in 16ms: ${maxTipStep}`);
  assert.ok(totalTipDelta > 4, 'Legs should visibly flex and extend across 0.75s');
});
