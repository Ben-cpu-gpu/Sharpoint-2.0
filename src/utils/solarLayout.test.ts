import test from 'node:test';
import assert from 'node:assert/strict';
import { boxesOverlap, computeSolarSystemLayout, RectBox } from './solarLayout';

const CATEGORIES = ['sheets', 'td', 'annales'];
const SUBJECTS = [
  'maths',
  'meca-point',
  'meca-systemes',
  'meca-fluides',
  'thermodynamique',
  'thermochimie',
  'ondes',
  'electricite',
  'outils-ingenieur',
  'tech-mecanismes',
  'algorithmique',
  'empreinte-carbone',
  'langues',
];
const PROVIDERS = ['gemini', 'claude', 'openai', 'groq', 'openrouter', 'local'];

test('computes exact node counts across all 3 solar rings', () => {
  const layout = computeSolarSystemLayout(CATEGORIES, SUBJECTS, PROVIDERS);
  assert.equal(layout.ring1.nodes.length, 3);
  assert.equal(layout.ring2.nodes.length, 13);
  assert.equal(layout.ring3.nodes.length, 6);
});

test('keeps all orbital node bounding boxes inside canvas and collision-free', () => {
  const layout = computeSolarSystemLayout(CATEGORIES, SUBJECTS, PROVIDERS);
  const sunBox: RectBox = {
    x: layout.cx - layout.sunRadius,
    y: layout.cy - layout.sunRadius,
    width: layout.sunRadius * 2,
    height: layout.sunRadius * 2,
  };

  const allNodes = [
    ...layout.ring1.nodes.map(n => ({ group: 'ring1', ...n })),
    ...layout.ring2.nodes.map(n => ({ group: 'ring2', ...n })),
    ...layout.ring3.nodes.map(n => ({ group: 'ring3', ...n })),
  ];

  // Every node fits within the canvas frame
  for (const node of allNodes) {
    assert.ok(node.box.x >= 0, `${node.id} left edge out of bounds (${node.box.x})`);
    assert.ok(
      node.box.x + node.box.width <= layout.width,
      `${node.id} right edge out of bounds (${node.box.x + node.box.width})`
    );
    assert.ok(node.box.y >= 0, `${node.id} top edge out of bounds (${node.box.y})`);
    assert.ok(
      node.box.y + node.box.height <= layout.height,
      `${node.id} bottom edge out of bounds (${node.box.y + node.box.height})`
    );
    assert.equal(
      boxesOverlap(sunBox, node.box, 2),
      false,
      `${node.id} overlaps the central Sun`
    );
  }

  // No two orbital nodes overlap each other
  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      assert.equal(
        boxesOverlap(allNodes[i].box, allNodes[j].box, 2),
        false,
        `${allNodes[i].group}:${allNodes[i].id} overlaps ${allNodes[j].group}:${allNodes[j].id}`
      );
    }
  }
});
